'use strict';

// Controlled counter ablations for the Paladin slice.
// Each pair shares its seed and full baseline build; only the planned ring affix differs.
const fs = require('node:fs');
const path = require('node:path');
const S = require('../src/sim.js');

const ATTEMPT_SECONDS = 150;
const STEP_SECONDS = 0.1;
const SEEDS = [31, 97, 503, 2026, 1109];
const TESTS = [
  { name: 'Hollow Wisp stage 3', key: 'wisp', stage: 3, playerLevel: 3, counter: 'res_fire' },
  { name: 'Hollow Wisp stage 7', key: 'wisp', stage: 7, playerLevel: 7, counter: 'res_fire' },
  { name: 'Hollow Bellkeeper level 15', key: 'bellkeeper', stage: 15, playerLevel: 15, counter: 'lifeOnHit', boss: true }
];

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFixture(seed, level, counterKey) {
  const game = S.newGame('paladin', 0, seed);
  game.hero.level = level;
  game.hero.points = level - 1;

  // Match the passive-allocation order in the existing Paladin balance runner.
  const passiveOrder = ['might', 'vitality', 'swiftness', 'precision'];
  while (game.hero.points > 0) {
    const passive = passiveOrder[game.hero.points % passiveOrder.length];
    game.hero.passives[passive] = (game.hero.passives[passive] || 0) + 1;
    game.hero.points--;
  }
  if (level >= S.SPEC_LEVEL) game.hero.spec = 0;

  // Give each attempt the same level-appropriate common kit. Gear RNG is isolated
  // from combat RNG so the with/without pair starts on the identical combat seed.
  const gearRng = { s: (seed ^ 0x5f3759df) >>> 0 };
  const slots = ['weapon', 'helm', 'chest', 'gloves', 'belt', 'legs', 'boots', 'amulet'];
  for (const slot of slots) {
    const item = S.makeItem(gearRng, slot, level, {
      rarity: 'common',
      ...(slot === 'weapon' ? { base: 'mace' } : {})
    });
    item.id = 'fixture-' + seed + '-' + slot;
    game.equip[slot] = item;
  }

  const ring = makeCounterRing(seed, level, counterKey);
  ring.id = 'fixture-' + seed + '-ring1';
  game.equip.ring1 = ring;
  S.refresh(game);
  return game;
}

function makeCounterRing(seed, level, counterKey) {
  // Rejection-sample an ordinary Uncommon ring that actually rolled the planned
  // affix. Both arms keep every other ring stat identical.
  for (let attempt = 0; attempt < 10000; attempt++) {
    const rng = { s: (seed ^ 0x9e3779b9 ^ attempt) >>> 0 };
    const ring = S.makeItem(rng, 'ring', level, { rarity: 'uncommon' });
    if (ring.affixes.some(([key]) => key === counterKey)) return ring;
  }
  throw new Error('Could not roll ring counter: ' + counterKey);
}

function withCounter(game, counterKey) {
  const treatment = copy(game);
  const affix = treatment.equip.ring1.affixes.find(([key]) => key === counterKey);
  if (!affix) throw new Error('Counter affix missing from ring1: ' + counterKey);
  if (treatment.equip.ring1.slot !== 'ring') throw new Error('Counter item is not a ring.');
  S.refresh(treatment);
  return { game: treatment, value: affix[1] };
}

function withoutCounter(game, counterKey) {
  const control = copy(game);
  control.equip.ring1.affixes = control.equip.ring1.affixes.filter(([key]) => key !== counterKey);
  S.refresh(control);
  return control;
}

function runMonsterAttempt(game) {
  game.target = { key: 'wisp', level: game.testStage };
  game.autoPush = false;
  game.fight = { hp: null, mon: null, pNext: 0, pulseNext: 1, respawnAt: 0,
    deadUntil: 0, cd: {}, shield: 0, buffs: {}, cycle: 0, critCastAt: -99 };

  const out = S.emptyOut();
  out.killTimes = [];
  const deaths = [];
  for (let elapsed = STEP_SECONDS; elapsed <= ATTEMPT_SECONDS; elapsed += STEP_SECONDS) {
    S.advance(game, elapsed, out, (_message, kind) => {
      if (kind === 'death') deaths.push(game.t);
    });
    const firstKill = out.killTimes[0];
    const firstDeath = deaths[0];
    if (firstKill != null || firstDeath != null) {
      if (firstDeath != null && (firstKill == null || firstDeath < firstKill)) {
        return { outcome: 'death', seconds: Number(firstDeath.toFixed(2)), kills: out.kills, deaths: out.deaths };
      }
      return { outcome: 'clear', seconds: Number(firstKill.toFixed(2)), kills: out.kills, deaths: out.deaths };
    }
  }
  return { outcome: 'timeout', seconds: ATTEMPT_SECONDS, kills: out.kills, deaths: out.deaths };
}

