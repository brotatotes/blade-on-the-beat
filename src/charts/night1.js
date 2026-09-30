import { chart } from './dsl.js';

// Night 1, Scouts. Plain quarter and eighth notes. Teaches parry and counter.
export default chart({
  id: 1, key: 'scouts', title: 'Scouts', enemy: 'scouts', bpm: 84,
  motif: 'scouts', identity: 'Steady quarters, then simple eighth pairs',
}, (c) => {
  c.section('Drums in the North', { motif: 'intro', intensity: 0.3 });
  c.rest(8);
  c.section('First Blades', { motif: 'scouts', intensity: 0.5, checkpoint: true });
  c.phrase('x...');
  c.phrase('x.x.');
  c.phrase('xxxx');
  c.counter('U...');
  c.phrase('x.x.');
  c.phrase('xx.x');
  c.counter('U.D.');
  c.rest(4);
  c.section('Two Scouts', { motif: 'scouts', intensity: 0.7, checkpoint: true });
  c.phrase('x.xx');
  c.phrase('xxx.');
  c.counter('U.D.');
  c.phrase('x.x.x.xx', { segBeats: 4 });
  c.phrase('xx.x');
  c.counter('UDU.');
  c.phrase('x.xxx...');
  c.phrase('xxxx');
  c.counter('U.D.U.D.');
  c.rest(4);
  c.section('Retreat', { motif: 'scouts', intensity: 0.9, checkpoint: true });
  c.phrase('xx.xx.x.');
  c.phrase('x.xxx.x.');
  c.counter('UDUD');
  c.phrase('xxx.xxx.');
  c.phrase('xx.x|x.xx');
  c.counter('U.D.UD..', { finisher: true });
  c.section('Quiet', { motif: 'outro', intensity: 0.3 });
  c.rest(8);
});
