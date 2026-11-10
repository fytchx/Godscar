import { CONDUIT_LEVELS, WEAPONS, HUNTS, SKILLS, SUPPORTS, SLOT_BASES, SLOT_LABELS, AFFIXES, supportsFor } from "./catalog.mjs";

export const LAB_VERSION = 2;
export const BAG_CAPACITY = 12;
export const VAULT_CAPACITY = 5;
const MAX_EVENT_COUNT = 250000;
const CLAMP_MS = 4 * 60 * 60 * 1000;

function nextRandom(game) {
  // Seeded, reproducible RNG; never Math.random inside the simulation.
  game.rng = (Math.imul(game.rng, 1664525) + 1013904223) >>> 0;
  return game.rng / 4294967296;
}

function log(game, message, kind = "normal") {
  game.log.push({ timeMs: game.timeMs, message, kind });
  if (game.log.length > 55) game.log.shift();
}

function item(game, slot, base, rarity = "white") {
  game.nextId += 1;
  return { id: "a" + game.nextId, slot, base, rarity, quality: 0, affixes: [], engraving: null, set: null, locked: false };
}

function enemyFor(game) {
  const hunt = HUNTS[game.hunt];
  const maxHp = hunt.hpBase + game.level * hunt.hpPerLevel;
  return { name: hunt.enemy, region: hunt.region, boss: !!hunt.boss, maxHp, hp: maxHp, burn: null, bleed: null };
}

function armorRating(game) {
  const gear = Object.values(game.gear).filter(Boolean);
  const base = gear.reduce((total, item) => total + item.affixes.filter(key => key === "ward").length * 3, 0);
  const wardenPieces = gear.filter(item => item.set === "warden").length;
  return base + (wardenPieces >= 2 ? 6 : 0);
}

function maximumHealth(game) {
  let bonus = 0;
  for (const equipment of Object.values(game.gear)) {
    for (const affix of equipment?.affixes || []) if (affix === "vigor") bonus += 22;
  }
  return 100 + game.level * 12 + bonus;
}

function xpNeeded(level) {
  return Math.round(26 + 13 * Math.pow(level, 1.35));
}

function unlockedCount(game) {
  return CONDUIT_LEVELS.filter(level => game.level >= level).length;
}

export function createGame(seed = 12345) {
  const game = {
    version: LAB_VERSION, rng: seed >>> 0, nextId: 0, timeMs: 0, level: 1, xp: 0,
    health: 112, shield: 0, kills: 0, deaths: 0, hunt: "meadow",
    huntKills: { meadow: 0, rift: 0, crypt: 0 }, mastery: { sword: 0, dagger: 0, wand: 0, mace: 0 },
    materials: { scrap: 0, seals: 0, sigils: 0 },
    gear: { weapon: null, offhand: null, helm: null, chest: null, gloves: null, boots: null, belt: null, ring: null, charm: null }, bag: [], vault: [], lootPaused: false,
    conduits: [null, null, null, null, null], supports: {}, cooldowns: {},
    primaryHits: 0, weaponArtHits: 0, emberHits: 0, bloodHits: 0,
    nextPrimaryAt: 0, nextEnemyAt: 2300, nextRespawnAt: null, nextBurnAt: null, nextBleedAt: null,
    enemy: null, log: []
  };
  game.gear.weapon = item(game, "weapon", "sword");
  game.gear.charm = item(game, "charm", "Travel Talisman");
  game.gear.chest = item(game, "chest", "Pilgrim Coat");
  game.gear.helm = item(game, "helm", "Mourner's Hood");
  game.gear.gloves = item(game, "gloves", "Grips of Cinder");
  game.gear.boots = item(game, "boots", "Fenwalker Boots");
  game.bag.push(item(game, "weapon", "dagger"), item(game, "weapon", "wand"), item(game, "weapon", "mace"));
  game.bag.push(item(game, "offhand", "Graveward Shield"), item(game, "ring", "Cinder Ring"));
  game.enemy = enemyFor(game);
  log(game, "The Oathblade begins its measured rhythm. Its weapon art is already bound to the blade.", "milestone");
  return game;
}

