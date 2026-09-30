// Pure timing judgement. All times are in seconds on the song clock
// (audio time minus song start). No DOM or audio here, so it is unit tested.

export const WINDOWS = {
  standard: { perfect: 0.045, good: 0.1, catch: 0.15 },
  assist: { perfect: 0.07, good: 0.15, catch: 0.21 },
};

export function windowsFor(assist) {
  return assist ? WINDOWS.assist : WINDOWS.standard;
}

// Map a DOM event timestamp (performance.now() ms) to song time.
// `clock` is a snapshot {perfMs, audioSec} taken from getOutputTimestamp or
// sampled together. `songStart` is the audio time of tick 0.
// `offsetMs` is the calibrated audio latency: a positive value means the
// player hears sound late and therefore taps late, so it is subtracted.
export function toSongTime(eventPerfMs, clock, songStart, offsetMs = 0) {
  const audioSec = clock.audioSec + (eventPerfMs - clock.perfMs) / 1000;
  return audioSec - songStart - offsetMs / 1000;
}

export function grade(deltaSec, win) {
  const d = Math.abs(deltaSec);
  if (d <= win.perfect) return 'perfect';
  if (d <= win.good) return 'good';
  return 'miss';
}

// Judge keeps a cursor over sorted notes [{time, lane}] and consumes the
// nearest unjudged note in the right lane inside the catch window.
// lane 'parry' takes taps; lane 'counter' takes a direction. A null lane
// (the one-button press) takes whichever note is nearest.
export class Judge {
  constructor(notes, { assist = false } = {}) {
    this.notes = notes.map((n, i) => ({ ...n, index: i, result: null, delta: null }));
    this.win = windowsFor(assist);
    this.cursor = 0;
  }

  setAssist(assist) { this.win = windowsFor(assist); }

  // Expire notes whose catch window has fully passed. Returns newly missed notes.
  update(songTime) {
    const missed = [];
    while (this.cursor < this.notes.length) {
      const n = this.notes[this.cursor];
      if (n.result) { this.cursor++; continue; }
      if (songTime - n.time > this.win.catch) {
        n.result = 'miss'; n.delta = null; missed.push(n); this.cursor++;
      } else break;
    }
    return missed;
  }

  // Returns {note, result, delta} or null when the input hits nothing (a whiff).
  input(songTime, lane, dir = null) {
    let best = null;
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.time - songTime > this.win.catch) break;
      if (n.result || (lane && n.lane !== lane)) continue;
      const d = songTime - n.time;
      if (Math.abs(d) > this.win.catch) continue;
      if (!best || Math.abs(d) < Math.abs(best.d)) best = { n, d };
    }
    if (!best) return null;
    const { n, d } = best;
    let result = grade(d, this.win);
    if (lane === 'counter' && n.dir && dir && n.dir !== dir) result = 'miss';
    n.result = result; n.delta = d;
    return { note: n, result, delta: d };
  }

  summary() {
    const s = { perfect: 0, good: 0, miss: 0, pending: 0 };
    for (const n of this.notes) s[n.result || 'pending']++;
    return s;
  }
}

// Calibration: given tap times and the beat times they answered, return the
// median offset in ms, ignoring taps more than half a beat off.
export function calibrate(taps, beats, beatSec) {
  const deltas = [];
  for (const t of taps) {
    let best = null;
    for (const b of beats) if (best === null || Math.abs(t - b) < Math.abs(t - best)) best = b;
    if (best !== null && Math.abs(t - best) < beatSec / 2) deltas.push(t - best);
  }
  if (deltas.length < 4) return null;
  deltas.sort((a, b) => a - b);
  const mid = deltas.length >> 1;
  const med = deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
  const spread = deltas[Math.floor(deltas.length * 0.9)] - deltas[Math.floor(deltas.length * 0.1)];
  return { offsetMs: Math.round(med * 1000), spreadMs: Math.round(spread * 1000), used: deltas.length };
}
