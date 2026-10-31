// ===== GODSCAR SIM CORE (v2) =====
// One deterministic event simulation used for live play, offline catch-up, build projections and boss fights.
// Combat state is advanced to a wall-clock time; the UI only ever *views* it.
'use strict';

// ---------- RNG (mulberry32, state stored in save) ----------
function rand(r) {
  let t = (r.s = (r.s + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (r, a, b) => a + (b - a) * rand(r);
const pick = (r, arr) => arr[Math.floor(rand(r) * arr.length)];

function fmt(v, d = 0) {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 10000) return (v / 1000).toFixed(1) + 'k';
  return d ? (Math.round(v * 10 ** d) / 10 ** d).toFixed(d) : String(Math.round(v));
}

// ---------- CLASSES ----------
// primary: the ability that never stops. conv = share of damage turned to fire. hits = strikes per cast.
const CLASSES = {
  warrior: {
    name: 'Warrior', life: 130, lifePer: 15, armor: 4, armorPer: 0.7, regen: 1.2, fireRes: 0, crit: 0,
    primary: { name: 'Cleave', hits: 1, mult: 1, conv: 0, text: 'Swings your weapon at the foe, forever.' },
    spell: 'sunder', startWeapon: 'sword',
    blurb: 'Heavy armor and a deep life pool. Cleave never stops; Sunder smashes through plate.',
    specs: [
      { name: 'Berserker', text: '+20% attack speed, 15% more damage, 15% less armor.', mods: { atkSpd: 20, dmgMore: 0.15, armorMore: -0.15 } },
      { name: 'Juggernaut', text: '25% more life and 25% more armor.', mods: { lifeMore: 0.25, armorMore: 0.25 } },
      { name: 'Warlord', text: '60% more retaliation and 50% more life regeneration.', mods: { thornsMore: 0.6, regenMore: 0.5 } }
    ]
  },
  paladin: {
    name: 'Paladin', life: 120, lifePer: 14, armor: 3, armorPer: 0.6, regen: 2, fireRes: 10, crit: 0,
    primary: { name: 'Smite', hits: 1, mult: 1, conv: 0.4, text: 'Strikes with 40% of its damage turned to holy fire.' },
    spell: 'consecrate', startWeapon: 'sword',
    blurb: 'Steady and self-healing. Smite burns with holy fire; Consecrate damages and mends.',
    specs: [
      { name: 'Templar', text: '20% more armor, +15% fire resistance, 10% more life.', mods: { armorMore: 0.2, fireRes: 15, lifeMore: 0.1 } },
      { name: 'Inquisitor', text: '+8% critical chance and +40% critical damage.', mods: { critChance: 8, critMulti: 40 } },
      { name: 'Martyr', text: 'Double life on hit and 15% more life, 5% less damage.', mods: { lifeOnHitMore: 1, lifeMore: 0.15, dmgMore: -0.05 } }
    ]
  },
  sorcerer: {
    name: 'Sorcerer', life: 90, lifePer: 10, armor: 1, armorPer: 0.25, regen: 1.6, fireRes: 15, crit: 0,
    primary: { name: 'Firebolt', hits: 1, mult: 1, conv: 1, text: 'Hurls fire. All of its damage is fire, whatever you wield.' },
    spell: 'ignite', startWeapon: 'staff',
    blurb: 'Fragile, all fire. Firebolt never stops; Ignite leaves foes burning.',
    specs: [
      { name: 'Stormcaller', text: '+25% attack speed.', mods: { atkSpd: 25 } },
      { name: 'Pyromancer', text: '60% more burn and bleed damage.', mods: { dotMore: 0.6 } },
      { name: 'Arcanist', text: '35% more spell damage and 15% faster spell cooldowns.', mods: { spellMore: 0.35, cdr: 15 } }
    ]
  },
  hunter: {
    name: 'Hunter', life: 105, lifePer: 12, armor: 2, armorPer: 0.4, regen: 1.4, fireRes: 0, crit: 3,
    primary: { name: 'Quickshot', hits: 1, mult: 1, conv: 0, text: 'Looses arrows at range without pause.' },
    spell: 'hawk', startWeapon: 'bow',
    blurb: 'Precise, with a companion. Quickshot never stops; Hawk Talon summons a hunting hawk.',
    specs: [
      { name: 'Deadeye', text: '+10% critical chance and +30% critical damage.', mods: { critChance: 10, critMulti: 30 } },
      { name: 'Beastmaster', text: 'Your companion deals 80% more damage.', mods: { companionMore: 0.8 } },
      { name: 'Trapper', text: '40% more burn and bleed damage, hits ignore 30% of armor.', mods: { dotMore: 0.4, armorPen: 0.3 } }
    ]
  },
  rogue: {
    name: 'Rogue', life: 95, lifePer: 11, armor: 1.5, armorPer: 0.35, regen: 1.3, fireRes: 0, crit: 5,
    primary: { name: 'Twin Strike', hits: 2, mult: 0.55, conv: 0, text: 'Strikes twice for 55% each. Twice the on-hit effects.' },
    spell: 'eviscerate', startWeapon: 'dagger',
    blurb: 'Fast and lethal. Twin Strike never stops; Eviscerate always lands a critical blow.',
    specs: [
      { name: 'Assassin', text: '+60% critical damage and +5% critical chance.', mods: { critMulti: 60, critChance: 5 } },
      { name: 'Shadow', text: '15% chance to dodge attacks.', mods: { dodge: 15 } },
      { name: 'Trickster', text: '+15% attack speed and 50% more life on hit.', mods: { atkSpd: 15, lifeOnHitMore: 0.5 } }
    ]
  }
};
const CLASS_KEYS = ['warrior', 'paladin', 'sorcerer', 'hunter', 'rogue'];
const SPEC_LEVEL = 10;

// ---------- SPELLS ----------
// kind: off (offensive, fires on cooldown) | util (fires when its condition is met). el: essence needed to inscribe.
const SPELLS = {
  // class spells
  sunder:     { name: 'Sunder', kind: 'off', cls: 'warrior', cd: 6, text: '250% physical hit that ignores armor.' },
  consecrate: { name: 'Consecrate', kind: 'off', cls: 'paladin', cd: 7, text: '160% fire hit, and heals you for 8% of your life.' },
  ignite:     { name: 'Ignite', kind: 'off', cls: 'sorcerer', cd: 5, text: '120% fire hit that burns for 80% per second over 4s.' },
  hawk:       { name: 'Hawk Talon', kind: 'off', cls: 'hunter', cd: 9, text: 'A hawk hunts with you for 9s, striking for 40% every second.' },
  eviscerate: { name: 'Eviscerate', kind: 'off', cls: 'rogue', cd: 6, text: '220% hit that is always critical.' },
  // found or inscribed
  cinderburst:{ name: 'Cinderburst', kind: 'off', el: 'ember', cd: 6, text: '200% fire hit that burns for 60% per second over 3s.' },
  emberrain:  { name: 'Ember Rain', kind: 'off', el: 'ember', cd: 10, text: '380% fire damage in one downpour.' },
  scarlance:  { name: 'Scar Lance', kind: 'off', el: 'ash', cd: 7, text: '280% physical hit that ignores armor.' },
  rend:       { name: 'Rend', kind: 'off', el: 'ash', cd: 8, text: 'Bleeds the foe for 55% per second over 6s, ignoring armor.' },
  riftbolt:   { name: 'Riftbolt', kind: 'off', el: 'rift', cd: 4, text: '130% rift damage. Ignores armor, resistance and evasion.' },
  voidmaw:    { name: 'Void Maw', kind: 'off', el: 'rift', cd: 14, text: '420% rift damage. Ignores armor, resistance and evasion.' },
  barrier:    { name: 'Rift Barrier', kind: 'util', el: 'rift', cd: 15, text: 'A shield that absorbs damage equal to 25% of your life.', cond: 'hp50' },
  mend:       { name: 'Mend', kind: 'util', el: 'ember', cd: 12, text: 'Heal 30% of your life.', cond: 'hp50' },
  warcry:     { name: 'War Cry', kind: 'util', el: 'ash', cd: 16, text: '30% more damage for 6s.', cond: 'foeHigh' },
  ashward:    { name: 'Ash Ward', kind: 'util', el: 'ash', cd: 18, text: '50% more armor and +25% fire resistance for 6s.', cond: 'always' }
};
const FOUND_SPELLS = ['cinderburst', 'emberrain', 'scarlance', 'rend', 'riftbolt', 'voidmaw', 'barrier', 'mend', 'warcry', 'ashward'];
const CONDS = {
  always: 'Whenever ready',
  hp70: 'Life below 70%',
  hp50: 'Life below 50%',
  hp30: 'Life below 30%',
  foeHigh: 'Foe above 70% life'
};
const BAR_OFF = 3, BAR_UTIL = 2;
const CLASS_SPELL_LEVEL = 3;

// ---------- PRIMARY ABILITY MODS (from items) ----------
const PMODS = {
  split:    { name: 'Splitting', text: 'Your primary strikes again for 40%.' },
  searing:  { name: 'Searing', text: 'Your primary burns for 25% of its hit per second over 3s.' },
  heavy:    { name: 'Crushing', text: 'Your primary is 35% slower but hits 75% harder.' },
  rending:  { name: 'Rending', text: 'Your primary ignores 50% of armor.' },
  siphon:   { name: 'Siphoning', text: 'Your primary heals you for 4% of the damage it deals.' },
  momentum: { name: 'Momentum', text: 'Each primary hit on the same foe deals 10% more, up to 5 stacks.' }
};

// ---------- PASSIVES ----------
const PASSIVES = {
  might:     { name: 'Might', text: '+2% damage' },
  vitality:  { name: 'Vitality', text: '+3% life' },
  swiftness: { name: 'Swiftness', text: '+1.5% attack speed' },
  precision: { name: 'Precision', text: '+0.6% crit chance, +3% crit damage' },
  bulwark:   { name: 'Bulwark', text: '+3% armor, +0.5% fire resistance' },
  sorcery:   { name: 'Sorcery', text: '+3% spell, burn and bleed damage' }
};
const PASSIVE_KEYS = Object.keys(PASSIVES);

// ---------- ITEMS ----------
const SLOTS = ['weapon', 'helm', 'chest', 'gloves', 'boots', 'ring', 'amulet'];
const SLOT_NAMES = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', amulet: 'Amulet' };
const WEAPONS = {
  sword:    { name: 'Sword',    type: 'phys', mult: 1.0,  interval: 1.3 },
  greataxe: { name: 'Greataxe', type: 'phys', mult: 1.8,  interval: 2.1 },
  dagger:   { name: 'Dagger',   type: 'phys', mult: 0.62, interval: 0.85 },
  bow:      { name: 'Bow',      type: 'phys', mult: 1.25, interval: 1.55 },
  staff:    { name: 'Staff',    type: 'fire', mult: 1.05, interval: 1.4 },
  wand:     { name: 'Wand',     type: 'fire', mult: 0.58, interval: 0.8 }
};
const ARMOR_BASE = { helm: { armor: 3 }, chest: { armor: 6, life: 10 }, gloves: { armor: 2 }, boots: { armor: 2 } };
const gearG = ilvl => Math.pow(1.105, ilvl - 1);
const monG = lvl => Math.pow(1.155, lvl - 1);

const AFFIXES = {
  physFlat:  { label: v => `+${fmt(v)} physical damage to attacks`, slots: ['weapon', 'gloves', 'ring'], roll: (r, g) => rr(r, 1.5, 3) * g },
  fireFlat:  { label: v => `+${fmt(v)} fire damage to attacks`, slots: ['weapon', 'gloves', 'ring', 'amulet'], roll: (r, g) => rr(r, 1.5, 3) * g },
  dmgPct:    { label: v => `+${fmt(v)}% damage`, slots: ['weapon', 'ring', 'amulet'], pct: 1, roll: r => rr(r, 8, 20) },
  atkSpd:    { label: v => `+${fmt(v)}% attack speed`, slots: ['weapon', 'gloves', 'ring'], pct: 1, roll: r => rr(r, 5, 14) },
  critChance:{ label: v => `+${fmt(v)}% critical chance`, slots: ['weapon', 'helm', 'ring', 'amulet'], pct: 1, roll: r => rr(r, 3, 8) },
  critMulti: { label: v => `+${fmt(v)}% critical damage`, slots: ['weapon', 'gloves', 'amulet'], pct: 1, roll: r => rr(r, 15, 40) },
  life:      { label: v => `+${fmt(v)} life`, slots: ['helm', 'chest', 'boots', 'ring', 'amulet'], roll: (r, g) => rr(r, 10, 20) * g },
  armor:     { label: v => `+${fmt(v)} armor`, slots: ['helm', 'chest', 'gloves', 'boots'], roll: (r, g) => rr(r, 2, 4) * g },
  regen:     { label: v => `+${fmt(v, 1)} life per second`, slots: ['helm', 'chest', 'boots', 'amulet'], roll: (r, g) => rr(r, 0.6, 1.2) * g },
  lifeOnHit: { label: v => `+${fmt(v, 1)} life on hit`, slots: ['weapon', 'gloves', 'ring'], roll: (r, g) => rr(r, 0.8, 1.8) * g },
  thorns:    { label: v => `+${fmt(v)} retaliation damage`, slots: ['helm', 'chest', 'boots', 'amulet'], roll: (r, g) => rr(r, 2, 4) * g },
  fireRes:   { label: v => `+${fmt(v)}% fire resistance`, slots: ['helm', 'chest', 'boots', 'ring', 'amulet'], pct: 1, roll: r => rr(r, 8, 18) },
  spellPct:  { label: v => `+${fmt(v)}% spell damage`, slots: ['weapon', 'helm', 'amulet', 'ring'], pct: 1, roll: r => rr(r, 10, 25) },
  cdr:       { label: v => `${fmt(v)}% faster spell cooldowns`, slots: ['helm', 'amulet'], pct: 1, roll: r => rr(r, 4, 9) },
  goldFind:  { label: v => `+${fmt(v)}% gold found`, slots: ['helm', 'boots', 'ring', 'amulet'], pct: 1, roll: r => rr(r, 10, 30) }
};

const SPECIALS = {
  emberheart: { name: 'Ember Heart', text: 'All your physical damage is converted to fire.' },
  bulwark:    { name: 'Bulwark of Caldris', text: 'Gain retaliation damage equal to 60% of your armor.' },
  echo:       { name: 'Wound-Echo', text: 'Your offensive spells strike twice.' },
  tithe:      { name: 'Bloodtithe', text: 'Life on hit is tripled. 25% less maximum life.' },
  kindling:   { name: 'Scar Kindling', text: 'Every hit burns the target for 40% of its damage per second over 3s.' },
  gravebound: { name: 'Gravebound', text: 'Retaliation can critically strike, and heals you for 30% of the damage it deals.' }
};

const RARITIES = [
  { key: 'common', name: 'Common', affixes: [0, 0] },
  { key: 'magic', name: 'Magic', affixes: [1, 2] },
  { key: 'rare', name: 'Rare', affixes: [3, 4] },
  { key: 'godtouched', name: 'Godtouched', affixes: [3, 3] }
];
const RARITY_RANK = { common: 0, magic: 1, rare: 2, godtouched: 3 };

// ---------- ZONES & MONSTERS ----------
const ZONES = {
  fallfields: { name: 'The Fallfields', minLevel: 1, weights: [52, 34, 12, 2], ilvlBonus: 0, reward: 1, tough: 1, spellChance: 0,
    text: 'Blighted farmland where the wound first bled into Caldris.' },
  hollow: { name: 'The Ashen Hollow', minLevel: 20, weights: [30, 42, 23, 5], ilvlBonus: 4, reward: 1.9, tough: 1.7, spellChance: 0.18,
    text: 'A crater of ash below the Godwound. Stronger items, element essences, and rare items that grant spells.' }
};
const ZONE_KEYS = ['fallfields', 'hollow'];
const HOLLOW_UNLOCK = 20; // reach this level on any Fallfields monster

const MONSTERS = {
  husk:   { zone: 'fallfields', name: 'Blighted Husk', hp: 75, dmg: 7, interval: 2.0, dmgType: 'phys', armor: 0, fireRes: 0, regenPct: 0.035, evade: 0, xp: 1.0, gold: 1.0,
            note: 'Regenerates 3.5% of its life every second. Low damage never finishes it.' },
  swarm:  { zone: 'fallfields', name: 'Carrion Swarm', hp: 30, dmg: 2.4, interval: 0.5, dmgType: 'phys', armor: 0, fireRes: 0, regenPct: 0, evade: 0, xp: 0.5, gold: 0.5,
            note: 'Many tiny bites. Armor shrugs them off; retaliation punishes every one.' },
  knight: { zone: 'fallfields', name: 'Grave Knight', hp: 90, dmg: 12, interval: 2.0, dmgType: 'phys', armor: 7, fireRes: 0, regenPct: 0, evade: 0, xp: 1.45, gold: 1.5,
            note: 'Plate armor subtracts from every physical hit. Big hits or fire get through.' },
  wisp:   { zone: 'fallfields', name: 'Hollow Wisp', hp: 42, dmg: 8, interval: 1.3, dmgType: 'fire', fireRes: 60, armor: 0, regenPct: 0, evade: 0, xp: 0.85, gold: 0.9,
            note: 'Burns through armor and resists 60% of fire. Needs fire resistance and physical damage.' },
  zealot: { zone: 'hollow', name: 'Ashbound Zealot', hp: 85, dmg: 10, interval: 1.6, dmgType: 'fire', armor: 5, fireRes: 30, regenPct: 0, evade: 0, xp: 1.4, gold: 1.4, essence: 'ember',
            note: 'Armored, fire-wielding, resists 30% of fire. Drops Ember Essence.' },
  hound:  { zone: 'hollow', name: 'Blight Hound', hp: 40, dmg: 4, interval: 0.7, dmgType: 'phys', armor: 0, fireRes: 0, regenPct: 0.02, evade: 0, xp: 0.5, gold: 0.5, essence: 'ash',
            note: 'Fast pack hunter that regenerates. Drops Ash Essence.' },
  shade:  { zone: 'hollow', name: 'Rift Shade', hp: 50, dmg: 9, interval: 1.2, dmgType: 'phys', armor: 0, fireRes: 0, regenPct: 0, evade: 35, xp: 1.0, gold: 1.0, essence: 'rift',
            note: 'Evades 35% of hits. Burns, bleeds, companions and rift damage still land. Drops Rift Essence.' },
  colossus:{ zone: 'hollow', name: 'Cinder Colossus', hp: 170, dmg: 22, interval: 3.0, dmgType: 'phys', armor: 10, fireRes: 40, regenPct: 0, evade: 0, xp: 2.6, gold: 2.8, essence: 'any',
            note: 'Huge, slow, crushing blows behind heavy armor. Drops any essence, more often.' }
};
const MONSTER_KEYS = Object.keys(MONSTERS);
const BOSSES = {
  bellkeeper: { zone: 'fallfields', name: 'The Hollow Bellkeeper', hp: 75 * 40, dmg: 17, interval: 2.2, dmgType: 'phys', armor: 4, fireRes: 20, regenPct: 0, evade: 0, xp: 12, gold: 15, minLevel: 3,
                note: 'Tolls the dead bell of the Fallfields. A long fight against heavy blows.' },
  woundwarden:{ zone: 'hollow', name: 'The Woundwarden', hp: 85 * 32, dmg: 15, interval: 1.8, dmgType: 'fire', armor: 8, fireRes: 35, regenPct: 0.005, evade: 10, xp: 18, gold: 22, minLevel: 20,
                note: 'Guardian of the crater. Armored, fire-wielding, slowly mends.' }
};
const BOSS_KEYS = Object.keys(BOSSES);
const mdef = key => MONSTERS[key] || BOSSES[key];
const ESSENCES = { ember: 'Ember Essence', ash: 'Ash Essence', rift: 'Rift Essence' };

const RESPAWN = 0.6, RECOVERY = 12, PULSE = 1, DROP_CHANCE = 0.2, BAG_CAP = 30, OFFLINE_CAP = 24 * 3600, UNLOCK_KILLS = 30;
const SIGIL_KILLS = 150, SIGIL_CAP = 5, BOSS_TIME = 150;
const xpToNext = lvl => Math.round(70 * Math.pow(1.19, lvl - 1) + 40 * lvl);

// ---------- ITEM GENERATION ----------
let itemSeq = 0;
function newId(r) { return 'i' + Math.floor(rand(r) * 1e9).toString(36) + (itemSeq++).toString(36); }
function rollRarity(r, weights) {
  let x = rand(r) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < RARITIES.length; i++) { if ((x -= weights[i]) < 0) return RARITIES[i]; }
  return RARITIES[0];
}
function rollAffix(r, it, exclude) {
  const pool = Object.keys(AFFIXES).filter(k => AFFIXES[k].slots.includes(it.slot) && !exclude.includes(k));
  if (!pool.length) return null;
  const k = pick(r, pool);
  let v = AFFIXES[k].roll(r, gearG(it.ilvl));
  if (AFFIXES[k].pct) v *= 1 + it.ilvl * 0.01;
  return [k, v];
}
function makeItem(r, slot, ilvl, opts = {}) {
  const zone = ZONES[opts.zone || 'fallfields'];
  const ra = opts.rarity ? RARITIES.find(x => x.key === opts.rarity) : rollRarity(r, zone.weights);
  const g = gearG(ilvl);
  const it = { id: newId(r), slot, ilvl, rarity: ra.key, plus: 0, affixes: [], locked: false, shardsIn: 0 };
  if (slot === 'weapon') {
    it.base = opts.base || pick(r, Object.keys(WEAPONS));
    it.dmg = 7 * g * rr(r, 0.92, 1.08);
  } else if (ARMOR_BASE[slot]) {
    it.armor = ARMOR_BASE[slot].armor * g * rr(r, 0.9, 1.1);
    if (ARMOR_BASE[slot].life) it.life = ARMOR_BASE[slot].life * g;
  }
  const n = Math.round(rr(r, ra.affixes[0], ra.affixes[1]));
  for (let i = 0; i < n; i++) { const a = rollAffix(r, it, it.affixes.map(x => x[0])); if (a) it.affixes.push(a); }
  if (ra.key === 'godtouched') it.special = pick(r, Object.keys(SPECIALS));
  if (RARITY_RANK[ra.key] >= 1 && ilvl >= 3 && rand(r) < 0.12) it.pmod = pick(r, Object.keys(PMODS));
  const sc = ra.key === 'godtouched' ? Math.max(zone.spellChance, 0) * 2.8 : ra.key === 'rare' ? zone.spellChance : 0;
  if (sc && rand(r) < sc) it.spell = pick(r, FOUND_SPELLS);
  it.name = itemName(it);
  return it;
}
const PREFIX = ['Ashen', 'Blighted', 'Scarbound', 'Hollow', 'Vigil', 'Riftworn', 'Gravecut', 'Emberlit', 'Oathbroken', 'Fallfield'];
const NOUNS = {
  helm: ['Helm', 'Visor', 'Hood', 'Crown'], chest: ['Hauberk', 'Robe', 'Cuirass', 'Mantle'],
  gloves: ['Gauntlets', 'Grips', 'Wraps'], boots: ['Greaves', 'Treads', 'Boots'], ring: ['Ring', 'Band', 'Signet'], amulet: ['Amulet', 'Talisman', 'Relic']
};
function itemName(it) {
  let h = 0; for (const c of it.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const noun = it.slot === 'weapon' ? WEAPONS[it.base].name : NOUNS[it.slot][h % NOUNS[it.slot].length];
  if (it.rarity === 'common') return noun;
  if (it.special) return SPECIALS[it.special].name + ' ' + noun;
  if (it.spell) return noun + ' of ' + SPELLS[it.spell].name;
  if (it.pmod) return PMODS[it.pmod].name + ' ' + noun;
  return PREFIX[(h >>> 4) % PREFIX.length] + ' ' + noun;
}

const plusMult = it => 1 + 0.1 * (it.plus || 0);
const upgradeCost = it => Math.ceil(3 * Math.pow(1.45, it.plus || 0) * (1 + RARITY_RANK[it.rarity] * 0.3));
const salvageValue = it => Math.round(4 * Math.pow(1.12, it.ilvl) * (1 + RARITY_RANK[it.rarity] * 1.5) * (1 + (it.plus || 0) * 0.5));
const salvageShards = it => Math.floor((it.shardsIn || 0) / 2) + (RARITY_RANK[it.rarity] >= 2 ? 1 : 0);
const reforgeCost = it => Math.round(25 * Math.pow(1.12, it.ilvl) * (1 + RARITY_RANK[it.rarity]));
const inscribeCost = it => ({ essence: 3, gold: Math.round(60 * Math.pow(1.1, it.ilvl)) });
const respecCost = lvl => Math.round(40 * Math.pow(1.12, lvl));

// ---------- STATS ----------
function computeStats(hero, equip) {
  const C = CLASSES[hero.cls], lvl = hero.level, P = hero.passives || {};
  const spec = hero.spec != null ? C.specs[hero.spec].mods : {};
  const s = {
    life: C.life + C.lifePer * (lvl - 1), armor: C.armor + C.armorPer * (lvl - 1), regen: C.regen * (1 + 0.06 * (lvl - 1)),
    fireRes: C.fireRes, lifeOnHit: 0, thorns: 0, critChance: 5 + C.crit, critMulti: 150, atkSpd: 0, dmgPct: 0, goldFind: 0,
    physFlat: 0, fireFlat: 0, spellPct: 0, cdr: 0, dodge: 0, armorPen: 0, specials: {}, pmods: {}, itemSpells: []
  };
  let wType = 'phys', wDmg = 3, interval = 1.5;
  for (const slot of SLOTS) {
    const it = equip[slot]; if (!it) continue;
    const m = plusMult(it);
    if (slot === 'weapon') { const W = WEAPONS[it.base]; wType = W.type; wDmg = it.dmg * W.mult * m; interval = W.interval; }
    if (it.armor) s.armor += it.armor * m;
    if (it.life) s.life += it.life * m;
    for (const [k, v] of it.affixes) s[k] += AFFIXES[k].pct ? v : v * m;
    if (it.special) s.specials[it.special] = true;
    if (it.pmod) s.pmods[it.pmod] = true;
    if (it.spell && !s.itemSpells.includes(it.spell)) s.itemSpells.push(it.spell);
  }
  // spec + passives
  s.atkSpd += (spec.atkSpd || 0) + 1.5 * (P.swiftness || 0);
  s.critChance += (spec.critChance || 0) + 0.6 * (P.precision || 0);
  s.critMulti += (spec.critMulti || 0) + 3 * (P.precision || 0);
  s.fireRes += (spec.fireRes || 0) + 0.5 * (P.bulwark || 0);
  s.dodge += spec.dodge || 0;
  s.armorPen += spec.armorPen || 0;
  s.cdr += spec.cdr || 0;
  s.life *= (1 + (spec.lifeMore || 0)) * (1 + 0.03 * (P.vitality || 0));
  s.armor *= (1 + (spec.armorMore || 0)) * (1 + 0.03 * (P.bulwark || 0));
  s.regen *= 1 + (spec.regenMore || 0);
  s.lifeOnHit *= 1 + (spec.lifeOnHitMore || 0);
  const levelMult = 1 + 0.03 * (lvl - 1);
  const mult = levelMult * (1 + s.dmgPct / 100) * (1 + (spec.dmgMore || 0)) * (1 + 0.02 * (P.might || 0));
  s.phys = ((wType === 'phys' ? wDmg : 0) + s.physFlat) * mult;
  s.fire = ((wType === 'fire' ? wDmg : 0) + s.fireFlat) * mult;
  if (s.specials.emberheart) { s.fire += s.phys; s.phys = 0; }
  if (s.specials.tithe) { s.lifeOnHit *= 3; s.life *= 0.75; }
  if (s.specials.bulwark) s.thorns += 0.6 * s.armor;
  s.thorns *= levelMult * (1 + (spec.thornsMore || 0));
  s.spellMore = (1 + s.spellPct / 100) * (1 + (spec.spellMore || 0)) * (1 + 0.03 * (P.sorcery || 0));
  s.dotMore = (1 + (spec.dotMore || 0)) * (1 + 0.03 * (P.sorcery || 0));
  s.companionMore = 1 + (spec.companionMore || 0);
  s.interval = interval / (1 + s.atkSpd / 100) * (s.pmods.heavy ? 1.35 : 1);
  s.fireRes = Math.min(75, s.fireRes);
  s.critChance = Math.min(75, s.critChance);
  s.dodge = Math.min(50, s.dodge);
  s.cdr = Math.min(40, s.cdr);
  s.wType = wType;
  s.life = Math.round(s.life);
  s.primary = C.primary;
  return s;
}

// Spells the character can put on the bar right now.
function availableSpells(g) {
  const out = [];
  if (g.hero.level >= CLASS_SPELL_LEVEL) out.push(CLASSES[g.hero.cls].spell);
  for (const k of g.stats.itemSpells) if (!out.includes(k)) out.push(k);
  return out;
}
// Recompute everything derived from build state, and keep the bar valid.
function refresh(g) {
  g.stats = computeStats(g.hero, g.equip);
  const av = availableSpells(g);
  const bar = g.bar;
  bar.off = bar.off.map(k => (k && av.includes(k) && SPELLS[k].kind === 'off') ? k : null);
  bar.util = bar.util.map(u => (u && av.includes(u.k) && SPELLS[u.k].kind === 'util') ? u : null);
  // auto-slot newly available spells into empty slots (once)
  g.slotted = g.slotted || {};
  for (const k of av) {
    if (g.slotted[k] || bar.off.includes(k) || bar.util.some(u => u && u.k === k)) { g.slotted[k] = true; continue; }
    if (SPELLS[k].kind === 'off') { const i = bar.off.indexOf(null); if (i >= 0) { bar.off[i] = k; g.slotted[k] = true; } }
    else { const i = bar.util.indexOf(null); if (i >= 0) { bar.util[i] = { k, cond: SPELLS[k].cond }; g.slotted[k] = true; } }
  }
  for (const k of Object.keys(g.slotted)) if (!av.includes(k)) delete g.slotted[k];
  g.cast = [...bar.off.filter(Boolean).map(k => ({ k, cond: null })), ...bar.util.filter(Boolean).map(u => ({ k: u.k, cond: u.cond }))];
}

// ---------- COMBAT ----------
function spawnMonster(key, level) {
  const M = mdef(key), gr = monG(level), tf = ZONES[M.zone].tough;
  return { key, level, hp: M.hp * gr * tf, max: M.hp * gr * tf, dmg: M.dmg * gr * tf, armor: M.armor * gr * tf, interval: M.interval,
    fireRes: M.fireRes, regenPct: M.regenPct, evade: M.evade || 0, burnDps: 0, burnUntil: 0, bleedDps: 0, bleedUntil: 0, next: 0, stacks: 0 };
}
const afterArmor = (hit, armor) => Math.max(hit * 0.25, hit - armor);
function newFight(t) { return { hp: null, mon: null, pNext: t, pulseNext: t + PULSE, respawnAt: t, deadUntil: 0, cd: {}, shield: 0, buffs: {} }; }

function condMet(cond, g) {
  const f = g.fight, S = g.stats, hp = f.hp / S.life;
  if (cond === 'hp70') return hp < 0.7;
  if (cond === 'hp50') return hp < 0.5;
  if (cond === 'hp30') return hp < 0.3;
  if (cond === 'foeHigh') return f.mon && f.mon.hp / f.mon.max > 0.7;
  return true;
}

function advance(g, tEnd, out, log) {
  if (!g.stats || !g.cast) refresh(g);
  const f = g.fight, r = g.rng;
  if (f.hp == null) f.hp = g.stats.life;
  f.cd = f.cd || {}; f.buffs = f.buffs || {};
  let guard = 0;
  while (++guard < 5e6) {
    const S = g.stats;
    let tn = Infinity, ev = '', sp = null;
    if (f.deadUntil > g.t) { tn = f.deadUntil; ev = 'revive'; }
    else if (!f.mon) { tn = f.respawnAt; ev = 'spawn'; }
    else {
      tn = f.pNext; ev = 'patk';
      if (f.mon.next < tn) { tn = f.mon.next; ev = 'matk'; }
      if (f.pulseNext < tn) { tn = f.pulseNext; ev = 'pulse'; }
      for (const c of g.cast) { const ready = f.cd[c.k] || 0; if (ready < tn) { tn = ready; ev = 'spell'; sp = c; } }
    }
    if (tn > tEnd) { g.t = tEnd; break; }
    g.t = Math.max(g.t, tn);
    if (ev === 'revive') {
      f.hp = S.life; f.respawnAt = g.t; f.deadUntil = 0; f.shield = 0; f.buffs = {};
      log && log('You rise again.', 'sys');
    } else if (ev === 'spawn') {
      const tg = g.target;
      f.mon = spawnMonster(tg.key, tg.level);
      f.mon.next = g.t + f.mon.interval * 0.7;
      f.pNext = Math.max(f.pNext, g.t + 0.15);
      for (const c of g.cast) if ((f.cd[c.k] || 0) < g.t) f.cd[c.k] = g.t + 0.3;
      f.pulseNext = g.t + PULSE;
    } else if (ev === 'patk') {
      primaryAttack(g, out, log);
      f.pNext = g.t + S.interval;
    } else if (ev === 'spell') {
      castSpell(g, sp, out, log);
    } else if (ev === 'matk') {
      monsterAttack(g, out, log);
    } else if (ev === 'pulse') {
      pulse(g, out, log);
    }
  }
}

// One damage instance against the current foe. type: weapon | phys | fire | rift
function strike(g, o, out, log) {
  const S = g.stats, f = g.fight, m = f.mon, r = g.rng;
  if (!m) return 0;
  if (o.evadable !== false && m.evade && rand(r) * 100 < m.evade) { return 0; }
  const crit = o.forceCrit || rand(r) * 100 < S.critChance;
  const v = rr(r, 0.85, 1.15) * o.mult * (crit ? S.critMulti / 100 : 1) * (f.buffs.warcry > g.t ? 1.3 : 1);
  let ph = S.phys * v, fi = S.fire * v;
  if (o.conv) { fi += ph * o.conv; ph *= 1 - o.conv; }
  if (o.type === 'phys') { ph += fi; fi = 0; } else if (o.type === 'fire') { fi += ph; ph = 0; }
  const raw = ph + fi;
  let dealt;
  if (o.type === 'rift') dealt = raw;
  else {
    const pen = Math.min(0.9, S.armorPen + (o.pen || 0));
    ph = o.ignoreArmor || ph <= 0 ? ph : afterArmor(ph, m.armor * (1 - pen));
    fi = fi * (1 - m.fireRes / 100);
    dealt = ph + fi;
  }
  if (o.primary && S.pmods.momentum) dealt *= 1 + 0.1 * m.stacks;
  m.hp -= dealt; out.dmgDealt += dealt;
  if (o.onHit !== false && S.lifeOnHit) f.hp = Math.min(S.life, f.hp + S.lifeOnHit);
  if (o.primary && S.pmods.siphon) f.hp = Math.min(S.life, f.hp + dealt * 0.04);
  if (o.burn) applyBurn(g, raw * o.burn * S.dotMore, o.burnDur || 3);
  if (o.primary && S.pmods.searing) applyBurn(g, raw * 0.25 * S.dotMore, 3);
  if (S.specials.kindling && o.onHit !== false) applyBurn(g, raw * 0.4 * S.dotMore, 3);
  if (o.bleed) { m.bleedDps = Math.max(m.bleedUntil > g.t ? m.bleedDps : 0, raw * o.bleed * S.dotMore); m.bleedUntil = g.t + o.bleedDur; }
  if (o.label && log) log(`${o.label}${crit ? ' (crit)' : ''} for ${fmt(dealt)}`, 'skill');
  return dealt;
}
function applyBurn(g, dps, dur) {
  const m = g.fight.mon; if (!m) return;
  m.burnDps = Math.max(m.burnUntil > g.t ? m.burnDps : 0, dps);
  m.burnUntil = Math.max(m.burnUntil, g.t + dur);
}

function primaryAttack(g, out, log) {
  const S = g.stats, P = S.primary, f = g.fight;
  const base = P.mult * (S.pmods.heavy ? 1.75 : 1);
  for (let i = 0; i < P.hits && f.mon; i++) strike(g, { mult: base, conv: P.conv, primary: true, pen: S.pmods.rending ? 0.5 : 0 }, out);
  if (S.pmods.split && f.mon) strike(g, { mult: base * 0.4, conv: P.conv, primary: true, pen: S.pmods.rending ? 0.5 : 0 }, out);
  if (f.mon) { if (S.pmods.momentum) f.mon.stacks = Math.min(5, f.mon.stacks + 1); if (f.mon.hp <= 0) killMonster(g, out, log); }
}

function castSpell(g, c, out, log) {
  const S = g.stats, f = g.fight, sp = SPELLS[c.k];
  if (c.cond && !condMet(c.cond, g)) { f.cd[c.k] = g.t + 0.5; return; }
  f.cd[c.k] = g.t + sp.cd * (1 - S.cdr / 100);
  const times = sp.kind === 'off' && S.specials.echo ? 2 : 1;
  const sm = S.spellMore, conv = S.primary.conv;
  for (let i = 0; i < times; i++) {
    if (!f.mon) break;
    switch (c.k) {
      case 'sunder': strike(g, { mult: 2.5 * sm, conv, ignoreArmor: true, label: 'Sunder' }, out, log); break;
      case 'consecrate': strike(g, { mult: 1.6 * sm, type: 'fire', label: 'Consecrate' }, out, log); f.hp = Math.min(S.life, f.hp + S.life * 0.08); break;
      case 'ignite': strike(g, { mult: 1.2 * sm, conv: 1, burn: 0.8, burnDur: 4, label: 'Ignite' }, out, log); break;
      case 'hawk': f.buffs.hawk = g.t + 9; log && i === 0 && log('Hawk Talon: a hawk joins the hunt.', 'skill'); break;
      case 'eviscerate': strike(g, { mult: 2.2 * sm, forceCrit: true, label: 'Eviscerate' }, out, log); break;
      case 'cinderburst': strike(g, { mult: 2.0 * sm, type: 'fire', burn: 0.6, burnDur: 3, label: 'Cinderburst' }, out, log); break;
      case 'emberrain': strike(g, { mult: 3.8 * sm, type: 'fire', label: 'Ember Rain', onHit: false }, out, log); break;
      case 'scarlance': strike(g, { mult: 2.8 * sm, type: 'phys', ignoreArmor: true, label: 'Scar Lance' }, out, log); break;
      case 'rend': strike(g, { mult: 0.3 * sm, type: 'phys', bleed: 0.55 / 0.3, bleedDur: 6, label: 'Rend' }, out, log); break;
      case 'riftbolt': strike(g, { mult: 1.3 * sm, type: 'rift', evadable: false, label: 'Riftbolt' }, out, log); break;
      case 'voidmaw': strike(g, { mult: 4.2 * sm, type: 'rift', evadable: false, label: 'Void Maw', onHit: false }, out, log); break;
      case 'barrier': f.shield = Math.max(f.shield, S.life * 0.25); log && log('Rift Barrier raised.', 'skill'); break;
      case 'mend': f.hp = Math.min(S.life, f.hp + S.life * 0.3); log && log('Mend.', 'skill'); break;
      case 'warcry': f.buffs.warcry = g.t + 6; log && log('War Cry!', 'skill'); break;
      case 'ashward': f.buffs.ashward = g.t + 6; break;
    }
  }
  if (f.mon && f.mon.hp <= 0) killMonster(g, out, log);
}

function monsterAttack(g, out, log) {
  const S = g.stats, f = g.fight, m = f.mon, r = g.rng, M = mdef(m.key);
  m.next = g.t + m.interval;
  if (S.dodge && rand(r) * 100 < S.dodge) return;
  const ward = f.buffs.ashward > g.t;
  let d = m.dmg * rr(r, 0.85, 1.15);
  d = M.dmgType === 'phys' ? afterArmor(d, S.armor * (ward ? 1.5 : 1)) : d * (1 - Math.min(85, S.fireRes + (ward ? 25 : 0)) / 100);
  if (f.shield > 0) { const a = Math.min(f.shield, d); f.shield -= a; d -= a; }
  f.hp -= d; out.dmgTaken += d;
  if (S.thorns > 0) {
    let th = S.thorns;
    if (S.specials.gravebound && rand(r) * 100 < S.critChance) th *= S.critMulti / 100;
    th = afterArmor(th, m.armor);
    m.hp -= th; out.dmgDealt += th;
    if (S.specials.gravebound) f.hp = Math.min(S.life, f.hp + th * 0.3);
  }
  if (f.hp <= 0) { die(g, out, log); return; }
  if (m.hp <= 0) killMonster(g, out, log);
}

function pulse(g, out, log) {
  const S = g.stats, f = g.fight, m = f.mon;
  f.pulseNext = g.t + PULSE;
  f.hp = Math.min(S.life, f.hp + S.regen * PULSE);
  if (m.burnUntil > g.t - PULSE + 1e-9) { const b = m.burnDps * PULSE * (1 - m.fireRes / 100); m.hp -= b; out.dmgDealt += b; }
  if (m.bleedUntil > g.t - PULSE + 1e-9) { const b = m.bleedDps * PULSE; m.hp -= b; out.dmgDealt += b; }
  if (f.buffs.hawk > g.t) strike(g, { mult: 0.4 * S.companionMore * S.spellMore, onHit: false }, out);
  if (m.hp > 0 && m.regenPct) m.hp = Math.min(m.max, m.hp + m.max * m.regenPct * PULSE);
  if (f.mon && f.mon.hp <= 0) killMonster(g, out, log);
}

function die(g, out, log) {
  const f = g.fight;
  f.hp = 0; f.mon = null; f.deadUntil = g.t + RECOVERY; f.shield = 0;
  out.deaths++; g.life.deaths++;
  if (g.boss) return;
  log && log(`Slain by the ${mdef(g.target.key).name}. Recovering for ${RECOVERY}s.`, 'death');
  g.recentDeaths = (g.recentDeaths || []).filter(t => g.t - t < 300);
  g.recentDeaths.push(g.t);
  g.streak = 0;
  const minL = ZONES[mdef(g.target.key).zone].minLevel;
  if (g.autoPush && g.recentDeaths.length >= 2 && g.target.level > minL) {
    g.target.level--; g.recentDeaths = [];
    log && log(`Auto-push: dropping to level ${g.target.level}.`, 'sys');
  }
}

function notice(g, key) { g.seen = g.seen || {}; if (g.seen[key]) return; g.seen[key] = true; (g.notices = g.notices || []).push(key); }

function killMonster(g, out, log) {
  const f = g.fight, m = f.mon; if (!m) return;
  const M = mdef(m.key), S = g.stats, r = g.rng, Z = ZONES[M.zone];
  f.mon = null; f.respawnAt = g.t + RESPAWN;
  out.kills++;
  if (g.boss) return; // boss sims resolve rewards separately
  const gap = g.hero.level - m.level - 12;
  const xp = Math.round(8 * Math.pow(1.12, m.level - 1) * M.xp * Z.reward * (gap > 0 ? Math.max(0.05, 1 - gap * 0.12) : 1));
  const gold = Math.round(3 * Math.pow(1.12, m.level - 1) * M.gold * Z.reward * rr(r, 0.8, 1.2) * (1 + S.goldFind / 100));
  out.xp += xp; out.gold += gold;
  g.life.kills++; g.gold += gold;
  const kk = m.key + ':' + m.level;
  g.kills[kk] = (g.kills[kk] || 0) + 1;
  if (out.killTimes) out.killTimes.push(g.t);
  // materials
  if (rand(r) < (M.zone === 'hollow' ? 0.45 : 0.3)) { const n = M.zone === 'hollow' ? 1 + (rand(r) < 0.4 ? 1 : 0) : 1; g.mats.shards += n; out.shards += n; notice(g, 'shards'); }
  if (M.essence) {
    const ch = M.essence === 'any' ? 0.12 : 0.05;
    if (rand(r) < ch) { const e = M.essence === 'any' ? pick(r, Object.keys(ESSENCES)) : M.essence; g.mats[e]++; out.ess[e] = (out.ess[e] || 0) + 1; notice(g, 'essence'); }
  }
  g.sigilProg = (g.sigilProg || 0) + 1;
  if (g.sigilProg >= SIGIL_KILLS) { g.sigilProg = 0; if (g.sigils < SIGIL_CAP) { g.sigils++; out.sigils++; notice(g, 'boss'); log && log('A Boss Sigil formed.', 'level'); } }
  // unlocks
  const un = g.unlocked;
  if (m.level === un[m.key] && g.kills[kk] >= UNLOCK_KILLS) {
    un[m.key]++;
    log && log(`${M.name} level ${un[m.key]} unlocked.`, 'sys');
    if (M.zone === 'fallfields' && un[m.key] >= HOLLOW_UNLOCK && !g.zones.hollow) { g.zones.hollow = true; notice(g, 'hollow'); log && log('The Ashen Hollow has opened.', 'level'); }
  }
  g.streak = (g.streak || 0) + 1;
  if (g.autoPush && g.streak >= 25 && g.target.level < un[g.target.key]) {
    g.target.level++; g.streak = 0;
    log && log(`Auto-push: moving up to level ${g.target.level}.`, 'sys');
  }
  gainXp(g, xp, out, log);
  if (rand(r) < DROP_CHANCE) receiveItem(g, makeItem(r, pick(r, SLOTS), m.level + Z.ilvlBonus, { zone: M.zone }), out, log);
}

function gainXp(g, xp, out, log) {
  g.hero.xp += xp;
  while (g.hero.xp >= xpToNext(g.hero.level)) {
    g.hero.xp -= xpToNext(g.hero.level); g.hero.level++; out.levels++;
    g.hero.points = (g.hero.points || 0) + 1;
    const oldLife = g.stats.life;
    refresh(g);
    g.fight.hp += g.stats.life - oldLife;
    log && log(`Level ${g.hero.level}.`, 'level');
    notice(g, 'passives');
    if (g.hero.level >= CLASS_SPELL_LEVEL) notice(g, 'bar');
    if (g.hero.level >= SPEC_LEVEL) notice(g, 'spec');
  }
}

function receiveItem(g, it, out, log) {
  if (it.pmod) notice(g, 'pmod');
  if (it.spell) notice(g, 'spellitem');
  const keep = RARITY_RANK[it.rarity] >= RARITY_RANK[g.filter] || it.special || it.spell || (it.pmod && g.keepPmods !== false);
  if (!keep || g.bag.length >= BAG_CAP) {
    const v = salvageValue(it);
    g.gold += v; out.salvaged++; out.salvageGold += v;
    if (!keep) return;
    log && log(`Bag full. Salvaged ${it.name} for ${v} gold.`, 'sys');
    if (RARITY_RANK[it.rarity] >= 2 || it.spell || it.pmod) out.notable.push(it);
    return;
  }
  g.bag.push(it); out.items++;
  if (RARITY_RANK[it.rarity] >= 2 || it.spell || it.pmod) out.notable.push(it);
  log && log(`Found ${it.name} (${it.rarity}, ilvl ${it.ilvl}).`, 'loot:' + it.rarity);
}

function emptyOut() {
  return { kills: 0, xp: 0, gold: 0, deaths: 0, levels: 0, items: 0, salvaged: 0, salvageGold: 0, notable: [], dmgDealt: 0, dmgTaken: 0, shards: 0, ess: {}, sigils: 0 };
}

// ---------- NEW GAME / MIGRATION ----------
function blankState(cls, now, seed) {
  return {
    v: 2, created: now, t: now, rng: { s: (seed >>> 0) || 1 },
    hero: { cls, level: 1, xp: 0, spec: null, points: 0, passives: {} },
    equip: {}, bag: [], gold: 0, mats: { shards: 0, ember: 0, ash: 0, rift: 0 }, filter: 'magic', keepPmods: true,
    zones: { fallfields: true, hollow: false }, target: { key: 'husk', level: 1 },
    unlocked: Object.fromEntries(MONSTER_KEYS.map(k => [k, ZONES[MONSTERS[k].zone].minLevel])),
    bossUnlocked: Object.fromEntries(BOSS_KEYS.map(k => [k, BOSSES[k].minLevel])),
    bar: { off: [null, null, null], util: [null, null] }, slotted: {},
    sigils: 0, sigilProg: 0, lastBoss: null,
    kills: {}, autoPush: true, streak: 0, recentDeaths: [], seen: {}, notices: [],
    life: { kills: 0, deaths: 0, offlineSec: 0, bosses: 0 }
  };
}
function newGame(cls, now, seed) {
  const g = blankState(cls, now, seed);
  const w = makeItem(g.rng, 'weapon', 1, { rarity: 'common', base: CLASSES[cls].startWeapon });
  w.name = 'Rusted ' + WEAPONS[w.base].name;
  g.equip.weapon = w;
  g.fight = newFight(now);
  notice(g, 'start');
  refresh(g);
  return g;
}
function migrate(o) {
  if (o.v === 2) return o;
  if (o.v !== 1) throw new Error('Unknown save version');
  const g = blankState(o.hero.cls, o.t, o.rng.s);
  g.created = o.created; g.rng = o.rng;
  g.hero.level = o.hero.level; g.hero.xp = o.hero.xp; g.hero.points = Math.max(0, o.hero.level - 1);
  g.equip = o.equip; g.bag = o.bag; g.gold = o.gold; g.filter = o.filter; g.target = o.target;
  for (const k in o.unlocked) g.unlocked[k] = o.unlocked[k];
  g.kills = o.kills || {}; g.autoPush = o.autoPush; g.life = Object.assign(g.life, o.life);
  g.fight = newFight(o.t);
  g.seen = { start: true }; g.notices = ['upgraded'];
  if (Math.max(...['husk', 'swarm', 'knight', 'wisp'].map(k => g.unlocked[k])) >= HOLLOW_UNLOCK) g.zones.hollow = true;
  return g;
}

// ---------- PROJECTION ----------
// Simulate `secs` of farming with a cloned build and a fixed seed so two builds face identical luck.
function cloneBuild(g, opts) {
  const c = blankState(g.hero.cls, 0, opts.seed || 987654321);
  c.hero = JSON.parse(JSON.stringify(g.hero));
  if (opts.hero) Object.assign(c.hero, opts.hero);
  c.equip = { ...g.equip, ...(opts.equip || {}) };
  for (const k in c.equip) if (c.equip[k] === null) delete c.equip[k];
  c.bar = JSON.parse(JSON.stringify(opts.bar || g.bar));
  c.slotted = Object.assign({}, g.slotted, opts.autoslot ? {} : Object.fromEntries((availableSpellsFor(c)).map(k => [k, true])));
  c.target = opts.target || { ...g.target };
  c.filter = 'godtouched'; c.autoPush = false;
  for (const k of MONSTER_KEYS) c.unlocked[k] = 9999;
  c.fight = newFight(0);
  c.noLevel = true;
  refresh(c);
  return c;
}
function availableSpellsFor(c) { c.stats = computeStats(c.hero, c.equip); return availableSpells(c); }
function project(g, opts) {
  const secs = opts.secs || 240;
  const c = cloneBuild(g, Object.assign({ autoslot: true }, opts));
  const out = emptyOut();
  c.hero.xp = -1e15; // projections never level up
  advance(c, secs, out);
  const min = secs / 60;
  return { kpm: out.kills / min, gpm: out.gold / min, xpm: out.xp / min, deaths: out.deaths, dps: out.dmgDealt / secs };
}

// ---------- BOSSES (snapshot fights; ordinary farming never stops) ----------
function fightBoss(g, key, level) {
  const seed = Math.floor(rand(g.rng) * 4294967296);
  const c = cloneBuild(g, { seed, target: { key, level }, autoslot: false });
  c.boss = true;
  const out = emptyOut();
  const lines = [];
  const log = (t, k) => { if (lines.length < 400) lines.push({ t: c.t, text: t, kind: k }); };
  let t = 0;
  while (t < BOSS_TIME) { t += 1; advance(c, t, out, log); if (out.kills || out.deaths) break; }
  const bossMax = spawnMonster(key, level).max;
  const left = out.kills ? 0 : (c.fight.mon ? Math.max(0, c.fight.mon.hp) : bossMax);
  return { key, level, win: out.kills > 0, died: out.deaths > 0, time: Math.min(t, BOSS_TIME), pct: 1 - left / bossMax, lines };
}
function bossRewards(g, res, out) {
  const B = BOSSES[res.key], r = g.rng, L = res.level, Z = ZONES[B.zone];
  const items = [];
  const n = 1 + (rand(r) < 0.35 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const rar = rand(r) < 0.18 ? 'godtouched' : 'rare';
    items.push(makeItem(r, pick(r, SLOTS), L + Z.ilvlBonus + 2, { zone: B.zone, rarity: rar }));
  }
  const gold = Math.round(3 * Math.pow(1.12, L - 1) * B.gold);
  const shards = 4 + Math.floor(rand(r) * 4);
  g.gold += gold; g.mats.shards += shards;
  const ess = {};
  if (B.zone === 'hollow') for (const e of Object.keys(ESSENCES)) { const k = 1 + Math.floor(rand(r) * 2); g.mats[e] += k; ess[e] = k; }
  const xp = Math.round(8 * Math.pow(1.12, L - 1) * B.xp);
  gainXp(g, xp, out, null);
  for (const it of items) receiveItem(g, it, out, null);
  if (L === g.bossUnlocked[res.key]) g.bossUnlocked[res.key] += 2;
  g.life.bosses = (g.life.bosses || 0) + 1;
  return { items, gold, shards, ess, xp };
}

// ---------- OFFLINE / CATCH-UP ----------
function catchUp(g, now, log) {
  const out = emptyOut();
  let elapsed = now - g.t;
  if (elapsed <= 0) return { out, elapsed: 0, capped: 0 };
  let capped = 0;
  if (elapsed > OFFLINE_CAP) {
    capped = elapsed - OFFLINE_CAP;
    const shift = now - OFFLINE_CAP - g.t;
    shiftFight(g, shift);
    elapsed = OFFLINE_CAP;
  }
  advance(g, now, out, log);
  return { out, elapsed, capped };
}
// Move all timers forward together when time beyond the offline cap is discarded.
function shiftFight(g, d) {
  const f = g.fight;
  g.t += d; f.pNext += d; f.pulseNext += d; f.respawnAt += d;
  if (f.deadUntil) f.deadUntil += d;
  for (const k in f.cd) f.cd[k] += d;
  for (const k in f.buffs) f.buffs[k] += d;
  if (f.mon) { f.mon.next += d; f.mon.burnUntil += d; f.mon.bleedUntil += d; }
}

if (typeof module !== 'undefined') module.exports = {
  rand, CLASSES, CLASS_KEYS, SPELLS, FOUND_SPELLS, CONDS, PMODS, PASSIVES, PASSIVE_KEYS, SLOTS, SLOT_NAMES, WEAPONS, AFFIXES, SPECIALS,
  RARITIES, RARITY_RANK, ZONES, ZONE_KEYS, MONSTERS, MONSTER_KEYS, BOSSES, BOSS_KEYS, ESSENCES, mdef,
  makeItem, computeStats, refresh, availableSpells, advance, emptyOut, newGame, migrate, project, fightBoss, bossRewards, catchUp,
  xpToNext, upgradeCost, salvageValue, salvageShards, reforgeCost, inscribeCost, respecCost, rollAffix, fmt,
  BAG_CAP, OFFLINE_CAP, SPEC_LEVEL, CLASS_SPELL_LEVEL, SIGIL_KILLS, SIGIL_CAP, HOLLOW_UNLOCK
};
