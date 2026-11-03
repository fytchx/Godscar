// ===== GODSCAR SIM CORE (v3) =====
// One deterministic event simulation drives live play, offline catch-up, item verdicts, scouting and boss fights.
// Every player change goes through ACTIONS (doAction), so a server can run this same file and verify them.
'use strict';
const SIM_VERSION = 4; // bump whenever a change alters simulation results; the server rejects clients on another version
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

// ---------- RNG ----------
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
  if (a >= 1e12) return (v / 1e12).toFixed(1) + 'T';
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 10000) return (v / 1000).toFixed(1) + 'k';
  return d ? (Math.round(v * 10 ** d) / 10 ** d).toFixed(d) : String(Math.round(v));
}

// ---------- DAMAGE TYPES ----------
const TYPES = ['phys', 'fire', 'frost', 'light', 'shadow', 'holy'];
const ELEMS = TYPES.slice(1);
const TYPE_NAMES = { phys: 'physical', fire: 'fire', frost: 'frost', light: 'lightning', shadow: 'shadow', holy: 'holy' };
const TYPE_RULES = {
  phys: 'Reduced by armor.',
  fire: 'Burns: every fire hit sets a burn of 15% of its fire damage per second for 3s.',
  frost: 'Chills: each frost hit slows the foe\'s attacks by 8%, up to 5 stacks, for 3s.',
  light: 'Swingy: lightning damage rolls from 50% to 160%, and shocks the foe to take 10% more damage for 3s.',
  shadow: 'Drains: you heal for 5% of the shadow damage you deal.',
  holy: 'Purifies: 40% more damage to blighted foes, and heals you for 2% of the holy damage you deal.'
};
const ATTRS = ['STR', 'DEX', 'INT'];
const ATTR_RULES = { STR: '+0.3% physical damage and +0.2% life each', DEX: '+0.15% attack speed and +0.03% critical chance each', INT: '+0.3% elemental damage and +0.25% spell damage each' };

// ---------- CLASSES ----------
const CLASSES = {
  warrior: {
    name: 'Warrior', life: 130, lifePer: 15, armor: 4, armorPer: 0.7, regen: 1.2, crit: 0,
    attr: { STR: 8, DEX: 3, INT: 1 }, attrPer: { STR: 2, DEX: 0.5, INT: 0 },
    primary: { name: 'Cleave', hits: 1, mult: 1, conv: null, text: 'Swings your weapon at the foe, forever.' },
    spell: 'sunder', startWeapon: 'sword',
    blurb: 'Heavy armor and a deep life pool. Cleave never stops; Sunder smashes through plate.',
    evo: { name: 'Titan\'s Grip', text: 'Wield a two-handed weapon in your off-hand. It adds 60% of its damage to every primary hit. No shield or tome.' },
    specs: [
      { name: 'Berserker', text: '+20% attack speed, 15% more damage, 15% less armor.', mods: { atkSpd: 20, dmgMore: 0.15, armorMore: -0.15 } },
      { name: 'Juggernaut', text: '25% more life and 25% more armor.', mods: { lifeMore: 0.25, armorMore: 0.25 } },
      { name: 'Warlord', text: '60% more reflect damage and 50% more life regeneration.', mods: { reflectMore: 0.6, regenMore: 0.5 } }
    ]
  },
  paladin: {
    name: 'Paladin', life: 120, lifePer: 14, armor: 3, armorPer: 0.6, regen: 2, crit: 0,
    attr: { STR: 6, DEX: 2, INT: 5 }, attrPer: { STR: 1.5, DEX: 0, INT: 1 },
    primary: { name: 'Smite', hits: 1, mult: 1, conv: { to: 'holy', share: 0.4 }, text: 'Strikes with 40% of its physical damage turned holy.' },
    spell: 'consecrate', startWeapon: 'mace',
    blurb: 'Steady and self-healing. Smite burns blighted foes with holy light; Consecrate damages and mends.',
    evo: { name: 'Death Knight', text: 'Smite turns 40% to shadow instead of holy. Consecrate becomes Death Strike: a 180% shadow hit that heals for 15% of its damage. Holy bonuses stop applying.' },
    specs: [
      { name: 'Templar', text: '20% more armor, +15% to all resistances, 10% more life.', mods: { armorMore: 0.2, allRes: 15, lifeMore: 0.1 } },
      { name: 'Inquisitor', text: '+8% critical chance and +40% critical damage.', mods: { critChance: 8, critMulti: 40 } },
      { name: 'Martyr', text: 'Double life on hit and 15% more life, 5% less damage.', mods: { lifeOnHitMore: 1, lifeMore: 0.15, dmgMore: -0.05 } }
    ]
  },
  sorcerer: {
    name: 'Sorcerer', life: 100, lifePer: 11, armor: 1, armorPer: 0.25, regen: 1.6, crit: 0,
    attr: { STR: 1, DEX: 3, INT: 9 }, attrPer: { STR: 0, DEX: 0.5, INT: 2 },
    primary: { name: 'Firebolt', hits: 1, mult: 1.12, conv: { to: 'fire', share: 1 }, text: 'Hurls fire. All of its damage is fire, whatever you wield.' },
    spell: 'ignite', startWeapon: 'staff',
    blurb: 'Fragile, elemental. Firebolt never stops; Ignite leaves foes burning.',
    evo: { name: 'Tri-Elementalist', text: 'Firebolt cycles fire, frost and lightning, applying burn, chill and shock in turn. 10% less elemental damage.' },
    specs: [
      { name: 'Stormcaller', text: '+25% attack speed.', mods: { atkSpd: 25 } },
      { name: 'Pyromancer', text: '60% more burn and bleed damage.', mods: { dotMore: 0.6 } },
      { name: 'Arcanist', text: '35% more spell damage and 15% faster spell cooldowns.', mods: { spellMore: 0.35, cdr: 15 } }
    ]
  },
  hunter: {
    name: 'Hunter', life: 105, lifePer: 12, armor: 2, armorPer: 0.4, regen: 1.4, crit: 3,
    attr: { STR: 3, DEX: 8, INT: 2 }, attrPer: { STR: 0.5, DEX: 2, INT: 0 },
    primary: { name: 'Quickshot', hits: 1, mult: 1, conv: null, text: 'Looses arrows without pause.' },
    spell: 'hawk', startWeapon: 'bow',
    blurb: 'Precise, with a companion. Quickshot never stops; Hawk Talon summons a hunting hawk.',
    evo: { name: 'Demonbinder', text: 'Hawk Talon becomes Bind Demons: two demons strike for 45% each every second, but each demon hit has an 8% chance to claw you for 3% of your life.' },
    specs: [
      { name: 'Deadeye', text: '+10% critical chance and +30% critical damage.', mods: { critChance: 10, critMulti: 30 } },
      { name: 'Beastmaster', text: 'Your companions deal 80% more damage.', mods: { companionMore: 0.8 } },
      { name: 'Trapper', text: '40% more burn and bleed damage, hits ignore 30% of armor.', mods: { dotMore: 0.4, armorPen: 0.3 } }
    ]
  },
  rogue: {
    name: 'Rogue', life: 95, lifePer: 11, armor: 1.5, armorPer: 0.35, regen: 1.3, crit: 5,
    attr: { STR: 4, DEX: 8, INT: 1 }, attrPer: { STR: 0.5, DEX: 1.5, INT: 0 },
    primary: { name: 'Twin Strike', hits: 2, mult: 0.55, conv: null, text: 'Strikes twice for 55% each. Twice the on-hit effects.' },
    spell: 'eviscerate', startWeapon: 'dagger',
    blurb: 'Fast and lethal. Twin Strike never stops; Eviscerate always lands a critical blow.',
    evo: { name: 'Demon Hunter', text: 'Twin Strike deals shadow damage and 30% more to blighted foes. You lose all dodge.' },
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
// as: damage type the whole hit becomes (null = weapon mix). el: essence needed to inscribe it.
const SPELLS = {
  sunder:     { name: 'Sunder', kind: 'off', cls: 'warrior', cd: 6, text: '250% hit that ignores armor.' },
  consecrate: { name: 'Consecrate', kind: 'off', cls: 'paladin', cd: 7, text: '160% holy hit, and heals you for 8% of your life.' },
  ignite:     { name: 'Ignite', kind: 'off', cls: 'sorcerer', cd: 5, text: '120% fire hit that burns for 80% per second over 4s.' },
  hawk:       { name: 'Hawk Talon', kind: 'off', cls: 'hunter', cd: 9, text: 'A hawk hunts with you for 9s, striking for 40% every second.' },
  eviscerate: { name: 'Eviscerate', kind: 'off', cls: 'rogue', cd: 6, text: '220% hit that is always critical.' },
  cinderburst:{ name: 'Cinderburst', kind: 'off', el: 'fire', cd: 6, text: '200% fire hit that burns for 60% per second over 3s.' },
  emberrain:  { name: 'Ember Rain', kind: 'off', el: 'fire', cd: 10, text: '380% fire damage in one downpour.' },
  frostlance: { name: 'Frost Lance', kind: 'off', el: 'frost', cd: 6, text: '220% frost hit that applies 3 chill stacks.' },
  chainlight: { name: 'Chain Lightning', kind: 'off', el: 'light', cd: 7, text: 'Three 80% lightning strikes.' },
  scarlance:  { name: 'Scar Lance', kind: 'off', el: 'phys', cd: 7, text: '280% physical hit that ignores armor.' },
  rend:       { name: 'Rend', kind: 'off', el: 'phys', cd: 8, text: 'Bleeds the foe for 55% per second over 6s, ignoring armor.' },
  shadowbolt: { name: 'Shadow Bolt', kind: 'off', el: 'shadow', cd: 4, text: '150% shadow hit that cannot be evaded.' },
  voidmaw:    { name: 'Void Maw', kind: 'off', el: 'shadow', cd: 14, text: '420% shadow damage that cannot be evaded.' },
  radiance:   { name: 'Radiance', kind: 'off', el: 'holy', cd: 8, text: '240% holy hit that heals you for 5% of your life.' },
  barrier:    { name: 'Rift Barrier', kind: 'util', el: 'shadow', cd: 15, text: 'A shield that absorbs damage equal to 25% of your life.', cond: 'hp50' },
  mend:       { name: 'Mend', kind: 'util', el: 'holy', cd: 12, text: 'Heal 30% of your life.', cond: 'hp50' },
  warcry:     { name: 'War Cry', kind: 'util', el: 'phys', cd: 16, text: '30% more damage for 6s.', cond: 'foeHigh' },
  frostward:  { name: 'Frost Ward', kind: 'util', el: 'frost', cd: 18, text: '50% more armor and +25% to all resistances for 6s.', cond: 'always' }
};
const FOUND_SPELLS = ['cinderburst', 'emberrain', 'frostlance', 'chainlight', 'scarlance', 'rend', 'shadowbolt', 'voidmaw', 'radiance', 'barrier', 'mend', 'warcry', 'frostward'];
const CONDS = { always: 'Whenever ready', hp70: 'Life below 70%', hp50: 'Life below 50%', hp30: 'Life below 30%', foeHigh: 'Foe above 70% life' };
const CLASS_SPELL_LEVEL = 3;

// ---------- PASSIVES ----------
const PASSIVES = {
  might: { name: 'Might', text: '+2% damage' }, vitality: { name: 'Vitality', text: '+3% life' },
  swiftness: { name: 'Swiftness', text: '+1.5% attack speed' }, precision: { name: 'Precision', text: '+0.6% crit chance, +3% crit damage' },
  bulwark: { name: 'Bulwark', text: '+3% armor, +0.5% all resistances' }, sorcery: { name: 'Sorcery', text: '+3% spell, burn and bleed damage' }
};
const PASSIVE_KEYS = Object.keys(PASSIVES);

// ---------- SLOTS & BASES ----------
const EQUIP = ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'belt', 'legs', 'boots', 'ring1', 'ring2', 'amulet'];
const DROP_SLOTS = ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'belt', 'legs', 'boots', 'ring', 'amulet'];
const ARMOR_SLOTS = ['helm', 'chest', 'gloves', 'legs', 'boots'];
const SLOT_NAMES = { weapon: 'Weapon', offhand: 'Off-hand', helm: 'Helm', chest: 'Chest', gloves: 'Gloves', belt: 'Belt', legs: 'Legs', boots: 'Boots', ring: 'Ring', ring1: 'Ring', ring2: 'Ring', amulet: 'Amulet' };
const slotOf = k => (k === 'ring1' || k === 'ring2') ? 'ring' : k;
const WEAPONS = {
  sword:    { name: 'Sword', type: 'phys', mult: 1.0, interval: 1.3, hands: 1 },
  mace:     { name: 'Mace', type: 'holy', mult: 0.95, interval: 1.35, hands: 1 },
  dagger:   { name: 'Dagger', type: 'phys', mult: 0.62, interval: 0.85, hands: 1 },
  wand:     { name: 'Wand', type: 'fire', mult: 0.58, interval: 0.8, hands: 1 },
  rod:      { name: 'Frost Rod', type: 'frost', mult: 0.9, interval: 1.25, hands: 1 },
  greataxe: { name: 'Greataxe', type: 'phys', mult: 1.8, interval: 2.1, hands: 2 },
  scythe:   { name: 'Scythe', type: 'shadow', mult: 1.7, interval: 2.0, hands: 2 },
  spear:    { name: 'Storm Spear', type: 'light', mult: 1.45, interval: 1.7, hands: 2 },
  staff:    { name: 'Staff', type: 'fire', mult: 1.05, interval: 1.4, hands: 2 },
  bow:      { name: 'Bow', type: 'phys', mult: 1.15, interval: 1.55, hands: 2, bow: true }
};
const OFFHANDS = {
  tome:   { name: 'Spell Tome', base: 'spell', text: v => `+${fmt(v)}% spell damage` },
  shield: { name: 'Shield', base: 'reflect', text: v => `${fmt(v)} reflect damage` },
  quiver: { name: 'Quiver', base: 'companion', text: v => `+${fmt(v)}% companion damage`, bowOnly: true }
};
const DEF_BASE = { helm: 3, chest: 6, gloves: 2, belt: 2, legs: 4, boots: 2 };
const gearG = ilvl => Math.pow(1.105, ilvl - 1);
const monG = lvl => Math.pow(1.155, lvl - 1);

