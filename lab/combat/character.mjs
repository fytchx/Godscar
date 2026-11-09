/*
 * Character menu presentation for the combat preview.
 * This module owns only the menu's display state and appearance preferences.
 * It never pauses or writes to the combat simulation or game save.
 */
const menu = document.querySelector("#characterMenu");
const content = document.querySelector("#characterContent");
const tabs = [...document.querySelectorAll("[data-character-tab]")];
const itemSheet = document.querySelector("#itemSheet");
const stylePanel = document.querySelector("#characterStyle");
const preferencePrefix = "godscar.character-preview.";

const equipment = [
  { slot: "Weapon", name: "Gravetide Maul", rarity: "Legendary", art: "mace", details: "Mace · Physical attack · Sample item" },
  { slot: "Off-hand", name: "Gatewarden Shield", rarity: "Epic", art: "shield", details: "Shield · Sample armor values" },
  { slot: "Helm", name: "Oathkeeper Visor", rarity: "Epic", art: "helm", details: "Helmet · Sample armor values" },
  { slot: "Chest", name: "Bastion Plate", rarity: "Epic", art: "chest", details: "Chest armor · Sample armor values" },
  { slot: "Gloves", name: "Grips of Cinders", rarity: "Rare", art: "gloves", details: "Gloves · Sample armor values" },
  { slot: "Belt", name: "Ironbound Girdle", rarity: "Epic", art: "belt", details: "Belt · Sample armor values" },
  { slot: "Legs", name: "Oathbound Legguards", rarity: "Epic", art: "legs", details: "Leg armor · Sample armor values" },
  { slot: "Boots", name: "Marchwarden Boots", rarity: "Epic", art: "boots", details: "Boots · Sample armor values" },
  { slot: "Ring 1", name: "Cinder Vow", rarity: "Rare", art: "ring", details: "Ring · Sample affixes" },
  { slot: "Ring 2", name: "Starless Signet", rarity: "Legendary", art: "ring-legendary", details: "Ring · Sample affixes" },
  { slot: "Amulet", name: "Lantern of the Lost", rarity: "Epic", art: "amulet", details: "Amulet · Sample affixes" }
];

const items = [
  { name: "Cinderbrand", type: "Weapon", rarity: "Rare", art: "sword", details: "One-handed sword · Sample item" },
  { name: "Gravetide Maul", type: "Weapon", rarity: "Legendary", art: "mace", details: "Mace · Sample item" },
  { name: "Gatewarden Shield", type: "Armor", rarity: "Epic", art: "shield", details: "Off-hand shield · Sample item" },
  { name: "Oathkeeper Visor", type: "Armor", rarity: "Epic", art: "helm", details: "Helmet · Sample item" },
  { name: "Bastion Plate", type: "Armor", rarity: "Epic", art: "chest", details: "Chest armor · Sample item" },
  { name: "Cinder Vow", type: "Jewelry", rarity: "Rare", art: "ring", details: "Ring · Sample affixes" },
  { name: "Starless Signet", type: "Jewelry", rarity: "Legendary", art: "ring-legendary", details: "Ring · Sample affixes" },
  { name: "Grave Iron", type: "Material", rarity: "Common", art: "materials", count: 126, details: "Crafting material · Count is illustrative" }
];

const recipes = [
  { name: "Reinforce equipment", description: "Preview a rank improvement for one item.", cost: "8 Grave Iron · 180 Gold", art: "chest" },
  { name: "Forge a rare weapon", description: "Preview a weapon crafting recipe.", cost: "12 Grave Iron · 3 Cinder Cores", art: "sword" },
  { name: "Bind a Rift Shard", description: "Preview a high-tier material recipe.", cost: "4 Rift Dust · 2 Cores", art: "materials" }
];

const materials = [
  { name: "Grave Iron", category: "Crafting", count: "126", description: "Common · Weapon and armor work", art: "materials" },
  { name: "Cinder Core", category: "Crafting", count: "42", description: "Uncommon · Fire-aligned recipes", art: "materials" },
  { name: "Rift Shard", category: "Upgrade", count: "6", description: "Rare · High-tier improvements", art: "materials" },
  { name: "Hollowglass", category: "Upgrade", count: "17", description: "Rare · Socket and rune work", art: "ring-legendary" },
  { name: "Gold", category: "Currency", count: "12.4K", description: "Currency · Vendors and service fees", art: "belt" }
];

let activeTab = "equipment";
let itemFilter = "All";
let materialFilter = "All";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function sprite(art, className = "") {
  return '<span class="character-sprite sprite-' + art + " " + className + '" aria-hidden="true"></span>';
}

