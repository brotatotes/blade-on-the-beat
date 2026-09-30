import { chart } from './dsl.js';

// Night 3, The Twin Archers. Left calls, right answers. The side is heard and seen.
export default chart({
  id: 3, key: 'archers', title: 'The Twin Archers', enemy: 'archers', bpm: 100,
  motif: 'archers', identity: 'Call and response between left and right bows',
}, (c) => {
  c.section('Two Bows', { motif: 'intro', intensity: 0.4 });
  c.rest(8);
  c.section('Call', { motif: 'archers', intensity: 0.6, checkpoint: true });
  c.phrase('L...R...');
  c.phrase('L.L.R.R.');
  c.phrase('L.R.L.R.');
  c.counter('<.>.<.>.');
  c.phrase('LL..RR..');
  c.phrase('L.LRR.R.');
  c.counter('<><>');
  c.rest(4);
  c.section('Answer', { motif: 'archers', intensity: 0.8, checkpoint: true });
  c.phrase('LLL.RRR.');
  c.phrase('L.RL.RL.');
  c.phrase('LR.LR.RL');
  c.counter('<.><.><.');
  c.phrase('L.L.LR.R|R.R.RL.L');
  c.counter('<><>><<.');
  c.rest(4);
  c.section('Crossfire', { motif: 'archers', intensity: 0.9, checkpoint: true });
  c.phrase('L.RR.LLR');
  c.phrase('RL.RL.LR');
  c.counter('<>.<>.<>');
  c.phrase('LRRL.RLL');
  c.phrase('R.LRL.RL');
  c.counter('<.>.<><>');
  c.rest(4);
  c.section('Together', { motif: 'archers', intensity: 1, checkpoint: true });
  c.phrase('LRLR.LRL');
  c.phrase('LLRRLLRR');
  c.phrase('L.RLR.LR|RL.RL.RL');
  c.counter('<><>U.D.', { finisher: true });
  c.section('Quiet', { motif: 'outro', intensity: 0.3 });
  c.rest(8);
});