// ---------- AFFIXES ----------
const ALL_BUT_WEAPON = ['offhand', 'helm', 'chest', 'gloves', 'belt', 'legs', 'boots', 'ring', 'amulet'];
const AFFIXES = {};
for (const t of TYPES) AFFIXES['flat_' + t] = { label: v => `+${fmt(v)} ${TYPE_NAMES[t]} damage to attacks`, slots: ['weapon', 'gloves', 'ring', 'amulet'], roll: (r, g) => rr(r, 1.5, 3) * g, scales: 1 };
for (const t of ELEMS) AFFIXES['res_' + t] = { label: v => `+${fmt(v)}% ${TYPE_NAMES[t]} resistance`, slots: ['helm', 'chest', 'belt', 'legs', 'boots', 'ring', 'amulet', 'offhand'], roll: r => rr(r, 8, 18), pct: 1 };
for (const a of ATTRS) AFFIXES['attr_' + a] = { label: v => `+${fmt(v)} ${a}`, slots: ALL_BUT_WEAPON, roll: (r, g, il) => rr(r, 2, 4) + il * 0.2 };
Object.assign(AFFIXES, {
  dmgPct:    { label: v => `+${fmt(v)}% damage`, slots: ['weapon', 'ring', 'amulet'], pct: 1, roll: r => rr(r, 8, 20) },
  elemPct:   { label: v => `+${fmt(v)}% elemental damage`, slots: ['weapon', 'ring', 'amulet', 'offhand', 'gloves'], pct: 1, roll: r => rr(r, 8, 20) },
  atkSpd:    { label: v => `+${fmt(v)}% haste`, slots: ['weapon', 'gloves', 'ring', 'belt'], pct: 1, roll: r => rr(r, 5, 12) },
  critChance:{ label: v => `+${fmt(v)}% critical chance`, slots: ['weapon', 'helm', 'ring', 'amulet', 'gloves'], pct: 1, roll: r => rr(r, 3, 7) },
  critMulti: { label: v => `+${fmt(v)}% critical damage`, slots: ['weapon', 'gloves', 'amulet', 'ring'], pct: 1, roll: r => rr(r, 15, 35) },
  life:      { label: v => `+${fmt(v)} life`, slots: ['helm', 'chest', 'belt', 'legs', 'boots', 'ring', 'amulet', 'offhand'], roll: (r, g) => rr(r, 10, 20) * g, scales: 1 },
  armor:     { label: v => `+${fmt(v)} armor`, slots: ['helm', 'chest', 'gloves', 'belt', 'legs', 'boots', 'offhand'], roll: (r, g) => rr(r, 2, 4) * g, scales: 1 },
  regen:     { label: v => `+${fmt(v, 1)} life per second`, slots: ['helm', 'chest', 'belt', 'legs', 'amulet'], roll: (r, g) => rr(r, 0.6, 1.2) * g, scales: 1 },
  lifeOnHit: { label: v => `+${fmt(v, 1)} life on hit`, slots: ['weapon', 'gloves', 'ring'], roll: (r, g) => rr(r, 0.8, 1.8) * g, scales: 1 },
  reflect:   { label: v => `+${fmt(v)} reflect damage`, slots: ['helm', 'chest', 'legs', 'boots', 'amulet', 'offhand'], roll: (r, g) => rr(r, 2, 4) * g, scales: 1 },
  spellPct:  { label: v => `+${fmt(v)}% spell damage`, slots: ['weapon', 'helm', 'amulet', 'ring', 'offhand'], pct: 1, roll: r => rr(r, 10, 22) },
  cdr:       { label: v => `${fmt(v)}% faster spell cooldowns`, slots: ['helm', 'amulet', 'belt'], pct: 1, roll: r => rr(r, 3, 7) },
  dodge:     { label: v => `+${fmt(v)}% dodge`, slots: ['boots', 'legs', 'gloves'], pct: 1, roll: r => rr(r, 2, 5) },
  goldFind:  { label: v => `+${fmt(v)}% gold found`, slots: ['helm', 'boots', 'ring', 'amulet', 'belt'], pct: 1, roll: r => rr(r, 10, 25) }
});

// ---------- ENCHANTS (Epic and above) ----------
const ENCHANTS = {
  elemDmg:    { name: 'Elemental', label: v => `Enchant: +${fmt(v)}% elemental damage`, roll: r => rr(r, 18, 30) },
  atkSpd:     { name: 'Hasted', label: v => `Enchant: +${fmt(v)}% attack speed`, roll: r => rr(r, 10, 16) },
  atkDmg:     { name: 'Honed', label: v => `Enchant: +${fmt(v)}% primary attack damage`, roll: r => rr(r, 15, 25) },
  doubleCast: { name: 'Echoing', label: v => `Enchant: ${fmt(v)}% chance your primary attack happens twice`, roll: r => rr(r, 8, 15) }
};
const ENCHANT_TIER = { epic: 1, legendary: 1.3, ascended: 1.5 };

// ---------- AUGMENTS (Legendary) ----------
// Each augment is one rule from a small set of families (convert, trigger, repeat, scale, condition, trade-off).
const AUGMENTS = {
  split:     { name: 'Splitting', fam: 'repeat', text: 'Your primary strikes again for 40%.' },
  searing:   { name: 'Searing', fam: 'trigger', text: 'Your primary burns for 25% of its hit per second over 3s.' },
  heavy:     { name: 'Crushing', fam: 'trade-off', text: 'Your primary is 35% slower but hits 75% harder.' },
  rending:   { name: 'Rending', fam: 'condition', text: 'Your primary ignores 50% of armor.' },
  siphon:    { name: 'Siphoning', fam: 'trigger', text: 'Your primary heals you for 4% of the damage it deals.' },
  momentum:  { name: 'Momentum', fam: 'condition', text: 'Each primary hit on the same foe deals 10% more, up to 5 stacks.' },
  echo:      { name: 'Wound-Echo', fam: 'repeat', text: 'Your offensive spells strike twice.' },
  kindling:  { name: 'Scar Kindling', fam: 'trigger', text: 'Every hit burns the foe for 40% of its damage per second over 3s.' },
  bulwark:   { name: 'Bulwark of Caldris', fam: 'scale', text: 'Gain reflect damage equal to 60% of your armor.' },
  tithe:     { name: 'Bloodtithe', fam: 'trade-off', text: 'Life on hit is tripled. 25% less maximum life.' },
  critcast:  { name: 'Riftspark', fam: 'trigger', text: 'Critical hits cast your first utility spell, at most once every 4s, ignoring its condition.' },
  strspell:  { name: 'Brute Sorcery', fam: 'scale', text: 'Each point of STR also gives +0.25% spell damage.' },
  shielded:  { name: 'Aegis Fury', fam: 'condition', text: '40% more damage while you have a shield.' },
  glass:     { name: 'Glass Oath', fam: 'trade-off', text: '30% more damage, 25% less life.' },
  frostbite: { name: 'Frostbite', fam: 'condition', text: 'Chilled foes take 20% more damage.' }
};
for (const t of ELEMS) AUGMENTS['conv_' + t] = { name: { fire: 'Ember Heart', frost: 'Rime Heart', light: 'Storm Heart', shadow: 'Void Heart', holy: 'Dawn Heart' }[t], fam: 'convert', text: `Half your physical damage becomes ${TYPE_NAMES[t]}.` };

// ---------- ASCENDED SETS (universal, armor slots) ----------
const SETS = {
  warden:     { name: 'Wardens of Caldris', b2: '+25% armor and reflect damage.', b4: 'Reflect damage becomes frost and chills the attacker for 2 stacks.' },
  vigil:      { name: 'Ashen Vigil', b2: '+20% fire and holy damage.', b4: 'Your burns heal you for 10% of the damage they deal.' },
  riftwalker: { name: 'Riftwalker', b2: '+20% spell damage.', b4: 'Offensive spells have a 25% chance to stay ready after casting.' },
  hunt:       { name: 'Scarbound Hunt', b2: '+30% companion damage.', b4: 'Companion hits shock the foe: it takes 15% more damage for 3s.' }
};
const ASC_MATS = { helm: 'graveiron', chest: 'cinderheart', gloves: 'houndsinew', legs: 'zealotash', boots: 'shadesilk' };
const MAT_NAMES = {
  shards: 'Scar Shards', phys: 'Ash Essence', fire: 'Ember Essence', frost: 'Rime Essence', light: 'Storm Essence', shadow: 'Rift Essence', holy: 'Dawn Essence',
  graveiron: 'Grave Iron', cinderheart: 'Cinder Heart', houndsinew: 'Hound Sinew', zealotash: 'Zealot Ash', shadesilk: 'Shade Silk'
};
const ascCost = lvl => Math.ceil(2 * Math.pow(1.22, lvl));

