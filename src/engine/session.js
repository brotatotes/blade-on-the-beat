// A night in play. Pure logic on the song clock, shared by the game and tests.
import { Judge } from './judge.js';
import { tickToSec } from '../charts/dsl.js';

export function buildNotes(chart) {
  const notes = [];
  for (const e of chart.events) {
    const time = tickToSec(chart, e.tick);
    if (e.type === 'attack') notes.push({ time, lane: 'parry', kind: e.kind, side: e.side, target: e.target, phrase: e.phrase, tick: e.tick });
    else if (e.type === 'counter') notes.push({ time, lane: 'counter', dir: e.dir, phrase: e.phrase, after: e.after, finisher: e.finisher, tick: e.tick });
  }
  return notes;
}

export const DAMAGE = { strike: 8, heavy: 14, arrow: 7, torch: 0, ram: 0 };
export const VILLAGE_DAMAGE = { torch: 6, ram: 9 };
export const FEINT_DAMAGE = 3;
export const COUNTER_HEAL = 1;

export class NightSession {
  // practice: no damage to Ren or the village. endTick: stop at a passage end.
  constructor(chart, { assist = false, startTick = 0, endTick = Infinity, village = 100, practice = false } = {}) {
    this.chart = chart;
    this.practice = practice;
    const inRange = (t) => t >= startTick && t < endTick;
    this.notes = buildNotes(chart).filter((n) => inRange(n.tick));
    this.judge = new Judge(this.notes, { assist });
    this.feints = chart.events.filter((e) => e.type === 'feint' && inRange(e.tick)).map((e) => ({ time: tickToSec(chart, e.tick), bitten: false }));
    this.health = 100;
    this.village = village;
    this.combo = 0;
    this.maxCombo = 0;
    this.log = [];
    this.listeners = [];
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { this.log.push(ev); for (const fn of this.listeners) fn(ev); }

  apply(res, songTime) {
    const n = res.note;
    if (res.result === 'miss') {
      this.combo = 0;
      if (n.lane === 'parry' && !this.practice) {
        if (n.target === 'village') this.village = Math.max(0, this.village - VILLAGE_DAMAGE[n.kind]);
        else this.health = Math.max(0, this.health - DAMAGE[n.kind]);
      }
    } else {
      // A landed counter steadies Ren a little. Clean play earns room to breathe.
      if (n.lane === 'counter' && !this.practice && this.health > 0) this.health = Math.min(100, this.health + COUNTER_HEAL);
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }
    this.emit({ type: 'judge', songTime, result: res.result, delta: res.delta, note: n });
  }

  // Call every frame and before each input with the current song time.
  update(songTime) {
    for (const n of this.judge.update(songTime)) this.apply({ note: n, result: 'miss', delta: null }, songTime);
  }

  // lane: 'parry' for tap, 'counter' for a direction. Returns the judgement or null.
  input(songTime, lane, dir = null) {
    this.update(songTime);
    const res = this.judge.input(songTime, lane, dir);
    if (res) { this.apply(res, songTime); return res; }
    if (lane === 'parry') {
      const f = this.feints.find((x) => !x.bitten && Math.abs(x.time - songTime) <= this.judge.win.good);
      if (f) {
        f.bitten = true;
        this.combo = 0;
        if (!this.practice) this.health = Math.max(0, this.health - FEINT_DAMAGE);
        this.emit({ type: 'feint', songTime });
        return { result: 'feint', note: null, delta: songTime - f.time };
      }
    }
    this.emit({ type: 'whiff', songTime, lane });
    return null;
  }

  get done() { return this.judge.cursor >= this.notes.length; }
  summary() { return { ...this.judge.summary(), health: this.health, village: this.village, maxCombo: this.maxCombo }; }
}
