'use strict';

// Test-only split-hit and monster-critical replay experiments.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const S = require('../src/sim.js');
const { runBot } = require('./defense-followup.js');
const { makeBuild } = require('./defense-experiment.js');
const { throughputReplay } = require('./defense-deepdive.js');

const SEEDS = [31, 2026], STAGES = [62, 70], MULTIPLIERS = [0.5, 0.75, 1, 1.25, 1.5];
const HOURS = 12, HORIZON = HOURS * 3600;
const clone = x => JSON.parse(JSON.stringify(x));

function loadSim(k, split = 1, hpScale = 1, critChance = 0, critMultiplier = 2, recovery = 12) {
  const file = path.resolve(__dirname, '../src/sim.js');
  let src = fs.readFileSync(file, 'utf8');
  const replace = (before, after, label) => {
    if (!src.includes(before)) throw new Error(`Harness hook not found: ${label}`);
    src = src.replace(before, after);
  };
  replace(`const ARMOR_K_FACTOR = ${S.ARMOR_K_FACTOR};`, `const ARMOR_K_FACTOR = ${k};`, 'armor k');
  replace('RECOVERY = 12', `RECOVERY = ${recovery}`, 'recovery');
  replace('const RESPAWN = 0.6, RECOVERY',
    `const EXPERIMENT_ATTACK_SPLIT = ${split}, EXPERIMENT_MONSTER_CRIT_CHANCE = ${critChance}, EXPERIMENT_MONSTER_CRIT_MULTIPLIER = ${critMultiplier};\nconst RESPAWN = 0.6, RECOVERY`, 'experiment constants');
  replace('hp: M.hp * gr * tf, max: M.hp * gr * tf, dmg: M.dmg * gr * tf, armor: M.armor * gr * tf, interval: M.interval,',
    `hp: M.hp * gr * tf * ${hpScale}, max: M.hp * gr * tf * ${hpScale}, dmg: M.dmg * gr * tf / EXPERIMENT_ATTACK_SPLIT, armor: M.armor * gr * tf, interval: M.interval / EXPERIMENT_ATTACK_SPLIT,`, 'split spawn values');
  replace('function refresh(g) {\n  g.stats = computeStats(g);',
    'function refresh(g) {\n  g.stats = computeStats(g);\n  if (g.experimentArmorMultiplier != null) g.stats.armor *= g.experimentArmorMultiplier;', 'armor multiplier');
  replace('if (S.dodge && rand(r) * 100 < S.dodge) return;\n  const ward = f.buffs.frostward > g.t;\n  let d = m.dmg * rr(r, 0.85, 1.15);',
    'if (S.dodge && rand(r) * 100 < S.dodge) return;\n  if (g.experimentTrack) g.experimentLandedHits++;\n  if (g.experimentFightLogEnabled) g.experimentFightHitCount++;\n  const ward = f.buffs.frostward > g.t;\n  const experimentWasFull = f.hp >= S.life - 1e-9;\n  let d = m.dmg * rr(r, 0.85, 1.15);\n  const experimentCrit = EXPERIMENT_MONSTER_CRIT_CHANCE > 0 && rand(r) * 100 < EXPERIMENT_MONSTER_CRIT_CHANCE;\n  if (experimentCrit) d *= EXPERIMENT_MONSTER_CRIT_MULTIPLIER;', 'monster attack and crit');
  replace('f.hp -= d; out.dmgTaken += d;\n  if (S.reflect > 0) {',
    'f.hp -= d; out.dmgTaken += d;\n  if (f.hp <= 0) { g.experimentDeathWasFull = experimentWasFull; g.experimentDeathWasCrit = experimentCrit; }\n  if (S.reflect > 0) {', 'death-hit metadata');
  replace('if (f.shield > 0) { const a = Math.min(f.shield, d); f.shield -= a; d -= a; }\n  f.hp -= d; out.dmgTaken += d;',
    'if (f.shield > 0) { const a = Math.min(f.shield, d); f.shield -= a; d -= a; }\n  if (g.experimentFightLogEnabled) g.experimentFightDamage += d;\n  f.hp -= d; out.dmgTaken += d;', 'fight damage tracking');
  replace('function die(g, out, log) {\n  const f = g.fight;',
    `function die(g, out, log) {\n  const f = g.fight;\n  if (g.experimentTrack) {\n    const full = !!g.experimentDeathWasFull;\n    g.experimentDeathsAtFull += full ? 1 : 0; g.experimentDeathsWhileHurt += full ? 0 : 1;\n    g.experimentCritDeaths += g.experimentDeathWasCrit ? 1 : 0;\n    g.experimentHitsToDie.push(g.experimentLandedHits - g.experimentHitsAtLastDeath);\n    g.experimentHitsAtLastDeath = g.experimentLandedHits;\n  }\n  g.experimentDeathWasFull = false; g.experimentDeathWasCrit = false;`, 'death counts');
  src = src.replace('function die(g, out, log) {\n  const f = g.fight;\n  if (g.experimentTrack)',
    'function die(g, out, log) {\n  const f = g.fight;\n  if (g.experimentFightLogEnabled && g.experimentFightStarted != null) {\n    const rec = { seconds: g.t - g.experimentFightStarted, hitsTaken: g.experimentFightHitCount, playerLifeAtKill: 0, maxLife: g.stats.life, fullLifeAtNextSpawn: null, died: true };\n    g.experimentFightRecords.push(rec); g.experimentPreviousFightRecord = rec; g.experimentFightStarted = null;\n  }\n  if (g.experimentTrack)');
  replace('f.mon = spawnMonster(g.target.key, g.target.level);\n      f.mon.next =',
    `f.mon = spawnMonster(g.target.key, g.target.level);\n      if (g.experimentFightLogEnabled) {\n        if (g.experimentPreviousFightRecord) g.experimentPreviousFightRecord.fullLifeAtNextSpawn = f.hp >= S.life - 1e-9;\n        g.experimentFightStarted = g.t; g.experimentFightHitCount = 0; g.experimentCurrentFightRecord = null;\n      }\n      f.mon.next =`, 'fight start tracking');
  replace('f.mon = null; f.respawnAt = g.t + RESPAWN;\n  out.kills++;',
    `f.mon = null; f.respawnAt = g.t + RESPAWN;\n  out.kills++;\n  if (g.experimentFightLogEnabled) {\n    const rec = { seconds: g.t - g.experimentFightStarted, hitsTaken: g.experimentFightHitCount, playerLifeAtKill: f.hp, maxLife: S.life, fullLifeAtNextSpawn: null, died: false };\n    g.experimentFightRecords.push(rec); g.experimentPreviousFightRecord = rec; g.experimentCurrentFightRecord = rec; g.experimentFightStarted = null;\n  }`, 'fight kill tracking');
  const loaded = new Module(`${file}.split-${k}-${split}-${hpScale}-${critChance}-${critMultiplier}-${recovery}`, module);
  loaded.filename = file; loaded.paths = Module._nodeModulePaths(path.dirname(file)); loaded._compile(src, file);
  loaded.exports.EXPERIMENT_ATTACK_SPLIT = split;
  loaded.exports.EXPERIMENT_HP_SCALE = hpScale;
  return loaded.exports;
}