// ---------- RARITIES ----------
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'ascended'];
const RARITY_NAMES = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', ascended: 'Ascended' };
const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, ascended: 5 };
const AFFIX_COUNT = { common: [0, 0], uncommon: [1, 2], rare: [3, 4], epic: [4, 5], legendary: [6, 6], ascended: [6, 6] };

// ---------- ZONES & MONSTERS ----------
const ZONES = {
  fallfields: { name: 'The Fallfields', minLevel: 1, weights: [58, 30, 10.8, 1.1, 0.06], ilvlBonus: 0, reward: 1, tough: 1, spellChance: 0,
    text: 'Blighted farmland where the wound first bled into Caldris.' },
  hollow: { name: 'The Ashen Hollow', minLevel: 20, weights: [30, 40, 25, 4.5, 0.35], ilvlBonus: 4, reward: 1.9, tough: 1.7, spellChance: 0.18,
    text: 'A crater of ash below the Godwound. Stronger items, element essences, and rare items that grant spells.' }
};
const ZONE_KEYS = ['fallfields', 'hollow'];
const HOLLOW_UNLOCK = 20;
const MONSTERS = {
  husk:   { zone: 'fallfields', name: 'Blighted Husk', hp: 75, dmg: 7, interval: 2.0, dmgType: 'phys', armor: 0, res: {}, regenPct: 0.035, blighted: true, xp: 1.0, gold: 1.0,
            note: 'Blighted. Regenerates 3.5% of its life every second. Holy damage purifies it.' },
  swarm:  { zone: 'fallfields', name: 'Carrion Swarm', hp: 30, dmg: 2.4, interval: 0.5, dmgType: 'phys', armor: 0, res: {}, blighted: true, xp: 0.5, gold: 0.5,
            note: 'Blighted. Many tiny bites: armor shrugs them off and reflect punishes every one.' },
  knight: { zone: 'fallfields', name: 'Grave Knight', hp: 90, dmg: 12, interval: 2.0, dmgType: 'phys', armor: 7, res: { frost: 20 }, xp: 1.45, gold: 1.5, mat: 'graveiron',
            note: 'Plate armor subtracts from every physical hit. Elements get through, frost a little less.' },
  wisp:   { zone: 'fallfields', name: 'Hollow Wisp', hp: 42, dmg: 8, interval: 1.3, dmgType: 'fire', armor: 0, res: { fire: 60, light: -25 }, xp: 0.85, gold: 0.9,
            note: 'Burns through armor and resists 60% of fire. Lightning tears it apart.' },
  zealot: { zone: 'hollow', name: 'Ashbound Zealot', hp: 85, dmg: 10, interval: 1.6, dmgType: 'fire', armor: 5, res: { fire: 30, holy: 30 }, xp: 1.4, gold: 1.4, ess: ['fire', 'holy'], mat: 'zealotash',
            note: 'Armored fire-wielder, resists fire and holy. Drops Ember and Dawn Essence.' },
  hound:  { zone: 'hollow', name: 'Blight Hound', hp: 40, dmg: 4, interval: 0.7, dmgType: 'phys', armor: 0, res: { shadow: 20 }, regenPct: 0.02, blighted: true, xp: 0.5, gold: 0.5, ess: ['phys', 'light'], mat: 'houndsinew',
            note: 'Blighted pack hunter that regenerates. Drops Ash and Storm Essence.' },
  shade:  { zone: 'hollow', name: 'Rift Shade', hp: 50, dmg: 9, interval: 1.2, dmgType: 'shadow', armor: 0, res: { shadow: 50, holy: -30 }, evade: 35, xp: 1.0, gold: 1.0, ess: ['shadow', 'frost'], mat: 'shadesilk',
            note: 'Evades 35% of hits and strikes with shadow. Holy and unevadable spells land. Drops Rift and Rime Essence.' },
  colossus:{ zone: 'hollow', name: 'Cinder Colossus', hp: 170, dmg: 22, interval: 3.0, dmgType: 'phys', armor: 10, res: { fire: 40, frost: -20 }, xp: 2.6, gold: 2.8, ess: TYPES, essChance: 0.12, mat: 'cinderheart',
            note: 'Huge and slow behind heavy armor. Frost cracks it. Drops any essence, more often.' }
};
const MONSTER_KEYS = Object.keys(MONSTERS);
const BOSSES = {
  bellkeeper: { zone: 'fallfields', name: 'The Hollow Bellkeeper', hp: 75 * 40, dmg: 17, interval: 2.2, dmgType: 'phys', armor: 4, res: { shadow: 20 }, blighted: true, xp: 12, gold: 15, minLevel: 3,
                note: 'Tolls the dead bell of the Fallfields. Blighted, with heavy blows.' },
  woundwarden:{ zone: 'hollow', name: 'The Woundwarden', hp: 85 * 60, dmg: 19, interval: 1.8, dmgType: 'fire', armor: 8, res: { fire: 35, holy: 35 }, regenPct: 0.005, evade: 10, xp: 18, gold: 22, minLevel: 20,
                note: 'Guardian of the crater. Armored, fire-wielding, slowly mends. The first victory opens Ascension.' }
};
const BOSS_KEYS = Object.keys(BOSSES);
const mdef = key => MONSTERS[key] || BOSSES[key];

const RESPAWN = 0.6, RECOVERY = 12, PULSE = 1, DROP_CHANCE = 0.2, BAG_CAP = 36, OFFLINE_CAP = 24 * 3600, UNLOCK_KILLS = 30;
const SIGIL_KILLS = 150, SIGIL_CAP = 5, BOSS_TIME = 150, PUSH_STREAK = 25;
const xpToNext = lvl => Math.round(70 * Math.pow(1.19, lvl - 1) + 40 * lvl);

// ---------- ITEM GENERATION ----------
function newId(r) { r.n = (r.n || 0) + 1; return 'i' + Math.floor(rand(r) * 1e9).toString(36) + r.n.toString(36); }
function rollRarity(r, w) { let x = rand(r) * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) if ((x -= w.at(i)) < 0) return RARITIES.at(i); return 'common'; }
function rollAffix(r, it, exclude) {
  const pool = Object.keys(AFFIXES).filter(k => AFFIXES[k].slots.includes(it.slot) && !exclude.includes(k));
  if (!pool.length) return null;
  const k = pick(r, pool), A = AFFIXES[k];
  let v = A.roll(r, gearG(it.ilvl), it.ilvl);
  if (A.pct) v *= 1 + it.ilvl * 0.008;
  return [k, v];
}
function makeItem(r, slot, ilvl, opts = {}) {
  const zone = ZONES[opts.zone || 'fallfields'];
  const rarity = opts.rarity || rollRarity(r, zone.weights);
  const g = gearG(ilvl);
  const it = { id: newId(r), slot, ilvl, rarity, plus: 0, affixes: [], augments: [], locked: false, shardsIn: 0 };
  if (slot === 'weapon') { it.base = opts.base || pick(r, Object.keys(WEAPONS)); it.dmg = 7 * g * rr(r, 0.92, 1.08); }
  else if (slot === 'offhand') {
    it.base = opts.base || pick(r, Object.keys(OFFHANDS));
    const B = OFFHANDS[it.base].base;
    it.ohv = B === 'reflect' ? rr(r, 3, 5) * g : rr(r, 15, 30) * (1 + ilvl * 0.008);
  }
  else if (DEF_BASE[slot]) { it.def = DEF_BASE[slot] * g * rr(r, 0.9, 1.1); if (slot === 'chest') it.life = 10 * g; }
  else { it.attr = [pick(r, ATTRS), rr(r, 3, 6) + ilvl * 0.35]; }
  const [a0, a1] = AFFIX_COUNT[rarity];
  const n = Math.round(rr(r, a0, a1));
  for (let i = 0; i < n; i++) { const a = rollAffix(r, it, it.affixes.map(x => x[0])); if (a) it.affixes.push(a); }
  if (RANK[rarity] >= 3) { const k = pick(r, Object.keys(ENCHANTS)); it.enchant = [k, ENCHANTS[k].roll(r) * ENCHANT_TIER[rarity]]; }
  if (rarity === 'legendary') {
    const na = 1 + (rand(r) < 0.45 ? 1 : 0) + (rand(r) < 0.12 ? 1 : 0);
    const pool = Object.keys(AUGMENTS);
    for (let i = 0; i < na; i++) { const k = pick(r, pool.filter(x => !it.augments.includes(x) && !(x.startsWith('conv_') && it.augments.some(y => y.startsWith('conv_'))))); if (k) it.augments.push(k); }
  }
  if (rarity === 'ascended') it.set = opts.set || pick(r, Object.keys(SETS));
  if (slot === 'belt' && (rarity === 'legendary' || rarity === 'ascended') && rand(r) < 0.2) it.socket = true;
  const sc = RANK[rarity] >= 3 ? zone.spellChance * 1.5 : rarity === 'rare' ? zone.spellChance : 0;
  if (sc && rand(r) < sc) it.spell = pick(r, FOUND_SPELLS);
  it.name = itemName(it);
  return it;
}
const PREFIX = ['Ashen', 'Blighted', 'Scarbound', 'Hollow', 'Vigil', 'Riftworn', 'Gravecut', 'Emberlit', 'Oathbroken', 'Fallfield'];
const NOUNS = { helm: ['Helm', 'Visor', 'Hood', 'Crown'], chest: ['Hauberk', 'Robe', 'Cuirass', 'Mantle'], gloves: ['Gauntlets', 'Grips', 'Wraps'],
  belt: ['Girdle', 'Belt', 'Sash'], legs: ['Legguards', 'Greaves', 'Leggings'], boots: ['Sabatons', 'Treads', 'Boots'], ring: ['Ring', 'Band', 'Signet'], amulet: ['Amulet', 'Talisman', 'Relic'] };
