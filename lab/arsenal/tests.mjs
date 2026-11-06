import assert from "node:assert/strict";
import { createGame, advance, action, summarize, availableSkillIds, BAG_CAPACITY, VAULT_CAPACITY } from "./engine.mjs";

function runFor(game, seconds) {
  const result = advance(game, seconds * 1000);
  assert.equal(result.capped, false, "test should not exceed event budget");
}
function test(name, fn) {
  try { fn(); console.log("PASS", name); }
  catch (error) { console.error("FAIL", name); throw error; }
}
test("white weapon auto-attacks without skills or input", () => {
  const g = createGame(3);
  assert.equal(summarize(g).attackName, "Measured Slash");
  runFor(g, 40);
  assert.ok(g.primaryHits > 4);
  assert.ok(g.kills > 0);
  assert.ok(g.materials.scrap > 0);
});
test("different white weapons change primary and preserve mastery history", () => {
  const g = createGame(12);
  runFor(g, 10);
  const swordHits = g.mastery.sword;
  assert.equal(action(g, { type: "equip", id: g.bag.find(i => i.base === "dagger").id }), null);
  assert.equal(summarize(g).attackName, "Twin Cuts");
  runFor(g, 10);
  assert.equal(g.mastery.sword, swordHits);
  assert.ok(g.mastery.dagger > 0);
  assert.equal(action(g, { type: "equip", id: g.bag.find(i => i.base === "wand").id }), null);
  assert.equal(summarize(g).damageType, "fire");
  runFor(g, 10);
  assert.ok(g.mastery.wand > 0);
});
test("five conduit levels exist, sixth cannot be assigned", () => {
  const g = createGame(1);
  assert.equal(summarize(g).unlocked, 0);
  assert.ok(action(g, { type: "assign", slot: 0, skill: "ember" }));
  g.level = 2;
  assert.equal(summarize(g).unlocked, 1);
  assert.equal(action(g, { type: "assign", slot: 0, skill: "ember" }), null);
  assert.ok(action(g, { type: "assign", slot: 1, skill: "ember" }));
  g.level = 50;
  assert.equal(summarize(g).unlocked, 5);
  assert.ok(action(g, { type: "assign", slot: 5, skill: "ember" }));
  assert.equal(g.conduits.length, 5);
});
test("removing equipment source disables an engraving, preserves build selection", () => {
  const g = createGame(20);
  g.level = 10;
  g.gear.charm.engraving = "frost";
  assert.equal(action(g, { type: "assign", slot: 0, skill: "frost" }), null);
  assert.ok(summarize(g).activeSkills.includes("frost"));
  g.bag.push({ id: "spare", slot: "charm", base: "talisman", rarity: "white", affixes: [], quality: 0, engraving: null });
  assert.equal(action(g, { type: "equip", id: "spare" }), null);
  assert.equal(g.conduits[0], "frost");
  assert.ok(!summarize(g).activeSkills.includes("frost"));
});
test("tagged supports need the correct skill and Scrap", () => {
  const g = createGame(21);
  g.level = 2;
  assert.equal(action(g, { type: "assign", slot: 0, skill: "ember" }), null);
  assert.ok(action(g, { type: "support", skill: "ember", support: "echo" }));
  assert.ok(action(g, { type: "support", skill: "ember", support: "lingering" }));
  g.materials.scrap = 7;
  assert.equal(action(g, { type: "support", skill: "ember", support: "lingering" }), null);
  assert.equal(g.materials.scrap, 1);
});
test("progression has a reliable free resource floor and safe route", () => {
  const g = createGame(33);
  runFor(g, 280);
  assert.ok(g.level > 2);
  assert.ok(g.materials.scrap >= 8);
  assert.ok(g.kills >= 10);
  assert.equal(action(g, { type: "hunt", hunt: "meadow" }), null);
});
test("crafting preserves the weapon base and rejects insufficient funds", () => {
  const g = createGame(43);
  assert.ok(action(g, { type: "refine", focus: "sharp" }));
  g.materials.scrap = 40; g.materials.seals = 5;
  assert.equal(action(g, { type: "refine", focus: "sharp" }), null);
  assert.equal(g.gear.weapon.rarity, "magic");
  assert.equal(action(g, { type: "refine", focus: "quick" }), null);
  assert.equal(g.gear.weapon.rarity, "rare");
  assert.equal(g.gear.weapon.base, "sword");
  assert.ok(g.gear.weapon.affixes.includes("sharp") && g.gear.weapon.affixes.includes("quick"));
});
test("engraving is item sourced and can be changed for resources", () => {
  const g = createGame(87);
  g.materials.scrap = 25; g.materials.sigils = 4; g.level = 10;
  assert.equal(action(g, { type: "engrave", skill: "frost" }), null);
  assert.ok(availableSkillIds(g).includes("frost"));
  assert.equal(action(g, { type: "engrave", skill: "blood" }), null);
  assert.ok(!availableSkillIds(g).includes("frost"));
  assert.ok(availableSkillIds(g).includes("blood"));
});
test("single long advance and split advances are deterministic", () => {
  const a = createGame(55), b = createGame(55);
  runFor(a, 600);
  for (let i = 0; i < 60; i++) runFor(b, 10);
  assert.deepEqual(a, b);
});
test("invalid actions never change state", () => {
  const g = createGame(67);
  const before = JSON.stringify(g);
  assert.ok(action(g, { type: "equip", id: "not-an-item" }));
  assert.ok(action(g, { type: "assign", slot: 9, skill: "ember" }));
  assert.ok(action(g, { type: "refine", focus: "unknown" }));
  assert.equal(JSON.stringify(g), before);
});
test("protected Rare overflow never silently destroys a rare find", () => {
  const g = createGame(11);
  g.bag = Array.from({ length: BAG_CAPACITY }, (_, i) => ({ id: "full" + i, slot: "weapon", base: "sword", rarity: "white", affixes: [], quality: 0 }));
  g.vault = Array.from({ length: VAULT_CAPACITY }, (_, i) => ({ id: "vault" + i, slot: "weapon", base: "sword", rarity: "rare", affixes: [], quality: 0 }));
  runFor(g, 30);
  assert.equal(g.vault.length, VAULT_CAPACITY);
  assert.ok(g.lootPaused);
  assert.ok(g.materials.scrap > 0);
  assert.ok(g.kills > 0);
});
console.log("Living Arsenal systems lab tests complete.");
