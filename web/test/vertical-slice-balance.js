'use strict';

const fs = require('node:fs');
const path = require('node:path');
const S = require('../src/sim.js');

const SEEDS = [31, 97, 503, 2026, 1109];
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
    if (rare) item.affixes = item.affixes.filter(([key]) => !COUNTER_STATS.includes(key));
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
  const control = clone(base);
  const treatment = clone(base);
  setRing(control, TYPICAL_RING.slice(0, count), level, seed ^ 0x13579, count >= 3 ? 'rare' : 'uncommon');
  const retained = TYPICAL_RING.slice(0, count - keys.length);
  setRing(treatment, keys.concat(retained), level, seed ^ 0x24680, count >= 3 ? 'rare' : 'uncommon');
  S.refresh(control);
  S.refresh(treatment);
  return { control, treatment, affixes: treatment.equip.ring1.affixes };
}

function runMonsterAttempt(game, key, stage) {
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
        hitsLanded: hits,
        incomingDamage: Number(out.dmgTaken.toFixed(2))
      };
    }
  }
  return { outcome: 'timeout', seconds: BOSS_LIMIT, kills: out.kills, deaths: out.deaths,
    damageDealt: Number(out.dmgDealt.toFixed(2)), hitsLanded: hits, incomingDamage: Number(out.dmgTaken.toFixed(2)) };
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
  const base = createFixture(seed, stage, { weapon: key === 'knight' ? 'sword' : 'mace' });
  const target = key === 'knight' ? 'knight' : 'wisp';
  let control, treatment, counterValue;

  if (counterName === 'armorPen') {
    control = clone(base);
    treatment = clone(base);
    S.refresh(control);
    S.refresh(treatment);
    treatment.stats.armorPen = 0.30;
    counterValue = 0.30;
  } else {
    const pair = ringPair(base, ['res_fire'], seed, stage, 'common');
    control = pair.control;
    treatment = pair.treatment;
    counterValue = treatment.stats.res.fire;
  }

  const normal = runMonsterAttempt(control, target, stage);
  const counter = runMonsterAttempt(treatment, target, stage);
  const other = createFixture(seed, stage, {
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
  const noCounter = clone(base);
  S.refresh(noCounter);
  const baseline = bossAttempt(noCounter, level);
  const different = createFixture(seed, level, { gear, classKey: 'rogue', weapon: 'dagger' });
  const differentBuild = bossAttempt(different, level);

  for (const counter of BOSS_COUNTERS) {
    const pair = ringPair(base, counter.keys, seed + counter.name.length, level, gear);
    const result = bossAttempt(pair.treatment, level);
    packages.push({
      counter: counter.name,
      affixes: pair.affixes.map(([key, value]) => [key, Number(value.toFixed(4))]),
      result
    });
  }
  return { gear, level, seed, noCounter: baseline, differentBuild, counters: packages };
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
    if (row.noCounter.outcome === 'clear') continue;
    for (const counter of row.counters) {
      if (counter.result.outcome === 'clear') {
        walls.push({
          fixture: row.gear,
          level: row.level,
          seed: row.seed,
          noCounterFails: row.noCounter.outcome,
          counter: counter.counter,
          counterClears: counter.result.outcome,
          differentBuildClears: row.differentBuild.outcome === 'clear',
          noCounter: row.noCounter,
          counterResult: counter.result,
          differentBuild: row.differentBuild
        });
      }
    }
  }
  return walls;
}

