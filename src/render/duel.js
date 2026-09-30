// Duel animation. Poses for Ren and the enemy are derived from the chart on
// the song clock, so every wind-up the player sees lines up with the cue they
// hear. Reactions (parry, hurt, counter, village hits) come from judgement
// events. Hit-stop freezes only the figures and particles, never the lane or
// the judgement clock.
import { tickToSec } from '../charts/dsl.js';
import { POSES, blend } from './figures.js';
import { blob, rng } from './brush.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);

// A feint never goes overhead: the blade is drawn back low behind the hip and
// the weight hangs back, a hesitation rather than a coil.
const FEINT_BACK = { lean: -0.34, arm: 0.9, blade: 2.35, crouch: 0.0 };
// Enemies rest in a low guard, blade pointed down toward Ren's feet, so their
// guard never crosses Ren's raised blade and the overhead wind-up is a big change.
const FOE_GUARD = { lean: 0.05, arm: 0.1, blade: 0.55, crouch: 0.08 };
const LUNGE = { lean: 0.42, arm: -0.1, blade: 0.05, crouch: 0.22 };

export class Duel {
  constructor(chart, { startSec = -Infinity } = {}) {
    this.chart = chart;
    this.beat = 60 / chart.bpm;
    const ev = (type) => chart.events.filter((e) => e.type === type).map((e) => ({ ...e, time: tickToSec(chart, e.tick) })).filter((e) => e.time >= startSec - 4);
    this.cues = ev('cue');
    this.attacks = ev('attack');
    this.feints = ev('feint');
    this.particles = [];
    this.ren = { kind: null, at: -1e9, result: null };
    this.foeHit = -1e9;
    this.flash = null;
    this.hitStopUntil = 0;
    this.shake = 0;
    this.frozenVt = 0;
    this.lastNow = null;
    this.defeat = null;
    this.r = rng(17);
  }

  // Judgement and feint events from the session.
  react(ev, now, reduce) {
    if (ev.type === 'feint') { this.ren = { kind: 'bitten', at: now }; this.flash = { color: '220,214,196', at: now, dur: 260 }; return; }
    if (ev.type !== 'judge') return;
    const n = ev.note;
    if (n.lane === 'counter') {
      if (ev.result === 'miss') return;
      this.ren = { kind: 'lunge', at: now, dir: n.dir };
      this.foeHit = now;
      this.pendingSpark = { at: now, kind: 'counter', count: n.finisher ? 26 : 12, bright: n.finisher };
      if (n.finisher && !reduce) { this.hitStopUntil = now + 90; this.shake = 7; }
      return;
    }
    if (ev.result === 'miss') {
      if (n.target === 'village') {
        this.villageHit = { at: now, kind: n.kind };
        this.flash = { color: '224,130,42', at: now, dur: 320 };
      } else {
        this.ren = { kind: 'hurt', at: now };
        this.flash = { color: '200,40,30', at: now, dur: 340, strong: true };
        if (!reduce) this.shake = n.kind === 'heavy' ? 9 : 5;
      }
      return;
    }
    this.ren = { kind: 'parry', at: now, result: ev.result };
    this.parriedAt = now;
    this.pendingSpark = { at: now, kind: 'parry', count: ev.result === 'perfect' ? 18 : 9, bright: ev.result === 'perfect', target: n.target, attack: n.kind, side: n.side };
    if (!reduce) { this.hitStopUntil = now + (ev.result === 'perfect' ? 70 : 45); this.shake = n.kind === 'heavy' || n.kind === 'ram' ? 5 : 2.5; }
  }

  finish(now, won, reduce = false) {
    if (this.defeat) return;
    this.defeat = { at: now, won };
    if (!reduce) { this.hitStopUntil = now + 160; this.shake = 10; }
    this.flash = { color: won ? '246,238,216' : '200,40,30', at: now, dur: reduce ? 200 : 420, strong: !won };
  }

