'use strict';

// Report-only healing-threshold, armor-cliff, and penalty-aware throughput replays.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const S = require('../src/sim.js');
const { runBot } = require('./defense-followup.js');
const { makeBuild } = require('./defense-experiment.js');

const SEEDS = [31, 2026];
const HORIZON = 12 * 3600;
const clone = x => JSON.parse(JSON.stringify(x));

function loadExperimentSim(factor, recovery = 12, instrumentHealing = false, hpScale = 1) {
  const file = path.resolve(__dirname, '../src/sim.js');
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(`const ARMOR_K_FACTOR = ${S.ARMOR_K_FACTOR};`, `const ARMOR_K_FACTOR = ${factor};`);
  source = source.replace('RECOVERY = 12', `RECOVERY = ${recovery}`);
  source = source.replace('hp: M.hp * gr * tf, max: M.hp * gr * tf, dmg:',
    `hp: M.hp * gr * tf * ${hpScale}, max: M.hp * gr * tf * ${hpScale}, dmg:`);
  source = source.replace(
    'function refresh(g) {\n  g.stats = computeStats(g);',
    'function refresh(g) {\n  g.stats = computeStats(g);\n  if (g.experimentArmorMultiplier != null) g.stats.armor *= g.experimentArmorMultiplier;');
  if (instrumentHealing) {
    source = source.replace('function strike(g, o, out, log) {',
      'function experimentHeal(g, amount) { const f = g.fight, before = f.hp; g.experimentHealingRequested = (g.experimentHealingRequested || 0) + Math.max(0, amount); f.hp = Math.min(g.stats.life, f.hp + amount); g.experimentHealingActual = (g.experimentHealingActual || 0) + Math.max(0, f.hp - before); }\nfunction strike(g, o, out, log) {');
    const heals = [
      ['if (parts.shadow) f.hp = Math.min(S.life, f.hp + parts.shadow * 0.05);', 'if (parts.shadow) experimentHeal(g, parts.shadow * 0.05);'],
      ['if (parts.holy) f.hp = Math.min(S.life, f.hp + parts.holy * 0.02);', 'if (parts.holy) experimentHeal(g, parts.holy * 0.02);'],
      ['if (o.onHit !== false && S.lifeOnHit) f.hp = Math.min(S.life, f.hp + S.lifeOnHit);', 'if (o.onHit !== false && S.lifeOnHit) experimentHeal(g, S.lifeOnHit);'],
      ['if (o.primary && S.aug.siphon) f.hp = Math.min(S.life, f.hp + dealt * 0.04);', 'if (o.primary && S.aug.siphon) experimentHeal(g, dealt * 0.04);'],
      ['if (o.lifesteal) f.hp = Math.min(S.life, f.hp + dealt * o.lifesteal);', 'if (o.lifesteal) experimentHeal(g, dealt * o.lifesteal);'],
      ['f.hp = Math.min(S.life, f.hp + S.life * 0.08);', 'experimentHeal(g, S.life * 0.08);'],
      ['f.hp = Math.min(S.life, f.hp + S.life * 0.05);', 'experimentHeal(g, S.life * 0.05);'],
      ['f.hp = Math.min(S.life, f.hp + S.life * 0.3);', 'experimentHeal(g, S.life * 0.3);'],
      ['f.hp = Math.min(S.life, f.hp + S.regen * PULSE);', 'experimentHeal(g, S.regen * PULSE);'],
      ['f.hp = Math.min(S.life, f.hp + b * 0.1);', 'experimentHeal(g, b * 0.1);']
    ];
    for (const [before, after] of heals) {
      if (!source.includes(before)) throw new Error(`Healing probe missed: ${before}`);
      source = source.replace(before, after);
    }
    source = source.replace('g.fight.hp += g.stats.life - oldLife;', 'experimentHeal(g, g.stats.life - oldLife);');
  }
  const loaded = new Module(`${file}.deepdive-${factor}-${recovery}-${instrumentHealing}`, module);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(path.dirname(file));
  loaded._compile(source, file);
  return loaded.exports;
}

