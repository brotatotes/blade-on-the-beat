// Duel HUD: night title, Ren's and Emberfall's ink bars, combo, and the note
// lane in the lower third, where the ground would otherwise sit empty.
import { stroke, rng } from './brush.js';

const PAPER = '#e9dfc8', DIM = '#a79c86', RED = '#b3261e', EMBER = '#e0822a', MOON = '#f3ead2';
const SERIF = '"EB Garamond", Garamond, Georgia, serif';

export function hudMetrics(W, H, L) {
  const fs = Math.max(13, Math.min(22, Math.min(W, H) * 0.034));
  const laneY = L.ground + (H - L.ground) * (L.portrait ? 0.42 : 0.45);
  const ring = Math.max(22, Math.min(36, Math.min(W, H) * 0.05));
  return { fs, laneY, ring, pad: Math.max(14, fs * 1.1) };
}

// A brushed bar: a faint full-length track, then a loaded stroke for the value.
function bar(g, x, y, w, value, color, align, fs, seed) {
  const r = rng(seed);
  const th = Math.max(6, fs * 0.42);
  g.fillStyle = 'rgba(233,223,200,0.16)';
  stroke(g, [[x, y], [x + w * 0.5, y - 1], [x + w, y]], th * 0.7, th * 0.5, { belly: 1 });
  const k = Math.max(0, Math.min(1, value / 100));
  if (k <= 0) return;
  const x0 = align === 'right' ? x + w * (1 - k) : x;
  const x1 = align === 'right' ? x + w : x + w * k;
  g.fillStyle = color;
  stroke(g, [[x0, y + (r() - 0.5)], [(x0 + x1) / 2, y - 1.2], [x1, y + (r() - 0.5)]], th, th * 0.45, { belly: 1.15 });
}

function label(g, text, x, y, fs, align, color = DIM) {
  g.font = `${Math.round(Math.max(12, fs * 0.95))}px ${SERIF}`;
  g.textAlign = align; g.fillStyle = color;
  g.fillText(text, x, y);
}

export function drawHud(g, W, H, L, M, { title, night, health, village, combo, progress }) {
  const { fs, pad } = M;
  g.save();
  g.textBaseline = 'alphabetic';
  // Night title, top centre.
  g.font = `${Math.max(12, Math.round(fs * 0.7))}px ${SERIF}`; g.textAlign = 'center'; g.fillStyle = DIM;
  g.fillText(`Night ${night}`.toUpperCase().split('').join('\u200a'), W / 2, pad + fs * 0.5);
  g.font = `${Math.round(fs * 1.25)}px ${SERIF}`; g.fillStyle = PAPER;
  g.fillText(title, W / 2, pad + fs * 1.7);
  // Song progress: a hairline under the title.
  const pw = Math.min(W * 0.3, 220);
  g.fillStyle = 'rgba(233,223,200,0.18)'; g.fillRect(W / 2 - pw / 2, pad + fs * 2.2, pw, 1.5);
  g.fillStyle = RED; g.fillRect(W / 2 - pw / 2, pad + fs * 2.2, pw * Math.max(0, Math.min(1, progress)), 1.5);
  // Bars: Ren top left, Emberfall top right. In portrait they sit below the title.
  const bw = L.portrait ? W * 0.38 : Math.min(W * 0.24, 300);
  const by = L.portrait ? pad + fs * 3.9 : pad + fs * 1.3;
  label(g, 'REN', pad, by - fs * 0.55, fs, 'left');
  bar(g, pad, by, bw, health, PAPER, 'left', fs, 3);
  label(g, 'EMBERFALL', W - pad, by - fs * 0.55, fs, 'right');
  bar(g, W - pad - bw, by, bw, village, EMBER, 'right', fs, 5);
  // Combo: large and quiet, to the left of the ring so it never sits under
  // the judgement word above the ring. Only while a chain is live.
  if (combo >= 2) {
    const x = W / 2 - M.ring * 2.4;
    g.textAlign = 'right';
    g.font = `${Math.round(fs * 1.5)}px ${SERIF}`; g.fillStyle = combo >= 8 ? MOON : PAPER;
    g.fillText(String(combo), x, M.laneY + fs * 0.1);
    g.font = `${Math.round(fs * 0.85)}px ${SERIF}`; g.fillStyle = PAPER;
    g.fillText('chain', x, M.laneY + fs * 1.0);
  }
  g.restore();
}

// The lane: a brushed line across the lower third with the strike ring on
// the centre. The ring swells slightly on every beat.
export function drawLane(g, W, H, L, M, beatPhase, reduce) {
  const { laneY, ring } = M;
  const cx = W / 2;
  g.save();
  g.fillStyle = 'rgba(233,223,200,0.14)';
  // On short landscape phones the lane starts right of the Leave button.
  const x0 = !L.portrait && H < 520 ? Math.max(W * 0.06, 104) : W * 0.06;
  stroke(g, [[x0, laneY + 1], [W * 0.5, laneY - 1], [W - x0, laneY + 1]], 3, 1, { belly: 1 });
  const pulse = reduce ? 0 : Math.max(0, 1 - beatPhase * 4) * 0.12;
  const glow = g.createRadialGradient(cx, laneY, ring * 0.6, cx, laneY, ring * 2.2);
  glow.addColorStop(0, `rgba(243,234,210,${0.12 + pulse})`); glow.addColorStop(1, 'rgba(243,234,210,0)');
  g.fillStyle = glow; g.fillRect(cx - ring * 2.3, laneY - ring * 2.3, ring * 4.6, ring * 4.6);
  g.strokeStyle = MOON; g.lineWidth = 2.5;
  g.beginPath(); g.arc(cx, laneY, ring * (1 + pulse * 0.6), 0, Math.PI * 2); g.stroke();
  if (L.portrait) {
    // Thumb hint in the space below the ring on phones.
    g.font = `500 ${Math.round(M.fs * 0.98)}px ${SERIF}`; g.textAlign = 'center'; g.fillStyle = 'rgba(236,226,202,0.96)';
    g.fillText('Tap to parry  \u00b7  swipe to counter', cx, laneY + ring * 2.6);
  }
  g.strokeStyle = 'rgba(243,234,210,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.arc(cx, laneY, ring * 0.55, 0, Math.PI * 2); g.stroke();
  g.restore();
}

function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n] || String(n); }
