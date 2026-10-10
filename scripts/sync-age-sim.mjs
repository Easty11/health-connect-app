// "Last background sync" age simulation — relative age, amber past ~13 h, absolute secondary.
//
// Source-bound like the other sims: imports the REAL pure module (src/syncAge.js), never a
// reimplementation. `now` and the absolute formatter are injected, so the output is deterministic.
//
// Cases:
//   (a) stamps 1 h, 14 h and 3 days old (the brief's gate): relative text, amber flag, absolute kept
//   (b) the 13 h boundary: exactly 13 h is not amber, 13 h 1 min is
//   (c) small ages: just now, minutes (never "60 min"), the 48 h switch from hours to days
//   (d) no background run yet: 'never', not amber
//   (e) an unreadable stamp: 'unknown', amber (cannot be called fresh)
//   (f) a stamp in the future (clock skew): clamped, not negative, not amber
//
// Run: node scripts/sync-age-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { describeSyncAge, BACKGROUND_STALE_AFTER_MS } from '../src/syncAge.js';

let failures = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, why) => { failures++; console.log(`  FAIL  ${name} — ${why}`); };
const assert = (name, cond, why = 'assertion false') => (cond ? ok(name) : bad(name, why));

const NOW = Date.parse('2026-10-10T02:00:00Z');
const H = 60 * 60 * 1000;
const MIN = 60 * 1000;
const ago = (ms) => new Date(NOW - ms).toISOString();
const fmt = (d) => `ABS(${d.toISOString()})`;
const run = (ms) => describeSyncAge(ago(ms), NOW, fmt);

// ── (a) the gate: 1 h, 14 h, 3 days ──────────────────────────────────────────
console.log('stamps  1 h / 14 h / 3 d old:');
for (const [label, ms, relative, stale] of [
  ['1 h', 1 * H, '1 h ago', false],
  ['14 h', 14 * H, '14 h ago', true],
  ['3 d', 72 * H, '3 d ago', true],
]) {
  const r = run(ms);
  console.log(`        ${label.padEnd(5)} -> relative="${r.relative}" stale=${r.stale} absolute=${r.absolute}`);
  assert(`(a) ${label}: relative age reads "${relative}"`, r.relative === relative, r.relative);
  assert(`(a) ${label}: ${stale ? 'amber' : 'not amber'}`, r.stale === stale, `stale=${r.stale}`);
  assert(`(a) ${label}: absolute time is kept, secondary`, r.absolute === fmt(new Date(NOW - ms)), String(r.absolute));
}

// ── (b) the boundary ─────────────────────────────────────────────────────────
assert('(b) threshold is 13 h', BACKGROUND_STALE_AFTER_MS === 13 * H, String(BACKGROUND_STALE_AFTER_MS));
assert('(b) exactly 13 h is not amber', run(13 * H).stale === false, 'amber at 13 h');
assert('(b) 13 h 1 min is amber', run(13 * H + MIN).stale === true, 'not amber at 13 h 1 min');
assert('(b) 12 h 59 min is not amber', run(13 * H - MIN).stale === false, 'amber at 12 h 59 min');

// ── (c) small ages and the hours-to-days switch ──────────────────────────────
assert('(c) 20 s reads "just now"', run(20 * 1000).relative === 'just now', run(20 * 1000).relative);
assert('(c) 5 min reads "5 min ago"', run(5 * MIN).relative === '5 min ago', run(5 * MIN).relative);
assert('(c) 59 min 40 s reads "59 min ago", never "60 min ago"', run(59 * MIN + 40 * 1000).relative === '59 min ago', run(59 * MIN + 40 * 1000).relative);
assert('(c) 47 h reads in hours', run(47 * H).relative === '47 h ago', run(47 * H).relative);
assert('(c) 48 h switches to days', run(48 * H).relative === '2 d ago', run(48 * H).relative);

// ── (d) never ran ────────────────────────────────────────────────────────────
for (const v of [null, undefined, '']) {
  const r = describeSyncAge(v, NOW, fmt);
  assert(`(d) ${JSON.stringify(v) ?? 'undefined'} reads "never", no absolute, not amber`,
    r.relative === 'never' && r.absolute === null && r.stale === false, JSON.stringify(r));
}

// ── (e) unreadable stamp ─────────────────────────────────────────────────────
{
  const r = describeSyncAge('not a date', NOW, fmt);
  assert('(e) unreadable stamp reads "unknown" and is amber',
    r.relative === 'unknown' && r.absolute === null && r.stale === true, JSON.stringify(r));
}

// ── (f) clock skew ───────────────────────────────────────────────────────────
{
  const r = describeSyncAge(new Date(NOW + 3 * H).toISOString(), NOW, fmt);
  assert('(f) a future stamp is clamped to "just now", not amber',
    r.relative === 'just now' && r.stale === false, JSON.stringify(r));
}

console.log(failures === 0 ? '\nPASS' : `\nFAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
