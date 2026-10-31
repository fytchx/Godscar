// Headless balance run: a greedy bot farms with auto-push, equips projected upgrades, spends shards and points, fights bosses.
const S = require('../src/sim.js');
const cls = process.argv[2] || 'warrior';
const hours = +(process.argv[3] || 6);
const quiet = process.argv[4] === 'q';
const g = S.newGame(cls, 0, 42);
let t = 0;
const t0 = Date.now();
const total = S.emptyOut();
let bossWins = 0, bossTries = 0;
function bestTarget() {
  let best = null;
  for (const k of S.MONSTER_KEYS) {
    if (!g.zones[S.MONSTERS[k].zone]) continue;
    const lv = g.unlocked[k];
    for (const L of [lv, Math.max(S.ZONES[S.MONSTERS[k].zone].minLevel, lv - 2)]) {
      const p = S.project(g, { target: { key: k, level: L }, secs: 120 });
      const score = p.xpm * (p.deaths ? 0.4 : 1) * (S.MONSTERS[k].zone === 'hollow' ? 1.15 : 1);
      if (!best || score > best.score) best = { k, L, score, p };
    }
  }
  return best;
}
for (let m = 0; m < hours * 60; m++) {
  t += 60;
  const out = S.emptyOut();
  S.advance(g, t, out);
  for (const k in out) if (typeof out[k] === 'number') total[k] += out[k];
  if (m % 5 === 0) {
    const passOrder = ['might', 'vitality', 'swiftness', 'precision'];
    while (g.hero.points > 0) { const k = passOrder[g.hero.points % 4]; g.hero.passives[k] = (g.hero.passives[k] || 0) + 1; g.hero.points--; }
    if (g.hero.level >= S.SPEC_LEVEL && g.hero.spec == null) g.hero.spec = 0;
    S.refresh(g);
    for (const it of [...g.bag]) {
      const cur = S.project(g, { secs: 120 });
      const alt = S.project(g, { secs: 120, equip: { [it.slot]: it } });
      if (alt.xpm > cur.xpm * 1.02 && alt.deaths <= cur.deaths) {
        const old = g.equip[it.slot];
        g.equip[it.slot] = it; g.bag.splice(g.bag.indexOf(it), 1);
        if (old) g.bag.push(old);
        S.refresh(g);
      }
    }
    while (g.bag.length > 20) { const it = g.bag.shift(); g.gold += S.salvageValue(it); g.mats.shards += S.salvageShards(it); }
    let changed = true;
    while (changed) {
      changed = false;
      const it = Object.values(g.equip).sort((a, b) => S.upgradeCost(a) - S.upgradeCost(b))[0];
      if (it && it.plus < 10 && g.mats.shards >= S.upgradeCost(it)) { const c = S.upgradeCost(it); g.mats.shards -= c; it.shardsIn = (it.shardsIn || 0) + c; it.plus++; changed = true; S.refresh(g); }
    }
    while (g.sigils > 0) {
      const bk = g.zones.hollow ? 'woundwarden' : 'bellkeeper';
      const res = S.fightBoss(g, bk, g.bossUnlocked[bk]);
      g.sigils--; bossTries++;
      if (res.win) { bossWins++; S.bossRewards(g, res, S.emptyOut()); }
    }
    const b = bestTarget();
    g.target = { key: b.k, level: b.L };
  }
  if (!quiet && (m + 1) % 60 === 0 || (quiet && m + 1 === hours * 60)) {
    const p = S.project(g, { secs: 120 });
    console.log(`${cls.padEnd(8)} h${(m + 1) / 60} lvl ${g.hero.level} ${g.target.key}@${g.target.level} hollow:${g.zones.hollow} kpm ${p.kpm.toFixed(1)} d/2m ${p.deaths} life ${S.fmt(g.stats.life)} dps ${S.fmt(p.dps)} shards ${g.mats.shards} ess ${g.mats.ember}/${g.mats.ash}/${g.mats.rift} bosses ${bossWins}/${bossTries} bar ${g.cast.map(c => c.k).join(',')} pm ${Object.keys(g.stats.pmods).join(',')}`);
  }
}
if (!quiet) console.log('totals', JSON.stringify({ kills: total.kills, deaths: total.deaths, items: total.items }), 'ms', Date.now() - t0);
