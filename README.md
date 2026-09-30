# Blade on the Beat

A story-driven rhythm duel for the browser. Ren holds Kestrel Gate above the village of Emberfall for seven nights. Every enemy fights to music, and every blow is telegraphed by its wind-up. Watch the wind-up, then parry when the blow lands.

**Play it here:** https://brotatotes.github.io/blade-on-the-beat/

## How to play

- **Parry:** tap the screen, click, or press Space on the beat.
- **Counter:** when a counter phrase is marked, swipe in the shown direction or press the matching arrow key.

Run **Calibrate timing** first, especially on a phone or with Bluetooth headphones. Wired headphones give the steadiest timing. If a night feels too hard, turn on **Assist timing** in Settings for wider windows. **Practice** lets you replay any passage without harm, and every night has mid-song checkpoints.

## How it is built

The whole game is one self-contained `index.html` with no network requests, so it also works when opened straight from disk.

- `src/charts/` holds the seven nights as rhythm charts, written in a small pattern language.
- `src/engine/` holds the audio-clock scheduler, judgement windows, calibration, sessions and saved settings.
- `src/audio/` synthesises every drum, string, flute and cue live with Web Audio. No recordings are used.
- `src/render/` paints the ink-brush scene and duels on a 2D canvas.
- `src/story/` holds the scenes, letters, village meter and endings.
- `tests/` covers chart validity, judgement, song and chart alignment, sessions, assist features and ending logic.
- `tools/difficulty-sim.mjs` plays every night with a simulated player at several skill levels.

```
npm install
npm test
node build.mjs      # writes dist/index.html
```

`index.html` at the top of the repository is a copy of `dist/index.html`. `SCRIPT.md` has the full story text.

## Credits

- [EB Garamond](https://github.com/octaviopardo/EBGaramond12) by Georg Duffner and Octavio Pardo, SIL Open Font License 1.1, embedded as a subset.
- [esbuild](https://esbuild.github.io) for bundling, MIT License.
