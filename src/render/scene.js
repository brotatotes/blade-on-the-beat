// The moonlit pass behind every duel: sky, moon, three mountain washes,
// Kestrel Gate, and Emberfall in the valley below with fire and crack states
// driven by the village meter. Static layers are painted once per size into
// an offscreen canvas; only the moon glow, fires and embers move.
import { rng, ridge, stroke, blob, speckle } from './brush.js';

export const INK = '#15120f';
export const PAPER = '#e9dfc8';
export const RED = '#b3261e';
export const EMBER = '#e0822a';

function layer(w, h, dpr) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.round(w * dpr), Math.round(h * dpr)) : Object.assign(document.createElement('canvas'), { width: Math.round(w * dpr), height: Math.round(h * dpr) });
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, g };
}

// Layout shared by the scene and the duel so figures stand on the ground line.
export function layout(W, H) {
  const portrait = H > W * 1.1;
  const ground = portrait ? H * 0.7 : H * 0.72;
  // Portrait is framed ~1.5x closer so the fighters fill the screen.
  const unit = Math.min(W / (portrait ? 4.4 : 9), H / (portrait ? 5.4 : 6.2));
  // Ridge heights shrink in portrait so the sky breathes and the moon clears them.
  const sky = portrait ? 0.62 : (H < 500 ? 0.62 : 0.8);
  return {
    W, H, portrait, ground, unit, sky,
    moon: { x: W * (portrait ? 0.68 : (H < 500 ? 0.76 : 0.74)), y: H * (portrait ? 0.24 : (H < 500 ? 0.25 : 0.17)), r: Math.min(W, H) * (portrait ? 0.11 : 0.085) },
    ren: { x: W * (portrait ? 0.345 : 0.36), y: ground },
    foe: { x: W * (portrait ? 0.7 : 0.64), y: ground },
    // The gate stands behind and to the left of Ren with a clear gap, so her
    // silhouette never touches a post.
    // In portrait the gate stands further up the pass, smaller and hazier, so
    // it separates from Ren by depth and value instead of colliding with her.
    gate: portrait ? { x: W * 0.085, y: ground - unit * 0.55, u: unit * 0.26, far: true } : { x: W * 0.36 - unit * 2.2, y: ground, u: unit },
    // Emberfall sits down in the valley beyond the gate: smaller, hazier,
    // lower contrast, so it reads as distance rather than doll houses.
    village: { x: W * (portrait ? -0.02 : 0.0), y: ground - H * (portrait ? 0.045 : 0.06), w: W * (portrait ? 0.42 : 0.3), scale: 0.42 },
  };
}

