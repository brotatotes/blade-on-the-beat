// Blade on the Beat. Game shell: screens, input, calibration and the night loop.
import { CHARTS, chartById } from './charts/index.js';
import { tickToSec } from './charts/dsl.js';
import { AudioClock, Scheduler } from './engine/clock.js';
import { NightSession } from './engine/session.js';
import { calibrate } from './engine/judge.js';
import { practiceSegments, countInTick, checkpointBefore } from './engine/practice.js';
import { loadSettings, saveSettings as storeSettings } from './engine/settings.js';
import { taiko, rim, clash, thud, swish } from './audio/voices.js';
import { Scene, layout } from './render/scene.js';
import { drawRen, drawFoe, POSES } from './render/figures.js';
import { drawHud, drawLane, hudMetrics } from './render/hud.js';
import { Duel } from './render/duel.js';
import { songJob, musicChain, masterChain, renderSong, composeSong } from './audio/songs.js';
import { newCampaign, recordNight, nextNight, unlocked, villageFor, chooseEnding, NIGHTS } from './story/campaign.js';
import { OPENING, BEFORE, AFTER, ENDINGS, DEFEAT, NIGHT_TITLES } from './story/scenes.js';

const DEBUG = new URLSearchParams(location.search).has('autotest');
// Some private modes throw on any access to localStorage.
const store = (() => { try { return window.localStorage; } catch { return { getItem: () => null, setItem: () => {} }; } })();
const settings = loadSettings(store);
function safeLoad(k) { try { return JSON.parse(store.getItem(k)) || {}; } catch { return {}; } }
const motionQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
function reduced() { return settings.reduceEffects || !!motionQuery?.matches; }
const CAMPAIGN_KEY = 'blade-on-the-beat:campaign';
let campaign = { ...newCampaign(), ...safeLoad(CAMPAIGN_KEY) };
function saveCampaign() { try { store.setItem(CAMPAIGN_KEY, JSON.stringify(campaign)); } catch { /* private mode */ } }
function saveSettings() { storeSettings(store, settings); }

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const g = canvas.getContext('2d');

let ctx = null, clock = null, sched = null, bus = null;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    bus = { music: ctx.createGain(), sfx: ctx.createGain() };
    const master = masterChain(ctx); const chain = musicChain(ctx, master); bus.music.connect(chain); bus.duck = chain.duck; bus.sfx.connect(master);
    clock = new AudioClock(ctx);
    sched = new Scheduler(ctx);
  }
  applyVolumes();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Volumes go through cancel-and-set so a fade from a previous night never
// overrides the player's setting.
function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [node, v] of [[bus.music.gain, settings.music], [bus.sfx.gain, settings.sfx]]) { node.cancelScheduledValues(t); node.setValueAtTime(v, t); }
}

// ---------- screens ----------
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id);
  state.screen = id;
}
const state = { screen: 'title', play: null, cal: null };

// ---------- night play ----------
// startTick > 0 resumes from a checkpoint or a practice passage, with one
// bar of music first. practice = {segment} plays one passage with no damage.
function startNight(id, { startTick = 0, village = villageFor(campaign, id), story = id === nextNight(campaign), practice = null } = {}) {
  audio();
  stopPlay();
  applyVolumes();
  const chart = chartById(id);
  const endTick = practice ? practice.endTick : Infinity;
  const session = new NightSession(chart, { assist: settings.assist, startTick, endTick, village, practice: !!practice });
  const musicTick = startTick > 0 ? countInTick(chart, startTick) : 0;
  const lead = 0.8;
  const songStart = ctx.currentTime + lead - tickToSec(chart, musicTick);
  const play = { chart, session, songStart, fx: [], cursor: 0, ended: false, story: story && !practice, practice, startTick, startVillage: village, cpShown: startTick, cpFlashAt: -1e9, duel: new Duel(chart, { startSec: tickToSec(chart, startTick) }) };
  // The song carries the music, every wind-up cue and every attack beat.
  play.unsched = sched.add(songJob(ctx, bus, chart, songStart, { startTick: musicTick, endTick }));
  session.on((ev) => {
    const t = ctx.currentTime + 0.005;
    if (ev.type === 'judge') {
      if (ev.result !== 'miss') (ev.note.lane === 'counter' ? swish : clash)(ctx, bus.sfx, t, { gain: 0.4, bright: ev.result === 'perfect' ? 1.2 : 0.9 });
      else if (ev.note.lane === 'parry') thud(ctx, bus.sfx, t, { gain: 0.5 });
    }
    const at = performance.now();
    play.duel.react(ev, at, reduced());
    play.fx.push({ ...ev, at });
  });
  sched.start();
  state.play = play;
  show('play');
  return play;
}

