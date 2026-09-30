// The seven battle songs. A song is composed from its chart: the same tempo,
// the same sections and the same length, so music and gameplay cannot drift.
// composeSong() is pure data (testable in Node). songJob() plays it on the
// look-ahead scheduler, and renderSong() plays it into an OfflineAudioContext.
import { taiko, rim, swish, odaiko, shime, strings, flute, pluck, bass, breath } from './voices.js';

const MINOR = [0, 2, 3, 5, 7, 8, 10];
export function degToMidi(root, deg) {
  const oct = Math.floor(deg / 7);
  const i = ((deg % 7) + 7) % 7;
  return root + 12 * oct + MINOR[i];
}
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Motifs are [scale degree or null for rest, length in beats]. Each sums to
// whole bars. Degrees are in natural minor from the night's root.
export const MOTIFS = {
  // Ren's theme: a rising question that settles home. It closes every night
  // and returns in full as the answer to Aldric in the last section of night 7.
  ren: [[0, 1], [2, 0.5], [4, 0.5], [3, 1.5], [2, 0.5], [4, 2], [null, 2], [7, 1], [6, 0.5], [4, 0.5], [3, 1], [2, 1], [0, 3], [null, 1]],
  scouts: [[4, 1], [4, 1], [3, 1], [2, 1], [0, 2], [null, 2]],
  drummer: [[0, 0.5], [null, 0.5], [0, 0.5], [3, 0.5], [null, 0.5], [2, 0.5], [0, 1], [0, 0.5], [null, 0.5], [-1, 0.5], [0, 0.5], [null, 0.5], [3, 0.5], [2, 1]],
  archers: [[4, 0.5], [5, 0.5], [4, 1], [null, 2], [5, 0.5], [6, 0.5], [5, 1], [null, 2]],
  raid: [[0, 0.5], [0, 0.5], [2, 0.5], [3, 0.5], [4, 1], [3, 0.5], [2, 0.5], [0, 0.5], [0, 0.5], [2, 0.5], [3, 0.5], [5, 1], [4, 1]],
  dancer: [[4, 2 / 3], [5, 1 / 3], [4, 2 / 3], [2, 1 / 3], [3, 1], [null, 1], [2, 2 / 3], [3, 1 / 3], [2, 2 / 3], [0, 1 / 3], [1, 1], [null, 1]],
  ram: [[0, 1.5], [0, 1.5], [3, 1], [2, 1.5], [0, 1.5], [null, 1]],
  // Aldric's motif is Ren's opening turned upside down: teacher and student.
  aldric: [[7, 1], [5, 0.5], [3, 0.5], [4, 1.5], [5, 0.5], [3, 2], [null, 2], [0, 1], [1, 0.5], [3, 0.5], [4, 1], [5, 1], [7, 3], [null, 1]],
};

// Per night: key, chord roots per bar (scale degrees), lead voice and drum
// grooves. Grooves are one bar long: 16 steps are sixteenths, 12 steps are
// eighth-note triplets. O = odaiko war drum, o = taiko, s = shime, S = loud shime.
export const NIGHTS = {
  scouts: { root: 50, prog: [0, 5, 6, 0], lead: 'flute', base: 'O.......o.......', top: '....s.......s...' },
  drummer: { root: 48, prog: [0, 0, 5, 4], lead: 'bass', base: 'O..o..o.O..o.o..', top: 's.Ss.Ss.s.Ss.S.s' },
  archers: { root: 52, prog: [0, 2, 6, 5], lead: 'flute', base: 'O.......o.......', top: 's...s...s...s...', pan: true },
  raid: { root: 45, prog: [0, 6, 5, 4], lead: 'flute', base: 'O.o.o.oOo.o.o.oO', top: 'ssSsssSsssSsssSs' },
  dancer: { root: 53, prog: [0, 3, 6, 2], lead: 'pluck', base: 'O..o.so..o.s', top: '..s..s..s..S' },
  ram: { root: 43, prog: [0, 0, 3, 4], lead: 'bass', base: 'O.O.O.O.O.O.', top: 'o..o..o..o..' },
  aldric: { root: 50, prog: [0, 5, 3, 4], lead: 'flute', base: 'O..o..o.O.o.o.oO', top: 's.Ss.sSss.Ss.sSs' },
};
// Aldric's night borrows every earlier groove in turn, section by section.
const ALDRIC_GROOVES = ['scouts', 'drummer', 'archers', 'raid', 'dancer', 'ram'];

