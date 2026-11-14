'use strict';

// Deterministic Combat Model v1 regression checks. No UI or save migration.
const assert = require('node:assert/strict');
const Sim = require('../src/sim.js');
const repoVersion = 8;

assert.equal(Sim.SIM_VERSION, repoVersion);
assert.equal(Sim.ARMOR_K_FACTOR, 0.00045);
assert.equal(Sim.MONSTER_CRIT_CHANCE, 0.08);
assert.equal(Sim.MONSTER_CRIT_MULTIPLIER, 3);
assert.equal(Sim.MONSTER_CRIT_REDUCTION_CAP, 35);
assert.equal(Sim.effectiveMonsterCritChance(0), 0.08);
assert.equal(Sim.effectiveMonsterCritChance(35), 0.08 * 0.65);
assert.equal(Sim.effectiveMonsterCritChance(100), 0.08 * 0.65, 'crit-reduction caps at 35%');
assert.equal(Sim.effectiveMonsterCritChance(-50), 0.08, 'negative reduction has no effect');
assert.ok(Math.abs(Sim.afterPlayerArmor(100, 100, 1000) - (45 / 100.45)) < 1e-10);

const draw = (seed, reduction, count = 10000) => {
  const rng = { s: seed }, crits = [];
  for (let i = 0; i < count; i++) crits.push(Sim.rollMonsterCrit(rng, reduction));
  return crits;
};
const ordinary = draw(31, 0);
const protectedHits = draw(31, 35);
assert.deepEqual(ordinary, draw(31, 0), 'critical RNG repeats for identical seeds');
const ordinaryCrits = ordinary.filter(Boolean).length;
const protectedCrits = protectedHits.filter(Boolean).length;
assert.ok(ordinaryCrits > 650 && ordinaryCrits < 950, '8% crit frequency is plausible');
assert.ok(protectedCrits > 400 && protectedCrits < ordinaryCrits, 'crit reduction reduces actual crit events');

// A lethal elemental monster hit must carry a player-facing damage type and crit metadata.
const makeDangerousGame = (autoPush = false) => {
  const game = Sim.newGame('paladin', 0, 2026);
  game.target = { key: 'wisp', level: 40 };
  game.unlocked.wisp = 40;
  game.autoPush = autoPush;
  game.fight.mon = null;
  game.fight.respawnAt = 0;
  game.fight.pNext = 9999; // make incoming hit, not the player's attack, cause the death
  return game;
};
const first = makeDangerousGame(true);
const log = [];
const result = Sim.emptyOut();
Sim.advance(first, 10, result, (message, kind) => { if (kind === 'death') log.push(message); });
assert.equal(result.deaths, 1, 'high-stage elemental attack is lethal');
assert.equal(first.lastDeath.type, 'fire');
assert.equal(first.lastDeath.enemy, Sim.MONSTERS.wisp.name);
assert.equal(typeof first.lastDeath.critical, 'boolean');
assert.ok(first.lastDeath.damage > 0);
assert.equal(first.target.level, 39, 'auto-push retreats one stage on the first death');
assert.equal(first.fight.deadUntil, first.lastDeath.at + 30, 'death recovery is 30 seconds');
assert.match(log[0], /fire/);
assert.match(log[0], /Recovering for 30s/);

const manual = makeDangerousGame(false);
Sim.advance(manual, 10, Sim.emptyOut());
assert.equal(manual.target.level, 40, 'manual hunt does not retreat on death');

const a = makeDangerousGame(false), b = makeDangerousGame(false);
const aOut = Sim.emptyOut(), bOut = Sim.emptyOut();
Sim.advance(a, 140, aOut);
Sim.advance(b, 140, bOut);
assert.deepEqual(aOut, bOut, 'same seed and actions yield the same outcome');
assert.deepEqual(a.lastDeath, b.lastDeath, 'death metadata stays deterministic');
assert.ok(aOut.monsterCrits > 0, 'crit hits are observed in a longer dangerous replay');
console.log('combat model v1 ok');