  // Enemy pose at visual song time vt.
  foePose(vt, now) {
    if (this.defeat?.won) return { pose: blend(FOE_GUARD, POSES.fallen, ease(clamp((now - this.defeat.at) / 900))), info: { phase: 'defeat' } };
    const b = this.beat;
    const pre = Math.min(0.24, b * 0.5);
    let pose = FOE_GUARD;
    let info = { phase: 'guard' };
    // Call: a quick raise on each cue, so the rhythm is shown in the body.
    for (let i = this.cues.length - 1; i >= 0; i--) {
      const c = this.cues[i];
      const d = vt - c.time;
      if (d < -0.07) continue;
      if (d > 0.3) break;
      const up = d < 0 ? ease(clamp((d + 0.07) / 0.07)) : 1 - ease(clamp((d - 0.06) / 0.24));
      pose = blend(FOE_GUARD, c.feint ? FEINT_BACK : POSES.windup, up * (c.feint ? 0.8 : 0.75));
      info = { phase: 'cue', cue: c, k: up, d };
      break;
    }
    // Response: wind up in the last moment, snap to the strike on the beat.
    for (const a of this.attacks) {
      const d = vt - a.time;
      if (d < -pre) break;
      if (d > 0.32) continue;
      if (d < -0.045) pose = blend(FOE_GUARD, POSES.windup, ease(clamp((d + pre) / (pre - 0.045))));
      else if (d < 0) pose = blend(POSES.windup, POSES.strike, easeOut((d + 0.045) / 0.045));
      else {
        // Parried: snap back. Unparried: hold the cut at Ren's guard until the miss is judged.
        const back = now - (this.parriedAt ?? -1e9) < 320 ? 0.03 : 0.17;
        pose = blend(POSES.strike, FOE_GUARD, ease(clamp((d - back) / 0.22)));
      }
      // Melee strikes carry the enemy forward into Ren's space.
      const melee = a.kind !== 'arrow' && a.kind !== 'torch';
      const lunge = !melee ? 0 : d < -0.045 ? 0 : d < 0 ? easeOut((d + 0.045) / 0.045) : 1 - ease(clamp((d - (now - (this.parriedAt ?? -1e9) < 320 ? 0.03 : 0.17)) / 0.22));
      info = { phase: 'attack', attack: a, d, lunge };
    }
    // Feint: the same wind-up, then a visible pull-back instead of a swing.
    for (const f of this.feints) {
      const d = vt - f.time;
      if (d < -pre) break;
      if (d > 0.4) continue;
      if (d < -pre * 0.45) pose = blend(FOE_GUARD, POSES.windup, 0.6 * ease(clamp((d + pre) / (pre * 0.55))));
      else if (d < 0) pose = blend(blend(FOE_GUARD, POSES.windup, 0.6), FEINT_BACK, ease(clamp((d + pre * 0.45) / (pre * 0.45))));
      else pose = blend(FEINT_BACK, FOE_GUARD, ease(clamp(d / 0.4)));
      info = { phase: 'feint', feint: f, d };
    }
    if (now - this.foeHit < 260) pose = blend(pose, POSES.hurt, 1 - clamp((now - this.foeHit) / 260));
    return { pose, info };
  }

  renPose(now) {
    if (this.defeat && !this.defeat.won) return { pose: blend(POSES.guard, POSES.fallen, ease(clamp((now - this.defeat.at) / 900))), dx: 0 };
    const r = this.ren; const e = now - r.at;
    if (r.kind === 'parry' && e < 220) { const k = 1 - ease(clamp((e - 70) / 150)); return { pose: blend(POSES.guard, POSES.parry, k), dx: k * 0.22 }; }
    if (r.kind === 'lunge' && e < 300) { const k = e < 60 ? easeOut(e / 60) : 1 - ease(clamp((e - 60) / 240)); return { pose: blend(POSES.guard, LUNGE, k), dx: k }; }
    if ((r.kind === 'hurt' || r.kind === 'bitten') && e < 380) { const k = e < 50 ? easeOut(e / 50) : 1 - ease(clamp((e - 120) / 260)); return { pose: blend(POSES.guard, POSES.hurt, k * (r.kind === 'bitten' ? 0.6 : 1)), dx: -k * (r.kind === 'bitten' ? 0.3 : 0.45) }; }
    return { pose: POSES.guard, dx: 0 };
  }