function activeSkillIds(game) {
  const available = new Set(availableSkillIds(game));
  return game.conduits.slice(0, unlockedCount(game))
    .filter(id => id && available.has(id));
}

export function availableSkillIds(game) {
  const ids = [];
  for (const [id, skill] of Object.entries(SKILLS)) {
    if (skill.source === "mastery" && game.level >= skill.unlockLevel) ids.push(id);
    if (skill.source === "engraving" && Object.values(game.gear).some(e => e?.engraving === id)) ids.push(id);
  }
  return ids;
}

export function summarize(game) {
  const weapon = game.gear.weapon;
  const definition = WEAPONS[weapon.base];
  return {
    level: game.level, xp: game.xp, xpNeeded: xpNeeded(game.level),
    unlocked: unlockedCount(game), activeSkills: activeSkillIds(game),
    weaponName: definition.name, attackName: definition.attack, damageType: definition.type,
    intervalMs: Math.round(definition.intervalMs *
      (weapon.affixes.includes("quick") ? 0.90 : 1) *
      (Object.values(game.gear).filter(Boolean).some(item => item.affixes.includes("quick")) ? 0.94 : 1)),
    weaponArt: definition.art, weaponArtEvery: definition.artEvery,
    healthMax: maximumHealth(game), incoming: game.hunt, enemy: game.enemy,
    armor: armorRating(game),
    canHuntRift: game.level >= HUNTS.rift.level, canHuntCrypt: game.level >= HUNTS.crypt.level,
    xpPercent: Math.min(100, game.xp / xpNeeded(game.level) * 100),
    masteryCount: game.mastery[weapon.base] || 0
  };
}

function weaponDamage(game) {
  const gear = game.gear.weapon;
  const base = WEAPONS[gear.base].damage;
  const familyMastery = game.mastery[gear.base] || 0;
  const masteryBonus = Math.min(3, Math.floor(familyMastery / 50)) * 0.02;
  const sharpBonus = Object.values(game.gear).filter(Boolean)
    .reduce((total, item) => total + item.affixes.filter(key => key === "sharp").length * (item.slot === "weapon" ? 0.16 : 0.035), 0);
  return Math.round((base + game.level * 2) * (1 + gear.quality * 0.03) *
    (1 + masteryBonus + sharpBonus));
}

function maybeHealFromHit(game, damage, support) {
  if (support === "siphon") game.health = Math.min(maximumHealth(game), game.health + Math.max(1, Math.round(damage * 0.1)));
}

function damageEnemy(game, damage, source) {
  if (!game.enemy) return;
  const rounded = Math.max(1, Math.round(damage));
  game.enemy.hp -= rounded;
  if (source !== "primary") log(game, source + " deals " + rounded + " damage.");
  if (game.enemy.hp <= 0) defeatEnemy(game);
}

function applyDot(game, kind, amount, durationMs) {
  if (!game.enemy) return;
  const key = kind === "burn" ? "nextBurnAt" : "nextBleedAt";
  const status = { damage: Math.max(1, Math.round(amount)), remainingTicks: Math.max(1, Math.floor(durationMs / 1000)) };
  game.enemy[kind] = status;
  game[key] = game.timeMs + 1000;
}

function gainExperience(game, amount) {
  game.xp += amount;
  while (game.xp >= xpNeeded(game.level)) {
    game.xp -= xpNeeded(game.level);
    game.level++;
    game.health = Math.min(maximumHealth(game), game.health + 11);
    const opened = CONDUIT_LEVELS.indexOf(game.level);
    if (opened >= 0) {
      log(game, "Conduit " + (opened + 1) + " unlocked. Your weapon keeps attacking.", "milestone");
      const starters = { 2: "ember", 5: "aegis", 10: "hawk" };
      const skill = starters[game.level];
      if (skill && !game.conduits.includes(skill)) game.conduits[opened] = skill;
      if (skill === "hawk") game.cooldowns.hawk = game.timeMs + 600;
    } else {
      log(game, "Level " + game.level + ". Character growth is permanent.", "milestone");
    }
  }
}

