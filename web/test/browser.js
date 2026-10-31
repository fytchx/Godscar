const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const body = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
  const page_html = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + body + '</body></html>';
  const http = require('http');
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page_html); }).listen(8765);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 384, height: 832 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://localhost:8765/');
  await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/shots/0start.png' });
  await p.click('[data-cls="hunter"]');
  await p.waitForTimeout(6000);
  await p.screenshot({ path: __dirname + '/shots/1fight.png', fullPage: true });
  // simulate 24h+ offline: close the page, rewind the save before the next load runs
  await p.close();
  const rewind = () => { if (sessionStorage.getItem('rw')) return; sessionStorage.setItem('rw','1'); const s = JSON.parse(localStorage.getItem('godscar.save.v1')); const d = 26 * 3600; s.t -= d; s.fight.pNext -= d; s.fight.skillNext -= d; s.fight.pulseNext -= d; s.fight.respawnAt -= d; s.fight.deadUntil = 0; if (s.fight.mon) { s.fight.mon.next -= d; s.fight.mon.burnUntil -= d; s.fight.mon.bleedUntil -= d; } for (const k in (s.fight.cd||{})) s.fight.cd[k] -= d; for (const k in (s.fight.buffs||{})) s.fight.buffs[k] -= d; localStorage.setItem('godscar.save.v1', JSON.stringify(s)); localStorage.removeItem('godscar.lock'); };
  const pp = await ctx.newPage(); pp.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await pp.addInitScript(rewind);
  const t0 = Date.now();
  await pp.goto('http://localhost:8765/');
  await pp.waitForSelector('.sheet', { timeout: 30000 });
  console.log('reload+24h catchup ms', Date.now() - t0);
  await pp.screenshot({ path: __dirname + '/shots/2summary.png' });
  await pp.click('.sheet button[data-act="close-sum"]');
  await pp.click('[data-act="scout"]');
  await pp.waitForTimeout(300);
  await pp.screenshot({ path: __dirname + '/shots/3scout.png', fullPage: true });
  await pp.click('[data-tab="bag"]'); await pp.waitForTimeout(300);
  const first = await pp.$('.item .head'); if (first) await first.click();
  await pp.waitForTimeout(300);
  await pp.screenshot({ path: __dirname + '/shots/4bag.png', fullPage: true });
  const eq = await pp.$('[data-act="equip"]'); if (eq) await eq.click();
  await pp.click('[data-tab="gear"]'); await pp.waitForTimeout(300);
  await pp.screenshot({ path: __dirname + '/shots/5gear.png', fullPage: true });
  await pp.click('[data-tab="build"]'); await pp.waitForTimeout(300);
  const sp = await pp.$('[data-act="spec"]'); if (sp) { await sp.click(); await pp.waitForTimeout(200); }
  for (let i = 0; i < 3; i++) { const pb = await pp.$('[data-act="pas"]:not([disabled])'); if (pb) await pb.click(); }
  await pp.waitForTimeout(300);
  await pp.screenshot({ path: __dirname + '/shots/6build.png', fullPage: true });
  await pp.click('[data-tab="forge"]'); await pp.waitForTimeout(300);
  await pp.screenshot({ path: __dirname + '/shots/7forge.png', fullPage: true });
  await pp.click('[data-tab="fight"]'); await pp.waitForTimeout(300);
  const bb = await pp.$('[data-act="boss"]:not([disabled])'); if (bb) { await bb.click(); await pp.waitForTimeout(400); }
  await pp.screenshot({ path: __dirname + '/shots/8boss.png', fullPage: true });
  console.log('state', await pp.evaluate(() => { const s = JSON.parse(localStorage.getItem('godscar.save.v1')); return JSON.stringify({ lvl: s.hero.level, spec: s.hero.spec, bar: s.bar, hollow: s.zones.hollow, sigils: s.sigils, mats: s.mats, life: s.life }); }));
  // second tab should go passive
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push('P2 ' + e.message));
  await p2.goto('http://localhost:8765/'); await p2.waitForTimeout(2500);
  console.log('tab2 passive text:', (await p2.textContent('#panel')).slice(0, 40));
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log('horizontal overflow', overflow, 'errors', JSON.stringify(errs));
  await b.close(); srv.close();
})();
