// Each evolution must change combat, and trigger/repeat guards must hold.
const S = require('../src/sim.js');
for (const cls of S.CLASS_KEYS) {
  const g = S.newGame(cls, 0, 7);
  g.hero.level = 40; g.hero.spec = 0;
  const r = g.rng;
  for (const sl of ['helm', 'chest', 'gloves', 'legs', 'boots', 'ring', 'amulet']) { S.doAction(g, { type: 'noop' }); const it = S.makeItem(r, sl, 38, { rarity: 'rare' }); g.bag.push(it); S.doAction(g, { type: 'equip', id: it.id }); }
  const belt = S.makeItem(r, 'belt', 38, { rarity: 'legendary' }); belt.socket = true; g.bag.push(belt); S.doAction(g, { type: 'equip', id: belt.id });
  if (cls === 'warrior') { const w = S.makeItem(r, 'weapon', 38, { rarity: 'rare', base: 'greataxe' }); g.bag.push(w); S.doAction(g, { type: 'equip', id: w.id }); }
  else { const w = S.makeItem(r, 'weapon', 38, { rarity: 'rare', base: S.CLASSES[cls].startWeapon }); g.bag.push(w); S.doAction(g, { type: 'equip', id: w.id }); }
  S.refresh(g);
  const tgt = { key: 'husk', level: 30 };
  const before = S.project(g, { target: tgt, secs: 300 });
  g.jewels.push(S.makeJewel(r, cls));
  console.assert(!S.doAction(g, { type: 'socketJewel', id: g.jewels[0].id }), 'socket failed');
  if (cls === 'warrior') { const w2 = S.makeItem(r, 'weapon', 38, { rarity: 'rare', base: 'greataxe' }); g.bag.push(w2); const e = S.doAction(g, { type: 'equip', id: w2.id, to: 'offhand' }); console.assert(!e, 'titan grip offhand: ' + e); }
  const after = S.project(g, { target: tgt, secs: 300 });
  console.log(cls.padEnd(9), S.CLASSES[cls].evo.name.padEnd(17), 'evo', g.stats.evo, 'dps', S.fmt(before.dps), '->', S.fmt(after.dps), 'deaths', before.deaths, '->', after.deaths);
}
// guard: critcast + echo + doubleCast can't loop
const g = S.newGame('rogue', 0, 3); g.hero.level = 30;
const it = S.makeItem(g.rng, 'amulet', 30, { rarity: 'legendary' }); it.augments = ['critcast', 'echo', 'split']; it.enchant = ['doubleCast', 50];
g.bag.push(it); S.doAction(g, { type: 'equip', id: it.id });
const sp = S.makeItem(g.rng, 'helm', 30, { rarity: 'rare' }); sp.spell = 'barrier'; g.bag.push(sp); S.doAction(g, { type: 'equip', id: sp.id });
const t0 = Date.now(); const p = S.project(g, { secs: 600 });
console.log('guard run ok', Date.now() - t0, 'ms, kpm', p.kpm.toFixed(1));