function measureCliff(Sim, snapshot, multiplier, stage = 70, seed = 31, duration = HORIZON) {
  const g = clone(snapshot);
  g.target = { key: 'colossus', level: stage };
  g.autoPush = false;
  g.streak = 0;
  g.fight.mon = null; g.fight.deadUntil = 0; g.fight.respawnAt = g.t; g.fight.hp = g.stats.life;
  g.experimentArmorMultiplier = multiplier;
  g.experimentHealingRequested = 0; g.experimentHealingActual = 0;
  Sim.refresh(g);
  const maxLife = g.stats.life, initialArmor = g.stats.armor, regen = g.stats.regen;
  const end = g.t + duration, out = Sim.emptyOut();
  let hitCount = 0, landedHits = 0, deaths = 0, healingIntervals = [], actualHealingIntervals = [], activeSecs = 0, bucketHealing = 0, bucketActualHealing = 0, bucketActive = 0;
  const hitsToDie = [], hitDamage = [];
  while (g.t < end) {
    const beforeDamage = out.dmgTaken, beforeDeaths = out.deaths, beforeHeal = g.experimentHealingRequested, beforeActualHeal = g.experimentHealingActual;
    const active = !!g.fight.mon && g.fight.deadUntil <= g.t;
    Sim.advance(g, Math.min(end, g.t + 1), out);
    const dealtToPlayer = out.dmgTaken - beforeDamage;
    const healingRequest = g.experimentHealingRequested - beforeHeal;
    const effectiveHealing = g.experimentHealingActual - beforeActualHeal;
    bucketHealing += healingRequest;
    bucketActualHealing += effectiveHealing;
    if (active) { bucketActive++; activeSecs++; }
    if (dealtToPlayer > 0) { landedHits++; hitCount++; hitDamage.push(dealtToPlayer); }
    if (g.t % 3 === 0) {
      if (bucketActive >= 2) { healingIntervals.push(bucketHealing); actualHealingIntervals.push(bucketActualHealing); }
      bucketHealing = 0; bucketActualHealing = 0; bucketActive = 0;
    }
    if (out.deaths > beforeDeaths) { deaths += out.deaths - beforeDeaths; hitsToDie.push(hitCount); hitCount = 0; }
  }
  const sortedHits = [...hitsToDie].sort((a, b) => a - b);
  const sortedHeal = [...healingIntervals].sort((a, b) => a - b);
  const sortedActualHeal = [...actualHealingIntervals].sort((a, b) => a - b);
  return { seed, stage, factor: Sim.ARMOR_K_FACTOR, armorMultiplier: multiplier, hpScale: Sim.EXPERIMENT_HP_SCALE || 1,
    armorAtStart: Number(initialArmor.toFixed(2)), maxLifeAtStart: maxLife, regenPerSecond: Number(regen.toFixed(2)),
    healingPer3s: { activeIntervals: healingIntervals.length,
      meanRequested: healingIntervals.length ? Number((healingIntervals.reduce((a, b) => a + b, 0) / healingIntervals.length).toFixed(2)) : null,
      medianRequested: sortedHeal.length ? sortedHeal[Math.floor((sortedHeal.length - 1) / 2)] : null,
      meanReceived: actualHealingIntervals.length ? Number((actualHealingIntervals.reduce((a, b) => a + b, 0) / actualHealingIntervals.length).toFixed(2)) : null,
      medianReceived: sortedActualHeal.length ? sortedActualHeal[Math.floor((sortedActualHeal.length - 1) / 2)] : null,
      regenOnly: Number((regen * 3).toFixed(2)) },
    landedHits, meanDamageAfterMitigation: hitDamage.length ? Number((hitDamage.reduce((a, b) => a + b, 0) / hitDamage.length).toFixed(2)) : null,
    medianDamageAfterMitigation: hitDamage.length ? [...hitDamage].sort((a, b) => a - b)[Math.floor((hitDamage.length - 1) / 2)] : null,
    deaths, medianHitsToDie: sortedHits.length ? sortedHits[Math.floor((sortedHits.length - 1) / 2)] : null,
    meanHitsToDie: hitsToDie.length ? Number((hitsToDie.reduce((a, b) => a + b, 0) / hitsToDie.length).toFixed(2)) : null,
    noDeathLowerBound: deaths ? null : landedHits, activeFightMinutes: Number((activeSecs / 60).toFixed(2)) };
}

