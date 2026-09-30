// Saved settings. Values are checked and clamped on load, so a damaged or
// old save can never break timing or silence the game by accident.

export const SETTINGS_KEY = 'blade-on-the-beat:settings';
export const DEFAULTS = Object.freeze({ audioOffsetMs: 0, visualOffsetMs: 0, assist: false, music: 0.8, sfx: 0.8, reduceEffects: false });
const RANGES = { audioOffsetMs: [-200, 300], visualOffsetMs: [-150, 150], music: [0, 1], sfx: [0, 1] };

export function sanitize(raw) {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    const v = Number(raw[k]);
    if (raw[k] !== null && raw[k] !== '' && Number.isFinite(v)) out[k] = Math.min(hi, Math.max(lo, v));
  }
  out.audioOffsetMs = Math.round(out.audioOffsetMs);
  out.visualOffsetMs = Math.round(out.visualOffsetMs);
  for (const k of ['assist', 'reduceEffects']) if (typeof raw[k] === 'boolean') out[k] = raw[k];
  return out;
}

export function loadSettings(storage) {
  try { return sanitize(JSON.parse(storage.getItem(SETTINGS_KEY))); } catch { return { ...DEFAULTS }; }
}

export function saveSettings(storage, settings) {
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(sanitize(settings))); return true; } catch { return false; }
}