function renderEquipment() {
  content.innerHTML =
    '<div class="character-section-head"><div><small>CHARACTER · EQUIPPED ITEMS</small><h2>Equipment</h2></div><span class="character-count">11 / 11</span></div>' +
    '<div class="character-stats">' +
      '<div><small>ARMOR</small><b>1,284</b></div><div><small>STRENGTH</small><b>146</b></div><div><small>VITALITY</small><b>212</b></div>' +
    '</div>' +
    '<div class="equipment-grid">' + equipment.map((item, index) =>
      '<button class="equipment-slot rarity-' + item.rarity.toLowerCase() + '" data-inspect="' + index + '">' +
        '<span class="rarity-dot"></span>' + sprite(item.art, "slot-art") +
        '<span class="slot-name">' + escapeHtml(item.slot) + '</span>' +
        '<strong>' + escapeHtml(item.name) + '</strong>' +
      '</button>'
    ).join("") + '</div>' +
    '<div class="character-footnote">Sample equipment and stats · tapping a slot opens its item preview.</div>';
}

function renderInventory() {
  const filters = ["All", "Weapon", "Armor", "Jewelry", "Material"];
  const shownItems = itemFilter === "All" ? items : items.filter(item => item.type === itemFilter);
  content.innerHTML =
    '<div class="character-section-head"><div><small>ITEMS · LOOT DECISIONS</small><h2>Inventory</h2></div><span class="character-count">38 / 120</span></div>' +
    '<div class="character-filters">' + filters.map(filter =>
      '<button class="filter-chip ' + (itemFilter === filter ? "active" : "") + '" data-item-filter="' + filter + '">' +
        (filter === "Weapon" ? "Weapons" : filter === "Material" ? "Materials" : filter) + '</button>'
    ).join("") + '</div>' +
    '<div class="inventory-grid">' + shownItems.map((item, index) =>
      '<button class="inventory-item rarity-' + item.rarity.toLowerCase() + '" data-inventory-item="' + index + '" aria-label="Inspect ' + escapeHtml(item.name) + '">' +
        sprite(item.art, "inventory-art") +
        (item.count ? '<span class="item-count">' + item.count + '</span>' : "") +
        '<small>' + escapeHtml(item.name) + '</small>' +
      '</button>'
    ).join("") + '</div>' +
    '<div class="character-footnote">Preview items only · no equipment changes or salvaging are saved.</div>';
}

function renderCrafting() {
  content.innerHTML =
    '<div class="character-section-head"><div><small>CRAFTING · PREVIEW RECIPES</small><h2>Crafting</h2></div><span class="character-count">Forge</span></div>' +
    '<p class="character-intro">The fight keeps running while you plan an improvement. Recipes and costs below are examples.</p>' +
    recipes.map((recipe, index) =>
      '<article class="recipe-card">' + sprite(recipe.art, "recipe-art") +
        '<div class="recipe-copy"><strong>' + escapeHtml(recipe.name) + '</strong><small>' + escapeHtml(recipe.description) + '</small><span>' + escapeHtml(recipe.cost) + '</span></div>' +
        '<button class="preview-recipe" data-recipe="' + index + '">Preview</button>' +
      '</article>'
    ).join("") +
    '<div class="character-footnote">This preview does not spend materials or create items.</div>';
}

function renderMaterials() {
  const filters = ["All", "Crafting", "Upgrade", "Currency"];
  const shownMaterials = materialFilter === "All" ? materials : materials.filter(item => item.category === materialFilter);
  content.innerHTML =
    '<div class="character-section-head"><div><small>STORED RESOURCES</small><h2>Materials</h2></div><span class="character-count">' + materials.length + ' types</span></div>' +
    '<div class="character-filters">' + filters.map(filter =>
      '<button class="filter-chip ' + (materialFilter === filter ? "active" : "") + '" data-material-filter="' + filter + '">' + filter + '</button>'
    ).join("") + '</div>' +
    '<div class="materials-list">' + shownMaterials.map(item =>
      '<div class="material-row">' + sprite(item.art, "material-art") +
        '<div><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.description) + '</small></div>' +
        '<b>' + escapeHtml(item.count) + '</b>' +
      '</div>'
    ).join("") + '</div>' +
    '<div class="character-footnote">Sample material counts · final resource rules are not set by this screen.</div>';
}

function renderTab() {
  tabs.forEach(tab => {
    const isActive = tab.dataset.characterTab === activeTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  const renderers = {
    equipment: renderEquipment,
    inventory: renderInventory,
    crafting: renderCrafting,
    materials: renderMaterials
  };
  renderers[activeTab]();
}

function openItemSheet(item) {
  document.querySelector("#itemTitle").textContent = item.name;
  document.querySelector("#itemRarity").textContent = item.rarity + " · " + (item.slot || item.type || "Equipment");
  document.querySelector("#itemDescription").textContent = item.details;
  itemSheet.hidden = false;
}
function closeItemSheet() {
  itemSheet.hidden = true;
}

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(preferencePrefix + "appearance") || "{}");
  } catch {
    return {};
  }
}
function savePreferences(preferences) {
  try {
    localStorage.setItem(preferencePrefix + "appearance", JSON.stringify(preferences));
  } catch {
    // The appearance controls remain usable even when this browser blocks storage.
  }
}
function setPreference(property, value) {
  document.documentElement.style.setProperty(property, value);
}
function applySavedPreferences() {
  const preferences = readPreferences();
  const propertyByPreference = {
    scale: ["--character-scale", ""],
    slotSize: ["--character-slot-size", "px"],
    radius: ["--character-radius", "px"],
    gap: ["--character-gap", "px"],
    accent: ["--character-accent", ""]
  };
  for (const [key, [property, unit]] of Object.entries(propertyByPreference)) {
    if (preferences[key]) setPreference(property, String(preferences[key]) + unit);
  }
  for (const input of stylePanel.querySelectorAll("[data-style]")) {
    const preference = input.dataset.style;
    if (preferences[preference]) input.value = preferences[preference];
    const output = input.parentElement.querySelector("output");
    if (output) output.value = preference === "scale" ? Math.round(Number(input.value) * 100) + "%" : input.value + "px";
  }
}