function allocatePoints(g, Sim) {
  const order = ['might', 'vitality', 'swiftness', 'precision'];
  while (g.hero.points > 0) Sim.doAction(g, { type: 'passive', k: order[g.hero.points % order.length] });
}

function throughputReplay(Sim, source, seed, stage, build) {
  const g = clone(source);
  g.target = { key: 'colossus', level: stage };
  g.unlocked.colossus = stage;
  g.kills[`colossus:${stage}`] = 0;
  g.autoPush = true;
  g.pushRetries = 0;
  g.streak = 0;
  g.deathsHere = 0;
  Sim.refresh(g);
  g.fight.mon = null; g.fight.deadUntil = 0; g.fight.respawnAt = g.t; g.fight.hp = g.stats.life;
  const start = g.t, end = start + HORIZON, startLife = g.life.deaths;
  let xp = 0, deaths = 0, stepBacks = 0, kills = 0, nextPassive = start + 300;
  const materialCounts = {}, killTimes = [];
  while (g.t < end) {
    const out = Sim.emptyOut(); out.killTimes = [];
    const beforeTarget = g.target.level, beforeDeaths = out.deaths;
    Sim.advance(g, Math.min(end, g.t + 1, nextPassive), out);
    xp += out.xp; deaths += out.deaths; kills += out.kills; killTimes.push(...out.killTimes);
    if (out.deaths > beforeDeaths && g.target.level < beforeTarget) stepBacks += 1;
    for (const [key, value] of Object.entries(out.mats)) materialCounts[key] = (materialCounts[key] || 0) + value;
    if (g.t >= nextPassive && g.t < end) { allocatePoints(g, Sim); nextPassive += 300; }
  }
  const elapsedHours = (g.t - start) / 3600;
  const killIntervals = killTimes.slice(1).map((t, i) => t - killTimes[i]).sort((a, b) => a - b);
  const totalMaterials = Object.values(materialCounts).reduce((a, b) => a + b, 0);
  return { seed, stage, build, factor: Sim.ARMOR_K_FACTOR, simHours: Number(elapsedHours.toFixed(2)),
    startingArmor: Number(source.stats.armor.toFixed(2)), itemLevels: Object.fromEntries(Object.entries(g.equip).map(([slot, it]) => [slot, it.ilvl])),
    xpPerHour: Number((xp / elapsedHours).toFixed(2)), materialsPerHour: Number((totalMaterials / elapsedHours).toFixed(2)),
    materialBreakdownPerHour: Object.fromEntries(Object.entries(materialCounts).map(([k, v]) => [k, Number((v / elapsedHours).toFixed(2))])),
    deaths: deaths, deathsPerHour: Number((deaths / elapsedHours).toFixed(2)), stageStepBacks: stepBacks,
    killsPerHour: Number((kills / elapsedHours).toFixed(2)), meanSecondsPerKill: killIntervals.length ? Number((killIntervals.reduce((a, b) => a + b, 0) / killIntervals.length).toFixed(2)) : null,
    medianSecondsPerKill: killIntervals.length ? killIntervals[Math.floor((killIntervals.length - 1) / 2)] : null,
    colossusUnlockStart: stage, colossusUnlockEnd: g.unlocked.colossus, stagesGained: g.unlocked.colossus - stage,
    currentTargetAtEnd: g.target.level, recordedDeaths: g.life.deaths - startLife };
}