function receiveDrop(game) {
  if (game.bag.length >= BAG_CAPACITY && game.vault.length >= VAULT_CAPACITY) {
    if (!game.lootPaused) log(game, "Bag and protected reserve full. New equipment rolls pause; XP and Scrap continue.", "warning");
    game.lootPaused = true;
    return;
  }
  const fortune = Math.min(0.09, Object.values(game.gear).filter(Boolean)
    .reduce((total, item) => total + item.affixes.filter(key => key === "fortune").length * 0.03, 0));
  if (nextRandom(game) >= 0.19 + fortune) return;
  const dropSlots = ["weapon", "weapon", "helm", "chest", "gloves", "boots", "belt", "ring", "charm", "offhand"];
  const slot = dropSlots[Math.floor(nextRandom(game) * dropSlots.length)];
  const weaponBases = Object.keys(WEAPONS);
  const base = slot === "weapon" ? weaponBases[Math.floor(nextRandom(game) * weaponBases.length)] :
    (SLOT_BASES[slot] || ["Travel Talisman"])[Math.floor(nextRandom(game) * (SLOT_BASES[slot] || ["Travel Talisman"]).length)];
  const roll = nextRandom(game);
  const rarity = roll < 0.06 ? "rare" : roll < 0.31 ? "magic" : "white";
  const drop = item(game, slot, base, rarity);
  if (rarity !== "white") {
    const possible = slot === "weapon" ? ["sharp", "quick", "vigor"] : ["vigor", "ward", "sharp", "fortune"];
    drop.affixes.push(possible[Math.floor(nextRandom(game) * possible.length)]);
  }
  if (rarity === "rare" && slot === "charm" && nextRandom(game) < 0.5) drop.engraving = "frost";
  if (rarity === "rare" && ["helm", "chest", "gloves", "boots"].includes(slot) && nextRandom(game) < 0.38) drop.set = "warden";
  const inBag = game.bag.length < BAG_CAPACITY;
  if (inBag) game.bag.push(drop);
  else if (rarity === "rare" && game.vault.length < VAULT_CAPACITY) {
    game.vault.push(drop);
    log(game, "A Rare was protected in your reserve: " + itemTitle(drop), "loot");
  } else {
    game.materials.scrap += 3;
    if (rarity === "magic") game.materials.seals++;
    log(game, "Auto-salvaged " + itemTitle(drop) + " for materials.", "loot");
  }
  if (rarity === "rare") log(game, "Rare drop: " + itemTitle(drop), "loot");
}

function defeatEnemy(game) {
  game.kills++;
  game.huntKills[game.hunt]++;
  game.materials.scrap += 2; // Guaranteed earning floor, never RNG-gated.
  const hard = game.hunt === "rift";
  if (game.hunt === "crypt") {
    game.materials.seals += 5;
    game.materials.sigils += 2;
    log(game, "The Bellkeeper falls. Five Seals and two Sigils are yours.", "milestone");
  } else if (hard) {
    game.materials.seals += 1;
    if (game.huntKills.rift % 7 === 0) game.materials.sigils++;
  } else {
    if (game.huntKills.meadow % 5 === 0) game.materials.seals++;
    if (game.huntKills.meadow % 25 === 0) game.materials.sigils++;
  }
  gainExperience(game, HUNTS[game.hunt].rewardXp);
  receiveDrop(game);
  game.enemy = null;
  game.nextRespawnAt = game.timeMs + 650;
  game.nextBurnAt = null;
  game.nextBleedAt = null;
}

