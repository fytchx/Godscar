const S = require('../src/sim.js');
const v1 = { v: 1, created: 0, t: 100, rng: { s: 5 }, hero: { cls: 'sorcerer', level: 12, xp: 10 }, equip: {}, bag: [], gold: 500, filter: 'magic',
  target: { key: 'knight', level: 9 }, unlocked: { husk: 3, swarm: 1, knight: 10, wisp: 1 }, kills: {}, autoPush: true, life: { kills: 900, deaths: 3, offlineSec: 0 } };
const g = S.migrate(JSON.parse(JSON.stringify(v1))); S.refresh(g);
const out = S.emptyOut(); S.advance(g, 400, out);
console.log('migrated ok', g.v, g.hero.level, g.hero.points, g.cast.map(c => c.k), out.kills, g.notices);
