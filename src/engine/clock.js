// Audio clock and look-ahead scheduler. Every musical time in the game comes
// from AudioContext.currentTime. Frame time is only used to draw.

export class AudioClock {
  constructor(ctx) {
    this.ctx = ctx;
    this.snap = { audioSec: 0, perfMs: 0 };
    this.refresh();
  }

  // Pair the audio clock with performance.now(). getOutputTimestamp reports
  // the audio time currently leaving the speakers, which already includes
  // output latency. When it is missing or not yet valid, fall back to
  // currentTime minus the reported latency.
  refresh() {
    const ctx = this.ctx;
    let snap = null;
    if (typeof ctx.getOutputTimestamp === 'function') {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.performanceTime > 0 && ts.contextTime > 0) snap = { audioSec: ts.contextTime, perfMs: ts.performanceTime };
    }
    if (!snap) {
      const lat = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
      snap = { audioSec: Math.max(0, ctx.currentTime - lat), perfMs: performance.now() };
    }
    // Snapshots may only move forward, so the mapping never jitters backwards.
    if (snap.audioSec >= this.snap.audioSec) this.snap = snap;
    return this.snap;
  }

  // Audio time being heard at a given performance.now() instant.
  audibleAt(perfMs) {
    return this.snap.audioSec + (perfMs - this.snap.perfMs) / 1000;
  }

  audibleNow() { return this.audibleAt(performance.now()); }
}

// Classic look-ahead scheduler. A timer wakes every `intervalMs` and hands the
// callback the audio-time window that must be scheduled now. Sounds are then
// placed with sample accuracy, so timer jitter never reaches the ear.
export class Scheduler {
  constructor(ctx, { lookahead = 0.12, intervalMs = 25 } = {}) {
    this.ctx = ctx;
    this.lookahead = lookahead;
    this.intervalMs = intervalMs;
    this.jobs = new Set();
    this.timer = null;
    this.horizon = 0;
  }

  add(fn) { this.jobs.add(fn); return () => this.jobs.delete(fn); }

  start() {
    if (this.timer) return;
    this.horizon = this.ctx.currentTime;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.jobs.clear();
  }

  tick() {
    const until = this.ctx.currentTime + this.lookahead;
    if (until <= this.horizon) return;
    const from = this.horizon;
    this.horizon = until;
    for (const fn of this.jobs) fn(from, until);
  }
}
