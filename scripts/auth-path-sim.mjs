// Auth-path simulation — Brief 1 integration precondition.
//
// Exercises the login / logout / AuthExpired handlers with the scraper native
// module ABSENT (the ab94ffe condition: `HRVCapture` undefined), asserting:
//   (1) no throw, and
//   (2) capture->POST proceeds (token reaches onLogin/AsyncStorage, then a POST
//       carries Authorization).
//
// Fidelity: the guarded native-call statements are EXTRACTED FROM THE COMMITTED
// SOURCE (App.js / Root.js) and executed verbatim — not reimplemented. A missing
// guard fails extraction -> the test fails (binds the test to the real lines).
//
// Discriminating power: a negative control runs the pre-fix UNGUARDED form and
// asserts it throws / dead-ends. This is what the SyncPayload contract arm could
// not do — it confirmed a surface that was already sound.
//
// No JWT, no network, no production write: fetch + AsyncStorage are mocked.
//
// Run: node scripts/auth-path-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const appSrc = readFileSync(new URL('App.js', root), 'utf8');
const rootSrc = readFileSync(new URL('Root.js', root), 'utf8');

const FAKE_TOKEN = 'FAKE.JWT.SIM'; // not a real credential
let failures = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, why) => { failures++; console.log(`  FAIL  ${name} — ${why}`); };
function assert(name, cond, why = 'assertion false') { cond ? ok(name) : bad(name, why); }

// ── Extract the exact guarded blocks from committed source ───────────────────
// Each regex spans the `if (...HRVCapture...) { try { ... } catch (_) {} }` guard.
function extract(src, label, re) {
  const m = src.match(re);
  if (!m) { bad(`source-bind: ${label}`, 'guard block not found in source'); return null; }
  ok(`source-bind: ${label} present in source`);
  return m[0];
}
const loginGuard = extract(appSrc, 'App.login storeAuthToken',
  /if \(HRVCapture\?\.storeAuthToken\) \{[\s\S]*?\}\s*\}/);
const logoutGuard = extract(appSrc, 'App.logout clearAuthToken',
  /if \(HRVCapture\?\.clearAuthToken\) \{[\s\S]*?\}\s*\}/);
const authExpiredGuard = extract(rootSrc, 'Root.AuthExpired clearAuthToken',
  /if \(NativeModules\.HRVCapture\?\.clearAuthToken\) \{[\s\S]*?\}\s*\}/);

