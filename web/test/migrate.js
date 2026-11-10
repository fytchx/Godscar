const S = require('../src/sim.js');
const assert = require('node:assert/strict');
const v1 = { v: 1, created: 0, t: 100, rng: { s: 5 }, hero: { cls: 'sorcerer', level: 12, xp: 10 }, equip: {}, bag: [], gold: 500, filter: 'magic',
  target: { key: 'knight', level: 9 }, unlocked: { husk: 3, swarm: 1, knight: 10, wisp: 1 }, kills: {}, autoPush: true, life: { kills: 900, deaths: 3, offlineSec: 0 } };
const g = S.migrate(JSON.parse(JSON.stringify(v1))); S.refresh(g);
assert.equal(g.v, 4, 'v1 saves migrate through to the current save schema');
assert.deepEqual(g.familyProgress, {});
const out = S.emptyOut(); S.advance(g, 400, out);
console.log('migrated ok', g.v, g.hero.level, g.hero.points, g.cast.map(c => c.k), out.kills, g.notices);

const v3 = { v: 3, created: 0, t: 10, rng: { s: 7 }, hero: { cls: 'paladin', level: 4, xp: 0 },
  equip: {}, bag: [], mats: { shards: 2, fire: 3, holy: 5 }, sigils: 1, autoPush: false };
const migratedV3 = S.migrate(v3);
assert.equal(migratedV3.v, 4);
assert.deepEqual(migratedV3.familyProgress, {});
assert.equal(migratedV3.mats.fire, 3);
assert.equal(migratedV3.mats.holy, 5);
assert.equal(migratedV3.sigils, 1);
assert.equal(migratedV3.autoPush, false);
console.log('v3 save migration ok');

const v4 = { v: 4, mats: { fire: 9 }, familyProgress: { wisp: 149 } };
assert.equal(S.migrate(v4), v4, 'current v4 saves are returned unchanged');
