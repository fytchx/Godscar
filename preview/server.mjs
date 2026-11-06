import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const gameHtml = readFileSync(join(process.cwd(), 'web', 'dist', 'index.html'));
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
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
});
server.listen(port, '0.0.0.0', () => {
  console.log('Godscar browser preview listening on port ' + port);
});
