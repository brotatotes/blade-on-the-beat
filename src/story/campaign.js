// Campaign state: which nights are open, the village meter carried from night
// to night, and which ending the last night leads to.

export const NIGHTS = 7;
// Emberfall must keep at least this much standing for the hopeful ending.
export const GOOD_ENDING_VILLAGE = 50;

export function newCampaign() {
  return { village: 100, cleared: [], best: {}, ending: null };
}

// The village meter a night starts with.
export function villageFor(campaign, night) {
  return night === nextNight(campaign) ? campaign.village : 100;
}

export function nextNight(campaign) {
  for (let n = 1; n <= NIGHTS; n++) if (!campaign.cleared.includes(n)) return n;
  return null;
}

export function unlocked(campaign, night) {
  return night === 1 || campaign.cleared.includes(night) || campaign.cleared.includes(night - 1);
}

// Record a finished night. Only a night played in story order carries the
// village forward. Replays from night select keep a best result only.
export function recordNight(campaign, night, { won, village, score = 0 }) {
  const c = { ...campaign, cleared: [...campaign.cleared], best: { ...campaign.best } };
  if (!won) return c;
  const inOrder = night === nextNight(campaign);
  c.best[night] = Math.max(c.best[night] || 0, score);
  if (inOrder) {
    c.cleared.push(night);
    c.village = Math.max(0, Math.min(100, village));
    if (night === NIGHTS) c.ending = chooseEnding(c.village);
  }
  return c;
}

export function chooseEnding(village) {
  return village >= GOOD_ENDING_VILLAGE ? 'granary' : 'north';
}
