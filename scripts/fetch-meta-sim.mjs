// fetchMeta simulation — G1 (truncation flag) + G3-equivalent (paging
// completeness), both against the REAL committed core src/fetchMeta.js (the same
// paginate/streamMeta the app runs — not a reimplementation). No RN, no network.
//
// Run: node scripts/fetch-meta-sim.mjs   (exit 0 = PASS, 1 = FAIL)

import { paginate, paginateWithSlicing, streamMeta, HC_PAGE_SIZE } from '../src/fetchMeta.js';

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

// ── S2/S3: slice-on-failure resume (paginateWithSlicing), against the REAL core ──
//
// Dataset-backed reader: serves the records whose start falls in the requested
// [startTime,endTime) window, ASCENDING, paginated by pageSize. It can inject a
// failure on a given page of the INITIAL full-window fetch (run 1, the pre-4-Sep
// deterministic poison page) and/or throw for a whole UTC day (a poison day the
// slice resume then names). timeRangeFilter is honoured, so slices see only
// their day — exactly what the real readRecords does.
function rec(iso, id) {
  return { startTime: iso, endTime: iso, metadata: { id, lastModifiedTime: iso } };
}
function makeDatasetReader(dataset, { failInitialAtPage = null, failForDay = null } = {}) {
  let run = 0;
  return async ({ timeRangeFilter, pageSize, pageToken }) => {
    const size = pageSize ?? HC_PAGE_SIZE;
    if (pageToken == null) run += 1; // a fresh paginate() invocation
    const runNo = run;
    const winStart = timeRangeFilter?.startTime ? Date.parse(timeRangeFilter.startTime) : -Infinity;
    const winEnd = timeRangeFilter?.endTime ? Date.parse(timeRangeFilter.endTime) : Infinity;
    const inWin = dataset.filter((r) => {
      const t = Date.parse(r.startTime);
      return t >= winStart && t < winEnd;
    });
    const offset = pageToken ? Number(pageToken) : 0;
    const pageIndex = Math.floor(offset / size); // 0-based, within this window
    if (failInitialAtPage && runNo === 1 && pageIndex + 1 === failInitialAtPage) {
      throw new Error(`simulated initial page ${failInitialAtPage} failure`);
    }
    if (failForDay && Number.isFinite(winStart)) {
      const winDay = new Date(winStart).toISOString().slice(0, 10);
      if (winDay === failForDay) throw new Error(`poison day ${failForDay}`);
    }
    const page = inWin.slice(offset, offset + size);
    const next = offset + page.length;
    return { records: page, pageToken: next < inWin.length ? String(next) : undefined };
  };
}

const WIN = {
  operator: 'between',
  startTime: '2026-09-10T00:00:00.000Z',
  endTime: '2026-09-13T00:00:00.000Z',
};
const DATASET = [
  rec('2026-09-10T10:00:00.000Z', 'd10-a'),
  rec('2026-09-10T12:00:00.000Z', 'd10-b'),
  rec('2026-09-10T14:00:00.000Z', 'd10-c'),
  rec('2026-09-11T09:00:00.000Z', 'd11-a'),
  rec('2026-09-11T20:00:00.000Z', 'd11-b'),
  rec('2026-09-12T08:00:00.000Z', 'd12-a'),
  rec('2026-09-12T19:00:00.000Z', 'd12-b'),
];
const DATASET_IDS = DATASET.map((r) => r.metadata.id).join(',');

// (a) initial fetch throws on page 3 of the full window; every slice is clean →
//     partial (pages 1–2) + all slices recovered; sliced, no failedDays, not truncated.
{
  const r = await paginateWithSlicing(makeDatasetReader(DATASET, { failInitialAtPage: 3 }), WIN, { pageSize: 2 });
  assert('slice(a): sliced == true', r.sliced === true, `got ${r.sliced}`);
  assert('slice(a): endedOnFailure == true (initial threw)', r.endedOnFailure === true, `got ${r.endedOnFailure}`);
  assert('slice(a): error captured', typeof r.error === 'string' && r.error.length > 0, 'no error message');
  assert('slice(a): failedDays == [] (all slices clean)', r.failedDays.length === 0, JSON.stringify(r.failedDays));
  assert('slice(a): truncated == false (no failedDays, no cap)', r.truncated === false, `got ${r.truncated}`);
  assert('slice(a): whole window recovered', r.records.length === DATASET.length, `got ${r.records.length}/${DATASET.length}`);
  assert('slice(a): order preserved ascending & complete', r.records.map((x) => x.metadata.id).join(',') === DATASET_IDS, r.records.map((x) => x.metadata.id).join(','));
}

