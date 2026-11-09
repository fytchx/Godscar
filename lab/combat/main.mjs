import "./character.mjs";

const $ = (selector, root = document) => root.querySelector(selector);
const panelIds = ["character", "weapon", "combat", "summary", "systems"];
const panelLabels = {
  character: "Character health",
  weapon: "Weapon cast bar",
  combat: "Combat scene",
  summary: "Session summary",
  systems: "Gear and build link"
};
const storageKey = "godscar.combat-preview";
const defaultOrder = [...panelIds];

let order = readArray(storageKey + ".order", defaultOrder);
let hidden = readArray(storageKey + ".hidden", []);
let reducedEffects = read(storageKey + ".reduced") === "true";
let time = 0;
let monsterHealth = 3942;
let monsterMaxHealth = 8200;
let kills = 1248;
let experience = 12640;
let materials = 18;
let playerHealth = 1840;
let weaponTimer = 1.8;
let emberTimer = 2.4;
let venomTimer = 5.1;
let bleedTimer = 3.8;
const weaponPeriod = 1.8;
const emberPeriod = 4.2;
const venomPeriod = 6.8;
const bleedPeriod = 3.8;

const attacks = [
  { id: "mace", name: "Mace Swing", type: "Physical · melee", icon: "⚒", color: "#d6b575", min: 92, max: 164, effect: "slash", dot: false },
  { id: "ember", name: "Ember Brand", type: "Fire · direct", icon: "✹", color: "#ffad55", min: 48, max: 105, effect: "fire", dot: false },
  { id: "burn", name: "Ember Brand", type: "Fire · burn tick", icon: "✹", color: "#ffad55", min: 18, max: 42, effect: "ember", dot: true },
  { id: "venom", name: "Venom Mark", type: "Poison · poison tick", icon: "⌁", color: "#a3e16c", min: 24, max: 58, effect: "poison", dot: true },
  { id: "bleed", name: "Grave Wound", type: "Bleed · bleed tick", icon: "⌁", color: "#f05e6b", min: 20, max: 47, effect: "blood", dot: true }
];
const damageBySource = new Map(attacks.map(attack => [attack.id, { ...attack, total: 0, hits: 0 }]));
const monsters = ["Gravejaw Stalker", "Mirebound Warden", "Sunken Road Hound"];

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Keep this session usable if storage is unavailable. */ }
}
function readArray(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (!Array.isArray(stored)) return [...fallback];
    const valid = stored.filter(item => fallback.includes(item));
    for (const item of fallback) if (!valid.includes(item)) valid.push(item);
    return valid;
  } catch { return [...fallback]; }
}
function formatNumber(value) {
  return Math.round(value).toLocaleString("en-US");
}
function formatCompactNumber(value) {
  const units = [
    [1_000_000_000_000, "T"],
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"]
  ];
  for (const [threshold, suffix] of units) {
    if (value >= threshold) {
      const amount = value / threshold;
      const decimals = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
      return amount.toFixed(decimals).replace(/(?:\.0+|(\.\d+?)0+)$/, "$1") + suffix;
    }
  }
  return formatNumber(value);
}
function totalDamage() {
  return [...damageBySource.values()].reduce((total, source) => total + source.total, 0);
}
function currentDps() {
  return time ? Math.round(totalDamage() / time) : 0;
}

