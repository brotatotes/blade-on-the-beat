import test from 'node:test';
import assert from 'node:assert/strict';
import { Judge, grade, toSongTime, calibrate, WINDOWS } from '../src/engine/judge.js';

const notes = [{ time: 1, lane: 'parry' }, { time: 1.5, lane: 'parry' }, { time: 2, lane: 'counter', dir: 'up' }];

test('grade boundaries', () => {
  const w = WINDOWS.standard;
  assert.equal(grade(0, w), 'perfect');
  assert.equal(grade(0.045, w), 'perfect');
  assert.equal(grade(-0.046, w), 'good');
  assert.equal(grade(0.1, w), 'good');
  assert.equal(grade(0.101, w), 'miss');
  assert.equal(grade(0.06, WINDOWS.assist), 'perfect');
});

test('perfect inputs grade perfect', () => {
  const j = new Judge(notes);
  assert.equal(j.input(1, 'parry').result, 'perfect');
  assert.equal(j.input(1.5, 'parry').result, 'perfect');
  assert.equal(j.input(2, 'counter', 'up').result, 'perfect');
  assert.deepEqual(j.summary(), { perfect: 3, good: 0, miss: 0, pending: 0 });
});

test('late, early and wrong-direction inputs', () => {
  const j = new Judge(notes);
  assert.equal(j.input(1.07, 'parry').result, 'good');
  assert.equal(j.input(1.38, 'parry').result, 'miss');
  assert.equal(j.input(2.01, 'counter', 'down').result, 'miss');
});

test('whiffs outside catch window hit nothing and expired notes miss', () => {
  const j = new Judge(notes);
  assert.equal(j.input(0.5, 'parry'), null);
  const missed = j.update(1.2);
  assert.equal(missed.length, 1);
  assert.equal(j.input(1.5, 'parry').note.index, 1);
});

test('assist widens windows', () => {
  const j = new Judge(notes, { assist: true });
  assert.equal(j.input(1.13, 'parry').result, 'good');
  assert.equal(j.input(1.44, 'parry').result, 'perfect');
});

test('input mapping applies audio clock and latency offset', () => {
  const clock = { perfMs: 10000, audioSec: 5 };
  // Event 1.2 s after the snapshot, song started at audio 4.0, 120 ms latency.
  const t = toSongTime(11200, clock, 4.0, 120);
  assert.ok(Math.abs(t - 2.08) < 1e-9);
  // A player tapping 120 ms late with offset 120 grades perfect.
  const j = new Judge([{ time: 2.08, lane: 'parry' }]);
  assert.equal(j.input(t, 'parry').result, 'perfect');
  const raw = toSongTime(11200, clock, 4.0, 0);
  assert.equal(new Judge([{ time: 2.08, lane: 'parry' }]).input(raw, 'parry').result, 'miss');
});

test('calibration recovers a steady offset and rejects noise', () => {
  const beats = Array.from({ length: 16 }, (_, i) => i * 0.5);
  const taps = beats.map((b, i) => b + 0.09 + (i % 2 ? 0.01 : -0.01));
  taps.push(3.3);
  const r = calibrate(taps, beats, 0.5);
  assert.ok(Math.abs(r.offsetMs - 90) <= 10);
  assert.equal(calibrate([0.1, 0.6], beats, 0.5), null);
});
