'use strict';

// Fresh level-1 Paladin progression measurement, not a gameplay change.
// Usage: node web/test/paladin-progression.js [horizonMinutes=360]
// The reported source commit is the checked-out GitHub Actions SHA, never inferred.
const Sim = require('../src/sim.js');
const SEEDS = [31, 2026];
const POLICIES = ['optimizer', 'lazy'];
const MINUTE = 60;
const TARGETS = [10, 20, 30];
const HORIZON_MINUTES = Number(process.argv[2] || 360);
if (!Number.isInteger(HORIZON_MINUTES) || HORIZON_MINUTES < 30 || HORIZON_MINUTES > 720) {
  throw Error('Expected horizon in whole minutes (30–720).');
}
const meta = {
  repository: process.env.GITHUB_REPOSITORY || 'fytchx/Godscar (local checkout)',
  branch: process.env.GITHUB_REF_NAME || 'local checkout',
  commit: process.env.GITHUB_SHA || 'unknown-local-checkout',
  script: 'node web/test/paladin-progression.js ' + HORIZON_MINUTES,
  simulationVersion: Sim.SIM_VERSION,
  horizonMinutes: HORIZON_MINUTES,
  seeds: SEEDS,
  policies: POLICIES,
  fixture: 'newGame(paladin, 0, seed), level 1, Common Rusted Mace, no added armor or resources'
};
console.log('BOT_RUN_METADATA ' + JSON.stringify(meta));

const passives = ['might', 'vitality', 'swiftness', 'precision'];
const timeKey = stage => stage < 10 ? '1-9' : stage < 20 ? '10-19' : stage < 30 ? '20-29' : '30+';
// The slice intentionally hunts Fallfields only, even after the engine opens Hollow.
const openStage = g => Math.max(...Sim.MONSTER_KEYS
  .filter(key => Sim.MONSTERS[key].zone === 'fallfields')
  .map(key => g.unlocked[key]));