function runBossAttempt(game, key, level) {
  // Mirror fightBoss's seeded snapshot, retaining damage dealt when a death
  // clears the monster object before fightBoss can calculate its HP remainder.
  const seed = Math.floor(S.rand(game.rng) * 4294967296);
  const clone = S.newGame(game.hero.cls, 0, seed);
  clone.rng = { s: seed >>> 0 };
  clone.hero = copy(game.hero);
  clone.asc = copy(game.asc);
  clone.equip = copy(game.equip);
  clone.bar = copy(game.bar);
  clone.target = { key, level };
  clone.autoPush = false;
  for (const monsterKey of S.MONSTER_KEYS) clone.unlocked[monsterKey] = 9999;
  clone.fight = { hp: null, mon: null, pNext: 0, pulseNext: 1, respawnAt: 0,
    deadUntil: 0, cd: {}, shield: 0, buffs: {}, cycle: 0, critCastAt: -99 };
  clone.stats = S.computeStats(clone);
  clone.slotted = Object.fromEntries(S.availableSpells(clone).map(spell => [spell, true]));
  S.refresh(clone);
  clone.boss = true;

  const out = S.emptyOut();
  S.advance(clone, 0, out); // spawn the boss before reading its full HP
  const bossMaxHp = clone.fight.mon.max;
  let seconds = 0;
  while (seconds < ATTEMPT_SECONDS) {
    seconds++;
    S.advance(clone, seconds, out);
    if (out.kills || out.deaths) break;
  }
  const result = {
    win: out.kills > 0,
    died: out.deaths > 0,
    time: seconds,
    damage: out.dmgDealt,
    remainingHp: out.kills ? 0 : Math.max(0, bossMaxHp - out.dmgDealt)
  };
  return {
    outcome: result.win ? 'clear' : result.died ? 'death' : 'timeout',
    seconds: result.time,
    bossDamage: Number(result.damage.toFixed(2)),
    bossHpRemovedPct: Number(((result.damage / bossMaxHp) * 100).toFixed(2)),
    bossHpRemaining: Number(result.remainingHp.toFixed(2)),
    deaths: Number(result.died)
  };
}

function attempt(test, seed, useCounter) {
  const base = createFixture(seed, test.playerLevel, test.counter);
  base.testStage = test.stage;
  const selected = useCounter
    ? withCounter(base, test.counter)
    : { game: withoutCounter(base, test.counter), value: null };

  // Ring affixes require the canonical ring equipment keys, ring1 or ring2.
  const ringStats = S.computeStats(selected.game);
  if (selected.game.equip.ring1.slot !== 'ring') throw new Error('Ring-slot mapping failed.');
  if (useCounter && test.counter === 'res_fire' && !ringStats.res.fire) throw new Error('Fire resistance did not apply from ring1.');
  if (useCounter && test.counter === 'lifeOnHit' && !ringStats.lifeOnHit) throw new Error('Life on hit did not apply from ring1.');

  const result = test.boss
    ? runBossAttempt(selected.game, test.key, test.stage)
    : runMonsterAttempt(selected.game);

  return {
    seed,
    target: test.name,
    playerLevel: test.playerLevel,
    counter: useCounter ? test.counter : 'none',
    ringSlot: 'ring1',
    counterValue: selected.value == null ? null : Number(selected.value.toFixed(4)),
    fireResistance: Number(ringStats.res.fire.toFixed(4)),
    lifeOnHit: Number(ringStats.lifeOnHit.toFixed(4)),
    ...result
  };
}

function main() {
  const results = [];
  for (const test of TESTS) {
    for (const seed of SEEDS) {
      const control = attempt(test, seed, false);
      const treatment = attempt(test, seed, true);
      results.push({ test: test.name, seed, withoutCounter: control, withCounter: treatment });
    }
  }

  const lines = [
    'Paladin vertical-slice balance — Step 1 counter ablations',
    'Source: web/src/sim.js at 494f7275f858d4352080d21fde0a18e88cbc750f (SIM_VERSION ' + S.SIM_VERSION + ')',
    'Fixture: level-matched Common kit; Paladin passives follow web/test/balance.js; Templar at level 15; fixed combat seed per pair. This is a controlled fixture, not either progression policy.',
    'Candidate stages: Wisp 3 and 7, plus Bellkeeper level 15, transcribed from the lost-session screenshot and treated as candidates, not established walls.',
    'Counters: Wisp=res_fire; Bellkeeper=lifeOnHit. Both use a valid Uncommon ring in ring1. Control keeps the same ring and all other affixes but removes only the planned counter.',
    'Attempt: first Wisp kill or death, max 150 seconds; boss mirrors the engine fightBoss seed and 150-second limit while recording damage before death.',
    'Wall rule: a candidate is counter-confirmed only when the same seed fails without the counter and clears with it.',
    '',
    ...results.map(row => JSON.stringify(row))
  ];
  const text = lines.join('\n') + '\n';
  const outputPath = path.resolve(__dirname, '../../docs/results/vertical-slice-step-1.txt');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text);
  process.stdout.write(text);
}

main();

