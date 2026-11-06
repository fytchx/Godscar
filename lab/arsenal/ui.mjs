import { CONDUIT_LEVELS, HUNTS, SKILLS, SUPPORTS, WEAPONS, supportsFor } from "./catalog.mjs";
import { action, advance, availableSkillIds, BAG_CAPACITY, createGame, itemTitle, LAB_VERSION, summarize, VAULT_CAPACITY } from "./engine.mjs";

const SAVE_KEY = "godscar.living-arsenal.lab.v1"; // Isolated from original Godscar saves.
const root = document.getElementById("game");
let game = restore();
let lastFrame = Date.now();
let lastUiPaint = 0;
let notice = "";

function restore() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createGame();
    const state = JSON.parse(raw);
    if (state?.version !== LAB_VERSION || !Array.isArray(state.conduits) || !state.gear?.weapon) return createGame();
    return state;
  } catch {
    return createGame();
  }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch { notice = "Browser storage unavailable. This experiment may not persist."; }
}
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return seconds >= 3600 ? Math.floor(seconds / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m" : Math.floor(seconds / 60) + "m " + seconds % 60 + "s";
}
function chip(label, style = "") { return '<span class="chip ' + style + '">' + escapeHtml(label) + "</span>"; }
function panel(title, body, extra = "") {
  return '<section class="panel ' + extra + '"><h2>' + escapeHtml(title) + "</h2>" + body + "</section>";
}
function option(value, label, selected) {
  return '<option value="' + escapeHtml(value) + '"' + (selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
}
function weaponPanel(view) {
  const selected = game.gear.weapon;
  const weapon = WEAPONS[selected.base];
  const choices = game.bag.filter(i => i.slot === "weapon");
  const gear = '<div class="equipment-name">' + escapeHtml(itemTitle(selected)) + "</div>" +
    '<p class="muted">' + escapeHtml(weapon.description) + "</p>" +
    '<div class="tags">' + chip("Permanent: " + weapon.attack, "gold") + chip(weapon.type) +
    chip((view.intervalMs / 1000).toFixed(2) + "s interval") + chip(selected.rarity) + "</div>" +
    '<p class="micro">Weapon mastery (persists when swapping): ' + Object.entries(game.mastery).map(([key, n]) => escapeHtml(WEAPONS[key].name) + " " + n).join(" · ") + "</p>";
  const items = choices.map(i => '<div class="itemline"><span>' + escapeHtml(itemTitle(i)) + "</span>" +
    '<button data-action="equip" data-id="' + i.id + '">Equip</button></div>').join("");
  return panel("Your weapon", gear + '<h3>Try another style</h3>' + (items || '<p class="muted">No spare weapons in your bag.</p>'), "weapon");
}
function conduitPanel(view) {
  const available = availableSkillIds(game);
  const slots = CONDUIT_LEVELS.map((level, index) => {
    if (index >= view.unlocked) return '<div class="conduit locked"><span class="slot-number">0' + (index + 1) + '</span><div><strong>Locked conduit</strong><small>Unlocks at level ' + level + "</small></div></div>";
    const id = game.conduits[index], active = !!id && available.includes(id);
    const choices = option("", "Empty", !id) + available.map(skillId => option(skillId, SKILLS[skillId].name, skillId === id)).join("") +
      (id && !available.includes(id) ? option(id, SKILLS[id]?.name + " (source missing)", true) : "");
    const supportChoices = id && active ? option("", "No support", !game.supports[id]) +
      supportsFor(id).map(s => option(s.id, s.name, game.supports[id] === s.id)).join("") : "";
    return '<div class="conduit"><span class="slot-number">0' + (index + 1) + "</span><div class='conduit-body'>" +
      '<label for="skill-' + index + '">Autocast ability</label>' +
      '<select id="skill-' + index + '" data-change="assign" data-slot="' + index + '">' + choices + "</select>" +
      (id ? '<small>' + escapeHtml(SKILLS[id]?.description || "Unknown ability") + "</small>" : '<small>A free slot. Your weapon still fights.</small>') +
      (id && active ? '<label class="support-label" for="support-' + index + '">Support modifier · 6 Scrap to add/change</label><select id="support-' + index + '" data-change="support" data-skill="' + id + '">' + supportChoices + "</select>" : "") +
      (id && !active ? '<p class="warning-text">Item source unavailable. Slot waits for its return.</p>' : "") +
      "</div></div>";
  }).join("");
  return panel("Autocast conduits", '<p class="muted">Your primary attack is always active. These are additional, automatically triggered powers, not buttons to press.</p>' +
    '<div class="conduits">' + slots + "</div>");
}
function forgePanel() {
  const weapon = game.gear.weapon, next = weapon.rarity === "white" ? "Magic" : "Rare";
  const eligible = weapon.rarity !== "rare";
  const price = weapon.rarity === "white" ? "8 Scrap" : "24 Scrap + 2 Seals";
  const forge = '<div class="forge-row"><p>Refine the equipped ' + escapeHtml(WEAPONS[weapon.base].name) + " into " + next + " while preserving its attack and old stats.</p>" +
    '<div class="buttonrow">' + (eligible ? ['sharp', 'quick', 'vigor'].map(focus => '<button data-action="refine" data-focus="' + focus + '">' + ({ sharp: "Offense", quick: "Speed", vigor: "Survival" }[focus]) + "</button>").join("") : chip("Already Rare")) + "</div>" +
    '<p class="micro">Cost: ' + (eligible ? price : "none") + '. Current affixes: ' + (weapon.affixes.length ? weapon.affixes.map(escapeHtml).join(", ") : "none") + ".</p></div>";
  const charm = game.gear.charm;
  const engrave = '<div class="forge-row"><p><strong>Charm engraving</strong> grants an ability while the charm is equipped. Choose the style, then assign it to an unlocked conduit.</p>' +
    '<div class="buttonrow"><button data-action="engrave" data-skill="frost">Engrave Frost Lance</button>' +
    '<button data-action="engrave" data-skill="blood">Engrave Blood Mark</button></div>' +
    '<p class="micro">Current: ' + escapeHtml(charm.engraving ? SKILLS[charm.engraving].name : "none") + '. Cost: ' + (charm.engraving ? "2" : "1") + ' Sigil + 5 Scrap.</p></div>';
  return panel("The Forge", '<p class="muted">Every operation happens while you continue fighting. These early recipes preserve your item instead of risking total destruction.</p>' + forge + engrave);
}
function inventoryPanel() {
  const bag = game.bag.map(i => '<div class="itemline"><div><strong>' + escapeHtml(itemTitle(i)) + "</strong>" +
    (i.engraving ? '<small>Grants ' + escapeHtml(SKILLS[i.engraving].name) + "</small>" : "") + "</div>" +
    '<div class="buttonrow"><button data-action="equip" data-id="' + i.id + '">Equip</button><button class="secondary" data-action="lock" data-id="' + i.id + '">' + (i.locked ? "Unlock" : "Lock") + '</button><button class="secondary" data-action="salvage" data-id="' + i.id + '" ' + (i.locked ? "disabled" : "") + '>Salvage</button></div></div>').join("");
  const reserve = game.vault.map(i => '<div class="itemline">' + escapeHtml(itemTitle(i)) + '<button data-action="claim" data-id="' + i.id + '">Claim</button></div>').join("");
  return panel("Found equipment", '<p class="muted">Bag: ' + game.bag.length + "/" + BAG_CAPACITY + " · Protected reserve: " +
    game.vault.length + "/" + VAULT_CAPACITY + '. No rare item is silently destroyed. If storage fills, item rolls pause but XP and materials continue.</p>' +
    (game.lootPaused ? '<p class="warning-text">Equipment rolls paused by storage limits. Clear space to resume them.</p>' : "") +
    (bag || '<p class="muted">The bag is empty.</p>') +
    '<h3>Protected reserve</h3>' + (reserve || '<p class="muted">No protected items waiting.</p>'));
}
function huntPanel(view) {
  const hunting = Object.entries(HUNTS).map(([key, h]) => {
    const locked = game.level < h.level;
    return '<button class="hunt-option ' + (game.hunt === key ? "selected" : "") + '" data-action="hunt" data-hunt="' + key +
      '" ' + (locked ? "disabled" : "") + '><strong>' + escapeHtml(h.name) + "</strong><small>" + escapeHtml(locked ? "Unlocks level " + h.level : h.description) + "</small></button>";
  }).join("");
  return panel("World paths", '<p class="muted">The safe hunt never locks. Advance for rarer crafting resources or return to recover.</p>' +
    '<div class="hunt-options">' + hunting + '</div><div class="enemy-bar"><strong>' + escapeHtml(game.enemy?.name || "Enemy respawning") +
    '</strong><span>' + (game.enemy ? Math.max(0, Math.ceil(game.enemy.hp)) + "/" + game.enemy.maxHp : "Respawning") +
    '</span></div><div class="bar"><div style="width:' + (game.enemy ? Math.max(0, game.enemy.hp / game.enemy.maxHp * 100) : 0) + '%"></div></div>');
}
function activityPanel() {
  const lines = game.log.slice(-12).reverse().map(e =>
    '<li><span>' + formatTime(e.timeMs) + '</span><span class="' + escapeHtml(e.kind) + '">' + escapeHtml(e.message) + "</span></li>").join("");
  return panel("The combat ledger", '<p class="muted">Passive attacks, triggers and discoveries are recorded here.</p><ol class="ledger">' + lines + "</ol>");
}
function render() {
  const view = summarize(game);
  const heroHealth = Math.max(0, Math.round(game.health));
  const currentMax = view.healthMax;
  root.innerHTML = '<div class="page">' +
    '<header class="hero"><div class="brand"><div class="brand-glyph" aria-hidden="true">G<span>O</span>DSCAR</div>' +
    '<p>THE LIVING ARSENAL <span class="separator">/</span> PLAYABLE SYSTEMS LAB</p></div>' +
    '<a class="original-link" href="/">Original browser game</a></header>' +
    '<div class="intro"><div><p class="eyebrow">A wider world. An unending fight.</p><h1>Build the fight that fights for you.</h1>' +
    '<p>White weapons always attack. Find or forge more automatic powers, choose your path, and change direction without losing the road behind you.</p></div>' +
    '<div class="world-sigil" aria-hidden="true"><span class="sigil-ring"></span><span class="sigil-core">✧</span></div></div>' +
    '<section class="status-strip"><div><small>CHARACTER</small><b>Level ' + game.level + '</b><span>' + game.xp + '/' + view.xpNeeded + ' XP</span></div>' +
    '<div><small>LIFE / SHIELD</small><b>' + heroHealth + '/' + currentMax + '</b><span>Shield ' + Math.round(game.shield) + "</span></div>" +
    '<div><small>CRAFTING</small><b>' + game.materials.scrap + ' Scrap</b><span>' + game.materials.seals + ' Seals · ' + game.materials.sigils + ' Sigils</span></div>' +
    '<div><small>CONTINUOUS COMBAT</small><b>' + game.kills + ' kills</b><span>' + formatTime(game.timeMs) + ' simulated · ' + game.deaths + ' recoveries</span></div></section>' +
    (notice ? '<div class="notice" role="status">' + escapeHtml(notice) + '</div>' : "") +
    '<div class="column-layout"><div class="column">' + weaponPanel(view) + huntPanel(view) + "</div>" +
    '<div class="column">' + conduitPanel(view) + forgePanel() + "</div>" +
    '<div class="column">' + inventoryPanel() + activityPanel() + "</div></div>" +
    '<footer><p>Experimental V2 vertical slice. The original game is untouched. All numbers, world names and balance are provisional.</p></footer>' +
    "</div>";
}

function send(command) {
  const error = action(game, command);
  notice = error || "";
  persist();
  render();
}
root.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const type = button.dataset.action;
  const command = { type };
  for (const key of ["id", "hunt", "focus", "skill"]) if (button.dataset[key]) command[key] = button.dataset[key];
  send(command);
});
root.addEventListener("change", event => {
  const control = event.target.closest("[data-change]");
  if (!control) return;
  const type = control.dataset.change;
  if (type === "assign") send({ type: "assign", slot: Number(control.dataset.slot), skill: control.value || null });
  else if (type === "support") send({ type: "support", skill: control.dataset.skill, support: control.value || null });
});
window.addEventListener("pagehide", persist);
setInterval(() => {
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(4 * 60 * 60 * 1000, now - lastFrame));
  lastFrame = now;
  advance(game, elapsed);
  persist();
  if (now - lastUiPaint >= 1000 && document.activeElement?.tagName !== "SELECT") {
    lastUiPaint = now;
    render();
  }
}, 250);
render();