// ── Mock environment: scraper native module ABSENT ───────────────────────────
function freshEnv() {
  const store = new Map();
  const AsyncStorage = {
    setItem: async (k, v) => void store.set(k, v),
    getItem: async (k) => (store.has(k) ? store.get(k) : null),
    removeMany: async (ks) => ks.forEach((k) => store.delete(k)),
  };
  // global.fetch: login returns a fake token; POST /health-connect/sync echoes
  // the Authorization header it received. No network, no production write.
  let lastPostAuth = null;
  const fetch = async (url, opts = {}) => {
    if (String(url).endsWith('/auth/login')) {
      return { ok: true, status: 200, json: async () => ({ access_token: FAKE_TOKEN }) };
    }
    if (String(url).includes('/health-connect/sync')) {
      lastPostAuth = opts.headers?.Authorization ?? null;
      return { ok: true, status: 200, json: async () => ({ id: 1 }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { store, AsyncStorage, fetch, getLastPostAuth: () => lastPostAuth };
}

// Run an extracted guard block with the given bindings. `HRVCapture` and
// `NativeModules` are whatever we pass — for the ABSENT case, undefined.
async function runGuard(blockSrc, { HRVCapture, NativeModules, data }) {
  const fn = new Function('HRVCapture', 'NativeModules', 'data',
    `return (async () => { ${blockSrc} })();`);
  await fn(HRVCapture, NativeModules, data);
}

// ── FIXED handlers (use the real extracted guard blocks) ─────────────────────
async function loginFixed(env, onLogin) {
  // mirrors App.login: fetch token -> guarded native mirror -> hand up to Root
  const res = await env.fetch('https://x/auth/login', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error('login http');
  await runGuard(loginGuard, { HRVCapture: undefined, data }); // module ABSENT
  await env.AsyncStorage.setItem('@health_app_token', data.access_token);
  await onLogin(data.access_token);
}
async function logoutFixed(env, onLogout) {
  await runGuard(logoutGuard, { HRVCapture: undefined });
  await onLogout();
}
async function authExpiredFixed(env, onLogout) {
  await runGuard(authExpiredGuard, { NativeModules: {} }); // HRVCapture undefined on it
  await onLogout();
}

// ── Capture->POST proceeds: faithful syncHealthData against the mocked POST ──
async function syncHealthData(env, data, token) {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const res = await env.fetch('https://x/health-connect/sync', { method: 'POST', ...config });
  if (!res.ok) throw new Error('sync http ' + res.status);
  return res.json();
}

// ── NEGATIVE CONTROL: pre-fix UNGUARDED form (ab94ffe) ───────────────────────
async function loginUnguarded(env, onLogin) {
  const res = await env.fetch('https://x/auth/login', { method: 'POST' });
  const data = await res.json();
  const HRVCapture = undefined;
  await HRVCapture.storeAuthToken(data.access_token); // throws: module absent
  await onLogin(data.access_token);
}

// ── Run ──────────────────────────────────────────────────────────────────────
console.log('\nAuth-path simulation — HRVCapture native module ABSENT (ab94ffe condition)\n');
console.log('[FIXED] guarded auth path:');

// login
{
  const env = freshEnv();
  let handed = null;
  try {
    await loginFixed(env, (t) => { handed = t; });
    ok('login: no throw with module absent');
  } catch (e) { bad('login: no throw with module absent', e.message); }
  assert('login: token handed to onLogin (path proceeds)', handed === FAKE_TOKEN, `got ${handed}`);
  assert('login: token persisted to AsyncStorage',
    (await env.AsyncStorage.getItem('@health_app_token')) === FAKE_TOKEN, 'not stored');
  // capture->POST proceeds with the stored token
  try {
    await syncHealthData(env, { sleep: [], hrv: [] }, await env.AsyncStorage.getItem('@health_app_token'));
    assert('capture->POST proceeds (Authorization sent)',
      env.getLastPostAuth() === `Bearer ${FAKE_TOKEN}`, `auth was ${env.getLastPostAuth()}`);
  } catch (e) { bad('capture->POST proceeds', e.message); }
}

// logout
{
  const env = freshEnv();
  let out = false;
  try { await logoutFixed(env, () => { out = true; }); ok('logout: no throw with module absent'); }
  catch (e) { bad('logout: no throw with module absent', e.message); }
  assert('logout: onLogout reached', out === true, 'onLogout not called');
}

// AuthExpired
{
  const env = freshEnv();
  let out = false;
  try { await authExpiredFixed(env, () => { out = true; }); ok('AuthExpired: no throw with module absent'); }
  catch (e) { bad('AuthExpired: no throw with module absent', e.message); }
  assert('AuthExpired: onLogout reached (recovery proceeds)', out === true, 'onLogout not called');
}

console.log('\n[NEGATIVE CONTROL] pre-fix unguarded form must FAIL the same way:');
{
  const env = freshEnv();
  let handed = null, threw = false;
  try { await loginUnguarded(env, (t) => { handed = t; }); }
  catch { threw = true; }
  assert('control: unguarded login throws (regression reproduced)', threw === true, 'did not throw');
  assert('control: unguarded login dead-ends before onLogin', handed === null, 'reached onLogin');
}

console.log('');
if (failures === 0) {
  console.log('RESULT: PASS — auth path survives module-absent; capture->POST proceeds; control reproduces regression.');
  process.exit(0);
} else {
  console.log(`RESULT: FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
