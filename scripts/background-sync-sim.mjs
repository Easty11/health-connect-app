// Background-sync simulation — #44 runSync branch logic + registration gate.
//
// Source-bound like the other sims: imports the REAL pure module (src/syncRunner.js),
// never a reimplementation. runSync's runtime dependencies (token read, HC fetch,
// backend POST, last-sync write) are injected as fakes, so no react-native / expo /
// network / AsyncStorage is touched. A change to the branch logic that breaks a case
// fails here.
//
// Cases (brief S6):
//   (a) ok path stamps trigger and returns received
//   (b) POST failure -> ok:false, no throw
//   (c) missing token -> ok:false, NO fetch
//   (d) trigger propagates into client
//   (e) registration gating: no background permission -> not registered
//   (f) renewed_token present -> setToken called with it (#47)
//   (g) renewed_token absent / empty / non-string -> setToken NOT called; a throwing
//       setToken never fails the sync
//   (h) 401 -> onAuthExpired called (needsSignIn), ok:false; non-401 -> not called
//   (i) source-bind: api.js 401 interceptor clears the token; backgroundSync injects
//       storeToken + the needsSignIn writer; login clears the flag
//   (j) failedFetchResult: uninitialised-client payload — every stream errored, shape safe
//   (k) fetchFailureReason: all-failed -> reason; partial / empty-honest / no meta -> null
//   (l) runSync on an all-failed fetch -> ok:false, POST still sent, no last-sync stamp (#370)
//   (m) source-bind: fetchAllData inits before reading; registration inits before grants
//
// Run: node scripts/background-sync-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { readFileSync } from 'node:fs';

import { runSync, shouldRegisterBackground, hasBackgroundPermission } from '../src/syncRunner.js';
import { failedFetchResult, fetchFailureReason, STREAMS, HC_NOT_INITIALIZED } from '../src/fetchMeta.js';

let failures = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, why) => { failures++; console.log(`  FAIL  ${name} — ${why}`); };
function assert(name, cond, why = 'assertion false') { cond ? ok(name) : bad(name, why); }

const FAKE_TOKEN = 'FAKE.JWT.SIM'; // not a real credential

// A fetchAllData stand-in returning the shape the real one returns (client block +
// per-stream arrays), with known counts so `received` is checkable.
function fakeData() {
  return {
    syncedAt: '2026-09-22T00:00:00.000Z',
    periodDays: 7,
    client: { gitSha: 'abc1234', builtAt: '2026-09-22T00:00:00Z', appVersion: '1.0.0', platform: 'android' },
    sleep: [{}, {}],            // 2
    hrv: [{}],                  // 1
    heartRate: [{}, {}, {}],    // 3
    steps: [{ count: 100 }, { count: 200 }], // 2 step-days
    workouts: [{}],             // 1
    fetchMeta: { sleep: { pages: 1 } },
    errors: [],
  };
}
const EXPECTED_RECEIVED = 2 + 1 + 3 + 2 + 1; // 9

// ── (a) ok path stamps trigger and returns received ──────────────────────────
await (async () => {
  let posted = null;
  let fetchCalls = 0;
  const res = await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => FAKE_TOKEN,
    fetchAllData: async (days) => { fetchCalls++; const d = fakeData(); d.periodDays = days; return d; },
    syncHealthData: async (data, token) => { posted = { data, token }; return { received: {} }; },
  });
  assert('(a) ok true on happy path', res.ok === true, `ok=${res.ok} err=${res.error}`);
  assert('(a) received = summed record count', res.received === EXPECTED_RECEIVED, `received=${res.received}`);
  assert('(a) returns data for the UI to derive syncResult', res.data && Array.isArray(res.data.sleep), 'data missing');
  assert('(a) meta carries fetchMeta', res.meta && res.meta.sleep, 'meta missing');
  assert('(a) token forwarded to POST', posted && posted.token === FAKE_TOKEN, 'token not forwarded');
  assert('(a) fetchAllData called exactly once', fetchCalls === 1, `fetchCalls=${fetchCalls}`);
})();