const TPB = 12;
const r = (x) => Math.round(x);

function motifEvents(name, startTick, bars, root, voice, gain, extra = {}) {
  const m = MOTIFS[name];
  const lenBeats = m.reduce((a, n) => a + n[1], 0);
  const out = [];
  const endTick = startTick + bars * 4 * TPB;
  let t = startTick;
  while (t < endTick) {
    let at = t;
    for (const [deg, beats] of m) {
      const dur = r(beats * TPB);
      if (at >= endTick) break;
      if (deg !== null) out.push({ tick: at, v: voice, midi: degToMidi(root, deg), dur: Math.min(dur, endTick - at), gain, motif: name, ...extra });
      at += dur;
    }
    t += r(lenBeats * TPB);
  }
  return out;
}

export function composeSong(chart) {
  const cfg = NIGHTS[chart.key];
  const bar = 4 * TPB;
  const events = [];
  const sections = chart.sections.map((s, i) => ({ ...s, end: chart.sections[i + 1]?.tick ?? chart.lengthTicks, index: i }));
  const combat = sections.filter((s) => s.motif !== 'intro' && s.motif !== 'outro');
  for (const s of sections) {
    const I = s.intensity;
    const grooveKey = chart.key === 'aldric' && s.motif === 'aldric' ? ALDRIC_GROOVES[(combat.indexOf(s) * 2) % 6] : chart.key;
    const groove = NIGHTS[grooveKey];
    for (let b = s.tick; b < s.end; b += bar) {
      const barIndex = (b - s.tick) / bar;
      const chordDeg = cfg.prog[(b / bar) % cfg.prog.length];
      // Low strings: a sustained chord every bar, brighter as intensity rises.
      events.push({ tick: b, v: 'strings', dur: bar, midis: [0, 2, 4].map((d) => degToMidi(cfg.root - 12, chordDeg + d)), gain: 0.05 + 0.05 * I, bright: I });
      if (s.motif === 'intro' || s.motif === 'outro') {
        // Heartbeat drums before and after the fight.
        events.push({ tick: b, v: 'odaiko', gain: 0.35 + 0.3 * I });
        if (I >= 0.4) events.push({ tick: b + 2 * TPB, v: 'taiko', gain: 0.22 });
        continue;
      }
      const step = (4 * TPB) / groove.base.length;
      [...groove.base].forEach((ch, i) => {
        if (ch === 'O') events.push({ tick: b + i * step, v: 'odaiko', gain: 0.45 + 0.25 * I });
        else if (ch === 'o') events.push({ tick: b + i * step, v: 'taiko', gain: 0.22 + 0.18 * I });
        else if (ch === 's') events.push({ tick: b + i * step, v: 'shime', gain: 0.1 });
      });
      if (I >= 0.8) {
        const tstep = (4 * TPB) / groove.top.length;
        [...groove.top].forEach((ch, i) => {
          const pan = groove.pan ? (i % 8 < 4 ? -0.6 : 0.6) : 0;
          if (ch === 's' || ch === 'S') events.push({ tick: b + i * tstep, v: 'shime', gain: ch === 'S' ? 0.16 : 0.08, pan });
          else if (ch === 'o') events.push({ tick: b + i * tstep, v: 'taiko', gain: 0.18 });
        });
      }
      // War drum fill on the last bar of every four at full intensity.
      if (I >= 0.95 && barIndex % 4 === 3) for (let k = 0; k < 4; k++) events.push({ tick: b + 2 * TPB + k * 6, v: 'odaiko', gain: 0.35 + 0.08 * k });
    }
    // Lead lines.
    const bars = (s.end - s.tick) / bar;
    if (s.motif === 'outro') {
      events.push(...motifEvents('ren', s.tick, bars, cfg.root + 12, 'flute', 0.1, { soft: true }));
    } else if (s.motif === 'intro' && chart.key === 'aldric') {
      events.push(...motifEvents('aldric', s.tick, bars, cfg.root + 12, 'flute', 0.08, { soft: true }));
    } else if (s.motif === 'ren') {
      events.push(...motifEvents('ren', s.tick, bars, cfg.root + 12, 'flute', 0.14));
      events.push(...motifEvents('aldric', s.tick, bars, cfg.root - 12, 'bass', 0.12));
    } else if (s.motif !== 'intro' && I >= 0.6) {
      const leadRoot = cfg.lead === 'bass' ? cfg.root - 12 : cfg.root + 12;
      const extra = chart.key === 'archers' ? { pan: 0 } : {};
      const lead = motifEvents(chart.key, s.tick, bars, leadRoot, cfg.lead, cfg.lead === 'bass' ? 0.16 : 0.1, extra);
      if (chart.key === 'archers') lead.forEach((e) => { e.pan = (Math.floor(e.tick / (2 * TPB)) % 2 === 0) ? -0.7 : 0.7; });
      events.push(...lead);
    }
  }
  // Gameplay sounds that belong to the chart: every wind-up cue, and a light
  // swing sound on each attack beat. These go to the effects bus.
  for (const e of chart.events) {
    if (e.type === 'cue') events.push({ tick: e.tick, v: 'cue', kind: e.kind, side: e.side, feint: e.feint, bus: 'sfx' });
    else if (e.type === 'attack') events.push({ tick: e.tick, v: 'swing', kind: e.kind, side: e.side, bus: 'sfx' });
  }
  events.sort((a, b) => a.tick - b.tick);
  return { key: chart.key, bpm: chart.bpm, tpb: TPB, lengthTicks: chart.lengthTicks, events };
}