function itemName(it) {
  let h = 0; for (const c of it.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const noun = it.slot === 'weapon' ? WEAPONS[it.base].name : it.slot === 'offhand' ? OFFHANDS[it.base].name : NOUNS[it.slot].at(h % NOUNS[it.slot].length);
  if (it.rarity === 'common') return noun;
  if (it.set) return SETS[it.set].name.replace(/^(Wardens of |The )/, '') + ' ' + noun;
  if (it.augments.length) return AUGMENTS[it.augments[0]].name + ' ' + noun;
  if (it.spell) return noun + ' of ' + SPELLS[it.spell].name;
  if (it.enchant) return ENCHANTS[it.enchant[0]].name + ' ' + noun;
  return PREFIX.at((h >>> 4) % PREFIX.length) + ' ' + noun;
}
function makeJewel(r, cls) { return { id: newId(r), cls, pot: Math.round(rr(r, 1, 1.3) * 100) / 100 }; }

// Effective item level: Ascended pieces scale to the slot level.
const effIlvl = (g, it) => it.rarity === 'ascended' ? g.asc.base + 2 * (g.asc.slots[it.slot] || 0) : it.ilvl;
const scaleOf = (g, it) => it.rarity === 'ascended' ? gearG(effIlvl(g, it)) / gearG(it.ilvl) : 1 + 0.1 * (it.plus || 0);
const upgradeCost = it => Math.ceil(3 * Math.pow(1.45, it.plus || 0) * (1 + RANK[it.rarity] * 0.3));
const salvageValue = it => Math.round(4 * Math.pow(1.12, it.ilvl) * (1 + RANK[it.rarity] * 1.5) * (1 + (it.plus || 0) * 0.5));
const salvageShards = it => Math.floor((it.shardsIn || 0) / 2) + (RANK[it.rarity] >= 2 ? RANK[it.rarity] - 1 : 0);
const reforgeCost = it => Math.round(25 * Math.pow(1.12, it.ilvl) * (1 + RANK[it.rarity]));
const inscribeCost = it => ({ essence: 3, gold: Math.round(60 * Math.pow(1.1, it.ilvl)) });
const respecCost = lvl => Math.round(40 * Math.pow(1.12, lvl));
const socketCost = it => ({ gold: Math.round(2500 * Math.pow(1.12, it.ilvl)), essence: 5 });
const unsocketCost = lvl => Math.round(150 * Math.pow(1.1, lvl));
const CRAFT_MULT = { common: [1, 0, 0], uncommon: [2, 2, 0], rare: [5, 6, 0], epic: [15, 20, 2], legendary: [60, 60, 4] };
const craftCost = (rarity, ilvl) => { const [gm, sh, es] = CRAFT_MULT[rarity]; return { gold: Math.round(30 * Math.pow(1.12, ilvl) * gm), shards: sh, essence: es }; };

// ---------- STATS ----------
function jewelOf(g) { const b = g.equip.belt; return b && b.jewel && b.jewel.cls === g.hero.cls ? b.jewel : null; }
function computeStats(g) {
  const hero = g.hero, equip = g.equip, C = CLASSES[hero.cls], lvl = hero.level, P = hero.passives || {};
  const spec = hero.spec != null ? C.specs[hero.spec].mods : {};
  const jw = jewelOf(g);
  const s = {
    life: C.life + C.lifePer * (lvl - 1), armor: C.armor + C.armorPer * (lvl - 1), regen: C.regen * (1 + 0.06 * (lvl - 1)),
    lifeOnHit: 0, reflect: 0, critChance: 5 + C.crit, critMulti: 150, atkSpd: 0, dmgPct: 0, elemPct: 0, goldFind: 0,
    spellPct: 0, cdr: 0, dodge: 0, armorPen: 0, companionPct: 0, atkDmg: 0, doubleCast: 0,
    flat: Object.fromEntries(TYPES.map(t => [t, 0])), res: Object.fromEntries(ELEMS.map(t => [t, 0])),
    attr: {}, aug: {}, sets: {}, itemSpells: [], evo: jw ? hero.cls : null, evoPot: jw ? jw.pot : 0
  };
  for (const a of ATTRS) s.attr[a] = C.attr[a] + C.attrPer[a] * (lvl - 1);
  let wType = C.startWeapon === 'staff' ? 'fire' : 'phys', wDmg = 3, interval = 1.5, ohWeapon = null;
  for (const key of EQUIP) {
    const it = equip[key]; if (!it) continue;
    const m = scaleOf(g, it);
    if (key === 'weapon') { const W = WEAPONS[it.base]; wType = W.type; wDmg = it.dmg * W.mult * m; interval = W.interval; }
    else if (key === 'offhand' && it.slot === 'weapon') ohWeapon = { type: WEAPONS[it.base].type, dmg: it.dmg * WEAPONS[it.base].mult * m };
    else if (it.slot === 'offhand') { const B = OFFHANDS[it.base].base; if (B === 'spell') s.spellPct += it.ohv; else if (B === 'companion') s.companionPct += it.ohv; else s.reflect += it.ohv * m; }
    if (it.def) s.armor += it.def * m;
    if (it.life) s.life += it.life * m;
    if (it.attr) s.attr[it.attr[0]] += it.attr[1];
    for (const [k, v] of it.affixes) {
      const A = AFFIXES[k], val = A.scales ? v * m : v;
      if (k.startsWith('flat_')) s.flat[k.slice(5)] += val;
      else if (k.startsWith('res_')) s.res[k.slice(4)] += val;
      else if (k.startsWith('attr_')) s.attr[k.slice(5)] += val;
      else s[k] += val;
    }
    if (it.enchant) s[it.enchant[0]] = (s[it.enchant[0]] || 0) + it.enchant[1];
    for (const a of it.augments || []) s.aug[a] = true;
    if (it.set) s.sets[it.set] = (s.sets[it.set] || 0) + 1;
    if (it.spell && !s.itemSpells.includes(it.spell)) s.itemSpells.push(it.spell);
  }
  s.set2 = k => (s.sets[k] || 0) >= 2; s.set4 = k => (s.sets[k] || 0) >= 4;
  // attributes
  const STR = s.attr.STR, DEX = s.attr.DEX, INT = s.attr.INT;
  s.atkSpd += (spec.atkSpd || 0) + 1.5 * (P.swiftness || 0) + 0.15 * DEX;
  s.critChance += (spec.critChance || 0) + 0.6 * (P.precision || 0) + 0.03 * DEX;
  s.critMulti += (spec.critMulti || 0) + 3 * (P.precision || 0);
  const allRes = (spec.allRes || 0) + 0.5 * (P.bulwark || 0);
  for (const t of ELEMS) s.res[t] = Math.min(75, s.res[t] + allRes);
  s.dodge = s.evo === 'rogue' ? 0 : Math.min(50, s.dodge + (spec.dodge || 0));
  s.armorPen += spec.armorPen || 0;
  s.cdr = Math.min(40, s.cdr + (spec.cdr || 0));
  s.life *= (1 + (spec.lifeMore || 0)) * (1 + 0.03 * (P.vitality || 0)) * (1 + 0.002 * STR);
  s.armor *= (1 + (spec.armorMore || 0)) * (1 + 0.03 * (P.bulwark || 0)) * (s.set2('warden') ? 1.25 : 1);
  s.regen *= 1 + (spec.regenMore || 0);
  s.lifeOnHit *= 1 + (spec.lifeOnHitMore || 0);
  if (s.aug.tithe) { s.lifeOnHit *= 3; s.life *= 0.75; }
  if (s.aug.glass) s.life *= 0.75;
  // damage: base vector, then conversions, then multipliers per type
  const levelMult = 1 + 0.03 * (lvl - 1);
  const pre = Object.assign({}, s.flat);
  pre[wType] += wDmg;
  if (ohWeapon && s.evo === 'warrior') pre[ohWeapon.type] += ohWeapon.dmg * 0.6 * s.evoPot;
  for (const t of ELEMS) if (s.aug['conv_' + t]) { pre[t] += pre.phys * 0.5; pre.phys *= 0.5; }
  s.pre = pre;
  const global = levelMult * (1 + s.dmgPct / 100) * (1 + (spec.dmgMore || 0)) * (1 + 0.02 * (P.might || 0)) * (s.aug.glass ? 1.3 : 1);
  const elemM = 1 + (s.elemPct + (s.elemDmg || 0)) / 100 + 0.003 * INT;
  s.typeMult = { phys: global * (1 + 0.003 * STR) };
  for (const t of ELEMS) s.typeMult[t] = global * elemM * (s.evo === 'sorcerer' ? 0.9 : 1) * ((t === 'fire' || t === 'holy') && s.set2('vigil') ? 1.2 : 1);
  if (s.evo === 'paladin') s.typeMult.holy = global * elemM * 0.75; // Death Knights lose holy bonuses
  if (s.evo === 'paladin') s.typeMult.shadow *= 1 + 0.15 * s.evoPot;
  s.reflect = (s.reflect + (s.aug.bulwark ? 0.6 * s.armor : 0)) * levelMult * (1 + (spec.reflectMore || 0)) * (s.set2('warden') ? 1.25 : 1);
  s.spellMore = (1 + s.spellPct / 100 + 0.0025 * INT + (s.aug.strspell ? 0.0025 * STR : 0)) * (1 + (spec.spellMore || 0)) * (1 + 0.03 * (P.sorcery || 0)) * (s.set2('riftwalker') ? 1.2 : 1);
  s.dotMore = (1 + (spec.dotMore || 0)) * (1 + 0.03 * (P.sorcery || 0));
  s.companionMore = (1 + (spec.companionMore || 0)) * (1 + s.companionPct / 100) * (s.set2('hunt') ? 1.3 : 1);
  s.interval = interval / (1 + Math.min(300, s.atkSpd) / 100) * (s.aug.heavy ? 1.35 : 1);
  s.critChance = Math.min(75, s.critChance);
  s.doubleCast = Math.min(50, s.doubleCast);
  s.life = Math.round(s.life);
  s.primary = C.primary;
  // nominal per-hit total (for display)
  s.hit = TYPES.reduce((a, t) => a + pre[t] * s.typeMult[t], 0);
  return s;
}
function availableSpells(g) {
  const out = [];
  if (g.hero.level >= CLASS_SPELL_LEVEL) out.push(CLASSES[g.hero.cls].spell);
  for (const k of g.stats.itemSpells) if (!out.includes(k)) out.push(k);
  return out;
}
function refresh(g) {
  g.stats = computeStats(g);
  const av = availableSpells(g), bar = g.bar;
  bar.off = bar.off.map(k => (k && av.includes(k) && SPELLS[k].kind === 'off') ? k : null);
  bar.util = bar.util.map(u => (u && av.includes(u.k) && SPELLS[u.k].kind === 'util') ? u : null);
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
    res: M.res || {}, regenPct: M.regenPct || 0, evade: M.evade || 0, blighted: !!M.blighted,
    burnDps: 0, burnUntil: 0, bleedDps: 0, bleedUntil: 0, chill: 0, chillUntil: 0, shockUntil: 0, shockAmt: 0, next: 0, stacks: 0 };
}
const afterArmor = (hit, armor) => Math.max(hit * 0.25, hit - armor);
function newFight(t) { return { hp: null, mon: null, pNext: t, pulseNext: t + PULSE, respawnAt: t, deadUntil: 0, cd: {}, shield: 0, buffs: {}, cycle: 0, critCastAt: -99 }; }
function condMet(cond, g) {
  const f = g.fight, hp = f.hp / g.stats.life;
  if (cond === 'hp70') return hp < 0.7; if (cond === 'hp50') return hp < 0.5; if (cond === 'hp30') return hp < 0.3;
  if (cond === 'foeHigh') return f.mon && f.mon.hp / f.mon.max > 0.7;
  return true;
}
const chillMult = m => 1 + 0.08 * m.chill;