function applyLayout() {
  const app = $(".app");
  for (const id of order) {
    const panel = document.querySelector('[data-panel="' + id + '"]');
    if (panel) app.insertBefore(panel, $("footer", app));
  }
  for (const id of panelIds) {
    const panel = document.querySelector('[data-panel="' + id + '"]');
    if (panel) panel.hidden = hidden.includes(id) && id !== "combat";
  }
}
function renderLayoutControls() {
  const container = $("#layoutRows");
  container.replaceChildren();
  order.forEach((id, index) => {
    const row = document.createElement("div");
    row.className = "layout-row";
    const label = document.createElement("strong");
    label.textContent = panelLabels[id] + (id === "combat" ? " · fixed" : "");
    row.append(label);

    for (const [symbol, shift] of [["↑", -1], ["↓", 1]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = symbol;
      button.setAttribute("aria-label", "Move " + panelLabels[id] + (shift < 0 ? " up" : " down"));
      button.disabled = id === "combat" || index + shift < 0 || index + shift >= order.length || order[index + shift] === "combat";
      button.addEventListener("click", () => movePanel(id, shift));
      row.append(button);
    }

    const visibility = document.createElement("button");
    visibility.type = "button";
    visibility.textContent = id === "combat" ? "Always on" : hidden.includes(id) ? "Show" : "Hide";
    visibility.disabled = id === "combat";
    visibility.addEventListener("click", () => togglePanel(id));
    row.append(visibility);
    container.append(row);
  });
}
function movePanel(id, direction) {
  const from = order.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length || order[to] === "combat") return;
  [order[from], order[to]] = [order[to], order[from]];
  write(storageKey + ".order", JSON.stringify(order));
  applyLayout();
  renderLayoutControls();
}
function togglePanel(id) {
  hidden = hidden.includes(id) ? hidden.filter(item => item !== id) : [...hidden, id];
  write(storageKey + ".hidden", JSON.stringify(hidden));
  applyLayout();
  renderLayoutControls();
}

function setCountdown(id, timer, duration) {
  const label = $("#" + id + "Timer");
  const bar = $("#" + id + "Progress");
  if (label) label.textContent = timer.toFixed(1) + "s";
  if (bar) bar.style.width = Math.max(0, timer / duration * 100) + "%";
}
function updateWeaponCast() {
  $("#weaponCastTimer").textContent = weaponTimer.toFixed(1) + "s";
  $("#weaponCastProgress").style.width = Math.max(0, (weaponPeriod - weaponTimer) / weaponPeriod * 100) + "%";
}
function showCombatEffect(effectName) {
  const effect = document.createElement("div");
  effect.className = "combat-effect fx-" + effectName;
  effect.innerHTML = "<i></i><i></i><i></i>";
  $("#effectsLayer").append(effect);
  window.setTimeout(() => effect.remove(), 750);
}
function displayDamageNumber(attack, amount) {
  const number = document.createElement("span");
  number.className = "damage-number" + (attack.dot ? " tick" : "");
  number.style.setProperty("--x", (24 + Math.random() * 45) + "%");
  number.style.setProperty("--y", (31 + Math.random() * 37) + "%");
  number.style.setProperty("--damage-color", attack.color);
  number.textContent = attack.icon + " " + (attack.dot ? "TICK " : "") + "−" + formatNumber(amount);
  $("#hits").append(number);
  window.setTimeout(() => number.remove(), 950);
}
function damageMonster(attack) {
  const amount = Math.round(attack.min + Math.random() * (attack.max - attack.min));
  const tally = damageBySource.get(attack.id);
  tally.total += amount;
  tally.hits += 1;
  monsterHealth -= amount;

  $("#monsterHealth").style.width = Math.max(0, monsterHealth / monsterMaxHealth * 100) + "%";
  $("#monsterText").textContent = formatNumber(Math.max(0, monsterHealth)) + " / " + formatNumber(monsterMaxHealth);
  $("#stage").classList.remove("hit");
  void $("#stage").offsetWidth;
  $("#stage").classList.add("hit");
  displayDamageNumber(attack, amount);
  showCombatEffect(attack.effect);
  updateSessionDetails();
  if (monsterHealth <= 0) replaceMonster();
}
function replaceMonster() {
  const name = monsters[Math.floor(Math.random() * monsters.length)];
  $("#monsterName").textContent = name;
  $("#monsterLabel").textContent = name.toUpperCase();
  monsterMaxHealth = 8200;
  monsterHealth = monsterMaxHealth;
  $("#monsterHealth").style.width = "100%";
  $("#monsterText").textContent = formatNumber(monsterMaxHealth) + " / " + formatNumber(monsterMaxHealth);
  kills += 1;
  experience += 220;
  if (Math.random() < .38) materials += 1;
  updateProgressSummary();
  $("#wave").textContent = String(Number($("#wave").textContent) + 1).padStart(2, "0");
  $("#waveLabel").textContent = "GALLOWSFEN · WAVE " + $("#wave").textContent;
}
function updateProgressSummary() {
  $("#xp").textContent = "+" + formatNumber(experience);
  $("#mats").textContent = "+" + formatNumber(materials) + " Grave Dust";
  $("#kills").textContent = formatNumber(kills);
}
function updateSessionDetails() {
  $("#dps").textContent = formatNumber(currentDps());
  $("#arenaDps").textContent = formatCompactNumber(currentDps());
  $("#detailXp").textContent = "+" + formatNumber(experience);
  $("#detailMats").textContent = "+" + formatNumber(materials) + " Grave Dust";
  $("#detailKills").textContent = formatNumber(kills);
}
function renderDamageRows() {
  const rows = $("#damageRows");
  rows.replaceChildren();
  const ranked = [...damageBySource.values()].filter(source => source.total > 0).sort((a, b) => b.total - a.total);
  if (!ranked.length) {
    const empty = document.createElement("p");
    empty.className = "empty-damage";
    empty.textContent = "No damage since the last reset.";
    rows.append(empty);
    return;
  }
  for (const source of ranked) {
    const row = document.createElement("div");
    row.className = "damage-row";
    row.style.setProperty("--damage-color", source.color);
    const share = totalDamage() ? Math.round(source.total / totalDamage() * 100) : 0;
    row.innerHTML = "<i>" + source.icon + "</i><span>" + source.name + "<small>" + source.type + " · " + formatNumber(source.hits) + (source.hits === 1 ? " hit" : " hits") + "</small></span><strong>" + formatNumber(source.total) + "<small>" + share + "%</small></strong>";
    rows.append(row);
  }
}

