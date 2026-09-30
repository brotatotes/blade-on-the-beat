import test from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, recordNight, chooseEnding, nextNight, unlocked, villageFor, GOOD_ENDING_VILLAGE } from '../src/story/campaign.js';

test('ending depends on how much of Emberfall stands', () => {
  assert.equal(chooseEnding(100), 'granary');
  assert.equal(chooseEnding(GOOD_ENDING_VILLAGE), 'granary');
  assert.equal(chooseEnding(GOOD_ENDING_VILLAGE - 1), 'north');
  assert.equal(chooseEnding(0), 'north');
});

test('village meter carries across nights played in order', () => {
  let c = newCampaign();
  c = recordNight(c, 1, { won: true, village: 88 });
  assert.equal(villageFor(c, 2), 88);
  c = recordNight(c, 2, { won: true, village: 70 });
  assert.equal(c.village, 70);
  assert.equal(nextNight(c), 3);
});

test('losing a night changes nothing', () => {
  const c = recordNight(newCampaign(), 1, { won: false, village: 10 });
  assert.deepEqual(c.cleared, []);
  assert.equal(c.village, 100);
});

test('replays from night select do not change the carried village', () => {
  let c = newCampaign();
  c = recordNight(c, 1, { won: true, village: 90 });
  c = recordNight(c, 2, { won: true, village: 80 });
  c = recordNight(c, 1, { won: true, village: 20, score: 5 });
  assert.equal(c.village, 80);
  assert.equal(c.best[1], 5);
  assert.equal(villageFor(c, 1), 100);
});

test('both endings are reachable through a full campaign', () => {
  const run = (v) => { let c = newCampaign(); for (let n = 1; n <= 7; n++) c = recordNight(c, n, { won: true, village: v(n) }); return c; };
  assert.equal(run(() => 90).ending, 'granary');
  assert.equal(run((n) => 100 - n * 10).ending, 'north');
  assert.equal(run(() => 90).cleared.length, 7);
});

test('nights unlock in order', () => {
  let c = newCampaign();
  assert.ok(unlocked(c, 1));
  assert.ok(!unlocked(c, 2));
  c = recordNight(c, 1, { won: true, village: 100 });
  assert.ok(unlocked(c, 2));
  assert.ok(!unlocked(c, 3));
});