function freshStage(Sim, snapshot, stage, armorMultiplier = 1) {
  const g = clone(snapshot);
  g.target = { key: 'colossus', level: stage }; g.autoPush = false; g.streak = 0;
  g.experimentArmorMultiplier = armorMultiplier;
  Sim.refresh(g);
  g.fight.mon = null; g.fight.deadUntil = 0; g.fight.respawnAt = g.t; g.fight.hp = g.stats.life;
  return g;
}

function fixedReplay(Sim, snapshot, seed, stage, armorMultiplier) {
  const g = freshStage(Sim, snapshot, stage, armorMultiplier);
  g.experimentTrack = true; g.experimentLandedHits = 0; g.experimentHitsAtLastDeath = 0;
  g.experimentDeathsAtFull = 0; g.experimentDeathsWhileHurt = 0; g.experimentCritDeaths = 0; g.experimentHitsToDie = [];
  const out = Sim.emptyOut(), end = g.t + HORIZON;
  while (g.t < end) Sim.advance(g, Math.min(end, g.t + 1), out);
  const vals = g.experimentHitsToDie, sorted = [...vals].sort((a, b) => a - b);
  return { k: Sim.ARMOR_K_FACTOR, split: Sim.EXPERIMENT_ATTACK_SPLIT || null, seed, stage, armorMultiplier,
    armor: Number(g.stats.armor.toFixed(2)), maxLife: g.stats.life, deaths: out.deaths,
    fullLifeDeaths: g.experimentDeathsAtFull, hurtDeaths: g.experimentDeathsWhileHurt,
    criticalDeaths: g.experimentCritDeaths, landedHits: g.experimentLandedHits,
    medianHitsToDie: sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null,
    meanHitsToDie: vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null,
    noDeathHitLowerBound: out.deaths ? null : g.experimentLandedHits };
}

