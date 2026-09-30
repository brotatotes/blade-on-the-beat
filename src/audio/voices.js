// Small synthesized voices shared by the music and the game feedback.
// Every function takes an absolute AudioContext time.

const noiseBufs = new WeakMap();
function noise(ctx) {
  let buf = noiseBufs.get(ctx);
  if (buf) return buf;
  const len = ctx.sampleRate;
  buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; }
  noiseBufs.set(ctx, buf);
  return buf;
}

// Optional stereo placement. Returns a node to connect into.
function panned(ctx, out, pan) {
  if (!pan || !ctx.createStereoPanner) return out;
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(out);
  return p;
}

function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

// Taiko-like drum: pitched body with a fast downward sweep plus a skin slap.
export function taiko(ctx, out, t, { pitch = 70, gain = 0.9, decay = 0.45 } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch * 2.2, t);
  o.frequency.exponentialRampToValueAtTime(pitch, t + 0.04);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.8, t + decay);
  env(g, t, gain, 0.004, decay);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + decay + 0.05);
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 2400;
  const ng = ctx.createGain();
  env(ng, t, gain * 0.3, 0.001, 0.05);
  n.connect(f).connect(ng).connect(out);
  n.start(t, Math.random() * 0.5, 0.1);
}

// Wooden rim click, used for enemy wind-up cues and the calibration beat.
export function rim(ctx, out, t, { pitch = 1800, gain = 0.5, pan = 0 } = {}) {
  out = panned(ctx, out, pan);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.6, t + 0.03);
  env(g, t, gain, 0.001, 0.05);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + 0.08);
  // A bright noise click on top so the cue cuts through drums and strings.
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = Math.max(2200, pitch * 1.4); f.Q.value = 2;
  const ng = ctx.createGain();
  env(ng, t, gain * 0.9, 0.001, 0.035);
  n.connect(f).connect(ng).connect(out);
  n.start(t, 0.1, 0.05);
}

// Metal clash for a successful parry.
export function clash(ctx, out, t, { gain = 0.5, bright = 1 } = {}) {
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 3200 * bright; f.Q.value = 2.5;
  const g = ctx.createGain();
  env(g, t, gain, 0.001, 0.18);
  n.connect(f).connect(g).connect(out);
  n.start(t, Math.random() * 0.5, 0.25);
  for (const r of [1, 2.76, 5.4]) {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880 * r * bright;
    env(og, t, gain * 0.18 / r, 0.001, 0.35 / r);
    o.connect(og).connect(out);
    o.start(t); o.stop(t + 0.4);
  }
}

// Dull thud when Ren or the village takes a hit.
export function thud(ctx, out, t, { gain = 0.6 } = {}) {
  taiko(ctx, out, t, { pitch: 45, gain, decay: 0.25 });
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 400;
  const g = ctx.createGain();
  env(g, t, gain * 0.6, 0.003, 0.2);
  n.connect(f).connect(g).connect(out);
  n.start(t, 0, 0.25);
}

// Short blade swish for counters.
export function swish(ctx, out, t, { gain = 0.4, up = true, pan = 0 } = {}) {
  out = panned(ctx, out, pan);
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(up ? 900 : 4000, t);
  f.frequency.exponentialRampToValueAtTime(up ? 4000 : 900, t + 0.12);
  const g = ctx.createGain();
  env(g, t, gain, 0.02, 0.12);
  n.connect(f).connect(g).connect(out);
  n.start(t, Math.random() * 0.5, 0.2);
}

// Odaiko: the big war drum. Deep body, long bloom.
export function odaiko(ctx, out, t, { gain = 0.6 } = {}) {
  taiko(ctx, out, t, { pitch: 46, gain, decay: 0.7 });
}

// Shime-daiko: small tight drum that carries the fast patterns.
export function shime(ctx, out, t, { gain = 0.12, pan = 0 } = {}) {
  out = panned(ctx, out, pan);
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.6;
  const g = ctx.createGain();
  env(g, t, gain, 0.001, 0.05);
  n.connect(f).connect(g).connect(out);
  n.start(t, Math.random() * 0.5, 0.08);
  const o = ctx.createOscillator();
  const og = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.05);
  env(og, t, gain * 0.8, 0.001, 0.06);
  o.connect(og).connect(out);
  o.start(t); o.stop(t + 0.1);
}

// Low strings: detuned saws through a lowpass that opens with intensity.
export function strings(ctx, out, t, dur, { freqs = [110], gain = 0.08, bright = 0.5 } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 700 + 2000 * bright; f.Q.value = 0.9;
  const g = ctx.createGain();
  const a = Math.min(0.35, dur * 0.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + a);
  g.gain.setValueAtTime(gain, t + Math.max(a, dur - 0.12));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1);
  f.connect(g).connect(out);
  for (const fr of freqs) for (const det of [-7, 6]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det;
    const og = ctx.createGain(); og.gain.value = 1 / (freqs.length * 2);
    o.connect(og).connect(f);
    o.start(t); o.stop(t + dur + 0.15);
  }
}

// Shakuhachi-like lead: sine with a little second harmonic, slow vibrato and
// a breath burst at the attack.
export function flute(ctx, out, t, dur, { freq = 440, gain = 0.1, pan = 0 } = {}) {
  out = panned(ctx, out, pan);
  const g = ctx.createGain();
  const hold = Math.max(0.05, dur - 0.06);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.04);
  g.gain.setValueAtTime(gain * 0.85, t + hold);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.08);
  g.connect(out);
  const vib = ctx.createOscillator();
  const vg = ctx.createGain();
  vib.frequency.value = 5.2; vg.gain.value = dur > 0.4 ? freq * 0.008 : 0;
  vib.connect(vg);
  for (const [h, lvl] of [[1, 1], [2, 0.3], [3, 0.1], [4, 0.03]]) {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * h * 0.985, t); o.frequency.linearRampToValueAtTime(freq * h, t + 0.05);
    vg.connect(o.frequency);
    const og = ctx.createGain(); og.gain.value = lvl;
    o.connect(og).connect(g);
    o.start(t); o.stop(t + dur + 0.1);
  }
  vib.start(t); vib.stop(t + dur + 0.1);
  breath(ctx, out, t, { gain: gain * 0.7, freq: Math.min(6000, freq * 4), dur: 0.07 });
}

// Breath noise. Also the sound of a feint: an intake with no strike after it.
export function breath(ctx, out, t, { gain = 0.2, freq = 1200, dur = 0.18 } = {}) {
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + dur * 0.6);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g).connect(out);
  n.start(t, Math.random() * 0.5, dur + 0.02);
}

// Plucked string (koto-like) for the Dancer.
export function pluck(ctx, out, t, { freq = 440, gain = 0.1 } = {}) {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 8, t); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.3);
  env(g, t, gain * 1.6, 0.002, 0.6);
  o.connect(f).connect(g).connect(out);
  o.start(t); o.stop(t + 0.7);
}

// Low bowed bass line for the heavy bosses.
export function bass(ctx, out, t, dur, { freq = 80, gain = 0.15 } = {}) {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.value = freq * 5;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.03);
  g.gain.setValueAtTime(gain * 0.7, t + Math.max(0.04, dur - 0.05));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(f).connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.1);
}
