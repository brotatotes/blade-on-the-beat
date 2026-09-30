import { chart } from './dsl.js';

// Night 2, The Drummer. Heavy downbeats answered by off-beat strikes.
export default chart({
  id: 2, key: 'drummer', title: 'The Drummer', enemy: 'drummer', bpm: 92,
  motif: 'drummer', identity: 'Heavy downbeats with off-beat strikes between them',
}, (c) => {
  c.section('The War Drum', { motif: 'intro', intensity: 0.4 });
  c.rest(8);
  c.section('Heavy Hands', { motif: 'drummer', intensity: 0.6, checkpoint: true });
  c.phrase('H...H...');
  c.phrase('H..xH...');
  c.phrase('H..xH..x');
  c.counter('D.D.');
  c.phrase('.x.x.x.x');
  c.phrase('H..x.xH.');
  c.counter('D.U.D.U.');
  c.rest(4);
  c.section('Between the Beats', { motif: 'drummer', intensity: 0.8, checkpoint: true });
  c.phrase('H.x.H.x.');
  c.phrase('.xH..xH.');
  c.phrase('H..x..xH');
  c.counter('DUDU');
  c.phrase('.x.xH.H.');
  c.phrase('H.xxH..x');
  c.counter('D.UDD.U.');
  c.rest(4);
  c.section('The Drummer Circles', { motif: 'drummer', intensity: 0.9, checkpoint: true });
  c.phrase('H.x..xH.');
  c.phrase('H..xH..x');
  c.phrase('.x.xH.x.');
  c.counter('D.U.DUD.');
  c.phrase('H.xxH.x.');
  c.counter('DUDU');
  c.rest(4);
  c.section('The Drum Splits', { motif: 'drummer', intensity: 1, checkpoint: true });
  c.phrase('H.x.xH.x');
  c.phrase('.xxH.xxH');
  c.phrase('H..xH.x.|.xH..xH.', { segBeats: 4 });
  c.counter('DUDUD.D.', { finisher: true });
  c.section('Quiet', { motif: 'outro', intensity: 0.3 });
  c.rest(8);
});
