import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARTS } from '../src/charts/index.js';
import { tickToSec } from '../src/charts/dsl.js';

const MIN_GAP_SEC = 0.15;      // humane minimum between any two player inputs
const MIN_TELEGRAPH_SEC = 1.5; // wind-up must come at least this long before its attack
const INPUT = new Set(['attack', 'counter']);

const load = (c) => {
  const n = c.events.filter((e) => INPUT.has(e.type) || e.type === 'feint').length;
  return n / (c.lengthSec / 60);
};

test('seven nights in order with unique keys', () => {
  assert.equal(CHARTS.length, 7);
  CHARTS.forEach((c, i) => assert.equal(c.id, i + 1));
  assert.equal(new Set(CHARTS.map((c) => c.key)).size, 7);
});

for (const c of CHARTS) {
  test(`night ${c.id} ${c.title}: schema, order and grid`, () => {
    assert.ok(c.bpm >= 60 && c.bpm <= 180);
    assert.ok(c.sections.length >= 4 && c.sections[0].tick === 0);
    assert.ok(c.checkpoints.length >= 3, 'mid-song checkpoints');
    for (let i = 1; i < c.events.length; i++) assert.ok(c.events[i].tick >= c.events[i - 1].tick, 'sorted');
    for (const e of c.events) {
      assert.ok(Number.isInteger(e.tick) && e.tick >= 0 && e.tick <= c.lengthTicks);
      const onSixteenth = e.tick % 3 === 0;
      const onTriplet = e.tick % 4 === 0;
      assert.ok(onSixteenth || onTriplet, `off-grid tick ${e.tick}`);
      assert.ok(['cue', 'attack', 'feint', 'counter'].includes(e.type));
    }
  });

  test(`night ${c.id}: every attack has a preceding matching telegraph`, () => {
    const cues = c.events.filter((e) => e.type === 'cue');
    for (const a of c.events.filter((e) => e.type === 'attack' || e.type === 'feint')) {
      const cue = cues.find((q) => q.tick === a.cueTick && q.forTick === a.tick && q.phrase === a.phrase);
      assert.ok(cue, `attack at ${a.tick} has no wind-up`);
      assert.equal(cue.feint, a.type === 'feint');
      if (a.type === 'attack') { assert.equal(cue.kind, a.kind); assert.equal(cue.side, a.side); }
      const lead = tickToSec(c, a.tick - cue.tick);
      assert.ok(lead >= MIN_TELEGRAPH_SEC, `telegraph lead ${lead.toFixed(2)}s too short`);
    }
    for (const q of cues) assert.ok(c.events.some((e) => e.tick === q.forTick && e.cueTick === q.tick), 'orphan cue');
  });

  test(`night ${c.id}: no input gaps below ${MIN_GAP_SEC * 1000} ms`, () => {
    const times = [...new Set(c.events.filter((e) => INPUT.has(e.type)).map((e) => e.tick))].map((t) => tickToSec(c, t));
    const ticks = c.events.filter((e) => INPUT.has(e.type)).map((e) => e.tick);
    assert.equal(new Set(ticks).size, ticks.length, 'no simultaneous inputs');
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= MIN_GAP_SEC - 1e-9, `gap ${(times[i] - times[i - 1]).toFixed(3)}s at ${i}`);
  });

  test(`night ${c.id}: counters follow parries and a finisher ends the fight`, () => {
    const counters = c.events.filter((e) => e.type === 'counter');
    assert.ok(counters.length >= 8);
    for (const k of counters) assert.ok(k.after.length >= 1, 'counter unlocked by a parry chain');
    assert.equal(counters.filter((k) => k.finisher).length, 1);
    assert.ok(counters[counters.length - 1].finisher);
  });
}

test('density ramps across nights', () => {
  const loads = CHARTS.map(load);
  for (let i = 1; i < loads.length; i++) assert.ok(loads[i] > loads[i - 1], `night ${i + 1} load ${loads[i].toFixed(1)} <= ${loads[i - 1].toFixed(1)}`);
  // No single jump larger than 60% night-to-night.
  for (let i = 1; i < loads.length; i++) assert.ok(loads[i] / loads[i - 1] < 1.6);
});

test('each boss has its rhythmic identity', () => {
  const [n1, n2, n3, n4, n5, n6, n7] = CHARTS;
  const att = (c) => c.events.filter((e) => e.type === 'attack');
  const beatPos = (c, e) => e.tick % c.tpb;
  // Drummer: heavy blows plus a real share of off-beat strikes.
  assert.ok(att(n2).some((e) => e.kind === 'heavy'));
  assert.ok(att(n2).filter((e) => beatPos(n2, e) !== 0).length / att(n2).length > 0.3);
  // Archers: both sides, arrows only, sides alternate often.
  const ar = att(n3);
  assert.ok(ar.every((e) => e.kind === 'arrow'));
  assert.ok(ar.filter((e) => e.side === 'L').length > 20 && ar.filter((e) => e.side === 'R').length > 20);
  // Night raid: majority of threats target the village.
  assert.ok(att(n4).filter((e) => e.target === 'village').length / att(n4).length > 0.45);
  // Dancer: triplet positions (4 and 8 ticks into a beat).
  assert.ok(att(n5).filter((e) => [4, 8].includes(beatPos(n5, e))).length / att(n5).length > 0.3);
  // Ram: ram on duple positions, crew on triplet positions within bars.
  const ram = att(n6).filter((e) => e.kind === 'ram');
  const crew = att(n6).filter((e) => e.kind === 'strike');
  assert.ok(ram.length > 15 && crew.length > 30);
  assert.ok(crew.filter((e) => [4, 8].includes(beatPos(n6, e))).length / crew.length > 0.4);
  // Aldric: feints, every attack kind, and Ren's motif.
  const kinds = new Set(att(n7).map((e) => e.kind));
  for (const k of ['strike', 'heavy', 'arrow', 'torch', 'ram']) assert.ok(kinds.has(k), k);
  assert.ok(n7.events.filter((e) => e.type === 'feint').length >= 8);
  assert.ok(n7.sections.some((s) => s.motif === 'ren'));
  assert.ok(CHARTS.slice(0, 6).every((c) => !c.events.some((e) => e.type === 'feint')));
  assert.ok(n1.events.every((e) => e.type !== 'attack' || e.kind === 'strike'));
});

test('full play time lands in a sensible range', () => {
  const minutes = CHARTS.reduce((s, c) => s + c.lengthSec, 0) / 60;
  assert.ok(minutes > 12 && minutes < 25, `${minutes}`);
});
