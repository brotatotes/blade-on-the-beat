import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARTS } from '../src/charts/index.js';
import { tickToSec } from '../src/charts/dsl.js';
import { NightSession } from '../src/engine/session.js';
import { practiceSegments, countInTick, checkpointBefore } from '../src/engine/practice.js';
import { sanitize, loadSettings, saveSettings, DEFAULTS, SETTINGS_KEY } from '../src/engine/settings.js';
import { WINDOWS } from '../src/engine/judge.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('every night splits into practice passages that cover every input once', () => {
  for (const chart of CHARTS) {
    const segs = practiceSegments(chart);
    assert.ok(segs.length >= 3, `night ${chart.id} has ${segs.length} passages`);
    let total = 0;
    for (const seg of segs) {
      const s = new NightSession(chart, { startTick: seg.startTick, endTick: seg.endTick, practice: true });
      assert.equal(s.notes.length, seg.attacks + seg.counters, `${chart.id} ${seg.name}`);
      assert.ok(s.notes.every((n) => n.tick >= seg.startTick && n.tick < seg.endTick));
      total += s.notes.length;
    }
    const full = new NightSession(chart);
    assert.equal(total, full.notes.length, `night ${chart.id} passages cover the whole song`);
  }
});

test('practice never harms Ren or Emberfall, even when every note is missed', () => {
  for (const chart of CHARTS) {
    for (const seg of practiceSegments(chart)) {
      const s = new NightSession(chart, { startTick: seg.startTick, endTick: seg.endTick, practice: true, village: 100 });
      for (const f of s.feints) s.input(f.time, 'parry');
      s.update(chart.lengthSec + 5);
      const sum = s.summary();
      assert.equal(sum.health, 100); assert.equal(sum.village, 100);
      assert.equal(sum.miss, s.notes.length);
      assert.ok(s.done);
    }
  }
});

test('a practice passage ends at its own last note, not the end of the song', () => {
  const chart = CHARTS[6];
  const seg = practiceSegments(chart)[1];
  const s = new NightSession(chart, { startTick: seg.startTick, endTick: seg.endTick, practice: true });
  for (const n of s.notes) s.input(n.time, n.lane, n.dir);
  // The game updates every frame; one update at the last note ends the passage.
  s.update(s.notes.at(-1).time);
  assert.ok(s.done);
  assert.ok(tickToSec(chart, seg.endTick) < chart.lengthSec);
  assert.equal(s.summary().perfect, s.notes.length);
});

test('count-in starts one bar before a checkpoint and never before the song', () => {
  for (const chart of CHARTS) {
    for (const cp of chart.checkpoints) {
      const c = countInTick(chart, cp);
      assert.equal(cp - c, Math.min(cp, chart.beatsPerBar * chart.tpb));
      // No input falls inside the count-in bar, so the player only listens.
      const early = chart.events.filter((e) => (e.type === 'attack' || e.type === 'counter') && e.tick >= c && e.tick < cp);
      assert.equal(early.length, 0, `night ${chart.id} checkpoint ${cp}`);
    }
  }
});

test('checkpointBefore finds the last checkpoint passed', () => {
  const chart = CHARTS[1];
  const [a, b] = chart.checkpoints;
  assert.equal(checkpointBefore(chart, 0), null);
  assert.equal(checkpointBefore(chart, tickToSec(chart, a)), a);
  assert.equal(checkpointBefore(chart, tickToSec(chart, b) - 0.01), a);
  assert.equal(checkpointBefore(chart, chart.lengthSec), chart.checkpoints.at(-1));
});

test('resuming from a checkpoint keeps every later input and none before it', () => {
  for (const chart of CHARTS) {
    const cp = chart.checkpoints.at(-1);
    const s = new NightSession(chart, { startTick: cp });
    assert.ok(s.notes.length > 0 && s.notes.every((n) => n.tick >= cp));
  }
});

test('assist windows are wider at every grade', () => {
  for (const k of ['perfect', 'good', 'catch']) assert.ok(WINDOWS.assist[k] > WINDOWS.standard[k]);
});

test('settings round-trip through storage', () => {
  const st = memory();
  const s = { ...DEFAULTS, audioOffsetMs: 42, visualOffsetMs: -17, assist: true, music: 0.35, sfx: 0.6, reduceEffects: true };
  assert.equal(saveSettings(st, s), true);
  assert.deepEqual(loadSettings(st), s);
  assert.ok(st.m.has(SETTINGS_KEY));
});

test('damaged or old saves fall back safely', () => {
  assert.deepEqual(loadSettings(memory()), { ...DEFAULTS });
  const st = memory(); st.setItem(SETTINGS_KEY, '{not json');
  assert.deepEqual(loadSettings(st), { ...DEFAULTS });
  const s = sanitize({ audioOffsetMs: 9999, visualOffsetMs: 'x', music: -3, sfx: 2, assist: 'yes', reduceEffects: 1, extra: 5 });
  assert.equal(s.audioOffsetMs, 300); assert.equal(s.visualOffsetMs, 0);
  assert.equal(s.music, 0); assert.equal(s.sfx, 1);
  assert.equal(s.assist, false); assert.equal(s.reduceEffects, false);
  assert.equal('extra' in s, false);
  assert.equal(sanitize({ music: null }).music, DEFAULTS.music);
});

test('storage that throws never breaks saving', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(loadSettings(bad), { ...DEFAULTS });
  assert.equal(saveSettings(bad, DEFAULTS), false);
});
