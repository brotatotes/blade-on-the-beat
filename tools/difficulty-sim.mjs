// Simulated players for balance checks. Not shipped in the game build.
// Usage: node tools/difficulty-sim.mjs [trials] > report.json
import { CHARTS } from '../src/charts/index.js';
import { NightSession } from '../src/engine/session.js';
import { tickToSec } from '../src/charts/dsl.js';

const TRIALS = +(process.argv[2] || 200);

// Skill levels. sd is timing noise in seconds. lapse is the chance of a
// complete blank on a note. feintBite is the chance of tapping on a feint.
// dirError is the chance of pushing the wrong counter direction.
// dense: extra noise when a note follows the previous one closely, which is
// how people actually drift in fast runs.
const SKILLS = {
  sharp: { sd: 0.025, lapse: 0.005, feintBite: 0.08, dirError: 0.01 },
  steady: { sd: 0.045, lapse: 0.02, feintBite: 0.18, dirError: 0.03 },
  casual: { sd: 0.07, lapse: 0.04, feintBite: 0.3, dirError: 0.06 },
};

let seed = 12345;
function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function gauss() { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function play(chart, skill, assist) {
  const s = new NightSession(chart, { assist });
  const taps = [];
  let prev = -Infinity;
  for (const n of s.notes) {
    const gap = n.time - prev; prev = n.time;
    if (rand() < skill.lapse) continue;
    const dense = gap < 0.2 ? 1.35 : gap < 0.3 ? 1.15 : 1;
    const t = n.time + gauss() * skill.sd * dense;
    let dir = n.dir;
    if (n.lane === 'counter' && rand() < skill.dirError) dir = n.dir === 'up' ? 'down' : 'up';
    taps.push({ t, lane: n.lane, dir });
  }
  for (const f of s.feints) if (rand() < skill.feintBite) taps.push({ t: f.time + gauss() * skill.sd, lane: 'parry', dir: null });
  taps.sort((a, b) => a.t - b.t);
  for (const k of taps) s.input(k.t, k.lane, k.dir);
  s.update(chart.lengthSec + 5);
  const sum = s.summary();
  return { survived: s.health > 0, health: s.health, village: s.village, perfect: sum.perfect, good: sum.good, miss: sum.miss };
}

function stats(chart) {
  const ev = chart.events;
  const hits = ev.filter((e) => e.type === 'attack' || e.type === 'counter').map((e) => tickToSec(chart, e.tick)).sort((a, b) => a - b);
  let minGap = Infinity; for (let i = 1; i < hits.length; i++) minGap = Math.min(minGap, hits[i] - hits[i - 1]);
  const leads = ev.filter((e) => e.type === 'attack' || e.type === 'feint').map((e) => tickToSec(chart, e.tick) - tickToSec(chart, e.cueTick));
  const feints = ev.filter((e) => e.type === 'feint');
  const play = hits.length ? hits[hits.length - 1] - hits[0] : 1;
  // Feint readability: how far each feint sits from the nearest real parry,
  // and how far its pale wind-up sits from the nearest real wind-up.
  const parries = ev.filter((e) => e.type === 'attack').map((e) => tickToSec(chart, e.tick));
  const cues = ev.filter((e) => e.type === 'cue' && !e.feint).map((e) => tickToSec(chart, e.tick));
  const near = (arr, t) => Math.min(...arr.map((x) => Math.abs(x - t)));
  const beat = 60 / chart.bpm;
  const feintGaps = feints.map((f) => ({ at: +tickToSec(chart, f.tick).toFixed(2), toRealMs: Math.round(near(parries, tickToSec(chart, f.tick)) * 1000), cueToRealCueMs: Math.round(near(cues, tickToSec(chart, f.cueTick)) * 1000) }));
  const flagged = feintGaps.filter((g) => g.toRealMs < beat * 500 || g.cueToRealCueMs < beat * 500);
  return { bpm: chart.bpm, notes: hits.length, attacks: ev.filter((e) => e.type === 'attack').length, feints: feints.length,
    notesPerSec: +(hits.length / play).toFixed(2), minGapMs: Math.round(minGap * 1000), minLeadMs: Math.round(Math.min(...leads) * 1000), lengthSec: Math.round(chart.lengthSec),
    feintMinToRealMs: feintGaps.length ? Math.min(...feintGaps.map((g) => g.toRealMs)) : null, feintsFlagged: flagged };
}

const out = { trials: TRIALS, skills: SKILLS, nights: [] };
for (const chart of CHARTS) {
  const row = { id: chart.id, title: chart.title, stats: stats(chart), results: {} };
  for (const [name, skill] of Object.entries(SKILLS)) {
    for (const assist of [false, true]) {
      let win = 0, hp = 0, vil = 0, acc = 0;
      for (let i = 0; i < TRIALS; i++) {
        const r = play(chart, skill, assist);
        win += r.survived; hp += r.health; vil += r.village; acc += (r.perfect + r.good) / (r.perfect + r.good + r.miss);
      }
      row.results[`${name}${assist ? '+assist' : ''}`] = { winRate: +(win / TRIALS).toFixed(3), meanHealth: Math.round(hp / TRIALS), meanVillage: Math.round(vil / TRIALS), hitRate: +(acc / TRIALS).toFixed(3) };
    }
  }
  out.nights.push(row);
}
console.log(JSON.stringify(out, null, 1));
