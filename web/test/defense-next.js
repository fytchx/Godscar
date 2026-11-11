'use strict';

// Report-only replay sweep for armor factor and monster fight length.
const fs = require('node:fs');
const path = require('node:path');
const S = require('../src/sim.js');
const { runBot } = require('./defense-followup.js');
const { loadExperimentSim, measureCliff, throughputReplay } = require('./defense-deepdive.js');

const SEEDS = [31, 2026];
const ARMOR_MULTIPLIERS = [0.5, 0.75, 1, 1.25, 1.5];
const STAGES = [62, 70];
const REPLAY = 12 * 3600;

function line(name, rows) {
  return [`\n${name}:`, ...rows.map(row => JSON.stringify(row))];
}

function main() {
  const baseline = Object.fromEntries(SEEDS.map(seed => [seed, runBot(S, seed, 'optimizer')]));
  const armor045 = loadExperimentSim(0.00045, 12, false);
  const ratioCliff = [];
  for (const seed of SEEDS) for (const stage of STAGES) {
    const snapshot = baseline[seed].snapshots[stage];
    if (!snapshot) { ratioCliff.push({ seed, stage, unavailable: true }); continue; }
    for (const multiplier of ARMOR_MULTIPLIERS) {
      ratioCliff.push(measureCliff(armor045, snapshot, multiplier, stage, seed, REPLAY));
    }
  }

  const lengthCliff = [], throughput = [], pace = [];
  for (const seed of SEEDS) {
    const replay = runBot(S, seed, 'optimizer', 2 * 3600);
    pace.push({ hpScale: 1, seed, checkpointsMinutes: [30, 60, 90, 120],
      stages: [30, 60, 90, 120].map(min => replay.checkpoints[min]), finalStage: replay.finalStage,
      totalDeathsPerHour: replay.totalDeathsPerHour });
  }
  for (const hpScale of [3, 6]) {
    const combatSim = loadExperimentSim(0.001, 12, false, hpScale);
    const penaltySim = loadExperimentSim(0.001, 30, false, hpScale);
    for (const seed of SEEDS) for (const stage of STAGES) {
      const snapshot = baseline[seed].snapshots[stage];
      if (!snapshot) {
        lengthCliff.push({ hpScale, seed, stage, unavailable: true });
        continue;
      }
      for (const multiplier of ARMOR_MULTIPLIERS) {
        lengthCliff.push({ ...measureCliff(combatSim, snapshot, multiplier, stage, seed, REPLAY), hpScale });
      }
      const builds = {
        current: JSON.parse(JSON.stringify(snapshot)),
        tank: require('./defense-experiment.js').makeBuild(penaltySim, snapshot, stage, 'tank'),
        burst: require('./defense-experiment.js').makeBuild(penaltySim, snapshot, stage, 'burst')
      };
      for (const [buildName, build] of Object.entries(builds)) {
        throughput.push({ hpScale, ...throughputReplay(penaltySim, build, seed, stage, buildName) });
      }
    }
    // Two-hour progression replay with the ordinary optimizer and check-ins.
    for (const seed of SEEDS) {
      const replay = runBot(combatSim, seed, 'optimizer', 2 * 3600);
      pace.push({ hpScale, seed, checkpointsMinutes: [30, 60, 90, 120],
        stages: [30, 60, 90, 120].map(min => replay.checkpoints[min]), finalStage: replay.finalStage,
        totalDeathsPerHour: replay.totalDeathsPerHour });
    }
  }

  const report = [
    'Godscar defense experiment: k=0.00045 and longer Colossus fights',
    'Test-only harness; no production simulation changes and no armor-affix scaling changes.',
    `SIM_VERSION ${S.SIM_VERSION}. Realistic Rare Paladin fixture, seeds ${SEEDS.join(' and ')}. Every combat row is a full ${REPLAY / 3600}-hour replay at a fixed Colossus target with auto-push off, except throughput rows which use the normal one-stage retreat and test-only 30-second recovery.`,
    'Armor sweeps start from each seed’s ordinary k=0.001 optimizer snapshot at the listed stage. Only armor is multiplied; median/mean hits-to-die are based on observed deaths. If no death occurs, the replay hit count is a lower bound.',
    'Fight-length experiment multiplies monster HP only (not monster damage) by 3 or 6. At throughput, tank/burst replace three affixes in place and keep equal item levels; current uses the unmodified snapshot. Passive points are allocated every five minutes. XP/material/death rates use all replay time; kill seconds use intervals between kills; stages gained means Colossus unlock increase.',
    ...line('K FACTOR 0.00045: ARMOR MULTIPLIER CLIFF SWEEP', ratioCliff),
    ...line('MONSTER HP 3X AND 6X: ARMOR MULTIPLIER CLIFF SWEEPS', lengthCliff),
    ...line('MONSTER HP 3X AND 6X: TANK / BURST / CURRENT THROUGHPUT', throughput),
    ...line('OPTIMIZER PACE DURING FIRST TWO HOURS (STAGES AT 30/60/90/120 MIN)', pace),
    '',
    '',
    'Observed: longer fights move some thresholds into intermediate survival (including 3-hit and a few very delayed deaths), but the cliff does not become a smooth curve: most stage/seed combinations still jump from repeated 1-hit deaths to no deaths over one armor step. Tank builds usually reduce deaths/hour versus burst, while burst usually kills faster and earns more XP/materials; this is not a uniform stage-gain advantage for either build.',
    'Pace: the ordinary HP run reaches stages 22/33/46/56 at 30/60/90/120 minutes in both seeds. At 3x HP it reaches 18–19/21–23/24–26/30–32; at 6x, 12–13/16/18–19/21–22. Thus 3x already slows the first two hours substantially, and 6x slows it much more.',
    'Recommendation: keep monster HP at 1x and carry k=0.00045 as the next defense candidate; the 3x/6x HP settings cost too much early pace and do not reliably remove the cliff. The k=0.00045 fixed-stage replay does show armor-sensitive survival, but its progression pace was not replayed, and the combined k=0.00045/HP=1 progression setting is therefore not yet verified.',
    'Unverified: only seeds 31 and 2026, one Rare Paladin fixture per seed, and Colossus stages 62/70. No other classes, gear fixtures, stage ranges, player-controlled combat, or k=0.00045 progression runs were tested. The HP multipliers are experimental global constants, not proposed shipped values.'
  ].join('\n') + '\n';
  const out = path.resolve(__dirname, '../../docs/results/paladin-defense-next.txt');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, report);
  process.stdout.write(report);
}

if (require.main === module) main();
