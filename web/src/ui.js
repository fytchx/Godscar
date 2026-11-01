(function () {
'use strict';
const LS_KEY = 'godscar.save.v1', LOCK_KEY = 'godscar.lock';
const TAB_ID = Math.random().toString(36).slice(2);
const nowS = () => Date.now() / 1000;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = document.getElementById('app');

let g = null, sess = null, logBuf = [], tab = 'fight', passive = false;
let expanded = null, gearSel = 'weapon', scout = null, uiLvl = {}, uiZone = null, bossLvl = {}, showBossLog = false, confirm = null;
let craft = { slot: 'weapon', rarity: 'rare', base: '' };
let lastSaveJson = '', summary = null, lastStructure = '', toast = null, toastTimer = 0;
const proj = new Map();
const cloud = { db: null, uid: null, status: 'connecting…', savedT: 0, busy: false };

const TABS = [['fight', 'Fight'], ['gear', 'Gear'], ['bag', 'Bag'], ['build', 'Build'], ['forge', 'Forge']];
const NOTICES = {
  start: ['The fight never stops', 'Your primary ability attacks on its own, forever. Everything else you do in Godscar happens while it fights.', null],
  passives: ['Passive points', 'Every level gives a passive point. Spend it on the Build tab. Respec is free.', 'build'],
  shards: ['Scar Shards', 'Kills drop Scar Shards. Spend them on the Gear tab to upgrade what you wear.', 'gear'],
  bar: ['Your class spell awakens', 'It sits in your autocast bar on the Build tab and fires on its own. The bar holds 3 offensive and 2 utility spells.', 'build'],
  spec: ['Choose a specialization', 'You can now pick one of your class\'s three specializations on the Build tab.', 'build'],
  boss: ['A Boss Sigil formed', 'Bosses fight a snapshot of your current build. Your farming keeps going the whole time.', 'fight'],
  hollow: ['The Ashen Hollow is open', 'Tougher monsters, stronger items, element essences, and rare items that grant spells. Switch zones on the Fight tab.', 'fight'],
  essence: ['Element essence', 'Essences inscribe spells onto items, craft Epic and Legendary gear, and add belt sockets at the Forge.', 'forge'],
  spellitem: ['An item that grants a spell', 'Equip it and the spell joins your autocast bar.', 'bag'],
  legendary: ['A Legendary item', 'Legendary augments are rules, not numbers: they convert, trigger, repeat or trade off. Read them closely.', 'bag'],
  ascension: ['Ascension is open', 'Ascended set pieces scale to your slot level. Level each armor slot with materials from one specific monster. Your first Ascension is where commitment begins.', 'gear'],
  ascended: ['An Ascended set piece', 'It arrives already attuned to your slot level. Two and four pieces of one set unlock its bonuses.', 'bag'],
  socket: ['A socketed belt', 'Super rare. It can hold a Scarbound Jewel, which transforms your class.', 'gear'],
  jewel: ['A Scarbound Jewel', 'Socket it in a belt to evolve your class. See the Gear tab.', 'gear'],
  upgraded: ['Godscar has grown', 'Your character came through an update with passive points for its levels.', 'build'],
  upgraded3: ['Godscar has grown again', 'Your items were rebuilt into the new anatomy: base stats, enchants, up to 6 affixes and Legendary augments. New: 6 damage types, STR/DEX/INT, belts, legs, off-hands, two rings, Ascension and Scarbound Jewels.', 'gear']
};

// ---------- storage ----------
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
function serialize() { const o = Object.assign({}, g); delete o.stats; delete o.cast; return JSON.stringify(o); }
function hydrate(str) {
  let o = typeof str === 'string' ? JSON.parse(str) : JSON.parse(JSON.stringify(str));
  if (!o || !o.hero || !CLASSES[o.hero.cls]) throw new Error('Not a Godscar save');
  o = migrate(o); refresh(o); return o;
}
function saveLocal() { if (!g || passive || !ownsLock()) return; const j = serialize(); if (j !== lastSaveJson) { lsSet(LS_KEY, j); lastSaveJson = j; } }

// ---------- one running tab ----------
function readLock() { try { return JSON.parse(lsGet(LOCK_KEY) || 'null'); } catch (e) { return null; } }
function ownsLock() { const l = readLock(); return !l || l.id === TAB_ID || Date.now() - l.ts > 5000; }
function heartbeat() {
  const l = readLock();
  if (l && l.id !== TAB_ID && Date.now() - l.ts < 5000) { if (!passive) { passive = true; render(); } return; }
  lsSet(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
  if (passive) { passive = false; const s = lsGet(LS_KEY); if (s) { try { g = hydrate(s); } catch (e) {} } resume(true); }
}
function takeOver() { lsSet(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() })); passive = true; heartbeat(); }

function log(text, kind) { logBuf.push({ t: g.t, text, kind: kind || '' }); if (logBuf.length > 60) logBuf.splice(0, logBuf.length - 60); }
function newSess() { const o = emptyOut(); o.killTimes = []; o.start = nowS(); return o; }
function dur(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : m ? `${m}m ${s % 60}s` : `${s}s`; }

function resume(showSummary) {
  if (!g) return;
  const t = nowS(), gap = t - g.t;
  if (gap > 45) {
    const lvl0 = g.hero.level, res = catchUp(g, t, null);
    g.life.offlineSec = (g.life.offlineSec || 0) + res.elapsed;
    if (showSummary && res.out.kills + res.out.deaths > 0) summary = { ...res, lvl0, lvl1: g.hero.level };
    log(`Caught up ${dur(res.elapsed)} of fighting.`, 'sys'); proj.clear();
  } else if (gap > 0) advance(g, t, sess, log);
  saveLocal(); render();
}

// Every change goes through the sim's action interface, applied at the current moment.
function dispatch(a) {
  if (!g || passive) return;
  const t = nowS();
  if (t - g.t > 45) resume(true); else advance(g, t, sess, log);
  const err = doAction(g, a);
  if (err) { showToast(err); return err; }
  if (g.fight.hp != null) g.fight.hp = Math.min(g.fight.hp, g.stats.life);
  proj.clear(); scout = null; saveLocal(); render();
  return null;
}
function showToast(msg) {
  toast = msg; clearTimeout(toastTimer);
  const el = document.getElementById('toast'); if (el) { el.textContent = msg; el.hidden = false; }
  toastTimer = setTimeout(() => { toast = null; const e2 = document.getElementById('toast'); if (e2) e2.hidden = true; }, 3200);
}

function tick() {
  if (!g || passive) return;
  const t = nowS();
  if (t - g.t > 45) { resume(true); return; }
  advance(g, t, sess, log);
  const kt = sess.killTimes; while (kt.length && kt[0] < t - 120) kt.shift();
  renderRibbon();
  const structure = [g.bag.length, g.hero.level, g.hero.points, JSON.stringify(g.unlocked), g.target.level, g.sigils, g.zones.hollow, g.asc.unlocked,
    JSON.stringify(g.mats), g.jewels.length, (g.notices || []).length].join(',');
  if (structure !== lastStructure) {
    lastStructure = structure;
    const ae = document.activeElement;
    if (!(ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT'))) renderPanel();
    renderNav();
  }
  if (tab === 'fight') renderLog();
}

// ---------- projections ----------
function buildSig() { return EQUIP.map(s => g.equip[s] ? g.equip[s].id + '.' + g.equip[s].plus + (g.equip[s].jewel ? 'j' : '') : '-').join('|') + '@' + g.hero.level + JSON.stringify(g.hero.passives) + g.hero.spec + JSON.stringify(g.bar) + JSON.stringify(g.asc.slots); }
function baseProj() { const k = 'base|' + buildSig() + '|' + g.target.key + g.target.level; if (!proj.has(k)) proj.set(k, project(g, { secs: 240 })); return proj.get(k); }
function itemProj(it, key) { const k = it.id + '|' + key + '|' + buildSig() + '|' + g.target.key + g.target.level; if (!proj.has(k)) proj.set(k, project(g, { secs: 240, equip: { [key]: it } })); return proj.get(k); }
function verdict(it) {
  const key = it.slot === 'weapon' || it.slot !== 'offhand' ? verdictSlot(g, it) : 'offhand';
  if (key === 'offhand' && g.equip.weapon) { const W = WEAPONS[g.equip.weapon.base]; if ((W.bow && it.base !== 'quiver') || (!W.bow && (W.hands === 2 || OFFHANDS[it.base].bowOnly))) return { pct: 0, better: false, key, html: '<span class="chip">doesn\'t fit your weapon</span>' }; }
  const b = baseProj(), a = itemProj(it, key);
  const metric = b.xpm > 0 ? (a.xpm - b.xpm) / b.xpm : (a.dps - b.dps) / Math.max(b.dps, 1e-9);
  const pct = Math.round(metric * 100), chips = [];
  if (a.deaths > b.deaths) chips.push('<span class="chip bad">dies more</span>'); else if (a.deaths < b.deaths) chips.push('<span class="chip good">dies less</span>');
  if (pct >= 2) chips.push(`<span class="chip good">+${pct}% XP/min</span>`); else if (pct <= -2) chips.push(`<span class="chip">${pct}% XP/min</span>`); else chips.push('<span class="chip">about even</span>');
  return { pct, better: pct >= 2 && a.deaths <= b.deaths, key, html: chips.join(' ') };
}

// ---------- shell ----------
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
      <div class="toast" id="toast" role="status" hidden></div>
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
    <div class="classes">${CLASS_KEYS.map(k => { const c = CLASSES[k]; return `<button class="cls" data-act="start" data-cls="${k}"><span class="nm">${c.name}</span><p>${esc(c.blurb)}</p></button>`; }).join('')}</div>
    <p class="fine">Prototype. Your save stays in this browser and, when you're signed in, in a private cloud save only you can read.</p>
  </div>`;
}
function setW(id, f) { const el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.min(1, f)) * 100 + '%'; }
function setT(id, t) { const el = document.getElementById(id); if (el && el.textContent !== t) el.textContent = t; }

function renderRibbon() {
  if (!g || !document.getElementById('ribbon')) return;
  const S = g.stats, f = g.fight, M = mdef(g.target.key), C = CLASSES[g.hero.cls];
  setT('rb-who', `${S.evo ? C.evo.name : C.name}${g.hero.spec != null ? ' · ' + C.specs[g.hero.spec].name : ''} · Lv ${g.hero.level}`);
  setT('rb-gold', fmt(g.gold) + ' gold');
  const hunt = document.getElementById('rb-hunt'), hh = `<b>${esc(M.name)}</b> · stage ${g.target.level}${g.autoPush ? ' · auto' : ''}`;
  if (hunt.innerHTML !== hh) hunt.innerHTML = hh;
  const span = Math.min(120, Math.max(10, nowS() - sess.start));
  setT('rb-rate', passive ? 'paused here' : `${(sess.killTimes.length / span * 60).toFixed(1)} kills/min`);
  const hp = f.hp == null ? S.life : Math.max(0, f.hp);
  setW('rb-hpbar', hp / S.life); setW('rb-shield', (f.shield || 0) / S.life);
  setT('rb-hp', `${fmt(hp)} / ${fmt(S.life)}${f.shield > 1 ? ' +' + fmt(f.shield) : ''}`);
  setT('rb-you', S.primary.name);
  const wrap = document.getElementById('rb-foebar-wrap');
  if (f.deadUntil > g.t) { setW('rb-foebar', 0); setT('rb-foe-n', 'Recovering'); setT('rb-foe', `${Math.ceil(f.deadUntil - g.t)}s`); wrap.className = 'bar foe'; }
  else if (!f.mon) { setW('rb-foebar', 0); setT('rb-foe-n', 'Next foe…'); setT('rb-foe', ''); }
  else {
    const m = f.mon;
    setW('rb-foebar', m.hp / m.max); setT('rb-foe-n', mdef(m.key).name); setT('rb-foe', `${fmt(Math.max(0, m.hp))} / ${fmt(m.max)}`);
    wrap.className = 'bar foe' + (m.burnUntil > g.t || m.bleedUntil > g.t ? ' burning' : '') + (m.chillUntil > g.t && m.chill ? ' chilled' : '') + (m.shockUntil > g.t ? ' shocked' : '');
  }
  setW('rb-xp', g.hero.xp / xpToNext(g.hero.level));
  const cds = document.getElementById('rb-cds'), sig = g.cast.map(c => c.k).join(',');
  if (cds.dataset.sig !== sig) { cds.dataset.sig = sig; cds.innerHTML = g.cast.map(c => `<span class="cd ${SPELLS[c.k].kind}"><i></i><b>${esc(SPELLS[c.k].name)}</b></span>`).join(''); cds.hidden = !g.cast.length; }
  const pips = cds.querySelectorAll('.cd i');
  g.cast.forEach((c, i) => { const ready = f.cd[c.k] || 0, cd = SPELLS[c.k].cd * (1 - S.cdr / 100), fr = ready <= g.t ? 1 : 1 - (ready - g.t) / cd; if (pips[i]) pips[i].style.width = Math.max(0, Math.min(1, fr)) * 100 + '%'; });
}
function renderNav() {
  const el = document.querySelector('#nav .wrap'); if (!el) return;
  const ups = tab === 'bag' ? 0 : countUpgrades();
  const dot = { bag: ups ? `<span class="badge num">${ups}↑</span>` : '', build: g.hero.points || (g.hero.level >= SPEC_LEVEL && g.hero.spec == null) ? '<span class="badge">•</span>' : '' };
  el.innerHTML = TABS.map(([k, n]) => `<button role="tab" aria-selected="${tab === k}" data-act="tab" data-tab="${k}">${n}${dot[k] || ''}</button>`).join('');
}
function countUpgrades() { let n = 0; for (const it of g.bag) { try { if (verdict(it).better) n++; } catch (e) {} } return n; }
function noticesHtml() {
  return (g.notices || []).filter(k => NOTICES[k]).slice(0, 2).map(k => {
    const [h, p, to] = NOTICES[k];
    return `<div class="notice"><div><b>${esc(h)}</b><p>${esc(p)}</p></div><div class="row">${to && to !== tab ? `<button class="btn small" data-act="notice-go" data-k="${k}" data-to="${to}">Show me</button>` : ''}<button class="btn small" data-act="notice-x" data-k="${k}">Got it</button></div></div>`;
  }).join('');
}
function renderPanel() {
  const p = document.getElementById('panel'); if (!p) return;
  if (passive) { p.innerHTML = `<div class="card"><h2>Running in another tab</h2><p class="sub">Godscar is already fighting in another tab or window. Only one place runs the fight at a time, so progress is never counted twice.</p><div><button class="btn primary" data-act="takeover">Play here instead</button></div></div>`; return; }
  const body = tab === 'fight' ? fightPanel() : tab === 'gear' ? gearPanel() : tab === 'bag' ? bagPanel() : tab === 'build' ? buildPanel() : forgePanel();
  p.innerHTML = noticesHtml() + body;
  if (tab === 'fight') renderLog(true);
}

// ---------- pieces ----------
const resChips = M => Object.entries(M.res || {}).map(([t, v]) => `<span class="chip t-${t}">${v > 0 ? '' : ''}${TYPE_NAMES[t]} ${v > 0 ? v + '% resist' : 'weak ' + (-v) + '%'}</span>`).join(' ') + (M.blighted ? ' <span class="chip t-holy">blighted</span>' : '') + (M.evade ? ` <span class="chip">evades ${M.evade}%</span>` : '') + (M.armor ? ' <span class="chip">armored</span>' : '');
const title = it => `<span class="nm c-${it.rarity}">${esc(it.name)}${it.plus ? ' +' + it.plus : ''}</span>`;
function tags(it) {
  const t = [`<span class="chip c-${it.rarity}">${RARITY_NAMES[it.rarity]}</span>`];
  if (it.enchant) t.push(`<span class="chip">${ENCHANTS[it.enchant[0]].name}</span>`);
  for (const a of it.augments || []) t.push(`<span class="chip c-legendary">${esc(AUGMENTS[a].name)}</span>`);
  if (it.set) t.push(`<span class="chip c-ascended">${esc(SETS[it.set].name)}</span>`);
  if (it.spell) t.push(`<span class="chip splc">${esc(SPELLS[it.spell].name)}</span>`);
  if (it.socket) t.push(`<span class="chip c-jewel">${it.jewel ? 'Jewel socketed' : 'Socket'}</span>`);
  return t.join(' ');
}
// Leads with what changes how a build plays; numbers come after.
function itemLines(it) {
  const m = scaleOf(g, it), L = [];
  if (it.enchant) L.push(`<li class="ench">${esc(ENCHANTS[it.enchant[0]].label(it.enchant[1]))}</li>`);
  for (const a of it.augments || []) L.push(`<li class="aug"><b>${esc(AUGMENTS[a].name)}</b> · ${esc(AUGMENTS[a].text)}</li>`);
  if (it.set) { const n = g.stats.sets[it.set] || 0, S = SETS[it.set]; L.push(`<li class="set"><b>${esc(S.name)}</b> (${n}/5 worn)<br><span class="${n >= 2 ? '' : 'off'}">2: ${esc(S.b2)}</span><br><span class="${n >= 4 ? '' : 'off'}">4: ${esc(S.b4)}</span></li>`); }
  if (it.spell) L.push(`<li class="spl">Grants <b>${esc(SPELLS[it.spell].name)}</b>: ${esc(SPELLS[it.spell].text)}</li>`);
  if (it.socket) L.push(`<li class="jw">${it.jewel ? `Socketed: Scarbound Jewel (${esc(CLASSES[it.jewel.cls].evo.name)}, potency ${it.jewel.pot.toFixed(2)})` : 'Empty Scarbound Jewel socket'}</li>`);
  if (it.slot === 'weapon') { const W = WEAPONS[it.base]; L.push(`<li class="base">${fmt(it.dmg * W.mult * m)} ${TYPE_NAMES[W.type]} damage · ${(1 / W.interval).toFixed(2)} attacks/s · ${W.hands === 2 ? 'two-handed' : 'one-handed'}</li>`); }
  if (it.slot === 'offhand') L.push(`<li class="base">${esc(OFFHANDS[it.base].text(OFFHANDS[it.base].base === 'reflect' ? it.ohv * m : it.ohv))}</li>`);
  if (it.def) L.push(`<li class="base">${fmt(it.def * m)} defense${it.life ? ' · ' + fmt(it.life * m) + ' life' : ''}</li>`);
  if (it.attr) L.push(`<li class="base">+${fmt(it.attr[1])} ${it.attr[0]}</li>`);
  for (const [k, v] of it.affixes) L.push(`<li>${esc(AFFIXES[k].label(AFFIXES[k].scales ? v * m : v))}</li>`);
  return `<ul class="affs">${L.join('')}</ul>`;
}

// ----- Fight -----
function fightPanel() {
  const cur = g.target, zone = uiZone || mdef(cur.key).zone, zones = ZONE_KEYS.filter(z => g.zones[z]), Z = ZONES[zone];
  const cards = MONSTER_KEYS.filter(k => MONSTERS[k].zone === zone).map(k => {
    const M = MONSTERS[k], un = g.unlocked[k], minL = Z.minLevel;
    const lv = k === cur.key ? cur.level : Math.max(minL, Math.min(uiLvl[k] || un, un));
    const kills = (g.kills || {})[k + ':' + un] || 0, sc = scout && scout.res[k + ':' + lv];
    return `<section class="mon ${k === cur.key ? 'on' : ''}">
      <div class="row"><span class="nm">${esc(M.name)}</span><span class="spacer"></span>
        <span class="stepper"><button data-act="lvl" data-k="${k}" data-d="-1" ${lv <= minL ? 'disabled' : ''} aria-label="Lower stage">−</button><span class="num">${lv}</span><button data-act="lvl" data-k="${k}" data-d="1" ${lv >= un ? 'disabled' : ''} aria-label="Higher stage">+</button></span></div>
      <p class="note">${esc(M.note)}</p>
      <div class="row">${resChips(M)} <span class="chip t-${M.dmgType}">hits with ${TYPE_NAMES[M.dmgType]}</span>${M.mat && g.asc.unlocked ? ` <span class="chip c-ascended">${MAT_NAMES[M.mat]}</span>` : ''}</div>
      ${sc ? `<div class="scout num"><div><b>${sc.kpm.toFixed(1)}</b>kills/min</div><div><b>${fmt(sc.xpm)}</b>XP/min</div><div><b>${fmt(sc.gpm)}</b>gold/min</div><div><b class="${sc.deaths ? 'c-bad' : ''}">${sc.deaths}</b>deaths/4m</div></div>` : ''}
      <div class="row"><span class="sub num">Unlocked to stage ${un} · next in ${Math.max(0, 30 - kills)} kills</span><span class="spacer"></span>
        ${k === cur.key ? '<span class="chip warn">Hunting</span>' : `<button class="btn small" data-act="hunt" data-k="${k}" data-l="${lv}">Hunt here</button>`}</div></section>`;
  }).join('');
  return `<div><h2>${esc(Z.name)}</h2><p class="sub">${esc(Z.text)} Target changes apply from the next foe; the fight never pauses.</p></div>
    ${zones.length > 1 ? `<div class="seg" role="tablist">${zones.map(z => `<button data-act="zone" data-z="${z}" aria-selected="${z === zone}">${esc(ZONES[z].name.replace('The ', ''))}</button>`).join('')}</div>` : ''}
    <div class="card"><h3>Session setup</h3>
      <div class="row"><label class="toggle"><input type="checkbox" id="autopush" data-act="autopush" ${g.autoPush ? 'checked' : ''}> Auto-push stages</label>
      <span class="spacer"></span><label class="sub" for="retries">On death</label>
      <select id="retries" data-act="retries">${[['0', 'Fail once, step back'], ['1', 'Retry once'], ['2', 'Retry twice']].map(([v, n]) => `<option value="${v}" ${String(g.pushRetries ?? 1) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <p class="sub" style="margin:0">Auto-push climbs after ${25} kills without dying. Set this up before you log off: offline time plays out this plan.</p></div>
    <div class="row"><button class="btn" data-act="scout">Scout this zone</button></div>
    <div class="mons">${cards}</div>
    ${!g.zones.hollow ? `<p class="sub">The Ashen Hollow opens when any Fallfields monster reaches stage ${HOLLOW_UNLOCK}.</p>` : ''}
    ${bossSection()}
    <h3>Combat log</h3><div class="log" id="log" aria-live="off"></div>`;
}
function bossSection() {
  const avail = BOSS_KEYS.filter(k => g.zones[BOSSES[k].zone]), lb = g.lastBoss;
  const rows = avail.map(k => {
    const B = BOSSES[k], un = g.bossUnlocked[k], lv = Math.max(B.minLevel, Math.min(bossLvl[k] || un, un));
    return `<section class="mon boss"><div class="row"><span class="nm">${esc(B.name)}</span><span class="spacer"></span>
      <span class="stepper"><button data-act="blvl" data-k="${k}" data-d="-2" ${lv <= B.minLevel ? 'disabled' : ''} aria-label="Lower level">−</button><span class="num">${lv}</span><button data-act="blvl" data-k="${k}" data-d="2" ${lv >= un ? 'disabled' : ''} aria-label="Higher level">+</button></span></div>
      <p class="note">${esc(B.note)}</p><div class="row">${resChips(B)}</div>
      <div class="row"><span class="sub">Guaranteed Rare or better${B.zone === 'hollow' ? ', essences, a chance at Ascended and Scarbound Jewels' : ''}.</span><span class="spacer"></span>
      <button class="btn small primary" data-act="boss" data-k="${k}" data-l="${lv}" ${g.sigils < 1 ? 'disabled' : ''}>Fight · 1 sigil</button></div></section>`;
  }).join('');
  let result = '';
  if (lb) {
    const r = lb.res, rw = lb.rewards;
    result = `<div class="card result ${r.win ? 'win' : 'loss'}"><b>${r.win ? 'Victory' : r.died ? 'Defeated' : 'Out of time'}</b> against ${esc(BOSSES[r.key].name)}, level ${r.level}, after ${Math.round(r.time)}s.${r.win ? '' : ` You dealt ${Math.round(r.pct * 100)}% of its life.`}
      ${rw ? `<div class="sub">${fmt(rw.gold)} gold · ${rw.shards} shards · ${fmt(rw.xp)} XP${Object.entries(rw.ess).map(([e, n]) => ` · ${n} ${MAT_NAMES[e]}`).join('')}${rw.jewel ? ' · <b class="c-jewel">a Scarbound Jewel</b>' : ''}${rw.opened ? ' · <b class="c-ascended">Ascension opened</b>' : ''}</div><div class="items">${rw.items.map(it => `<div class="item ${it.rarity}">${title(it)}<div class="row">${tags(it)}</div></div>`).join('')}</div>` : ''}
      <div><button class="btn small" data-act="bosslog">${showBossLog ? 'Hide' : 'Show'} fight log</button></div>
      ${showBossLog ? `<div class="log">${lb.lines.slice().reverse().map(l => `<div class="k-${esc(l.kind)}">${Math.round(l.t)}s · ${esc(l.text)}</div>`).join('') || '<div>No spells cast.</div>'}</div>` : ''}</div>`;
  }
  return `<div><h3>Bosses</h3><p class="sub num">${g.sigils}/${SIGIL_CAP} sigils · next in ${SIGIL_KILLS - (g.sigilProg || 0)} kills. A boss fights a snapshot of your build; your farming keeps going.</p></div>${result}<div class="mons">${rows}</div>`;
}
function renderLog(force) {
  const el = document.getElementById('log'); if (!el) return;
  const last = logBuf.length ? logBuf[logBuf.length - 1] : null, key = logBuf.length + ':' + (last ? last.t : 0);
  if (!force && el.dataset.k === key) return;
  el.dataset.k = key;
  el.innerHTML = logBuf.slice().reverse().slice(0, 40).map(l => `<div class="k-${esc(l.kind.replace(':', '-'))}">${esc(l.text)}</div>`).join('') || '<div>The first foe approaches.</div>';
}

// ----- Gear: an equipment profile, slot by slot -----
function gearPanel() {
  const C = CLASSES[g.hero.cls], S = g.stats;
  const tiles = EQUIP.map(k => {
    const it = g.equip[k];
    const lvl = ARMOR_SLOTS.includes(k) && g.asc.unlocked ? `<span class="asl num">A${g.asc.slots[k]}</span>` : '';
    return `<button class="tile ${it ? it.rarity : 'empty'} ${gearSel === k ? 'sel' : ''}" data-act="gsel" data-k="${k}" aria-pressed="${gearSel === k}">
      <span class="slotlabel">${SLOT_NAMES[k]}</span>${lvl}<span class="tn c-${it ? it.rarity : 'none'}">${it ? esc(it.name) + (it.plus ? ' +' + it.plus : '') : 'Empty'}</span>${it && (it.augments || []).length ? '<span class="tdot c-legendary">◆</span>' : ''}${it && it.jewel ? '<span class="tdot c-jewel">●</span>' : ''}</button>`;
  }).join('');
  const it = g.equip[gearSel];
  let detail = `<div class="card"><span class="slotlabel">${SLOT_NAMES[gearSel]}</span><p class="empty" style="margin:0">Empty. Equip something from your bag.</p></div>`;
  if (it) {
    const up = it.rarity === 'ascended' ? `<span class="sub">Ascended: scales with the ${SLOT_NAMES[it.slot]} slot level (item level ${effIlvl(g, it)}).</span>`
      : `<span class="sub num">${it.plus >= 10 ? 'Fully upgraded' : `Upgrade to +${it.plus + 1}: ${upgradeCost(it)} Scar Shards`}</span><span class="spacer"></span><button class="btn small" data-act="upgrade" data-id="${it.id}" ${it.plus >= 10 || g.mats.shards < upgradeCost(it) ? 'disabled' : ''}>Upgrade</button>`;
    detail = `<div class="card item ${it.rarity}"><div class="row"><span class="slotlabel">${SLOT_NAMES[gearSel]}</span><span class="spacer"></span><span class="meta num">ilvl ${effIlvl(g, it)}</span></div>${title(it)}<div class="row">${tags(it)}</div>${itemLines(it)}
      <div class="row">${up}</div>${gearSel !== 'weapon' ? `<div class="row"><button class="btn small" data-act="unequip" data-id="${it.id}">Unequip</button></div>` : ''}</div>`;
  }
  // Ascension
  let asc;
  if (!g.asc.unlocked) asc = `<div class="card"><h3>Ascension</h3><p class="sub" style="margin:0">Sealed. Defeat the Woundwarden in the Ashen Hollow to open it. Ascension levels each armor slot, and Ascended set pieces scale to it.</p></div>`;
  else {
    const rows = ARMOR_SLOTS.map(s => { const mat = ASC_MATS[s], c = ascCost(g.asc.slots[s]), have = g.mats[mat] || 0; const src = MONSTER_KEYS.find(k => MONSTERS[k].mat === mat);
      return `<div class="pas"><div><b>${SLOT_NAMES[s]}</b> <span class="num">A${g.asc.slots[s]}</span><span class="sub"> · ${have}/${c} ${MAT_NAMES[mat]} from ${esc(MONSTERS[src].name)}</span></div><button class="btn small" data-act="ascend" data-s="${s}" ${have < c ? 'disabled' : ''}>Ascend</button></div>`; }).join('');
    const sets = Object.entries(S.sets).map(([k, n]) => `<p class="sub" style="margin:0"><b class="c-ascended">${esc(SETS[k].name)}</b> ${n}/5 · ${n >= 2 ? esc(SETS[k].b2) : '2 pieces for the first bonus'}${n >= 4 ? ' ' + esc(SETS[k].b4) : ''}</p>`).join('');
    asc = `<div class="card"><h3>Ascension</h3><p class="sub" style="margin:0">Each level adds 2 item levels to Ascended pieces in that slot, now and for every piece you find later. Base item level ${g.asc.base}.</p>${rows}${sets}</div>`;
  }
  // Scarbound Jewel
  const belt = g.equip.belt, jw = belt && belt.jewel;
  const jewelList = g.jewels.map(j => `<div class="pas"><div><b class="c-jewel">Scarbound Jewel</b><span class="sub"> · ${esc(CLASSES[j.cls].evo.name)} · potency ${j.pot.toFixed(2)}</span></div><button class="btn small" data-act="socketJewel" data-id="${j.id}" ${belt && belt.socket && !jw ? '' : 'disabled'}>Socket</button></div>`).join('');
  const jewel = `<div class="card"><h3>Scarbound Jewel · ${esc(C.evo.name)}</h3><p class="sub" style="margin:0">${esc(C.evo.text)}</p>
    <p class="sub" style="margin:0">${S.evo ? `<b class="c-jewel">Active.</b> Your ${C.name} has become a ${esc(C.evo.name)}.` : belt && belt.socket ? 'Your belt has an empty socket.' : 'Needs a belt with a socket: super rare on Legendary and Ascended belts, or added at the Forge for a very high price.'}</p>
    ${jw ? `<div class="row"><button class="btn small" data-act="unsocketJewel">Remove Jewel · ${fmt(unsocketCost(g.hero.level))}g</button></div>` : ''}
    ${jewelList || '<p class="empty" style="margin:0">No Jewels yet. Bosses in the Ashen Hollow carry them.</p>'}</div>`;
  return `<div><h2>Equipment</h2><p class="sub">Tap a slot to inspect it.</p></div><div class="tiles">${tiles}</div>${detail}${asc}${jewel}`;
}

// ----- Bag -----
function bagPanel() {
  const opts = [['common', 'Keep everything'], ['uncommon', 'Keep Uncommon and better'], ['rare', 'Keep Rare and better']];
  const items = g.bag.slice().sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || b.ilvl - a.ilvl);
  const salv = g.bag.filter(i => !i.locked && RANK[i.rarity] < 4), salvGold = salv.reduce((s, i) => s + salvageValue(i), 0);
  const list = items.map(it => {
    const v = verdict(it), open = expanded === it.id, curKey = v.key, cur = g.equip[curKey];
    const ringBtns = it.slot === 'ring' ? `<button class="btn primary small" data-act="equip" data-id="${it.id}" data-to="ring1">Equip as ring 1</button><button class="btn primary small" data-act="equip" data-id="${it.id}" data-to="ring2">Equip as ring 2</button>`
      : `<button class="btn primary small" data-act="equip" data-id="${it.id}">Equip</button>`;
    const titan = it.slot === 'weapon' && g.stats.evo === 'warrior' && WEAPONS[it.base].hands === 2 && !WEAPONS[it.base].bow ? `<button class="btn small" data-act="equip" data-id="${it.id}" data-to="offhand">Equip in off-hand</button>` : '';
    return `<section class="item ${it.rarity}">
      <button class="head" data-act="expand" data-id="${it.id}" aria-expanded="${open}">${title(it)}<span class="meta num">${SLOT_NAMES[it.slot]} · ilvl ${effIlvl(g, it)}${it.locked ? ' · locked' : ''}</span></button>
      <div class="row">${tags(it)} ${v.html}</div>
      ${open ? `${itemLines(it)}<div class="cmp">${cur ? `Replaces ${title(cur)}${itemLines(cur)}` : 'Slot is empty.'}</div>
        <div class="row">${ringBtns}${titan}<button class="btn small" data-act="lock" data-id="${it.id}">${it.locked ? 'Unlock' : 'Lock'}</button><span class="spacer"></span>
          <button class="btn small" data-act="salvage" data-id="${it.id}" ${it.locked ? 'disabled' : ''}>Salvage · ${fmt(salvageValue(it))}g${salvageShards(it) ? ' · ' + salvageShards(it) + ' shards' : ''}</button></div>` : ''}</section>`;
  }).join('');
  return `<div><h2>Bag <span class="sub num">${g.bag.length}/${BAG_CAP}</span></h2><p class="sub">Each verdict simulates 4 minutes against your current target with that item equipped. Epic and better, spell items and socketed belts are always kept. Overflow is salvaged, never lost.</p></div>
    <div class="row"><label for="filter" class="sub">Loot filter</label><select id="filter" data-act="filter">${opts.map(([k, n]) => `<option value="${k}" ${g.filter === k ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="spacer"></span>
      ${confirm === 'salvall' ? `<button class="btn small primary" data-act="salvall-yes">Salvage ${salv.length} for ${fmt(salvGold)}g</button><button class="btn small" data-act="cancel">Cancel</button>` : `<button class="btn small" data-act="salvall" ${salv.length ? '' : 'disabled'}>Salvage below Legendary</button>`}</div>
    <div class="items">${list || '<p class="empty">Nothing yet. Drops land here while you fight.</p>'}</div>`;
}

// ----- Build -----
function buildPanel() {
  const S = g.stats, C = CLASSES[g.hero.cls], av = availableSpells(g);
  const offAv = av.filter(k => SPELLS[k].kind === 'off'), utilAv = av.filter(k => SPELLS[k].kind === 'util');
  const offRows = g.bar.off.map((k, i) => { const used = g.bar.off.filter((x, j) => x && j !== i);
    return `<div class="slot"><label class="slotlabel" for="off${i}">Offensive ${i + 1}</label><select id="off${i}" data-act="baroff" data-i="${i}"><option value="">Empty</option>${offAv.filter(x => !used.includes(x)).map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${esc(SPELLS[x].name)}</option>`).join('')}</select>${k ? `<p class="sub">${esc(SPELLS[k].text)} Every ${fmt(SPELLS[k].cd * (1 - S.cdr / 100), 1)}s.</p>` : ''}</div>`; }).join('');
  const utilRows = g.bar.util.map((u, i) => { const used = g.bar.util.filter((x, j) => x && j !== i).map(x => x.k);
    return `<div class="slot"><label class="slotlabel" for="util${i}">Utility ${i + 1}</label><div class="row"><select id="util${i}" data-act="barutil" data-i="${i}"><option value="">Empty</option>${utilAv.filter(x => !used.includes(x)).map(x => `<option value="${x}" ${u && x === u.k ? 'selected' : ''}>${esc(SPELLS[x].name)}</option>`).join('')}</select>
      ${u ? `<select id="cond${i}" data-act="barcond" data-i="${i}" aria-label="When to cast">${Object.entries(CONDS).map(([c, n]) => `<option value="${c}" ${u.cond === c ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}</div>${u ? `<p class="sub">${esc(SPELLS[u.k].text)} Cooldown ${fmt(SPELLS[u.k].cd * (1 - S.cdr / 100), 1)}s.</p>` : ''}</div>`; }).join('');
  const barNote = !av.length ? `<p class="sub">Your class spell, ${esc(SPELLS[C.spell].name)}, awakens at level ${CLASS_SPELL_LEVEL}. Rare items from the Ashen Hollow grant more.</p>` : '';
  let spec;
  if (g.hero.level < SPEC_LEVEL) spec = `<p class="sub">Unlocks at level ${SPEC_LEVEL}.</p>${C.specs.map(s => `<p class="sub" style="margin:0"><b>${esc(s.name)}</b> · ${esc(s.text)}</p>`).join('')}`;
  else if (g.hero.spec == null || confirm === 'respec') {
    const cost = g.hero.spec == null ? 0 : respecCost(g.hero.level);
    spec = `${cost ? `<p class="sub">Changing costs ${fmt(cost)} gold.</p>` : '<p class="sub">Your first choice is free.</p>'}<div class="specs">${C.specs.map((s, i) => `<button class="spec" data-act="spec" data-i="${i}" ${g.hero.spec === i || g.gold < cost ? 'disabled' : ''}><b>${esc(s.name)}</b><span>${esc(s.text)}</span></button>`).join('')}</div>${g.hero.spec != null ? '<button class="btn small" data-act="cancel">Keep current</button>' : ''}`;
  } else { const s = C.specs[g.hero.spec]; spec = `<p style="margin:0"><b>${esc(s.name)}</b> · <span class="sub">${esc(s.text)}</span></p><div><button class="btn small" data-act="respec">Change specialization</button></div>`; }
  const P = g.hero.passives || {}, spent = PASSIVE_KEYS.reduce((a, k) => a + (P[k] || 0), 0);
  const pas = PASSIVE_KEYS.map(k => `<div class="pas"><div><b>${PASSIVES[k].name}</b> <span class="num">${P[k] || 0}</span><span class="sub"> · ${PASSIVES[k].text} each</span></div><button class="btn small" data-act="pas" data-k="${k}" ${g.hero.points ? '' : 'disabled'} aria-label="Add a point to ${PASSIVES[k].name}">+</button></div>`).join('');
  const attrs = ATTRS.map(a => `<div class="pas"><div><b>${a}</b> <span class="num">${fmt(S.attr[a])}</span><span class="sub"> · ${ATTR_RULES[a]}</span></div></div>`).join('');
  const dmgRows = TYPES.filter(t => S.pre[t] > 0.01).map(t => `<dt><span class="t-${t}">${TYPE_NAMES[t]}</span></dt><dd>${fmt(S.pre[t] * S.typeMult[t])}</dd>`).join('');
  const resRows = ELEMS.map(t => `<dt><span class="t-${t}">${TYPE_NAMES[t]}</span> resistance</dt><dd>${fmt(S.res[t])}%</dd>`).join('');
  const rows = [['Life', fmt(S.life)], ['Armor', fmt(S.armor)], ['Life per second', fmt(S.regen, 1)], ['Attacks per second', (1 / S.interval).toFixed(2)],
    ['Critical chance', fmt(S.critChance) + '%'], ['Critical damage', fmt(S.critMulti) + '%'], ['Life on hit', fmt(S.lifeOnHit, 1)], ['Reflect', fmt(S.reflect)],
    ['Spell damage', '×' + S.spellMore.toFixed(2)], ['Burn and bleed', '×' + S.dotMore.toFixed(2)], ['Companion damage', '×' + S.companionMore.toFixed(2)],
    ['Spell cooldowns', '−' + fmt(S.cdr) + '%'], ['Dodge', fmt(S.dodge) + '%'], ['Double cast', fmt(S.doubleCast) + '%'], ['Gold found', '+' + fmt(S.goldFind) + '%']];
  const aug = Object.keys(S.aug);
  return `<div><h2>${S.evo ? esc(C.evo.name) : C.name}, level ${g.hero.level}</h2><p class="sub num">${fmt(g.hero.xp)} / ${fmt(xpToNext(g.hero.level))} XP · ${fmt(g.life.kills)} kills · ${fmt(g.life.deaths)} deaths · ${g.life.bosses || 0} bosses · ${dur(g.life.offlineSec || 0)} fought while away</p></div>
    <div class="card"><h3>Primary · never stops</h3><p style="margin:0"><b>${esc(C.primary.name)}</b> · <span class="sub">${esc(C.primary.text)}</span></p>
      ${S.evo ? `<p class="sub c-jewel" style="margin:0"><b>${esc(C.evo.name)}</b> · ${esc(C.evo.text)}</p>` : ''}
      ${aug.map(k => `<p class="sub pmline" style="margin:0"><b>${esc(AUGMENTS[k].name)}</b> · ${esc(AUGMENTS[k].text)}</p>`).join('') || '<p class="sub" style="margin:0">Legendary augments change how your build plays, not just its numbers.</p>'}</div>
    <div class="card"><h3>Autocast bar</h3>${barNote}${av.length ? offRows + utilRows : ''}</div>
    <div class="card"><h3>Specialization</h3>${spec}</div>
    <div class="card"><div class="row"><h3>Passives</h3><span class="spacer"></span><span class="sub num">${g.hero.points || 0} to spend</span>${spent ? '<button class="btn small" data-act="pasreset">Reset (free)</button>' : ''}</div>${pas}</div>
    <div class="card"><h3>Attributes</h3><p class="sub" style="margin:0">Any class can use any attribute.</p>${attrs}</div>
    <div class="card"><h3>Damage per primary hit</h3><dl class="stats bare num">${dmgRows}</dl><ul class="affs rules">${TYPES.filter(t => S.pre[t] > 0.01).map(t => `<li><b class="t-${t}">${TYPE_NAMES[t]}</b> · ${esc(TYPE_RULES[t])}</li>`).join('')}</ul></div>
    <dl class="stats num">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}${resRows}</dl>
    <div class="card"><h3>Save</h3><p class="sub" style="margin:0">Saved in this browser every few seconds. Cloud save: ${esc(cloud.status)}</p>
      <div class="row"><button class="btn small" data-act="export">Copy save code</button><button class="btn small" data-act="import">Load save code</button></div>
      <textarea id="savebox" aria-label="Save code" placeholder="Paste a save code here, then press Load save code."></textarea><p class="sub" id="savemsg" style="margin:0"></p></div>
    <div class="card"><h3>Start over</h3><p class="sub" style="margin:0">Deletes this character everywhere it is saved.</p>
      <div class="row">${confirm === 'reset' ? `<button class="btn small primary" data-act="reset-yes">Delete character</button><button class="btn small" data-act="cancel">Keep playing</button>` : `<button class="btn small" data-act="reset">Start over</button>`}</div></div>`;
}

// ----- Forge -----
function forgePanel() {
  const M = g.mats;
  const matCells = ['shards', ...TYPES].map(k => `<div><b class="${k === 'shards' ? '' : 't-' + k}">${M[k] || 0}</b>${k === 'shards' ? 'Shards' : TYPE_NAMES[k]}</div>`).join('') + `<div><b>${fmt(g.gold)}</b>Gold</div>`;
  const ascCells = g.asc.unlocked ? Object.values(ASC_MATS).map(k => `<div><b class="c-ascended">${M[k] || 0}</b>${MAT_NAMES[k]}</div>`).join('') : '';
  const maxL = Math.max(...MONSTER_KEYS.map(k => g.unlocked[k]));
  const cc = craftCost(craft.rarity, maxL);
  const bases = craft.slot === 'weapon' ? Object.keys(WEAPONS) : craft.slot === 'offhand' ? Object.keys(OFFHANDS) : [];
  const craftCard = `<div class="card"><h3>Craft</h3><p class="sub" style="margin:0">Make a new item at item level ${maxL}, Common to Legendary. Stats roll at random; Legendary rolls its augments.</p>
    <div class="row"><select id="craft-slot" data-act="craftset" data-f="slot" aria-label="Slot">${DROP_SLOTS.map(s => `<option value="${s}" ${craft.slot === s ? 'selected' : ''}>${SLOT_NAMES[s]}</option>`).join('')}</select>
    ${bases.length ? `<select id="craft-base" data-act="craftset" data-f="base" aria-label="Base"><option value="">Any base</option>${bases.map(b => `<option value="${b}" ${craft.base === b ? 'selected' : ''}>${esc((WEAPONS[b] || OFFHANDS[b]).name)}</option>`).join('')}</select>` : ''}
    <select id="craft-rar" data-act="craftset" data-f="rarity" aria-label="Rarity">${['common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => `<option value="${r}" ${craft.rarity === r ? 'selected' : ''}>${RARITY_NAMES[r]}</option>`).join('')}</select></div>
    <div class="row"><span class="sub num">${fmt(cc.gold)} gold${cc.shards ? ` · ${cc.shards} shards` : ''}${cc.essence ? ` · ${cc.essence} of every essence` : ''}</span><span class="spacer"></span><button class="btn small primary" data-act="craft">Craft</button></div></div>`;
  const equipped = EQUIP.map(k => g.equip[k]).filter(Boolean);
  const inscribe = equipped.filter(it => RANK[it.rarity] >= 2 && !it.spell).map(it => { const c = inscribeCost(it);
    return `<section class="item ${it.rarity}">${title(it)}<div class="row"><select id="ins-${it.id}" aria-label="Spell to inscribe">${FOUND_SPELLS.map(k => { const el = SPELLS[k].el; return `<option value="${k}" ${(M[el] || 0) < c.essence ? 'disabled' : ''}>${esc(SPELLS[k].name)} · ${c.essence} ${TYPE_NAMES[el]}</option>`; }).join('')}</select>
      <button class="btn small primary" data-act="inscribe" data-id="${it.id}" ${g.gold < c.gold ? 'disabled' : ''}>Inscribe · ${fmt(c.gold)}g</button></div></section>`; }).join('') || '<p class="empty">Equip a Rare or better item that doesn\'t already grant a spell.</p>';
  const reforge = equipped.filter(it => it.affixes.length).map(it => { const c = reforgeCost(it), m = scaleOf(g, it);
    return `<section class="item ${it.rarity}">${title(it)}<ul class="affs">${it.affixes.map(([k, v], i) => `<li class="frow"><span>${esc(AFFIXES[k].label(AFFIXES[k].scales ? v * m : v))}</span><button class="btn small" data-act="reforge" data-id="${it.id}" data-i="${i}" ${g.gold < c ? 'disabled' : ''}>Reforge · ${fmt(c)}g</button></li>`).join('')}</ul></section>`; }).join('') || '<p class="empty">Equip items with stats to reforge them.</p>';
  const belt = g.equip.belt;
  const sock = belt && !belt.socket ? (() => { const c = socketCost(belt); return `<div class="card"><h3>Add a Jewel socket</h3><p class="sub" style="margin:0">Very expensive. Only worth it on the right belt for your build.</p><div class="row">${title(belt)}<span class="spacer"></span><button class="btn small primary" data-act="addSocket" data-id="${belt.id}">Add socket · ${fmt(c.gold)}g + ${c.essence} of every essence</button></div></div>`; })() : '';
  return `<div><h2>The Forge</h2><p class="sub">Everything here happens while you keep fighting.</p></div>
    <div class="mats num">${matCells}${ascCells}</div>${craftCard}
    <div class="card"><h3>Inscribe a spell</h3><p class="sub" style="margin:0">Bind a spell of your choice to an equipped Rare or better item, using 3 essence of the spell's element.</p><div class="items">${inscribe}</div></div>
    ${sock}
    <div class="card"><h3>Reforge</h3><p class="sub" style="margin:0">Replace one stat with a new random stat for that slot.</p><div class="items">${reforge}</div></div>`;
}

function renderOverlay() {
  const el = document.getElementById('overlay'); if (!el) return;
  if (!summary) { el.innerHTML = ''; return; }
  const o = summary.out;
  const mats = Object.entries(o.mats).map(([k, n]) => `<div><b>${n}</b>${esc(MAT_NAMES[k] || k)}</div>`).join('');
  el.innerHTML = `<div class="overlay" data-act="close-sum"><div class="sheet" role="dialog" aria-label="While you were away">
    <h2>While you were away</h2>
    <p class="sub" style="margin:0">Your ${CLASSES[g.hero.cls].name.toLowerCase()} fought for ${dur(summary.elapsed)}${summary.capped ? ` (the 24 hour cap kept ${dur(summary.capped)} out)` : ''}. Highest stage held: ${g.target.level}.</p>
    <div class="sumgrid num"><div><b>${fmt(o.kills)}</b>kills</div><div><b>${fmt(o.xp)}</b>XP${summary.lvl1 > summary.lvl0 ? ` · Lv ${summary.lvl0}→${summary.lvl1}` : ''}</div><div><b>${fmt(o.gold)}</b>gold</div>
      <div><b>${o.items}</b>items kept</div><div><b>${o.salvaged}</b>salvaged</div><div><b class="${o.deaths ? 'c-bad' : ''}">${o.deaths}</b>deaths</div>${mats}${o.sigils ? `<div><b>${o.sigils}</b>sigils</div>` : ''}${o.jewels ? `<div><b class="c-jewel">${o.jewels}</b>Jewels</div>` : ''}</div>
    ${o.notable.length ? `<h3>Notable drops</h3><div class="items">${o.notable.slice(-6).reverse().map(it => `<div class="item ${it.rarity}">${title(it)}<div class="row">${tags(it)}</div></div>`).join('')}</div>` : ''}
    <button class="btn primary" data-act="close-sum">Back to it</button></div></div>`;
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
  if (a === 'notice-x') { dispatch({ type: 'dismiss', key: b.dataset.k }); return; }
  if (a === 'notice-go') { tab = b.dataset.to; dispatch({ type: 'dismiss', key: b.dataset.k }); window.scrollTo(0, 0); return; }
  if (a === 'zone') { uiZone = b.dataset.z; scout = null; renderPanel(); return; }
  if (a === 'lvl') {
    const k = b.dataset.k, d = +b.dataset.d;
    if (k === g.target.key) dispatch({ type: 'target', key: k, level: g.target.level + d });
    else { const minL = ZONES[MONSTERS[k].zone].minLevel; uiLvl[k] = Math.max(minL, Math.min(g.unlocked[k], (uiLvl[k] || g.unlocked[k]) + d)); renderPanel(); }
    return;
  }
  if (a === 'hunt') { if (!dispatch({ type: 'target', key: b.dataset.k, level: +b.dataset.l })) log(`Now hunting ${MONSTERS[b.dataset.k].name}, stage ${b.dataset.l}.`, 'sys'); return; }
  if (a === 'scout') {
    const zone = uiZone || mdef(g.target.key).zone, res = {};
    for (const k of MONSTER_KEYS.filter(k => MONSTERS[k].zone === zone)) { const minL = ZONES[zone].minLevel; const lv = k === g.target.key ? g.target.level : Math.max(minL, Math.min(uiLvl[k] || g.unlocked[k], g.unlocked[k])); res[k + ':' + lv] = project(g, { target: { key: k, level: lv }, secs: 240 }); }
    scout = { res }; renderPanel(); return;
  }
  if (a === 'blvl') { const k = b.dataset.k, B = BOSSES[k]; bossLvl[k] = Math.max(B.minLevel, Math.min(g.bossUnlocked[k], (bossLvl[k] || g.bossUnlocked[k]) + +b.dataset.d)); renderPanel(); return; }
  if (a === 'boss') {
    const k = b.dataset.k, l = +b.dataset.l;
    if (!dispatch({ type: 'boss', key: k, level: l })) { showBossLog = false; const r = g.lastBoss.res; log(r.win ? `Defeated ${BOSSES[k].name} (level ${l}).` : `${BOSSES[k].name} (level ${l}) held. You dealt ${Math.round(r.pct * 100)}% of its life.`, r.win ? 'level' : 'death'); if (r.win) bossLvl[k] = g.bossUnlocked[k]; renderPanel(); }
    return;
  }
  if (a === 'bosslog') { showBossLog = !showBossLog; renderPanel(); return; }
  if (a === 'gsel') { gearSel = b.dataset.k; renderPanel(); return; }
  if (a === 'expand') { expanded = expanded === b.dataset.id ? null : b.dataset.id; renderPanel(); return; }
  if (a === 'equip') { if (!dispatch({ type: 'equip', id: b.dataset.id, to: b.dataset.to })) expanded = null; return; }
  if (a === 'unequip' || a === 'lock' || a === 'salvage' || a === 'upgrade' || a === 'socketJewel' || a === 'addSocket') { dispatch({ type: a, id: b.dataset.id }); return; }
  if (a === 'unsocketJewel') { dispatch({ type: 'unsocketJewel' }); return; }
  if (a === 'ascend') { dispatch({ type: 'ascend', slot: b.dataset.s }); return; }
  if (a === 'salvall') { confirm = 'salvall'; renderPanel(); return; }
  if (a === 'salvall-yes') { confirm = null; dispatch({ type: 'salvageAll' }); return; }
  if (a === 'cancel') { confirm = null; renderPanel(); return; }
  if (a === 'spec') { if (!dispatch({ type: 'spec', i: +b.dataset.i })) { confirm = null; dispatch({ type: 'dismiss', key: 'spec' }); } return; }
  if (a === 'respec') { confirm = 'respec'; renderPanel(); return; }
  if (a === 'pas') { dispatch({ type: 'passive', k: b.dataset.k }); return; }
  if (a === 'pasreset') { dispatch({ type: 'passiveReset' }); return; }
  if (a === 'reforge') { dispatch({ type: 'reforge', id: b.dataset.id, i: +b.dataset.i }); return; }
  if (a === 'inscribe') { const sel = document.getElementById('ins-' + b.dataset.id); dispatch({ type: 'inscribe', id: b.dataset.id, spell: sel && sel.value }); return; }
  if (a === 'craft') { const maxL = Math.max(...MONSTER_KEYS.map(k => g.unlocked[k])); if (!dispatch({ type: 'craft', slot: craft.slot, rarity: craft.rarity, base: craft.base || undefined, ilvl: maxL })) showToast('Crafted. It\'s in your bag.'); return; }
  if (a === 'export') {
    const box = document.getElementById('savebox'), code = btoa(unescape(encodeURIComponent(serialize()))), msg = document.getElementById('savemsg');
    box.value = code; box.select();
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => { msg.textContent = 'Copied. Keep it somewhere safe.'; }, () => { msg.textContent = 'Selected. Copy it from the box.'; });
    return;
  }
  if (a === 'import') {
    const box = document.getElementById('savebox'), msg = document.getElementById('savemsg');
    try { g = hydrate(decodeURIComponent(escape(atob(box.value.trim())))); sess = newSess(); logBuf = []; proj.clear(); scout = null; resume(true); cloudSave(true); document.getElementById('savemsg').textContent = 'Save loaded.'; }
    catch (err) { msg.textContent = 'That code isn\'t a Godscar save. Copy the whole code and try again.'; }
    return;
  }
  if (a === 'reset') { confirm = 'reset'; renderPanel(); return; }
  if (a === 'reset-yes') { confirm = null; g = null; lsDel(LS_KEY); lastSaveJson = ''; uiZone = null; if (cloud.db && cloud.uid) cloud.db.doc(`data/users/${cloud.uid}/save`).delete().catch(() => {}); summary = null; render(); return; }
});
document.addEventListener('change', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, i = +b.dataset.i;
  if (a === 'filter') dispatch({ type: 'filter', rarity: b.value });
  if (a === 'autopush') dispatch({ type: 'autoPush', on: b.checked });
  if (a === 'retries') dispatch({ type: 'pushRetries', n: +b.value });
  if (a === 'baroff') dispatch({ type: 'barOff', i, k: b.value || null });
  if (a === 'barutil') dispatch({ type: 'barUtil', i, k: b.value || null });
  if (a === 'barcond') dispatch({ type: 'barCond', i, cond: b.value });
  if (a === 'craftset') { craft[b.dataset.f] = b.value; if (b.dataset.f === 'slot') craft.base = ''; renderPanel(); }
});

// ---------- cloud save ----------
async function cloudInit() {
  try {
    if (!window.claude || !window.claude.use) { cloud.status = 'not available here.'; return; }
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const uid = user ? await user.id() : null;
    if (!db || !uid) { cloud.status = 'sign in to claude.ai to sync across devices.'; refreshBuild(); return; }
    cloud.db = db; cloud.uid = uid;
    const snap = await Promise.race([db.doc(`data/users/${uid}/save`).get(), new Promise(r => setTimeout(() => r('timeout'), 10000))]);
    if (snap === 'timeout') { cloud.status = 'can\'t reach the cloud right now; saving locally.'; refreshBuild(); return; }
    if (snap.exists) {
      const d = snap.data();
      if (d && d.save && (!g || d.t > g.t + 5)) {
        try { const had = !!g; g = hydrate(d.save); sess = sess || newSess(); proj.clear(); scout = null; if (!had) app.innerHTML = ''; log('Loaded your cloud save.', 'sys'); lsSet(LOCK_KEY, JSON.stringify({ id: TAB_ID, ts: Date.now() })); resume(true); } catch (e) {}
      }
      cloud.savedT = d ? d.t : 0;
    }
    cloud.status = 'on.'; refreshBuild(); if (g) cloudSave(true);
  } catch (e) { cloud.status = 'unavailable; saving locally.'; refreshBuild(); }
}
async function cloudSave(force) {
  if (!cloud.db || !g || passive || cloud.busy) return;
  if (!force && g.t - cloud.savedT < 60) return;
  cloud.busy = true;
  try { const t = g.t; await cloud.db.doc(`data/users/${cloud.uid}/save`).set({ t, save: serialize() }); cloud.savedT = t; cloud.status = 'on, last synced ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.'; }
  catch (e) { cloud.status = e && e.code === 'quota_exceeded' ? 'cloud storage is full; saving locally.' : 'last sync failed; will retry.'; }
  cloud.busy = false; refreshBuild();
}
function refreshBuild() { const ae = document.activeElement; if (g && tab === 'build' && !confirm && !(ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT'))) renderPanel(); }

// ---------- boot ----------
function boot(hotData) {
  sess = newSess();
  const s = hotData && hotData.save ? hotData.save : null, local = lsGet(LS_KEY);
  let a = null, b = null;
  try { a = s ? hydrate(s) : null; } catch (e) {}
  try { b = local ? hydrate(local) : null; } catch (e) {}
  g = a && b ? (a.t >= b.t ? a : b) : (a || b);
  if (hotData && hotData.tab && TABS.some(t => t[0] === hotData.tab)) tab = hotData.tab;
  if (g) log('Welcome back to the Fallfields.', 'sys');
  heartbeat();
  if (g && !passive) resume(true); else render();
  setInterval(tick, 250); setInterval(heartbeat, 1000);
  setInterval(() => { saveLocal(); cloudSave(false); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); cloudSave(true); } else { heartbeat(); if (!passive) resume(true); } });
  window.addEventListener('pagehide', saveLocal);
  setTimeout(cloudInit, 0);
}
try { window.claude?.hot?.snapshot?.(() => ({ save: g && !passive ? serialize() : null, tab })); } catch (e) {}
if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
})();