function paintStatic(L, dpr) {
  const { W, H, ground, moon } = L;
  const { c, g } = layer(W, H, dpr);
  const r = rng(7);
  // Night wash: deep indigo at the top fading to warm grey near the ridge.
  const sky = g.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#15151f'); sky.addColorStop(0.55, '#262431'); sky.addColorStop(1, '#3a3530');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // Moon halo and disc, painted with a slightly uneven edge.
  const halo = g.createRadialGradient(moon.x, moon.y, moon.r * 0.8, moon.x, moon.y, moon.r * 4.2);
  halo.addColorStop(0, 'rgba(243,234,210,0.28)'); halo.addColorStop(1, 'rgba(243,234,210,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);
  const disc = g.createRadialGradient(moon.x - moon.r * 0.25, moon.y - moon.r * 0.25, moon.r * 0.1, moon.x, moon.y, moon.r);
  disc.addColorStop(0, '#f6eed8'); disc.addColorStop(0.85, '#eadfc2'); disc.addColorStop(1, '#e4d8b9');
  g.fillStyle = disc; g.beginPath(); g.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2); g.fill();
  // A faint second disc, offset, softens the edge like ink bleeding on damp paper.
  // A thin cloud stroke across the moon.
  // Soft drifting cloud: a few overlapping gradient puffs, never a hard bar.
  for (const [dx, dy, sx, sy, a] of [[-1.6, 0.55, 1.5, 0.22, 0.5], [-0.3, 0.45, 1.3, 0.16, 0.42], [0.9, 0.62, 1.4, 0.2, 0.46], [2.2, 0.5, 1.1, 0.16, 0.35]]) {
    const cx = moon.x + dx * moon.r, cy = moon.y + dy * moon.r;
    g.save(); g.translate(cx, cy); g.scale(sx * moon.r, sy * moon.r);
    const pf = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    pf.addColorStop(0, `rgba(24,23,32,${a})`); pf.addColorStop(1, 'rgba(24,23,32,0)');
    g.fillStyle = pf; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // Three mountain washes, far to near, each darker and lower.
  // Each wash is darkest at the crest and fades into mist below, the way a
  // loaded brush bleeds into damp paper.
  const wash = (top, bottom, c0, c1) => { const w = g.createLinearGradient(0, top, 0, bottom); w.addColorStop(0, c0); w.addColorStop(1, c1); return w; };
  g.fillStyle = wash(ground - H * 0.52 * L.sky, ground, 'rgba(78,74,88,0.85)', 'rgba(78,74,88,0.12)');
  ridge(g, -20, W + 20, ground - H * 0.3 * L.sky, H * 0.16 * L.sky, ground, r, { peaks: [[0.2, 0.9], [0.55, 1.4], [0.85, 0.7]] });
  g.fillStyle = wash(ground - H * 0.32 * L.sky, ground, 'rgba(40,37,44,0.95)', 'rgba(52,48,54,0.35)');
  ridge(g, -20, W + 20, ground - H * 0.17 * L.sky, H * 0.12 * L.sky, ground, r, { peaks: [[0.35, 0.8], [0.7, 1.1]] });
  // Mist band in the valley.
  const mist = g.createLinearGradient(0, ground - H * 0.1, 0, ground);
  mist.addColorStop(0, 'rgba(200,190,170,0)'); mist.addColorStop(1, 'rgba(200,190,170,0.16)');
  g.fillStyle = mist; g.fillRect(0, ground - H * 0.1, W, H * 0.1);
  // The pass itself: near ground with a single loaded stroke on the lip.
  g.fillStyle = INK;
  ridge(g, -20, W + 20, ground, H * 0.02, H + 10, r, { detail: 6 });
  g.fillStyle = '#0d0b09';
  stroke(g, [[-10, ground + 2], [W * 0.3, ground - 3], [W * 0.7, ground + 3], [W + 10, ground - 1]], 6, 2, { belly: 1.4 });
  // Dry-brush speckle on the ground and a hint of paper grain in the sky.
  g.fillStyle = 'rgba(233,223,200,0.05)'; speckle(g, 0, ground + 8, W, H - ground, Math.round(W * 0.4), 2.2, r);
  g.fillStyle = 'rgba(233,223,200,0.025)'; speckle(g, 0, 0, W, ground, Math.round(W * 0.6), 1.4, r);
  // Pine silhouettes on the far edges frame the duel.
  // Pines frame the duel from the far edge. In portrait the foe stands near
  // that edge, so the pines drop back into the mist and never merge with him.
  const pineInk = L.portrait ? '#34313a' : INK;
  const pu = L.portrait ? L.unit * 0.55 : L.unit;
  // The small inner pine sits tight to the edge so the foe's companions keep
  // clear air between them and the boughs.
  const pineX = L.portrait ? [1.0, 0.975, 1.02] : [0.975, 0.945, 0.995];
  for (const [x, s] of [[W * pineX[0], 1], [W * pineX[1], 0.62], [W * pineX[2], 0.55]]) pine(g, x, ground + 4, pu * 2.6 * s, r, pineInk);
  // Soft vignette, like the edge of a hanging scroll.
  const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return c;
}

function pine(g, x, y, h, r, ink = INK) {
  g.fillStyle = ink;
  stroke(g, [[x, y], [x + (r() - 0.5) * h * 0.1, y - h * 0.5], [x + (r() - 0.5) * h * 0.08, y - h]], h * 0.05, h * 0.01);
  for (let i = 0; i < 6; i++) {
    const ty = y - h * (0.3 + i * 0.12), len = h * (0.36 - i * 0.05);
    for (const dir of [-1, 1]) stroke(g, [[x, ty], [x + dir * len * 0.6, ty + len * 0.1], [x + dir * len, ty + len * 0.22]], h * 0.05, h * 0.006, { belly: 1.3 });
  }
}

// Kestrel Gate: two posts, a crossbeam and a hanging red lantern.
function paintGate(g, L, t) {
  const { gate } = L;
  const unit = gate.u;
  const h = unit * 3.1, w = unit * 1.8;
  g.fillStyle = gate.far ? '#2a2730' : INK;
  stroke(g, [[gate.x - w / 2, gate.y + 4], [gate.x - w / 2, gate.y - h]], unit * 0.22, unit * 0.16, { belly: 1 });
  stroke(g, [[gate.x + w / 2, gate.y + 4], [gate.x + w / 2, gate.y - h]], unit * 0.22, unit * 0.16, { belly: 1 });
  stroke(g, [[gate.x - w * 0.8, gate.y - h * 0.95], [gate.x, gate.y - h * 1.02], [gate.x + w * 0.8, gate.y - h * 0.95]], unit * 0.28, unit * 0.12, { belly: 1.2 });
  stroke(g, [[gate.x - w * 0.6, gate.y - h * 0.78], [gate.x + w * 0.6, gate.y - h * 0.78]], unit * 0.12, unit * 0.1, { belly: 1 });
  const sway = Math.sin(t * 1.3) * unit * 0.04;
  g.strokeStyle = gate.far ? '#2a2730' : INK; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(gate.x, gate.y - h * 0.78); g.lineTo(gate.x + sway, gate.y - h * 0.62); g.stroke();
  const glow = g.createRadialGradient(gate.x + sway, gate.y - h * 0.56, 0, gate.x + sway, gate.y - h * 0.56, unit * 0.9);
  glow.addColorStop(0, 'rgba(179,38,30,0.45)'); glow.addColorStop(1, 'rgba(179,38,30,0)');
  g.fillStyle = glow; g.fillRect(gate.x - unit, gate.y - h * 0.56 - unit, unit * 2, unit * 2);
  g.fillStyle = RED; g.beginPath(); g.ellipse(gate.x + sway, gate.y - h * 0.56, unit * 0.16, unit * 0.22, 0, 0, Math.PI * 2); g.fill();
}

// Emberfall: a row of roofs below the gate. Damage shows as fire on rooftops
// and cracked walls. village is 0..100.
function paintVillage(g, L, t, village, reduce) {
  const { village: v } = L;
  const unit = L.unit * v.scale;
  const r = rng(99);
  const n = L.portrait ? 5 : 6;
  const dmg = 1 - village / 100;
  const baseY = v.y + unit * 0.35;
  for (let i = 0; i < n; i++) {
    const x = v.x + (i + 0.5) * (v.w / n) + (r() - 0.5) * unit * 0.2;
    const s = unit * (0.42 + r() * 0.18);
    const y = baseY + (i % 2) * unit * 0.12;
    // Windows glow warm when safe; burning houses glow red-orange.
    const burning = dmg > (i + 0.5) / n * 0.9 + 0.05;
    g.fillStyle = '#4a4650';
    g.fillRect(x - s * 0.9, y - s * 0.9, s * 1.8, s * 0.9);
    g.fillStyle = '#34313a';
    stroke(g, [[x - s * 1.25, y - s * 0.8], [x, y - s * 1.45], [x + s * 1.25, y - s * 0.8]], s * 0.28, s * 0.2, { belly: 1.1 });
    g.fillStyle = burning ? 'rgba(224,130,42,0.85)' : 'rgba(236,190,110,0.55)';
    g.fillRect(x - s * 0.35, y - s * 0.6, s * 0.22, s * 0.24);
    g.fillRect(x + s * 0.15, y - s * 0.6, s * 0.22, s * 0.24);
    if (dmg > 0.2 + i * 0.07) {
      // A crack: a jagged dark line down the wall.
      g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.88); g.lineTo(x + s * 0.05, y - s * 0.6); g.lineTo(x - s * 0.08, y - s * 0.35); g.lineTo(x + s * 0.06, y - s * 0.05); g.stroke();
    }
    if (burning) flame(g, x + (r() - 0.5) * s * 0.6, y - s * 1.2, s * (0.7 + dmg * 0.8), t + i * 1.7, reduce);
  }
  // Smoke rises over a damaged village.
  if (dmg > 0.15) {
    g.fillStyle = `rgba(20,18,16,${Math.min(0.45, dmg * 0.5)})`;
    const drift = reduce ? 0 : (t * 6) % unit;
    for (let k = 0; k < 4; k++) blob(g, v.x + v.w * (0.25 + k * 0.18), baseY - unit * (1.6 + k * 0.3) - drift, unit * (0.6 + k * 0.2), unit * 0.3, r, 0.4);
  }
  // Valley haze over the whole village keeps it in the distance.
  // Soft elliptical mist, never a rectangle, dissolving the village's feet.
  g.save(); g.translate(v.x + v.w / 2, baseY + unit * 0.1); g.scale(v.w * 0.75, unit * 0.9);
  const hz = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  hz.addColorStop(0, 'rgba(120,118,128,0.4)'); hz.addColorStop(1, 'rgba(120,118,128,0)');
  g.fillStyle = hz; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
}