// (b) initial fails (so slicing runs) AND one slice day is poison → that day named
//     in failedDays with its message, other days recovered, truncated set.
{
  const r = await paginateWithSlicing(makeDatasetReader(DATASET, { failInitialAtPage: 3, failForDay: '2026-09-12' }), WIN, { pageSize: 2 });
  assert('slice(b): sliced == true', r.sliced === true, `got ${r.sliced}`);
  assert('slice(b): exactly one failedDay', r.failedDays.length === 1, JSON.stringify(r.failedDays));
  const fd = r.failedDays.find((f) => f.day === '2026-09-12');
  assert('slice(b): 2026-09-12 recorded as failed', !!fd, JSON.stringify(r.failedDays));
  assert('slice(b): failedDay carries the error message', typeof fd?.error === 'string' && /poison day 2026-09-12/.test(fd.error), fd?.error);
  assert('slice(b): truncated == true (failedDays remain)', r.truncated === true, `got ${r.truncated}`);
  const ids = r.records.map((x) => x.metadata.id);
  assert('slice(b): days 10 & 11 recovered', ids.includes('d10-a') && ids.includes('d11-a') && ids.includes('d11-b'), ids.join(','));
  assert('slice(b): poison day 12 dropped', !ids.includes('d12-a') && !ids.includes('d12-b'), ids.join(','));
}

// (c) initial throws on page 1 → zero accumulated → the WHOLE window is sliced.
{
  const r = await paginateWithSlicing(makeDatasetReader(DATASET, { failInitialAtPage: 1 }), WIN, { pageSize: 2 });
  assert('slice(c): sliced == true', r.sliced === true, `got ${r.sliced}`);
  assert('slice(c): endedOnFailure == true', r.endedOnFailure === true, `got ${r.endedOnFailure}`);
  assert('slice(c): failedDays == []', r.failedDays.length === 0, JSON.stringify(r.failedDays));
  assert('slice(c): whole window recovered (all days)', r.records.length === DATASET.length, `got ${r.records.length}`);
  const ids = r.records.map((x) => x.metadata.id);
  assert('slice(c): day 10 recovered via slicing (initial got nothing)', ids.includes('d10-a') && ids.includes('d10-c'), ids.join(','));
}

// (d) clean 5-page reader → identical to paginate() plus sliced:false, failedDays:[].
{
  const total = 10; // 5 pages at pageSize 2
  const p1 = await paginate(makeReader(total), null, { pageSize: 2 });
  const p2 = await paginateWithSlicing(makeReader(total), null, { pageSize: 2 });
  assert('clean(d): sliced == false', p2.sliced === false, `got ${p2.sliced}`);
  assert('clean(d): failedDays == []', Array.isArray(p2.failedDays) && p2.failedDays.length === 0, JSON.stringify(p2.failedDays));
  assert('clean(d): pages == 5, identical to paginate()', p2.pages === 5 && p2.pages === p1.pages, `got ${p2.pages} vs ${p1.pages}`);
  assert('clean(d): records identical to paginate()', p2.records.length === total && p2.records.length === p1.records.length, `got ${p2.records.length}`);
  assert('clean(d): truncated & endedOnFailure identical', p2.truncated === p1.truncated && p2.endedOnFailure === p1.endedOnFailure, 'flags diverged from paginate()');
  assert('clean(d): error identical', p2.error === p1.error, `got ${p2.error}`);
}

// (e) seam dedup: the last good record is re-covered by the first slice → appears once.
{
  const two = [rec('2026-09-10T08:00:00.000Z', 's-a'), rec('2026-09-10T20:00:00.000Z', 's-b')];
  const win = { operator: 'between', startTime: '2026-09-10T00:00:00.000Z', endTime: '2026-09-11T00:00:00.000Z' };
  const r = await paginateWithSlicing(makeDatasetReader(two, { failInitialAtPage: 2 }), win, { pageSize: 1 });
  assert('seam(e): sliced == true', r.sliced === true, `got ${r.sliced}`);
  assert('seam(e): both records present', r.records.length === 2, `got ${r.records.length}`);
  const occ = r.records.filter((x) => x.metadata.id === 's-a').length;
  assert('seam(e): re-covered record appears exactly once', occ === 1, `s-a appeared ${occ}x`);
}

// (f) streamMeta surfaces error/failedDays/sliced, and defaults them when absent.
{
  const fd = [{ day: '2026-09-12', error: 'poison day 2026-09-12' }];
  const meta = streamMeta(['2026-09-10T00:00:00Z'], { pages: 3, truncated: true, endedOnFailure: true, error: 'boom', failedDays: fd, sliced: true });
  assert('streamMeta(f): error surfaced', meta.error === 'boom', `got ${meta.error}`);
  assert('streamMeta(f): failedDays surfaced', JSON.stringify(meta.failedDays) === JSON.stringify(fd), JSON.stringify(meta.failedDays));
  assert('streamMeta(f): sliced surfaced', meta.sliced === true, `got ${meta.sliced}`);
  const bare = streamMeta([], { pages: 1, truncated: false, endedOnFailure: false });
  assert('streamMeta(f): error defaults null when absent', bare.error === null, `got ${bare.error}`);
  assert('streamMeta(f): failedDays defaults [] when absent', Array.isArray(bare.failedDays) && bare.failedDays.length === 0, JSON.stringify(bare.failedDays));
  assert('streamMeta(f): sliced defaults false when absent', bare.sliced === false, `got ${bare.sliced}`);
}

console.log('');
if (failures === 0) {
  console.log('RESULT: PASS — paging returns the full window; a partial/capped fetch is flagged truncated; range is epoch-ordered; a poison page resumes in per-day slices and names the unreadable day.');
  process.exit(0);
} else {
  console.log(`RESULT: FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
