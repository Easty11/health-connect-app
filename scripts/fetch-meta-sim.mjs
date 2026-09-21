// fetchMeta simulation — G1 (truncation flag) + G3-equivalent (paging
// completeness), both against the REAL committed core src/fetchMeta.js (the same
// paginate/streamMeta the app runs — not a reimplementation). No RN, no network.
//
// Run: node scripts/fetch-meta-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { paginate, streamMeta, HC_PAGE_SIZE } from '../src/fetchMeta.js';

let failures = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, why) => { failures++; console.log(`  FAIL  ${name} — ${why}`); };
const assert = (name, cond, why = 'assertion false') => (cond ? ok(name) : bad(name, why));

// A reader that serves `total` records ASCENDING in pages of `pageSize`. Each
// record's `time` is an ISO timestamp; index 0 is the OLDEST. `failAtPage`
// (1-based) makes that page read throw, simulating a mid-pagination failure.
function makeReader(total, { failAtPage = null, alwaysToken = false } = {}) {
  let served = 0;
  let page = 0;
  return async ({ pageSize }) => {
    page += 1;
    if (failAtPage && page === failAtPage) throw new Error(`simulated page ${page} failure`);
    const remaining = total - served;
    const n = Math.min(pageSize, remaining);
    const records = Array.from({ length: n }, (_, i) => ({
      // OLDEST first: minute i from an epoch. Newest posted = highest index served.
      time: new Date(Date.UTC(2026, 0, 1) + (served + i) * 60000).toISOString(),
    }));
    served += n;
    const pageToken = alwaysToken || served < total ? `tok-${served}` : undefined;
    return { records, pageToken };
  };
}

console.log('\nfetchMeta simulation — pagination completeness + truncation flag\n');

// ── G3-equivalent: a clean 2-page fetch (>1000) returns EVERYTHING, not truncated ──
{
  const total = HC_PAGE_SIZE + 500; // 1500 -> 2 pages
  const { records, pages, truncated, endedOnFailure } = await paginate(makeReader(total), null);
  assert('clean fetch: all records returned across pages', records.length === total, `got ${records.length}/${total}`);
  assert('clean fetch: pages == 2', pages === 2, `got ${pages}`);
  assert('clean fetch: truncated == false', truncated === false, 'flag set on a complete fetch');
  assert('clean fetch: endedOnFailure == false', endedOnFailure === false, 'failure flagged on a clean fetch');
  const meta = streamMeta(records.map((r) => r.time), { pages, truncated, endedOnFailure });
  assert('clean fetch: received == total', meta.received === total, `got ${meta.received}`);
  assert('clean fetch: newestAt is the LAST (newest) record', meta.newestAt === records[total - 1].time, 'newestAt wrong');
  assert('clean fetch: oldestAt is the FIRST (oldest) record', meta.oldestAt === records[0].time, 'oldestAt wrong');
}

// ── G1: a mid-pagination failure sets truncated + endedOnFailure, keeps the partial ──
{
  const total = HC_PAGE_SIZE * 3; // would be 3 pages; fail fetching page 2
  const { records, pages, truncated, endedOnFailure, error } = await paginate(
    makeReader(total, { failAtPage: 2 }), null,
  );
  assert('partial fetch: truncated flag SET', truncated === true, 'truncation not flagged on partial');
  assert('partial fetch: endedOnFailure SET', endedOnFailure === true, 'failure not flagged');
  assert('partial fetch: error captured', typeof error === 'string' && error.length > 0, 'no error message');
  assert('partial fetch: partial kept, not discarded', records.length === HC_PAGE_SIZE, `got ${records.length}`);
  const meta = streamMeta(records.map((r) => r.time), { pages, truncated, endedOnFailure });
  assert('partial fetch: fetchMeta.truncated propagates', meta.truncated === true, 'meta did not propagate flag');
  // Discriminating (the mutation guard): under ASCENDING order the kept partial is
  // the OLDEST end — its newestAt is strictly older than the true window newest.
  // If truncation were NOT flagged, the backend would accept this stale series as
  // complete. This assertion fails if `truncated` is hard-coded false.
  assert('partial fetch: flag distinguishes stale-from-complete', meta.truncated !== false, 'flag would hide truncation');
}

// ── page-cap truncation: token never clears -> truncated, but not a failure ──
{
  const { records, pages, truncated, endedOnFailure } = await paginate(
    makeReader(HC_PAGE_SIZE * 5, { alwaysToken: true }), null, { maxPages: 3 },
  );
  assert('cap: truncated flag SET at page cap', truncated === true, 'cap not flagged');
  assert('cap: endedOnFailure == false (cap is not a throw)', endedOnFailure === false, 'cap misreported as failure');
  assert('cap: pages == maxPages', pages === 3, `got ${pages}`);
  assert('cap: records present', records.length > 0, 'no records');
}

// ── streamMeta edge: empty stream -> null range, received 0 ──
{
  const meta = streamMeta([], { pages: 1, truncated: false, endedOnFailure: false });
  assert('empty stream: received == 0', meta.received === 0, `got ${meta.received}`);
  assert('empty stream: oldestAt == null', meta.oldestAt === null, `got ${meta.oldestAt}`);
  assert('empty stream: newestAt == null', meta.newestAt === null, `got ${meta.newestAt}`);
}

// ── streamMeta: mixed zone offsets order by epoch, not lexicographically ──
{
  // '2026-01-01T00:30:00+10:00' == 2025-12-31T14:30Z is OLDER than '2026-01-01T00:00:00Z'
  // even though it sorts LATER as a string. Epoch comparison must get this right.
  const times = ['2026-01-01T00:00:00Z', '2026-01-01T00:30:00+10:00'];
  const meta = streamMeta(times, { pages: 1, truncated: false, endedOnFailure: false });
  assert('mixed offsets: oldestAt is the +10:00 one (earlier epoch)', meta.oldestAt === '2026-01-01T00:30:00+10:00', `got ${meta.oldestAt}`);
  assert('mixed offsets: newestAt is the Z one', meta.newestAt === '2026-01-01T00:00:00Z', `got ${meta.newestAt}`);
}

console.log('');
if (failures === 0) {
  console.log('RESULT: PASS — paging returns the full window; a partial/capped fetch is flagged truncated; range is epoch-ordered.');
  process.exit(0);
} else {
  console.log(`RESULT: FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
