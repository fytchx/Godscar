'use strict';

// Report-only weak-armor, risk-policy, and armor-threshold replays.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const S = require('../src/sim.js');
const { fixture, target: optimizerTarget, checkin } = require('./defense-experiment.js');

const SEEDS = [31, 2026];
const HORIZON = 12 * 3600;
const CHECKPOINTS = [30, 60, 90, 120, 180, 240, 360, 480, 600, 720];
const OFFSETS = [0, 2, 5, 10, 20, 40, 80, 160, 320, 640];

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function simWithFactor(factor) {
  const file = path.resolve(__dirname, '../src/sim.js');
  const source = fs.readFileSync(file, 'utf8').replace(
    `const ARMOR_K_FACTOR = ${S.ARMOR_K_FACTOR};`, `const ARMOR_K_FACTOR = ${factor};`);
  const loaded = new Module(`${file}.k${factor}`, module);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(path.dirname(file));
  loaded._compile(source, file);
  return loaded.exports;
}
function simWithArmorMultiplier() {
  const file = path.resolve(__dirname, '../src/sim.js');
  const source = fs.readFileSync(file, 'utf8').replace(
    'function refresh(g) {\n  g.stats = computeStats(g);',
    'function refresh(g) {\n  g.stats = computeStats(g);\n  if (g.experimentArmorMultiplier != null) g.stats.armor *= g.experimentArmorMultiplier;');
  const loaded = new Module(`${file}.armor-cliff`, module);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(path.dirname(file));
  loaded._compile(source, file);
  return loaded.exports;
}

function stageNow(g, Sim) {
  const active = Object.keys(g.unlocked).filter(key => g.zones[Sim.MONSTERS[key].zone]);
  return Math.max(...active.map(key => g.unlocked[key]));
}

function riskTarget(g, Sim) {
  const candidates = new Map();
  for (const key of Sim.MONSTER_KEYS) {
    const M = Sim.MONSTERS[key];
    if (!g.zones[M.zone]) continue;
    for (const backoff of OFFSETS) {
      const level = Math.max(Sim.ZONES[M.zone].minLevel, g.unlocked[key] - backoff);
      candidates.set(`${key}@${level}`, { key, level });
    }
  }
  const projections = [...candidates.values()].map(t => {
    const p = Sim.project(g, { target: t, secs: 1200 });
    return { ...t, deaths: p.deaths, dph: p.deaths * 3, xpm: p.xpm * (Sim.MONSTERS[t.key].zone === 'hollow' ? 1.15 : 1) };
  });
  const eligible = projections.filter(p => p.dph <= 3);
  const pool = eligible.length ? eligible : projections;
  const chosen = pool.sort((a, b) => eligible.length ? b.xpm - a.xpm : a.dph - b.dph || b.xpm - a.xpm)[0];
  return { key: chosen.key, level: chosen.level, projectedDeathsPerHour: chosen.dph, riskCapMet: eligible.length > 0 };
}

