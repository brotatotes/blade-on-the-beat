import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARTS } from '../src/charts/index.js';
import { composeSong, MOTIFS, NIGHTS } from '../src/audio/songs.js';

const BAR = 48;

test('every motif fills whole bars exactly', () => {
  for (const [name, m] of Object.entries(MOTIFS)) {
    const ticks = m.reduce((a, n) => a + Math.round(n[1] * 12), 0);
    assert.equal(ticks % BAR, 0, `${name} spans ${ticks} ticks`);
    const beats = m.reduce((a, n) => a + n[1], 0);
    assert.ok(Math.abs(ticks - beats * 12) < 1e-9, `${name} durations land on the tick grid`);
  }
});

test('each night has its own motif, groove and key setup', () => {
  const keys = CHARTS.map((c) => c.key);
  for (const k of keys) { assert.ok(NIGHTS[k], k); assert.ok(MOTIFS[k], k); }
  const grooves = new Set(keys.map((k) => NIGHTS[k].base + NIGHTS[k].top));
  assert.equal(grooves.size, 7, 'seven distinct grooves');
  const motifs = new Set(keys.map((k) => JSON.stringify(MOTIFS[k])));
  assert.equal(motifs.size, 7, 'seven distinct motifs');
});

for (const chart of CHARTS) {
  test(`night ${chart.id} song lines up with its chart`, () => {
    const song = composeSong(chart);
    assert.equal(song.bpm, chart.bpm);
    assert.equal(song.lengthTicks, chart.lengthTicks);
    assert.equal(chart.lengthTicks % BAR, 0, 'song is whole bars');
    for (const s of chart.sections) assert.equal(s.tick % BAR, 0, `section ${s.name} starts on a bar line`);
    for (const e of song.events) {
      assert.ok(Number.isInteger(e.tick), 'integer tick');
      assert.ok(e.tick >= 0 && e.tick < chart.lengthTicks, `event inside the song (${e.v} @ ${e.tick})`);
      assert.ok(e.tick % 3 === 0 || e.tick % 4 === 0, `${e.v} @ ${e.tick} on the sixteenth or triplet grid`);
      if (e.dur) assert.ok(e.tick + e.dur <= chart.lengthTicks, 'sustain ends inside the song');
    }
    // Every wind-up cue in the chart has exactly one audible cue sound at the same tick.
    const cues = chart.events.filter((e) => e.type === 'cue');
    const cueSounds = song.events.filter((e) => e.v === 'cue');
    assert.equal(cueSounds.length, cues.length);
    cues.forEach((c, i) => {
      assert.equal(cueSounds[i].tick, c.tick);
      assert.equal(cueSounds[i].feint, c.feint);
      assert.equal(cueSounds[i].bus, 'sfx', 'cues sit on the effects bus, above the music');
    });
    // Every attack beat is voiced so the player hears the moment to parry.
    const attacks = chart.events.filter((e) => e.type === 'attack');
    const swings = song.events.filter((e) => e.v === 'swing');
    assert.deepEqual(swings.map((e) => e.tick), attacks.map((e) => e.tick));
    // Feints have no swing sound after them.
    for (const f of chart.events.filter((e) => e.type === 'feint')) assert.ok(!swings.some((s) => s.tick === f.tick && s.kind === undefined));
    // Drums hold down every bar of the song.
    for (let b = 0; b < chart.lengthTicks; b += BAR) {
      assert.ok(song.events.some((e) => (e.v === 'odaiko' || e.v === 'taiko') && e.tick >= b && e.tick < b + BAR), `drums in bar ${b / BAR}`);
    }
    // Section motifs appear in the lead.
    for (const s of chart.sections.filter((x) => x.motif !== 'intro' && x.intensity >= 0.6)) {
      const want = s.motif === 'ren' ? 'ren' : chart.key;
      const end = chart.sections[chart.sections.indexOf(s) + 1]?.tick ?? chart.lengthTicks;
      assert.ok(song.events.some((e) => e.motif === want && e.tick >= s.tick && e.tick < end), `${want} motif in ${s.name}`);
    }
  });
}

test("Ren's theme recurs in Aldric's night and Aldric's motif answers it", () => {
  const c = CHARTS.find((x) => x.key === 'aldric');
  const song = composeSong(c);
  const renSec = c.sections.find((s) => s.motif === 'ren');
  const inRen = song.events.filter((e) => e.tick >= renSec.tick && e.tick < renSec.tick + 16 * 12);
  assert.ok(inRen.some((e) => e.motif === 'ren' && !e.soft), 'full Ren theme in the final section');
  assert.ok(inRen.some((e) => e.motif === 'aldric'), 'Aldric counter-line under it');
});
