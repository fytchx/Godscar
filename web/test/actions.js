// Server-safety checks for the action API.
// 1. Junk input never throws, and a rejected action never changes state.
// 2. The same seed, times and actions give byte-identical state in separate processes.
// Run: node test/actions.js
const { execFileSync } = require('child_process');
const S = require('../src/sim.js');

if (process.argv[2] === '--replay') {
  // child mode: play a fixed script and print the final state
  const g = S.newGame('hunter', 0, 1234);
  let t = 0;
  for (let i = 0; i < 40; i++) {
    t += 1800; S.advance(g, t, S.emptyOut());
    const it = g.bag[0];
    if (it) S.doAction(g, i % 3 ? { type: 'equip', id: it.id } : { type: 'salvage', id: it.id });
    if (g.hero.points) S.doAction(g, { type: 'passive', k: 'might' });
  }
  S.doAction(g, { type: 'craft', slot: 'ring', rarity: 'common', ilvl: 1 });
  process.stdout.write(JSON.stringify(g));
  return;
}

let fails = 0;
const fail = m => { fails++; console.log('FAIL', m); };

// --- 1. fuzz ---
const g = S.newGame('warrior', 0, 7);
S.advance(g, 6 * 3600, S.emptyOut());
const junk = [undefined, null, '', 'x', '__proto__', 'constructor', 'toString', -1, 1e9, 1.5, NaN, Infinity, true, {}, [], '0', 'weapon', 'ring1', 'off', 'mend'];
const types = [...Object.keys(S.ACTIONS), '__proto__', 'constructor', 'hasOwnProperty', '', null];
const keys = ['id', 'to', 'i', 'k', 'slot', 'spell', 'rarity', 'base', 'ilvl', 'cond', 'key', 'level', 'n', 'on'];
const r = { s: 99 };
const pick = a => a[Math.floor(S.rand(r) * a.length)];
const realIds = () => [...g.bag.map(x => x.id), ...Object.values(g.equip).map(x => x.id), ...g.jewels.map(x => x.id)];
let rejected = 0, accepted = 0;
for (let n = 0; n < 20000; n++) {
  const a = { type: pick(types) };
  for (const k of keys) if (S.rand(r) < 0.5) a[k] = k === 'id' && S.rand(r) < 0.5 && realIds().length ? pick(realIds()) : pick(junk);
  const before = JSON.stringify(g);
  let err;
  try { err = S.doAction(g, a); } catch (e) { fail(`threw on ${JSON.stringify(a)}: ${e.message}`); break; }
  if (err) { rejected++; if (JSON.stringify(g) !== before) { fail(`rejected action changed state: ${JSON.stringify(a)} -> ${err}`); break; } }
  else accepted++;
  try { S.advance(g, g.t + 5, S.emptyOut()); } catch (e) { fail(`state broke after ${JSON.stringify(a)}: ${e.message}`); break; }
}
for (const bad of [null, undefined, 'equip', 5, { type: '__proto__' }, { type: 'constructor' }]) {
  try { if (!S.doAction(g, bad)) fail(`accepted ${JSON.stringify(bad)}`); } catch (e) { fail(`threw on ${JSON.stringify(bad)}`); }
}
if (Object.prototype.polluted || ({}).k) fail('prototype polluted');
if (g.bar.off.length !== 3 || g.bar.util.length !== 2) fail('autocast bar resized');
console.log(`fuzz: ${accepted} accepted, ${rejected} rejected`);

// --- 2. cross-process determinism ---
const run = () => execFileSync(process.execPath, [__filename, '--replay'], { maxBuffer: 1 << 26 }).toString();
const a1 = run(), a2 = run();
if (a1 !== a2) fail('two processes produced different states');
else console.log(`determinism: identical across processes (${a1.length} bytes)`);

if (fails) { console.log(`${fails} failure(s)`); process.exit(1); }
console.log('actions ok');