// Wind-up cue sounds. Each attack type has its own voice; feints are a soft
// breath without a click, so a careful ear can tell them apart.
export function playCue(ctx, out, t, e) {
  const pan = e.side === 'L' ? -0.8 : e.side === 'R' ? 0.8 : 0;
  if (e.feint) return breath(ctx, out, t, { gain: 0.22 });
  switch (e.kind) {
    // Low cues keep their weight but add a bright kane ping on top, so they
    // still cut through the heavy drum nights (Drummer, Ram, Aldric).
    case 'heavy': rim(ctx, out, t, { pitch: 900, gain: 0.75 }); rim(ctx, out, t, { pitch: 2600, gain: 0.5 }); taiko(ctx, out, t, { pitch: 48, gain: 0.35, decay: 0.2 }); break;
    case 'arrow': rim(ctx, out, t, { pitch: 2300, gain: 0.85, pan }); break;
    case 'torch': rim(ctx, out, t, { pitch: 1300, gain: 0.7 }); swish(ctx, out, t, { gain: 0.15, up: true }); break;
    case 'ram': rim(ctx, out, t, { pitch: 700, gain: 0.75 }); rim(ctx, out, t, { pitch: 2400, gain: 0.5 }); taiko(ctx, out, t, { pitch: 40, gain: 0.4, decay: 0.3 }); break;
    default: rim(ctx, out, t, { pitch: 1700, gain: 0.7 });
  }
}

function playEvent(ctx, bus, t, e, secPerTick) {
  const out = e.bus === 'sfx' ? bus.sfx : bus.music;
  switch (e.v) {
    case 'cue': if (!e.feint) duck(bus.duck, t); return playCue(ctx, out, t, e);
    case 'swing': return swish(ctx, out, t, { gain: 0.1, up: false, pan: e.side === 'L' ? -0.7 : e.side === 'R' ? 0.7 : 0 });
    case 'odaiko': return odaiko(ctx, out, t, { gain: e.gain });
    case 'taiko': return taiko(ctx, out, t, { pitch: 78, gain: e.gain, decay: 0.3 });
    case 'shime': return shime(ctx, out, t, { gain: e.gain, pan: e.pan || 0 });
    case 'strings': return strings(ctx, out, t, e.dur * secPerTick, { freqs: e.midis.map(midiToHz), gain: e.gain, bright: e.bright });
    case 'flute': return flute(ctx, out, t, e.dur * secPerTick, { freq: midiToHz(e.midi), gain: e.gain, pan: e.pan || 0 });
    case 'pluck': return pluck(ctx, out, t, { freq: midiToHz(e.midi), gain: e.gain });
    case 'bass': return bass(ctx, out, t, e.dur * secPerTick, { freq: midiToHz(e.midi), gain: e.gain });
    default: return undefined;
  }
}