function stopPlay() {
  if (state.play) { state.play.unsched?.(); state.play = null; }
}

function songNow(perfMs) {
  const p = state.play;
  clock.refresh();
  return clock.audibleAt(perfMs) - p.songStart - settings.audioOffsetMs / 1000;
}

function onParry(perfMs) {
  if (state.screen === 'calibrate') return calTap(perfMs);
  if (state.screen !== 'play' || !state.play) return;
  return state.play.session.input(songNow(perfMs), 'parry');
}
function onCounter(perfMs, dir) {
  if (state.screen !== 'play' || !state.play) return;
  return state.play.session.input(songNow(perfMs), 'counter', dir);
}

const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (state.screen === 'scene' && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); sceneNext(); return; }
  if (e.code === 'Space' || e.key === ' ') { if (state.screen === 'play' || state.screen === 'calibrate') e.preventDefault(); onParry(e.timeStamp); }
  else if (KEYDIR[e.key]) { e.preventDefault(); onCounter(e.timeStamp, KEYDIR[e.key]); }
  else if (e.key === 'Escape' && state.screen === 'play') leavePlay();
  else if ((e.key === 'Enter' || e.key === 'ArrowRight') && state.screen === 'scene') { e.preventDefault(); sceneNext(); }
});
let touch0 = null;
canvas.addEventListener('pointerdown', (e) => { touch0 = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
canvas.addEventListener('pointerup', (e) => {
  if (!touch0) return;
  const dx = e.clientX - touch0.x, dy = e.clientY - touch0.y;
  const dist = Math.hypot(dx, dy);
  // A tap is judged at touch-down. A swipe is judged at touch-down too, so a
  // long swipe does not make the player late.
  if (dist < 24) onParry(touch0.t);
  else onCounter(touch0.t, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  touch0 = null;
});

// ---------- calibration ----------
function startCalibration() {
  audio();
  stopPlay();
  const bpm = 100, beat = 60 / bpm, count = 16;
  const start = ctx.currentTime + 1;
  const beats = Array.from({ length: count }, (_, i) => start + i * beat);
  const cal = { beats, taps: [], beat, done: false, result: null };
  let i = 0;
  cal.unsched = sched.add((from, until) => {
    while (i < beats.length && beats[i] < until) {
      taiko(ctx, bus.sfx, beats[i], { pitch: i % 4 === 0 ? 90 : 75, gain: 0.8, decay: 0.3 });
      rim(ctx, bus.sfx, beats[i], { gain: 0.3 });
      i++;
    }
  });
  sched.start();
  state.cal = cal;
  $('cal-result').textContent = 'Tap on each drum beat. Sixteen beats.';
  show('calibrate');
}
function calTap(perfMs) {
  const cal = state.cal;
  if (!cal || cal.done) return;
  clock.refresh();
  cal.taps.push(clock.audibleAt(perfMs));
  finishCalibrationIfReady();
}
function finishCalibrationIfReady(force = false) {
  const cal = state.cal;
  if (!cal || cal.done) return;
  const last = cal.beats[cal.beats.length - 1];
  if (!force && clock.audibleNow() < last + cal.beat / 2 && cal.taps.length < cal.beats.length) return;
  cal.done = true;
  cal.unsched?.();
  cal.result = calibrate(cal.taps, cal.beats, cal.beat);
  if (cal.result) {
    settings.audioOffsetMs = cal.result.offsetMs; saveSettings(); syncSettingsUi();
    $('cal-result').textContent = `Offset set to ${cal.result.offsetMs} ms. Your taps varied by about ${cal.result.spreadMs} ms.`;
  } else {
    $('cal-result').textContent = 'Not enough steady taps. Try again.';
  }
}

// ---------- settings UI ----------
function syncSettingsUi() {
  $('set-audio').value = settings.audioOffsetMs; $('val-audio').textContent = `${settings.audioOffsetMs} ms`;
  $('set-visual').value = settings.visualOffsetMs; $('val-visual').textContent = `${settings.visualOffsetMs} ms`;
  $('set-assist').checked = settings.assist;
  $('set-reduce').checked = settings.reduceEffects;
  $('set-music').value = Math.round(settings.music * 100); $('val-music').textContent = `${Math.round(settings.music * 100)}%`;
  $('set-sfx').value = Math.round(settings.sfx * 100); $('val-sfx').textContent = `${Math.round(settings.sfx * 100)}%`;
}
$('set-audio').addEventListener('input', (e) => { settings.audioOffsetMs = +e.target.value; saveSettings(); syncSettingsUi(); });
$('set-visual').addEventListener('input', (e) => { settings.visualOffsetMs = +e.target.value; saveSettings(); syncSettingsUi(); });
$('set-assist').addEventListener('change', (e) => { settings.assist = e.target.checked; saveSettings(); state.play?.session.judge.setAssist(settings.assist); });
$('set-reduce').addEventListener('change', (e) => { settings.reduceEffects = e.target.checked; saveSettings(); });
$('set-music').addEventListener('input', (e) => { settings.music = +e.target.value / 100; saveSettings(); syncSettingsUi(); applyVolumes(); });
$('set-sfx').addEventListener('input', (e) => { settings.sfx = +e.target.value / 100; saveSettings(); syncSettingsUi(); applyVolumes(); });
// A short clash on release so the effects level can be judged by ear.
$('set-sfx').addEventListener('change', () => { audio(); clash(ctx, bus.sfx, ctx.currentTime + 0.02, { gain: 0.4, bright: 1.1 }); });
$('btn-practice').addEventListener('click', () => showPractice());
$('btn-leave').addEventListener('click', (e) => { e.stopPropagation(); leavePlay(); });
$('btn-play').addEventListener('click', beginStory);
$('btn-nights').addEventListener('click', showNights);
$('btn-credits').addEventListener('click', () => show('credits'));
$('btn-restart').addEventListener('click', () => { campaign = newCampaign(); saveCampaign(); showNights(); });
$('scene').addEventListener('click', (e) => { if (e.target.id !== 'scene-skip') sceneNext(); });
$('scene-skip').addEventListener('click', (e) => { e.stopPropagation(); sceneSkip(); });
$('btn-calibrate').addEventListener('click', startCalibration);
$('btn-settings').addEventListener('click', () => { syncSettingsUi(); show('settings'); });
for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => { state.cal?.unsched?.(); stopPlay(); showTitle(); });
$('cal-tap').addEventListener('pointerdown', (e) => { e.preventDefault(); calTap(e.timeStamp); });
syncSettingsUi();

// ---------- drawing ----------
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize); resize();

const scene = new Scene();
const COLORS = { ink: '#15120f', paper: '#e9dfc8', red: '#b3261e', moon: '#f3ead2' };
function frame(now) {
  requestAnimationFrame(frame);
  const W = innerWidth, H = innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const village = state.play ? state.play.session.village : (campaign.ending ? campaign.village : villageFor(campaign, nextNight(campaign) || 1));
  const L = scene.draw(g, W, H, dpr, now / 1000, { village, reduce: reduced() });
  if (state.screen === 'play' && state.play) {
    const p0 = state.play;
    clock.refresh();
    const vt0 = clock.audibleAt(now) - p0.songStart - settings.visualOffsetMs / 1000;
    p0.lastDuel = p0.duel.draw(g, L, vt0, now, { drawRen, drawFoe, enemy: p0.chart.enemy, reduce: reduced(), W, H });
  }
  if (state.screen === 'title') {
    // Ren keeps watch at the gate on the title screen, off to the side of the menu.
    // Placed in open ground, clear of the gate, the lantern and the menu.
    // Desktop: far right, clear of the title. Portrait: small on the horizon
    // at the right edge, where the lit ridge behind gives her a readable edge.
    const tu = L.unit * (L.portrait ? 0.52 : 0.95);
    const tx = L.portrait ? W * 0.81 : W * 0.82;
    const ty = L.ground;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(tx, ty + 2, tu * 0.95, tu * 0.1, 0, 0, Math.PI * 2); g.fill();
    drawRen(g, tx, ty, tu, POSES.guard, now / 1000);
  }
  if (state.screen === 'calibrate' && ctx) finishCalibrationIfReady();
  const p = state.play;
  if (state.screen !== 'play' || !p) return;
  clock.refresh();
  // Visual offset shifts only what is drawn. Positive means draw later.
  const vt = clock.audibleAt(now) - p.songStart - settings.visualOffsetMs / 1000;
  if (!p.ended) p.session.update(clock.audibleAt(now) - p.songStart - settings.audioOffsetMs / 1000);
  const M = hudMetrics(W, H, L);
  const cx = W * 0.5, cy = M.laneY, span = Math.min(W * 0.42, 560);
  const beatSec = 60 / p.chart.bpm;
  const laneFade = p.duel.defeat ? Math.max(0, 1 - (now - p.duel.defeat.at) / 500) : 1;
  g.save(); g.globalAlpha = laneFade;
  drawLane(g, W, H, L, M, ((vt % beatSec) + beatSec) % beatSec / beatSec, reduced());
  g.restore();
  // Upcoming notes slide in from the right over two beats.
  const lookSec = beatSec * 2;
  for (const n of p.session.notes) {
    if (n.result) continue;
    const dt = n.time - vt;
    if (dt > lookSec || dt < -0.2) continue;
    const x = cx + (dt / lookSec) * span;
    const rad = M.ring * (n.kind === 'heavy' ? 0.62 : 0.44);
    g.fillStyle = n.lane === 'counter' ? COLORS.paper : n.target === 'village' ? '#e0822a' : COLORS.red;
    g.beginPath(); g.arc(x, cy, rad, 0, Math.PI * 2); g.fill();
    if (n.kind === 'heavy') { g.strokeStyle = COLORS.ink; g.lineWidth = 2; g.beginPath(); g.arc(x, cy, rad * 0.55, 0, Math.PI * 2); g.stroke(); }
  }
  // Feints appear in the lane as hollow grey ghosts: do not press on these.
  for (const f of p.session.feints) {
    if (f.bitten) continue;
    const dt = f.time - vt;
    if (dt > lookSec || dt < 0.03) continue;
    const x = cx + (dt / lookSec) * span;
    g.save(); g.strokeStyle = 'rgba(222,228,236,0.95)'; g.lineWidth = 3.5; g.setLineDash([5, 4]);
    g.beginPath(); g.arc(x, cy, M.ring * 0.72, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]); g.lineWidth = 2; g.beginPath(); g.moveTo(x - M.ring * 0.25, cy - M.ring * 0.25); g.lineTo(x + M.ring * 0.25, cy + M.ring * 0.25); g.stroke();
    g.font = `italic 600 ${Math.round(M.fs * 1.25)}px "EB Garamond", Georgia, serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(236,240,248,1)';
    g.fillText('wait', x, cy - M.ring * 0.72 - M.fs * 0.45); g.restore();
  }
  const s = p.session.summary();
  const lastNote = p.session.notes[p.session.notes.length - 1];
  drawHud(g, W, H, L, M, { title: p.chart.title, night: p.chart.id, health: s.health, village: s.village, combo: laneFade > 0.5 ? p.session.combo : 0, progress: lastNote ? vt / lastNote.time : 0 });
  const last = p.fx[p.fx.length - 1];
  if (last && now - last.at < 300 && last.type === 'judge') {
    g.textAlign = 'center'; g.font = `${last.result === 'miss' ? 600 : 400} ${Math.round(M.fs * (last.result === 'miss' ? 1.7 : 1.4))}px "EB Garamond", Georgia, serif`;
    const word = last.result.toUpperCase();
    if (last.result === 'miss') { g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = COLORS.ink; g.strokeText(word, cx, cy - M.ring - 12); }
    g.fillStyle = last.result === 'perfect' ? COLORS.moon : last.result === 'good' ? '#c9b88f' : '#ff7a64';
    g.fillText(word, cx, cy - M.ring - 12);
  }
  // Mid-song checkpoint: a quiet marker when Ren passes one.
  const cpNow = p.practice ? null : checkpointBefore(p.chart, vt);
  if (cpNow != null && cpNow > p.cpShown) { p.cpShown = cpNow; p.cpFlashAt = now; }
  if (now - p.cpFlashAt < 1800) {
    const a = Math.min(1, (now - p.cpFlashAt) / 200, (1800 - (now - p.cpFlashAt)) / 400);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#e3857a';
    g.font = `italic ${Math.round(M.fs * 1.3)}px "EB Garamond", Georgia, serif`;
    g.fillText('Checkpoint', cx, cy + M.ring * (L.portrait ? 3.8 : 2.1));
    g.restore();
  }
  if (p.practice) {
    g.save(); g.textAlign = 'center'; g.fillStyle = '#efe6d0';
    g.font = `${Math.round(M.fs * 1.05)}px "EB Garamond", Georgia, serif`;
    g.fillText(`Practice \u00b7 ${p.practice.name}${p.practice.loops ? ` \u00b7 pass ${p.practice.loops + 1}` : ''}`, cx, cy + M.ring * (L.portrait ? 3.8 : 2.1));
    g.restore();
  }
  if (!p.ended && (p.session.done || p.session.health <= 0)) {
    p.ended = true; p.unsched?.(); p.won = p.session.health > 0; p.endAt = now; p.endSong = vt;
    if (!p.won) { bus.music.gain.setTargetAtTime(0, ctx.currentTime, 0.15); }
    p.duel.finish(now, p.won, reduced());
  }
  if (p.ended && !p.reported && now - p.endAt > (p.practice ? 1200 : p.won ? 2600 : 2000)) { p.reported = true; p.practice ? practiceOver(p) : nightOver(p); }
}
requestAnimationFrame(frame);

// ---------- test hook, only with ?autotest ----------
if (DEBUG) {
  window.__blade = {
    charts: CHARTS, settings, startNight, startCalibration, renderSong, composeSong,
    get play() { return state.play; },
    get duel() { const d = state.play?.duel; return d && { particles: d.particles.length, hitStop: performance.now() < d.hitStopUntil, shake: d.shake, defeat: d.defeat, last: state.play.lastDuel?.foe?.phase, reduced: reduced() }; },
    summary: () => state.play?.session.summary(),
    log: () => state.play?.session.log.filter((e) => e.type !== 'whiff').map((e) => ({ type: e.type, result: e.result, delta: e.delta, lane: e.note?.lane, time: e.note?.time })),
    // Press on every note at note.time + errMs (per note override via map).
    autoplay({ errMs = 0, perNote = {} } = {}) {
      const p = state.play; let i = 0;
      const id = setInterval(() => {
        const t = clock.audibleNow() - p.songStart - settings.audioOffsetMs / 1000;
        while (i < p.session.notes.length) {
          const n = p.session.notes[i];
          const err = (perNote[i] ?? errMs) / 1000;
          if (t < n.time + err) break;
          const init = n.lane === 'counter' ? { key: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[n.dir] } : { key: ' ', code: 'Space' };
          window.dispatchEvent(new KeyboardEvent('keydown', init));
          i++;
        }
        if (i >= p.session.notes.length) clearInterval(id);
      }, 2);
      return id;
    },
    get campaign() { return campaign; },
    setCampaign(c) { campaign = { ...newCampaign(), ...c }; saveCampaign(); showTitle(); },
    get screen() { return state.screen; },
    sceneNext, chooseEnding, showEnding, beginStory, showNights, showPractice, startPractice, practiceSegments, leavePlay,
    get volumes() { return ctx && { music: bus.music.gain.value, sfx: bus.sfx.gain.value }; },
    // Force the current night to end now, won or lost, with a given village.
    endNight({ won = true, village } = {}) { const p = state.play; if (village != null) p.session.village = village; if (!won) p.session.health = 0; else p.session.judge.cursor = p.session.notes.length; },
    calTaps(latencyMs) {
      const cal = state.cal;
      return cal.beats.map((b) => b + latencyMs / 1000);
    },
    _clockNow: () => { clock.refresh(); return clock.audibleNow(); },
    finishCalibration: () => finishCalibrationIfReady(true),
    get cal() { return state.cal && { taps: state.cal.taps.length, result: state.cal.result }; },
  };
}

// ---------- story flow ----------
function showTitle() {
  $('btn-play').textContent = campaign.cleared.length && !campaign.ending ? 'Continue' : 'Begin';
  show('title');
}

// A scene is a queue of cards followed by a callback.
function playScene(kicker, cards, then) {
  state.sceneQ = { kicker, cards: [...cards], i: 0, then };
  if (!cards.length) { state.sceneQ = null; then(); return; }
  show('scene');
  renderCard();
}
function renderCard() {
  const q = state.sceneQ; const c = q.cards[q.i]; const el = $('scene-card');
  $('scene-kicker').textContent = q.kicker;
  el.className = 'card'; el.replaceChildren();
  const p = (t, cls) => { const x = document.createElement('p'); if (cls) x.className = cls; x.textContent = t; return x; };
  if (typeof c === 'string') el.append(p(c));
  else if (c.letter) {
    el.classList.add('letter');
    el.append(p(c.from, 'from'), p(c.to), ...c.letter.map((l) => p(l)), p('\u2014 ' + c.sign, 'sign'));
  } else if (c.title) { el.classList.add('ending-title'); el.append(p(c.title)); }
  else { const x = p(c.text); const sp = document.createElement('span'); sp.className = 'speaker'; sp.textContent = c.speaker; x.prepend(sp); el.append(x); }
  $('scene-hint').textContent = 'Tap or press Space to continue';
}
function sceneNext() {
  const q = state.sceneQ; if (!q) return;
  if (++q.i >= q.cards.length) { state.sceneQ = null; q.then(); } else renderCard();
}
function sceneSkip() { const q = state.sceneQ; if (!q) return; state.sceneQ = null; q.then(); }

function nightKicker(n) { return `Night ${n} \u00b7 ${NIGHT_TITLES[n]}`; }

function beginStory() {
  audio();
  if (campaign.ending) { campaign = newCampaign(); saveCampaign(); }
  const n = nextNight(campaign);
  if (n === 1 && !campaign.cleared.length) playScene('Kestrel Gate', OPENING, () => storyNight(1));
  else storyNight(n);
}
function storyNight(n) {
  playScene(nightKicker(n), BEFORE[n], () => startNight(n, { story: true }));
}

function nightOver(p) {
  const n = p.chart.id; const s = p.session.summary();
  const score = s.perfect * 2 + s.good;
  if (!p.won) return showDefeat(p);
  const wasStory = p.story && n === nextNight(campaign);
  campaign = recordNight(campaign, n, { won: true, village: s.village, score });
  saveCampaign();
  stopPlay();
  if (!wasStory) return showResult(`Night ${n} held`, `${s.perfect} perfect, ${s.good} good, ${s.miss} missed. Emberfall ${s.village}%.`, [['Night select', showNights], ['Title', showTitle]]);
  if (n === NIGHTS) return showEnding(campaign.ending);
  playScene(nightKicker(n), AFTER[n], () => showResult(`Night ${n} held`, `${s.perfect} perfect, ${s.good} good, ${s.miss} missed.\nEmberfall stands at ${s.village}%.`, [['Next night', () => storyNight(n + 1)], ['Title', showTitle]]));
}

function showDefeat(p) {
  const n = p.chart.id;
  // The last checkpoint the player passed before falling.
  const reached = checkpointBefore(p.chart, p.endSong ?? 0);
  const opts = { story: p.story, village: p.startVillage };
  stopPlay();
  applyVolumes();
  const acts = [];
  if (reached != null && reached > 0) acts.push(['Retry from checkpoint', () => startNight(n, { ...opts, startTick: reached })]);
  acts.push(['Retry night', () => startNight(n, opts)], ['Title', showTitle]);
  showResult('Defeat', DEFEAT, acts);
}

function showEnding(key) {
  const e = ENDINGS[key];
  playScene('The last night', [{ title: e.title }, ...e.cards], () => show('credits'));
}

function showResult(title, text, actions) {
  $('result-title').textContent = title; $('result-text').textContent = text;
  const nav = $('result-actions'); nav.replaceChildren();
  for (const [label, fn] of actions) { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', fn); nav.append(b); }
  show('result');
}

// ---------- practice ----------
function leavePlay() {
  const p = state.play; stopPlay(); applyVolumes();
  if (p?.practice) showPractice(p.chart.id); else showTitle();
}

let practiceNight = 1;
function showPractice(night = practiceNight) {
  practiceNight = night;
  const tabs = $('practice-nights'); tabs.replaceChildren();
  for (let n = 1; n <= NIGHTS; n++) {
    const b = document.createElement('button');
    b.textContent = n; b.className = 'tab'; b.disabled = !unlocked(campaign, n);
    b.setAttribute('aria-label', `Night ${n}`); b.setAttribute('aria-pressed', String(n === night));
    b.addEventListener('click', () => showPractice(n));
    tabs.append(b);
  }
  $('practice-title').textContent = `Night ${night} \u00b7 ${NIGHT_TITLES[night]}`;
  const list = $('practice-list'); list.replaceChildren();
  for (const seg of practiceSegments(chartById(night))) {
    const b = document.createElement('button');
    b.append(seg.name);
    const small = document.createElement('small');
    small.textContent = `${seg.attacks} attacks, ${seg.counters} counters${seg.feints ? `, ${seg.feints} feints` : ''}`;
    b.append(small);
    b.addEventListener('click', () => startPractice(night, seg));
    list.append(b);
  }
  show('practice');
}
function startPractice(night, seg, loops = 0) {
  startNight(night, { startTick: seg.startTick, village: 100, story: false, practice: { ...seg, loops } });
}
function practiceOver(p) {
  const s = p.session.summary(); const seg = p.practice;
  stopPlay();
  showResult(`Practice \u00b7 ${seg.name}`, `${s.perfect} perfect, ${s.good} good, ${s.miss} missed.`, [
    ['Again', () => startPractice(p.chart.id, seg, seg.loops + 1)],
    ['Choose passage', () => showPractice(p.chart.id)],
    ['Title', showTitle],
  ]);
}

function showNights() {
  const list = $('night-list'); list.replaceChildren();
  for (let n = 1; n <= NIGHTS; n++) {
    const b = document.createElement('button');
    const open = unlocked(campaign, n);
    b.disabled = !open;
    b.innerHTML = '';
    b.append(`Night ${n} \u00b7 ${NIGHT_TITLES[n]}`);
    const small = document.createElement('small');
    small.textContent = !open ? 'Locked' : campaign.cleared.includes(n) ? 'Held' : n === nextNight(campaign) ? 'Next in the story' : '';
    b.append(small);
    b.addEventListener('click', () => { if (n === nextNight(campaign)) storyNight(n); else startNight(n, { story: false, village: 100 }); });
    list.append(b);
  }
  show('nights');
}
showTitle();