// ── (b) POST failure -> ok:false, no throw ───────────────────────────────────
await (async () => {
  let threw = false;
  let res;
  try {
    res = await runSync({
      days: 7,
      trigger: 'background',
      getToken: async () => FAKE_TOKEN,
      fetchAllData: async () => fakeData(),
      syncHealthData: async () => { throw new Error('POST 500'); },
    });
  } catch (_) { threw = true; }
  assert('(b) runSync does not throw on POST failure', threw === false, 'it threw');
  assert('(b) ok false on POST failure', res && res.ok === false, `ok=${res && res.ok}`);
  assert('(b) error carries the POST message', res && /POST 500/.test(res.error || ''), `error=${res && res.error}`);
})();

// ── (c) missing token -> ok:false, NO fetch ──────────────────────────────────
await (async () => {
  let fetchCalls = 0;
  let postCalls = 0;
  const res = await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => null,
    fetchAllData: async () => { fetchCalls++; return fakeData(); },
    syncHealthData: async () => { postCalls++; },
  });
  assert('(c) ok false with no token', res.ok === false, `ok=${res.ok}`);
  assert('(c) no fetch when token missing', fetchCalls === 0, `fetchCalls=${fetchCalls}`);
  assert('(c) no POST when token missing', postCalls === 0, `postCalls=${postCalls}`);
})();

// ── (d) trigger propagates into client (both values) ─────────────────────────
await (async () => {
  for (const trig of ['manual', 'background']) {
    let seen = null;
    await runSync({
      days: 7,
      trigger: trig,
      getToken: async () => FAKE_TOKEN,
      fetchAllData: async () => fakeData(),
      syncHealthData: async (data) => { seen = data.client.trigger; },
    });
    assert(`(d) client.trigger = '${trig}' on the posted payload`, seen === trig, `saw ${seen}`);
  }
  // The fingerprint fields survive the stamp (spread, not replace).
  let client = null;
  await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => FAKE_TOKEN,
    fetchAllData: async () => fakeData(),
    syncHealthData: async (data) => { client = data.client; },
  });
  assert('(d) build fingerprint preserved beside trigger', client && client.gitSha === 'abc1234', 'gitSha lost');
})();

// ── (e) registration gating: no background permission -> not registered ──────
await (async () => {
  const noPerm = [
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'HeartRate' },
  ];
  const withPerm = [...noPerm, { accessType: 'read', recordType: 'BackgroundAccessPermission' }];
  assert('(e) not registered without background permission', shouldRegisterBackground(noPerm) === false, 'gated true');
  assert('(e) registered with background permission', shouldRegisterBackground(withPerm) === true, 'gated false');
  assert('(e) hasBackgroundPermission false on empty list', hasBackgroundPermission([]) === false, 'true on []');
  assert('(e) hasBackgroundPermission tolerant of non-array', hasBackgroundPermission(null) === false, 'true on null');
})();

// ── (f) renewed_token present -> setToken called with it ─────────────────────
const RENEWED = 'FAKE.RENEWED.SIM'; // not a real credential
await (async () => {
  const stored = [];
  const res = await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => FAKE_TOKEN,
    fetchAllData: async () => fakeData(),
    syncHealthData: async () => ({ synced: 7, renewed_token: RENEWED }),
    setToken: async (t) => { stored.push(t); },
  });
  assert('(f) ok true with a renewed token', res.ok === true, `ok=${res.ok} err=${res.error}`);
  assert('(f) setToken called exactly once with renewed_token',
    stored.length === 1 && stored[0] === RENEWED, `stored=${JSON.stringify(stored)}`);
})();

// ── (g) absent / empty / non-string -> not called; throwing setToken is harmless ──
await (async () => {
  for (const [label, body] of [
    ['absent', { synced: 7 }],
    ['empty string', { synced: 7, renewed_token: '' }],
    ['non-string', { synced: 7, renewed_token: 12345 }],
    ['undefined response', undefined],
  ]) {
    let calls = 0;
    const res = await runSync({
      days: 7,
      trigger: 'background',
      getToken: async () => FAKE_TOKEN,
      fetchAllData: async () => fakeData(),
      syncHealthData: async () => body,
      setToken: async () => { calls++; },
    });
    assert(`(g) ${label}: setToken not called`, calls === 0, `calls=${calls}`);
    assert(`(g) ${label}: sync still ok`, res.ok === true, `ok=${res.ok} err=${res.error}`);
  }
  const res = await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => FAKE_TOKEN,
    fetchAllData: async () => fakeData(),
    syncHealthData: async () => ({ renewed_token: RENEWED }),
    setToken: async () => { throw new Error('storage full'); },
  });
  assert('(g) a throwing setToken does not fail the sync', res.ok === true, `ok=${res.ok} err=${res.error}`);
})();

