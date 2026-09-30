import { chart } from './dsl.js';

// Night 7, Aldric. Every earlier rhythm returns, and some wind-ups are feints (f).
// Ren's theme returns in the final section.
export default chart({
  id: 7, key: 'aldric', title: 'Aldric', enemy: 'aldric', bpm: 116,
  motif: 'aldric', identity: 'Every earlier pattern plus feints, with Ren\'s theme answering',
}, (c) => {
  c.section('Teacher', { motif: 'intro', intensity: 0.5 });
  c.rest(8);
  c.section('Old Lessons', { motif: 'aldric', intensity: 0.7, checkpoint: true });
  c.phrase('x.x.xxx.');
  c.phrase('H..xH.x.');
  c.phrase('L.R.LR.R');
  c.counter('U.D.<.>.');
  c.phrase('x.f.x.x.');
  c.phrase('xf.xH.f.');
  c.counter('UDUD<><>');
  c.rest(4);
  c.section('Lies in the Blade', { motif: 'aldric', intensity: 0.85, checkpoint: true });
  c.phrase('x.xx.x..xx..');
  c.phrase('t.xft.x.');
  c.phrase('r.xrx.r.x.x.');
  c.counter('<.><.>U.DU.D');
  c.phrase('LR..LRLR|H.xfH.x.');
  c.counter('UD<>UD<>');
  c.rest(4);
  c.section('Every Night at Once', { motif: 'aldric', intensity: 0.95, checkpoint: true });
  c.phrase('xxxft.xt');
  c.phrase('LRL.L.RL');
  c.phrase('H.xfH.fx');
  c.counter('UD<>UDUD');
  c.phrase('r.x.r.f.xrx.');
  c.phrase('x.x.x.f..x.x');
  c.counter('<.>.UDU.D.U.');
  c.rest(4);
  c.section('Ren\'s Answer', { motif: 'ren', intensity: 1, checkpoint: true });
  c.phrase('xx..f.x.x.x.');
  c.phrase('H.xfH.xx');
  c.phrase('x.xtx.xr|LR.fLRRL');
  c.phrase('xx.x.xx.x.x.|r.xrx.f.x.x.');
  c.counter('UDUD<><>U...', { finisher: true });
  c.section('Quiet', { motif: 'outro', intensity: 0.3 });
  c.rest(8);
});
