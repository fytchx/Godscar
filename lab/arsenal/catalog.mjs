// Small, explicit content catalogue for the first Living Arsenal vertical slice.
// These are experiment values, not owner-approved final balance.
export const CONDUIT_LEVELS = [2, 5, 10, 18, 30];

export const WEAPONS = Object.freeze({
  sword: { name: "Sword", attack: "Measured Slash", type: "physical", damage: 16, intervalMs: 1250, description: "Balanced steel. Steady, dependable hits." },
  dagger: { name: "Dagger", attack: "Twin Cuts", type: "physical", damage: 10, intervalMs: 720, description: "Quick twin cuts. Faster strikes, lighter damage." },
  wand: { name: "Fire Wand", attack: "Arc Bolt", type: "fire", damage: 13, intervalMs: 1040, description: "A fiery bolt. Each hit leaves a small burn." }
});

export const HUNTS = Object.freeze({
  meadow: { name: "Greenward Meadows", enemy: "Meadow Stalker", level: 1, rewardXp: 20, hpBase: 38, hpPerLevel: 3, damageBase: 5, intervalMs: 2300, description: "The reliable route. Always available; every victory gives XP and Scrap." },
  rift: { name: "Ashen Crossing", enemy: "Riftbound Sentinel", level: 5, rewardXp: 42, hpBase: 90, hpPerLevel: 7, damageBase: 12, intervalMs: 1650, description: "A harder hunt. Better Seals and a faster Sigil route. Return to the meadows anytime." }
});

export const SKILLS = Object.freeze({
  ember: { name: "Ember Brand", source: "mastery", unlockLevel: 2, tags: ["fire", "dot"], description: "Every fourth weapon hit, apply burning for four seconds. Five-second cooldown.", cooldownMs: 5000 },
  aegis: { name: "Aegis Pulse", source: "mastery", unlockLevel: 5, tags: ["guard"], description: "Below 55% health, generate a temporary shield. Fifteen-second cooldown.", cooldownMs: 15000 },
  hawk: { name: "Spirit Hawk", source: "mastery", unlockLevel: 10, tags: ["hit", "companion"], description: "Your hawk strikes automatically every nine seconds.", cooldownMs: 9000 },
  frost: { name: "Frost Lance", source: "engraving", tags: ["hit", "frost"], description: "An inscribed ice strike every seven seconds.", cooldownMs: 7000 },
  blood: { name: "Blood Mark", source: "engraving", tags: ["dot", "physical"], description: "Every third weapon hit, apply a bleeding mark. Six-second cooldown.", cooldownMs: 6000 }
});

export const SUPPORTS = Object.freeze({
  lingering: { name: "Lingering", tags: ["dot"], description: "Damage over time lasts 50% longer but deals 15% less per second." },
  echo: { name: "Echo", tags: ["hit"], description: "Repeat a direct strike at 40% power, but add two seconds to its cooldown." },
  siphon: { name: "Siphon", tags: ["hit"], description: "Recover 10% of the damage dealt, at a 20% damage penalty." }
});

export function supportsFor(skillId) {
  const skill = SKILLS[skillId];
  if (!skill) return [];
  return Object.entries(SUPPORTS)
    .filter(([, support]) => support.tags.some(tag => skill.tags.includes(tag)))
    .map(([id, support]) => ({ id, ...support }));
}