function runBot(Sim, seed, policy = 'optimizer', horizon = HORIZON) {
  const g = fixture(Sim, seed), timeByTarget = new Map(), deathsByTarget = new Map(), history = [], snapshots = {};
  const riskSelections = { picks: 0, overCap: 0 };
  if (policy === 'risk-aware') g.autoPush = false;
  let bossDeaths = 0, now = g.t, nextCheck = 300;
  function recordProgress() {
    const stage = stageNow(g, Sim);
    if (!history.length || history[history.length - 1].stage !== stage) history.push({ t: g.t, stage });
    for (const n of [62, 70, 80]) if ((g.unlocked.colossus || 0) >= n && snapshots[n] == null) snapshots[n] = clone(g);
  }
  function advanceTo(end) {
    const key = `${g.target.key}@${g.target.level}`, start = g.t, out = Sim.emptyOut();
    timeByTarget.set(key, (timeByTarget.get(key) || 0) + Math.max(0, end - start));
    Sim.advance(g, end, out, (_text, kind) => {
      if (kind === 'death') deathsByTarget.set(key, (deathsByTarget.get(key) || 0) + 1);
    });
    now = g.t;
    recordProgress();
  }
  recordProgress();
  while (now < horizon) {
    advanceTo(Math.min(horizon, now + 60, nextCheck));
    if (now < nextCheck || now >= horizon) continue;
    checkin(g, Sim);
    if (policy === 'risk-aware') {
      const selected = riskTarget(g, Sim);
      riskSelections.picks++;
      if (!selected.riskCapMet) riskSelections.overCap++;
      Sim.doAction(g, { type: 'target', key: selected.key, level: selected.level });
    } else {
      const selected = optimizerTarget(g, Sim);
      if (selected) Sim.doAction(g, { type: 'target', key: selected.key, level: selected.level });
    }
    if (g.sigils > 0) {
      const key = g.zones.hollow ? 'woundwarden' : 'bellkeeper';
      if (g.zones[Sim.BOSSES[key].zone] && g.bossUnlocked[key]) {
        const err = Sim.doAction(g, { type: 'boss', key, level: g.bossUnlocked[key] });
        if (!err) {
          const res = g.lastBoss.res, duration = Math.max(1, res.time || 1);
          if (res.died) bossDeaths++;
          advanceTo(Math.min(horizon, now + duration));
        }
      }
    }
    nextCheck += 300;
  }
  const dominant = [...timeByTarget].sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  const farmDeaths = deathsByTarget.get(dominant[0]) || 0;
  const totalDeaths = [...deathsByTarget.values()].reduce((a, b) => a + b, 0) + bossDeaths;
  const stageAt = sec => [...history].reverse().find(x => x.t <= sec)?.stage ?? history[0]?.stage ?? 1;
  const checkpoints = Object.fromEntries(CHECKPOINTS.map(min => [min, stageAt(min * 60)]));
  const plateaus = [];
  for (let i = 0; i < history.length; i++) {
    const from = history[i], next = history[i + 1];
    const end = next ? next.t : horizon;
    if (end - from.t >= 1200) plateaus.push({ startMin: Number((from.t / 60).toFixed(1)), endMin: next ? Number((end / 60).toFixed(1)) : null,
      stage: from.stage, nextStage: next ? next.stage : null, durationMin: Number(((end - from.t) / 60).toFixed(1)), censored: !next });
  }
  const hoursAtStages = {};
  for (const n of [30, 60, 90]) {
    const reached = history.find(row => row.stage >= n);
    hoursAtStages[n] = reached ? Number((reached.t / 3600).toFixed(3)) : null;
  }
  return { seed, policy, horizonMinutes: horizon / 60, checkpoints, hoursAtStages, finalStage: stageNow(g, Sim), plateaus,
    chosenFarmStage: dominant[0], chosenFarmMinutes: Number((dominant[1] / 60).toFixed(2)),
    chosenFarmDeathsPerHour: Number((farmDeaths / (dominant[1] / 3600 || 1)).toFixed(2)),
    totalDeathsPerHour: Number((totalDeaths / (horizon / 3600)).toFixed(2)), riskSelections, snapshots };
}

function fixedArmorReplay(Sim, source, seed, stage, multiplier, duration = HORIZON) {
  const g = clone(source); g.target = { key: 'colossus', level: stage }; g.autoPush = false; g.streak = 0;
  const baseArmor = Sim.computeStats(g).armor;
  g.experimentArmorMultiplier = multiplier;
  Sim.refresh(g);
  const end = g.t + duration, out = Sim.emptyOut();
  let hitCount = 0, landed = 0, deaths = 0; const hitsToDie = [];
  while (g.t < end) {
    const beforeDamage = out.dmgTaken, beforeDeaths = out.deaths;
    Sim.advance(g, Math.min(end, g.t + 1), out);
    if (out.dmgTaken > beforeDamage) { landed++; hitCount++; }
    if (out.deaths > beforeDeaths) { deaths += out.deaths - beforeDeaths; hitsToDie.push(hitCount); hitCount = 0; }
  }
  const sorted = [...hitsToDie].sort((a, b) => a - b);
  return { seed, stage, multiplier, baseArmor: Number(baseArmor.toFixed(2)), armor: Number(g.stats.armor.toFixed(2)),
    simHours: duration / 3600, landedHits: landed, deaths, medianHitsToDie: sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null,
    meanHitsToDie: hitsToDie.length ? Number((hitsToDie.reduce((a, b) => a + b, 0) / hitsToDie.length).toFixed(2)) : null,
    hitDistribution: hitsToDie.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {}) };
}