function flame(g, x, y, s, t, reduce) {
  const f = reduce ? 0 : Math.sin(t * 9) * 0.12 + Math.sin(t * 13.7) * 0.08;
  const glow = g.createRadialGradient(x, y, 0, x, y, s * 1.8);
  glow.addColorStop(0, 'rgba(224,130,42,0.35)'); glow.addColorStop(1, 'rgba(224,130,42,0)');
  g.fillStyle = glow; g.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
  g.fillStyle = EMBER;
  stroke(g, [[x - s * 0.3, y + s * 0.3], [x - s * 0.1 + f * s, y - s * 0.4], [x + f * s * 2, y - s * (1 + f)]], s * 0.5, s * 0.02, { belly: 1.4 });
  g.fillStyle = RED;
  stroke(g, [[x + s * 0.25, y + s * 0.3], [x + s * 0.15 - f * s, y - s * 0.2], [x + s * 0.1 - f * s, y - s * 0.7]], s * 0.35, s * 0.02, { belly: 1.3 });
}

export class Scene {
  constructor() { this.cache = null; this.key = ''; }
  draw(g, W, H, dpr, t, { village = 100, reduce = false } = {}) {
    const L = layout(W, H);
    const key = `${W}x${H}@${dpr}`;
    if (key !== this.key) { this.cache = paintStatic(L, dpr); this.key = key; }
    g.drawImage(this.cache, 0, 0, W, H);
    paintVillage(g, L, t, village, reduce);
    paintGate(g, L, t);
    return L;
  }
}
