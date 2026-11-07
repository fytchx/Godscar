/* Stage 1 is a UI map only. Keep it independent from the game simulation and save. */
const root = document.getElementById("game");
const tabs = ["Fight", "Gear", "Bag", "Build", "Forge"];
let activeTab = "Fight";
let selectedSlot = "Weapon";
let selectedMonster = "Blighted Husk";
let openCard = "";
const slots = ["Weapon", "Off-hand", "Helm", "Chest", "Gloves", "Belt", "Legs", "Boots", "Ring 1", "Ring 2", "Amulet"];
const gearNames = { Weapon: "Sword", "Off-hand": "Empty", Helm: "Empty", Chest: "Empty", Gloves: "Empty", Belt: "Empty", Legs: "Empty", Boots: "Empty", "Ring 1": "Empty", "Ring 2": "Empty", Amulet: "Empty" };
const monsters = [
  ["Blighted Husk", "Blighted · slow, steady hits", "75 base life"],
  ["Carrion Swarm", "Blighted · frequent small hits", "30 base life"],
  ["Hollow Wisp", "Fire damage · resists fire", "42 base life"]
];
const demoItems = [
  ["Rare", "Rusted Longsword", "Weapon", "+ primary attack damage", "Possible upgrade"],
  ["Magic", "Ashen Buckler", "Off-hand", "+ physical resistance", "Compare with equipped"],
  ["Common", "Worn Iron Helm", "Helm", "No affixes", "Salvage candidate"]
];
const esc = text => String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name) => `<span class="icon" aria-hidden="true">${({ Fight:"⚔", Gear:"◈", Bag:"▣", Build:"✦", Forge:"⌁", Weapon:"⚔", "Off-hand":"⬡", Helm:"◉", Chest:"▤", Gloves:"✣", Belt:"═", Legs:"⌁", Boots:"⌑", "Ring 1":"◌", "Ring 2":"◌", Amulet:"◇", Common:"◇", Magic:"◈", Rare:"◆" })[name] || "◇"}</span>`;
function header() {
  return `<header class="topbar"><div class="brand"><span class="scar-mark">G</span><div><div class="wordmark">GODSCAR</div><div class="identity">WARRIOR <span>·</span> LEVEL 1</div></div></div><div class="gold"><span>✦</span> 0 <small>GOLD</small></div></header>
    <section class="combat-ribbon" aria-label="Combat status"><div class="fight-line"><span class="live-dot"></span><span>FIGHTING</span><span class="slash">/</span><b>${esc(selectedMonster)}</b><span class="spacer"></span><span class="stage">STAGE 1</span></div>
    <div class="meter-row"><span class="meter-label">YOU</span><div class="meter"><i class="health" style="width:82%"></i></div><span class="meter-value">106 / 130</span></div>
    <div class="meter-row foe-row"><span class="meter-label">FOE</span><div class="meter"><i class="foe" style="width:64%"></i></div><span class="meter-value">48 / 75</span></div>
    <div class="xp-row"><span>CHARACTER XP</span><div class="meter xp"><i style="width:28%"></i></div><span>28%</span></div></section>
    <aside class="preview-note"><b>LAYOUT PREVIEW</b><span>Sample values · controls do not change gameplay</span></aside>`;
}
function title(kicker, title, sub="") { return `<div class="page-heading"><div class="kicker">${kicker}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>`; }
function cardHeading(title, right="") { return `<div class="card-heading"><h2>${title}</h2>${right}</div>`; }
function meter(label, amount, type="") { return `<div class="named-meter"><div><span>${label}</span><b>${amount}</b></div><div class="meter ${type}"><i style="width:${type === "xp" ? "28%" : "64%"}"></i></div></div>`; }
function fightScreen() {
  return `${title("THE FALLFIELDS · HUNT", "Fight", "Your character keeps attacking while you manage the rest of the game.")}
  <section class="card encounter">${cardHeading("Current encounter", '<span class="tag live">AUTO</span>')}<div class="encounter-main"><div class="enemy-token">${icon("Fight")}</div><div class="enemy-copy"><h3>${esc(selectedMonster)}</h3><p>${selectedMonster === "Blighted Husk" ? "Blighted · regenerates over time" : selectedMonster === "Carrion Swarm" ? "Blighted · many quick attacks" : "Fire damage · vulnerable to lightning"}</p></div></div>${meter("ENEMY LIFE", "48 / 75", "foe")}<div class="divider"></div><div class="attack-row"><span class="primary-icon">⚔</span><div><small>WEAPON ATTACK · ALWAYS ACTIVE</small><b>Cleave</b></div><span class="secondary">Sword</span></div></section>
  <section class="card">${cardHeading("Choose enemy", '<span class="muted">The Fallfields</span>')}<div class="enemy-list">${monsters.map(([name, desc, hp]) => `<button class="enemy-option ${selectedMonster === name ? "selected" : ""}" data-monster="${esc(name)}"><span class="select-mark">${selectedMonster === name ? "●" : "○"}</span><span class="enemy-label"><b>${name}</b><small>${desc}</small></span><span class="enemy-hp">${hp}</span></button>`).join("")}</div></section>
  <section class="card">${cardHeading("Hunt settings", '<span class="tag">SESSION</span>')}<div class="setting-row"><span><b>Auto-push stages</b><small>Move forward when a stage is cleared.</small></span><span class="switch on" aria-label="Preview toggle"><i></i></span></div><div class="setting-row"><span><b>Retry after defeat</b><small>Choose how the hunt resumes.</small></span><span class="select-preview">Current stage⌄</span></div></section>
  <section class="card start-here"><span class="start-number">1</span><div><b>Start here</b><p>Fight runs on its own. Gear improves your character, Build changes your powers, and Bag is where you decide what to keep.</p></div></section>`;
}
function gearScreen() {
  const item = gearNames[selectedSlot];
  return `${title("CHARACTER · EQUIPPED ITEMS", "Gear", "Each slot holds one item. Tap a slot to inspect it.")}
  <section class="card gear-card">${cardHeading("Equipped gear", `<span class="tag">${Object.values(gearNames).filter(x => x !== "Empty").length} / 11</span>`)}<div class="gear-grid">${slots.map(slot => `<button class="gear-slot ${selectedSlot === slot ? "chosen" : ""}" data-slot="${slot}">${icon(slot)}<span><small>${slot}</small><b class="${gearNames[slot] === "Empty" ? "empty" : ""}">${gearNames[slot]}</b></span><span class="chevron">›</span></button>`).join("")}</div></section>
  <section class="card item-detail">${cardHeading("Selected slot", `<span class="tag">${esc(selectedSlot.toUpperCase())}</span>`)}<div class="detail-item">${icon(selectedSlot)}<div><small>EQUIPPED ITEM</small><h3>${esc(item)}</h3><p>${item === "Sword" ? "Your primary weapon. Primary attacks continue automatically." : "This slot is currently empty."}</p></div></div>${item === "Sword" ? '<div class="property"><span>Item type</span><b>One-handed weapon</b></div><div class="property"><span>Build connection</span><b>Warrior · Cleave</b></div>' : '<p class="hint">Drops that fit this slot appear in Bag. Compare first, then equip.</p>'}</section>
  <section class="card compact-card">${cardHeading("Character defenses")}<div class="stat-grid"><div><small>LIFE</small><b>130</b></div><div><small>ARMOR</small><b>—</b></div><div><small>RESISTANCES</small><b>View details</b></div></div></section>`;
}
function bagScreen() {
  return `${title("ITEMS · LOOT DECISIONS", "Bag", "Review drops here. The fight continues while you compare.")}
  <section class="card bag-summary">${cardHeading("Inventory", '<span class="bag-cap">3 / 36</span>')}<div class="filter-row"><button class="filter active">All</button><button class="filter">Weapons</button><button class="filter">Armor</button><button class="filter">Jewelry</button></div></section>
  <section class="loot-list">${demoItems.map(([rarity, name, slot, affix, verdict]) => `<article class="card loot-item ${rarity.toLowerCase()}"><div class="loot-top">${icon(rarity)}<div class="loot-name"><span class="rarity-label">${rarity.toUpperCase()}</span><h3>${name}</h3><small>${slot} <span>·</span> ${affix}</small></div><button class="more" data-card="${name}" aria-label="Inspect ${name}">•••</button></div>${openCard === name ? `<div class="loot-inspect"><div class="property"><span>Quick read</span><b>${verdict}</b></div><p>This preview shows where item comparison and inventory actions belong.</p></div>` : ""}<div class="loot-actions"><button class="primary-action" data-card="${name}">Compare</button><button data-card="${name}">Equip</button><button class="quiet" data-card="${name}">Salvage</button></div></article>`).join("")}</section>
  <section class="card hint-card"><b>How item decisions work</b><p>Compare a drop with the item in its slot, then equip it or salvage it. Locked items should be protected from accidental salvage.</p></section>`;
}
function buildScreen() {
  return `${title("CHARACTER · POWERS & STATS", "Build", "Your weapon is the center. It determines the attacks and powers available to your build.")}
  <section class="card build-weapon">${cardHeading("Build-defining weapon", '<span class="tag live">EQUIPPED</span>')}<div class="detail-item weapon-detail">${icon("Weapon")}<div><small>WARRIOR · SWORD</small><h3>Sword</h3><p>Primary attack: Cleave</p></div><span class="chevron">›</span></div><div class="weapon-note"><b>Weapon-bound powers</b><p>Weapon types open their own compatible abilities and spells. This is where those options will be selected.</p></div></section>
  <section class="card">${cardHeading("Abilities", '<span class="muted">3 attack · 2 utility slots</span>')}<div class="ability-slot"><span class="ability-number">P</span><span><small>PRIMARY · NEVER STOPS</small><b>Cleave</b></span><span class="tag live">ACTIVE</span></div><div class="ability-slot"><span class="ability-number">1</span><span><small>ATTACK SPELL</small><b>Sunder</b><em>Warrior spell · awakens at level 3</em></span><span class="tag locked">LOCKED</span></div><div class="ability-slot"><span class="ability-number">2</span><span><small>ATTACK SLOT</small><b>Choose an ability</b></span><span class="chevron">›</span></div><div class="ability-slot"><span class="ability-number">U</span><span><small>UTILITY SLOT</small><b>Choose a utility</b></span><span class="chevron">›</span></div></section>
  <section class="card">${cardHeading("Specialization & passives")}<button class="list-button"><span><small>WARRIOR SPECIALIZATION</small><b>Choose specialization</b></span><span class="chevron">›</span></button><button class="list-button"><span><small>PASSIVE SKILLS</small><b>View passive choices</b></span><span class="chevron">›</span></button></section>
  <section class="card">${cardHeading("Attributes & combat stats")}<div class="stat-grid"><div><small>STRENGTH</small><b>0</b></div><div><small>DEXTERITY</small><b>0</b></div><div><small>INTELLIGENCE</small><b>0</b></div><div><small>ATTACK DAMAGE</small><b>—</b></div><div><small>ATTACK SPEED</small><b>—</b></div><div><small>CRITICAL CHANCE</small><b>—</b></div></div></section>`;
}
function forgeScreen() {
  return `${title("CRAFTING · ITEM IMPROVEMENT", "Forge", "Use materials to improve or change equipment.")}
  <section class="card resources">${cardHeading("Materials", '<span class="muted">PREVIEW VALUES</span>')}<div class="resource-grid"><div>${icon("✦")}<span><small>GOLD</small><b>0</b></span></div><div>${icon("◆")}<span><small>CRAFTING MATERIALS</small><b>—</b></span></div><div>${icon("◇")}<span><small>ESSENCES</small><b>—</b></span></div></div><p class="hint">Material names and costs belong here once the crafting rules are finalized.</p></section>
  <section class="card forge-actions">${cardHeading("Forge services")}<button class="service-row" data-card="Craft"><span class="service-icon">⚒</span><span><b>Craft item</b><small>Create equipment from a recipe.</small></span><span class="chevron">›</span></button>${openCard === "Craft" ? '<p class="service-explain">Recipe selection and material cost will be shown here.</p>' : ""}<button class="service-row" data-card="Improve"><span class="service-icon">⬆</span><span><b>Improve item</b><small>Upgrade a piece you already own.</small></span><span class="chevron">›</span></button>${openCard === "Improve" ? '<p class="service-explain">Choose an equipped item and review the upgrade before spending materials.</p>' : ""}<button class="service-row" data-card="Reforge"><span class="service-icon">⟳</span><span><b>Reforge affixes</b><small>Change an item's properties.</small></span><span class="chevron">›</span></button>${openCard === "Reforge" ? '<p class="service-explain">Review the current affixes and reforge cost before confirming.</p>' : ""}<button class="service-row" data-card="Socket"><span class="service-icon">◈</span><span><b>Socket equipment</b><small>Add a jewel or other enhancement.</small></span><span class="chevron">›</span></button>${openCard === "Socket" ? '<p class="service-explain">Socketed-item details and jewel choices will be shown here.</p>' : ""}</section>
  <section class="card hint-card"><b>One place for crafting</b><p>Services are grouped here so improving gear is easy to find without interrupting the hunt.</p></section>`;
}
const screenContent = { Fight: fightScreen, Gear: gearScreen, Bag: bagScreen, Build: buildScreen, Forge: forgeScreen };
function render() {
  root.innerHTML = `<div class="app-frame">${header()}<main>${screenContent[activeTab]()}</main><nav class="bottom-nav" aria-label="Game sections">${tabs.map(tab => `<button class="nav-tab ${activeTab === tab ? "active" : ""}" data-tab="${tab}" aria-current="${activeTab === tab ? "page" : "false"}">${icon(tab)}<span>${tab}</span></button>`).join("")}</nav></div>`;
}
root.addEventListener("click", event => {
  const tab = event.target.closest("[data-tab]");
  if (tab) { activeTab = tab.dataset.tab; render(); return; }
  const slot = event.target.closest("[data-slot]");
  if (slot) { selectedSlot = slot.dataset.slot; render(); return; }
  const monster = event.target.closest("[data-monster]");
  if (monster) { selectedMonster = monster.dataset.monster; render(); return; }
  const card = event.target.closest("[data-card]");
  if (card) { openCard = openCard === card.dataset.card ? "" : card.dataset.card; render(); }
});
render();
