import { chart } from './dsl.js';

// Night 4, The Night Raid. Torches aimed past Ren at the village.
export default chart({
  id: 4, key: 'raid', title: 'The Night Raid', enemy: 'raiders', bpm: 108,
  motif: 'raid', identity: 'Torches rushing the village between blade strikes',
}, (c) => {
  c.section('Smoke', { motif: 'intro', intensity: 0.5 });
  c.rest(8);
  c.section('Torches', { motif: 'raid', intensity: 0.7, checkpoint: true });
  c.phrase('t...t...');
  c.phrase('x.t.x.t.');
  c.phrase('tt..x.tt');
  c.counter('U.D.U.D.');
  c.phrase('x.xtx.xt');
  c.phrase('t.t.ttt.');
  c.counter('UDUD');
  c.rest(4);
  c.section('The Wall', { motif: 'raid', intensity: 0.85, checkpoint: true });
  c.phrase('xtxtx.t.');
  c.phrase('tt.xtt.x');
  c.phrase('x.ttx.tt');
  c.counter('UD<>');
  c.phrase('ttxx.ttx|x.tt.xtt');
  c.counter('U.D.<.>.');
  c.rest(4);
  c.section('The Granary Road', { motif: 'raid', intensity: 0.9, checkpoint: true });
  c.phrase('tx.tx.tt');
  c.phrase('x.ttx.xt');
  c.counter('UD.U<.>.');
  c.phrase('ttxt.xtt');
  c.phrase('xt.tx.tx');
  c.counter('<><>UDUD');
  c.rest(4);
  c.section('Every Roof', { motif: 'raid', intensity: 1, checkpoint: true });
  c.phrase('t.tx.ttx');
  c.phrase('xttxxtt.');
  c.phrase('ttt.xxx.|t.tt.tt.');
  c.counter('UDUD<><>', { finisher: true });
  c.section('Quiet', { motif: 'outro', intensity: 0.3 });
  c.rest(8);
});
