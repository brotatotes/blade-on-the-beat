// Tiny chart language. Time is measured in ticks, 12 per beat, so both
// sixteenths (3 ticks) and triplets (4 ticks) land exactly on the grid.
//
// A phrase is call-and-response. The enemy performs the rhythm as wind-up
// cues first, then attacks on exactly the same rhythm. Pattern characters:
//   x strike on Ren     H heavy blow on Ren
//   L arrow from left   R arrow from right
//   t torch thrown at the village      r ram blow on the gate (village)
//   f feint: a pale wind-up that is never followed by a real attack
//   . rest
// Counter phrases use U D < > for the four strike directions.
// A pattern may hold several segments separated by '|'. Each segment spans
// `segBeats` beats (4 by default) and its length sets the subdivision.

export const TPB = 12;
export const BEATS_PER_BAR = 4;

const ATTACK = {
  x: { kind: 'strike', target: 'ren' },
  H: { kind: 'heavy', target: 'ren' },
  L: { kind: 'arrow', side: 'L', target: 'ren' },
  R: { kind: 'arrow', side: 'R', target: 'ren' },
  t: { kind: 'torch', target: 'village' },
  r: { kind: 'ram', target: 'village' },
};
const DIRS = { U: 'up', D: 'down', '<': 'left', '>': 'right' };

function parse(pattern, segBeats, allowed) {
  const hits = [];
  let offset = 0;
  for (const seg of pattern.split('|')) {
    const span = segBeats * TPB;
    if (span % seg.length !== 0) throw new Error(`Segment "${seg}" does not divide ${segBeats} beats`);
    const step = span / seg.length;
    [...seg].forEach((ch, i) => {
      if (ch === '.') return;
      if (!allowed.includes(ch)) throw new Error(`Unknown symbol "${ch}" in "${pattern}"`);
      hits.push({ at: offset + i * step, ch });
    });
    offset += span;
  }
  return { hits, length: offset };
}

export function chart(meta, build) {
  let tick = 0;
  let phraseId = 0;
  let pendingPhrases = [];
  const events = [];
  const sections = [];
  const checkpoints = [];
  const api = {
    section(name, opts = {}) {
      sections.push({ name, tick, motif: opts.motif || 'main', intensity: opts.intensity ?? 1 });
      if (opts.checkpoint) checkpoints.push(tick);
    },
    rest(beats) { tick += beats * TPB; },
    phrase(pattern, opts = {}) {
      const segBeats = opts.segBeats || 4;
      const { hits, length } = parse(pattern, segBeats, 'xHLRtrf');
      const id = ++phraseId;
      const callStart = tick;
      const respStart = tick + length;
      for (const h of hits) {
        const a = ATTACK[h.ch];
        const cueTick = callStart + h.at;
        const hitTick = respStart + h.at;
        if (h.ch === 'f') {
          events.push({ tick: cueTick, type: 'cue', kind: 'feint', feint: true, forTick: hitTick, phrase: id });
          events.push({ tick: hitTick, type: 'feint', cueTick, phrase: id });
        } else {
          events.push({ tick: cueTick, type: 'cue', kind: a.kind, side: a.side || null, feint: false, forTick: hitTick, phrase: id });
          events.push({ tick: hitTick, type: 'attack', kind: a.kind, side: a.side || null, target: a.target, cueTick, phrase: id });
        }
      }
      pendingPhrases.push(id);
      tick = respStart + length;
      return id;
    },
    counter(pattern, opts = {}) {
      const segBeats = opts.segBeats || 4;
      const { hits, length } = parse(pattern, segBeats, 'UD<>');
      const after = pendingPhrases.slice();
      pendingPhrases = [];
      const id = ++phraseId;
      hits.forEach((h, i) => {
        events.push({ tick: tick + h.at, type: 'counter', dir: DIRS[h.ch], phrase: id, after, finisher: !!opts.finisher && i === hits.length - 1 });
      });
      tick += length;
      return id;
    },
  };
  build(api);
  const order = { cue: 0, attack: 1, feint: 1, counter: 2 };
  events.sort((a, b) => a.tick - b.tick || order[a.type] - order[b.type]);
  return {
    ...meta,
    tpb: TPB,
    beatsPerBar: BEATS_PER_BAR,
    lengthTicks: tick,
    lengthSec: (tick / TPB) * (60 / meta.bpm),
    sections,
    checkpoints,
    events,
  };
}

export function tickToSec(chart, tick) {
  return (tick / chart.tpb) * (60 / chart.bpm);
}

// Player inputs are attacks (tap to parry) and counters (swipe or arrow).
export function inputEvents(chart) {
  return chart.events.filter((e) => e.type === 'attack' || e.type === 'counter');
}
