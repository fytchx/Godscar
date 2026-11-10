'use strict';

const fs = require('node:fs');
const path = require('node:path');
const S = require('../src/sim.js');

const SEEDS = [31, 97, 503, 2026, 1109];
const POLICY_SEEDS = [31, 2026];
const STAGES = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);
const BOSS_LIMIT = 150;
const STEP = 0.1;
const COUNTER_STATS = ['dmgPct', 'critChance', 'critMulti', 'atkSpd'];
const TYPICAL_RING = ['life', 'res_shadow', 'res_frost', 'goldFind'];
const BOSS_COUNTERS = [
  { name: 'damage', keys: ['dmgPct'] },
  { name: 'crit', keys: ['critChance', 'critMulti'] },
  { name: 'attackSpeed', keys: ['atkSpd'] },
  { name: 'combined', keys: COUNTER_STATS }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rollAffix(key, rng, level) {
  const definition = S.AFFIXES[key];
  const growth = Math.pow(1.105, level - 1);
  let value = definition.roll(rng, growth, level);
  if (definition.pct) value *= 1 + level * 0.008;
  return [key, value];
}

function setRing(game, keys, level, seed, rarity) {
  const ring = clone(game.equip.ring1);
  ring.rarity = rarity || (keys.length >= 3 ? 'rare' : 'uncommon');
  const rng = { s: (seed ^ (level * 0x45d9f3b)) >>> 0 };
  ring.affixes = keys.map(key => rollAffix(key, rng, level));
  game.equip.ring1 = ring;
}

function createFixture(seed, level, options = {}) {
  const classKey = options.classKey || 'paladin';
  const weapon = options.weapon || S.CLASSES[classKey].startWeapon;
  const rare = options.gear === 'rare';
  const game = S.newGame(classKey, 0, seed);
  game.hero.level = level;
  game.hero.points = level - 1;

  const passiveOrder = ['might', 'vitality', 'swiftness', 'precision'];
  while (game.hero.points > 0) {
    const key = passiveOrder[game.hero.points % passiveOrder.length];
    game.hero.passives[key] = (game.hero.passives[key] || 0) + 1;
    game.hero.points--;
  }
  if (level >= S.SPEC_LEVEL) game.hero.spec = classKey === 'rogue' ? 0 : 0;

  const gearRng = { s: (seed ^ 0x5f3759df) >>> 0 };
  const slots = ['weapon', 'helm', 'chest', 'gloves', 'belt', 'legs', 'boots', 'amulet'];
  for (const slot of slots) {
    const item = S.makeItem(gearRng, slot, level, {
      rarity: rare ? 'rare' : 'common',
      ...(slot === 'weapon' ? { base: weapon } : {})
    });
    item.id = 'fixture-' + seed + '-' + slot;
    if (rare && !options.realistic) item.affixes = item.affixes.filter(([key]) => !COUNTER_STATS.includes(key));
    game.equip[slot] = item;
  }

  const ringRarity = rare ? 'rare' : 'uncommon';
  const ring = S.makeItem(gearRng, 'ring', level, { rarity: ringRarity });
  ring.id = 'fixture-' + seed + '-ring1';
  ring.affixes = rare
    ? TYPICAL_RING.map(key => rollAffix(key, gearRng, level))
    : [rollAffix('life', gearRng, level)];
  game.equip.ring1 = ring;
  S.refresh(game);
  return game;
}

function ringPair(base, keys, seed, level, gearType) {
  const count = gearType === 'rare' ? 4 : Math.max(2, keys.length);
  const rarity = count >= 3 ? 'rare' : 'uncommon';
  const control = clone(base);
  const treatment = clone(base);
  const controlRng = { s: (seed ^ 0x13579 ^ (level * 0x45d9f3b)) >>> 0 };
  const counterRng = { s: (seed ^ 0x24680 ^ (level * 0x45d9f3b)) >>> 0 };
  const controlAffixes = TYPICAL_RING.slice(0, count).map(key => rollAffix(key, controlRng, level));
  const retained = controlAffixes.slice(0, count - keys.length);
  const treatmentAffixes = keys.map(key => rollAffix(key, counterRng, level)).concat(retained);
  control.equip.ring1.rarity = rarity;
  treatment.equip.ring1.rarity = rarity;
  control.equip.ring1.affixes = controlAffixes;
  treatment.equip.ring1.affixes = treatmentAffixes;
  S.refresh(control);
  S.refresh(treatment);
  return { control, treatment, affixes: treatmentAffixes, controlAffixes };
}

function runMonsterAttempt(game, key, stage) {
  game.t = 0;
  game.target = { key, level: stage };
  game.autoPush = false;
  game.fight = { hp: null, mon: null, pNext: 0, pulseNext: 1, respawnAt: 0,
    deadUntil: 0, cd: {}, shield: 0, buffs: {}, cycle: 0, critCastAt: -99 };
  const out = S.emptyOut();
  out.killTimes = [];
  const deathTimes = [];
  let hits = 0;
  let previousTaken = 0;

  for (let elapsed = STEP; elapsed <= BOSS_LIMIT; elapsed += STEP) {
    S.advance(game, elapsed, out, (_message, kind) => {
      if (kind === 'death') deathTimes.push(game.t);
    });
    if (out.dmgTaken > previousTaken) hits++;
    previousTaken = out.dmgTaken;

    const killedAt = out.killTimes[0];
    const diedAt = deathTimes[0];
    if (killedAt != null || diedAt != null) {
      const outcome = diedAt != null && (killedAt == null || diedAt < killedAt) ? 'death' : 'clear';
      return {
        outcome,
        seconds: Number((outcome === 'clear' ? killedAt : diedAt).toFixed(2)),
        kills: out.kills,
        deaths: out.deaths,
        damageDealt: Number(out.dmgDealt.toFixed(2)),
        armorPen: Number((game.stats.armorPen || 0).toFixed(3)),
        physicalBase: Number((game.stats.pre.phys || 0).toFixed(2)),
        hitsLanded: hits,
        incomingDamage: Number(out.dmgTaken.toFixed(2))
      };
    }
  }
  return { outcome: 'timeout', seconds: BOSS_LIMIT, kills: out.kills, deaths: out.deaths,
    damageDealt: Number(out.dmgDealt.toFixed(2)), armorPen: Number((game.stats.armorPen || 0).toFixed(3)), physicalBase: Number((game.stats.pre.phys || 0).toFixed(2)), hitsLanded: hits, incomingDamage: Number(out.dmgTaken.toFixed(2)) };
}

function bossAttempt(game, level) {
  const fightSeed = Math.floor(S.rand(game.rng) * 4294967296);
  const cloneGame = S.newGame(game.hero.cls, 0, fightSeed);
  cloneGame.rng = { s: fightSeed >>> 0 };
  cloneGame.hero = clone(game.hero);
  cloneGame.asc = clone(game.asc);
  cloneGame.equip = clone(game.equip);
  cloneGame.bar = clone(game.bar);
  cloneGame.target = { key: 'bellkeeper', level };
  cloneGame.autoPush = false;
  for (const key of S.MONSTER_KEYS) cloneGame.unlocked[key] = 9999;
  cloneGame.fight = { hp: null, mon: null, pNext: 0, pulseNext: 1, respawnAt: 0,
    deadUntil: 0, cd: {}, shield: 0, buffs: {}, cycle: 0, critCastAt: -99 };
  cloneGame.stats = S.computeStats(cloneGame);
  cloneGame.slotted = Object.fromEntries(S.availableSpells(cloneGame).map(key => [key, true]));
  S.refresh(cloneGame);
  cloneGame.boss = true;

  const out = S.emptyOut();
  S.advance(cloneGame, 0, out);
  const maxHp = cloneGame.fight.mon.max;
  let seconds = 0;
  while (seconds < BOSS_LIMIT) {
    seconds++;
    S.advance(cloneGame, seconds, out);
    if (out.kills || out.deaths) break;
  }
  const outcome = out.kills ? 'clear' : out.deaths ? 'death' : 'timeout';
  const damage = out.dmgDealt;
  return {
    outcome,
    seconds,
    timeToKill: outcome === 'clear' ? seconds : null,
    dps: Number((damage / seconds).toFixed(2)),
    bossDamage: Number(damage.toFixed(2)),
    hpRemovedPct: Number((damage / maxHp * 100).toFixed(2)),
    hpRemaining: Number((out.kills ? 0 : Math.max(0, maxHp - damage)).toFixed(2)),
    deaths: out.deaths
  };
}

function sweepMonster(key, counterName, stage, seed) {
  const base = createFixture(seed, stage, { gear: 'rare', realistic: true, weapon: key === 'knight' ? 'sword' : 'mace' });
  const target = key;
  const affix = counterName === 'holy' ? 'flat_holy' : 'res_fire';
  const pair = ringPair(base, [affix], seed, stage, 'rare');
  const definition = S.AFFIXES[affix];
  const top = (affix === 'flat_holy' ? 3 * Math.pow(1.105, stage - 1) : 18) * (definition.pct ? 1 + stage * 0.008 : 1);
  const affixIndex = pair.treatment.equip.ring1.affixes.findIndex(([name]) => name === affix);
  pair.treatment.equip.ring1.affixes[affixIndex][1] = top;
  S.refresh(pair.treatment);
  const { control, treatment } = pair;
  const counterValue = affix === 'res_fire' ? treatment.stats.res.fire : treatment.stats.flat.holy;

  const normal = runMonsterAttempt(control, target, stage);
  const counter = runMonsterAttempt(treatment, target, stage);
  const other = createFixture(seed, stage, { gear: 'rare', realistic: true,
    classKey: key === 'wisp' ? 'rogue' : 'paladin',
    weapon: key === 'wisp' ? 'dagger' : 'mace'
  });
  const differentBuild = runMonsterAttempt(other, target, stage);

  return {
    target: key,
    stage,
    seed,
    playerLevel: stage,
    counter: counterName,
    counterValue: Number(counterValue.toFixed(4)),
    noCounter: normal,
    withCounter: counter,
    differentBuild: differentBuild
  };
}

function sweepBossFixture(gear, level, seed) {
  const base = createFixture(seed, level, { gear });
  const packages = [];
  const different = createFixture(seed, level, { gear, classKey: 'rogue', weapon: 'dagger' });
  const differentBuild = bossAttempt(different, level);

  for (const counter of BOSS_COUNTERS) {
    const pair = ringPair(base, counter.keys, seed + counter.name.length, level, gear);
    if (counter.name === 'damage') {
      const index = pair.treatment.equip.ring1.affixes.findIndex(([key]) => key === 'dmgPct');
      pair.treatment.equip.ring1.affixes[index][1] = 20 * (1 + level * 0.008);
      S.refresh(pair.treatment);
    }
    const noCounter = bossAttempt(pair.control, level);
    const result = bossAttempt(pair.treatment, level);
    packages.push({
      counter: counter.name,
      controlAffixes: pair.controlAffixes.map(([key, value]) => [key, Number(value.toFixed(4))]),
      affixes: pair.affixes.map(([key, value]) => [key, Number(value.toFixed(4))]),
      noCounter,
      result
    });
  }
  return { gear, level, seed, differentBuild, counters: packages };
}

function wispFarmTrial(seed, level = 20, requiredEmber = RECIPE.res_fire.cost) {
  const game = createFixture(seed, level, { gear: 'rare', realistic: true });
  game.unlocked.wisp = level;
  game.target = { key: 'wisp', level };
  game.autoPush = false;
  const start = game.mats.fire || 0;
  let kills = 0, seconds = 0;
  while ((game.mats.fire || 0) - start < requiredEmber && seconds < 4 * 60 * 60) {
    seconds += 60;
    const out = S.emptyOut();
    S.advance(game, seconds, out);
    kills += out.kills;
  }
  return { seed, playerLevel: level, gear: 'rare', stage: level, requiredEmber,
    kills, minutes: seconds / 60, emberEarned: (game.mats.fire || 0) - start,
    familyProgressRemaining: game.familyProgress.wisp || 0 };
}

function dawnFarmTrial(seed, level = 20) {
  const game = createFixture(seed, level, { gear: 'rare', realistic: true });
  game.unlocked.wisp = level;
  game.target = { key: 'wisp', level };
  game.autoPush = false;
  let kills = 0, bossWins = 0, seconds = 0;
  while ((game.mats.holy || 0) < RECIPE.dmgPct.cost && seconds < 4 * 60 * 60) {
    if (game.sigils > 0) {
      S.doAction(game, { type: 'boss', key: 'bellkeeper', level: S.BOSSES.bellkeeper.minLevel });
      if (game.lastBoss.res.win) bossWins++;
      seconds += Math.max(1, game.lastBoss.res.time || 1);
      const out = S.emptyOut(); S.advance(game, seconds, out); kills += out.kills;
    } else {
      seconds += 60;
      const out = S.emptyOut(); S.advance(game, seconds, out); kills += out.kills;
    }
  }
  return { seed, playerLevel: level, gear: 'rare', target: `wisp@${level}`, requiredDawn: RECIPE.dmgPct.cost,
    kills, bossWins, minutes: seconds / 60, dawnEarned: game.mats.holy || 0 };
}

function firstNoCounterFailures(rows) {
  const bySeed = {};
  for (const seed of SEEDS) {
    const row = rows.find(item => item.seed === seed && item.noCounter.outcome !== 'clear');
    bySeed[seed] = row ? row.stage : null;
  }
  const first = rows.find(item => item.noCounter.outcome !== 'clear');
  return { firstAnySeed: first ? first.stage : null, firstBySeed: bySeed };
}

function counterWallRows(rows, getCounters) {
  const walls = [];
  for (const row of rows) {
    for (const counter of getCounters(row)) {
      if (row.noCounter.outcome !== 'clear' && counter.result.outcome === 'clear') {
        walls.push({
          stage: row.stage ?? row.level,
          seed: row.seed,
          noCounterFails: row.noCounter.outcome,
          counter: counter.counter,
          counterClears: counter.result.outcome,
          differentBuildClears: row.differentBuild.outcome === 'clear',
          differentBuild: row.differentBuild
        });
      }
    }
  }
  return walls;
}

function bossWallRows(rows) {
  const walls = [];
  for (const row of rows) {
    for (const counter of row.counters) {
      if (counter.noCounter.outcome !== 'clear' && counter.result.outcome === 'clear') {
        walls.push({
          fixture: row.gear,
          level: row.level,
          seed: row.seed,
          noCounterFails: counter.noCounter.outcome,
          counter: counter.counter,
          counterClears: counter.result.outcome,
          differentBuildClears: row.differentBuild.outcome === 'clear',
          noCounter: counter.noCounter,
          counterResult: counter.result,
          differentBuild: row.differentBuild
        });
      }
    }
  }
  return walls;
}

const POLICY_HORIZON = 12 * 60 * 60;
const WALL_LEVEL = 45;
const RECIPE = { res_fire: { mat: 'fire', cost: 4 }, dmgPct: { mat: 'holy', cost: 10 } };

function cloneGame(game) { const copy = clone(game); S.refresh(copy); return copy; }

function setTopCounter(game, item, counter) {
  const copy = clone(item);
  const affix = S.AFFIXES[counter];
  const top = counter === 'res_fire' ? 18 : 20;
  const index = copy.affixes.findIndex(([key]) => key === counter);
  copy.affixes[index][1] = top * (affix.pct ? 1 + copy.ilvl * 0.008 : 1);
  return copy;
}

function compareCounter(base, target, level, item, counter) {
  const control = cloneGame(base), treatment = cloneGame(base);
  control.t = treatment.t = 0;
  control.target = treatment.target = { key: target, level };
  const plain = clone(item);
  plain.affixes = plain.affixes.filter(([key]) => key !== counter);
  control.equip.ring1 = plain;
  treatment.equip.ring1 = clone(item);
  S.refresh(control); S.refresh(treatment);
  if (target === 'bellkeeper') return { noCounter: bossAttempt(control, level), withCounter: bossAttempt(treatment, level) };
  return { noCounter: runMonsterAttempt(control, target, level), withCounter: runMonsterAttempt(treatment, target, level) };
}

function probeCounter(base, target, level, counter) {
  const control = cloneGame(base), treatment = cloneGame(base);
  control.t = treatment.t = 0;
  control.target = treatment.target = { key: target, level };
  const rng = clone(treatment.rng);
  const ring = treatment.equip.ring1
    ? clone(treatment.equip.ring1)
    : S.makeItem(rng, 'ring', Math.max(1, treatment.hero.level), { rarity: 'rare' });
  if (!treatment.equip.ring1) {
    treatment.equip.ring1 = ring;
    control.equip.ring1 = clone(ring);
  }
  const index = ring.affixes.findIndex(([key]) => key === counter);
  if (index >= 0) ring.affixes.splice(index, 1);
  if (ring.affixes.length >= 4) ring.affixes.pop();
  ring.affixes.push([counter, (counter === 'res_fire' ? 18 : 20) * (1 + ring.ilvl * 0.008)]);
  treatment.equip.ring1 = ring;
  S.refresh(control); S.refresh(treatment);
  if (target === 'bellkeeper') return { noCounter: bossAttempt(control, level), withCounter: bossAttempt(treatment, level) };
  return { noCounter: runMonsterAttempt(control, target, level), withCounter: runMonsterAttempt(treatment, target, level) };
}

function equipBest(game, threshold, oneItem = false) {
  let swaps = 0;
  for (const item of [...game.bag]) {
    const slot = S.verdictSlot(game, item);
    const current = S.project(game, { secs: 120 });
    const candidate = S.project(game, { secs: 120, equip: { [slot]: item } });
    if (candidate.xpm > current.xpm * threshold && candidate.deaths <= current.deaths) {
      S.doAction(game, { type: 'equip', id: item.id, to: slot });
      swaps++;
      if (oneItem && swaps) break;
    }
  }
}

function allocatePassives(game) {
  const order = ['might', 'vitality', 'swiftness', 'precision'];
  while (game.hero.points > 0) S.doAction(game, { type: 'passive', k: order[game.hero.points % order.length] });
  if (game.hero.level >= S.SPEC_LEVEL && game.hero.spec == null) S.doAction(game, { type: 'spec', i: 0 });
}

function balanceCheckin(game) {
  allocatePassives(game);
  equipBest(game, 1.02);
  for (let guard = 0; guard < 50; guard++) {
    const item = Object.values(game.equip).filter(value => value.rarity !== 'ascended' && value.plus < 10)
      .sort((a, b) => S.upgradeCost(a) - S.upgradeCost(b))[0];
    if (!item || S.doAction(game, { type: 'upgrade', id: item.id })) break;
  }
  while (game.bag.length > 24) {
    const item = game.bag.find(value => !value.locked && S.RANK[value.rarity] < 4) || game.bag[0];
    if (S.doAction(game, { type: 'salvage', id: item.id })) break;
  }
  if (game.jewels.length && game.equip.belt && game.equip.belt.socket && !game.equip.belt.jewel) {
    S.doAction(game, { type: 'socketJewel', id: game.jewels[0].id });
  }
  if (game.asc.unlocked) for (const slot of S.ARMOR_SLOTS) while (!S.doAction(game, { type: 'ascend', slot })) {}
}

function lazyCheckin(game) { allocatePassives(game); equipBest(game, 1, true); }

function reportGear(game) {
  return {
    stats: {
      life: game.stats.life, armor: Number(game.stats.armor.toFixed(2)),
      res: { ...game.stats.res }, attr: { ...game.stats.attr },
      regen: Number(game.stats.regen.toFixed(2)), lifeOnHit: Number(game.stats.lifeOnHit.toFixed(2)),
      hit: Number(game.stats.hit.toFixed(2)), atkSpd: Number(game.stats.atkSpd.toFixed(2))
    },
    items: Object.entries(game.equip).map(([slot, item]) => ({
      slot, name: item.name, rarity: item.rarity, ilvl: item.ilvl, plus: item.plus,
      base: item.base || undefined, dmg: item.dmg || undefined, def: item.def || undefined,
      affixes: clone(item.affixes || []), enchant: clone(item.enchant || null), augments: clone(item.augments || [])
    }))
  };
}

function replaceAffix(game, slot, key, value) {
  const item = clone(game.equip[slot]);
  let index = item.affixes.findIndex(([name]) => name === key);
  let replaced = null;
  if (index < 0) {
    index = item.affixes.findIndex(([name]) => name === 'goldFind');
    if (index < 0 && item.affixes.length < 4) index = item.affixes.length;
    if (index < 0) index = 0;
    if (index < item.affixes.length) replaced = item.affixes[index][0];
  }
  item.affixes[index] = [key, value];
  game.equip[slot] = item;
  S.refresh(game);
  return { replaced, value: Number(value.toFixed(2)), item: item.name };
}

function minutesToStage(game, key, stage, limitMinutes = 240) {
  const start = game.t;
  while ((game.unlocked[key] || 0) <= stage && game.t - start < limitMinutes * 60) {
    const end = Math.min(start + limitMinutes * 60, game.t + 60);
    S.advance(game, end, S.emptyOut());
  }
  return game.unlocked[key] > stage ? Number(((game.t - start) / 60).toFixed(2)) : `>${limitMinutes}`;
}

function bestScoringBagUpgrade(game) {
  const baseline = S.project(game, { secs: 120 });
  let best = null;
  for (const item of game.bag) {
    const slot = S.verdictSlot(game, item);
    const candidate = cloneGame(game);
    if (S.doAction(candidate, { type: 'equip', id: item.id, to: slot })) continue;
    const projected = S.project(candidate, { secs: 120 });
    if (projected.xpm > baseline.xpm && projected.deaths <= baseline.deaths && (!best || projected.xpm > best.xpm)) {
      best = { game: candidate, item: item.name, slot, xpm: projected.xpm };
    }
  }
  return best;
}

function bossAttemptDetail(build, key, level) {
  const source = cloneGame(build);
  const seed = Math.floor(S.rand(source.rng) * 4294967296);
  const test = S.newGame(source.hero.cls, 0, seed);
  test.rng = { s: seed >>> 0 };
  test.hero = clone(source.hero); test.asc = clone(source.asc); test.equip = clone(source.equip); test.bar = clone(source.bar);
  test.target = { key, level }; test.autoPush = false; test.boss = true;
  for (const monster of S.MONSTER_KEYS) test.unlocked[monster] = 9999;
  S.refresh(test);
  const out = S.emptyOut();
  let second = 0;
  for (; second < 150; second++) {
    S.advance(test, second + 1, out);
    if (out.kills || out.deaths) break;
  }
  const maxHp = S.mdef(key).hp * Math.pow(1.155, level - 1) * S.ZONES[S.BOSSES[key].zone].tough;
  return {
    outcome: out.kills ? 'win' : out.deaths ? 'death' : 'timeout', seconds: Math.min(150, second + 1),
    damageDealt: Number(out.dmgDealt.toFixed(2)), damageTaken: Number(out.dmgTaken.toFixed(2)),
    playerLife: test.stats.life, playerArmor: Number(test.stats.armor.toFixed(2)), fireRes: Number(test.stats.res.fire.toFixed(2)),
    displayedPctOnFailure: Number((100 * (1 - (out.kills ? 0 : (out.bossHpRemaining ?? (test.fight.mon ? Math.max(0, test.fight.mon.hp) : maxHp))) / maxHp)).toFixed(2)),
    damageDealtPctOfMaxHp: Number((100 * out.dmgDealt / maxHp).toFixed(3))
  };
}

function optimizerTarget(game) {
  let best = null;
  for (const key of S.MONSTER_KEYS) {
    if (!game.zones[S.MONSTERS[key].zone]) continue;
    const unlocked = game.unlocked[key];
    for (const level of [unlocked, Math.max(S.ZONES[S.MONSTERS[key].zone].minLevel, unlocked - 2)]) {
      const projection = S.project(game, { target: { key, level }, secs: 120 });
      const score = projection.xpm * (projection.deaths ? 0.4 : 1) * (S.MONSTERS[key].zone === 'hollow' ? 1.15 : 1);
      if (!best || score > best.score) best = { key, level, score };
    }
  }
  return best;
}

function craftReady(game, counter, level) {
  const recipe = RECIPE[counter], basic = S.craftCost('rare', level);
  return (game.mats[recipe.mat] || 0) >= recipe.cost && game.mats.shards >= basic.shards && game.gold >= basic.gold && game.bag.length < S.BAG_CAP;
}

function craftCounter(game, counter, level) {
  const error = S.doAction(game, { type: 'craft', slot: 'ring', rarity: 'rare', ilvl: level, counter });
  if (error) return null;
  return game.bag.at(-1);
}

function runPolicy(policy, seed) {
  const game = createFixture(seed, 20, { gear: 'rare', realistic: true });
  game.unlocked.wisp = 20;
  game.target = { key: 'wisp', level: 20 };
  game.autoPush = true;
  const checkin = policy === 'lazy' ? 30 * 60 : 5 * 60;
  const report = { policy, seed, wallTimes: {}, wallLevels: {}, wallClearTimes: {}, resolution: {}, farmMinutes: {}, deaths: 0, kills: 0, elapsedMinutes: 0, paired: {}, status: 'not reached' };
  let now = 0, nextCheckin = checkin, wispResolved = true, bossResolved = false, bossProbed = false;
  let wispCraftAttempted = false, bellkeeperCraftAttempted = false;
  let wispSnapshot = null;
  let bellkeeperSnapshot = null;
  const wispProbeStages = new Set();

  function advanceMinute() {
    now += 60;
    const out = S.emptyOut(), beforeTarget = { ...game.target };
    S.advance(game, now, out);
    report.deaths += out.deaths;
    report.kills += out.kills;
    if (beforeTarget.key === 'wisp' && beforeTarget.level >= 20 && out.deaths && report.wallTimes.wisp == null && !wispProbeStages.has(beforeTarget.level)) {
      wispProbeStages.add(beforeTarget.level);
      const paired = probeCounter(game, 'wisp', beforeTarget.level, 'res_fire');
      if (paired.noCounter.outcome === 'death' && paired.withCounter.outcome === 'clear') {
        report.wallTimes.wisp = now;
        report.wallLevels.wisp = beforeTarget.level;
        report.paired.wisp = paired;
        wispSnapshot = cloneGame(game);
        const ilvl = Math.max(1, Math.min(beforeTarget.level, Math.max(...Object.values(game.unlocked)) + 4));
        report.counterAtWall = { wisp: { mats: { ...game.mats }, gold: game.gold, shards: game.mats.shards,
          requiredEmber: RECIPE.res_fire.cost, craftCost: S.craftCost('rare', ilvl), bag: game.bag.length } };
        wispResolved = false;
      }
    }
    return out;
  }

  function farmWispEssence(level) {
    const started = now, oldTarget = { ...game.target }, wasAutoPush = game.autoPush;
    game.autoPush = false;
    const safe = Math.max(1, Math.min(level - 1, game.unlocked.wisp));
    game.target = { key: 'wisp', level: safe };
    const ilvl = Math.max(1, Math.min(level, Math.max(...Object.values(game.unlocked)) + 4));
    while (!craftReady(game, 'res_fire', ilvl) && now < POLICY_HORIZON) advanceMinute();
    game.target = oldTarget; game.autoPush = wasAutoPush;
    return (now - started) / 60;
  }

  function farmDawn() {
    const started = now, oldTarget = { ...game.target }, wasAutoPush = game.autoPush;
    game.autoPush = false;
    game.target = { key: 'wisp', level: Math.max(1, Math.min(20, game.unlocked.wisp)) };
    while ((game.mats.holy || 0) < RECIPE.dmgPct.cost && now < POLICY_HORIZON) {
      if (game.sigils > 0) {
        S.doAction(game, { type: 'boss', key: 'bellkeeper', level: S.BOSSES.bellkeeper.minLevel });
        if (game.lastBoss.res.died) report.deaths++;
        const duration = Math.max(1, game.lastBoss.res.time || 1);
        now += duration;
        const out = S.emptyOut(); S.advance(game, now, out);
        report.deaths += out.deaths; report.kills += out.kills;
        report.elapsedMinutes = now / 60;
      } else advanceMinute();
    }
    game.target = oldTarget; game.autoPush = wasAutoPush;
    return (now - started) / 60;
  }

  function resolveBossCounter(level, wallTime) {
    if (bellkeeperCraftAttempted) return false;
    const levelToCraft = Math.max(1, Math.min(level, Math.max(...Object.values(game.unlocked)) + 4));
    if (policy === 'optimizer' && !craftReady(game, 'dmgPct', levelToCraft)) report.farmMinutes.bellkeeper = farmDawn();
    if (!craftReady(game, 'dmgPct', levelToCraft)) return false;
    bellkeeperCraftAttempted = true;
    const item = craftCounter(game, 'dmgPct', levelToCraft);
    if (!item) return false;
    const paired = compareCounter(bellkeeperSnapshot || game, 'bellkeeper', level, setTopCounter(game, item, 'dmgPct'), 'dmgPct');
    report.craftedComparison = { ...(report.craftedComparison || {}), bellkeeper: paired };
    report.farmMinutes.bellkeeper ??= Math.max(0, (now - wallTime) / 60);
    if (paired.noCounter.outcome !== 'clear' && paired.withCounter.outcome === 'clear') {
      S.doAction(game, { type: 'equip', id: item.id, to: 'ring1' });
      report.resolution.bellkeeper = 'counter clears paired attempt';
      return true;
    }
    return false;
  }

  function resolveWispCounter(level, wallTime) {
    if (wispCraftAttempted) return false;
    const levelToCraft = Math.max(1, Math.min(level, Math.max(...Object.values(game.unlocked)) + 4));
    if (policy === 'optimizer' && !craftReady(game, 'res_fire', levelToCraft)) report.farmMinutes.wisp = farmWispEssence(level);
    if (!craftReady(game, 'res_fire', levelToCraft)) return false;
    wispCraftAttempted = true;
    const item = craftCounter(game, 'res_fire', levelToCraft);
    if (!item) return false;
    const paired = compareCounter(wispSnapshot || game, 'wisp', level, setTopCounter(game, item, 'res_fire'), 'res_fire');
    report.craftedComparison = { ...(report.craftedComparison || {}), wisp: paired };
    report.farmMinutes.wisp ??= Math.max(0, (now - wallTime) / 60);
    if (paired.noCounter.outcome === 'death' && paired.withCounter.outcome === 'clear') {
      S.doAction(game, { type: 'equip', id: item.id, to: 'ring1' });
      report.resolution.wisp = 'counter clears paired attempt';
      return true;
    }
    return false;
  }

  for (; now < POLICY_HORIZON && (!wispResolved || !bossResolved);) {
    advanceMinute();
    if (now < nextCheckin) continue;
    while (nextCheckin <= now) nextCheckin += checkin;
    if (policy === 'lazy') lazyCheckin(game); else balanceCheckin(game);

    if (!wispResolved && report.wallTimes.wisp != null) {
      wispResolved = resolveWispCounter(report.wallLevels.wisp, report.wallTimes.wisp);
    }

    if (policy === 'optimizer') {
      const target = optimizerTarget(game);
      if (target) S.doAction(game, { type: 'target', key: target.key, level: target.level });
    }

    if (game.sigils > 0) {
      const key = policy === 'optimizer' && game.zones.hollow ? 'woundwarden' : 'bellkeeper';
      const level = game.bossUnlocked[key];
      const attemptedBoss = game.zones[S.BOSSES[key].zone] && level && game.sigils > 0;
      if (attemptedBoss) {
        S.doAction(game, { type: 'boss', key, level });
        now += Math.max(1, game.lastBoss.res.time || 1);
        const out = S.emptyOut(); S.advance(game, now, out);
        report.deaths += out.deaths; report.kills += out.kills;
      }
      if (attemptedBoss && game.lastBoss.res.died) report.deaths++;
      if (attemptedBoss && game.lastBoss.res.win) report.kills++;
      if (key === 'bellkeeper' && attemptedBoss) {
        if (!game.lastBoss.res.win && report.wallTimes.bellkeeper == null) {
          const paired = probeCounter(game, 'bellkeeper', level, 'dmgPct');
          if (paired.noCounter.outcome !== 'clear' && paired.withCounter.outcome === 'clear') {
            report.wallTimes.bellkeeper = now;
            report.wallLevels.bellkeeper = level;
            report.paired.bellkeeper = paired;
            bellkeeperSnapshot = cloneGame(game);
            const ilvl = Math.max(1, Math.min(level, Math.max(...Object.values(game.unlocked)) + 4));
            report.counterAtWall = { ...(report.counterAtWall || {}), bellkeeper: { mats: { ...game.mats }, gold: game.gold,
              shards: game.mats.shards, requiredDawn: RECIPE.dmgPct.cost, craftCost: S.craftCost('rare', ilvl), bag: game.bag.length } };
          }
          bossProbed = true;
        }
        if (game.lastBoss.res.win && report.wallTimes.bellkeeper != null) {
          report.wallClearTimes.bellkeeper ??= now;
          report.resolution.bellkeeper ??= 'later live clear';
          bossResolved = true;
        }
        if (report.wallTimes.bellkeeper != null && bossProbed && !bossResolved) {
          bossResolved = resolveBossCounter(report.wallLevels.bellkeeper, report.wallTimes.bellkeeper);
        }
      }
    }
  }

  report.elapsedMinutes = now / 60;
  report.final = { level: game.hero.level, target: `${game.target.key}@${game.target.level}`, mats: { ...game.mats }, familyProgress: { ...game.familyProgress } };
  report.deathsPerHour = Number((report.deaths / (now / 3600 || 1)).toFixed(3));
  report.minutesToFirstWall = Object.values(report.wallTimes).length ? Math.min(...Object.values(report.wallTimes)) / 60 : null;
  report.minutesPerWall = report.wallTimes.wisp != null && report.wallTimes.bellkeeper != null
    ? (report.wallTimes.bellkeeper - report.wallTimes.wisp) / 60 : null;
  report.minutesFromWallToClear = report.wallClearTimes.bellkeeper != null
    ? (report.wallClearTimes.bellkeeper - report.wallTimes.bellkeeper) / 60 : null;
  report.status = bossResolved ? report.resolution.bellkeeper : 'horizon reached with at least one confirmed wall unresolved';
  return report;
}

// Reporting-only continuation of the policy bots: preserve their decision
// rules, but run the full 12-hour horizon and sample stage progress/stalls.
function runProgressionReport(policy, seed) {
  const game = createFixture(seed, 20, { gear: 'rare', realistic: true });
  game.unlocked.wisp = 20;
  game.target = { key: 'wisp', level: 20 };
  game.autoPush = true;

  const checkinEvery = policy === 'lazy' ? 30 * 60 : 5 * 60;
  const horizon = 12 * 60 * 60;
  let now = 0;
  let nextCheckin = checkinEvery;
  let nextSample = 10 * 60;
  let highest = { stage: game.target.level, key: game.target.key };
  let progressSnapshot = cloneGame(game);
  let lastProgressAt = 0;
  let stallReported = false;
  let stallEvents = [];
  const stalls = [];
  const samples = [];
  let monsterDeaths = 0;
  let bossDeaths = 0;
  let deathsAfter30 = 0;
  let colossusDeathsAfter30 = 0;
  let frontierDeaths = 0;
  let frontierRetreats = 0;
  let kills = 0;
  let bossFailures = 0;
  let woundwardenDiagnostic = null;
  const firstFrontierDeath = [];

  function stageEvent(kind, detail) {
    stallEvents.push({ kind, detail });
  }

  function summarizedStallEvents() {
    const counts = new Map();
    for (const event of stallEvents) {
      const key = `${event.kind}\t${event.detail}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts].map(([key, count]) => {
      const [kind, detail] = key.split('\t');
      return { kind, detail, count };
    });
  }

  function observeProgress(at) {
    const candidate = { stage: game.target.level, key: game.target.key };
    for (const [key, unlocked] of Object.entries(game.unlocked)) {
      if (unlocked > candidate.stage) Object.assign(candidate, { stage: unlocked, key });
    }
    if (candidate.stage > highest.stage) {
      highest = candidate;
      lastProgressAt = at;
      progressSnapshot = cloneGame(game);
      stallReported = false;
      stallEvents = [];
    } else if (!stallReported && at - lastProgressAt >= 20 * 60) {
      const stall = {
        beganMin: Number((lastProgressAt / 60).toFixed(2)),
        detectedMin: Number((at / 60).toFixed(2)),
        stage: `${highest.key}@${highest.stage}`,
        causes: summarizedStallEvents().length ? summarizedStallEvents() : [{ kind: 'no deaths or boss failures recorded', detail: '-' }]
      };
      if (policy === 'lazy' && highest.key === 'wisp' && highest.stage >= 20 && highest.stage <= 35) {
        stall.gearAtDetection = reportGear(game);
        stall._snapshot = cloneGame(game);
      }
      if (policy === 'optimizer' && highest.key === 'colossus') {
        stall._snapshot = cloneGame(game);
      }
      stalls.push(stall);
      stallReported = true;
    }
  }

  function advanceTo(at) {
    const out = S.emptyOut();
    S.advance(game, at, out, (text, kind) => {
      if (kind !== 'death') return;
      const targetKey = game.target.key;
      const targetStage = game.target.level;
      const atFrontier = targetStage >= (game.unlocked[targetKey] || 0);
      if (atFrontier) {
        frontierDeaths++;
        if (firstFrontierDeath.length < 6) firstFrontierDeath.push({
          minute: Number((game.t / 60).toFixed(2)),
          target: `${targetKey}@${targetStage}`,
          text,
          deathsHere: game.deathsHere
        });
      }
      if (game.t >= 30 * 60) {
        deathsAfter30++;
        if (targetKey === 'colossus') colossusDeathsAfter30++;
      }
      stageEvent('death', `${targetKey}@${targetStage}: ${text}`);
      // The death logger runs just before die() applies the retry limit.
      if (atFrontier && game.deathsHere >= (game.pushRetries ?? 1)) frontierRetreats++;
    });
    monsterDeaths += out.deaths;
    kills += out.kills;
    observeProgress(at);
    return out;
  }

  function maybeCraftBellkeeperCounter(level) {
    const ilvl = Math.max(1, Math.min(level, Math.max(...Object.values(game.unlocked)) + 4));
    const cost = S.craftCost('rare', ilvl);
    if ((game.mats.holy || 0) < RECIPE.dmgPct.cost || game.mats.shards < cost.shards || game.gold < cost.gold || game.bag.length >= S.BAG_CAP) return false;
    const error = S.doAction(game, { type: 'craft', slot: 'ring', rarity: 'rare', ilvl, counter: 'dmgPct' });
    if (error) return false;
    return !S.doAction(game, { type: 'equip', id: game.bag.at(-1).id, to: 'ring1' });
  }

  while (now < horizon) {
    const until = Math.min(now + 60, nextCheckin, nextSample, horizon);
    advanceTo(until);
    now = until;

    if (now >= nextSample) {
      samples.push({ minute: nextSample / 60, stage: `${highest.key}@${highest.stage}`, target: `${game.target.key}@${game.target.level}` });
      nextSample += 10 * 60;
    }

    if (now < nextCheckin) continue;
    while (nextCheckin <= now) nextCheckin += checkinEvery;
    if (policy === 'optimizer') balanceCheckin(game);
    else lazyCheckin(game);

    if (policy === 'optimizer') {
      const target = optimizerTarget(game);
      if (target) S.doAction(game, { type: 'target', key: target.key, level: target.level });
    }

    if (game.sigils > 0) {
      const key = policy === 'optimizer' && game.zones.hollow ? 'woundwarden' : 'bellkeeper';
      const level = game.bossUnlocked[key];
      if (!game.zones[S.BOSSES[key].zone] || !level) continue;
      const beforeBoss = key === 'woundwarden' ? cloneGame(game) : null;
      S.doAction(game, { type: 'boss', key, level });
      const result = game.lastBoss.res;
      const duration = Math.max(1, result.time || 1);
      now = Math.min(horizon, now + duration);
      advanceTo(now);
      if (result.died) {
        bossDeaths++;
        if (now >= 30 * 60) deathsAfter30++;
      }
      if (policy === 'optimizer' && now >= 30 * 60 && key === 'woundwarden' && !result.win && !woundwardenDiagnostic) {
        const fireBuild = cloneGame(beforeBoss);
        const fireIlvl = Math.max(1, Math.min(level, Math.max(...Object.values(fireBuild.unlocked)) + 4));
        const fireValue = 18 * (1 + fireIlvl * 0.008);
        replaceAffix(fireBuild, 'ring1', 'res_fire', fireValue);
        const lifeBuild = cloneGame(beforeBoss);
        const lifeIlvl = Math.max(1, Math.min(level, Math.max(...Object.values(lifeBuild.unlocked)) + 4));
        replaceAffix(lifeBuild, 'ring1', 'life', 20 * Math.pow(1.105, lifeIlvl - 1));
        woundwardenDiagnostic = {
          minute: Number((now / 60).toFixed(2)), level,
          damageType: S.BOSSES.woundwarden.dmgType,
          baseDamage: S.BOSSES.woundwarden.dmg,
          interval: S.BOSSES.woundwarden.interval,
          regenPctPerPulse: S.BOSSES.woundwarden.regenPct,
          baseline: bossAttemptDetail(beforeBoss, 'woundwarden', level),
          fireResistanceCounter: bossAttemptDetail(fireBuild, 'woundwarden', level),
          lifeCounter: bossAttemptDetail(lifeBuild, 'woundwarden', level)
        };
      }
      if (!result.win) {
        bossFailures++;
        stageEvent('boss failure', `${key}@${level}: ${result.died ? 'death' : 'timeout'}; boss HP removed ${Number((result.pct * 100).toFixed(2))}%`);
        if (policy === 'lazy') maybeCraftBellkeeperCounter(level);
      }
    }
  }

  if (!stallReported && horizon - lastProgressAt >= 20 * 60) {
    const stall = {
      beganMin: Number((lastProgressAt / 60).toFixed(2)),
      detectedMin: 720,
      stage: `${highest.key}@${highest.stage}`,
      causes: summarizedStallEvents().length ? summarizedStallEvents() : [{ kind: 'no deaths or boss failures recorded', detail: '-' }]
    };
    if (policy === 'lazy' && highest.key === 'wisp' && highest.stage >= 20 && highest.stage <= 35) {
      stall.gearAtDetection = reportGear(game);
      stall._snapshot = cloneGame(game);
    }
    if (policy === 'optimizer' && highest.key === 'colossus') {
      stall._snapshot = cloneGame(game);
    }
    stalls.push(stall);
  }

  return {
    policy, seed, samples, stalls,
    deaths: monsterDeaths + bossDeaths,
    monsterDeaths, bossDeaths,
    deathsAfter30, colossusDeathsAfter30,
    deathsPerHour: Number(((monsterDeaths + bossDeaths) / 12).toFixed(3)),
    frontierDeaths, frontierRetreats, bossFailures, kills,
    firstFrontierDeath, woundwardenDiagnostic
  };
}

function testWispStallInterventions(stall) {
  const [key, stageText] = stall.stage.split('@');
  const stage = Number(stageText);
  const base = cloneGame(stall._snapshot);
  const baselineMinutes = minutesToStage(cloneGame(base), key, stage);

  const crafted = cloneGame(base);
  const ilvl = Math.max(1, Math.min(stage, Math.max(...Object.values(crafted.unlocked)) + 4));
  const craftError = S.doAction(crafted, { type: 'craft', slot: 'ring', rarity: 'rare', ilvl, counter: 'res_fire' });
  let craftedMinutes = 'not craftable';
  let craftStatus = craftError || 'crafted and equipped';
  if (!craftError) {
    const item = crafted.bag.at(-1);
    const equipError = S.doAction(crafted, { type: 'equip', id: item.id, to: 'ring1' });
    craftStatus = equipError || `equipped ${item.name}`;
    if (!equipError) { crafted.rng = clone(base.rng); craftedMinutes = minutesToStage(crafted, key, stage); }
  }

  const topFire = cloneGame(base);
  const fireValue = 18 * (1 + ilvl * 0.008);
  const fireItem = replaceAffix(topFire, 'ring1', 'res_fire', fireValue);
  const topFireMinutes = minutesToStage(topFire, key, stage);

  const best = bestScoringBagUpgrade(base);
  const bestMinutes = best ? minutesToStage(best.game, key, stage) : 'no qualifying bag upgrade';
  return {
    beganMin: stall.beganMin, detectedMin: stall.detectedMin, stage: stall.stage,
    currentGearStats: stall.gearAtDetection.stats, currentGearItems: stall.gearAtDetection.items,
    currentRing: stall.gearAtDetection.items.find(item => item.slot === 'ring1'),
    baselineMinutes, fireCraft: { status: craftStatus, minutes: craftedMinutes },
    topFireCounterfactual: { item: fireItem, minutes: topFireMinutes },
    bestBagChoice: best ? { item: best.item, slot: best.slot, projectedXpm: Number(best.xpm.toFixed(2)), minutes: bestMinutes } : bestMinutes
  };
}

function testColossusStall(stall) {
  const [key, stageText] = stall.stage.split('@');
  const stage = Number(stageText);
  const base = cloneGame(stall._snapshot);
  if (stall.seed != null) base.rng = { s: stall.seed >>> 0 };
  const baselineMinutes = minutesToStage(cloneGame(base), key, stage);
  const counter = cloneGame(base);
  const ilvl = Math.max(counter.equip.chest.ilvl || 1, stage + 4);
  const armorValue = 4 * Math.pow(1.105, ilvl - 1);
  const armorItem = replaceAffix(counter, 'chest', 'armor', armorValue);
  const counterMinutes = minutesToStage(counter, key, stage);
  const rawHit = S.MONSTERS.colossus.dmg * Math.pow(1.155, stage - 1) * S.ZONES.hollow.tough;
  const baseArmor = base.stats.armor, counterArmor = counter.stats.armor;
  const damageAfterArmor = armor => Math.max(rawHit * 0.25, rawHit - armor);
  return { seed: stall.seed, beganMin: stall.beganMin, detectedMin: stall.detectedMin, stage: stall.stage, baselineMinutes,
    armorCounter: { ...armorItem, armorGain: Number((counterArmor - baseArmor).toFixed(2)), finalArmor: Number(counterArmor.toFixed(2)), minutes: counterMinutes },
    oneHitMath: { assumedRoll: 1, playerLife: Number(base.stats.life.toFixed(2)), rawPhysicalHit: Number(rawHit.toFixed(2)), baseArmor: Number(baseArmor.toFixed(2)), counterArmor: Number(counterArmor.toFixed(2)),
      afterArmor: Number(damageAfterArmor(baseArmor).toFixed(2)), afterCounter: Number(damageAfterArmor(counterArmor).toFixed(2)),
      reductionFromCounter: Number((damageAfterArmor(baseArmor) - damageAfterArmor(counterArmor)).toFixed(2)), floor: Number((rawHit * 0.25).toFixed(2)) } };
}

function progressionReport() {
  const extraSeeds = [97, 503, 1109];
  const sweepSeeds = [...new Set([...POLICY_SEEDS, ...extraSeeds])];
  const results = ['optimizer', 'lazy'].flatMap(policy => sweepSeeds.map(seed => runProgressionReport(policy, seed)));
  const wispStalls = results.filter(result => result.policy === 'lazy')
    .flatMap(result => result.stalls.filter(stall => stall._snapshot).map(stall => ({ seed: result.seed, ...testWispStallInterventions(stall) })));
  const wispFirstBySeed = extraSeeds.map(seed => wispStalls.filter(row => row.seed === seed).sort((a, b) => a.detectedMin - b.detectedMin)[0]).filter(Boolean);
  const colossusTemplates = results.find(result => result.policy === 'optimizer' && result.seed === 31).stalls
    .filter(stall => stall._snapshot && ['colossus@62', 'colossus@70'].includes(stall.stage));
  const colossusStalls = colossusTemplates.flatMap(stall => extraSeeds.map(seed => testColossusStall({ seed, ...stall })));
  const woundwardenRows = results.filter(result => result.policy === 'optimizer' && extraSeeds.includes(result.seed))
    .map(result => ({ seed: result.seed, diagnostic: result.woundwardenDiagnostic }));
  const lines = [
    'Progression sweep follow-up raw results',
    `SIM_VERSION ${S.SIM_VERSION}; Paladin level 20 start; realistic Rare fixture; original seeds ${POLICY_SEEDS.join(', ')} plus repeat seeds ${extraSeeds.join(', ')}; horizon 720 sim minutes.`,
    'Optimizer follows web/test/balance.js check-ins; lazy checks in every 30 sim minutes, allocates passives, equips at most one item by existing score, crafts only with held materials, and does not deliberately farm.',
    'The production boss action now places a failed attempt on cooldown for its measured fight duration and refunds the Sigil. The balance bot stops its immediate boss loop after a failure; the next scheduled check-in retries only after simulation time has elapsed.',
    '', 'DEATH RECOVERY:',
    'Recovery totals count ordinary monster deaths only. Boss snapshot deaths do not enter the character recovery timer. Counterfactual 30-second totals reuse the same death counts; they do not rerun combat with a changed recovery rule.',
    ...results.map(r => `${r.policy} seed ${r.seed} | monster deaths ${r.monsterDeaths} | at 12s: ${Number((r.monsterDeaths * 12 / 60).toFixed(2))} min | at 30s: ${Number((r.monsterDeaths * 30 / 60).toFixed(2))} min`),
    '', 'CINDER COLOSSUS DEATHS AFTER MINUTE 30:',
    `damageType ${S.MONSTERS.colossus.dmgType}`,
    ...results.filter(r => r.policy === 'optimizer').map(r => `optimizer seed ${r.seed} | Cinder Colossus deaths ${r.colossusDeathsAfter30} / all deaths ${r.deathsAfter30} | share ${r.deathsAfter30 ? Number((100 * r.colossusDeathsAfter30 / r.deathsAfter30).toFixed(2)) : 0}%`),
    '', 'WOUNDWARDEN FIRE-RESISTANCE INTERVENTIONS:',
    `boss rule: ${JSON.stringify({ damageType: S.BOSSES.woundwarden.dmgType, baseDamage: S.BOSSES.woundwarden.dmg, attackInterval: S.BOSSES.woundwarden.interval, regenPctPerSecond: S.BOSSES.woundwarden.regenPct, evadePct: S.BOSSES.woundwarden.evade })}`,
    'The production fight result now preserves boss HP at player death. Each row pairs the first post-minute-30 baseline failure with the same-seed fire-resistance counterfactual.',
    `Fire-resistance counter wins: ${woundwardenRows.filter(row => row.diagnostic && row.diagnostic.fireResistanceCounter.outcome === 'win').length}/3.`,
    ...woundwardenRows.map(row => JSON.stringify(row)),
    '', 'LAZY WISP STALLS (WISP STAGES 20–35):',
    'Gear is captured at the moment the 20-minute stall is detected. Intervention runs start from that exact snapshot and hold the chosen gear fixed; they stop when the stage unlocks or after 240 sim minutes. Counter crafts can salvage the lowest-rarity unlocked bag item when full.',
    `First Wisp-stall fire-ring intervention improved clearance time: ${wispFirstBySeed.filter(row => typeof row.baselineMinutes === 'number' && typeof row.fireCraft.minutes === 'number' && row.fireCraft.minutes < row.baselineMinutes).length}/3 repeat seeds.`,
    `Top-roll fire-ring counterfactual improved clearance time: ${wispFirstBySeed.filter(row => typeof row.baselineMinutes === 'number' && typeof row.topFireCounterfactual.minutes === 'number' && row.topFireCounterfactual.minutes < row.baselineMinutes).length}/3 repeat seeds.`,
    ...wispFirstBySeed.map(row => JSON.stringify({ seed: row.seed, stage: row.stage, baselineMinutes: row.baselineMinutes, fireCraftMinutes: row.fireCraft.minutes, topFireMinutes: row.topFireCounterfactual.minutes,
      interventionHelped: typeof row.baselineMinutes === 'number' && typeof row.fireCraft.minutes === 'number' && row.fireCraft.minutes < row.baselineMinutes })),
    ...wispStalls.map(row => JSON.stringify(row)),
    '', 'OPTIMIZER COLOSSUS STALLS (3 REPEAT SEEDS):',
    'Intervention runs start at 20-minute stall detection and hold the chosen gear fixed until the next Colossus stage unlocks or 240 sim minutes pass.',
    `Damage type ${S.MONSTERS.colossus.dmgType}; the matching mitigation in this sim is armor against physical damage. Counter is a top-roll armor affix at item level stage + 4.`,
    `Armor counter shortened clearance: stage 62 ${colossusStalls.filter(row => row.stage === 'colossus@62' && typeof row.baselineMinutes === 'number' && typeof row.armorCounter.minutes === 'number' && row.armorCounter.minutes < row.baselineMinutes).length}/3; stage 70 ${colossusStalls.filter(row => row.stage === 'colossus@70' && typeof row.baselineMinutes === 'number' && typeof row.armorCounter.minutes === 'number' && row.armorCounter.minutes < row.baselineMinutes).length}/3. Seeds are paired reruns from the same seed-31 stall snapshots with RNG reseeded to ${extraSeeds.join(', ')}.`,
    ...colossusStalls.map(row => JSON.stringify(row)),
    '', 'RECHECK DEATH TOTALS:',
    ...results.map(r => `${r.policy} seed ${r.seed} | deaths ${r.deaths} (${r.monsterDeaths} monster + ${r.bossDeaths} boss) | deaths/hour ${r.deathsPerHour} | frontier deaths ${r.frontierDeaths} | frontier retreats ${r.frontierRetreats} | boss failures ${r.bossFailures} | kills ${r.kills}`)
  ];
  const report = lines.join('\n') + '\n';
  const output = path.resolve(__dirname, '../../docs/results/progression-followup.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, report);
  process.stdout.write(report);
}

function main() {
  if (process.argv[2] === '--progression-report') return progressionReport();
  const wispRows = [], knightRows = [], bossRows = [];
  for (const stage of STAGES) for (const seed of SEEDS) wispRows.push(sweepMonster('wisp', 'res_fire', stage, seed));
  for (const seed of SEEDS) knightRows.push(sweepMonster('knight', 'holy', 30, seed));
  for (const level of STAGES) for (const seed of SEEDS) bossRows.push(sweepBossFixture('rare', level, seed));
  const wispWalls = counterWallRows(wispRows, row => [{ counter: 'res_fire top roll', result: row.withCounter }]);
  const knightWalls = counterWallRows(knightRows, row => [{ counter: 'flat_holy top roll', result: row.withCounter }]);
  const bossWalls = bossWallRows(bossRows);
  const policyRows = ['lazy', 'optimizer'].flatMap(policy => POLICY_SEEDS.map(seed => runPolicy(policy, seed)));
  const lines = [
    'Paladin vertical-slice Step 3 raw results',
    `SIM_VERSION ${S.SIM_VERSION}; Seeds ${SEEDS.join(', ')}; level-matched Rare item fixtures; same-seed paired attempts. Policy seeds ${POLICY_SEEDS.join(', ')} start at Paladin 20, Rare gear, Wisp 20; policy horizon 720 sim minutes.`,
    'Wisp sweeps stages 5–50; counter is a rare ring res_fire at item-level top roll. Grave Knight is stage 30; counter is existing flat_holy top roll. Bellkeeper is Rare gear, levels 5–50; damage counter is top-roll dmgPct.',
    'Confirmed Wisp wall rows: ' + JSON.stringify(wispWalls),
    'Grave Knight holy wall rows: ' + JSON.stringify(knightWalls),
    'Bellkeeper counter wall rows: ' + JSON.stringify(bossWalls.filter(row => row.counter === 'damage')),
    '', 'WISP JSONL:', ...wispRows.map(JSON.stringify),
    '', 'GRAVE KNIGHT STAGE 30 JSONL:', ...knightRows.map(JSON.stringify),
    '', 'BELLKEEPER JSONL:', ...bossRows.map(JSON.stringify),
    '', 'EMBER STARTING COST 8 JSONL:', ...SEEDS.map(seed => JSON.stringify(wispFarmTrial(seed, 20, 8))),
    '', 'EMBER CALIBRATED COST 4 JSONL:', ...SEEDS.map(seed => JSON.stringify(wispFarmTrial(seed))),
    '', 'DAWN FARM TO 10 JSONL:', ...SEEDS.map(seed => JSON.stringify(dawnFarmTrial(seed))),
    '', 'POLICY JSONL:', ...policyRows.map(JSON.stringify)
  ];
  const report = lines.join('\n') + '\n';
  const output = path.resolve(__dirname, '../../docs/results/vertical-slice-step-3.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, report);
  process.stdout.write(report);
}

main();