// Music chain: a gentle compressor keeps the mix below clipping.
// The EQ trims rumble and boom below the drums' body so the low end stays
// tight, dips 1.5-4 kHz a little so wind-up cues sit in a clear pocket, and
// lifts the air above 5 kHz so flute breath and drum skins read.
export function musicChain(ctx, dest) {
  const input = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38; hp.Q.value = 0.7;
  const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 90; low.gain.value = -4;
  const pocket = ctx.createBiquadFilter(); pocket.type = 'peaking'; pocket.frequency.value = 2400; pocket.Q.value = 0.7; pocket.gain.value = -6;
  const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 5000; air.gain.value = 4;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  // Duck gain: the music dips about 5 dB for a moment under every real
  // wind-up cue, the way a film mix makes room for dialogue.
  const duckGain = ctx.createGain();
  input.connect(hp).connect(low).connect(pocket).connect(air).connect(comp).connect(duckGain).connect(dest);
  input.duck = duckGain;
  return input;
}

// Brief music dip under a cue. Cues are scheduled in time order, so the
// automation segments never overlap backwards.
export function duck(node, t) {
  if (!node) return;
  const gp = node.gain;
  gp.setValueAtTime(1, Math.max(0, t - 0.012));
  gp.linearRampToValueAtTime(0.56, t);
  gp.setValueAtTime(0.56, t + 0.05);
  gp.linearRampToValueAtTime(1, t + 0.14);
}

// Master limiter shared by music and effects so louder cues never clip.
export function masterChain(ctx) {
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  // A small trim after the limiter keeps true peaks about 1.5 dB under full scale.
  const trim = ctx.createGain(); trim.gain.value = 0.84;
  lim.connect(trim).connect(ctx.destination);
  return lim;
}

// Scheduler job for live play. songStart is the audio time of tick 0.
export function songJob(ctx, bus, chart, songStart, { startTick = 0, endTick = Infinity } = {}) {
  const song = composeSong(chart);
  const spt = 60 / chart.bpm / TPB;
  // Sustained notes that began before a checkpoint are skipped; the next bar
  // brings the strings back within one bar. A practice passage stops at its end.
  const evs = song.events.filter((e) => e.tick >= startTick && e.tick < endTick);
  let i = 0;
  return (from, until) => {
    while (i < evs.length) {
      const e = evs[i];
      const at = songStart + e.tick * spt;
      if (at >= until) break;
      if (at >= from - 0.01) playEvent(ctx, bus, Math.max(at, ctx.currentTime), e, spt);
      i++;
    }
  };
}

// Render a stretch of a song offline. Returns the AudioBuffer.
export async function renderSong(chart, { sampleRate = 44100, fromSec = 0, durSec = null, music = 1, sfx = 1 } = {}) {
  const spt = 60 / chart.bpm / TPB;
  const total = durSec ?? chart.lengthSec + 2 - fromSec;
  const off = new OfflineAudioContext(2, Math.ceil(total * sampleRate), sampleRate);
  const bus = { music: off.createGain(), sfx: off.createGain() };
  bus.music.gain.value = music; bus.sfx.gain.value = sfx;
  const master = masterChain(off);
  const chain = musicChain(off, master);
  bus.music.connect(chain); bus.duck = chain.duck;
  bus.sfx.connect(master);
  for (const e of composeSong(chart).events) {
    const t = e.tick * spt - fromSec;
    if (t < 0 || t >= total) continue;
    playEvent(off, bus, t, e, spt);
  }
  return off.startRendering();
}