function advance(g, tEnd, out, log) {
  if (!g.stats || !g.cast) refresh(g);
  const f = g.fight;
  if (f.hp == null) f.hp = g.stats.life;
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
    if (ev === 'revive') { f.hp = S.life; f.respawnAt = g.t; f.deadUntil = 0; f.shield = 0; f.buffs = {}; log && log('You rise again.', 'sys'); }
    else if (ev === 'spawn') {
      f.mon = spawnMonster(g.target.key, g.target.level);
      f.mon.next = g.t + f.mon.interval * 0.7;
      f.pNext = Math.max(f.pNext, g.t + 0.15);
      for (const c of g.cast) if ((f.cd[c.k] || 0) < g.t) f.cd[c.k] = g.t + 0.3;
      f.pulseNext = g.t + PULSE;
    }
    else if (ev === 'patk') { primaryAttack(g, out, log); f.pNext = g.t + S.interval; }
    else if (ev === 'spell') castSpell(g, sp, out, log, false);
    else if (ev === 'matk') monsterAttack(g, out, log);
    else if (ev === 'pulse') pulse(g, out, log);
  }
}

// One damage instance. o.as = whole hit becomes this type; o.conv = {to, share} of physical.
function strike(g, o, out, log) {
  const S = g.stats, f = g.fight, m = f.mon, r = g.rng;
  if (!m) return 0;
  if (o.evadable !== false && m.evade && rand(r) * 100 < m.evade) return 0;
  const crit = o.forceCrit || rand(r) * 100 < S.critChance;
  const v = rr(r, 0.85, 1.15) * o.mult * (crit ? S.critMulti / 100 : 1) * (f.buffs.warcry > g.t ? 1.3 : 1) * (o.primary ? 1 + S.atkDmg / 100 : 1);
  const pk = Object.assign({}, S.pre);
  if (o.conv) { pk[o.conv.to] += pk.phys * o.conv.share; pk.phys *= 1 - o.conv.share; }
  if (o.as) { const tot = TYPES.reduce((a, t) => a + pk[t], 0); for (const t of TYPES) pk[t] = 0; pk[o.as] = tot; }
  let dealt = 0, raw = 0;
  const parts = {};
  for (const t of TYPES) {
    if (pk[t] <= 0) continue;
    let a = pk[t] * S.typeMult[t] * v;
    if (t === 'light') a *= rr(r, 0.5, 1.6) / 1.05;
    raw += a;
    if (o.true) { parts[t] = a; continue; }
    if (t === 'phys') a = o.ignoreArmor ? a : afterArmor(a, m.armor * (1 - Math.min(0.9, S.armorPen + (o.pen || 0))));
    else a *= 1 - (m.res[t] || 0) / 100;
    if (t === 'holy' && m.blighted && S.evo !== 'paladin') a *= 1.4;
    parts[t] = a;
  }
  let mult = 1;
  if (m.shockUntil > g.t) mult *= 1 + m.shockAmt;
  if (S.aug.frostbite && m.chill > 0 && m.chillUntil > g.t) mult *= 1.2;
  if (S.aug.shielded && f.shield > 0) mult *= 1.4;
  if (o.primary && S.aug.momentum) mult *= 1 + 0.1 * m.stacks;
  if (o.blightBonus && m.blighted) mult *= 1 + 0.3 * S.evoPot;
  for (const t in parts) { parts[t] *= mult; dealt += parts[t]; }
  m.hp -= dealt; out.dmgDealt += dealt;
  // type side effects
  if (parts.fire) applyBurn(g, parts.fire * 0.15 * S.dotMore, 3);
  if (parts.frost) { m.chill = Math.min(5, (m.chillUntil > g.t ? m.chill : 0) + (o.chill || 1)); m.chillUntil = g.t + 3; }
  if (parts.light) { m.shockAmt = Math.max(m.shockUntil > g.t ? m.shockAmt : 0, 0.1); m.shockUntil = g.t + 3; }
  if (parts.shadow) f.hp = Math.min(S.life, f.hp + parts.shadow * 0.05);
  if (parts.holy) f.hp = Math.min(S.life, f.hp + parts.holy * 0.02);
  if (o.onHit !== false && S.lifeOnHit) f.hp = Math.min(S.life, f.hp + S.lifeOnHit);
  if (o.primary && S.aug.siphon) f.hp = Math.min(S.life, f.hp + dealt * 0.04);
  if (o.burn) applyBurn(g, raw * o.burn * S.dotMore, o.burnDur || 3);
  if (o.primary && S.aug.searing) applyBurn(g, raw * 0.25 * S.dotMore, 3);
  if (S.aug.kindling && o.onHit !== false) applyBurn(g, raw * 0.4 * S.dotMore, 3);
  if (o.bleed) { m.bleedDps = Math.max(m.bleedUntil > g.t ? m.bleedDps : 0, raw * o.bleed * S.dotMore); m.bleedUntil = g.t + o.bleedDur; }
  if (o.companion && S.set4('hunt')) { m.shockAmt = Math.max(m.shockUntil > g.t ? m.shockAmt : 0, 0.15); m.shockUntil = g.t + 3; }
  if (o.lifesteal) f.hp = Math.min(S.life, f.hp + dealt * o.lifesteal);
  if (o.label && log) log(`${o.label}${crit ? ' (crit)' : ''} for ${fmt(dealt)}`, 'skill');
  // trigger family, guarded: a triggered cast can never trigger again, and fires at most once every 4s
  if (crit && S.aug.critcast && !o.triggered && g.t - f.critCastAt >= 4) {
    const u = g.cast.find(c => SPELLS[c.k].kind === 'util');
    if (u) { f.critCastAt = g.t; castSpell(g, u, out, log, true); }
  }
  return dealt;
}
function applyBurn(g, dps, dur) {
  const m = g.fight.mon; if (!m || dps <= 0) return;
  m.burnDps = Math.max(m.burnUntil > g.t ? m.burnDps : 0, dps);
  m.burnUntil = Math.max(m.burnUntil, g.t + dur);
}
function primaryConv(g) {
  const S = g.stats, P = S.primary, f = g.fight;
  if (S.evo === 'paladin') return { to: 'shadow', share: 0.4 };
  if (S.evo === 'sorcerer') { f.cycle = (f.cycle + 1) % 3; return { to: ['fire', 'frost', 'light'].at(f.cycle), share: 1 }; }
  if (S.evo === 'rogue') return { to: 'shadow', share: 1 };
  return P.conv;
}
function primaryAttack(g, out, log) {
  const S = g.stats, P = S.primary, f = g.fight, r = g.rng;
  const base = P.mult * (S.aug.heavy ? 1.75 : 1), conv = primaryConv(g);
  const o = { mult: base, conv, primary: true, pen: S.aug.rending ? 0.5 : 0, blightBonus: S.evo === 'rogue' };
  // conversions above are for the whole hit; Sorcerer conv share 1 already moves everything off physical only, so move elements too
  const reps = 1 + (S.doubleCast && rand(r) * 100 < S.doubleCast ? 1 : 0); // a repeat never repeats again
  for (let rep = 0; rep < reps && f.mon; rep++) {
    for (let i = 0; i < P.hits && f.mon; i++) strike(g, conv && conv.share === 1 && (S.evo === 'sorcerer' || P.name === 'Firebolt') ? Object.assign({}, o, { as: conv.to, conv: null }) : o, out);
    if (S.aug.split && f.mon) strike(g, Object.assign({}, o, { mult: base * 0.4 }), out);
  }
  if (f.mon) { if (S.aug.momentum) f.mon.stacks = Math.min(5, f.mon.stacks + 1); if (f.mon.hp <= 0) killMonster(g, out, log); }
}
function castSpell(g, c, out, log, triggered) {
  const S = g.stats, f = g.fight, sp = SPELLS[c.k], r = g.rng;
  if (!triggered) {
    if (c.cond && !condMet(c.cond, g)) { f.cd[c.k] = g.t + 0.5; return; }
    const stay = sp.kind === 'off' && S.set4('riftwalker') && rand(r) < 0.25;
    f.cd[c.k] = g.t + (stay ? 0.5 : sp.cd * (1 - S.cdr / 100));
  }
  const times = sp.kind === 'off' && S.aug.echo ? 2 : 1;
  const sm = S.spellMore, tr = { triggered: true };
  for (let i = 0; i < times; i++) {
    if (!f.mon) break;
    switch (c.k) {
      case 'sunder': strike(g, { ...tr, mult: 2.5 * sm, ignoreArmor: true, label: 'Sunder' }, out, log); break;
      case 'consecrate':
        if (S.evo === 'paladin') strike(g, { ...tr, mult: 1.8 * sm, as: 'shadow', lifesteal: 0.15, label: 'Death Strike' }, out, log);
        else { strike(g, { ...tr, mult: 1.6 * sm, as: 'holy', label: 'Consecrate' }, out, log); f.hp = Math.min(S.life, f.hp + S.life * 0.08); }
        break;
      case 'ignite': strike(g, { ...tr, mult: 1.2 * sm, as: 'fire', burn: 0.8, burnDur: 4, label: 'Ignite' }, out, log); break;
      case 'hawk': f.buffs.hawk = g.t + 9; if (log && i === 0) log(S.evo === 'hunter' ? 'Bind Demons: two demons answer.' : 'Hawk Talon: a hawk joins the hunt.', 'skill'); break;
      case 'eviscerate': strike(g, { ...tr, mult: 2.2 * sm, forceCrit: true, label: 'Eviscerate' }, out, log); break;
      case 'cinderburst': strike(g, { ...tr, mult: 2.0 * sm, as: 'fire', burn: 0.6, burnDur: 3, label: 'Cinderburst' }, out, log); break;
      case 'emberrain': strike(g, { ...tr, mult: 3.8 * sm, as: 'fire', onHit: false, label: 'Ember Rain' }, out, log); break;
      case 'frostlance': strike(g, { ...tr, mult: 2.2 * sm, as: 'frost', chill: 3, label: 'Frost Lance' }, out, log); break;
      case 'chainlight': for (let k = 0; k < 3 && f.mon; k++) strike(g, { ...tr, mult: 0.8 * sm, as: 'light', onHit: k === 0, label: k === 0 ? 'Chain Lightning' : null }, out, log); break;
      case 'scarlance': strike(g, { ...tr, mult: 2.8 * sm, as: 'phys', ignoreArmor: true, label: 'Scar Lance' }, out, log); break;
      case 'rend': strike(g, { ...tr, mult: 0.3 * sm, as: 'phys', bleed: 0.55 / 0.3, bleedDur: 6, label: 'Rend' }, out, log); break;
      case 'shadowbolt': strike(g, { ...tr, mult: 1.5 * sm, as: 'shadow', evadable: false, label: 'Shadow Bolt' }, out, log); break;
      case 'voidmaw': strike(g, { ...tr, mult: 4.2 * sm, as: 'shadow', evadable: false, onHit: false, label: 'Void Maw' }, out, log); break;
      case 'radiance': strike(g, { ...tr, mult: 2.4 * sm, as: 'holy', label: 'Radiance' }, out, log); f.hp = Math.min(S.life, f.hp + S.life * 0.05); break;
      case 'barrier': f.shield = Math.max(f.shield, S.life * 0.25); log && log('Rift Barrier raised.', 'skill'); break;
      case 'mend': f.hp = Math.min(S.life, f.hp + S.life * 0.3); log && log('Mend.', 'skill'); break;
      case 'warcry': f.buffs.warcry = g.t + 6; log && log('War Cry!', 'skill'); break;
      case 'frostward': f.buffs.frostward = g.t + 6; break;
    }
  }
  if (f.mon && f.mon.hp <= 0) killMonster(g, out, log);
}
function monsterAttack(g, out, log) {
  const S = g.stats, f = g.fight, m = f.mon, r = g.rng, M = mdef(m.key);
  m.next = g.t + m.interval * (m.chillUntil > g.t ? chillMult(m) : 1);
  if (S.dodge && rand(r) * 100 < S.dodge) return;
  const ward = f.buffs.frostward > g.t;
  let d = m.dmg * rr(r, 0.85, 1.15);
  d = M.dmgType === 'phys' ? afterArmor(d, S.armor * (ward ? 1.5 : 1)) : d * (1 - Math.min(85, S.res[M.dmgType] + (ward ? 25 : 0)) / 100);
  if (f.shield > 0) { const a = Math.min(f.shield, d); f.shield -= a; d -= a; }
  f.hp -= d; out.dmgTaken += d;
  if (S.reflect > 0) {
    let th = S.reflect;
    if (S.set4('warden')) { th *= 1 - (m.res.frost || 0) / 100; m.chill = Math.min(5, (m.chillUntil > g.t ? m.chill : 0) + 2); m.chillUntil = g.t + 3; }
    else th = afterArmor(th, m.armor);
    m.hp -= th; out.dmgDealt += th;
  }
  if (f.hp <= 0) { die(g, out, log); return; }
  if (m.hp <= 0) killMonster(g, out, log);
}
function pulse(g, out, log) {
  const S = g.stats, f = g.fight, m = f.mon, r = g.rng;
  f.pulseNext = g.t + PULSE;
  f.hp = Math.min(S.life, f.hp + S.regen * PULSE);
  if (m.burnUntil > g.t - PULSE + 1e-9) { const b = m.burnDps * PULSE * (1 - (m.res.fire || 0) / 100); m.hp -= b; out.dmgDealt += b; if (S.set4('vigil')) f.hp = Math.min(S.life, f.hp + b * 0.1); }
  if (m.bleedUntil > g.t - PULSE + 1e-9) { const b = m.bleedDps * PULSE; m.hp -= b; out.dmgDealt += b; }
  if (f.buffs.hawk > g.t) {
    if (S.evo === 'hunter') {
      for (let i = 0; i < 2 && f.mon; i++) { strike(g, { mult: 0.45 * S.companionMore * S.spellMore * S.evoPot, onHit: false, companion: true, triggered: true }, out); if (rand(r) < 0.08) f.hp -= S.life * 0.03; }
    } else strike(g, { mult: 0.4 * S.companionMore * S.spellMore, onHit: false, companion: true, triggered: true }, out);
  }
  if (f.mon && f.mon.hp > 0 && f.mon.regenPct) f.mon.hp = Math.min(f.mon.max, f.mon.hp + f.mon.max * f.mon.regenPct * PULSE);
  if (f.hp <= 0) { die(g, out, log); return; }
  if (f.mon && f.mon.hp <= 0) killMonster(g, out, log);
}

