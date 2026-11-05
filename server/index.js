'use strict';

const http = require('node:http');
const { readFile } = require('node:fs/promises');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const path = require('node:path');
const { Pool } = require('pg');
const Sim = require('../web/src/sim.js');

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = process.env.PUBLIC_BASE_URL;
const PROD = process.env.NODE_ENV === 'production';
const LOGIN_TTL_MIN = 15;
const SESSION_DAYS = 30;
const BODY_LIMIT = 64 * 1024;
const pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined });
const loginAttempts = new Map();

const hash = value => createHash('sha256').update(value).digest('hex');
const nowSeconds = () => Math.floor(Date.now() / 1000);

function send(res, status, value, headers = {}) {
  const body = value === null ? '' : JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
  res.end(body);
}

function sendHtml(res, status, html, headers = {}) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", ...headers });
  res.end(html);
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const at = part.indexOf('=');
    return at < 0 ? [part, ''] : [part.slice(0, at), decodeURIComponent(part.slice(at + 1))];
  }));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function setSessionCookie(token) {
  const flags = ['HttpOnly', 'Path=/', 'SameSite=Lax', `Max-Age=${SESSION_DAYS * 86400}`];
  if (PROD) flags.push('Secure');
  return `godscar_session=${encodeURIComponent(token)}; ${flags.join('; ')}`;
}

