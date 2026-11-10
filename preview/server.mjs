import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const combatDirectory = join(process.cwd(), 'lab', 'combat');
const gameHtml = readFileSync(join(combatDirectory, 'index.html'));
const combatAssets = Object.freeze({
  '/lab/combat/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/lab/combat/main.mjs': ['main.mjs', 'text/javascript; charset=utf-8'],
  '/lab/combat/character.mjs': ['character.mjs', 'text/javascript; charset=utf-8'],
  '/lab/combat/character.html': ['character.html', 'text/html; charset=utf-8']
});
const characterAssetFiles = new Set([
  'amulet.png', 'armor_rare.png', 'belt.png', 'boots.png', 'chest.png', 'gloves.png',
  'health.png', 'helmet.png', 'leggings.png', 'offhand.png', 'pauldrons.png', 'ring1.png',
  'ring2.png', 'role_melee.png', 'tab_crafting.png', 'tab_equipment.png', 'tab_inventory.png',
  'tab_materials.png', 'weapon.png', 'weapon_epic.png', 'weapon_rare.png'
]);

const port = Number.parseInt(process.env.PORT || '3000', 10);
const responseHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'content-security-policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'none'"
};
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' }).end('Method not allowed');
    return;
  }
  if (url.pathname === '/health') {
    const data = JSON.stringify({ status: 'ok', project: 'Godscar', mode: 'browser-preview', serverAuthoritative: false });
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
       .end(req.method === 'HEAD' ? undefined : data);
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, responseHeaders).end(req.method === 'HEAD' ? undefined : gameHtml);
    return;
  }
  if (url.pathname === '/lab' || url.pathname === '/lab/' ||
      url.pathname === '/lab/combat' || url.pathname === '/lab/combat/' ||
      url.pathname === '/lab/combat/index.html' ||
      url.pathname === '/lab/arsenal' || url.pathname.startsWith('/lab/arsenal/')) {
    res.writeHead(302, { location: '/' }).end();
    return;
  }
  if (Object.hasOwn(combatAssets, url.pathname)) {
    const [fileName, contentType] = combatAssets[url.pathname];
    const content = readFileSync(join(combatDirectory, fileName));
    const characterHeaders = fileName === 'character.html' ? {
      'content-security-policy': "frame-ancestors 'self'; object-src 'none'; base-uri 'none'",
      'x-frame-options': 'SAMEORIGIN'
    } : {};
    res.writeHead(200, { ...responseHeaders, ...characterHeaders, 'content-type': contentType })
       .end(req.method === 'HEAD' ? undefined : content);
    return;
  }
  const assetPrefix = '/lab/combat/character-assets/';
  if (url.pathname.startsWith(assetPrefix)) {
    const assetName = url.pathname.slice(assetPrefix.length);
    if (!characterAssetFiles.has(assetName)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const content = readFileSync(join(combatDirectory, 'character-assets', assetName));
    res.writeHead(200, { ...responseHeaders, 'content-type': 'image/png' })
       .end(req.method === 'HEAD' ? undefined : content);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
});
server.listen(port, '0.0.0.0', () => {
  console.log('Godscar current combat/Character preview listening on port ' + port);
});
