(function () {
'use strict';
const LS_KEY = 'godscar.save.v1', LOCK_KEY = 'godscar.lock';
const TAB_ID = Math.random().toString(36).slice(2);
const nowS = () => Date.now() / 1000;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = document.getElementById('app');

let g = null;            // game state (the only source of truth)
let sess = null;         // this-visit counters
let logBuf = [];
let tab = 'fight';
let passive = false;     // another tab is running the game
let expanded = null;     // expanded bag item id
let scout = null;
let uiLvl = {};          // per-monster level picked on the Fight tab
let uiZone = null;
let bossLvl = {};
let bossResult = null;   // last boss fight {res, rewards}
let showBossLog = false;
let confirm = null;      // pending inline confirmation key
let lastSaveJson = '';
const proj = new Map();
const cloud = { db: null, uid: null, status: 'connecting…', savedT: 0, busy: false };
let summary = null;
let lastStructure = '';

const TABS = [['fight', 'Fight'], ['gear', 'Gear'], ['bag', 'Bag'], ['build', 'Build'], ['forge', 'Forge']];
const NOTICES = {
  start: ['The fight never stops', 'Your primary ability attacks on its own, forever. Everything else you do in Godscar happens while it fights.', null],
  passives: ['Passive points', 'Every level gives a passive point. Spend it on the Build tab.', 'build'],
  shards: ['Scar Shards', 'Kills drop Scar Shards. Spend them on the Gear tab to upgrade what you wear.', 'gear'],
  bar: ['Your class spell awakens', 'It sits in your autocast bar on the Build tab and fires on its own. The bar holds 3 offensive and 2 utility spells.', 'build'],
  pmod: ['An item that changes your primary', 'Some items change how your primary ability works, not just its numbers. Look for the gold line in your bag.', 'bag'],
  boss: ['A Boss Sigil formed', 'Bosses fight a snapshot of your current build in a separate encounter. Your farming keeps going the whole time.', 'fight'],
  spec: ['Choose a specialization', 'You can now pick one of your class\'s three specializations on the Build tab.', 'build'],
  hollow: ['The Ashen Hollow is open', 'Tougher monsters, stronger items, element essences, and rare items that grant spells. Switch zones on the Fight tab.', 'fight'],
  essence: ['Element essence', 'Ember, Ash and Rift essences let you inscribe a spell of your choice onto a rare item at the Forge.', 'forge'],
  spellitem: ['An item that grants a spell', 'Equip it and the spell joins your autocast bar.', 'bag'],
  upgraded: ['Godscar has grown', 'Your character came through the update. New: three more classes, the autocast bar, specializations, passives, a second zone, bosses and the Forge. Your earned levels came with passive points.', 'build']
};

// ---------- storage ----------
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
function serialize() { const o = Object.assign({}, g); delete o.stats; delete o.cast; return JSON.stringify(o); }
function hydrate(str) {
  let o = typeof str === 'string' ? JSON.parse(str) : JSON.parse(JSON.stringify(str));
  if (!o || !o.hero || !CLASSES[o.hero.cls]) throw new Error('Not a Godscar save');
  o = migrate(o);
  refresh(o);
  return o;
}
function saveLocal() {
  if (!g || passive || !ownsLock()) return;
  const j = serialize();
  if (j !== lastSaveJson) { lsSet(LS_KEY, j); lastSaveJson = j; }
}

// ---------- single running tab ----------
function readLock() { try { return JSON.parse(lsGet(LOCK_KEY) || 'null'); } catch (e) { return null; } }
function ownsLock() { const l = readLock(); return !l || l.id === TAB_ID || Date.now() - l.ts > 5000; }
function heartbeat() {
  const l = readLock();
  if (l && l.id !== TAB_ID && Date.now() - l.ts < 5000) { if (!passive) { passive = true; render(); } return; }
  lsSet(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
  if (passive) {
    passive = false;
    const s = lsGet(LS_KEY);
    if (s) { try { g = hydrate(s); } catch (e) {} }
    resume(true);
  }
}
function takeOver() { lsSet(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() })); passive = true; heartbeat(); }

function log(text, kind) { logBuf.push({ t: g.t, text, kind: kind || '' }); if (logBuf.length > 60) logBuf.splice(0, logBuf.length - 60); }
function newSess() { const o = emptyOut(); o.killTimes = []; o.start = nowS(); return o; }

function resume(showSummary) {
  if (!g) return;
  const t = nowS(), gap = t - g.t;
  if (gap > 45) {
    const lvl0 = g.hero.level;
    const res = catchUp(g, t, null);
    g.life.offlineSec = (g.life.offlineSec || 0) + res.elapsed;
    if (showSummary && res.out.kills + res.out.deaths > 0) summary = { ...res, lvl0, lvl1: g.hero.level };
    log(`Caught up ${dur(res.elapsed)} of fighting.`, 'sys');
    proj.clear();
  } else if (gap > 0) advance(g, t, sess, log);
  saveLocal();
  render();
}
function dur(s) {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Apply a player change at the current moment. The fight is advanced first, so the change takes effect from now on.
function act(fn) {
  if (!g || passive) return;
  const t = nowS();
  if (t - g.t > 45) resume(true); else advance(g, t, sess, log);
  fn();
  refresh(g);
  if (g.fight.hp != null) g.fight.hp = Math.min(g.fight.hp, g.stats.life);
  proj.clear(); scout = null;
  saveLocal();
  render();
}

function tick() {
  if (!g || passive) return;
  const t = nowS();
  if (t - g.t > 45) { resume(true); return; }
  advance(g, t, sess, log);
  const kt = sess.killTimes; while (kt.length && kt[0] < t - 120) kt.shift();
  renderRibbon();
  const structure = [g.bag.length, g.hero.level, g.hero.points, JSON.stringify(g.unlocked), g.target.level, g.sigils, g.zones.hollow,
    g.mats.shards, g.mats.ember, g.mats.ash, g.mats.rift, (g.notices || []).length].join(',');
  if (structure !== lastStructure) {
    lastStructure = structure;
    const ae = document.activeElement;
    if (!(ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT'))) renderPanel();
    renderNav();
  }
  if (tab === 'fight') renderLog();
}

// ---------- projections ----------
function buildSig() { return SLOTS.map(s => g.equip[s] ? g.equip[s].id + '.' + g.equip[s].plus : '-').join('|') + '@' + g.hero.level + JSON.stringify(g.hero.passives) + g.hero.spec + JSON.stringify(g.bar); }
function baseProj() {
  const k = 'base|' + buildSig() + '|' + g.target.key + g.target.level;
  if (!proj.has(k)) proj.set(k, project(g, { secs: 240 }));
  return proj.get(k);
}
function itemProj(it) {
  const k = it.id + '|' + buildSig() + '|' + g.target.key + g.target.level;
  if (!proj.has(k)) proj.set(k, project(g, { secs: 240, equip: { [it.slot]: it } }));
  return proj.get(k);
}
function verdict(it) {
  const b = baseProj(), a = itemProj(it);
  const metric = b.xpm > 0 ? (a.xpm - b.xpm) / b.xpm : (a.dps - b.dps) / Math.max(b.dps, 1e-9);
  const pct = Math.round(metric * 100);
  const chips = [];
  if (a.deaths > b.deaths) chips.push(`<span class="chip bad">dies more</span>`);
  else if (a.deaths < b.deaths) chips.push(`<span class="chip good">dies less</span>`);
  if (pct >= 2) chips.push(`<span class="chip good">+${pct}% XP/min</span>`);
  else if (pct <= -2) chips.push(`<span class="chip">${pct}% XP/min</span>`);
  else chips.push(`<span class="chip">about even</span>`);
  return { pct, better: pct >= 2 && a.deaths <= b.deaths, html: chips.join(' ') };
}

// ---------- rendering ----------
function render() {
  if (!g) { renderStart(); return; }
  if (!document.getElementById('ribbon')) {
    app.innerHTML = `
      <header class="ribbon" id="ribbon"><div class="wrap">
        <div class="rb-top"><span class="mark">G<span class="o">O</span>DSCAR</span><span class="who" id="rb-who"></span><span class="gold num" id="rb-gold"></span></div>
        <div class="rb-hunt"><span id="rb-hunt"></span><span class="rate num" id="rb-rate"></span></div>
        <div class="bar hp" aria-label="Your life"><i id="rb-hpbar"></i><i class="shield" id="rb-shield"></i><span><span id="rb-you">You</span><span class="num" id="rb-hp"></span></span></div>
        <div class="bar foe" id="rb-foebar-wrap" aria-label="Enemy life"><i id="rb-foebar"></i><span><span id="rb-foe-n"></span><span class="num" id="rb-foe"></span></span></div>
        <div class="cds" id="rb-cds"></div>
        <div class="bar xp" aria-label="Experience"><i id="rb-xp"></i></div>
      </div></header>
      <main id="main"><div class="wrap" id="panel"></div></main>
      <nav class="tabs" id="nav"><div class="wrap" role="tablist"></div></nav>
      <div id="overlay"></div>`;
  }
  renderRibbon(); renderNav(); renderPanel(); renderOverlay();
}

function renderStart() {
  app.innerHTML = `<div class="wrap start">
    <div class="mark">G<span class="o">O</span>DSCAR</div>
    <div class="tag">Two worlds. One wound.</div>
    <p class="sub" style="text-align:center">The fight never stops. Choose who walks into the Fallfields; everything else happens while they kill.</p>
    <div class="classes">
      ${CLASS_KEYS.map(k => { const c = CLASSES[k]; return `<button class="cls" data-act="start" data-cls="${k}"><span class="nm">${c.name}</span><p>${esc(c.blurb)}</p></button>`; }).join('')}
    </div>
    <p class="fine">Prototype. Your save stays in this browser and, when you're signed in, in a private cloud save only you can read.</p>
  </div>`;
}

function setW(id, frac) { const el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%'; }
function setT(id, txt) { const el = document.getElementById(id); if (el && el.textContent !== txt) el.textContent = txt; }

function renderRibbon() {
  if (!g || !document.getElementById('ribbon')) return;
  const S = g.stats, f = g.fight, M = mdef(g.target.key);
  setT('rb-who', `${CLASSES[g.hero.cls].name}${g.hero.spec != null ? ' · ' + CLASSES[g.hero.cls].specs[g.hero.spec].name : ''} · Lv ${g.hero.level}`);
  setT('rb-gold', fmt(g.gold) + ' gold');
  const hunt = document.getElementById('rb-hunt');
  const huntHtml = `<b>${esc(M.name)}</b> · Lv ${g.target.level}${g.autoPush ? ' · auto' : ''}`;
  if (hunt.innerHTML !== huntHtml) hunt.innerHTML = huntHtml;
  const span = Math.min(120, Math.max(10, nowS() - sess.start));
  setT('rb-rate', passive ? 'paused here' : `${(sess.killTimes.length / span * 60).toFixed(1)} kills/min`);
  const hp = f.hp == null ? S.life : Math.max(0, f.hp);
  setW('rb-hpbar', hp / S.life);
  setW('rb-shield', (f.shield || 0) / S.life);
  setT('rb-hp', `${fmt(hp)} / ${fmt(S.life)}${f.shield > 1 ? ' +' + fmt(f.shield) : ''}`);
  setT('rb-you', S.primary.name);
  const wrap = document.getElementById('rb-foebar-wrap');
  if (f.deadUntil > g.t) {
    setW('rb-foebar', 0); setT('rb-foe-n', 'Recovering'); setT('rb-foe', `${Math.ceil(f.deadUntil - g.t)}s`); wrap.classList.remove('burning');
  } else if (!f.mon) {
    setW('rb-foebar', 0); setT('rb-foe-n', 'Next foe…'); setT('rb-foe', '');
  } else {
    setW('rb-foebar', f.mon.hp / f.mon.max); setT('rb-foe-n', mdef(f.mon.key).name); setT('rb-foe', `${fmt(Math.max(0, f.mon.hp))} / ${fmt(f.mon.max)}`);
    wrap.classList.toggle('burning', f.mon.burnUntil > g.t || f.mon.bleedUntil > g.t);
  }
  setW('rb-xp', g.hero.xp / xpToNext(g.hero.level));
  // autocast bar: one pip per slotted spell, filling as its cooldown recovers
  const cds = document.getElementById('rb-cds');
  const sig = g.cast.map(c => c.k).join(',');
  if (cds.dataset.sig !== sig) {
    cds.dataset.sig = sig;
    cds.innerHTML = g.cast.length ? g.cast.map(c => `<span class="cd ${SPELLS[c.k].kind}" title="${esc(SPELLS[c.k].name)}"><i></i><b>${esc(SPELLS[c.k].name)}</b></span>`).join('') : '';
    cds.hidden = !g.cast.length;
  }
  const pips = cds.querySelectorAll('.cd i');
  g.cast.forEach((c, i) => {
    const ready = f.cd[c.k] || 0, cd = SPELLS[c.k].cd * (1 - S.cdr / 100);
    const frac = ready <= g.t ? 1 : 1 - (ready - g.t) / cd;
    if (pips[i]) pips[i].style.width = Math.max(0, Math.min(1, frac)) * 100 + '%';
  });
}

function renderNav() {
  const el = document.querySelector('#nav .wrap'); if (!el) return;
  const ups = tab === 'bag' ? 0 : countUpgrades();
  const dot = { bag: ups ? `<span class="badge num">${ups}↑</span>` : '', build: g.hero.points || (g.hero.level >= SPEC_LEVEL && g.hero.spec == null) ? '<span class="badge">•</span>' : '' };
  el.innerHTML = TABS.map(([k, n]) => `<button role="tab" aria-selected="${tab === k}" data-act="tab" data-tab="${k}">${n}${dot[k] || ''}</button>`).join('');
}
function countUpgrades() { let n = 0; for (const it of g.bag) { try { if (verdict(it).better) n++; } catch (e) {} } return n; }

function noticesHtml() {
  const list = (g.notices || []).filter(k => NOTICES[k]).slice(0, 2);
  return list.map(k => {
    const [h, p, to] = NOTICES[k];
    return `<div class="notice"><div><b>${esc(h)}</b><p>${esc(p)}</p></div><div class="row">${to && to !== tab ? `<button class="btn small" data-act="notice-go" data-k="${k}" data-to="${to}">Show me</button>` : ''}<button class="btn small" data-act="notice-x" data-k="${k}">Got it</button></div></div>`;
  }).join('');
}

function renderPanel() {
  const p = document.getElementById('panel'); if (!p) return;
  if (passive) {
    p.innerHTML = `<div class="card"><h2>Running in another tab</h2><p class="sub">Godscar is already fighting in another tab or window. Only one place runs the fight at a time, so progress is never counted twice.</p><div><button class="btn primary" data-act="takeover">Play here instead</button></div></div>`;
    return;
  }
  const body = tab === 'fight' ? fightPanel() : tab === 'gear' ? gearPanel() : tab === 'bag' ? bagPanel() : tab === 'build' ? buildPanel() : forgePanel();
  p.innerHTML = noticesHtml() + body;
  if (tab === 'fight') renderLog(true);
}

// ----- Fight -----
function fightPanel() {
  const cur = g.target;
  const zone = uiZone || mdef(cur.key).zone;
  const zones = ZONE_KEYS.filter(z => g.zones[z]);
  const Z = ZONES[zone];
  const cards = MONSTER_KEYS.filter(k => MONSTERS[k].zone === zone).map(k => {
    const M = MONSTERS[k], un = g.unlocked[k], minL = Z.minLevel;
    const lv = k === cur.key ? cur.level : Math.max(minL, Math.min(uiLvl[k] || un, un));
    const kills = (g.kills || {})[k + ':' + un] || 0;
    const sc = scout && scout.res[k + ':' + lv];
    return `<section class="mon ${k === cur.key ? 'on' : ''}">
      <div class="row"><span class="nm">${esc(M.name)}</span><span class="spacer"></span>
        <span class="stepper"><button data-act="lvl" data-k="${k}" data-d="-1" ${lv <= minL ? 'disabled' : ''} aria-label="Lower level">−</button><span class="num">Lv ${lv}</span><button data-act="lvl" data-k="${k}" data-d="1" ${lv >= un ? 'disabled' : ''} aria-label="Higher level">+</button></span>
      </div>
      <p class="note">${esc(M.note)}</p>
      ${sc ? `<div class="scout num"><div><b>${sc.kpm.toFixed(1)}</b>kills/min</div><div><b>${fmt(sc.xpm)}</b>XP/min</div><div><b>${fmt(sc.gpm)}</b>gold/min</div><div><b class="${sc.deaths ? 'c-godtouched' : ''}">${sc.deaths}</b>deaths/4m</div></div>` : ''}
      <div class="row"><span class="sub num">Unlocked to Lv ${un} · next in ${Math.max(0, 30 - kills)} kills</span><span class="spacer"></span>
        ${k === cur.key ? '<span class="chip warn">Hunting</span>' : `<button class="btn small" data-act="hunt" data-k="${k}" data-l="${lv}">Hunt here</button>`}</div>
    </section>`;
  }).join('');
  const nextZone = !g.zones.hollow ? `<p class="sub">The Ashen Hollow opens when any Fallfields monster reaches level ${HOLLOW_UNLOCK}.</p>` : '';
  return `<div><h2>${esc(Z.name)}</h2><p class="sub">${esc(Z.text)} Target changes apply from the next foe; the fight never pauses.</p></div>
    ${zones.length > 1 ? `<div class="seg" role="tablist">${zones.map(z => `<button data-act="zone" data-z="${z}" aria-selected="${z === zone}">${esc(ZONES[z].name.replace('The ', ''))}</button>`).join('')}</div>` : ''}
    <div class="row"><button class="btn" data-act="scout">Scout this zone</button>
      <label class="toggle"><input type="checkbox" id="autopush" data-act="autopush" ${g.autoPush ? 'checked' : ''}> Auto-push levels</label></div>
    <div class="mons">${cards}</div>${nextZone}
    ${bossSection()}
    <h3>Combat log</h3><div class="log" id="log" aria-live="off"></div>`;
}

function bossSection() {
  const avail = BOSS_KEYS.filter(k => g.zones[BOSSES[k].zone]);
  const res = bossResult;
  const rows = avail.map(k => {
    const B = BOSSES[k], un = g.bossUnlocked[k];
    const lv = Math.max(B.minLevel, Math.min(bossLvl[k] || un, un));
    return `<section class="mon boss"><div class="row"><span class="nm">${esc(B.name)}</span><span class="spacer"></span>
      <span class="stepper"><button data-act="blvl" data-k="${k}" data-d="-2" ${lv <= B.minLevel ? 'disabled' : ''} aria-label="Lower level">−</button><span class="num">Lv ${lv}</span><button data-act="blvl" data-k="${k}" data-d="2" ${lv >= un ? 'disabled' : ''} aria-label="Higher level">+</button></span></div>
      <p class="note">${esc(B.note)} Beat the highest level to unlock the next.</p>
      <div class="row"><span class="sub">Guaranteed rare or Godtouched drop${B.zone === 'hollow' ? ', plus essences' : ''}.</span><span class="spacer"></span>
      <button class="btn small primary" data-act="boss" data-k="${k}" data-l="${lv}" ${g.sigils < 1 ? 'disabled' : ''}>Fight · 1 sigil</button></div></section>`;
  }).join('');
  let result = '';
  if (res) {
    const r = res.res, rw = res.rewards;
    result = `<div class="card result ${r.win ? 'win' : 'loss'}"><b>${r.win ? 'Victory' : r.died ? 'Defeated' : 'Out of time'}</b> against ${esc(BOSSES[r.key].name)}, level ${r.level}, after ${Math.round(r.time)}s. ${r.win ? '' : `You dealt ${Math.round(r.pct * 100)}% of its life.`}
      ${rw ? `<div class="sub">${fmt(rw.gold)} gold · ${rw.shards} shards · ${fmt(rw.xp)} XP${Object.entries(rw.ess).map(([e, n]) => ` · ${n} ${ESSENCES[e]}`).join('')}</div><div class="items">${rw.items.map(it => `<div class="item ${it.rarity}">${title(it)}<span class="meta num">${SLOT_NAMES[it.slot]} · ilvl ${it.ilvl}</span></div>`).join('')}</div>` : ''}
      <div><button class="btn small" data-act="bosslog">${showBossLog ? 'Hide' : 'Show'} fight log</button></div>
      ${showBossLog ? `<div class="log">${r.lines.slice(-40).reverse().map(l => `<div class="k-${esc(l.kind)}">${Math.round(l.t)}s · ${esc(l.text)}</div>`).join('') || '<div>No spells cast.</div>'}</div>` : ''}</div>`;
  }
  return `<div><h3>Bosses</h3><p class="sub num">${g.sigils}/${SIGIL_CAP} sigils · next in ${SIGIL_KILLS - (g.sigilProg || 0)} kills. A boss fights a snapshot of your build; your farming keeps going.</p></div>
    ${result}<div class="mons">${rows}</div>`;
}

function renderLog(force) {
  const el = document.getElementById('log'); if (!el) return;
  const last = logBuf.length ? logBuf[logBuf.length - 1] : null;
  const key = logBuf.length + ':' + (last ? last.t : 0);
  if (!force && el.dataset.k === key) return;
  el.dataset.k = key;
  el.innerHTML = logBuf.slice().reverse().slice(0, 40).map(l => `<div class="k-${esc(l.kind)}">${esc(l.text)}</div>`).join('') || '<div>The first foe approaches.</div>';
}

// ----- items -----
function itemLines(it) {
  const m = 1 + 0.1 * (it.plus || 0);
  const lines = [];
  if (it.slot === 'weapon') {
    const W = WEAPONS[it.base];
    lines.push(`<li class="base">${fmt(it.dmg * W.mult * m)} ${W.type === 'fire' ? 'fire' : 'physical'} damage · ${(1 / W.interval).toFixed(2)} attacks/s</li>`);
  }
  if (it.armor) lines.push(`<li class="base">${fmt(it.armor * m)} armor${it.life ? ' · ' + fmt(it.life * m) + ' life' : ''}</li>`);
  for (const [k, v] of it.affixes) lines.push(`<li>${esc(AFFIXES[k].label(AFFIXES[k].pct ? v : v * m))}</li>`);
  if (it.pmod) lines.push(`<li class="pm">${esc(PMODS[it.pmod].text)}</li>`);
  if (it.spell) lines.push(`<li class="spl">Grants <b>${esc(SPELLS[it.spell].name)}</b>: ${esc(SPELLS[it.spell].text)}</li>`);
  if (it.special) lines.push(`<li class="sp"><b>${esc(SPECIALS[it.special].name).toUpperCase()}</b> · ${esc(SPECIALS[it.special].text)}</li>`);
  return `<ul class="affs">${lines.join('')}</ul>`;
}
const title = it => `<span class="nm c-${it.rarity}">${esc(it.name)}${it.plus ? ' +' + it.plus : ''}</span>`;
const tags = it => (it.pmod ? '<span class="chip pmc">alters primary</span> ' : '') + (it.spell ? `<span class="chip splc">${esc(SPELLS[it.spell].name)}</span> ` : '');

function gearPanel() {
  const rows = SLOTS.map(slot => {
    const it = g.equip[slot];
    if (!it) return `<section class="item"><div class="slotlabel">${SLOT_NAMES[slot]}</div><div class="empty">Empty</div></section>`;
    const cost = upgradeCost(it);
    return `<section class="item ${it.rarity}"><div class="row"><span class="slotlabel">${SLOT_NAMES[slot]}</span><span class="spacer"></span><span class="meta num">ilvl ${it.ilvl}</span></div>
      ${title(it)}${itemLines(it)}
      <div class="row"><span class="sub num">${it.plus >= 10 ? 'Fully upgraded' : `Upgrade to +${it.plus + 1}: ${cost} Scar Shards`}</span><span class="spacer"></span>
      <button class="btn small" data-act="upgrade" data-id="${it.id}" ${it.plus >= 10 || g.mats.shards < cost ? 'disabled' : ''}>Upgrade</button></div></section>`;
  }).join('');
  return `<div><h2>Equipped</h2><p class="sub num">${g.mats.shards} Scar Shards. Each upgrade adds 10% to the item's base values. Salvaging an upgraded item returns half its shards.</p></div><div class="items">${rows}</div>`;
}

function bagPanel() {
  const opts = [['common', 'Keep everything'], ['magic', 'Keep Magic and better'], ['rare', 'Keep Rare and better'], ['godtouched', 'Keep Godtouched only']];
  const items = g.bag.slice().sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || b.ilvl - a.ilvl);
  const salv = g.bag.filter(i => !i.locked);
  const salvGold = salv.reduce((s, i) => s + salvageValue(i), 0);
  const list = items.map(it => {
    const v = verdict(it), open = expanded === it.id, cur = g.equip[it.slot];
    return `<section class="item ${it.rarity}">
      <button class="head" data-act="expand" data-id="${it.id}" aria-expanded="${open}">${title(it)}<span class="meta num">${SLOT_NAMES[it.slot]} · ilvl ${it.ilvl}${it.locked ? ' · locked' : ''}</span></button>
      <div class="row">${tags(it)}${v.html}</div>
      ${open ? `${itemLines(it)}
        <div class="cmp">${cur ? `Replaces ${title(cur)}${itemLines(cur)}` : 'Slot is empty.'}</div>
        <div class="row"><button class="btn primary small" data-act="equip" data-id="${it.id}">Equip</button>
          <button class="btn small" data-act="lock" data-id="${it.id}">${it.locked ? 'Unlock' : 'Lock'}</button><span class="spacer"></span>
          <button class="btn small" data-act="salvage" data-id="${it.id}" ${it.locked ? 'disabled' : ''}>Salvage · ${fmt(salvageValue(it))}g${salvageShards(it) ? ' · ' + salvageShards(it) + ' shards' : ''}</button></div>` : ''}
    </section>`;
  }).join('');
  return `<div><h2>Bag <span class="sub num">${g.bag.length}/${BAG_CAP}</span></h2><p class="sub">Each verdict comes from simulating 4 minutes against your current target with that item equipped. Items that don't fit are salvaged automatically, never lost. Items that grant spells or alter your primary are always kept.</p></div>
    <div class="row"><label for="filter" class="sub">Loot filter</label><select id="filter" data-act="filter">${opts.map(([k, n]) => `<option value="${k}" ${g.filter === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <span class="spacer"></span>
      ${confirm === 'salvall' ? `<button class="btn small primary" data-act="salvall-yes">Salvage ${salv.length} for ${fmt(salvGold)}g</button><button class="btn small" data-act="cancel">Cancel</button>`
        : `<button class="btn small" data-act="salvall" ${salv.length ? '' : 'disabled'}>Salvage unlocked</button>`}</div>
    <div class="items">${list || '<p class="empty">Nothing yet. Drops land here while you fight.</p>'}</div>`;
}

// ----- Build -----
function buildPanel() {
  const S = g.stats, C = CLASSES[g.hero.cls], av = availableSpells(g);
  const offAv = av.filter(k => SPELLS[k].kind === 'off'), utilAv = av.filter(k => SPELLS[k].kind === 'util');
  const offRows = g.bar.off.map((k, i) => {
    const used = g.bar.off.filter((x, j) => x && j !== i);
    return `<div class="slot"><label class="slotlabel" for="off${i}">Offensive ${i + 1}</label>
      <select id="off${i}" data-act="baroff" data-i="${i}"><option value="">Empty</option>${offAv.filter(x => !used.includes(x)).map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${esc(SPELLS[x].name)}</option>`).join('')}</select>
      ${k ? `<p class="sub">${esc(SPELLS[k].text)} Every ${fmt(SPELLS[k].cd * (1 - S.cdr / 100), 1)}s.</p>` : ''}</div>`;
  }).join('');
  const utilRows = g.bar.util.map((u, i) => {
    const used = g.bar.util.filter((x, j) => x && j !== i).map(x => x.k);
    return `<div class="slot"><label class="slotlabel" for="util${i}">Utility ${i + 1}</label>
      <div class="row"><select id="util${i}" data-act="barutil" data-i="${i}"><option value="">Empty</option>${utilAv.filter(x => !used.includes(x)).map(x => `<option value="${x}" ${u && x === u.k ? 'selected' : ''}>${esc(SPELLS[x].name)}</option>`).join('')}</select>
      ${u ? `<select id="cond${i}" data-act="barcond" data-i="${i}" aria-label="When to cast">${Object.entries(CONDS).map(([c, n]) => `<option value="${c}" ${u.cond === c ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}</div>
      ${u ? `<p class="sub">${esc(SPELLS[u.k].text)} Cooldown ${fmt(SPELLS[u.k].cd * (1 - S.cdr / 100), 1)}s.</p>` : ''}</div>`;
  }).join('');
  const barNote = !av.length ? `<p class="sub">Your class spell, ${esc(SPELLS[C.spell].name)}, awakens at level ${CLASS_SPELL_LEVEL}. Rare items from the Ashen Hollow grant more spells.</p>` : '';

  let spec;
  if (g.hero.level < SPEC_LEVEL) spec = `<p class="sub">Unlocks at level ${SPEC_LEVEL}.</p>${C.specs.map(s => `<p class="sub" style="margin:0"><b>${esc(s.name)}</b> · ${esc(s.text)}</p>`).join('')}`;
  else if (g.hero.spec == null || confirm === 'respec') {
    const cost = g.hero.spec == null ? 0 : respecCost(g.hero.level);
    spec = `${cost ? `<p class="sub">Changing costs ${fmt(cost)} gold.</p>` : '<p class="sub">Your first choice is free.</p>'}<div class="specs">${C.specs.map((s, i) => `<button class="spec" data-act="spec" data-i="${i}" ${g.hero.spec === i || g.gold < cost ? 'disabled' : ''}><b>${esc(s.name)}</b><span>${esc(s.text)}</span></button>`).join('')}</div>${g.hero.spec != null ? '<button class="btn small" data-act="cancel">Keep current</button>' : ''}`;
  } else {
    const s = C.specs[g.hero.spec];
    spec = `<p style="margin:0"><b>${esc(s.name)}</b> · <span class="sub">${esc(s.text)}</span></p><div><button class="btn small" data-act="respec">Change specialization</button></div>`;
  }
  const P = g.hero.passives || {};
  const spent = PASSIVE_KEYS.reduce((a, k) => a + (P[k] || 0), 0);
  const pas = PASSIVE_KEYS.map(k => `<div class="pas"><div><b>${PASSIVES[k].name}</b> <span class="num">${P[k] || 0}</span><span class="sub"> · ${PASSIVES[k].text} each</span></div><button class="btn small" data-act="pas" data-k="${k}" ${g.hero.points ? '' : 'disabled'} aria-label="Add a point to ${PASSIVES[k].name}">+</button></div>`).join('');

  const aps = 1 / S.interval;
  const rows = [
    ['Life', fmt(S.life)], ['Armor', fmt(S.armor)], ['Life per second', fmt(S.regen, 1)], ['Fire resistance', fmt(S.fireRes) + '%'],
    ['Physical per hit', fmt(S.phys)], ['Fire per hit', fmt(S.fire)], ['Attacks per second', aps.toFixed(2)],
    ['Critical chance', fmt(S.critChance) + '%'], ['Critical damage', fmt(S.critMulti) + '%'], ['Life on hit', fmt(S.lifeOnHit, 1)],
    ['Retaliation', fmt(S.thorns)], ['Spell damage', '×' + S.spellMore.toFixed(2)], ['Burn and bleed', '×' + S.dotMore.toFixed(2)],
    ['Spell cooldowns', '−' + fmt(S.cdr) + '%'], ['Dodge', fmt(S.dodge) + '%'], ['Gold found', '+' + fmt(S.goldFind) + '%']
  ];
  const pm = Object.keys(S.pmods), sp = Object.keys(S.specials);
  return `<div><h2>${C.name}, level ${g.hero.level}</h2><p class="sub num">${fmt(g.hero.xp)} / ${fmt(xpToNext(g.hero.level))} XP · ${fmt(g.life.kills)} kills · ${fmt(g.life.deaths)} deaths · ${g.life.bosses || 0} bosses · ${dur(g.life.offlineSec || 0)} fought while away</p></div>
    <div class="card"><h3>Primary · never stops</h3><p style="margin:0"><b>${esc(C.primary.name)}</b> · <span class="sub">${esc(C.primary.text)}</span></p>
      ${pm.map(k => `<p class="sub pmline" style="margin:0"><b>${esc(PMODS[k].name)}</b> · ${esc(PMODS[k].text)}</p>`).join('') || '<p class="sub" style="margin:0">Items with a gold line change how it works.</p>'}
      ${sp.map(k => `<p class="sub c-godtouched" style="margin:0"><b>${esc(SPECIALS[k].name)}</b> · ${esc(SPECIALS[k].text)}</p>`).join('')}</div>
    <div class="card"><h3>Autocast bar</h3>${barNote}${av.length ? offRows + utilRows : ''}</div>
    <div class="card"><h3>Specialization</h3>${spec}</div>
    <div class="card"><div class="row"><h3>Passives</h3><span class="spacer"></span><span class="sub num">${g.hero.points || 0} to spend</span>${spent ? '<button class="btn small" data-act="pasreset">Reset</button>' : ''}</div>${pas}</div>
    <dl class="stats num">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
    <div class="card"><h3>Save</h3>
      <p class="sub" style="margin:0">Saved in this browser every few seconds. Cloud save: ${esc(cloud.status)}</p>
      <div class="row"><button class="btn small" data-act="export">Copy save code</button><button class="btn small" data-act="import">Load save code</button></div>
      <textarea id="savebox" aria-label="Save code" placeholder="Paste a save code here, then press Load save code."></textarea>
      <p class="sub" id="savemsg" style="margin:0"></p>
    </div>
    <div class="card"><h3>Start over</h3><p class="sub" style="margin:0">Deletes this character everywhere it is saved.</p>
      <div class="row">${confirm === 'reset' ? `<button class="btn small primary" data-act="reset-yes">Delete character</button><button class="btn small" data-act="cancel">Keep playing</button>` : `<button class="btn small" data-act="reset">Start over</button>`}</div></div>`;
}

// ----- Forge -----
function forgePanel() {
  const M = g.mats;
  const mats = `<div class="mats num"><div><b>${M.shards}</b>Scar Shards</div><div><b class="e-ember">${M.ember}</b>Ember</div><div><b class="e-ash">${M.ash}</b>Ash</div><div><b class="e-rift">${M.rift}</b>Rift</div><div><b>${fmt(g.gold)}</b>Gold</div></div>`;
  const equipped = SLOTS.map(s => g.equip[s]).filter(Boolean);
  const reforge = equipped.filter(it => it.affixes.length).map(it => {
    const c = reforgeCost(it);
    return `<section class="item ${it.rarity}">${title(it)}<ul class="affs">${it.affixes.map(([k, v], i) => `<li class="frow"><span>${esc(AFFIXES[k].label(AFFIXES[k].pct ? v : v * (1 + 0.1 * it.plus)))}</span><button class="btn small" data-act="reforge" data-id="${it.id}" data-i="${i}" ${g.gold < c ? 'disabled' : ''}>Reforge · ${fmt(c)}g</button></li>`).join('')}</ul></section>`;
  }).join('') || '<p class="empty">Equip items with stats to reforge them.</p>';
  const eligible = equipped.filter(it => RARITY_RANK[it.rarity] >= 2 && !it.spell);
  const inscribe = eligible.map(it => {
    const c = inscribeCost(it);
    return `<section class="item ${it.rarity}">${title(it)}<div class="row"><select id="ins-${it.id}" aria-label="Spell to inscribe">${FOUND_SPELLS.map(k => { const el = SPELLS[k].el; return `<option value="${k}" ${M[el] < c.essence ? 'disabled' : ''}>${esc(SPELLS[k].name)} · ${c.essence} ${el}</option>`; }).join('')}</select>
      <button class="btn small primary" data-act="inscribe" data-id="${it.id}" ${g.gold < c.gold ? 'disabled' : ''}>Inscribe · ${fmt(c.gold)}g</button></div></section>`;
  }).join('') || '<p class="empty">Equip a Rare or Godtouched item that doesn\'t already grant a spell.</p>';
  return `<div><h2>The Forge</h2><p class="sub">Shape what you already wear. Everything here happens while you keep fighting.</p></div>${mats}
    <div class="card"><h3>Inscribe a spell</h3><p class="sub" style="margin:0">Bind a spell of your choice to an equipped Rare or Godtouched item. Costs ${3} essence of the spell's element, from the Ashen Hollow.</p>
      <ul class="affs spells">${FOUND_SPELLS.map(k => `<li><b class="e-${SPELLS[k].el}">${esc(SPELLS[k].name)}</b> <span class="sub">(${SPELLS[k].kind === 'off' ? 'offensive' : 'utility'}, ${SPELLS[k].el})</span> · ${esc(SPELLS[k].text)}</li>`).join('')}</ul>
      <div class="items">${inscribe}</div></div>
    <div class="card"><h3>Reforge</h3><p class="sub" style="margin:0">Replace one stat with a new random stat for that slot, rolled at the item's level.</p><div class="items">${reforge}</div></div>`;
}

function renderOverlay() {
  const el = document.getElementById('overlay'); if (!el) return;
  if (!summary) { el.innerHTML = ''; return; }
  const o = summary.out;
  el.innerHTML = `<div class="overlay" data-act="close-sum"><div class="sheet" role="dialog" aria-label="While you were away">
    <h2>While you were away</h2>
    <p class="sub" style="margin:0">Your ${CLASSES[g.hero.cls].name.toLowerCase()} fought for ${dur(summary.elapsed)}${summary.capped ? ` (the 24 hour cap kept ${dur(summary.capped)} out)` : ''}.</p>
    <div class="sumgrid num">
      <div><b>${fmt(o.kills)}</b>kills</div><div><b>${fmt(o.xp)}</b>XP${summary.lvl1 > summary.lvl0 ? ` · Lv ${summary.lvl0}→${summary.lvl1}` : ''}</div><div><b>${fmt(o.gold)}</b>gold</div>
      <div><b>${o.items}</b>items kept</div><div><b>${o.shards}</b>shards</div><div><b class="${o.deaths ? 'c-godtouched' : ''}">${o.deaths}</b>deaths</div>
      ${Object.keys(o.ess).length ? Object.entries(o.ess).map(([e, n]) => `<div><b class="e-${e}">${n}</b>${e}</div>`).join('') : ''}${o.sigils ? `<div><b>${o.sigils}</b>sigils</div>` : ''}
    </div>
    ${o.notable.length ? `<h3>Notable drops</h3><div class="items">${o.notable.slice(-6).reverse().map(it => `<div class="item ${it.rarity}">${title(it)}<div class="row">${tags(it)}<span class="meta num">${SLOT_NAMES[it.slot]} · ilvl ${it.ilvl}</span></div></div>`).join('')}</div>` : ''}
    <button class="btn primary" data-act="close-sum">Back to it</button>
  </div></div>`;
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type === 'checkbox')) return;
  if (a === 'close-sum') { if (e.target !== b && b.classList.contains('overlay')) return; summary = null; renderOverlay(); return; }
  if (a === 'start') {
    g = newGame(b.dataset.cls, nowS(), (Math.random() * 4294967296) >>> 0);
    sess = newSess(); logBuf = []; log('You arrive in the Fallfields. Something moves in the blighted wheat.', 'sys');
    lsSet(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
    saveLocal(); app.innerHTML = ''; tab = 'fight'; render(); cloudSave(true); return;
  }
  if (a === 'takeover') { takeOver(); return; }
  if (a === 'tab') { tab = b.dataset.tab; confirm = null; renderNav(); renderPanel(); window.scrollTo(0, 0); return; }
  if (a === 'notice-x') { g.notices = g.notices.filter(k => k !== b.dataset.k); saveLocal(); renderPanel(); return; }
  if (a === 'notice-go') { g.notices = g.notices.filter(k => k !== b.dataset.k); tab = b.dataset.to; saveLocal(); renderNav(); renderPanel(); window.scrollTo(0, 0); return; }
  if (a === 'zone') { uiZone = b.dataset.z; scout = null; renderPanel(); return; }
  if (a === 'lvl') {
    const k = b.dataset.k, d = +b.dataset.d, minL = ZONES[MONSTERS[k].zone].minLevel;
    if (k === g.target.key) act(() => { g.target.level = Math.max(minL, Math.min(g.unlocked[k], g.target.level + d)); g.streak = 0; });
    else { uiLvl[k] = Math.max(minL, Math.min(g.unlocked[k], (uiLvl[k] || g.unlocked[k]) + d)); renderPanel(); }
    return;
  }
  if (a === 'hunt') { const k = b.dataset.k, l = +b.dataset.l; act(() => { g.target = { key: k, level: l }; g.streak = 0; log(`Now hunting ${MONSTERS[k].name}, level ${l}.`, 'sys'); }); return; }
  if (a === 'scout') {
    const zone = uiZone || mdef(g.target.key).zone, res = {};
    for (const k of MONSTER_KEYS.filter(k => MONSTERS[k].zone === zone)) {
      const minL = ZONES[zone].minLevel;
      const lv = k === g.target.key ? g.target.level : Math.max(minL, Math.min(uiLvl[k] || g.unlocked[k], g.unlocked[k]));
      res[k + ':' + lv] = project(g, { target: { key: k, level: lv }, secs: 240 });
    }
    scout = { res }; renderPanel(); return;
  }
  if (a === 'blvl') { const k = b.dataset.k, B = BOSSES[k]; bossLvl[k] = Math.max(B.minLevel, Math.min(g.bossUnlocked[k], (bossLvl[k] || g.bossUnlocked[k]) + +b.dataset.d)); renderPanel(); return; }
  if (a === 'boss') {
    const k = b.dataset.k, l = +b.dataset.l;
    act(() => {
      if (g.sigils < 1) return;
      g.sigils--;
      const res = fightBoss(g, k, l);
      let rewards = null;
      if (res.win) { const out = emptyOut(); rewards = bossRewards(g, res, out); log(`Defeated ${BOSSES[k].name} (level ${l}).`, 'level'); }
      else log(`${BOSSES[k].name} (level ${l}) held. You dealt ${Math.round(res.pct * 100)}% of its life.`, 'death');
      bossResult = { res, rewards }; showBossLog = false;
      if (res.win && g.bossUnlocked[k] > l) bossLvl[k] = g.bossUnlocked[k];
    });
    return;
  }
  if (a === 'bosslog') { showBossLog = !showBossLog; renderPanel(); return; }
  if (a === 'expand') { expanded = expanded === b.dataset.id ? null : b.dataset.id; renderPanel(); return; }
  if (a === 'equip') {
    const id = b.dataset.id;
    act(() => {
      const i = g.bag.findIndex(x => x.id === id); if (i < 0) return;
      const it = g.bag.splice(i, 1)[0], old = g.equip[it.slot];
      g.equip[it.slot] = it; if (old) g.bag.push(old);
      log(`Equipped ${it.name}.`, 'sys'); expanded = null;
    });
    return;
  }
  if (a === 'lock') { const it = g.bag.find(x => x.id === b.dataset.id); if (it) { it.locked = !it.locked; saveLocal(); renderPanel(); } return; }
  if (a === 'salvage') {
    act(() => { const i = g.bag.findIndex(x => x.id === b.dataset.id); if (i < 0 || g.bag[i].locked) return; g.gold += salvageValue(g.bag[i]); g.mats.shards += salvageShards(g.bag[i]); g.bag.splice(i, 1); expanded = null; });
    return;
  }
  if (a === 'salvall') { confirm = 'salvall'; renderPanel(); return; }
  if (a === 'salvall-yes') { confirm = null; act(() => { g.bag = g.bag.filter(it => { if (it.locked) return true; g.gold += salvageValue(it); g.mats.shards += salvageShards(it); return false; }); }); return; }
  if (a === 'cancel') { confirm = null; renderPanel(); return; }
  if (a === 'upgrade') {
    act(() => { const it = SLOTS.map(s => g.equip[s]).find(x => x && x.id === b.dataset.id); if (!it || it.plus >= 10) return; const c = upgradeCost(it); if (g.mats.shards < c) return; g.mats.shards -= c; it.shardsIn = (it.shardsIn || 0) + c; it.plus++; });
    return;
  }
  if (a === 'spec') {
    const i = +b.dataset.i;
    act(() => { const cost = g.hero.spec == null ? 0 : respecCost(g.hero.level); if (g.gold < cost) return; g.gold -= cost; g.hero.spec = i; confirm = null; g.notices = (g.notices || []).filter(k => k !== 'spec'); log(`Specialized as ${CLASSES[g.hero.cls].specs[i].name}.`, 'level'); });
    return;
  }
  if (a === 'respec') { confirm = 'respec'; renderPanel(); return; }
  if (a === 'pas') { const k = b.dataset.k; act(() => { if (!g.hero.points) return; g.hero.points--; g.hero.passives[k] = (g.hero.passives[k] || 0) + 1; }); return; }
  if (a === 'pasreset') { act(() => { const n = PASSIVE_KEYS.reduce((s, k) => s + (g.hero.passives[k] || 0), 0); g.hero.passives = {}; g.hero.points = (g.hero.points || 0) + n; }); return; }
  if (a === 'reforge') {
    const id = b.dataset.id, i = +b.dataset.i;
    act(() => {
      const it = SLOTS.map(s => g.equip[s]).find(x => x && x.id === id); if (!it) return;
      const c = reforgeCost(it); if (g.gold < c) return;
      const na = rollAffix(g.rng, it, it.affixes.map(x => x[0])); if (!na) return;
      g.gold -= c; it.affixes[i] = na;
      log(`Reforged ${it.name}: ${AFFIXES[na[0]].label(AFFIXES[na[0]].pct ? na[1] : na[1] * (1 + 0.1 * it.plus))}.`, 'sys');
    });
    return;
  }
  if (a === 'inscribe') {
    const id = b.dataset.id, sel = document.getElementById('ins-' + id), k = sel && sel.value;
    act(() => {
      const it = SLOTS.map(s => g.equip[s]).find(x => x && x.id === id); if (!it || !k || it.spell) return;
      const c = inscribeCost(it), el = SPELLS[k].el;
      if (g.gold < c.gold || g.mats[el] < c.essence) return;
      g.gold -= c.gold; g.mats[el] -= c.essence; it.spell = k;
      log(`Inscribed ${SPELLS[k].name} onto ${it.name}.`, 'level');
    });
    return;
  }
  if (a === 'export') {
    const box = document.getElementById('savebox'); const code = btoa(unescape(encodeURIComponent(serialize())));
    box.value = code; box.select();
    const msg = document.getElementById('savemsg');
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => { msg.textContent = 'Copied. Keep it somewhere safe.'; }, () => { msg.textContent = 'Selected. Copy it from the box.'; });
    return;
  }
  if (a === 'import') {
    const box = document.getElementById('savebox'), msg = document.getElementById('savemsg');
    try {
      g = hydrate(decodeURIComponent(escape(atob(box.value.trim()))));
      sess = newSess(); logBuf = []; proj.clear(); scout = null;
      resume(true); cloudSave(true);
      document.getElementById('savemsg').textContent = 'Save loaded.';
    } catch (err) { msg.textContent = 'That code isn\'t a Godscar save. Copy the whole code and try again.'; }
    return;
  }
  if (a === 'reset') { confirm = 'reset'; renderPanel(); return; }
  if (a === 'reset-yes') {
    confirm = null; g = null; lsDel(LS_KEY); lastSaveJson = ''; bossResult = null; uiZone = null;
    if (cloud.db && cloud.uid) cloud.db.doc(`data/users/${cloud.uid}/save`).delete().catch(() => {});
    summary = null; render(); return;
  }
});
document.addEventListener('change', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, i = +b.dataset.i;
  if (a === 'filter') act(() => { g.filter = b.value; });
  if (a === 'autopush') act(() => { g.autoPush = b.checked; g.streak = 0; });
  if (a === 'baroff') act(() => { g.bar.off[i] = b.value || null; });
  if (a === 'barutil') act(() => { g.bar.util[i] = b.value ? { k: b.value, cond: SPELLS[b.value].cond } : null; });
  if (a === 'barcond') act(() => { if (g.bar.util[i]) g.bar.util[i].cond = b.value; });
});

// ---------- cloud save (private per account) ----------
async function cloudInit() {
  try {
    if (!window.claude || !window.claude.use) { cloud.status = 'not available here.'; return; }
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const uid = user ? await user.id() : null;
    if (!db || !uid) { cloud.status = 'sign in to claude.ai to sync across devices.'; refreshBuild(); return; }
    cloud.db = db; cloud.uid = uid;
    const ref = db.doc(`data/users/${uid}/save`);
    const snap = await Promise.race([ref.get(), new Promise(r => setTimeout(() => r('timeout'), 10000))]);
    if (snap === 'timeout') { cloud.status = 'can\'t reach the cloud right now; saving locally.'; refreshBuild(); return; }
    if (snap.exists) {
      const d = snap.data();
      if (d && d.save && (!g || d.t > g.t + 5)) {
        try {
          const had = !!g;
          g = hydrate(d.save); sess = sess || newSess(); proj.clear(); scout = null;
          if (!had) app.innerHTML = '';
          log('Loaded your cloud save.', 'sys');
          lsSet(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
          resume(true);
        } catch (e) {}
      }
      cloud.savedT = d ? d.t : 0;
    }
    cloud.status = 'on.';
    refreshBuild();
    if (g) cloudSave(true);
  } catch (e) { cloud.status = 'unavailable; saving locally.'; refreshBuild(); }
}
async function cloudSave(force) {
  if (!cloud.db || !g || passive || cloud.busy) return;
  if (!force && g.t - cloud.savedT < 60) return;
  cloud.busy = true;
  try {
    const t = g.t;
    await cloud.db.doc(`data/users/${cloud.uid}/save`).set({ t, save: serialize() });
    cloud.savedT = t; cloud.status = 'on, last synced ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.';
  } catch (e) {
    cloud.status = e && e.code === 'quota_exceeded' ? 'cloud storage is full; saving locally.' : 'last sync failed; will retry.';
  }
  cloud.busy = false;
  refreshBuild();
}
function refreshBuild() { const ae = document.activeElement; if (g && tab === 'build' && !confirm && !(ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT'))) renderPanel(); }

// ---------- boot ----------
function boot(hotData) {
  sess = newSess();
  const s = hotData && hotData.save ? hotData.save : null;
  const local = lsGet(LS_KEY);
  let a = null, b = null;
  try { a = s ? hydrate(s) : null; } catch (e) {}
  try { b = local ? hydrate(local) : null; } catch (e) {}
  g = a && b ? (a.t >= b.t ? a : b) : (a || b);
  if (hotData && hotData.tab && TABS.some(t => t[0] === hotData.tab)) tab = hotData.tab;
  if (g) log('Welcome back to the Fallfields.', 'sys');
  heartbeat();
  if (g && !passive) resume(true); else render();
  setInterval(tick, 250);
  setInterval(heartbeat, 1000);
  setInterval(() => { saveLocal(); cloudSave(false); }, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { saveLocal(); cloudSave(true); } else { heartbeat(); if (!passive) resume(true); }
  });
  window.addEventListener('pagehide', saveLocal);
  setTimeout(cloudInit, 0);
}
try { window.claude?.hot?.snapshot?.(() => ({ save: g && !passive ? serialize() : null, tab })); } catch (e) {}
if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
})();
