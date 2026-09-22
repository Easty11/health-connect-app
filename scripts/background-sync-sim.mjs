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
//
// Run: node scripts/background-sync-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { runSync, shouldRegisterBackground, hasBackgroundPermission } from '../src/syncRunner.js';

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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
