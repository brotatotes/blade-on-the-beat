// Ink silhouettes for Ren and each enemy. Each figure is drawn from a small
// pose object so the duel code can blend between stances: guard, windup,
// strike, parry, hurt and fallen. Coordinates are in units above the ground.
import { stroke, blob, rng } from './brush.js';
import { INK, RED, PAPER } from './scene.js';
// Figures further back are painted in lighter, cooler ink rather than
// transparency, so they read as depth instead of ghosts.
const HAZE = '#34313a', HAZE2 = '#3a3740';

const lerp = (a, b, k) => a + (b - a) * k;
export const POSES = {
  // Guard holds the blade low and forward so a wind-up is a big change.
  guard: { lean: 0.05, arm: -0.3, blade: -0.8, crouch: 0.05 },
  windup: { lean: -0.42, arm: -2.2, blade: -2.75, crouch: 0.24 },
  strike: { lean: 0.36, arm: 0.1, blade: 0.3, crouch: 0.2 },
  // Parry: weight in, hand high, blade flat across the line of the cut.
  parry: { lean: 0.3, arm: -0.95, blade: 0.45, crouch: 0.18 },
  hurt: { lean: -0.5, arm: 0.7, blade: 1.0, crouch: 0.0 },
  fallen: { lean: -1.3, arm: 1.2, blade: 2.9, crouch: 0.4 },
};
export function blend(a, b, k) {
  const out = {};
  for (const key of Object.keys(POSES.guard)) out[key] = lerp(a[key], b[key], k);
  return out;
}

