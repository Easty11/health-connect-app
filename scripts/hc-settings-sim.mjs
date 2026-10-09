// Open-Health-Connect button simulation — the never-throws / fallback-hint contract.
//
// Source-bound like the other sims: imports the REAL pure module (src/hcSettings.js), never a
// reimplementation. The library calls are injected, so no react-native is touched.
//
// Cases:
//   (a) SDK available -> the settings call fires once, no hint
//   (b) SDK not available (unavailable / update required) -> call NOT fired, hint returned
//   (c) getSdkStatus throws -> no throw, call NOT fired, hint returned
//   (d) the settings call itself throws -> no throw, hint returned
//   (e) the hint text is the exact fallback path
//
// Run: node scripts/hc-settings-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { openHealthConnectSafely, HC_SETTINGS_HINT } from '../src/hcSettings.js';

let failures = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, why) => { failures++; console.log(`  FAIL  ${name} — ${why}`); };
const assert = (name, cond, why = 'assertion false') => (cond ? ok(name) : bad(name, why));

// react-native-health-connect 3.5.3 src/constants.ts: SDK_UNAVAILABLE 1,
// SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED 2, SDK_AVAILABLE 3.
const AVAILABLE = 3;

// ── (a) available -> opens ───────────────────────────────────────────────────
await (async () => {
  let opens = 0;
  const res = await openHealthConnectSafely({
    getSdkStatus: async () => AVAILABLE,
    open: () => { opens++; },
    available: AVAILABLE,
  });
  assert('(a) settings call fired exactly once when available', opens === 1, `opens=${opens}`);
  assert('(a) opened true, no hint', res.opened === true && res.hint === null, JSON.stringify(res));
})();

// ── (b) not available -> no call, hint ───────────────────────────────────────
for (const status of [1, 2]) {
  let opens = 0;
  const res = await openHealthConnectSafely({
    getSdkStatus: async () => status,
    open: () => { opens++; },
    available: AVAILABLE,
  });
  assert(`(b) status ${status}: settings call NOT fired`, opens === 0, `opens=${opens}`);
  assert(`(b) status ${status}: opened false + hint`,
    res.opened === false && res.hint === HC_SETTINGS_HINT, JSON.stringify(res));
}

// ── (c) getSdkStatus throws -> swallowed ─────────────────────────────────────
await (async () => {
  let opens = 0;
  let threw = false;
  let res;
  try {
    res = await openHealthConnectSafely({
      getSdkStatus: async () => { throw new Error('boom'); },
      open: () => { opens++; },
      available: AVAILABLE,
    });
  } catch (_) { threw = true; }
  assert('(c) status read throwing does not propagate', threw === false, 'threw');
  assert('(c) settings call NOT fired', opens === 0, `opens=${opens}`);
  assert('(c) opened false + hint', res && res.opened === false && res.hint === HC_SETTINGS_HINT,
    JSON.stringify(res));
})();

// ── (d) the settings call throws -> swallowed ────────────────────────────────
await (async () => {
  let threw = false;
  let res;
  try {
    res = await openHealthConnectSafely({
      getSdkStatus: async () => AVAILABLE,
      open: () => { throw new Error('ActivityNotFound'); },
      available: AVAILABLE,
    });
  } catch (_) { threw = true; }
  assert('(d) settings call throwing does not propagate', threw === false, 'threw');
  assert('(d) opened false + hint', res && res.opened === false && res.hint === HC_SETTINGS_HINT,
    JSON.stringify(res));
})();

// ── (e) exact fallback text ──────────────────────────────────────────────────
assert('(e) fallback hint text', HC_SETTINGS_HINT === 'Settings > Apps > Health Connect', HC_SETTINGS_HINT);

console.log(failures === 0 ? '\nPASS' : `\nFAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
