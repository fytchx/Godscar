import { AFFIXES, CONDUIT_LEVELS, HUNTS, SKILLS, SLOT_LABELS, SUPPORTS, WEAPONS, supportsFor } from "./catalog.mjs";
import { action, advance, availableSkillIds, BAG_CAPACITY, createGame, itemTitle, LAB_VERSION, summarize, VAULT_CAPACITY } from "./engine.mjs";

const SAVE_KEY = "godscar.living-arsenal.lab.v2";
const root = document.getElementById("game");
let game = restore();
let lastFrame = Date.now();
let lastUiPaint = 0;
let notice = "";
let selectedTab = "battle";

function restore() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createGame();
    const state = JSON.parse(raw);
    if (state?.version !== LAB_VERSION || !Array.isArray(state.conduits) || !state.gear?.weapon) return createGame();
    const elapsed = Math.max(0, Math.min(4 * 60 * 60 * 1000, Date.now() - (state.savedAtWallMs || Date.now())));
    if (elapsed > 0) advance(state, elapsed);
    return state;
  } catch {
    return createGame();
  }
}
function persist() {
  try {
    game.savedAtWallMs = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch {
    notice = "Browser storage is unavailable. This lab may not save.";
  }
}
function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function shortTime(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return sec >= 3600 ? Math.floor(sec / 3600) + "h " + Math.floor(sec % 3600 / 60) + "m" : Math.floor(sec / 60) + "m " + sec % 60 + "s";
}
function rarity(it) { return it.rarity === "rare" ? "rare" : it.rarity === "magic" ? "magic" : "common"; }
function affixLine(it) {
  if (!it.affixes?.length && !it.engraving && !it.set) return "Unmarked base";
  const values = (it.affixes || []).map(key => AFFIXES[key]?.short || key);
  if (it.engraving) values.push("Grants " + (SKILLS[it.engraving]?.name || it.engraving));
  if (it.set) values.push("Ashen Warden set");
  return values.join(" · ");
}
function icon(name) {
  const icons = {
    weapon: "⚔", helm: "◈", chest: "▣", gloves: "✣", boots: "⌁", offhand: "⬡", ring: "◉", belt: "▤", charm: "✧",
    ember: "♨", aegis: "⛨", hawk: "⌁", frost: "❄", blood: "✣", scrap: "◆", seals: "⬢", sigils: "✦"
  };
  return icons[name] || "◇";
}
function nav() {
  const tabs = [["battle", "The Hunt"], ["build", "Build & Gear"], ["forge", "The Forge"]];
  return '<nav class="main-nav" aria-label="Prototype sections">' + tabs.map(([id, label]) =>
    '<button class="nav-tab ' + (selectedTab === id ? "active" : "") + '" data-tab="' + id + '">' + esc(label) + "</button>").join("") +
    '<a class="nav-tab original-link" href="/">Original Godscar</a></nav>';
}
function sceneSvg(enemy, boss) {
  const foe = boss
    ? '<path d="M804 248l20-40 10 8 16-52 19 38 20-28 10 58 31 16-8 75H794z" fill="#1a1a1b"/><circle cx="843" cy="244" r="4" fill="#db6d62"/><circle cx="873" cy="244" r="4" fill="#db6d62"/><path d="M821 269h56" stroke="#b4564f" stroke-width="5"/>'
    : '<path d="M815 288q2-43 32-58l17-34 19 35q28 22 30 57l-12 44h-72z" fill="#212528"/><path d="M831 248l16 8m18-8l16-8" stroke="#c88758" stroke-width="4"/><circle cx="852" cy="269" r="5" fill="#d59f63"/>';
  return '<svg viewBox="0 0 1100 390" role="img" aria-label="A lone hunter faces ' + esc(enemy?.name || "the foe") + ' in a ruined marsh." preserveAspectRatio="xMidYMid slice">' +
    '<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#273a43"/><stop offset=".58" stop-color="#6d5947"/><stop offset="1" stop-color="#292b28"/></linearGradient><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#b49a70" stop-opacity=".05"/><stop offset="1" stop-color="#bcc1aa" stop-opacity=".26"/></linearGradient></defs>' +
    '<rect width="1100" height="390" fill="url(#sky)"/><circle cx="548" cy="100" r="49" fill="#d2b985" opacity=".68"/><path d="M0 220L140 112l113 104 155-143 149 155 144-120 158 120 124-128 107 106v104H0z" fill="#303938" opacity=".95"/><path d="M0 255l159-66 130 79 146-84 167 100 164-78 166 73 168-88v99H0z" fill="#45443b"/><path d="M137 260v-98l25-21 24 21v98m0-67h43v67m531 2V132l40-34 44 34v131m-79-63h77" fill="none" stroke="#292d2b" stroke-width="14" opacity=".86"/><path d="M0 260q180-22 320 9t279-3 501 3v121H0z" fill="url(#mist)"/><path d="M0 333q185-25 334 2t310-3 456 10v48H0z" fill="#252927"/><path d="M180 337l22-89 18 51 28-73 15 118m572-9 26-90 17 45 24-79 18 121" fill="#202522"/><path d="M540 63l57 90" stroke="#a8504a" stroke-width="9" opacity=".78"/>' +
    '<g transform="translate(0 0)"><circle cx="369" cy="227" r="20" fill="#c2aa86"/><path d="M349 222q9-38 38-7l-4 16h-31z" fill="#283037"/><path d="M349 250q20-15 39 0l15 70-13 26h-44l-9-27z" fill="#30373b"/><path d="M357 275l-32 42m57-36 35 27m-49 10-17 47m34-46 23 46" stroke="#b7a281" stroke-width="12" stroke-linecap="round"/><path d="M403 286l42-53" stroke="#d0bd93" stroke-width="6"/><path d="M439 247l10-22 5 20" fill="#d0bd93"/></g>' + foe +
    '<rect width="1100" height="390" fill="#0c1415" opacity=".15"/></svg>';
}
function meter(label, value, max, kind = "health") {
  const percent = Math.max(0, Math.min(100, max ? value / max * 100 : 0));
  return '<div class="meter ' + kind + '"><div class="meter-caption"><span>' + esc(label) + '</span><b>' + Math.round(value) + ' / ' + Math.round(max) + '</b></div><div class="meter-track"><i style="width:' + percent + '%"></i></div></div>';
}
function topbar(view) {
  return '<header class="topbar"><div class="brand"><div class="brand-mark"><i></i></div><div><div class="brand-name">GODSCAR</div><div class="brand-sub">THE LIVING ARSENAL <span>·</span> PLAYABLE PROTOTYPE</div></div></div>' + nav() +
    '<div class="top-resource"><span>◆</span> ' + game.materials.scrap + ' <small>scrap</small></div></header>' +
    '<div class="page-title"><div><div class="eyebrow">' + esc(HUNTS[game.hunt].region) + ' <span> / </span> Character ' + game.level + '</div><h1>' + esc(HUNTS[game.hunt].name) + '</h1></div><div class="p-title-right"><span class="session-state"><i></i> AUTO-HUNTING</span><span class="counter">' + game.kills + ' kills</span></div></div>';
}
function battlePanel(view) {
  const enemy = game.enemy;
  const hunt = HUNTS[game.hunt];
  const hpPercent = enemy ? Math.max(0, enemy.hp / enemy.maxHp * 100) : 0;
  const latest = game.log.slice(-3).reverse();
  return '<section class="battle-card panel"><div class="battle-head"><div><span class="section-kicker">CURRENT ENCOUNTER</span><h2>' + esc(enemy?.name || "Returning foe") + (enemy?.boss ? '<span class="boss-mark">BOSS</span>' : "") + '</h2><p>' + esc(hunt.region) + ' <span class="dot-sep">·</span> ' + (enemy?.boss ? "Named encounter" : "Hunt in progress") + '</p></div><div class="enemy-health">' + meter("FOE VITALITY", Math.max(0, enemy?.hp || 0), enemy?.maxHp || 1, "enemy") + '</div></div>' +
    '<div class="scene" data-hp="' + hpPercent + '">' + sceneSvg(enemy, enemy?.boss) + '<div class="scene-vignette"></div><div class="scene-legend"><span class="legend-hero"><i></i> YOUR WARDEN</span><span class="legend-foe"><i></i> ' + esc(enemy?.name || hunt.enemy).toUpperCase() + '</span></div><div class="scene-callout"><span class="callout-symbol">' + icon("weapon") + '</span><div><small>WEAPON ART</small><b>' + esc(view.weaponArt) + '</b><span>Every ' + view.weaponArtEvery + 'th primary hit</span></div></div></div>' +
    '<div class="fight-foot"><div class="hero-health">' + meter("WARDEN VITALITY", game.health, view.healthMax, "health") + '<div class="micro-stats"><span>Shield ' + Math.round(game.shield) + '</span><span>Armor ' + view.armor + '</span><span>' + (view.intervalMs / 1000).toFixed(2) + 's attack</span></div></div>' +
    '<div class="fight-cycle"><div class="cycle-icon">↻</div><div><b>Automatic combat</b><small>Weapon, arts and assigned powers fire while you manage your build.</small></div></div></div>' +
    '<div class="hunt-strip"><div class="strip-label">CHOOSE A HUNT</div><div class="hunt-options">' + Object.entries(HUNTS).map(([key, option]) => {
      const locked = game.level < option.level;
      return '<button class="hunt-option ' + (game.hunt === key ? "selected" : "") + '" data-action="hunt" data-hunt="' + key + '" ' + (locked ? "disabled" : "") + '><span class="hunt-emblem">' + (option.boss ? "♜" : key === "rift" ? "◈" : "♧") + '</span><span><b>' + esc(option.name) + '</b><small>' + esc(locked ? "Opens at level " + option.level : option.description) + '</small></span>' + (game.hunt === key ? '<i class="hunt-live">HUNTING</i>' : "") + '</button>';
    }).join("") + '</div></div><div class="battle-log"><span class="section-kicker">RECENT BATTLE LEDGER</span><ol>' + (latest.length ? latest.map(entry => '<li class="' + esc(entry.kind) + '"><i></i>' + esc(entry.message) + '</li>').join("") : '<li><i></i>The first strike is moments away.</li>') + '</ol></div></section>';
}
function buildPanel(view) {
  const currentWeapon = game.gear.weapon;
  const weapon = WEAPONS[currentWeapon.base];
  const active = view.activeSkills;
  const slots = CONDUIT_LEVELS.map((unlock, index) => {
    const unlocked = game.level >= unlock;
    const id = game.conduits[index];
    const options = '<option value="">Empty</option>' + availableSkillIds(game).map(skillId => '<option value="' + skillId + '" ' + (skillId === id ? "selected" : "") + '>' + esc(SKILLS[skillId].name) + '</option>').join("");
    if (!unlocked) return '<div class="ability-row locked"><span class="ability-icon">' + String(index + 1).padStart(2, "0") + '</span><span class="ability-copy"><b>Sealed conduit</b><small>Opens at level ' + unlock + '</small></span><span class="lock-etch">LOCKED</span></div>';
    return '<div class="ability-row ' + (id && active.includes(id) ? "assigned" : "") + '"><span class="ability-icon">' + (id ? icon(id) : String(index + 1).padStart(2, "0")) + '</span><span class="ability-copy"><select data-change="assign" data-slot="' + index + '" aria-label="Assign ability slot ' + (index + 1) + '">' + options + '</select><small>' + (id ? esc(SKILLS[id].description) : "Weapon art remains active without a conduit.") + '</small></span><span class="auto-tag">AUTO</span></div>';
  }).join("");
  const wardenPieces = Object.values(game.gear).filter(it => it?.set === "warden").length;
  return '<section class="panel build-panel"><div class="panel-head"><div><span class="section-kicker">BUILD ENGINE</span><h2>Your Arsenal</h2></div><span class="set-counter">' + (wardenPieces ? 'WARDEN ' + wardenPieces + '/2' : 'FIELD KIT') + '</span></div>' +
    '<div class="weapon-feature"><div class="weapon-sigil">' + icon("weapon") + '<span></span></div><div class="weapon-main"><small>EQUIPPED WEAPON</small><h3>' + esc(itemTitle(currentWeapon)) + '</h3><p>' + esc(weapon.description) + '</p><div class="weapon-tags"><span>' + esc(weapon.type.toUpperCase()) + '</span><span>' + (view.intervalMs / 1000).toFixed(2) + ' SEC</span><span>' + view.masteryCount + ' MASTERY</span></div></div></div>' +
    '<div class="weapon-art-row"><span class="art-crest">✦</span><div><small>WEAPON-BOUND ART</small><b>' + esc(weapon.art) + '</b><span>Only this weapon family can call it.</span></div><span class="art-trigger">' + weapon.artEvery + '<small>HITS</small></span></div>' +
    '<div class="conduit-title"><span>LEARNED POWERS</span><small>' + active.length + ' / ' + view.unlocked + ' ACTIVE</small></div><div class="ability-list">' + slots + '</div>' +
    '<div class="xp-block"><div class="xp-top"><span>CHARACTER GROWTH</span><b>LV ' + game.level + '</b></div><div class="meter-track xp"><i style="width:' + view.xpPercent + '%"></i></div><small>' + game.xp + ' / ' + view.xpNeeded + ' XP <span>· next conduit milestones at 2 / 5 / 10 / 18 / 30</span></small></div></section>';
}
function gearPanel() {
  const slots = Object.entries(SLOT_LABELS);
  const rows = slots.map(([key, label]) => {
    const item = game.gear[key];
    const options = game.bag.filter(found => found.slot === key).map(found => '<button class="mini-action" data-action="equip" data-id="' + esc(found.id) + '" title="Equip ' + esc(itemTitle(found)) + '">⇄</button>').join("");
    return '<div class="gear-row"><span class="gear-icon">' + icon(key) + '</span><div class="gear-desc"><small>' + esc(label) + '</small><b class="' + (item ? rarity(item) : "empty") + '">' + (item ? esc(itemTitle(item)) : "Empty") + '</b><span>' + (item ? esc(affixLine(item)) : "Find a drop to fill this slot") + '</span></div>' + options + '</div>';
  }).join("");
  return '<section class="panel gear-panel"><div class="panel-head"><div><span class="section-kicker">EQUIPPED KIT</span><h2>Field Gear</h2></div><span class="gear-count">' + Object.values(game.gear).filter(Boolean).length + ' pieces</span></div><div class="gear-grid">' + rows + '</div><div class="set-note"><span>✦</span><div><b>Ashen Warden regalia</b><small>Collect 2 marked armor pieces for +6 Armor. Set progress stays visible here.</small></div><strong>' + wardenCount() + '/2</strong></div></section>';
}
function wardenCount() { return Object.values(game.gear).filter(it => it?.set === "warden").length; }
function inventoryPanel() {
  const items = game.bag.map(it => '<article class="loot-card ' + rarity(it) + (it.locked ? " locked-item" : "") + '"><div class="loot-icon">' + icon(it.slot) + '</div><div class="loot-info"><div class="loot-title ' + rarity(it) + '">' + esc(itemTitle(it)) + '</div><small>' + esc(SLOT_LABELS[it.slot] || it.slot) + ' <span>·</span> ' + esc(affixLine(it)) + '</small></div><div class="loot-buttons"><button data-action="equip" data-id="' + esc(it.id) + '">Equip</button><button class="quiet" data-action="lock" data-id="' + esc(it.id) + '" aria-label="' + (it.locked ? "Unlock" : "Lock") + ' item">' + (it.locked ? "◆" : "◇") + '</button><button class="quiet" data-action="salvage" data-id="' + esc(it.id) + '" ' + (it.locked ? "disabled" : "") + '>Salvage</button></div></article>').join("");
  const vault = game.vault.map(it => '<div class="reserve-row"><span class="rarity-dot rare"></span><b>' + esc(itemTitle(it)) + '</b><button data-action="claim" data-id="' + esc(it.id) + '">Recover</button></div>').join("");
  return '<section class="panel loot-panel"><div class="panel-head"><div><span class="section-kicker">FIELD FINDS</span><h2>Recovered Loot</h2></div><span class="bag-count">' + game.bag.length + ' / ' + BAG_CAPACITY + '</span></div><p class="panel-intro">The fight keeps going. Compare a drop, equip it, lock it, or break it down at the Forge.</p>' +
    (game.lootPaused ? '<div class="notice">Your bag and reserve are full. New gear rolls are paused; your hunt still earns XP and materials.</div>' : "") +
    '<div class="loot-list">' + (items || '<div class="empty-state">No loose gear. The next find is already on its way.</div>') + '</div><div class="reserve-head">PROTECTED RESERVE <span>' + game.vault.length + ' / ' + VAULT_CAPACITY + '</span></div>' + (vault || '<small class="muted">Rare overflow waits here safely.</small>') + '</section>';
}
function forgePanel() {
  const weapon = game.gear.weapon;
  const next = weapon.rarity === "white" ? "Magic" : "Rare";
  const price = weapon.rarity === "white" ? "8 Scrap" : "24 Scrap + 2 Seals";
  const enabled = weapon.rarity !== "rare" && game.materials.scrap >= (weapon.rarity === "white" ? 8 : 24) && (weapon.rarity === "white" || game.materials.seals >= 2);
  const charm = game.gear.charm;
  return '<section class="panel forge-panel"><div class="panel-head"><div><span class="section-kicker">CRAFT WITH INTENT</span><h2>The Forge</h2></div><span class="forge-flame">♨</span></div>' +
    '<div class="recipe-card"><div class="recipe-title"><span class="recipe-icon">⚒</span><div><small>WEAPON REFINEMENT</small><b>' + esc(itemTitle(weapon)) + '</b></div></div><p>Promote this exact base to ' + next + '. Choose the property; its weapon art and mastery stay with it.</p><div class="recipe-options">' +
    ['sharp', 'quick', 'vigor'].map(key => '<button data-action="refine" data-focus="' + key + '" ' + (!enabled ? "disabled" : "") + '><b>' + esc(AFFIXES[key].name) + '</b><small>' + esc(AFFIXES[key].detail) + '</small></button>').join("") +
    '</div><div class="recipe-cost">COST <b>' + (weapon.rarity === "rare" ? "Already Rare" : price) + '</b><span>' + game.materials.scrap + ' Scrap · ' + game.materials.seals + ' Seals available</span></div></div>' +
    '<div class="recipe-card engraving"><div class="recipe-title"><span class="recipe-icon">✦</span><div><small>CHARM ENGRAVING</small><b>' + esc(itemTitle(charm)) + '</b></div></div><p>Find a Sigil, choose an inscription, then assign it to an open conduit.</p><div class="recipe-options">' +
    ['frost', 'blood'].map(id => '<button data-action="engrave" data-skill="' + id + '" ' + (game.materials.sigils < (charm.engraving ? 2 : 1) || game.materials.scrap < 5 ? "disabled" : "") + '><b>' + esc(SKILLS[id].name) + '</b><small>' + (charm.engraving === id ? "Currently inscribed" : esc(SKILLS[id].description)) + '</small></button>').join("") +
    '</div><div class="recipe-cost">COST <b>' + (charm.engraving ? "2 Sigils + 5 Scrap" : "1 Sigil + 5 Scrap") + '</b><span>' + game.materials.sigils + ' Sigils available</span></div></div></section>';
}
function economy() {
  return '<section class="material-strip"><div><span class="material-icon scrap">◆</span><span><small>SCRAP</small><b>' + game.materials.scrap + '</b></span><small>Common salvage</small></div><div><span class="material-icon seals">⬢</span><span><small>SEALS</small><b>' + game.materials.seals + '</b></span><small>Rare refinement</small></div><div><span class="material-icon sigils">✦</span><span><small>SIGILS</small><b>' + game.materials.sigils + '</b></span><small>Ability engraving</small></div></section>';
}
function render() {
  const view = summarize(game);
  root.innerHTML = '<div class="app-frame">' + topbar(view) +
    (notice ? '<div class="notice global-notice" role="status">' + esc(notice) + '</div>' : "") +
    (selectedTab === "battle" ? '<main class="main-layout"><div class="primary-column">' + battlePanel(view) + economy() + inventoryPanel() + '</div><aside class="side-column">' + buildPanel(view) + gearPanel() + forgePanel() + '</aside></main>' :
     selectedTab === "build" ? '<main class="tab-layout"><div class="side-column">' + buildPanel(view) + gearPanel() + '</div><div class="primary-column">' + inventoryPanel() + economy() + '</div></main>' :
     '<main class="tab-layout"><div class="primary-column">' + forgePanel() + economy() + '</div><div class="side-column">' + buildPanel(view) + gearPanel() + '</div></main>') +
    '<footer class="site-footer"><span>GODSCAR · LIVING ARSENAL EXPERIMENT</span><span>Browser-local save · Offline catch-up capped at 4h · Balance provisional</span></footer></div>';
}
function send(command) {
  const error = action(game, command);
  notice = error || "";
  persist();
  render();
}
root.addEventListener("click", event => {
  const tab = event.target.closest("[data-tab]");
  if (tab) { selectedTab = tab.dataset.tab; render(); return; }
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const command = { type: button.dataset.action };
  for (const key of ["id", "hunt", "focus", "skill"]) if (button.dataset[key]) command[key] = button.dataset[key];
  send(command);
});
root.addEventListener("change", event => {
  const control = event.target.closest("[data-change]");
  if (control?.dataset.change === "assign") send({ type: "assign", slot: Number(control.dataset.slot), skill: control.value || null });
});
window.addEventListener("pagehide", persist);
setInterval(() => {
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(4 * 60 * 60 * 1000, now - lastFrame));
  lastFrame = now;
  advance(game, elapsed);
  persist();
  if (now - lastUiPaint >= 900 && document.activeElement?.tagName !== "SELECT") {
    lastUiPaint = now;
    render();
  }
}, 250);
render();