function chooseTarget(g) {
  let best = null;
  for (const key of Sim.MONSTER_KEYS) {
    const monster = Sim.MONSTERS[key];
    if (monster.zone !== 'fallfields') continue;
    const ceiling = g.unlocked[key];
    for (const level of [...new Set([ceiling, Math.max(Sim.ZONES[monster.zone].minLevel, ceiling - 2)])]) {
      const p = Sim.project(g, { target: { key, level }, secs: 120 });
      const score = p.xpm * (p.deaths ? 0.4 : 1) * (monster.zone === 'hollow' ? 1.15 : 1);
      if (!best || score > best.score) best = { key, level, score };
    }
  }
  return best;
}
function chooseEquip(g, oneOnly) {
  let equipped = 0;
  // A fresh decision is made against current gear after each successful equip.
  for (const item of [...g.bag]) {
    if (!g.bag.some(x => x.id === item.id)) continue;
    const slot = Sim.verdictSlot(g, item);
    const baseline = Sim.project(g, { secs: 120 });
    const proposed = Sim.project(g, { secs: 120, equip: { [slot]: item } });
    if (proposed.xpm <= baseline.xpm * 1.02 || proposed.deaths > baseline.deaths) continue;
    if (Sim.doAction(g, { type: 'equip', id: item.id, to: slot }) === null) {
      equipped++;
      if (oneOnly) return equipped;
    }
  }
  return equipped;
}
function checkin(g, policy) {
  while (g.hero.points > 0) Sim.doAction(g, { type: 'passive', k: passives[g.hero.points % passives.length] });
  if (g.hero.level >= Sim.SPEC_LEVEL && g.hero.spec == null) Sim.doAction(g, { type: 'spec', i: 0 });
  chooseEquip(g, policy === 'lazy');

  if (policy === 'optimizer') {
    // The optimizer salvages and buys available item upgrades; the lazy bot never does.
    while (g.bag.length > 24) {
      const item = g.bag.find(x => !x.locked && Sim.RANK[x.rarity] < Sim.RANK.legendary);
      if (!item || Sim.doAction(g, { type: 'salvage', id: item.id })) break;
    }
    for (let i = 0; i < 50; i++) {
      const item = Object.values(g.equip)
        .filter(x => x && x.rarity !== 'ascended' && x.plus < 10)
        .sort((a,b) => Sim.upgradeCost(a) - Sim.upgradeCost(b))[0];
      if (!item || Sim.doAction(g, { type: 'upgrade', id: item.id })) break;
    }
  } else {
    // Lazy fires this counter recipe only when its actual material/gold costs are in hand.
    const holdsFireRing = [...Object.values(g.equip), ...g.bag]
      .some(x => x?.affixes?.some(([k]) => k === 'res_fire'));
    const canAfford = (g.mats.fire || 0) >= 4 && (g.mats.shards || 0) >= 10;
    if (!holdsFireRing && canAfford) {
      const error = Sim.doAction(g, { type: 'craft', rarity: 'rare', slot: 'ring',
        ilvl: Math.max(1, Math.min(g.hero.level, openStage(g))), counter: 'res_fire' });
      if (error === null) {
        const ring = g.bag.at(-1);
        if (ring?.affixes.some(([key]) => key === 'res_fire'))
          Sim.doAction(g, { type: 'equip', id: ring.id, to: Sim.verdictSlot(g, ring) });
      }
    }
  }

  const next = chooseTarget(g);
  if (next) Sim.doAction(g, { type: 'target', key: next.key, level: next.level });
}
function run(seed, policy) {
  const g = Sim.newGame('paladin', 0, seed);
  const horizon = HORIZON_MINUTES * MINUTE;
  const interval = policy === 'optimizer' ? 5 * MINUTE : 30 * MINUTE;
  const reached = {};
  const timeInBand = { '1-9': 0, '10-19': 0, '20-29': 0, '30+': 0 };
  const deathsInBand = { '1-9': 0, '10-19': 0, '20-29': 0, '30+': 0 };
  const history = [{ time: 0, stage: openStage(g) }];
  const bossAttempts = [];
  const wispProbes = {};
  let nextCheck = interval;
  let firstStall = null;
  function record() {
    const stage = openStage(g);
    for (const n of TARGETS) if (stage >= n && reached[n] == null) {
      reached[n] = Number((g.t / MINUTE).toFixed(2));
      // Same seeded build, one hypothetical 15-minute Wisp stage, no enemy unlock requirement.
      // Treatment equips a test-only +25 fire-resistance ring without altering game RNG.
      const probe = Sim.project(g, { target: { key: 'wisp', level: n }, secs: 900 });
      const counter = JSON.parse(JSON.stringify(g));
      const ring = counter.equip.ring1 || Sim.makeItem({ s: (seed ^ (n * 9176)) >>> 0 }, 'ring', n, { rarity: 'rare' });
      ring.affixes = [['res_fire', 25]];
      counter.equip.ring1 = ring;
      Sim.refresh(counter);
      const protectedProbe = Sim.project(counter, { target: { key: 'wisp', level: n }, secs: 900 });
      wispProbes[n] = {
        fixedStage: n, hypothetical: true, seconds: 900,
        baseFireRes: Number(g.stats.res.fire.toFixed(2)),
        counterFireRes: Number(counter.stats.res.fire.toFixed(2)),
        base: { killsPerMin: probe.kpm, deaths: probe.deaths },
        counter: { killsPerMin: protectedProbe.kpm, deaths: protectedProbe.deaths }
      };
    }
    const last = history[history.length - 1];
    if (stage !== last.stage) {
      if (firstStall == null && g.t - last.time >= 20 * MINUTE)
        firstStall = { minute: Number((last.time / MINUTE).toFixed(1)), stage: last.stage,
          durationMin: Number(((g.t - last.time) / MINUTE).toFixed(1)) };
      history.push({ time: g.t, stage });
    }
  }
  function advanceTo(end) {
    const band = timeKey(openStage(g));
    const before = g.t, out = Sim.emptyOut();
    Sim.advance(g, end, out, (_text, kind) => {
      if (kind === 'death') deathsInBand[timeKey(openStage(g))]++;
    });
    timeInBand[band] += g.t - before;
    record();
  }
  record();
  while (g.t < horizon) {
    advanceTo(Math.min(horizon, g.t + MINUTE, nextCheck));
    if (g.t >= horizon) break;
    if (g.t < nextCheck) continue;
    checkin(g, policy);
    if (g.sigils > 0 && g.t >= (g.bossCooldownUntil || 0)) {
      const key = 'bellkeeper'; // the only slice boss; Hollow is explicitly out of scope
      const boss = Sim.BOSSES[key];
      if (boss && g.zones[boss.zone]) {
        const attempt = Sim.doAction(g, { type: 'boss', key, level: g.bossUnlocked[key] });
        if (!attempt) {
          bossAttempts.push({ minute: Number((g.t / MINUTE).toFixed(2)), key, win: g.lastBoss.res.win,
            died: g.lastBoss.res.died, pct: Number(g.lastBoss.res.pct.toFixed(3)) });
          if (g.lastBoss.res.died) deathsInBand[timeKey(openStage(g))]++;
          advanceTo(Math.min(horizon, g.t + Math.max(1, g.lastBoss.res.time || 1)));
        }
      }
    }
    nextCheck = g.t + interval;
  }
  const wall = firstStall || (() => {
    const last = history[history.length - 1];
    return g.t - last.time >= 20 * MINUTE ? { minute: Number((last.time / MINUTE).toFixed(1)),
      stage: last.stage, durationMin: Number(((g.t - last.time) / MINUTE).toFixed(1)), censored: true } : null;
  })();
  const bandRates = Object.fromEntries(Object.keys(timeInBand).map(k =>
    [k, { minutes: Number((timeInBand[k] / MINUTE).toFixed(2)), deaths: deathsInBand[k],
      deathsPerHour: timeInBand[k] > 0 ? Number((deathsInBand[k] * 3600 / timeInBand[k]).toFixed(2)) : null }]));
  const wispKills = Object.entries(g.kills).filter(([k]) => k.startsWith('wisp:'))
    .reduce((n,[,count])=>n+count,0);
  return {
    seed, policy, reachedMinutes: Object.fromEntries(TARGETS.map(k => [k, reached[k] ?? null])),
    finalStage: openStage(g), heroLevel: g.hero.level, firstStall: wall,
    deathRateByStageBand: bandRates, totalDeaths: Object.values(deathsInBand).reduce((a,b)=>a+b,0),
    target: g.target, wispKills, wispProbes, emberEssence: g.mats.fire || 0,
    dawnEssence: g.mats.holy || 0, bellkeeperAttempts: bossAttempts.filter(x=>x.key==='bellkeeper'),
    bossAttempts, note: 'Only Fallfields is selected and measured; Hollow is ignored even if unlocked by engine. Wisp probes are hypothetical stage snapshots with test-only resistance, not actual loot. Minute resolution; no manual farming.'
  };
}
for (const seed of SEEDS) for (const policy of POLICIES) {
  console.log('BOT_RUN_START ' + JSON.stringify({ seed, policy, ...meta }));
  const result = run(seed, policy);
  console.log('BOT_RESULT ' + JSON.stringify({ source: { repo: meta.repository, branch: meta.branch,
    commit: meta.commit, script: meta.script }, ...result }));
}
