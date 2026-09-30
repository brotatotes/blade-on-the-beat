// Ink-brush primitives for Canvas 2D. Everything is deterministic from a seed
// so the static layers look hand-painted but never flicker between frames.

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Catmull-Rom sample of a poly-line so strokes bend smoothly.
function smooth(pts, per = 6) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// A tapered brush stroke along points. w0 is the width at the start, w1 at the
// end, and the middle swells by `belly`. `rough` adds a dry-brush wobble.
export function stroke(g, pts, w0, w1 = w0 * 0.2, { belly = 1.15, rough = 0, r = null } = {}) {
  const p = smooth(pts);
  const n = p.length;
  if (n < 2) return;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const t = i / (n - 1);
    let w = (w0 + (w1 - w0) * t) * (1 + (belly - 1) * Math.sin(Math.PI * t)) * 0.5;
    if (rough && r) w *= 1 + (r() - 0.5) * rough;
    left.push([p[i][0] - dy * w, p[i][1] + dx * w]);
    right.push([p[i][0] + dy * w, p[i][1] - dx * w]);
  }
  g.beginPath();
  g.moveTo(left[0][0], left[0][1]);
  for (const q of left) g.lineTo(q[0], q[1]);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  g.fill();
}

// A soft irregular blob, used for heads, drums and ink splashes.
export function blob(g, x, y, rx, ry, r, wobble = 0.12, steps = 18) {
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * wobble;
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
}

// A mountain ridge filled down to `bottom`, built from midpoint displacement so
// the crest reads like a single loaded brush dragged across the paper.
export function ridge(g, x0, x1, baseY, amp, bottom, r, { detail = 7, peaks = [] } = {}) {
  let pts = [[x0, baseY + (r() - 0.5) * amp], [x1, baseY + (r() - 0.5) * amp]];
  for (const pk of peaks) pts.splice(pts.length - 1, 0, [x0 + (x1 - x0) * pk[0], baseY - amp * pk[1]]);
  pts.sort((a, b) => a[0] - b[0]);
  let d = amp * 0.6;
  for (let k = 0; k < detail; k++) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(pts[i]);
      next.push([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2 + (r() - 0.5) * d]);
    }
    next.push(pts[pts.length - 1]);
    pts = next; d *= 0.55;
  }
  g.beginPath();
  g.moveTo(x0, bottom);
  for (const p of pts) g.lineTo(p[0], p[1]);
  g.lineTo(x1, bottom);
  g.closePath();
  g.fill();
  return pts;
}

// Dry-brush speckle, used sparingly for paper texture and ink spatter.
export function speckle(g, x, y, w, h, count, size, r) {
  for (let i = 0; i < count; i++) {
    const s = size * (0.3 + r());
    g.fillRect(x + r() * w, y + r() * h, s, s * (0.4 + r()));
  }
}