function fightLengthReplay(Sim, snapshot) {
  const g = freshStage(Sim, snapshot, 70);
  const lifeAtStart = g.stats.life, armorAtStart = g.stats.armor, regenAtStart = g.stats.regen;
  g.experimentFightLogEnabled = true; g.experimentTrack = true; g.experimentDeathsAtFull = 0; g.experimentDeathsWhileHurt = 0; g.experimentCritDeaths = 0; g.experimentHitsToDie = []; g.experimentHitsAtLastDeath = 0;
  g.experimentFightRecords = []; g.experimentLandedHits = 0; g.experimentFightDamage = 0;
  const out = Sim.emptyOut(), end = g.t + HORIZON;
  while (g.t < end) Sim.advance(g, Math.min(end, g.t + 1), out);
  const fights = g.experimentFightRecords, kills = fights.filter(x => !x.died), durations = kills.map(x => x.seconds).sort((a, b) => a - b);
  const hits = fights.map(x => x.hitsTaken).sort((a, b) => a - b), killHits = kills.map(x => x.hitsTaken).sort((a, b) => a - b);
  return { stage: 70, seed: 31, hpScale: Sim.EXPERIMENT_HP_SCALE, fights: fights.length, successfulKills: kills.length, fightDeaths: fights.length - kills.length,
    deathsAtFullLife: g.experimentDeathsAtFull, deathsWhileHurt: g.experimentDeathsWhileHurt,
    lifeAtStart, lifeAtEnd: g.stats.life, armorAtStart: Number(armorAtStart.toFixed(2)), armorAtEnd: Number(g.stats.armor.toFixed(2)),
    regenAtStart: Number(regenAtStart.toFixed(2)), lifeOnHit: Number(g.stats.lifeOnHit.toFixed(2)),
    meanKillTimeSeconds: Number((kills.reduce((a, x) => a + x.seconds, 0) / (kills.length || 1)).toFixed(2)),
    medianKillTimeSeconds: durations.length ? durations[Math.floor((durations.length - 1) / 2)] : null,
    meanMonsterHitsPerFight: Number((fights.reduce((a, x) => a + x.hitsTaken, 0) / (fights.length || 1)).toFixed(2)),
    medianMonsterHitsPerFight: hits.length ? hits[Math.floor((hits.length - 1) / 2)] : null,
    meanHitsPerSuccessfulKill: Number((kills.reduce((a, x) => a + x.hitsTaken, 0) / (kills.length || 1)).toFixed(2)),
    medianHitsPerSuccessfulKill: killHits.length ? killHits[Math.floor((killHits.length - 1) / 2)] : null,
    meanDamagePerLandedHit: Number((g.experimentFightDamage / (fights.reduce((a, x) => a + x.hitsTaken, 0) || 1)).toFixed(2)),
    fullLifeAtKillPct: Number((kills.filter(x => x.playerLifeAtKill >= x.maxLife - 1e-9).length * 100 / (kills.length || 1)).toFixed(2)),
    fullLifeAtNextSpawnPct: Number((fights.filter(x => x.fullLifeAtNextSpawn === true).length * 100 / (fights.length || 1)).toFixed(2)),
    noNextSpawnObserved: fights.filter(x => x.fullLifeAtNextSpawn == null).length };
}

