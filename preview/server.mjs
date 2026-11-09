import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const gameHtml = readFileSync(join(process.cwd(), 'web', 'dist', 'index.html'));
// Explicit allowlist: this new lab cannot escape its own directory.
const labDirectory = join(process.cwd(), 'lab', 'arsenal');
const labAssets = Object.freeze({
  '/lab/arsenal/': ['index.html', 'text/html; charset=utf-8'],
  '/lab/arsenal/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/lab/arsenal/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/lab/arsenal/catalog.mjs': ['catalog.mjs', 'text/javascript; charset=utf-8'],
  '/lab/arsenal/engine.mjs': ['engine.mjs', 'text/javascript; charset=utf-8'],
  '/lab/arsenal/ui.mjs': ['ui.mjs', 'text/javascript; charset=utf-8'],
  '/lab/arsenal/art.mjs': ['art.mjs', 'text/javascript; charset=utf-8']
});

const combatDirectory = join(process.cwd(), 'lab', 'combat');
const combatAssets = Object.freeze({
  '/lab/combat/': ['index.html', 'text/html; charset=utf-8'],
  '/lab/combat/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/lab/combat/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/lab/combat/main.mjs': ['main.mjs', 'text/javascript; charset=utf-8'],
  '/lab/combat/character.mjs': ['character.mjs', 'text/javascript; charset=utf-8'],
  '/lab/combat/gear-atlas.png': ['gear-atlas.png', 'image/png']
});

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
  if (url.pathname === '/lab') {
    res.writeHead(302, { location: '/lab/combat/' }).end();
    return;
  }
  if (Object.hasOwn(labAssets, url.pathname)) {
    const [fileName, contentType] = labAssets[url.pathname];
    const content = readFileSync(join(labDirectory, fileName));
    res.writeHead(200, { ...responseHeaders, 'content-type': contentType })
       .end(req.method === 'HEAD' ? undefined : content);
    return;
  }
  if (Object.hasOwn(combatAssets, url.pathname)) {
    const [fileName, contentType] = combatAssets[url.pathname];
    const content = readFileSync(join(combatDirectory, fileName));
    res.writeHead(200, { ...responseHeaders, 'content-type': contentType })
       .end(req.method === 'HEAD' ? undefined : content);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
});
server.listen(port, '0.0.0.0', () => {
  console.log('Godscar browser preview listening on port ' + port);
});