function die(g, out, log) {
  const f = g.fight;
  f.hp = 0; f.mon = null; f.deadUntil = g.t + RECOVERY; f.shield = 0;
  out.deaths++; g.life.deaths++;
  if (g.boss) return;
  log && log(`Slain by the ${mdef(g.target.key).name}. Recovering for ${RECOVERY}s.`, 'death');
  g.streak = 0;
  g.deathsHere = (g.deathsHere || 0) + 1;
  const minL = ZONES[mdef(g.target.key).zone].minLevel;
  if (g.autoPush && g.deathsHere > (g.pushRetries ?? 1) && g.target.level > minL) {
    g.target.level--; g.deathsHere = 0;
    log && log(`Auto-push: back to stage ${g.target.level}.`, 'sys');
  }
}
function notice(g, key) { g.seen = g.seen || {}; if (g.seen[key]) return; g.seen[key] = true; (g.notices = g.notices || []).push(key); }

function killMonster(g, out, log) {
  const f = g.fight, m = f.mon; if (!m) return;
  const M = mdef(m.key), S = g.stats, r = g.rng, Z = ZONES[M.zone];
  f.mon = null; f.respawnAt = g.t + RESPAWN;
  out.kills++;
  if (g.boss) return;
  const gap = g.hero.level - m.level - 12;
  const xp = Math.round(8 * Math.pow(1.12, m.level - 1) * M.xp * Z.reward * (gap > 0 ? Math.max(0.05, 1 - gap * 0.12) : 1));
  const gold = Math.round(3 * Math.pow(1.12, m.level - 1) * M.gold * Z.reward * rr(r, 0.8, 1.2) * (1 + S.goldFind / 100));
  out.xp += xp; out.gold += gold; g.life.kills++; g.gold += gold;
  const kk = m.key + ':' + m.level;
  g.kills[kk] = (g.kills[kk] || 0) + 1;
  if (out.killTimes) out.killTimes.push(g.t);
  // materials
  if (rand(r) < (M.zone === 'hollow' ? 0.45 : 0.3)) { const n = M.zone === 'hollow' ? 1 + (rand(r) < 0.4 ? 1 : 0) : 1; g.mats.shards += n; out.mats.shards = (out.mats.shards || 0) + n; notice(g, 'shards'); }
  if (M.ess && rand(r) < (M.essChance || 0.05)) { const e = pick(r, M.ess); g.mats[e] = (g.mats[e] || 0) + 1; out.mats[e] = (out.mats[e] || 0) + 1; notice(g, 'essence'); }
  if (g.asc.unlocked && M.mat && rand(r) < (m.key === 'colossus' ? 0.12 : 0.06)) { g.mats[M.mat] = (g.mats[M.mat] || 0) + 1; out.mats[M.mat] = (out.mats[M.mat] || 0) + 1; }
  g.sigilProg = (g.sigilProg || 0) + 1;
  if (g.sigilProg >= SIGIL_KILLS) { g.sigilProg = 0; if (g.sigils < SIGIL_CAP) { g.sigils++; out.sigils++; notice(g, 'boss'); log && log('A Boss Sigil formed.', 'level'); } }
  // progression
  const un = g.unlocked;
  if (m.level === un[m.key] && g.kills[kk] >= UNLOCK_KILLS) {
    un[m.key]++;
    log && log(`${M.name} stage ${un[m.key]} unlocked.`, 'sys');
    if (M.zone === 'fallfields' && un[m.key] >= HOLLOW_UNLOCK && !g.zones.hollow) { g.zones.hollow = true; notice(g, 'hollow'); log && log('The Ashen Hollow has opened.', 'level'); }
  }
  g.streak = (g.streak || 0) + 1;
  if (g.autoPush && g.streak >= PUSH_STREAK && g.target.level < un[g.target.key]) { g.target.level++; g.streak = 0; g.deathsHere = 0; log && log(`Auto-push: up to stage ${g.target.level}.`, 'sys'); }
  gainXp(g, xp, out, log);
  // loot
  if (rand(r) < DROP_CHANCE) receiveItem(g, makeItem(r, pick(r, DROP_SLOTS), m.level + Z.ilvlBonus, { zone: M.zone }), out, log);
  if (g.asc.unlocked && M.zone === 'hollow' && rand(r) < 0.004) receiveItem(g, makeItem(r, pick(r, ARMOR_SLOTS), g.asc.base, { zone: M.zone, rarity: 'ascended' }), out, log);
  if (M.zone === 'hollow' && rand(r) < 0.00005) receiveJewel(g, makeJewel(r, g.hero.cls), out, log);
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
function isNotable(it) { return RANK[it.rarity] >= 3 || it.spell || it.socket; }
function receiveItem(g, it, out, log) {
  if (it.augments.length) notice(g, 'legendary');
  if (it.spell) notice(g, 'spellitem');
  if (it.rarity === 'ascended') notice(g, 'ascended');
  if (it.socket) notice(g, 'socket');
  const keep = RANK[it.rarity] >= RANK[g.filter] || RANK[it.rarity] >= 3 || it.spell || it.socket;
  if (!keep || g.bag.length >= BAG_CAP) {
    const v = salvageValue(it); g.gold += v; out.salvaged++; out.salvageGold += v;
    if (!keep) return;
    log && log(`Bag full. Salvaged ${it.name} for ${v} gold.`, 'sys');
    if (isNotable(it)) out.notable.push(it);
    return;
  }
  g.bag.push(it); out.items++;
  if (isNotable(it)) out.notable.push(it);
  log && log(`Found ${it.name} (${RARITY_NAMES[it.rarity]}).`, 'loot:' + it.rarity);
}
function receiveJewel(g, j, out, log) { g.jewels.push(j); out.jewels = (out.jewels || 0) + 1; notice(g, 'jewel'); log && log('A Scarbound Jewel pulses in the ash.', 'loot:jewel'); }
function emptyOut() { return { kills: 0, xp: 0, gold: 0, deaths: 0, levels: 0, items: 0, salvaged: 0, salvageGold: 0, notable: [], dmgDealt: 0, dmgTaken: 0, mats: {}, sigils: 0, jewels: 0 }; }

// ---------- STATE ----------
function blankState(cls, now, seed) {
  return {
    v: 3, created: now, t: now, rng: { s: (seed >>> 0) || 1 },
    hero: { cls, level: 1, xp: 0, spec: null, points: 0, passives: {} },
    equip: {}, bag: [], jewels: [], gold: 0, mats: { shards: 0 }, filter: 'uncommon',
    zones: { fallfields: true, hollow: false }, target: { key: 'husk', level: 1 },
    unlocked: Object.fromEntries(MONSTER_KEYS.map(k => [k, ZONES[MONSTERS[k].zone].minLevel])),
    bossUnlocked: Object.fromEntries(BOSS_KEYS.map(k => [k, BOSSES[k].minLevel])),
    asc: { unlocked: false, base: 0, slots: Object.fromEntries(ARMOR_SLOTS.map(s => [s, 0])) },
    bar: { off: [null, null, null], util: [null, null] }, slotted: {},
    sigils: 0, sigilProg: 0, kills: {}, autoPush: true, pushRetries: 1, streak: 0, deathsHere: 0,
    seen: {}, notices: [], life: { kills: 0, deaths: 0, offlineSec: 0, bosses: 0 }
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
// v2 -> v3: keep progress, convert items into the new anatomy.
const V2_AFFIX = { physFlat: 'flat_phys', fireFlat: 'flat_fire', fireRes: 'res_fire', thorns: 'reflect' };
const V2_RARITY = { common: 'common', magic: 'uncommon', rare: 'rare', godtouched: 'legendary' };
const V2_SPECIAL = { emberheart: 'conv_fire', bulwark: 'bulwark', echo: 'echo', tithe: 'tithe', kindling: 'kindling', gravebound: 'bulwark' };
const V2_SPELL = { riftbolt: 'shadowbolt', ashward: 'frostward' };
function convertItem(r, o, cls) {
  const it = { id: o.id, slot: o.slot, ilvl: o.ilvl, rarity: V2_RARITY[o.rarity] || 'common', plus: o.plus || 0, shardsIn: o.shardsIn || 0, locked: !!o.locked, affixes: [], augments: [] };
  if (o.slot === 'weapon') { it.base = WEAPONS[o.base] ? o.base : 'sword'; it.dmg = o.dmg; }
  else if (DEF_BASE[o.slot]) { it.def = o.armor || DEF_BASE[o.slot] * gearG(o.ilvl); if (o.life) it.life = o.life; }
  else it.attr = [Object.entries(CLASSES[cls].attrPer).sort((a, b) => b[1] - a[1])[0][0], 4 + o.ilvl * 0.6];
  for (const [k, v] of o.affixes || []) { const nk = V2_AFFIX[k] || k; if (AFFIXES[nk] && AFFIXES[nk].slots.includes(it.slot)) it.affixes.push([nk, v]); }
  if (o.special && V2_SPECIAL[o.special]) it.augments.push(V2_SPECIAL[o.special]);
  if (o.pmod && AUGMENTS[o.pmod]) { it.augments.push(o.pmod); it.rarity = 'legendary'; }
  if (it.rarity === 'legendary' && !it.augments.length) it.augments.push('split');
  if (RANK[it.rarity] >= 3) { const k = pick(r, Object.keys(ENCHANTS)); it.enchant = [k, ENCHANTS[k].roll(r) * ENCHANT_TIER[it.rarity]]; }
  if (o.spell) it.spell = V2_SPELL[o.spell] || o.spell;
  if (it.spell && !SPELLS[it.spell]) delete it.spell;
  it.name = o.name && it.rarity !== 'legendary' ? o.name : itemName(it);
  return it;
}
function migrate(o) {
  if (o.v === 3) return o;
  if (o.v === 1) { o.v = 2; o.mats = { shards: 0 }; o.bar = { off: [null, null, null], util: [null, null] }; o.zones = { fallfields: true }; o.bossUnlocked = {}; o.hero.passives = {}; o.hero.points = Math.max(0, o.hero.level - 1); }
  if (o.v !== 2) throw new Error('Unknown save version');
  const g = blankState(o.hero.cls, o.t, o.rng.s);
  g.created = o.created; g.rng = o.rng;
  g.hero = Object.assign(g.hero, { level: o.hero.level, xp: o.hero.xp, spec: o.hero.spec ?? null, points: o.hero.points || 0, passives: o.hero.passives || {} });
  for (const [k, it] of Object.entries(o.equip || {})) g.equip[k === 'ring' ? 'ring1' : k] = convertItem(g.rng, it, o.hero.cls);
  g.bag = (o.bag || []).map(it => convertItem(g.rng, it, o.hero.cls));
  g.gold = o.gold || 0;
  const m = o.mats || {};
  g.mats = { shards: m.shards || 0, fire: m.ember || 0, phys: m.ash || 0, shadow: m.rift || 0 };
  g.target = o.target && mdef(o.target.key) ? o.target : g.target;
  for (const k in o.unlocked || {}) if (k in g.unlocked) g.unlocked[k] = o.unlocked[k];
  for (const k in o.bossUnlocked || {}) if (k in g.bossUnlocked) g.bossUnlocked[k] = o.bossUnlocked[k];
  g.zones.hollow = !!(o.zones && o.zones.hollow);
  g.sigils = o.sigils || 0; g.sigilProg = o.sigilProg || 0; g.kills = o.kills || {}; g.autoPush = o.autoPush !== false;
  g.bar.off = (o.bar && o.bar.off || [null, null, null]).map(k => k && SPELLS[V2_SPELL[k] || k] ? (V2_SPELL[k] || k) : null);
  g.bar.util = (o.bar && o.bar.util || [null, null]).map(u => u && SPELLS[V2_SPELL[u.k] || u.k] ? { k: V2_SPELL[u.k] || u.k, cond: u.cond } : null);
  g.life = Object.assign(g.life, o.life || {});
  g.fight = newFight(o.t);
  g.seen = Object.assign({}, o.seen || {}, { start: true }); g.notices = ['upgraded3'];
  return g;
}

// ---------- ACTIONS: every player change goes through here ----------
// Each returns null on success or a short reason. A server can replay the same calls against its own copy.
function findBag(g, id) { return g.bag.findIndex(x => x.id === id); }
function findEquipped(g, id) { return EQUIP.find(k => g.equip[k] && g.equip[k].id === id); }
function canOffhand(g, it) {
  const w = g.equip.weapon, W = w ? WEAPONS[w.base] : null, evoW = g.stats && g.stats.evo === 'warrior';
  if (it.slot === 'weapon') return evoW && WEAPONS[it.base].hands === 2 && !WEAPONS[it.base].bow ? null : 'Only a Warrior with Titan\'s Grip can wield a weapon in the off-hand.';
  if (W && W.bow) return it.base === 'quiver' ? null : 'A bow only pairs with a quiver.';
  if (OFFHANDS[it.base].bowOnly) return 'A quiver needs a bow.';
  if (W && W.hands === 2) return evoW ? 'Titan\'s Grip off-hands hold a two-handed weapon.' : 'A two-handed weapon leaves no hand free.';
  return null;
}
const ACTIONS = {
  equip(g, a) {
    const i = findBag(g, a.id); if (i < 0) return 'Item not found.';
    const it = g.bag[i];
    if (a.to != null && !EQUIP.includes(a.to)) return 'That item doesn\'t fit there.';
    let key = a.to || (it.slot === 'ring' ? (!g.equip.ring1 ? 'ring1' : !g.equip.ring2 ? 'ring2' : 'ring1') : it.slot);
    if (it.slot === 'weapon' && a.to === 'offhand') key = 'offhand';
    if (slotOf(key) !== it.slot && !(key === 'offhand' && it.slot === 'weapon')) return 'That item doesn\'t fit there.';
    if (key === 'offhand') { const why = canOffhand(g, it); if (why) return why; }
    g.bag.splice(i, 1);
    const old = g.equip[key]; g.equip[key] = it; if (old) g.bag.push(old);
    // a new main weapon may push out an off-hand it can't pair with
    if (key === 'weapon' && g.equip.offhand) { refresh(g); const oh = g.equip.offhand; if (canOffhand(g, oh)) { delete g.equip.offhand; g.bag.push(oh); } }
    if (key === 'belt' && old && old.jewel) { if (it.socket && !it.jewel) it.jewel = old.jewel; else g.jewels.push(old.jewel); delete old.jewel; }
    return null;
  },
  unequip(g, a) { const k = findEquipped(g, a.id); if (!k) return 'Not equipped.'; if (k === 'weapon') return 'You always keep a weapon.'; g.bag.push(g.equip[k]); delete g.equip[k]; return null; },
  lock(g, a) { const it = g.bag.find(x => x.id === a.id); if (!it) return 'Item not found.'; it.locked = !it.locked; return null; },
  salvage(g, a) {
    const i = findBag(g, a.id); if (i < 0) return 'Item not found.'; const it = g.bag[i]; if (it.locked) return 'Unlock it first.';
    g.gold += salvageValue(it); g.mats.shards += salvageShards(it); if (it.jewel) g.jewels.push(it.jewel); g.bag.splice(i, 1); return null;
  },
  salvageAll(g) { g.bag = g.bag.filter(it => { if (it.locked || RANK[it.rarity] >= 4) return true; g.gold += salvageValue(it); g.mats.shards += salvageShards(it); return false; }); return null; },
  upgrade(g, a) {
    const k = findEquipped(g, a.id); if (!k) return 'Equip it first.'; const it = g.equip[k];
    if (it.rarity === 'ascended') return 'Ascended pieces scale with their slot level.';
    if (it.plus >= 10) return 'Fully upgraded.'; const c = upgradeCost(it); if (g.mats.shards < c) return 'Not enough Scar Shards.';
    g.mats.shards -= c; it.shardsIn = (it.shardsIn || 0) + c; it.plus++; return null;
  },
  ascend(g, a) {
    if (!g.asc.unlocked) return 'Ascension is sealed.'; const s = a.slot; if (!ARMOR_SLOTS.includes(s)) return 'Not an Ascended slot.';
    const mat = ASC_MATS[s], c = ascCost(g.asc.slots[s]); if ((g.mats[mat] || 0) < c) return `Needs ${c} ${MAT_NAMES[mat]}.`;
    g.mats[mat] -= c; g.asc.slots[s]++; g.asc.committed = true; return null;
  },
  reforge(g, a) {
    const k = findEquipped(g, a.id); if (!k) return 'Equip it first.'; const it = g.equip[k]; const c = reforgeCost(it); if (g.gold < c) return 'Not enough gold.';
    if (!isInt(a.i, 0, it.affixes.length - 1)) return 'No such stat.';
    const na = rollAffix(g.rng, it, it.affixes.map(x => x[0])); if (!na) return 'No other stats can roll here.';
    g.gold -= c; it.affixes[a.i] = na; return null;
  },
  inscribe(g, a) {
    const k = findEquipped(g, a.id); if (!k) return 'Equip it first.'; const it = g.equip[k];
    if (RANK[it.rarity] < 2 || it.spell) return 'Needs a Rare or better item without a spell.';
    const sp = own(SPELLS, a.spell) ? SPELLS[a.spell] : null; if (!sp || !sp.el) return 'Unknown spell.'; const c = inscribeCost(it);
    if (g.gold < c.gold || (g.mats[sp.el] || 0) < c.essence) return `Needs ${c.essence} ${MAT_NAMES[sp.el]} and ${fmt(c.gold)} gold.`;
    g.gold -= c.gold; g.mats[sp.el] -= c.essence; it.spell = a.spell; return null;
  },
  craft(g, a) {
    const rar = a.rarity; if (!own(CRAFT_MULT, rar)) return 'Unknown rarity.'; if (!DROP_SLOTS.includes(a.slot)) return 'Unknown slot.';
    if (a.base != null && !(a.slot === 'weapon' ? own(WEAPONS, a.base) : a.slot === 'offhand' ? own(OFFHANDS, a.base) : false)) return 'Unknown base.';
    const ilvl = Math.max(1, Number(a.ilvl) | 0); const maxL = Math.max(...MONSTER_KEYS.map(k => g.unlocked[k])) + 4; if (ilvl > maxL) return 'You can\'t craft above your progress.';
    const c = craftCost(rar, ilvl); const ess = TYPES.every(t => (g.mats[t] || 0) >= c.essence);
    if (g.gold < c.gold || g.mats.shards < c.shards || !ess) return 'Not enough materials.';
    if (g.bag.length >= BAG_CAP) return 'Bag is full.';
    g.gold -= c.gold; g.mats.shards -= c.shards; for (const t of TYPES) if (c.essence) g.mats[t] -= c.essence;
    const it = makeItem(g.rng, a.slot, ilvl, { rarity: rar, base: a.base, zone: g.zones.hollow ? 'hollow' : 'fallfields' });
    g.bag.push(it); return null;
  },
  addSocket(g, a) {
    const k = findEquipped(g, a.id); if (k !== 'belt') return 'Only an equipped belt can take a socket.'; const it = g.equip.belt; if (it.socket) return 'Already socketed.';
    const c = socketCost(it); if (g.gold < c.gold || !TYPES.every(t => (g.mats[t] || 0) >= c.essence)) return `Needs ${fmt(c.gold)} gold and ${c.essence} of every essence.`;
    g.gold -= c.gold; for (const t of TYPES) g.mats[t] -= c.essence; it.socket = true; it.name = itemName(it); return null;
  },
  socketJewel(g, a) {
    const b = g.equip.belt; if (!b || !b.socket) return 'Equip a socketed belt first.'; if (b.jewel) return 'Remove the current Jewel first.';
    const i = g.jewels.findIndex(j => j.id === a.id); if (i < 0) return 'Jewel not found.'; if (g.jewels[i].cls !== g.hero.cls) return 'That Jewel answers another class.';
    b.jewel = g.jewels.splice(i, 1)[0]; return null;
  },
  unsocketJewel(g) {
    const b = g.equip.belt; if (!b || !b.jewel) return 'No Jewel socketed.'; const c = unsocketCost(g.hero.level); if (g.gold < c) return `Needs ${fmt(c)} gold.`;
    g.gold -= c; g.jewels.push(b.jewel); delete b.jewel;
    if (g.equip.offhand && g.equip.offhand.slot === 'weapon') { g.bag.push(g.equip.offhand); delete g.equip.offhand; }
    return null;
  },
  spec(g, a) { if (g.hero.level < SPEC_LEVEL) return 'Not yet.'; if (!isInt(a.i, 0, CLASSES[g.hero.cls].specs.length - 1)) return 'Unknown specialization.'; if (a.i === g.hero.spec) return null; const cost = g.hero.spec == null ? 0 : respecCost(g.hero.level); if (g.gold < cost) return 'Not enough gold.'; g.gold -= cost; g.hero.spec = a.i; return null; },
  passive(g, a) { if (!own(PASSIVES, a.k)) return 'Unknown passive.'; if (!g.hero.points) return 'No points.'; g.hero.points--; g.hero.passives[a.k] = (g.hero.passives[a.k] || 0) + 1; return null; },
  passiveReset(g) { const n = PASSIVE_KEYS.reduce((s, k) => s + (g.hero.passives[k] || 0), 0); g.hero.passives = {}; g.hero.points += n; return null; },
  barOff(g, a) {
    if (!isInt(a.i, 0, g.bar.off.length - 1)) return 'No such slot.';
    if (a.k != null && !(own(SPELLS, a.k) && SPELLS[a.k].kind === 'off' && availableSpells(g).includes(a.k))) return 'You don\'t have that spell.';
    g.bar.off[a.i] = a.k || null; return null;
  },
  barUtil(g, a) {
    if (!isInt(a.i, 0, g.bar.util.length - 1)) return 'No such slot.';
    if (a.k != null && !(own(SPELLS, a.k) && SPELLS[a.k].kind === 'util' && availableSpells(g).includes(a.k))) return 'You don\'t have that spell.';
    g.bar.util[a.i] = a.k ? { k: a.k, cond: SPELLS[a.k].cond } : null; return null;
  },
  barCond(g, a) { if (!isInt(a.i, 0, g.bar.util.length - 1) || !own(CONDS, a.cond)) return 'Unknown condition.'; if (g.bar.util[a.i]) g.bar.util[a.i].cond = a.cond; return null; },
  target(g, a) {
    const M = own(MONSTERS, a.key) ? MONSTERS[a.key] : null; if (!M || !g.zones[M.zone]) return 'Not available.';
    g.target = { key: a.key, level: Math.max(ZONES[M.zone].minLevel, Math.min(g.unlocked[a.key], Number(a.level) | 0)) }; g.streak = 0; g.deathsHere = 0; return null;
  },
  autoPush(g, a) { g.autoPush = !!a.on; g.streak = 0; return null; },
  pushRetries(g, a) { g.pushRetries = Math.max(0, Math.min(2, Number(a.n) | 0)); return null; },
  filter(g, a) { if (!own(RANK, a.rarity)) return 'Unknown.'; g.filter = a.rarity; return null; },
  dismiss(g, a) { g.notices = (g.notices || []).filter(k => k !== a.key); return null; },
  boss(g, a) {
    const B = own(BOSSES, a.key) ? BOSSES[a.key] : null; if (!B || !g.zones[B.zone]) return 'Not available.'; if (g.sigils < 1) return 'No sigils.';
    const L = Math.max(B.minLevel, Math.min(g.bossUnlocked[a.key], Number(a.level) | 0));
    g.sigils--;
    const res = fightBoss(g, a.key, L);
    g.lastBoss = { res: { key: res.key, level: res.level, win: res.win, died: res.died, time: res.time, pct: res.pct }, lines: res.lines.slice(-40) };
    if (res.win) g.lastBoss.rewards = bossRewards(g, res, emptyOut());
    return null;
  }
};
function doAction(g, a) { if (!a || typeof a !== 'object' || !own(ACTIONS, a.type)) return 'Unknown action.'; const fn = ACTIONS[a.type]; const err = fn(g, a); if (!err) refresh(g); return err; }

// ---------- PROJECTION ----------
function cloneBuild(g, opts) {
  const c = blankState(g.hero.cls, 0, opts.seed || 987654321);
  c.hero = JSON.parse(JSON.stringify(g.hero));
  c.asc = g.asc;
  c.equip = Object.assign({}, g.equip);
  if (opts.equip) for (const k in opts.equip) { if (opts.equip[k] === null) delete c.equip[k]; else c.equip[k] = opts.equip[k]; }
  c.bar = JSON.parse(JSON.stringify(g.bar));
  c.stats = computeStats(c);
  c.slotted = opts.autoslot ? Object.assign({}, g.slotted) : Object.fromEntries(availableSpells(c).map(k => [k, true]));
  c.target = opts.target || Object.assign({}, g.target);
  c.filter = 'ascended'; c.autoPush = false;
  for (const k of MONSTER_KEYS) c.unlocked[k] = 9999;
  c.fight = newFight(0);
  refresh(c);
  return c;
}
// Which slot an item would take, for verdicts.
function verdictSlot(g, it) {
  if (it.slot !== 'ring') return it.slot;
  if (!g.equip.ring1) return 'ring1'; if (!g.equip.ring2) return 'ring2';
  return computeStats(Object.assign({}, g, { equip: Object.assign({}, g.equip, { ring1: undefined }) })).hit >= computeStats(Object.assign({}, g, { equip: Object.assign({}, g.equip, { ring2: undefined }) })).hit ? 'ring1' : 'ring2';
}
function project(g, opts) {
  const secs = opts.secs || 240;
  const c = cloneBuild(g, Object.assign({ autoslot: true }, opts));
  const out = emptyOut();
  c.hero.xp = -1e15;
  advance(c, secs, out);
  const min = secs / 60;
  return { kpm: out.kills / min, gpm: out.gold / min, xpm: out.xp / min, deaths: out.deaths, dps: out.dmgDealt / secs };
}

// ---------- BOSSES ----------
function fightBoss(g, key, level) {
  const seed = Math.floor(rand(g.rng) * 4294967296);
  const c = cloneBuild(g, { seed, target: { key, level }, autoslot: false });
  c.boss = true;
  const out = emptyOut(), lines = [];
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
  for (let i = 0; i < n; i++) { const x = rand(r); const rar = x < 0.04 ? 'legendary' : x < 0.35 ? 'epic' : 'rare'; items.push(makeItem(r, pick(r, DROP_SLOTS), L + Z.ilvlBonus + 2, { zone: B.zone, rarity: rar })); }
  if (g.asc.unlocked && B.zone === 'hollow' && rand(r) < 0.25) items.push(makeItem(r, pick(r, ARMOR_SLOTS), g.asc.base, { zone: B.zone, rarity: 'ascended' }));
  const gold = Math.round(3 * Math.pow(1.12, L - 1) * B.gold), shards = 4 + Math.floor(rand(r) * 4);
  g.gold += gold; g.mats.shards += shards;
  const ess = {};
  if (B.zone === 'hollow') for (const e of TYPES) { const k = rand(r) < 0.6 ? 1 + Math.floor(rand(r) * 2) : 0; if (k) { g.mats[e] = (g.mats[e] || 0) + k; ess[e] = k; } }
  const xp = Math.round(8 * Math.pow(1.12, L - 1) * B.xp);
  gainXp(g, xp, out, null);
  for (const it of items) receiveItem(g, it, out, null);
  let jewel = null;
  if (rand(r) < (res.key === 'woundwarden' ? 0.03 : 0.008)) { jewel = makeJewel(r, g.hero.cls); receiveJewel(g, jewel, out, null); }
  if (L === g.bossUnlocked[res.key]) g.bossUnlocked[res.key] += 2;
  let opened = false;
  if (res.key === 'woundwarden' && !g.asc.unlocked) { g.asc.unlocked = true; g.asc.base = L + 6; opened = true; notice(g, 'ascension'); }
  g.life.bosses = (g.life.bosses || 0) + 1;
  return { items, gold, shards, ess, xp, jewel, opened };
}

// ---------- OFFLINE ----------
function catchUp(g, now, log) {
  const out = emptyOut();
  let elapsed = now - g.t; if (elapsed <= 0) return { out, elapsed: 0, capped: 0 };
  let capped = 0;
  if (elapsed > OFFLINE_CAP) { capped = elapsed - OFFLINE_CAP; shiftFight(g, now - OFFLINE_CAP - g.t); elapsed = OFFLINE_CAP; }
  advance(g, now, out, log);
  return { out, elapsed, capped };
}
function shiftFight(g, d) {
  const f = g.fight;
  g.t += d; f.pNext += d; f.pulseNext += d; f.respawnAt += d; f.critCastAt += d;
  if (f.deadUntil) f.deadUntil += d;
  for (const k in f.cd) f.cd[k] += d; for (const k in f.buffs) f.buffs[k] += d;
  if (f.mon) { const m = f.mon; m.next += d; m.burnUntil += d; m.bleedUntil += d; m.chillUntil += d; m.shockUntil += d; }
}

if (typeof module !== 'undefined') module.exports = {
  SIM_VERSION, ACTIONS, rand, TYPES, ELEMS, TYPE_NAMES, TYPE_RULES, ATTRS, ATTR_RULES, CLASSES, CLASS_KEYS, SPELLS, FOUND_SPELLS, CONDS, PASSIVES, PASSIVE_KEYS,
  EQUIP, DROP_SLOTS, ARMOR_SLOTS, SLOT_NAMES, WEAPONS, OFFHANDS, AFFIXES, ENCHANTS, AUGMENTS, SETS, ASC_MATS, MAT_NAMES, RARITIES, RARITY_NAMES, RANK,
  ZONES, ZONE_KEYS, MONSTERS, MONSTER_KEYS, BOSSES, BOSS_KEYS, mdef, makeItem, makeJewel, computeStats, refresh, availableSpells, advance, emptyOut,
  newGame, migrate, doAction, project, verdictSlot, fightBoss, bossRewards, catchUp, effIlvl, scaleOf, xpToNext, upgradeCost, salvageValue, salvageShards,
  reforgeCost, inscribeCost, respecCost, socketCost, unsocketCost, craftCost, ascCost, fmt, jewelOf,
  BAG_CAP, OFFLINE_CAP, SPEC_LEVEL, CLASS_SPELL_LEVEL, SIGIL_KILLS, SIGIL_CAP, HOLLOW_UNLOCK
};
