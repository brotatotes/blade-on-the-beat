import { chart } from './dsl.js';

// Night 5, The Masked Dancer. Swing and triplets on a 12-step bar (three per beat).
export default chart({
  id: 5, key: 'dancer', title: 'The Masked Dancer', enemy: 'dancer', bpm: 104,
  motif: 'dancer', identity: 'Swung eighths and full triplets',
}, (c) => {
  c.section('The Mask', { motif: 'intro', intensity: 0.4 });
  c.rest(8);
  c.section('Swing', { motif: 'dancer', intensity: 0.65, checkpoint: true });
  c.phrase('x.xx.xx.xx..');
  c.phrase('x..x.xx..x.x');
  c.phrase('x.x..xx.x...');
  c.counter('<.><.><.>...');
  c.phrase('x..x..x.xx..');
  c.phrase('x.xx.x..x...');
  c.counter('<.>U.D<.>U..');
  c.rest(4);
  c.section('Triplets', { motif: 'dancer', intensity: 0.85, checkpoint: true });
  c.phrase('x.x...xx..x.');
  c.phrase('x..x.x..x.x.');
  c.phrase('xx..x.x.x.x.');
  c.counter('<.>...<.>...');
  c.phrase('x.xx.x..x.x.|x.x...xx.x..');
  c.counter('<.><.>U.DU.D');
  c.rest(4);
  c.section('The Long Note', { motif: 'dancer', intensity: 0.9, checkpoint: true });
  c.phrase('x.xx.x.x.x..');
  c.phrase('x.x.x.xx.x..');
  c.counter('<.>U.D<.>...');
  c.phrase('x.xx..xx.x..');
  c.counter('U.DU.D<.><.>');
  c.rest(4);
  c.section('Unmasked', { motif: 'dancer', intensity: 1, checkpoint: true });
  c.phrase('xx..xx..x.x.');
  c.phrase('x.xx.xx.x.x.');
  c.phrase('xx..x.x.x.x.|x.xx.xx.....');
  c.counter('<.>...U.D...', { finisher: true });
  c.section('Quiet', { motif: 'outro', intensity: 0.3 });
  c.rest(8);
});