// Generic swordsman body. face: 1 faces right, -1 faces left.
function body(g, x, y, u, pose, face, { hair = false, sash = false, hat = false, kasa = false, mask = false, cape = false, coat = false, bulk = 1, height = 1, blade = true, bladeLen = 1.25, stoop = 0, t = 0, ink = INK } = {}) {
  const h = u * 2.2 * height;
  const lean = (pose.lean + stoop) * face;
  const hipY = y - h * (0.42 - pose.crouch * 0.4);
  const hip = [x, hipY];
  const neck = [x + Math.sin(lean) * h * 0.4, hipY - Math.cos(lean) * h * 0.4];
  const head = [neck[0] + Math.sin(lean) * u * 0.18, neck[1] - u * 0.26];
  g.fillStyle = ink;
  // Legs in a wide stance, with a brush flick at each foot.
  const st = u * 0.55 * bulk;
  stroke(g, [hip, [x + face * st * 0.6, lerp(hipY, y, 0.5)], [x + face * st, y]], u * 0.3 * bulk, u * 0.1, { belly: 1.1 });
  stroke(g, [hip, [x - face * st * 0.5, lerp(hipY, y, 0.55)], [x - face * st * 1.1, y]], u * 0.28 * bulk, u * 0.1, { belly: 1.1 });
  // Robe: a wide wedge from the shoulders flaring past the hips.
  const wind = Math.sin(t * 2.1) * u * 0.06;
  g.beginPath();
  g.moveTo(neck[0] - u * 0.22 * bulk, neck[1] + u * 0.05);
  g.quadraticCurveTo(hip[0] - u * 0.5 * bulk, hipY, hip[0] - face * u * 0.62 * bulk + wind, hipY + u * 0.42);
  g.lineTo(hip[0] + face * u * 0.55 * bulk, hipY + u * 0.36);
  g.quadraticCurveTo(hip[0] + u * 0.42 * bulk, hipY - u * 0.1, neck[0] + u * 0.22 * bulk, neck[1] + u * 0.05);
  g.closePath(); g.fill();
  if (coat) {
    // A long travelling coat that hangs to the shins with real weight.
    g.beginPath();
    g.moveTo(neck[0] - u * 0.26 * bulk, neck[1] + u * 0.02);
    g.quadraticCurveTo(hip[0] - face * u * 0.55 * bulk, hipY + u * 0.2, hip[0] - face * u * 0.7 * bulk + wind * 0.5, y - u * 0.18);
    g.lineTo(hip[0] + face * u * 0.5 * bulk, hipY + u * 0.5);
    g.quadraticCurveTo(hip[0] + face * u * 0.35, hipY - u * 0.1, neck[0] + u * 0.24 * bulk, neck[1] + u * 0.04);
    g.closePath(); g.fill();
  }
  if (cape) {
    g.beginPath();
    g.moveTo(neck[0], neck[1]);
    g.quadraticCurveTo(neck[0] - face * u * 0.9, hipY - u * 0.2, neck[0] - face * u * (1.3 + wind / u), hipY + u * 0.5);
    g.lineTo(neck[0] - face * u * 0.2, hipY + u * 0.2);
    g.closePath(); g.fill();
  }
  // Head.
  const r = rng(3);
  blob(g, head[0], head[1], u * 0.19, u * 0.21, r, 0.08);
  if (hair) {
    // Ren's tied hair streams back from the crown, catching the wind.
    stroke(g, [[head[0] - face * u * 0.05, head[1] - u * 0.16], [head[0] - face * u * 0.45, head[1] - u * 0.1 + wind], [head[0] - face * u * 0.85, head[1] + u * 0.08 + wind * 2]], u * 0.16, u * 0.02, { belly: 1.3 });
  }
  if (hat) {
    // Lacquered jingasa: a solid low cone that covers the crown, so it reads
    // as a hat on the head rather than a disc floating above it.
    g.beginPath();
    g.moveTo(head[0] - u * 0.4, head[1] + u * 0.02);
    g.lineTo(head[0] - u * 0.08, head[1] - u * 0.3);
    g.quadraticCurveTo(head[0], head[1] - u * 0.36, head[0] + u * 0.08, head[1] - u * 0.3);
    g.lineTo(head[0] + u * 0.4, head[1] + u * 0.02);
    g.quadraticCurveTo(head[0], head[1] + u * 0.08, head[0] - u * 0.4, head[1] + u * 0.02);
    g.fill();
  }
  if (kasa) {
    // Wide conical straw hat, brim tilted low over the eyes.
    g.beginPath();
    g.moveTo(head[0] - u * 0.62, head[1] + u * 0.02);
    g.quadraticCurveTo(head[0] - u * 0.1, head[1] - u * 0.34, head[0] + face * u * 0.02, head[1] - u * 0.4);
    g.quadraticCurveTo(head[0] + u * 0.1, head[1] - u * 0.34, head[0] + u * 0.62, head[1] + u * 0.06);
    g.quadraticCurveTo(head[0], head[1] - u * 0.06, head[0] - u * 0.62, head[1] + u * 0.02);
    g.fill();
  }
  if (mask) {
    g.fillStyle = PAPER;
    g.beginPath(); g.ellipse(head[0] + face * u * 0.06, head[1], u * 0.13, u * 0.17, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = RED; g.fillRect(head[0] + face * u * 0.02, head[1] - u * 0.04, u * 0.1, u * 0.025);
    g.fillStyle = ink;
  }
  if (sash) {
    g.fillStyle = RED;
    stroke(g, [[hip[0] - u * 0.3, hipY - u * 0.05], [hip[0] + u * 0.3, hipY - u * 0.1]], u * 0.1, u * 0.08, { belly: 1 });
    stroke(g, [[hip[0] - face * u * 0.2, hipY - u * 0.05], [hip[0] - face * u * 0.55, hipY + u * 0.25 + wind], [hip[0] - face * u * 0.8, hipY + u * 0.3 + wind * 2]], u * 0.08, u * 0.01);
    g.fillStyle = ink;
  }
  // Sword arm: shoulder to hand, then the blade continues at its own angle.
  const sh = [neck[0] + face * u * 0.12, neck[1] + u * 0.1];
  const armA = pose.arm, bladeA = pose.blade;
  const hand = [sh[0] + face * Math.cos(armA) * u * 0.62, sh[1] + Math.sin(armA) * u * 0.62];
  stroke(g, [sh, [lerp(sh[0], hand[0], 0.5), lerp(sh[1], hand[1], 0.5) + u * 0.05], hand], u * 0.16, u * 0.09, { belly: 1 });
  if (blade) {
    const tip = [hand[0] + face * Math.cos(bladeA) * u * bladeLen, hand[1] + Math.sin(bladeA) * u * bladeLen];
    g.fillStyle = '#d9d0bd';
    stroke(g, [hand, [lerp(hand[0], tip[0], 0.5), lerp(hand[1], tip[1], 0.5)], tip], u * 0.06, u * 0.015, { belly: 1 });
    g.fillStyle = ink;
    return { head, hand, tip, hip, neck };
  }
  return { head, hand, tip: hand, hip, neck };
}

export function drawRen(g, x, y, u, pose, t) {
  return body(g, x, y, u, pose, 1, { hair: true, sash: true, t });
}

// Each enemy keeps the shared skeleton but adds a signature shape.
export function drawFoe(g, key, x, y, u, pose, t, extra = {}) {
  const face = -1;
  // Rear figures stand behind the lead; on narrow screens they close ranks
  // so nobody is cut off by the right edge.
  const back = (k) => Math.min(u * k, (extra.room ?? Infinity) - u * 0.7);
  // When there is no room behind the lead (portrait phones), the others stand
  // further up the pass on a rock ledge, small and hazy, clear of the lead.
  const cramped = (extra.room ?? Infinity) < u * 2.4;
  // On narrow phones there is no room behind the lead, so the companions stay
  // off-screen and the duel reads as one clean pair.
  const rear = (k, scale, p2, opts) => (cramped ? null : body(g, x + back(k), y, u * scale, p2, face, opts));
  switch (key) {
    case 'scouts': {
      // Two light scouts, the rear one smaller and half in shadow.
      rear(1.35, 0.7, POSES.guard, { hat: true, t: t + 1, ink: HAZE, blade: false });
      g.fillStyle = INK;
      return body(g, x, y, u * 0.95, pose, face, { hat: true, t });
    }
    case 'drummer': {
      // A broad drummer with a great drum on his back and a mallet for a blade.
      const r = rng(11);
      g.fillStyle = INK;
      blob(g, x + u * 0.55, y - u * 1.45, u * 0.62, u * 0.62, r, 0.05, 30);
      g.fillStyle = RED; g.beginPath(); g.arc(x + u * 0.55, y - u * 1.45, u * 0.44, 0, Math.PI * 2); g.fill();
      g.fillStyle = INK; g.beginPath(); g.arc(x + u * 0.55, y - u * 1.45, u * 0.36, 0, Math.PI * 2); g.fill();
      const b = body(g, x, y, u, pose, face, { bulk: 1.35, t, blade: false });
      g.fillStyle = INK;
      stroke(g, [b.hand, [b.hand[0] - u * 0.5 * Math.cos(pose.blade), b.hand[1] + u * 0.5 * Math.sin(pose.blade)]], u * 0.12, u * 0.2);
      blob(g, b.hand[0] - u * 0.55 * Math.cos(pose.blade), b.hand[1] + u * 0.55 * Math.sin(pose.blade), u * 0.14, u * 0.14, r, 0.1);
      return b;
    }
    case 'archers': {
      // Twin archers, one high on the left ridge, one on the right. Only the
      // right archer stands in the duel spot; the left is drawn by the duel.
      return archer(g, x, y, u, pose, face, t, extra.side === 'L');
    }
    case 'raiders': {
      // One companion hangs back in the haze, far enough that the lead's torch
      // has clear air. A third figure only cluttered the pines, so he is gone.
      if (!cramped) body(g, x + back(1.85), y, u * 0.66, POSES.guard, face, { t: t + 2, ink: HAZE, blade: false });
      g.fillStyle = INK;
      const b = body(g, x, y, u, pose, face, { t, bladeLen: 0.9 });
      // The torch hangs low in the rear hand, trailing behind the hip, so the
      // flame never shares space with either blade or the raider's own head.
      const sh = [b.neck[0] - face * u * 0.1, b.neck[1] + u * 0.12];
      // On narrow screens the torch tucks in closer so its glow stays on screen.
      const reach = cramped ? 0.55 : 1;
      const hand = [b.hip[0] - face * u * 0.62 * reach, b.hip[1] + u * 0.08];
      g.fillStyle = INK;
      stroke(g, [sh, [lerp(sh[0], hand[0], 0.5) - face * u * 0.06, lerp(sh[1], hand[1], 0.5)], hand], u * 0.14, u * 0.09, { belly: 1 });
      const fx = hand[0] - face * u * 0.34 * reach, fy = hand[1] - u * 0.46;
      g.fillStyle = '#3a2a1c';
      stroke(g, [[hand[0] + face * u * 0.04, hand[1] + u * 0.1], [fx, fy + u * 0.1]], u * 0.07, u * 0.05);
      torch(g, fx, fy, u, t);
      g.fillStyle = INK;
      return b;
    }
    case 'dancer': {
      // The masked dancer: slimmer, taller, a long ribbon and twin fans.
      const b = body(g, x, y, u, pose, face, { mask: true, height: 1.1, bulk: 0.85, cape: true, t });
      g.fillStyle = RED;
      const k = Math.sin(t * 3) * u * 0.2;
      stroke(g, [b.neck, [b.neck[0] + u * 0.8, b.neck[1] - u * 0.3 + k], [b.neck[0] + u * 1.6, b.neck[1] + u * 0.2 - k], [b.neck[0] + u * 2.1, b.neck[1] - u * 0.1 + k]], u * 0.06, u * 0.02, { belly: 1 });
      g.fillStyle = INK;
      return b;
    }
    case 'ram': {
      // A battering ram carried by a crew, with an armoured lead who swings the blade.
      g.fillStyle = INK;
      const pull = pose.lean * u * 0.8;
      stroke(g, [[x + u * 0.4 - pull, y - u * 1.0], [x + u * 3.4 - pull, y - u * 1.1]], u * 0.5, u * 0.42, { belly: 1 });
      g.fillStyle = RED; blob(g, x + u * 0.35 - pull, y - u * 1.0, u * 0.28, u * 0.3, rng(5), 0.1);
      for (let i = 2; i >= 0; i--) body(g, x + u * (1.3 + i * 0.85) - pull, y, u * 0.85, POSES.guard, face, { blade: false, t: t + i, ink: HAZE });
      g.fillStyle = INK;
      return body(g, x - u * 0.5, y, u * 1.05, pose, face, { bulk: 1.2, hat: true, t });
    }
    case 'aldric':
    default:
      // Aldric: tall, cloaked, grey sash. Ren's teacher mirrors her stance.
      // Aldric: Ren's teacher. Older and heavier, a kasa low over his eyes, a
      // long coat and a longer blade. He shares her stance, not her shape.
      return body(g, x, y, u, pose, face, { coat: true, kasa: true, height: 1.1, bulk: 1.15, bladeLen: 1.6, stoop: 0.06, t });
  }
}

function archer(g, x, y, u, pose, face, t, dim) {
  const b = body(g, x, y, u, POSES.guard, face, { t, blade: false, hat: true });
  // Bow drawn toward Ren; the draw follows the wind-up pose.
  const draw = Math.max(0, -pose.arm - 0.6) / 1.7;
  g.strokeStyle = INK; g.lineWidth = u * 0.07;
  g.beginPath(); g.arc(b.hand[0] - u * 0.1, b.hand[1], u * 0.7, Math.PI * 0.62, Math.PI * 1.38); g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = dim ? '#8a806e' : PAPER;
  const top = [b.hand[0] - u * 0.1 + Math.cos(Math.PI * 0.62) * u * 0.7, b.hand[1] + Math.sin(Math.PI * 0.62) * u * 0.7];
  const bot = [top[0], b.hand[1] - (top[1] - b.hand[1])];
  const nock = [b.hand[0] + u * (0.1 + draw * 0.5), b.hand[1]];
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(nock[0], nock[1]); g.lineTo(bot[0], bot[1]); g.stroke();
  return b;
}

// A tapered, flickering flame with a hot core and a warm spill of light.
function torch(g, fx, fy, u, t) {
  const halo = g.createRadialGradient(fx, fy, 0, fx, fy, u * 0.55);
  halo.addColorStop(0, 'rgba(236,150,60,0.42)'); halo.addColorStop(1, 'rgba(236,150,60,0)');
  g.fillStyle = halo; g.fillRect(fx - u * 0.55, fy - u * 0.55, u * 1.1, u * 1.1);
  const tongue = (w, h, sway, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(fx - w, fy + u * 0.1);
    g.quadraticCurveTo(fx - w * 1.1, fy - h * 0.4, fx + sway, fy - h);
    g.quadraticCurveTo(fx + w * 1.1, fy - h * 0.4, fx + w, fy + u * 0.1);
    g.quadraticCurveTo(fx, fy + u * 0.2, fx - w, fy + u * 0.1);
    g.fill();
  };
  const f1 = Math.sin(t * 13) * u * 0.05, f2 = Math.sin(t * 17 + 1) * u * 0.04;
  tongue(u * 0.15, u * 0.48, f1, '#c4471c');
  tongue(u * 0.1, u * 0.36, f2 - u * 0.04, '#e0822a');
  tongue(u * 0.055, u * 0.2, f1 * 0.5, '#f6d58a');
  // Two embers drifting up.
  g.fillStyle = '#f0a04a';
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.7 + i * 0.5) % 1;
    g.globalAlpha = 1 - k;
    g.beginPath(); g.arc(fx + Math.sin(t * 3 + i * 2) * u * 0.12, fy - u * (0.5 + k * 0.7), u * 0.025, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}