  // Advance the effect clock. Returns the frozen visual song time and whether
  // hit-stop is active.
  step(vt, now) {
    const stopped = now < this.hitStopUntil;
    if (!stopped) this.frozenVt = vt;
    const dt = this.lastNow == null ? 0 : Math.min(0.05, (now - this.lastNow) / 1000);
    this.lastNow = now;
    if (!stopped) {
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      this.shake *= Math.pow(0.001, dt);
    }
    return { vt: this.frozenVt, stopped };
  }

  burst(x, y, count, { hue = 'spark', speed = 1, up = 0, reduce = false, u = 40 } = {}) {
    const n = reduce ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) {
      const a = this.r() * Math.PI * 2;
      const v = u * (2 + this.r() * 5) * speed;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up * u * 3, g: u * 9, life: 0.1 + this.r() * 0.15, max: 0.25, hue, w: 1 + this.r() * 1.6 });
    }
  }

  // Draw the duel: shadows, figures, projectiles, sparks and flashes.
  draw(g, L, vtRaw, now, { drawRen, drawFoe, enemy, reduce, W, H }) {
    const { vt } = this.step(vtRaw, now);
    const u = L.unit;
    const sx = this.shake > 0.3 && !reduce ? (this.r() - 0.5) * this.shake : 0;
    const sy = this.shake > 0.3 && !reduce ? (this.r() - 0.5) * this.shake * 0.6 : 0;
    g.save(); g.translate(sx, sy);
    const foe = this.foePose(vt, now);
    const ren = this.renPose(now);
    const win = this.defeat?.won ? ease(clamp((now - this.defeat.at - 300) / 700)) : 0;
    const renX = L.ren.x + ren.dx * u * 0.9 - win * u * (L.portrait ? 0.55 : 0.2);
    for (const f of [{ x: renX, y: L.ren.y }, L.foe]) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(f.x, f.y + 2, u * (L.portrait ? 0.68 : 0.95), u * 0.1, 0, 0, Math.PI * 2); g.fill(); }
    const coil = foe.info?.phase === 'attack' && foe.info.d < -0.045 ? clamp(1 + foe.info.d / Math.min(0.24, this.beat * 0.5)) : 0;
    const foeX = L.foe.x + coil * u * 0.3 - (foe.info?.lunge || 0) * Math.max(0, (L.foe.x - L.ren.x) - u * (this.ren.kind === 'hurt' ? 1.7 : 2.2)) * (this.ren.kind === 'hurt' ? 0.9 : 0.55);
    const feinting = foe.info?.phase === 'feint' || (foe.info?.phase === 'cue' && foe.info.cue.feint);
    const fall = this.defeat?.won ? ease(clamp((now - this.defeat.at) / 900)) : 0;
    const foeXd = foeX - fall * u * (L.portrait ? 0.4 : 0.2);
    this.foeDrawX = foeXd;
    const fb = drawFoe(g, enemy, foeXd, L.foe.y, u, foe.pose, now / 1000, { room: this.defeat?.won ? 0 : W - foeX, side: foe.info?.attack?.side || foe.info?.cue?.side });
    if (foe.info?.phase === 'attack' && fb) this.smear(g, fb, foe.info, u);
    const rb = drawRen(g, renX, L.ren.y, u, ren.pose, now / 1000);
    this.telegraph(g, L, foe.info, fb, vt, u, W, H, enemy);
    // Sparks spawn at the actual clash point between the two blades.
    if (this.pendingSpark) {
      const s = this.pendingSpark; this.pendingSpark = null;
      // Blades meet between the fighters at chest height.
      // Parries spark at Ren's blade tip, which the parry pose drives into the cut.
      let x = (rb.tip[0] + (fb?.tip?.[0] ?? rb.tip[0])) / 2, y = (rb.tip[1] + (fb?.tip?.[1] ?? rb.tip[1])) / 2;
      if (s.kind === 'counter') { x = L.foe.x - u * 0.2; y = L.foe.y - u * 1.3; }
      if (s.target === 'village') { x = rb.tip[0]; y = rb.tip[1]; }
      if (s.attack === 'arrow') { x = rb.tip[0]; y = rb.tip[1]; }
      this.burst(x, y, s.count + (s.bright ? 8 : 0), { reduce, u, speed: s.bright ? 1.3 : 0.85 });
      this.clash = { x, y, at: now, bright: s.bright, counter: s.kind === 'counter' };
    }
    if (this.villageHit) {
      const v = L.village; const s = this.villageHit; this.villageHit = null;
      this.burst(v.x + v.w * (0.3 + this.r() * 0.4), v.y - u * 0.3, 16, { hue: 'ember', reduce, u: u * 0.6, up: 1 });
      this.villageMark = { at: now, x: v.x + v.w / 2, y: v.y - u * 0.2, kind: s.kind };
    }
    // Ren takes the hit: a red ink splash across her body.
    if (this.ren.kind === 'hurt' && now - this.ren.at < 420) {
      const k = clamp((now - this.ren.at) / 420);
      g.fillStyle = `rgba(232,52,34,${0.8 * (1 - k)})`;
      blob(g, renX + u * 0.2, L.ren.y - u * 1.4, u * (0.32 + 0.3 * easeOut(k)), u * (0.12 + 0.08 * easeOut(k)), rng(41), 0.5, 20);
      blob(g, renX + u * 0.75, L.ren.y - u * 1.65, u * 0.18 * (1 - k), u * 0.1 * (1 - k), rng(43), 0.4, 10);
      blob(g, renX - u * 0.35, L.ren.y - u * 1.05, u * 0.14 * (1 - k), u * 0.09 * (1 - k), rng(45), 0.4, 10);
      // The cut itself: a bright streak from the enemy's blade tip into Ren.
      if (fb && k < 0.5) { g.strokeStyle = `rgba(255,236,214,${1 - k * 2})`; g.lineWidth = Math.max(3, u * 0.09); g.lineCap = 'round'; g.beginPath(); g.moveTo(fb.tip[0], fb.tip[1]); g.lineTo(renX + u * 0.15, L.ren.y - u * 1.35); g.stroke(); }
      g.strokeStyle = `rgba(252,244,226,${1 - k})`; g.lineWidth = Math.max(2, u * 0.06); g.lineCap = 'round';
      g.beginPath(); g.moveTo(renX - u * 0.55, L.ren.y - u * 2.0); g.lineTo(renX + u * 0.75, L.ren.y - u * 0.9); g.stroke();
    }
    this.drawParticles(g);
    if (this.clash && now - this.clash.at < 60 && !this.clash.counter) {
      // Contact frame: a hot white core that sells the clash.
      const k = (now - this.clash.at) / 60;
      const core = g.createRadialGradient(this.clash.x, this.clash.y, 0, this.clash.x, this.clash.y, u * (this.clash.bright ? 0.7 : 0.45));
      core.addColorStop(0, `rgba(255,252,240,${1 - k * 0.6})`); core.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = core; g.fillRect(this.clash.x - u, this.clash.y - u, u * 2, u * 2);
    }
    if (this.clash && now - this.clash.at < 170) {
      const k = (now - this.clash.at) / 170;
      g.strokeStyle = this.clash.counter ? `rgba(179,38,30,${1 - k})` : `rgba(246,238,216,${(1 - k) * (this.clash.bright ? 1 : 0.7)})`;
      g.lineWidth = this.clash.bright ? 3 : 2;
      const rr = u * (0.15 + k * (this.clash.bright ? 0.9 : 0.6));
      g.beginPath(); g.arc(this.clash.x, this.clash.y, rr, 0, Math.PI * 2); g.stroke();
      if (this.clash.counter) {
        // A single red slash across the enemy on a counter strike.
        g.fillStyle = `rgba(179,38,30,${1 - k})`;
        g.beginPath(); g.moveTo(this.clash.x - u * 0.7, this.clash.y - u * 0.5); g.lineTo(this.clash.x + u * 0.7, this.clash.y + u * 0.45); g.lineTo(this.clash.x + u * 0.66, this.clash.y + u * 0.52); g.closePath(); g.fill();
      }
    }
    if (this.villageMark && now - this.villageMark.at < 700) {
      const k = (now - this.villageMark.at) / 700;
      const m = this.villageMark;
      const glow = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, u * (0.8 + k * 1.2));
      glow.addColorStop(0, `rgba(246,160,60,${0.85 * (1 - k)})`); glow.addColorStop(1, 'rgba(236,140,50,0)');
      g.fillStyle = glow; g.fillRect(m.x - u * 2.2, m.y - u * 2.2, u * 4.4, u * 4.4);
      g.save(); g.globalAlpha = 1 - k * k; g.textAlign = 'center';
      g.font = `600 ${Math.round(u * 0.4)}px "EB Garamond", Georgia, serif`;
      g.lineWidth = 4; g.lineJoin = 'round'; g.strokeStyle = 'rgba(10,8,6,0.9)'; g.fillStyle = '#f0a050';
      const ty = m.y - u * (1.1 + k * 0.4);
      g.strokeText('Emberfall burns', m.x, ty); g.fillText('Emberfall burns', m.x, ty); g.restore();
    }
    if (this.defeat) this.drawDefeat(g, L, now, u, fb, rb, reduce);
    g.restore();
    if (this.flash && now - this.flash.at < this.flash.dur) {
      const k = 1 - (now - this.flash.at) / this.flash.dur;
      const edge = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      edge.addColorStop(0, `rgba(${this.flash.color},0)`); edge.addColorStop(1, `rgba(${this.flash.color},${(this.flash.strong ? 0.62 : 0.42) * k})`);
      g.fillStyle = edge; g.fillRect(0, 0, W, H);
    }
    return { foe: foe.info, hitStop: now < this.hitStopUntil };
  }

  // Wind-up tells: a red glint for a real attack, a pale hollow shimmer for a
  // feint, and a projectile in flight for arrows and torches.
  telegraph(g, L, info, fb, vt, u, W, H, enemy) {
    if (!info || !fb) return;
    if (info.phase === 'cue' && info.k > 0.05) {
      const c = info.cue;
      let [x, y] = fb.tip;
      if (c.side === 'L') { x = W * 0.08; y = L.ground - u * 2.6; }
      g.save();
      if (c.feint) {
        // Feint tell: a thick, pale, broken ring. Never red, never solid.
        g.strokeStyle = `rgba(226,232,242,${0.95 * info.k})`; g.lineWidth = Math.max(3, u * 0.07); g.setLineDash([u * 0.12, u * 0.1]);
        g.beginPath(); g.arc(x, y, u * (0.28 + 0.2 * info.k), 0, Math.PI * 2); g.stroke();
      } else {
        const col = c.kind === 'torch' || c.kind === 'ram' ? '236,140,50' : '205,52,40';
        const gl = g.createRadialGradient(x, y, 0, x, y, u * 0.5);
        gl.addColorStop(0, `rgba(${col},${0.95 * info.k})`); gl.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gl; g.fillRect(x - u * 0.5, y - u * 0.5, u, u);
        g.fillStyle = `rgba(250,236,210,${info.k})`;
        g.beginPath(); g.moveTo(x, y - u * 0.2); g.lineTo(x + u * 0.04, y); g.lineTo(x, y + u * 0.2); g.lineTo(x - u * 0.04, y); g.closePath(); g.fill();
        if (c.kind === 'heavy') { g.strokeStyle = `rgba(205,52,40,${info.k})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, u * 0.34, 0, Math.PI * 2); g.stroke(); }
      }
      g.restore();
    }
    if (info.phase === 'feint' && info.d > -0.2) {
      // The pull-back leaves a pale, broken arc where the swing would have been.
      const k = 1 - clamp(Math.abs(info.d) / 0.35);
      g.save(); g.strokeStyle = `rgba(226,232,242,${0.9 * k})`; g.lineWidth = Math.max(3, u * 0.07); g.setLineDash([u * 0.12, u * 0.1]);
      const [fx, fy] = fb.tip; g.beginPath(); g.arc(fx, fy, u * 0.42, 0, Math.PI * 2); g.stroke(); g.restore();
      // Holding still through a feint earns a quiet acknowledgement.
      if (info.d > 0.04 && this.ren.kind !== 'bitten') {
        g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(226,232,242,0.95)'; g.textAlign = 'center';
        g.font = `italic 600 ${Math.round(u * 0.42)}px "EB Garamond", Georgia, serif`;
        const sx = Math.min(fb.tip[0], g.canvas.width / Math.min(2, window.devicePixelRatio || 1) - u * 0.9), sy = Math.min(fb.tip[1], L.foe.y - u * 2.6) - u * 0.9; g.lineJoin = 'round'; g.lineWidth = Math.max(3, u * 0.1); g.strokeStyle = 'rgba(8,10,16,0.85)'; g.strokeText('steady', sx, sy); g.fillStyle = 'rgba(246,242,232,1)'; g.fillText('steady', sx, sy); g.restore();
      }
    }
    if (info.phase === 'attack' && info.d < 0) {
      const a = info.attack;
      const k = clamp(1 + info.d / 0.3);
      if (a.kind === 'arrow') {
        const from = a.side === 'L' ? [W * 0.02, L.ground - u * 3] : [fb.hand[0], fb.hand[1]];
        const to = [L.ren.x + u * 0.1, L.ren.y - u * 1.4];
        const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k;
        const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
        g.save(); g.translate(x, y); g.rotate(ang);
        g.strokeStyle = 'rgba(246,238,216,0.9)'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-u * 0.6, 0); g.lineTo(0, 0); g.stroke();
        g.fillStyle = '#b3261e'; g.beginPath(); g.moveTo(0, -u * 0.05); g.lineTo(u * 0.12, 0); g.lineTo(0, u * 0.05); g.fill();
        g.restore();
      } else if (a.kind === 'torch') {
        const from = [L.foe.x - u * 0.6, L.foe.y - u * 1.6];
        const to = [L.village.x + L.village.w * 0.55, L.village.y - u * 0.3];
        const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * u * 1.4;
        g.save();
        // A flaming brand with a fading trail, so its flight to the village reads.
        for (let i = 5; i >= 0; i--) {
          const kk = clamp(k - i * 0.05);
          const tx = from[0] + (to[0] - from[0]) * kk, ty = from[1] + (to[1] - from[1]) * kk - Math.sin(kk * Math.PI) * u * 1.4;
          const r = u * (i === 0 ? 0.5 : 0.3 - i * 0.03);
          const gl = g.createRadialGradient(tx, ty, 0, tx, ty, r);
          gl.addColorStop(0, `rgba(255,214,130,${i === 0 ? 1 : 0.5 - i * 0.07})`); gl.addColorStop(1, 'rgba(224,110,32,0)');
          g.fillStyle = gl; g.fillRect(tx - r, ty - r, r * 2, r * 2);
        }
        g.fillStyle = '#fff0c8'; g.beginPath(); g.arc(x, y, u * 0.07, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
  }

  // A brush smear that follows the blade from the top of the wind-up to the
  // strike, visible for about 80 ms around the beat.
  smear(g, fb, info, u) {
    const a = info.attack;
    if (a.kind === 'arrow' || a.kind === 'torch' || info.d < -0.045 || info.d > 0.08) return;
    const k = info.d < 0 ? 1 : 1 - info.d / 0.08;
    const len = Math.hypot(fb.tip[0] - fb.hand[0], fb.tip[1] - fb.hand[1]);
    if (len < u * 0.3) return;
    const end = Math.atan2(fb.tip[1] - fb.hand[1], fb.tip[0] - fb.hand[0]);
    // Wind-up blade angle for a left-facing figure, mirrored into canvas space.
    const start = Math.atan2(Math.sin(POSES.windup.blade), -Math.cos(POSES.windup.blade));
    let sweep = end - start; if (sweep > Math.PI) sweep -= Math.PI * 2; if (sweep < -Math.PI) sweep += Math.PI * 2;
    const N = 14, pts = [];
    for (let i = 0; i <= N; i++) { const t = start + sweep * (i / N); pts.push([Math.cos(t), Math.sin(t), i / N]); }
    g.save();
    g.fillStyle = `rgba(246,238,216,${0.55 * k})`;
    g.beginPath();
    for (const [c, sn, q] of pts) g.lineTo(fb.hand[0] + c * len * 1.08, fb.hand[1] + sn * len * 1.08);
    for (let i = pts.length - 1; i >= 0; i--) { const [c, sn, q] = pts[i]; const r = len * (0.95 - 0.35 * q); g.lineTo(fb.hand[0] + c * r, fb.hand[1] + sn * r); }
    g.closePath(); g.fill();
    g.restore();
  }

  drawParticles(g) {
    for (const p of this.particles) {
      const k = clamp(p.life / p.max);
      g.strokeStyle = p.hue === 'ember' ? `rgba(240,150,60,${k})` : `rgba(250,238,206,${k})`;
      g.lineWidth = p.w;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); g.stroke();
    }
  }

  drawDefeat(g, L, now, u, fb, rb, reduce) {
    const e = now - this.defeat.at;
    const at = this.defeat.won ? { x: this.foeDrawX ?? L.foe.x, y: L.foe.y } : L.ren;
    // One decisive red brush stroke across the fallen fighter.
    if (e < 700) {
      const q = easeOut(clamp(e / 140)), f = 1 - clamp((e - 220) / 260);
      g.save(); g.globalAlpha = f; g.fillStyle = '#b3261e';
      const x0 = at.x - u * 1.6, y0 = at.y - u * 2.4, x1 = x0 + u * 3.2 * q, y1 = y0 + u * 1.9 * q;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1 - u * 0.05); g.lineTo(x1 - u * 0.05, y1 + u * 0.1); g.lineTo(x0 + u * 0.1, y0 + u * 0.12); g.closePath(); g.fill(); g.restore();
    }
    if (e < 60 && !this.splashed) {
      this.splashed = true;
      this.burst(at.x, at.y - u * 1.2, 30, { reduce, u, speed: 1.4 });
    }
    // A spreading ink splash under the fallen figure.
    const k = easeOut(clamp(e / 1200));
    g.fillStyle = `rgba(10,8,6,${0.6 * k})`;
    blob(g, at.x, at.y + u * 0.05, u * (0.4 + k * 1.3), u * (0.06 + k * 0.14), rng(31), 0.35, 22);
    if (this.defeat.won && e > 300) {
      g.fillStyle = `rgba(179,38,30,${0.9 * clamp((e - 300) / 400)})`;
      blob(g, at.x - u * 0.3, at.y - u * 0.04, u * 0.5 * k, u * 0.08 * k, rng(33), 0.4, 16);
    }
  }
}