function processPrimary(game) {
  const weapon = WEAPONS[game.gear.weapon.base];
  const attackMs = summarize(game).intervalMs;
  game.nextPrimaryAt = game.timeMs + attackMs;
  if (!game.enemy) return;
  const damage = weaponDamage(game);
  game.primaryHits++;
  game.mastery[game.gear.weapon.base]++;
  damageEnemy(game, damage, "primary");
  if (!game.enemy) return;
  game.weaponArtHits++;
  if (game.weaponArtHits >= weapon.artEvery) {
    game.weaponArtHits = 0;
    const artDamage = Math.round(damage * weapon.artDamage);
    damageEnemy(game, artDamage, weapon.art);
    if (game.enemy && game.gear.weapon.base === "dagger") {
      applyDot(game, "bleed", Math.max(2, Math.round(artDamage * 0.18)), 5000);
      log(game, "Red Reprise leaves a deep wound.", "skill");
    } else {
      log(game, weapon.art + " fires from the equipped weapon.", "skill");
    }
  }
  if (!game.enemy) return;
  if (weapon.type === "fire") applyDot(game, "burn", 2 + Math.floor(game.level / 5), 2000);
  const active = activeSkillIds(game);
  if (active.includes("ember")) {
    game.emberHits++;
    if (game.emberHits >= 4 && game.timeMs >= (game.cooldowns.ember || 0)) {
      game.emberHits = 0;
      game.cooldowns.ember = game.timeMs + SKILLS.ember.cooldownMs;
      const support = game.supports.ember;
      applyDot(game, "burn", Math.round((4 + game.level) * (support === "lingering" ? 0.85 : 1)), support === "lingering" ? 6000 : 4000);
      log(game, "Ember Brand ignites your enemy" + (support === "lingering" ? " for longer." : "."), "skill");
    }
  }
  if (active.includes("blood")) {
    game.bloodHits++;
    if (game.bloodHits >= 3 && game.timeMs >= (game.cooldowns.blood || 0)) {
      game.bloodHits = 0;
      game.cooldowns.blood = game.timeMs + SKILLS.blood.cooldownMs;
      const support = game.supports.blood;
      applyDot(game, "bleed", Math.round((5 + game.level) * (support === "lingering" ? 0.85 : 1)), support === "lingering" ? 6000 : 4000);
      log(game, "Blood Mark opens a wound.", "skill");
    }
  }
}

function processEnemyAttack(game) {
  const hunt = HUNTS[game.hunt];
  game.nextEnemyAt = game.timeMs + hunt.intervalMs;
  if (!game.enemy) return;
  const damage = hunt.damageBase + Math.floor(game.level * (game.hunt === "rift" ? 0.75 : game.hunt === "crypt" ? 1.2 : 0.4));
  // Defensive abilities may trigger before the hit lands. A low-life guard
  // should be able to prevent a lethal blow rather than activate after death.
  const unshielded = Math.max(0, damage - game.shield);
  if (activeSkillIds(game).includes("aegis") &&
      game.health - unshielded <= maximumHealth(game) * 0.55 &&
      game.timeMs >= (game.cooldowns.aegis || 0)) {
    game.shield += 20 + game.level * 2;
    game.cooldowns.aegis = game.timeMs + SKILLS.aegis.cooldownMs;
    log(game, "Aegis Pulse shields you automatically.", "skill");
  }
  const mitigated = Math.max(1, damage - armorRating(game));
  const absorbed = Math.min(game.shield, mitigated);
  game.shield -= absorbed;
  game.health -= mitigated - absorbed;
  if (game.health <= 0) {
    game.deaths++;
    game.health = maximumHealth(game);
    game.shield = 0;
    game.nextPrimaryAt = Math.max(game.nextPrimaryAt, game.timeMs + 3500);
    log(game, "Defeated, but not trapped. You recover and resume automatically.", "warning");
  }
}

function processTimedSkill(game, id) {
  if (!game.enemy) {
    game.cooldowns[id] = game.timeMs + 500;
    return;
  }
  const support = game.supports[id];
  const skill = SKILLS[id];
  let damage = id === "hawk" ? 12 + game.level * 2 : 18 + game.level * 3;
  if (support === "siphon") damage *= 0.8;
  const rounded = Math.round(damage);
  damageEnemy(game, rounded, skill.name);
  maybeHealFromHit(game, rounded, support);
  if (game.enemy && support === "echo") damageEnemy(game, Math.round(rounded * 0.4), skill.name + " echo");
  game.cooldowns[id] = game.timeMs + skill.cooldownMs + (support === "echo" ? 2000 : 0);
}

function processStatus(game, kind) {
  if (!game.enemy || !game.enemy[kind]) return;
  const effect = game.enemy[kind];
  damageEnemy(game, effect.damage, kind === "burn" ? "Burn" : "Bleed");
  if (!game.enemy) return;
  effect.remainingTicks--;
  const key = kind === "burn" ? "nextBurnAt" : "nextBleedAt";
  if (effect.remainingTicks > 0) game[key] = game.timeMs + 1000;
  else {
    game.enemy[kind] = null;
    game[key] = null;
  }
}