function main() {
  const snapshots = Object.fromEntries(SEEDS.map(seed => [seed, runBot(S, seed, 'optimizer').snapshots]));
  const hitSplit = [];
  for (const k of [0.001, 0.00045]) for (const split of [1, 4, 10]) {
    const Sim = loadSim(k, split);
    for (const seed of SEEDS) for (const stage of STAGES) for (const armor of MULTIPLIERS) {
      const snap = snapshots[seed][stage];
      hitSplit.push(snap ? fixedReplay(Sim, snap, seed, stage, armor) : { k, split, seed, stage, armorMultiplier: armor, unavailable: true });
    }
  }

  const hpFight = [];
  for (const hpScale of [3, 6]) {
    const Sim = loadSim(0.001, 1, hpScale);
    hpFight.push(fightLengthReplay(Sim, snapshots[31][70]));
  }

  const throughput = [], pace = [];
  for (const k of [0.001, 0.00045]) for (const split of [4, 10]) {
    const Sim = loadSim(k, split, 1, 0, 2, 30);
    const progressSim = loadSim(k, split);
    for (const seed of SEEDS) for (const stage of STAGES) {
      const snap = snapshots[seed][stage];
      const builds = { current: clone(snap), tank: makeBuild(Sim, snap, stage, 'tank'), burst: makeBuild(Sim, snap, stage, 'burst') };
      for (const [name, build] of Object.entries(builds)) throughput.push({ split, ...throughputReplay(Sim, build, seed, stage, name) });
    }
    for (const seed of SEEDS) {
      const run = runBot(progressSim, seed, 'optimizer', 2 * 3600);
      pace.push({ k, split, seed, stagesAt30_60_90_120: [30, 60, 90, 120].map(min => run.checkpoints[min]), finalStage: run.finalStage });
    }
  }

  const crits = [];
  for (const split of [1, 4]) for (const critChance of [0, 5, 10]) for (const critMultiplier of [2, 3]) {
    const Sim = loadSim(0.001, split, 1, critChance, critMultiplier);
    for (const seed of SEEDS) for (const armor of MULTIPLIERS) {
      crits.push(fixedReplay(Sim, snapshots[seed][70], seed, 70, armor));
      Object.assign(crits[crits.length - 1], { split, critChancePct: critChance, critMultiplier });
    }
  }

  const sections = [
    ['HP 3X / 6X FIGHT LENGTH (STAGE 70, SEED 31)', hpFight],
    ['ARMOR CLIFF: ATTACK SPLIT N, BOTH K FACTORS, BOTH STAGES AND SEEDS', hitSplit],
    ['TANK / BURST / CURRENT THROUGHPUT AT SPLIT N=4/10', throughput],
    ['OPTIMIZER PACE AT SPLIT N=4/10; STAGES AT 30/60/90/120 MINUTES', pace],
    ['MONSTER CRIT REPLAYS: K=0.001, STAGE 70, BOTH SEEDS', crits]
  ];
  const rows = [];
  for (const [title, data] of sections) rows.push('', `${title}:`, ...data.map(x => JSON.stringify(x)));
  const report = [
    'Godscar defense experiment: split monster attacks and test-only monster critical hits',
    `SIM_VERSION ${S.SIM_VERSION}; full ${HOURS}-sim-hour fixed-stage replays unless a row says two-hour optimizer pace. Rare Paladin fixture; seeds 31 and 2026. No production simulation changes.`,
    'For split N, monster attack interval is divided by N and per-hit raw damage is divided by N, leaving raw damage per second unchanged. The ratio-armor formula uses average raw hit as its K input, so splitting attacks also lowers K and reduces post-armor damage per second further.',
    'Armor rows use the same ordinary optimizer snapshot per seed/stage and change only armor. Death hit counts are recorded inside the hit/death events, so multiple attacks within a second are counted separately. No-death rows give a lower bound from all landed hits.',
    'Crit chance and multiplier apply to the physical monster hit before armor mitigation. Full-life versus hurt death is classified from life immediately before the killing hit. This experiment adds no player crit-resistance stat.',
    'Fight-length rows include every encounter ending in a kill or player death; kill time and hits-per-kill are also reported for successful kills only. Damage per landed hit is after armor. Life-at-next-spawn includes the normal full-life death recovery.',
    'Throughput rows use the same seed-specific stage snapshot, equal item levels, three affix swaps for tank/burst, one-stage retreat on death, and 30-second test recovery. XP/material/death rates use all 12 sim hours. Pace rows use the optimizer for two sim hours.',
    ...rows,
    '',
    'Stage 70 seed 31: at 3x HP, mean kill time is 3.68s and encounters average 0.99 landed hits (1,124 kills; 2,721 deaths). At 6x HP, mean kill time is 7.84s and encounters average 1.24 hits (202 kills; 2,795 deaths). Mean hit damage is about 34,970 against 32,205 starting life. Every recorded death is at full life. The character has 755 regen/second and 0 life-on-hit; successful kills usually take no hit, while death recovery restores full life before the next spawn. Longer HP therefore creates more chances for the same lethal hit, not more hits-to-die.',
    'Attack split: N=4 and N=10 have zero deaths in every tested armor/factor/stage/seed cell, so they do not show a gradual survival curve. Because K is recalculated from smaller per-hit damage, armor also cuts post-mitigation DPS more than the raw DPS-preserving split alone would.',
    'Crits: with N=1 and 1.5x armor, the 5%/2x, 5%/3x, 10%/2x, and 10%/3x settings cause 52, 286, 129, and 614 deaths respectively across the two seeds; all are full-life deaths. At N=4, the tested crit grid has zero deaths. At N=1, death counts generally fall as armor rises but crit deaths remain abrupt full-life kills, rather than a smooth hits-to-die curve.',
    'Existing stat check: there is no monster critical chance/damage reduction stat in this sim. Player critical chance and critical multiplier affect player attacks only. Armor mitigates physical damage; resistance mitigates its matching damage type. Dodge can avoid an attack entirely, but does not reduce crit chance or crit damage.',
    'Candidate remains k=0.00045 with 1x monster HP; it only moves the survival cliff deeper, not removes it. Split attacks and monster crits remain test-only probes.',
    'Unverified: only Paladin Rare fixtures, seeds 31/2026, Colossus 62/70 for split attacks, and Colossus 70 for crits. No other classes, stages, fixtures, or player-controlled behavior were tested.'
  ].join('\n') + '\n';
  const output = path.resolve(__dirname, '../../docs/results/paladin-defense-split-crit.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, report);
  process.stdout.write(`Wrote ${output}; rows: split=${hitSplit.length}, throughput=${throughput.length}, pace=${pace.length}, crit=${crits.length}.\n`);
}

if (require.main === module) main();
module.exports = { loadSim, fightLengthReplay, fixedReplay };