async function userForRequest(req) {
  const token = parseCookies(req.headers.cookie).godscar_session;
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`, [hash(token)]
  );
  return result.rows[0] || null;
}

function allowLoginRequest(req) {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const old = loginAttempts.get(key);
  if (!old || old.until <= now) { loginAttempts.set(key, { count: 1, until: now + 15 * 60_000 }); return true; }
  if (old.count >= 10) return false;
  old.count++;
  return true;
}

async function withCharacter(userId, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT id, state, version FROM characters WHERE user_id = $1 FOR UPDATE', [userId]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    const row = result.rows[0];
    const output = await work(client, row);
    await client.query('COMMIT');
    return output;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, simVersion: Sim.SIM_VERSION });

  if (req.method === 'POST' && url.pathname === '/auth/request-link') {
    if (!allowLoginRequest(req)) return send(res, 429, { error: 'Try again later.' }, { 'retry-after': '900' });
    const body = await readJson(req);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'Enter a valid email address.' });
    if (!BASE_URL) return send(res, 503, { error: 'Sign-in links are not configured.' });
    if (PROD) return send(res, 503, { error: 'Email delivery is not configured.' });

    const rawToken = randomBytes(32).toString('base64url');
    await pool.query('INSERT INTO login_tokens(token_hash, email, expires_at) VALUES ($1, $2, now() + interval \'15 minutes\')', [hash(rawToken), email]);
    const link = new URL('/auth/verify', BASE_URL);
    link.searchParams.set('token', rawToken);
    // Development-only until an email provider is configured. Never log in production.
    console.info(`[dev magic link] ${link.toString()}`);
    return send(res, 202, { ok: true, message: 'If the address is valid, a sign-in link is on its way.' });
  }

  if (req.method === 'GET' && url.pathname === '/auth/verify') {
    const token = url.searchParams.get('token') || '';
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return send(res, 400, { error: 'This sign-in link is invalid or expired.' });
    return sendHtml(res, 200, `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in to Godscar</title><main style="font:16px system-ui;max-width:28rem;margin:15vh auto;padding:1.5rem;background:#1c181c;color:#e8e1da;border:1px solid #3a3239;border-radius:12px"><h1>Sign in to Godscar</h1><p>Confirm to finish signing in. This link expires in 15 minutes.</p><form method="post" action="/auth/verify"><input type="hidden" name="token" value="${token}"><button style="padding:.8rem 1.2rem;background:#bc2238;color:white;border:0;border-radius:8px;font:inherit">Continue</button></form></main>`);
  }

  if (req.method === 'POST' && url.pathname === '/auth/verify') {
    const contentType = req.headers['content-type'] || '';
    let token = '';
    if (contentType.startsWith('application/x-www-form-urlencoded')) {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > BODY_LIMIT) return send(res, 413, { error: 'Request body is too large.' }); chunks.push(chunk); }
      token = new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('token') || '';
    } else {
      const body = await readJson(req);
      token = typeof body.token === 'string' ? body.token : '';
    }
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return send(res, 400, { error: 'This sign-in link is invalid or expired.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(
        `SELECT email FROM login_tokens WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now() FOR UPDATE`, [hash(token)]
      );
      if (!found.rows[0]) { await client.query('ROLLBACK'); return send(res, 400, { error: 'This sign-in link is invalid or expired.' }); }
      const email = found.rows[0].email;
      const userResult = await client.query(
        `INSERT INTO users(id, email) VALUES ($1, $2) ON CONFLICT(email) DO UPDATE SET email = EXCLUDED.email RETURNING id, email`,
        [randomUUID(), email]
      );
      await client.query('UPDATE login_tokens SET consumed_at = now() WHERE token_hash = $1', [hash(token)]);
      const sessionToken = randomBytes(32).toString('base64url');
      await client.query('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval \'30 days\')', [hash(sessionToken), userResult.rows[0].id]);
      await client.query('COMMIT');
      return sendHtml(res, 200, `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Signed in to Godscar</title><main style="font:16px system-ui;max-width:28rem;margin:15vh auto;padding:1.5rem;background:#1c181c;color:#e8e1da;border:1px solid #3a3239;border-radius:12px"><h1>You're signed in</h1><p>You can return to Godscar.</p></main>`, { 'set-cookie': setSessionCookie(sessionToken) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }

  if (req.method === 'POST' && url.pathname === '/auth/logout') {
    if (!sameOrigin(req)) return send(res, 403, { error: 'Request origin is not allowed.' });
    const token = parseCookies(req.headers.cookie).godscar_session;
    if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hash(token)]);
    return send(res, 200, { ok: true }, { 'set-cookie': 'godscar_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0' });
  }

  if (req.method === 'GET' && url.pathname === '/api/me') {
    const user = await userForRequest(req);
    if (!user) return send(res, 401, { error: 'Sign in required.' });
    return send(res, 200, { user: { email: user.email } });
  }

  const user = await userForRequest(req);
  if (!user) return send(res, 401, { error: 'Sign in required.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Request origin is not allowed.' });

  if (req.method === 'POST' && url.pathname === '/api/character') {
    const body = await readJson(req);
    if (!Sim.CLASS_KEYS.includes(body.class)) return send(res, 400, { error: 'Choose a valid class.' });
    const id = randomUUID();
    const state = Sim.newGame(body.class, nowSeconds(), randomBytes(4).readUInt32BE(0));
    const result = await pool.query(
      `INSERT INTO characters(id, user_id, state) VALUES ($1, $2, $3)
       ON CONFLICT(user_id) DO NOTHING RETURNING id, state, version`, [id, user.id, state]
    );
    if (!result.rows[0]) return send(res, 409, { error: 'A character already exists.', ...(await getCharacter(user.id)) });
    return send(res, 201, { id: result.rows[0].id, version: Number(result.rows[0].version), simVersion: Sim.SIM_VERSION, state: result.rows[0].state });
  }

  if (req.method === 'GET' && url.pathname === '/api/character') {
    const result = await withCharacter(user.id, async (client, row) => {
      const state = row.state;
      const now = nowSeconds();
      const caught = Sim.catchUp(state, now, null);
      const version = Number(row.version) + (caught.elapsed > 0 ? 1 : 0);
      if (caught.elapsed > 0) await client.query('UPDATE characters SET state = $1, version = $2, updated_at = now() WHERE id = $3', [state, version, row.id]);
      return { id: row.id, version, simVersion: Sim.SIM_VERSION, state };
    });
    return result ? send(res, 200, result) : send(res, 404, { error: 'Character not found.' });
  }

  if (req.method === 'POST' && url.pathname === '/api/action') {
    const body = await readJson(req);
    if (body.simVersion !== Sim.SIM_VERSION) return send(res, 409, { error: 'Game version changed. Reload before continuing.', simVersion: Sim.SIM_VERSION });
    const result = await withCharacter(user.id, async (client, row) => {
      const state = row.state;
      Sim.catchUp(state, nowSeconds(), null);
      const error = Sim.doAction(state, body.action);
      const version = Number(row.version) + 1;
      await client.query('UPDATE characters SET state = $1, version = $2, updated_at = now() WHERE id = $3', [state, version, row.id]);
      return { id: row.id, version, simVersion: Sim.SIM_VERSION, state, error: error || null };
    });
    if (!result) return send(res, 404, { error: 'Character not found.' });
    return send(res, result.error ? 422 : 200, result);
  }

  return send(res, 404, { error: 'Not found.' });
}

async function start() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!BASE_URL) throw new Error('PUBLIC_BASE_URL is required.');
  if (PROD) throw new Error('Production startup is disabled until email delivery is configured.');
  const schema = await readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  const server = http.createServer((req, res) => {
    route(req, res).catch(error => {
      console.error(error);
      if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'Server error.' });
      else res.destroy();
    });
  });
  server.listen(PORT, '0.0.0.0', () => console.log(`Godscar API listening on ${PORT} (development login links only)`));
}

async function getCharacter(userId) {
  const result = await pool.query('SELECT id, state, version FROM characters WHERE user_id = $1', [userId]);
  const row = result.rows[0];
  return row ? { id: row.id, state: row.state, version: Number(row.version), simVersion: Sim.SIM_VERSION } : {};
}

if (require.main === module) start().catch(error => { console.error(error); process.exit(1); });

module.exports = { route, parseCookies, hash, sameOrigin };
