'use strict';

const assert = require('node:assert/strict');
const S = require('../src/sim.js');

assert.equal(S.ARMOR_K_FACTOR, 0.00045, 'ratio armor uses accepted Combat Model v1 coefficient');
assert.equal(S.afterPlayerArmor(100, 0, 1000), 100, 'zero armor leaves physical damage unchanged');
assert.ok(Math.abs(S.afterPlayerArmor(100, 100, 1000) - (100 * 0.45 / 100.45)) < 1e-10,
  'player armor uses armor / (armor + k), with k based on average attacker damage and no 25% floor');
assert.ok(S.afterPlayerArmor(100, 100, 1000) < S.afterArmor(100, 100), 'the ratio formula replaces the old damage floor');

const boss = S.newGame('paladin', 0, 31);
boss.hero.level = 10;
S.refresh(boss);
boss.sigils = 1;
S.doAction(boss, { type: 'boss', key: 'bellkeeper', level: 3 });
assert.equal(boss.lastBoss.res.win, false, 'the fixture reaches the failed-boss branch');
assert.ok(boss.lastBoss.res.pct > 0 && boss.lastBoss.res.pct < 1, 'failed boss result reports the fraction of boss HP removed');
assert.equal(boss.sigils, 1, 'a failed boss attempt refunds its Sigil');
const firstFailureEnd = boss.bossCooldownUntil;
assert.equal(firstFailureEnd, boss.t + boss.lastBoss.res.time, 'failed boss duration sets the recovery clock');
const tooSoon = S.doAction(boss, { type: 'boss', key: 'bellkeeper', level: 3 });
assert.match(tooSoon, /recovering/, 'a refunded Sigil cannot be retried before the fight duration passes');
assert.equal(boss.sigils, 1, 'a blocked retry does not spend the refunded Sigil');
S.advance(boss, firstFailureEnd, S.emptyOut());
assert.equal(boss.t, firstFailureEnd, 'normal simulation advances through boss recovery');
assert.equal(S.doAction(boss, { type: 'boss', key: 'bellkeeper', level: 3 }), null);
assert.equal(boss.lastBoss.res.win, false, 'the repeated attempt still fails');
assert.equal(boss.sigils, 1, 'the repeated failure refunds its Sigil');
assert.ok(boss.bossCooldownUntil > firstFailureEnd, 'the repeated failure advances the next recovery clock');

const rewardedBoss = S.newGame('paladin', 0, 31);
rewardedBoss.hero.level = 50;
rewardedBoss.sigils = 1;
rewardedBoss.bossUnlocked.bellkeeper = 3;
S.refresh(rewardedBoss);
S.doAction(rewardedBoss, { type: 'boss', key: 'bellkeeper', level: 3 });
assert.equal(rewardedBoss.lastBoss.res.win, true, 'the fixture clears Bellkeeper');
assert.equal(rewardedBoss.lastBoss.rewards.ess.holy, 2, 'each Bellkeeper clear awards two Dawn Essence');

const wisp = S.newGame('paladin', 0, 97);
wisp.hero.level = 35;
wisp.familyProgress.wisp = 149;
wisp.target = { key: 'wisp', level: 1 };
S.refresh(wisp);
const wispOut = S.emptyOut();
S.advance(wisp, 15, wispOut);
assert.ok(wispOut.kills > 0);
assert.equal(wisp.mats.fire, 1, '150 family kills award one Ember Essence');
assert.equal(wisp.familyProgress.wisp, 149 + wispOut.kills - 150);

for (const [counter, essence, cost, topRoll] of [['res_fire', 'fire', 4, 18], ['dmgPct', 'holy', 10, 20]]) {
  const game = S.newGame('paladin', 0, 503);
  game.hero.level = 30;
  game.unlocked.husk = 30;
  game.gold = 1_000_000;
  game.mats.shards = 100;
  game.mats[essence] = cost;
  S.refresh(game);
  const error = S.doAction(game, { type: 'craft', rarity: 'rare', slot: 'ring', ilvl: 30, counter });
  assert.equal(error, null);
  const crafted = game.bag.at(-1);
  assert.equal(crafted.affixes.find(([key]) => key === counter)[1], topRoll * (1 + 30 * 0.008));
  assert.equal(game.mats[essence], 0);
}

const fullBag = S.newGame('paladin', 0, 817);
fullBag.hero.level = 30;
fullBag.unlocked.husk = 30;
fullBag.gold = 1_000_000;
fullBag.mats.shards = 100;
fullBag.mats.fire = 4;
S.refresh(fullBag);
for (let i = 0; i < S.BAG_CAP; i++) {
  const item = S.makeItem(fullBag.rng, 'ring', 5, { rarity: i === S.BAG_CAP - 1 ? 'legendary' : 'common' });
  if (i === S.BAG_CAP - 1) item.locked = true;
  fullBag.bag.push(item);
}
const protectedItem = fullBag.bag.at(-1);
const freedItem = fullBag.bag[0];
const craftWhileFull = S.doAction(fullBag, { type: 'craft', rarity: 'rare', slot: 'ring', ilvl: 30, counter: 'res_fire' });
assert.equal(craftWhileFull, null, 'counter crafting frees an unlocked low-value slot when the bag is full');
assert.equal(fullBag.bag.length, S.BAG_CAP);
assert.ok(fullBag.bag.some(item => item.id === protectedItem.id), 'automatic slot freeing preserves locked items');
assert.ok(!fullBag.bag.some(item => item.id === freedItem.id), 'automatic slot freeing salvages the lowest-rarity item');
assert.ok(fullBag.bag.some(item => item.affixes.some(([key]) => key === 'res_fire')), 'the counter ring is crafted into the freed slot');
assert.equal(fullBag.mats.fire, 0);

const offline = S.newGame('paladin', 0, 97);
offline.hero.level = 20;
S.refresh(offline);
offline.target = { key: 'husk', level: 1 };
offline.unlocked.husk = 20;
offline.streak = 4;
const caught = S.catchUp(offline, offline.t + 3600);
assert.ok(caught.out.kills > 0, 'offline catch-up still advances the fight');
assert.equal(offline.target.level, 1, 'offline kills do not push to the next stage');
assert.equal(offline.streak, 0, 'offline kills do not bank an auto-push streak');
assert.equal(offline.autoPush, true, 'catch-up restores the player setting');

console.log('slice mechanics ok');
