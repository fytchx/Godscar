'use strict';

// Test-only calibration of stage-based armor K and monster critical pressure.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const S = require('../src/sim.js');
const { runBot } = require('./defense-followup.js');

const SEEDS = [31, 2026], STAGES = [62, 70, 80];
const ARMORS = [0.75, 1, 1.5], HOURS = 12, HORIZON = HOURS * 3600;
const clone = value => JSON.parse(JSON.stringify(value));

function loadVariant(k, { chance = 0, multiplier = 2, reduction = 0, useUnsplitK = true } = {}) {
  const file = path.resolve(__dirname, '../src/sim.js');
  let source = fs.readFileSync(file, 'utf8');
  const replace = (before, after, name) => {
    if (!source.includes(before)) throw new Error(`Missing test hook: ${name}`);
    source = source.replace(before, after);
  };
  replace(`const ARMOR_K_FACTOR = ${S.ARMOR_K_FACTOR};`, `const ARMOR_K_FACTOR = ${k};`, 'armor coefficient');
  replace('const RESPAWN = 0.6, RECOVERY',
    `const EXPERIMENT_CRIT_CHANCE = ${chance}, EXPERIMENT_CRIT_MULTIPLIER = ${multiplier}, EXPERIMENT_CRIT_REDUCTION = ${reduction / 100};\nconst RESPAWN = 0.6, RECOVERY`, 'crit constants');
  replace('hp: M.hp * gr * tf, max: M.hp * gr * tf, dmg: M.dmg * gr * tf, armor: M.armor * gr * tf, interval: M.interval,',
    'hp: M.hp * gr * tf, max: M.hp * gr * tf, dmg: M.dmg * gr * tf, averageUnsplitHit: M.dmg * gr * tf, armor: M.armor * gr * tf, interval: M.interval,', 'stage average hit');
  replace('function refresh(g) {\n  g.stats = computeStats(g);',
    'function refresh(g) {\n  g.stats = computeStats(g);\n  if (g.experimentArmorMultiplier != null) g.stats.armor *= g.experimentArmorMultiplier;', 'armor multiplier');
  const kHit = useUnsplitK ? 'm.averageUnsplitHit' : 'm.dmg';
  replace('afterPlayerArmor(d, S.armor * (ward ? 1.5 : 1), m.dmg)',
    `afterPlayerArmor(d, S.armor * (ward ? 1.5 : 1), ${kHit})`, 'K hit reference');
  replace('if (S.dodge && rand(r) * 100 < S.dodge) return;\n  const ward = f.buffs.frostward > g.t;\n  let d = m.dmg * rr(r, 0.85, 1.15);',
    'if (S.dodge && rand(r) * 100 < S.dodge) return;\n  if (g.experimentTrack) g.experimentLandedHits++;\n  const ward = f.buffs.frostward > g.t;\n  const experimentWasFull = f.hp >= S.life - 1e-9;\n  let d = m.dmg * rr(r, 0.85, 1.15);\n  const experimentEffectiveCritChance = EXPERIMENT_CRIT_CHANCE * (1 - EXPERIMENT_CRIT_REDUCTION);\n  const experimentCrit = experimentEffectiveCritChance > 0 && rand(r) * 100 < experimentEffectiveCritChance;\n  if (experimentCrit) d *= EXPERIMENT_CRIT_MULTIPLIER;', 'critical attack');
  replace('f.hp -= d; out.dmgTaken += d;\n  if (S.reflect > 0) {',
    'f.hp -= d; out.dmgTaken += d;\n  if (f.hp <= 0) { g.experimentDeathWasFull = experimentWasFull; g.experimentDeathWasCrit = experimentCrit; }\n  if (S.reflect > 0) {', 'lethal hit metadata');
  replace('function die(g, out, log) {\n  const f = g.fight;',
    'function die(g, out, log) {\n  const f = g.fight;\n  if (g.experimentTrack) {\n    if (g.experimentDeathWasFull) g.experimentDeathsAtFull++; else g.experimentDeathsWhileHurt++;\n    if (g.experimentDeathWasCrit) g.experimentCritDeaths++;\n    g.experimentHitsToDie.push(g.experimentLandedHits - g.experimentHitsAtLastDeath);\n    g.experimentHitsAtLastDeath = g.experimentLandedHits;\n  }\n  g.experimentDeathWasFull = false; g.experimentDeathWasCrit = false;', 'death instrumentation');
  const loaded = new Module(`${file}.crit-cal-${k}-${chance}-${multiplier}-${reduction}-${useUnsplitK}`, module);
  loaded.filename = file; loaded.paths = Module._nodeModulePaths(path.dirname(file)); loaded._compile(source, file);
  return loaded.exports;
}

