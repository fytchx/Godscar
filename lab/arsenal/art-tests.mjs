import assert from "node:assert/strict";
import { combatIllustration, gearIllustration } from "./art.mjs";

const equipmentSlots = [
  "Weapon", "Off-hand", "Helm", "Chest", "Gloves", "Belt",
  "Legs", "Boots", "Ring 1", "Ring 2", "Amulet"
];

const svgIds = [];
for (const slot of equipmentSlots) {
  const svg = gearIllustration(slot);
  assert.match(svg, /^<svg class="gear-art/);
  assert.match(svg, new RegExp(`data-art-slot="${slot.replaceAll(" ", "\\s")}"`));
  assert.match(svg, /role="img" aria-label=/);
  assert.match(svg, /class="art-frame"/);
  svgIds.push(svg.match(/id="([^"]+)"/)?.[1]);
}
assert.equal(new Set(svgIds).size, equipmentSlots.length, "each inline SVG must have its own gradient id");

for (const monster of ["Blighted Husk", "Carrion Swarm", "Hollow Wisp"]) {
  const scene = combatIllustration(monster);
  assert.match(scene, new RegExp(`aria-label="A Warrior attacks ${monster}`));
  assert.match(scene, /class="hero-figure"/);
  assert.match(scene, /class="attack-slash"/);
  assert.match(scene, /class="impact-flare"/);
}

console.log("Gear placeholder and combat illustration checks passed.");