function initializeAppearanceControls() {
  const preferences = readPreferences();
  const values = {
    scale: preferences.scale || "1",
    slotSize: preferences.slotSize || "88",
    radius: preferences.radius || "14",
    gap: preferences.gap || "8",
    accent: preferences.accent || "#d6b575"
  };

  stylePanel.addEventListener("input", event => {
    const input = event.target.closest("[data-style]");
    if (!input) return;

    const preference = input.dataset.style;
    const propertyByPreference = {
      scale: "--character-scale",
      slotSize: "--character-slot-size",
      radius: "--character-radius",
      gap: "--character-gap"
    };
    const nextValue = preference === "scale" ? input.value : input.value + "px";
    if (propertyByPreference[preference]) setPreference(propertyByPreference[preference], nextValue);
    values[preference] = input.value;
    const output = input.parentElement.querySelector("output");
    if (output) output.value = preference === "scale" ? Math.round(Number(input.value) * 100) + "%" : nextValue;
    savePreferences(values);
  });

  stylePanel.addEventListener("click", event => {
    const swatch = event.target.closest("[data-accent]");
    if (!swatch) return;
    values.accent = swatch.dataset.accent;
    setPreference("--character-accent", values.accent);
    savePreferences(values);
  });

  applySavedPreferences();
}

function initializeCharacterMenu() {
  const openButton = document.querySelector("#openCharacter");
  openButton.addEventListener("click", () => {
    activeTab = "equipment";
    renderTab();
    menu.showModal();
  });
  document.querySelector("#closeCharacter").addEventListener("click", () => menu.close());
  document.querySelector("#openCharacterStyle").addEventListener("click", () => {
    stylePanel.hidden = !stylePanel.hidden;
  });
  document.querySelector("#closeItemSheet").addEventListener("click", closeItemSheet);
  document.querySelector("#closeCharacterStyle").addEventListener("click", () => {
    stylePanel.hidden = true;
  });

  menu.addEventListener("click", event => {
    const tab = event.target.closest("[data-character-tab]");
    if (tab) {
      activeTab = tab.dataset.characterTab;
      closeItemSheet();
      renderTab();
      return;
    }

    const itemFilterButton = event.target.closest("[data-item-filter]");
    if (itemFilterButton) {
      itemFilter = itemFilterButton.dataset.itemFilter;
      renderInventory();
      return;
    }

    const materialFilterButton = event.target.closest("[data-material-filter]");
    if (materialFilterButton) {
      materialFilter = materialFilterButton.dataset.materialFilter;
      renderMaterials();
      return;
    }

    const equipmentButton = event.target.closest("[data-inspect]");
    if (equipmentButton) {
      openItemSheet(equipment[Number(equipmentButton.dataset.inspect)]);
      return;
    }

    const inventoryButton = event.target.closest("[data-inventory-item]");
    if (inventoryButton) {
      const filtered = itemFilter === "All" ? items : items.filter(item => item.type === itemFilter);
      openItemSheet(filtered[Number(inventoryButton.dataset.inventoryItem)]);
      return;
    }

    const recipeButton = event.target.closest("[data-recipe]");
    if (recipeButton) {
      const recipe = recipes[Number(recipeButton.dataset.recipe)];
      openItemSheet({ name: recipe.name, rarity: "Preview recipe", type: "Crafting", details: recipe.cost + " · Nothing is spent in this preview." });
    }
  });

  menu.addEventListener("close", () => {
    closeItemSheet();
    stylePanel.hidden = true;
  });
  document.querySelector("#resetCharacterStyle").addEventListener("click", () => {
    try { localStorage.removeItem(preferencePrefix + "appearance"); } catch { /* Keep reset usable if storage is blocked. */ }
    for (const property of ["--character-scale", "--character-slot-size", "--character-radius", "--character-gap", "--character-accent"]) {
      document.documentElement.style.removeProperty(property);
    }
    for (const input of stylePanel.querySelectorAll("[data-style]")) input.value = input.defaultValue;
    applySavedPreferences();
  });

  initializeAppearanceControls();
  renderTab();
}

initializeCharacterMenu();