function replay(Sim, snapshot, seed, stage, armorMultiplier) {
  const g = clone(snapshot);
  g.target = { key: 'colossus', level: stage }; g.autoPush = false; g.streak = 0;
  g.experimentArmorMultiplier = armorMultiplier; Sim.refresh(g);
  g.fight.mon = null; g.fight.deadUntil = 0; g.fight.respawnAt = g.t; g.fight.hp = g.stats.life;
  g.experimentTrack = true; g.experimentLandedHits = 0; g.experimentHitsAtLastDeath = 0;
  g.experimentDeathsAtFull = 0; g.experimentDeathsWhileHurt = 0; g.experimentCritDeaths = 0; g.experimentHitsToDie = [];
  const out = Sim.emptyOut(); Sim.advance(g, g.t + HORIZON, out);
  return { seed, stage, armorMultiplier, deaths: out.deaths, deathsPerHour: Number((out.deaths / HOURS).toFixed(2)),
    fullLifeDeaths: g.experimentDeathsAtFull, hurtDeaths: g.experimentDeathsWhileHurt, critDeaths: g.experimentCritDeaths,
    landedHits: g.experimentLandedHits, hitsToDie: g.experimentHitsToDie.length ? g.experimentHitsToDie : null };
}

function sameDeathResults(a, b) {
  return ['deaths', 'fullLifeDeaths', 'hurtDeaths', 'critDeaths', 'landedHits'].every(key => a[key] === b[key]) &&
    JSON.stringify(a.hitsToDie) === JSON.stringify(b.hitsToDie);
}

function main() {
  const baseline = Object.fromEntries(SEEDS.map(seed => [seed, runBot(S, seed, 'optimizer').snapshots]));
  const candidateK = 0.00045, calibration = [];
  for (const multiplier of [3, 4]) for (const reductionCap of [25, 35]) {
    const Sim = loadVariant(candidateK, { chance: 8, multiplier, reduction: reductionCap, useUnsplitK: true });
    for (const stage of STAGES) for (const seed of SEEDS) {
      for (const [tier, armorMultiplier, reduction] of [
        ['underprepared', 0.75, 0], ['prepared', 1, 0], ['well-prepared', 1.5, reductionCap]
      ]) {
        calibration.push({ critChancePct: 8, critMultiplier: multiplier, critReductionCapPct: reductionCap,
          tier, critReductionPct: reduction, ...replay(Sim, baseline[seed][stage], seed, stage, armorMultiplier) });
      }
    }
  }

  const summary = [];
  for (const multiplier of [3, 4]) for (const reductionCap of [25, 35]) {
    const rows = calibration.filter(row => row.critMultiplier === multiplier && row.critReductionCapPct === reductionCap);
    const tierSummary = {};
    for (const tier of ['underprepared', 'prepared', 'well-prepared']) {
      const vals = rows.filter(row => row.tier === tier).map(row => row.deathsPerHour);
      tierSummary[tier] = { mean: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
        min: Math.min(...vals), max: Math.max(...vals), perRun: vals };
    }
    summary.push({ critChancePct: 8, critMultiplier: multiplier, critReductionCapPct: reductionCap,
      tiers: tierSummary, targetDistance: Number((Math.abs(tierSummary.prepared.mean - 4.5) + Math.abs(tierSummary['well-prepared'].mean - 1)).toFixed(2)),
      preparedInRange: tierSummary.prepared.mean >= 3 && tierSummary.prepared.mean <= 6,
      wellAboutOne: tierSummary['well-prepared'].mean >= 0.5 && tierSummary['well-prepared'].mean <= 1.5 });
  }
  summary.sort((a, b) => a.targetDistance - b.targetDistance);

  const lines = [
    'Godscar defense report: final crit multiplier and reduction-cap calibration',
    `SIM_VERSION ${S.SIM_VERSION}; working candidate k=${candidateK}, monster HP=1x. Twelve sim-hour fixed-stage replays; Rare Paladin optimizer snapshots; seeds ${SEEDS.join(' and ')}. No production simulation changes.`,
    'K uses the monster’s average unsplit hit at its stage. Crit chance is fixed at 8%; crit damage is 3x or 4x. In this test, the well-prepared tier reaches the listed reduction cap; underprepared and prepared have no crit reduction.',
    'Tiers: underprepared 0.75x armor/0% reduction; prepared 1x/0%; well-prepared 1.5x armor/reduction at the cap. Each death rate is observed deaths over a full 12 sim hours. Summary averages cover both seeds and stages 62/70/80; raw rows show each run.',
    '', 'SETTING SUMMARY:', ...summary.map(JSON.stringify),
    '', 'FULL REPLAY RESULTS:', ...calibration.map(JSON.stringify),
    '', 'Unverified: two seeds, Rare Paladin snapshots, and Colossus stages 62/70/80 only. No other classes, gear fixtures, stages, or player-controlled builds tested.'
  ];
  const report = lines.join('\n') + '\n';
  const output = path.resolve(__dirname, '../../docs/results/paladin-defense-crit-final.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, report);
  process.stdout.write(`Wrote ${output}; calibration=${calibration.length}, settings=${summary.length}.\n`);
}

if (require.main === module) main();
module.exports = { loadVariant, replay };