function main() {
  const factors = [0.001, 0.002, 0.004, 0.008], sweep = [];
  for (const factor of factors) for (const seed of SEEDS) {
    const sim = factor === S.ARMOR_K_FACTOR ? S : simWithFactor(factor);
    sweep.push({ factor, ...runBot(sim, seed, 'optimizer') });
  }
  const safe = SEEDS.map(seed => runBot(S, seed, 'risk-aware'));
  const cliffs = [], armorSim = simWithArmorMultiplier();
  for (const seed of SEEDS) {
    const normal = sweep.find(r => r.factor === S.ARMOR_K_FACTOR && r.seed === seed);
    for (const stage of [62, 70]) {
      const snap = normal.snapshots[stage];
      if (!snap) { cliffs.push({ seed, stage, unavailable: true }); continue; }
      for (const multiplier of [0.5, 1, 1.5, 2]) cliffs.push(fixedArmorReplay(armorSim, snap, seed, stage, multiplier));
    }
  }
  const content = { monsterTemplates: S.MONSTER_KEYS.length, bossTemplates: S.BOSS_KEYS.length,
    stageScaling: 'monG(level) = 1.155^(level - 1)', noStageCap: true };
  const lines = [
    'Paladin defense follow-up: weak armor, risk-aware policy, and Colossus armor cliff replay',
    `SIM_VERSION ${S.SIM_VERSION}; tested armor factors ${factors.join(', ')}; base factor remains ${S.ARMOR_K_FACTOR}. No armor-affix scaling changes.`,
    'Progression runs use the same Rare fixture, optimizer upgrades/equips, 5-minute check-ins, and seeds 31/2026 for 12 sim hours. Stage checkpoints show highest stage unlocked in currently open zones. Hours-to-stage is elapsed sim hours.',
    'Plateaus are intervals with no increase in highest unlocked stage for at least 20 sim minutes. A final interval without later progress is censored at 12 hours.',
    'Risk-aware policy disables automatic frontier pushing; every 5 minutes it projects candidate farm stages over 20 minutes, keeps candidates with at most one projected death (<=3/hour), and chooses the best projected XP/min. If none qualify, it selects the lowest projected death rate and records that cap miss. Reported DPH is observed over the full replay.',
    'Cliff tests use each seed’s ordinary 0.001 optimizer snapshot at Colossus 62/70, hold all gear and other stats fixed, multiply only the cached armor stat by the listed ratio, and replay for 12 sim hours with auto-push off. No-death results are lower bounds, not exact hits-to-die.',
    '', 'WEAKER-ARMOR OPTIMIZER REPLAYS:', ...sweep.map(({ snapshots, ...r }) => JSON.stringify({ ...r, firstPlateau: r.plateaus[0] || null })),
    '', 'RISK-AWARE OPTIMIZER REPLAYS:', ...safe.map(({ snapshots, ...r }) => JSON.stringify({ ...r, firstPlateau: r.plateaus[0] || null })),
    '', 'COLOSSUS ARMOR CLIFF REPLAYS:', ...cliffs.map(JSON.stringify),
    '', 'CONTENT LIMIT:', JSON.stringify(content),
    'The sim has no highest stage: unlocked stage numbers increase without a cap and monster HP/damage use exponential stage scaling. Therefore modeled time to exhaust stages is unbounded / undefined. The roster itself is finite (8 monster templates and 2 bosses), so later stages reuse existing enemies; I did not verify a separate design plan for intended endgame content.'
  ];
  const report = lines.join('\n') + '\n';
  const output = path.resolve(__dirname, '../../docs/results/paladin-defense-followup.txt');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, report);
  process.stdout.write(report);
}

if (require.main === module) main();
module.exports = { runBot, riskTarget, fixedArmorReplay };
