import { chart } from './dsl.js';

// Night 6, The Ram. The ram strikes the gate in twos while the crew attacks in threes.
// Twelve steps per bar: quarters sit on steps 0,3,6,9 and triplet quarters on 0,2,4,6,8,10.
export default chart({
  id: 6, key: 'ram', title: 'The Ram', enemy: 'ram', bpm: 112,
  motif: 'ram', identity: 'Three against two, ram in twos and crew in threes',
}, (c) => {
  c.section('Black Pine', { motif: 'intro', intensity: 0.5 });
  c.rest(8);
  c.section('Twos', { motif: 'ram', intensity: 0.7, checkpoint: true });
  c.phrase('r.....r.....');
  c.phrase('r..r..r..r..');
  c.phrase('x.x.x.x.x.x.');
  c.counter('D..D..U.U.U.');
  c.phrase('r.x.x.r.x.x.');
  c.phrase('r..r..x.x.x.');
  c.counter('DDUU');
  c.rest(4);
  c.section('Threes Against Twos', { motif: 'ram', intensity: 0.85, checkpoint: true });
  c.phrase('r.xrx.r.xrx.');
  c.phrase('x.x.x.r..r..');
  c.phrase('r.xrx.x.x.x.');
  c.counter('D..D..U.U.U.');
  c.phrase('r.x.xrx.x.r.|r.xrx.r.xrx.');
  c.counter('D.UD.UD.UD..');
  c.rest(4);
  c.section('The Gate Shudders', { motif: 'ram', intensity: 0.9, checkpoint: true });
  c.phrase('r.xrx.x.xrx.');
  c.phrase('r.xr..r.xr..');
  c.counter('D.UD.UD..U..');
  c.phrase('x.xrx.r.xrxx');
  c.phrase('r.xr.xr.xr.x');
  c.counter('DDUUDDUU');
  c.rest(4);
  c.section('The Gate Holds', { motif: 'ram', intensity: 1, checkpoint: true });
  c.phrase('r.xrx.r.xrx.');
  c.phrase('x.xrx.r.xrxx');
  c.phrase('r.xrx.rxxrx.|x.x.x.r..r..');
  c.counter('D..D..U.U.U.', { finisher: true });
  c.section('Quiet', { motif: 'outro', intensity: 0.3 });
  c.rest(8);
});