function main() {
  const baseSim = loadExperimentSim(0.001, 12, false), trackedSim001 = loadExperimentSim(0.001, 12, true);
  const trackedSim004 = loadExperimentSim(0.004, 12, true), trackedSim008 = loadExperimentSim(0.008, 12, true);
  const baseRuns = Object.fromEntries(SEEDS.map(seed => [seed, runBot(baseSim, seed, 'optimizer')]));
  const cliff = [];
  const stage70Seed31 = baseRuns[31].snapshots[70];
  for (const [Sim, multipliers] of [[trackedSim001, [0.5, 1, 1.5]], [trackedSim004, [0.5, 0.75, 1, 1.25, 1.5]], [trackedSim008, [0.5, 0.75, 1, 1.25, 1.5]]]) {
    for (const multiplier of multipliers) cliff.push(measureCliff(Sim, stage70Seed31, multiplier));
  }

  const throughput = [];
  for (const seed of SEEDS) for (const stage of [62, 70]) {
    const snap = baseRuns[seed].snapshots[stage];
    if (!snap) { throughput.push({ seed, stage, unavailable: true }); continue; }
    for (const factor of [0.001, 0.004]) {
      const Sim = factor === 0.001 ? loadExperimentSim(factor, 30, false) : loadExperimentSim(factor, 30, false);
      const builds = {
        current: clone(snap),
        tank: makeBuild(Sim, snap, stage, 'tank'),
        burst: makeBuild(Sim, snap, stage, 'burst')
      };
      for (const [name, build] of Object.entries(builds)) throughput.push(throughputReplay(Sim, build, seed, stage, name));
    }
  }

  const lines = [
    'Paladin defense deep dive: healing threshold, armor cliff, throughput with death penalty',
    'Report-only replays; no production simulation rules or armor-affix values changed.',
    'Cliff basis: Paladin seed 31 optimizer snapshot at Colossus 70 using the same gear for all factors and armor multipliers. Armor multipliers are reapplied after every stat refresh. Damage and healing are sampled in the full 12-hour combat replay; requested healing is reported before the max-life cap and received healing after the cap, per active 3-second window.',
    'Throughput basis: both seeds use the same seed-specific ordinary 0.001 snapshot at stage 62/70 for every build and factor. Tank/burst replace three affixes in-place; item levels are unchanged. Twelve-hour full replays. On each death, the sim retreats one target stage (pushRetries=0) and uses a test-only 30-second recovery. Passive points are allocated every five minutes; equipment remains fixed.',
    '', 'COLOSSUS 70 SEED 31: FACTOR 0.001 CLIFF:', ...cliff.filter(r => r.factor === 0.001).map(JSON.stringify),
    '', 'COLOSSUS 70 SEED 31: FACTORS 0.004 AND 0.008:', ...cliff.filter(r => r.factor !== 0.001).map(JSON.stringify),
    '', 'THROUGHPUT REPLAYS:', ...throughput.map(JSON.stringify),
    '', 'PLAN ONLY:',
    'The stage-70 seed-31 baseline has average raw Colossus damage about 778,088, armor 16,557, and max life 32,205. A first next test is factor about 0.00045: the armor formula predicts average hits of about 31,552 at 0.5x armor, 16,103 at 1x, and 10,810 at 1.5x (about 98%, 50%, and 34% of max life). That should create room for roughly 1/2/3-hit survival steps instead of one-shot to permanent survival. This is formula math only; it does not include roll variance, skill healing, enemy downtime, or full replays. No new stat or mechanic is proposed.',
    '', 'Note: no-death hits-to-die is censored at the observed landed-hit count. Throughput deaths/hour includes stage-back deaths; XP/material/kills use the full 12-hour sim time.'
  ];
  const report = lines.join('\n') + '\n';
  const output = path.resolve(__dirname, '../../docs/results/paladin-defense-deepdive.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, report);
  process.stdout.write(report);
}

if (require.main === module) main();
module.exports = { loadExperimentSim, measureCliff, throughputReplay };
