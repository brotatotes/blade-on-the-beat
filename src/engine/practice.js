// Practice: every fighting section of a night becomes a passage that loops
// on its own. Pure logic, shared by the game and the tests.

// One bar of music plays before a passage or a checkpoint so the player can
// feel the pulse before the first wind-up.
export function countInTick(chart, startTick) {
  return Math.max(0, startTick - chart.beatsPerBar * chart.tpb);
}

export function practiceSegments(chart) {
  const out = [];
  chart.sections.forEach((s, i) => {
    const endTick = chart.sections[i + 1]?.tick ?? chart.lengthTicks;
    const evs = chart.events.filter((e) => e.tick >= s.tick && e.tick < endTick);
    const attacks = evs.filter((e) => e.type === 'attack').length;
    const counters = evs.filter((e) => e.type === 'counter').length;
    const feints = evs.filter((e) => e.type === 'feint').length;
    if (!attacks && !counters) return;
    out.push({ index: out.length, section: i, name: s.name, startTick: s.tick, endTick, attacks, counters, feints });
  });
  return out;
}

// The last checkpoint at or before a song time (seconds). Null before the first.
export function checkpointBefore(chart, songSec) {
  const spt = 60 / chart.bpm / chart.tpb;
  let best = null;
  for (const t of chart.checkpoints) if (t * spt <= songSec) best = t;
  return best;
}
