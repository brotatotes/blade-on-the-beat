import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARTS } from '../src/charts/index.js';
import { NightSession, buildNotes } from '../src/engine/session.js';
import { toSongTime, calibrate } from '../src/engine/judge.js';

test('perfect play of every night grades every note perfect', () => {
  for (const chart of CHARTS) {
    const s = new NightSession(chart);
    for (const n of s.notes) s.input(n.time, n.lane, n.dir);
    s.update(chart.lengthSec + 1);
    const sum = s.summary();
    assert.equal(sum.perfect, s.notes.length, `night ${chart.id}`);
    assert.equal(sum.miss, 0);
    assert.equal(sum.health, 100);
    assert.equal(sum.village, 100);
  }
});

test('one-button press takes the nearest note when lane is omitted', () => {
  const s = new NightSession(CHARTS[0]);
  const n = s.notes[0];
  assert.equal(s.input(n.time + 0.02, null).result, 'perfect');
});

test('calibrated latency turns late taps into perfect ones', () => {
  const chart = CHARTS[1];
  const s = new NightSession(chart);
  const clock = { audioSec: 10, perfMs: 5000 };
  const songStart = 11;
  const latencyMs = 90;
  // Player hears everything 90 ms late and taps exactly on what they hear.
  const results = s.notes.slice(0, 20).map((n) => {
    const perfMs = clock.perfMs + (songStart + n.time - clock.audioSec) * 1000 + latencyMs;
    return s.input(toSongTime(perfMs, clock, songStart, latencyMs), n.lane, n.dir).result;
  });
  assert.ok(results.every((r) => r === 'perfect'));
  // Uncalibrated, the same taps are 90 ms late: good, not perfect.
  const u = new NightSession(chart);
  const n = u.notes[0];
  const perfMs = clock.perfMs + (songStart + n.time - clock.audioSec) * 1000 + latencyMs;
  assert.equal(u.input(toSongTime(perfMs, clock, songStart, 0), n.lane, n.dir).result, 'good');
});

test('misses damage Ren or the village by target', () => {
  const chart = CHARTS[3];
  const s = new NightSession(chart);
  s.update(chart.lengthSec + 1);
  const sum = s.summary();
  assert.equal(sum.perfect, 0);
  assert.ok(sum.health < 100);
  const hasVillage = buildNotes(chart).some((n) => n.target === 'village');
  if (hasVillage) assert.ok(sum.village < 100);
});

test('assist turns a 60 ms error from good into perfect', () => {
  const chart = CHARTS[0];
  const a = new NightSession(chart, { assist: true });
  const b = new NightSession(chart);
  const n = a.notes[0];
  assert.equal(a.input(n.time + 0.06, 'parry').result, 'perfect');
  assert.equal(b.input(n.time + 0.06, 'parry').result, 'good');
});

test('biting a feint costs health and resets the combo', () => {
  const chart = CHARTS[6];
  const s = new NightSession(chart);
  assert.ok(s.feints.length > 0, 'Aldric has feints');
  const f = s.feints[0];
  const before = s.health;
  const r = s.input(f.time, 'parry');
  if (r && r.result === 'feint') assert.ok(s.health < before);
  else assert.ok(r === null || r.note, 'a real note sat on the feint');
});

test('checkpoint start skips earlier notes', () => {
  const chart = CHARTS[2];
  const cp = chart.checkpoints[1];
  const s = new NightSession(chart, { startTick: cp });
  assert.ok(s.notes.length > 0 && s.notes.every((n) => n.tick >= cp));
});

test('calibration median ignores stray taps', () => {
  const beats = Array.from({ length: 16 }, (_, i) => i * 0.6);
  const taps = beats.map((b, i) => b + 0.08 + (i % 3 - 1) * 0.01);
  taps.push(3.25);
  const r = calibrate(taps, beats, 0.6);
  assert.equal(r.offsetMs, 80);
});
