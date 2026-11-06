// Playable content for the browser-first Living Arsenal prototype.
// Values and names are experimental. Weapon arts are bound to their weapon family.
export const CONDUIT_LEVELS = [2, 5, 10, 18, 30];

export const WEAPONS = Object.freeze({
  sword: {
    name: "Oathblade", attack: "Measured Slash", type: "physical", damage: 16,
    intervalMs: 1250, art: "Dawn Breaker", artEvery: 5, artDamage: 2.1,
    description: "A steady guard's blade. Every fifth strike releases a broad, radiant cut."
  },
  dagger: {
    name: "Gloamfang", attack: "Twin Cuts", type: "physical", damage: 10,
    intervalMs: 720, art: "Red Reprise", artEvery: 6, artDamage: 1.65,
    description: "A quick paired blade. Its sixth attack opens a wound that keeps bleeding."
  },
  wand: {
    name: "Graveglass Wand", attack: "Graveglass Bolt", type: "arcane", damage: 13,
    intervalMs: 1040, art: "Starfall Sigil", artEvery: 5, artDamage: 1.8,
    description: "A shard of old glass. Every fifth bolt calls a small, focused starfall."
  },
  mace: {
    name: "Bellkeeper's Maul", attack: "Tolling Impact", type: "physical", damage: 22,
    intervalMs: 1720, art: "Last Toll", artEvery: 4, artDamage: 2.55,
    description: "A brutal two-handed relic. Every fourth impact deals heavy bonus damage."
  }
});

export const SLOT_LABELS = Object.freeze({
  weapon: "Main hand", offhand: "Off hand", helm: "Helm", chest: "Chest",
  gloves: "Gloves", boots: "Boots", belt: "Belt", ring: "Ring", charm: "Charm"
});

export const SLOT_BASES = Object.freeze({
  offhand: ["Graveward Shield", "Ashglass Focus"], helm: ["Mourner's Hood", "Warden Helm"],
  chest: ["Pilgrim Coat", "Warden Cuirass"], gloves: ["Grips of Cinder", "Warden Gauntlets"],
  boots: ["Fenwalker Boots", "Warden Greaves"], belt: ["Ashen Girdle", "Wayfarer Belt"],
  ring: ["Cinder Ring", "Rift Signet"], charm: ["Travel Talisman", "Saint's Medal"]
});

export const HUNTS = Object.freeze({
  meadow: {
    name: "Greenward Verge", enemy: "Mire Stalker", region: "The Greenward",
    level: 1, rewardXp: 20, hpBase: 38, hpPerLevel: 3, damageBase: 5,
    intervalMs: 2300, description: "The old road. A safe place to learn your weapon."
  },
  rift: {
    name: "Ashen Crossing", enemy: "Riftbound Sentinel", region: "The Ashen March",
    level: 5, rewardXp: 42, hpBase: 90, hpPerLevel: 7, damageBase: 12,
    intervalMs: 1650, description: "A broken crossing watched by the dead. Better seals, faster sigils."
  },
  crypt: {
    name: "Bellkeeper's Crypt", enemy: "The Bellkeeper", region: "The Sunken Choir",
    level: 8, rewardXp: 120, hpBase: 520, hpPerLevel: 24, damageBase: 25,
    intervalMs: 1900, description: "A named boss. High risk, guaranteed crafting marks on defeat.", boss: true
  }
});

export const SKILLS = Object.freeze({
  ember: { name: "Ember Brand", source: "mastery", unlockLevel: 2, tags: ["fire", "dot"], description: "Every fourth weapon hit, apply burning for four seconds.", cooldownMs: 5000 },
  aegis: { name: "Aegis Pulse", source: "mastery", unlockLevel: 5, tags: ["guard"], description: "At low health, raise a protective shield automatically.", cooldownMs: 15000 },
  hawk: { name: "Spirit Hawk", source: "mastery", unlockLevel: 10, tags: ["hit", "companion"], description: "A spirit hawk strikes on its own rhythm.", cooldownMs: 9000 },
  frost: { name: "Frost Lance", source: "engraving", tags: ["hit", "frost"], description: "An inscribed ice strike every seven seconds.", cooldownMs: 7000 },
  blood: { name: "Blood Mark", source: "engraving", tags: ["dot", "physical"], description: "Every third weapon hit opens a bleeding wound.", cooldownMs: 6000 }
});

export const SUPPORTS = Object.freeze({
  lingering: { name: "Lingering", tags: ["dot"], description: "Longer damage-over-time effect, slightly weaker each second." },
  echo: { name: "Echo", tags: ["hit"], description: "A smaller repeat strike, with a longer cooldown." },
  siphon: { name: "Siphon", tags: ["hit"], description: "Recover life from hits at a damage cost." }
});

export const AFFIXES = Object.freeze({
  sharp: { name: "Tempered", short: "+Damage", detail: "Increases weapon damage." },
  quick: { name: "Hastened", short: "+Speed", detail: "Shortens your weapon interval." },
  vigor: { name: "Vital", short: "+Life", detail: "Increases maximum life." },
  ward: { name: "Warded", short: "+Armor", detail: "Reduces incoming damage." },
  fortune: { name: "Fortunate", short: "+Find", detail: "Improves equipment discovery." }
});

export function supportsFor(skillId) {
  const skill = SKILLS[skillId];
  if (!skill) return [];
  return Object.entries(SUPPORTS)
    .filter(([, support]) => support.tags.some(tag => skill.tags.includes(tag)))
    .map(([id, support]) => ({ id, ...support }));
}