function main() {
  const wispRows = [];
  const knightRows = [];
  const bossRows = [];
  for (const stage of STAGES) {
    for (const seed of SEEDS) {
      wispRows.push(sweepMonster('wisp', 'res_fire', stage, seed));
      knightRows.push(sweepMonster('knight', 'armorPen', stage, seed));
    }
  }
  for (const gear of ['common', 'rare']) {
    for (const level of STAGES) {
      for (const seed of SEEDS) bossRows.push(sweepBossFixture(gear, level, seed));
    }
  }

  const wispWalls = counterWallRows(wispRows, row => [{ counter: 'res_fire', result: row.withCounter }]);
  const knightWalls = counterWallRows(knightRows, row => [{ counter: 'armorPen 0.30', result: row.withCounter }]);
  const bossWalls = bossWallRows(bossRows);
  const bossFirst = {};
  for (const gear of ['common', 'rare']) {
    for (const counter of BOSS_COUNTERS) {
      const rows = bossRows.filter(row => row.gear === gear);
      const firstNoCounter = rows.find(row => row.noCounter.outcome !== 'clear');
      const firstWall = rows.flatMap(row => row.counters
        .filter(item => item.counter === counter.name && row.noCounter.outcome !== 'clear' && item.result.outcome === 'clear')
        .map(item => ({ level: row.level, seed: row.seed, noCounter: row.noCounter, counter: item.result, differentBuild: row.differentBuild })))
        .sort((a, b) => a.level - b.level || a.seed - b.seed)[0] || null;
      bossFirst[gear + ':' + counter.name] = {
        firstNoCounterFailureLevel: firstNoCounter ? firstNoCounter.level : null,
        firstNoCounterFailureBySeed: Object.fromEntries(SEEDS.map(seed => {
          const row = rows.find(item => item.seed === seed && item.noCounter.outcome !== 'clear');
          return [seed, row ? row.level : null];
        })),
        firstLevelNoCounterFailCounterClear: firstWall
      };
    }
  }

  const lines = [
    'Paladin vertical-slice balance — Step 2 raw sweep',
    'Source: web/src/sim.js at the Step 1 baseline; SIM_VERSION ' + S.SIM_VERSION + '.',
    'Seeds: ' + SEEDS.join(', ') + '. Stages/levels: ' + STAGES.join(', ') + '. Attempts use the same seed for each no-counter/counter pair.',
    'Monster fixture: Paladin, player level equals target stage, level-matched Common gear, existing passive allocation, Templar at 10+. Wisp alternate: Rogue/Dagger. Grave Knight control weapon: Sword; alternate: Paladin/Mace.',
    'Wisp counter: ring1 fire resistance rolled by the sim. Wisp hits are counted from increases in dmgTaken; fire damage taken is the sim output.',
    'Grave Knight counter: armorPen=0.30 injected after stat calculation; weapon is Sword so physical damage is affected.',
    'Boss fixtures: Paladin/Mace at player level equal to boss level; Common or generated Rare gear. Rare fixture uses seeded Rare rolls, removes damage/crit/attack-speed affixes outside the tested ring, and uses a four-affix defensive ring control.',
    'Boss counter packages replace ring affixes with existing stat rolls: damage=dmgPct; crit=critChance+critMulti; attackSpeed=atkSpd; combined=dmgPct+critChance+critMulti+atkSpd. Same affix-count ring control is used. Boss limit=' + BOSS_LIMIT + 's. Alternate boss build: Rogue/Dagger with no damage package.',
    'Wall rule: same-seed no-counter failure plus counter clear. Different-build field is the alternate build without the tested counter.',
    '',
    'Wisp first no-counter failure: ' + JSON.stringify(firstNoCounterFailures(wispRows)),
    'Grave Knight first no-counter failure: ' + JSON.stringify(firstNoCounterFailures(knightRows)),
    'Boss first no-counter-fail/counter-clear: ' + JSON.stringify(bossFirst),
    'Confirmed monster wall rows: ' + JSON.stringify([...wispWalls, ...knightWalls]),
    'Confirmed boss wall rows: ' + JSON.stringify(bossWalls),
    '',
    'WISP JSONL:',
    ...wispRows.map(row => JSON.stringify(row)),
    '',
    'GRAVE KNIGHT JSONL:',
    ...knightRows.map(row => JSON.stringify(row)),
    '',
    'BELLKEEPER JSONL:',
    ...bossRows.map(row => JSON.stringify(row))
  ];

  const report = lines.join('\n') + '\n';
  const output = path.resolve(__dirname, '../../docs/results/vertical-slice-step-2.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, report);
  process.stdout.write(report);
}

main();