// Event-driven individual-combat timeline, NOT the rejected server-wide tick model.
export function advance(game, durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error("Invalid elapsed duration.");
  const target = game.timeMs + Math.min(CLAMP_MS, Math.floor(durationMs));
  let events = 0;
  while (events < MAX_EVENT_COUNT) {
    const timed = activeSkillIds(game)
      .filter(id => id === "frost" || id === "hawk")
      .map(id => ({ type: "skill", id, at: Math.max(game.timeMs, game.cooldowns[id] ?? game.timeMs + 600) }));
    const candidates = [
      { type: "respawn", at: game.nextRespawnAt ?? Infinity },
      { type: "burn", at: game.nextBurnAt ?? Infinity },
      { type: "bleed", at: game.nextBleedAt ?? Infinity },
      { type: "primary", at: game.nextPrimaryAt },
      ...timed,
      { type: "enemy", at: game.nextEnemyAt }
    ];
    candidates.sort((a, b) => a.at - b.at);
    const event = candidates[0];
    if (event.at > target || event.at === Infinity) break;
    game.timeMs = event.at;
    events++;
    if (event.type === "respawn") {
      game.enemy = enemyFor(game);
      game.nextRespawnAt = null;
      game.nextEnemyAt = game.timeMs + HUNTS[game.hunt].intervalMs;
    } else if (event.type === "primary") processPrimary(game);
    else if (event.type === "enemy") processEnemyAttack(game);
    else if (event.type === "burn" || event.type === "bleed") processStatus(game, event.type);
    else if (event.type === "skill") processTimedSkill(game, event.id);
  }
  if (events >= MAX_EVENT_COUNT && game.timeMs < target) {
    log(game, "Catch-up capped for this frame. Combat will continue on the next update.", "warning");
    return { events, elapsedMs: game.timeMs, capped: true };
  }
  game.timeMs = target;
  return { events, elapsedMs: durationMs, capped: false };
}

export function itemTitle(it) {
  const name = WEAPONS[it.base]?.name || it.base;
  const prefix = { white: "Common", magic: "Magic", rare: "Rare" }[it.rarity] || "Common";
  const set = it.set === "warden" ? " · Ashen Warden" : "";
  const engraving = it.engraving ? " of " + SKILLS[it.engraving].name : "";
  return prefix + " " + name + engraving + set;
}