function advanceTimers(delta) {
  time += delta;
  weaponTimer -= delta;
  emberTimer -= delta;
  venomTimer -= delta;
  bleedTimer -= delta;

  if (weaponTimer <= 0) {
    damageMonster(attacks[0]);
    weaponTimer += weaponPeriod;
  }
  if (emberTimer <= 0) {
    damageMonster(attacks[1]);
    emberTimer += emberPeriod;
  }
  if (venomTimer <= 0) {
    damageMonster(attacks[3]);
    venomTimer += venomPeriod;
  }
  if (bleedTimer <= 0) {
    damageMonster(attacks[4]);
    bleedTimer += bleedPeriod;
  }
  if (time > 0 && Math.floor(time * 10) % 37 === 0) damageMonster(attacks[2]);

  setCountdown("ember", emberTimer, emberPeriod);
  setCountdown("venom", venomTimer, venomPeriod);
  setCountdown("bleed", bleedTimer, bleedPeriod);
  updateWeaponCast();
  updateSessionDetails();
}

function closeOnBackdrop(dialog) {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
}

$("#customize").addEventListener("click", () => {
  $("#layout").hidden = false;
  renderLayoutControls();
});
$("#closeLayout").addEventListener("click", () => { $("#layout").hidden = true; });
$("#restore").addEventListener("click", () => {
  hidden = [];
  write(storageKey + ".hidden", "[]");
  applyLayout();
  renderLayoutControls();
});
$("#reset").addEventListener("click", () => {
  order = [...defaultOrder];
  hidden = [];
  write(storageKey + ".order", JSON.stringify(order));
  write(storageKey + ".hidden", "[]");
  applyLayout();
  renderLayoutControls();
});
$("#effects").addEventListener("click", event => {
  reducedEffects = !reducedEffects;
  write(storageKey + ".reduced", String(reducedEffects));
  document.body.classList.toggle("reduced-effects", reducedEffects);
  event.currentTarget.classList.toggle("on", reducedEffects);
});
$("#openDps").addEventListener("click", () => {
  updateSessionDetails();
  renderDamageRows();
  $("#damageModal").showModal();
});
$("#closeDps").addEventListener("click", () => $("#damageModal").close());
$("#done").addEventListener("click", () => $("#damageModal").close());
$("#resetDps").addEventListener("click", () => {
  for (const source of damageBySource.values()) {
    source.total = 0;
    source.hits = 0;
  }
  time = 0;
  updateSessionDetails();
  renderDamageRows();
});
$("#continue").addEventListener("click", () => $("#offline").close());
closeOnBackdrop($("#offline"));
closeOnBackdrop($("#damageModal"));

applyLayout();
document.body.classList.toggle("reduced-effects", reducedEffects);
$("#effects").classList.toggle("on", reducedEffects);
updateProgressSummary();
updateSessionDetails();
$("#offline").showModal();
setInterval(() => advanceTimers(.1), 100);
