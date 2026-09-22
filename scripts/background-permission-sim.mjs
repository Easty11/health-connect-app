// Background-permission-button simulation — #45 visible/hidden decision + post-grant flow.
//
// Source-bound like the other sims: imports the REAL pure module
// (src/backgroundPermission.js), never a reimplementation. The permission reads and the
// registration call are injected, so no react-native / expo is touched.
//
// Cases (brief S3):
//   (a) visible/hidden decision across base-granted × background-granted
//   (b) post-grant flow: grant -> registration called
//   (c) denial flow: no grant -> registration NOT called
//
// Run: node scripts/background-permission-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { shouldShowEnableBackground, runEnableBackground } from '../src/backgroundPermission.js';

let failures = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, why) => { failures++; console.log(`  FAIL  ${name} — ${why}`); };
function assert(name, cond, why = 'assertion false') { cond ? ok(name) : bad(name, why); }

const BASE = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];
const BG = { accessType: 'read', recordType: 'BackgroundAccessPermission' };

// ── (a) visible/hidden decision ──────────────────────────────────────────────
assert('(a) hidden before base permissions exist',
  shouldShowEnableBackground({ basePermissionsGranted: false, granted: [] }) === false, 'shown');
assert('(a) hidden before base permissions exist (even if bg somehow present)',
  shouldShowEnableBackground({ basePermissionsGranted: false, granted: [BG] }) === false, 'shown');
assert('(a) SHOWN when base granted but background missing (the #45 gap)',
  shouldShowEnableBackground({ basePermissionsGranted: true, granted: BASE }) === true, 'hidden');
assert('(a) hidden once background is granted',
  shouldShowEnableBackground({ basePermissionsGranted: true, granted: [...BASE, BG] }) === false, 'shown');

// ── (b) post-grant flow: grant -> registration called ────────────────────────
await (async () => {
  let registerCalls = 0;
  const res = await runEnableBackground({
    requestBackground: async () => true,
    register: async () => { registerCalls++; },
  });
  assert('(b) granted true on a successful request', res.granted === true, `granted=${res.granted}`);
  assert('(b) registration called exactly once on grant', registerCalls === 1, `calls=${registerCalls}`);
  assert('(b) registered true on grant', res.registered === true, `registered=${res.registered}`);
})();

// ── (c) denial flow: no grant -> registration NOT called ─────────────────────
await (async () => {
  let registerCalls = 0;
  const res = await runEnableBackground({
    requestBackground: async () => false,
    register: async () => { registerCalls++; },
  });
  assert('(c) granted false on denial', res.granted === false, `granted=${res.granted}`);
  assert('(c) registration NOT called on denial', registerCalls === 0, `calls=${registerCalls}`);
  assert('(c) registered false on denial', res.registered === false, `registered=${res.registered}`);
})();

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