// ── (h) 401 -> onAuthExpired (needsSignIn) ; non-401 -> not called ─────────────
function httpError(status) {
  const e = new Error(`Request failed with status code ${status}`);
  e.response = { status };
  return e;
}
await (async () => {
  const flagged = [];
  let tokenWrites = 0;
  const res = await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => FAKE_TOKEN,
    fetchAllData: async () => fakeData(),
    syncHealthData: async () => { throw httpError(401); },
    setToken: async () => { tokenWrites++; },
    onAuthExpired: async (x) => { flagged.push(x); },
    now: () => '2026-09-24T00:00:00.000Z',
  });
  assert('(h) 401 -> ok false', res.ok === false, `ok=${res.ok}`);
  assert('(h) 401 -> onAuthExpired called once with trigger + timestamp',
    flagged.length === 1 && flagged[0].trigger === 'background' && flagged[0].at === '2026-09-24T00:00:00.000Z',
    `flagged=${JSON.stringify(flagged)}`);
  assert('(h) 401 -> no token stored', tokenWrites === 0, `tokenWrites=${tokenWrites}`);

  let calls = 0;
  await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => FAKE_TOKEN,
    fetchAllData: async () => fakeData(),
    syncHealthData: async () => { throw httpError(500); },
    onAuthExpired: async () => { calls++; },
  });
  assert('(h) 500 -> onAuthExpired NOT called', calls === 0, `calls=${calls}`);

  let threw = false;
  try {
    await runSync({
      days: 7,
      trigger: 'background',
      getToken: async () => FAKE_TOKEN,
      fetchAllData: async () => fakeData(),
      syncHealthData: async () => { throw httpError(401); },
      onAuthExpired: async () => { throw new Error('storage broken'); },
    });
  } catch (_) { threw = true; }
  assert('(h) a throwing onAuthExpired does not make runSync throw', threw === false, 'it threw');
})();

