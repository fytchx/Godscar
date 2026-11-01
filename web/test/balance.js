// Headless balance run (v3). The bot plays only through doAction, like a client would.
const S = require('../src/sim.js');
const cls = process.argv[2] || 'warrior';
const hours = +(process.argv[3] || 6);
const quiet = process.argv[4] === 'q';
const g = S.newGame(cls, 0, 42);
const act = a => S.doAction(g, a);
let t = 0, bossWins = 0, bossTries = 0;
const t0 = Date.now();
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
  S.advance(g, t, S.emptyOut());
  if (m % 5 !== 0) continue;
  const order = ['might', 'vitality', 'swiftness', 'precision'];
  while (g.hero.points > 0) act({ type: 'passive', k: order[g.hero.points % 4] });
  if (g.hero.level >= S.SPEC_LEVEL && g.hero.spec == null) act({ type: 'spec', i: 0 });
  for (const it of [...g.bag]) {
    const key = S.verdictSlot(g, it);
    const cur = S.project(g, { secs: 120 }), alt = S.project(g, { secs: 120, equip: { [key]: it } });
    if (alt.xpm > cur.xpm * 1.02 && alt.deaths <= cur.deaths) act({ type: 'equip', id: it.id, to: key });
  }
  if (g.jewels.length && g.equip.belt && g.equip.belt.socket && !g.equip.belt.jewel) act({ type: 'socketJewel', id: g.jewels[0].id });
  while (g.bag.length > 24) { const it = g.bag.find(x => !x.locked && S.RANK[x.rarity] < 4) || g.bag[0]; if (act({ type: 'salvage', id: it.id })) break; }
  for (let guard = 0; guard < 50; guard++) {
    const it = Object.values(g.equip).filter(x => x.rarity !== 'ascended' && x.plus < 10).sort((a, b) => S.upgradeCost(a) - S.upgradeCost(b))[0];
    if (!it || act({ type: 'upgrade', id: it.id })) break;
  }
  if (g.asc.unlocked) for (const s of S.ARMOR_SLOTS) while (!act({ type: 'ascend', slot: s }));
  while (g.sigils > 0) {
    const bk = g.zones.hollow ? 'woundwarden' : 'bellkeeper';
    act({ type: 'boss', key: bk, level: g.bossUnlocked[bk] }); bossTries++; if (g.lastBoss.res.win) bossWins++;
  }
  const b = bestTarget();
  act({ type: 'target', key: b.k, level: b.L });
  if (!quiet && (m + 5) % 60 === 0 || (quiet && m + 5 >= hours * 60)) {
    const p = S.project(g, { secs: 120 });
    const rar = Object.values(g.equip).map(i => i.rarity[0]).join('');
    console.log(`${cls.padEnd(8)} h${Math.round((m + 5) / 60)} lvl ${g.hero.level} ${g.target.key}@${g.target.level} hollow:${g.zones.hollow ? 'y' : 'n'} asc:${g.asc.unlocked ? JSON.stringify(Object.values(g.asc.slots)) : 'n'} kpm ${p.kpm.toFixed(1)} d/2m ${p.deaths} life ${S.fmt(g.stats.life)} hit ${S.fmt(g.stats.hit)} dps ${S.fmt(p.dps)} bosses ${bossWins}/${bossTries} gear ${rar} aug ${Object.keys(g.stats.aug).join(',')} sets ${JSON.stringify(g.stats.sets)} evo ${g.stats.evo || '-'} jewels ${g.jewels.length}`);
  }
}
if (!quiet) console.log('ms', Date.now() - t0);
