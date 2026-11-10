// Headless balance run (v3). The bot plays only through doAction, like a client would.
const S = require('../src/sim.js');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function knightAblation() {
  const seeds = [31, 97, 503, 2026, 1109], level = 30;
  const typicalRing = ['life', 'res_shadow', 'res_frost', 'goldFind'];
  const roll = (key, rng) => {
    const affix = S.AFFIXES[key];
    return [key, affix.roll(rng, Math.pow(1.105, level - 1), level)];
  };
  function fixture(seed) {
    const game = S.newGame('paladin', 0, seed);
    game.hero.level = level;
    game.hero.points = level - 1;
    const order = ['might', 'vitality', 'swiftness', 'precision'];
    while (game.hero.points > 0) {
      const key = order[game.hero.points % order.length];
      game.hero.passives[key] = (game.hero.passives[key] || 0) + 1;
      game.hero.points--;
    }
    game.hero.spec = 0;
    const rng = { s: (seed ^ 0x5f3759df) >>> 0 };
    for (const slot of ['weapon', 'helm', 'chest', 'gloves', 'belt', 'legs', 'boots', 'amulet']) {
      game.equip[slot] = S.makeItem(rng, slot, level, {
        rarity: 'rare', ...(slot === 'weapon' ? { base: 'sword' } : {})
      });
    }
    const ring = S.makeItem(rng, 'ring', level, { rarity: 'rare' });
    const ringRng = { s: (seed ^ 0x13579 ^ (level * 0x45d9f3b)) >>> 0 };
    ring.affixes = typicalRing.map(key => roll(key, ringRng));
    game.equip.ring1 = ring;
    S.refresh(game);
    return game;
  }
  function attempt(game) {
    game.t = 0;
    game.target = { key: 'knight', level };
    game.autoPush = false;
    game.fight = { hp: null, mon: null, pNext: 0, pulseNext: 1, respawnAt: 0,
      deadUntil: 0, cd: {}, shield: 0, buffs: {}, cycle: 0, critCastAt: -99 };
    const out = S.emptyOut(); out.killTimes = [];
    const deaths = [];
    for (let elapsed = 0.1; elapsed <= 150; elapsed += 0.1) {
      S.advance(game, elapsed, out, (_message, kind) => { if (kind === 'death') deaths.push(game.t); });
      const killed = out.killTimes[0], died = deaths[0];
      if (killed != null || died != null) {
        const outcome = died != null && (killed == null || died < killed) ? 'death' : 'clear';
        return { outcome, seconds: Number((outcome === 'clear' ? killed : died).toFixed(2)),
          damage: Number(out.dmgDealt.toFixed(2)), taken: Number(out.dmgTaken.toFixed(2)), deaths: out.deaths };
      }
    }
    return { outcome: 'timeout', seconds: 150, damage: Number(out.dmgDealt.toFixed(2)), taken: Number(out.dmgTaken.toFixed(2)), deaths: out.deaths };
  }
  for (const seed of seeds) {
    const base = fixture(seed), control = clone(base), treatment = clone(base);
    const controlAffixRng = { s: (seed ^ 0x13579 ^ (level * 0x45d9f3b)) >>> 0 };
    const counterRng = { s: (seed ^ 0x24680 ^ (level * 0x45d9f3b)) >>> 0 };
    const controlAffixes = typicalRing.map(key => roll(key, controlAffixRng));
    const counterValue = 3 * Math.pow(1.105, level - 1);
    control.equip.ring1.affixes = controlAffixes;
    treatment.equip.ring1.affixes = [['flat_holy', counterValue], ...controlAffixes.slice(0, 3)];
    S.refresh(control); S.refresh(treatment);
    console.log(JSON.stringify({ seed, stage: level, counter: 'flat_holy', counterValue: Number(counterValue.toFixed(4)),
      noCounter: attempt(control), withCounter: attempt(treatment) }));
  }
}

if (process.argv[2] === '--knight-ablation') {
  knightAblation();
  process.exit(0);
}

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
    const error = act({ type: 'boss', key: bk, level: g.bossUnlocked[bk] });
    if (error) break;
    bossTries++; if (g.lastBoss.res.win) bossWins++; else break;
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