export function action(game, command) {
  if (!command || typeof command.type !== "string") return "Invalid action.";
  switch (command.type) {
    case "equip": {
      const index = game.bag.findIndex(it => it.id === command.id);
      if (index < 0) return "Item not in bag.";
      const next = game.bag[index];
      const old = game.gear[next.slot];
      game.bag.splice(index, 1);
      game.gear[next.slot] = next;
      if (old) game.bag.push(old);
      game.health = Math.min(maximumHealth(game), game.health);
      game.nextPrimaryAt = game.timeMs + summarize(game).intervalMs;
      log(game, "Equipped " + itemTitle(next) + ". Your primary attack is now " + summarize(game).attackName + ".", "milestone");
      return null;
    }
    case "hunt": {
      if (!Object.hasOwn(HUNTS, command.hunt)) return "Unknown hunting ground.";
      if (game.level < HUNTS[command.hunt].level) return "This region unlocks at level " + HUNTS[command.hunt].level + ".";
      game.hunt = command.hunt;
      game.enemy = enemyFor(game);
      game.nextRespawnAt = null;
      game.nextBurnAt = null;
      game.nextBleedAt = null;
      game.nextEnemyAt = game.timeMs + HUNTS[game.hunt].intervalMs;
      log(game, "Hunting in " + HUNTS[game.hunt].name + ". The fight continues.", "milestone");
      return null;
    }
    case "assign": {
      const index = Number(command.slot);
      if (!Number.isInteger(index) || index < 0 || index >= unlockedCount(game)) return "That conduit is still locked.";
      const id = command.skill || null;
      if (id && !availableSkillIds(game).includes(id)) return "This ability source is unavailable.";
      if (id && game.conduits.some((skill, i) => i !== index && skill === id)) return "That ability is already assigned.";
      game.conduits[index] = id;
      if (id && (id === "hawk" || id === "frost")) game.cooldowns[id] = game.timeMs + 600;
      log(game, id ? "Conduit " + (index + 1) + ": " + SKILLS[id].name + "." : "Conduit " + (index + 1) + " cleared.");
      return null;
    }
    case "support": {
      const id = command.skill, support = command.support || null;
      if (!Object.hasOwn(SKILLS, id) || !game.conduits.includes(id)) return "Assign the ability before modifying it.";
      if (support && !supportsFor(id).some(s => s.id === support)) return "That support cannot modify this skill.";
      if (game.supports[id] === support || (!support && !game.supports[id])) return null;
      if (support && game.materials.scrap < 6) return "Needs six Scrap to attune a support.";
      if (support) game.materials.scrap -= 6;
      if (support) game.supports[id] = support;
      else delete game.supports[id];
      log(game, support ? SKILLS[id].name + " attuned with " + SUPPORTS[support].name + "." : "Support removed. The learned recipe remains.");
      return null;
    }
    case "refine": {
      const weapon = game.gear.weapon;
      if (weapon.rarity === "rare") return "This weapon is already Rare.";
      const toMagic = weapon.rarity === "white";
      if (game.materials.scrap < (toMagic ? 8 : 24) || (!toMagic && game.materials.seals < 2)) return "Not enough crafting materials.";
      const focus = command.focus;
      if (!["sharp", "quick", "vigor"].includes(focus)) return "Choose an offensive, speed or survival forging focus.";
      game.materials.scrap -= toMagic ? 8 : 24;
      if (!toMagic) game.materials.seals -= 2;
      weapon.rarity = toMagic ? "magic" : "rare";
      if (!weapon.affixes.includes(focus)) weapon.affixes.push(focus);
      weapon.quality += 1;
      game.health = Math.min(maximumHealth(game), game.health + 16);
      log(game, "Forged " + itemTitle(weapon) + ". Its base attack remains " + WEAPONS[weapon.base].attack + ".", "milestone");
      return null;
    }
    case "engrave": {
      const id = command.skill;
      if (id !== "frost" && id !== "blood") return "Unknown engraving.";
      const charm = game.gear.charm;
      const price = charm.engraving ? 2 : 1;
      if (game.materials.sigils < price || game.materials.scrap < 5) return "Needs " + price + " Sigil and five Scrap.";
      if (charm.engraving === id) return "That ability is already engraved.";
      game.materials.sigils -= price;
      game.materials.scrap -= 5;
      charm.engraving = id;
      log(game, itemTitle(charm) + " now grants " + SKILLS[id].name + " while equipped.", "milestone");
      return null;
    }
    case "salvage": {
      const index = game.bag.findIndex(it => it.id === command.id);
      if (index < 0) return "Item not in bag.";
      const it = game.bag[index];
      if (it.locked) return "Item locked.";
      game.bag.splice(index, 1);
      game.materials.scrap += it.rarity === "rare" ? 10 : it.rarity === "magic" ? 6 : 3;
      if (it.rarity === "rare") game.materials.seals += 2;
      if (it.rarity === "magic") game.materials.seals += 1;
      game.lootPaused = false;
      log(game, "Salvaged " + itemTitle(it) + ".", "loot");
      return null;
    }
    case "claim": {
      if (game.bag.length >= BAG_CAPACITY) return "Clear bag space first.";
      const index = game.vault.findIndex(it => it.id === command.id);
      if (index < 0) return "Item not in reserve.";
      const it = game.vault.splice(index, 1)[0];
      game.bag.push(it);
      game.lootPaused = false;
      log(game, "Claimed protected " + itemTitle(it) + ".", "loot");
      return null;
    }
    case "lock": {
      const it = game.bag.find(it => it.id === command.id);
      if (!it) return "Item not in bag.";
      it.locked = !it.locked;
      return null;
    }
    default: return "Unknown action.";
  }
}