// ── (i) source-bind: the pieces runSync cannot see ───────────────────────────
// The token clear on 401 lives in api.js's axios interceptor, and the real injections
// live in backgroundSync.js / Root.js — none node-importable (RN / axios / expo). Bind to
// the committed text so removing any of them fails here.
await (async () => {
  const root = new URL('..', import.meta.url);
  const api = readFileSync(new URL('src/api.js', root), 'utf8');
  const bg = readFileSync(new URL('src/backgroundSync.js', root), 'utf8');
  const rootSrc = readFileSync(new URL('Root.js', root), 'utf8');
  assert('(i) api.js 401 interceptor clears the stored token',
    /status === 401\)\s*\{\s*await AsyncStorage\.removeMany\(\[TOKEN_KEY/.test(api), 'clear not found');
  assert('(i) api.js storeToken writes TOKEN_KEY and mirrors to native',
    /export async function storeToken\(token\)\s*\{\s*await AsyncStorage\.setItem\(TOKEN_KEY, token\);\s*await mirrorTokenToNative\(token\);/.test(api),
    'storeToken body not found');
  assert('(i) api.js no longer dumps the full payload', !/Syncing data:/.test(api), 'payload dump still present');
  assert('(i) background task injects setToken: storeToken', /setToken: storeToken/.test(bg), 'not injected');
  assert('(i) background task injects onAuthExpired: writeNeedsSignIn',
    /onAuthExpired: writeNeedsSignIn/.test(bg), 'not injected');
  assert('(i) login clears the needsSignIn flag', /await clearNeedsSignIn\(\)/.test(rootSrc), 'not cleared on login');
})();

// ── (j)-(l) #370: an uninitialised client must not read as a successful sync ──
const CLIENT = { gitSha: 'abc1234', builtAt: '2026-10-03T00:00:00Z', appVersion: '1.0.0', platform: 'android' };
const failedFetch = (days = 7) => failedFetchResult({ days, error: HC_NOT_INITIALIZED, client: CLIENT, now: () => '2026-10-03T00:00:00.000Z' });

await (async () => {
  const d = failedFetch(30);
  assert('(j) every stream entry carries the error',
    STREAMS.every((s) => d.fetchMeta[s]?.error === HC_NOT_INITIALIZED && d.fetchMeta[s].received === 0 && d.fetchMeta[s].endedOnFailure === true),
    JSON.stringify(d.fetchMeta));
  assert('(j) fetchMeta values are all objects (backend: dict[str, FetchMetaEntry], no bare string -> no 422)',
    Object.values(d.fetchMeta).every((v) => v && typeof v === 'object'), 'non-object value in fetchMeta');
  assert('(j) errors[] names it once; periodDays + client preserved; arrays empty',
    d.errors.length === 1 && d.errors[0] === HC_NOT_INITIALIZED && d.periodDays === 30 && d.client === CLIENT
      && STREAMS.every((s) => Array.isArray(d[s]) && d[s].length === 0), JSON.stringify(d));
})();

await (async () => {
  assert('(k) all streams errored + nothing read -> reason', fetchFailureReason(failedFetch()) === HC_NOT_INITIALIZED, 'no reason');
  // Partial: all five errored but one stream still returned records -> still a sync.
  const partial = failedFetch(); partial.heartRate = [{}];
  assert('(k) errored streams but records read -> null (partial is a sync)', fetchFailureReason(partial) === null, 'flagged partial');
  // Only some streams errored.
  const some = failedFetch(); some.fetchMeta.hrv = { ...some.fetchMeta.hrv, error: null };
  assert('(k) not every stream errored -> null', fetchFailureReason(some) === null, 'flagged');
  // Honest empty window: no errors anywhere.
  const empty = failedFetch(); for (const s of STREAMS) empty.fetchMeta[s].error = null;
  assert('(k) empty window with no errors -> null (still ok)', fetchFailureReason(empty) === null, 'flagged empty');
  assert('(k) no fetchMeta -> null (old shape unaffected)', fetchFailureReason(fakeData()) === null && fetchFailureReason(null) === null, 'flagged');
})();

await (async () => {
  let posted = 0, stamped = 0, stored = null;
  const res = await runSync({
    days: 7,
    trigger: 'background',
    getToken: async () => FAKE_TOKEN,
    fetchAllData: async () => failedFetch(7),
    syncHealthData: async () => { posted++; return { renewed_token: 'RENEWED.SIM' }; },
    setLastSync: async () => { stamped++; },
    setToken: async (t) => { stored = t; },
  });
  assert('(l) all-failed fetch -> ok:false so the task reports Failed', res.ok === false, `ok=${res.ok}`);
  assert('(l) error is the init failure', res.error === HC_NOT_INITIALIZED, `error=${res.error}`);
  assert('(l) telemetry still POSTed', posted === 1, `posted=${posted}`);
  assert('(l) no last-sync stamp on a failed sync', stamped === 0, `stamped=${stamped}`);
  assert('(l) renewed token still stored (the POST succeeded)', stored === 'RENEWED.SIM', `stored=${stored}`);
  assert('(l) data/meta still returned (manual UI can show the error)', res.data && res.meta && res.received === 0, 'missing');
})();

// ── (m) source-bind: the init order lives in RN-only modules ─────────────────
await (async () => {
  const root = new URL('..', import.meta.url);
  const hc = readFileSync(new URL('src/healthConnect.js', root), 'utf8');
  const bg = readFileSync(new URL('src/backgroundSync.js', root), 'utf8');
  const fa = hc.slice(hc.indexOf('export async function fetchAllData'));
  const initAt = fa.indexOf('await initializeHealthConnect()');
  const readAt = fa.indexOf('safeFetch(');
  assert('(m) fetchAllData awaits init BEFORE its first read', initAt !== -1 && readAt !== -1 && initAt < readAt, `init=${initAt} read=${readAt}`);
  assert('(m) fetchAllData returns failedFetchResult on init failure', /failedFetchResult\(/.test(fa.slice(0, readAt)), 'not returned');
  const ens = bg.slice(bg.indexOf('export async function ensureBackgroundSyncRegistered'));
  const i2 = ens.indexOf('await initializeHealthConnect()');
  const g2 = ens.indexOf('await getGrantedPermissions()');
  assert('(m) registration awaits init BEFORE getGrantedPermissions', i2 !== -1 && g2 !== -1 && i2 < g2, `init=${i2} grants=${g2}`);
})();

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
