// Steps daily-aggregate simulation (#42) — G1. Exercises the REAL committed core
// src/stepsAggregate.js (the same mapping/window/fallback the app runs, not a
// reimplementation) and the REAL streamMeta from src/fetchMeta.js. No RN, no network.
//
// TZ is pinned to a +10:00 zone (Australia/Brisbane — no DST, stable +10:00) at
// the top so the local-day window assertions are deterministic and model the
// operator's device. Run: node scripts/steps-aggregate-sim.mjs  (exit 0=PASS,1=FAIL)
process.env.TZ = 'Australia/Brisbane';

import {
  localDayFilter,
  pickSourcePackage,
  bucketToItem,
  bucketsToItems,
  fetchStepsWithFallback,
  selectByPriority,
  assembleOriginSelection,
  unionDataOrigins,
  STEP_ORIGIN_PRIORITY,
  OWN_PACKAGE,
} from '../src/stepsAggregate.js';
import { streamMeta } from '../src/fetchMeta.js';

let failures = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, why) => { failures++; console.log(`  FAIL  ${name} — ${why}`); };
const assert = (name, cond, why = 'assertion false') => (cond ? ok(name) : bad(name, why));

console.log('\nSteps daily-aggregate simulation — bucket mapping + sourcePackage + fallback + local-day window (TZ=+10:00)\n');

// A period bucket as the 3.5.3 bridge emits it: naive-local startTime/endTime,
// result { COUNT_TOTAL, dataOrigins }.
const bucket = (day, count, dataOrigins = []) => ({
  startTime: `${day}T00:00`,
  endTime: `${day}T00:00`,
  result: { COUNT_TOTAL: count, dataOrigins },
});
const GARMIN = 'com.garmin.android.apps.connectmobile';
const SAMSUNG = 'com.sec.android.app.shealth';

// ── (a) bucket -> item mapping, incl. sparse days and a zero bucket skipped ──
{
  // Sparse input: only three days have buckets (09, 11, 12); 10 is absent. One
  // zero bucket (13) must be skipped.
  const buckets = [
    bucket('2026-09-09', 5100, [GARMIN]),
    bucket('2026-09-11', 8000, [GARMIN]),
    bucket('2026-09-12', 7947, [SAMSUNG]),
    bucket('2026-09-13', 0, [GARMIN]),
  ];
  const items = bucketsToItems(buckets);
  assert('(a): zero bucket skipped, 3 items from 4 buckets', items.length === 3, `got ${items.length}`);
  assert('(a): canonical keys present (date,count,sourcePackage)', ['date', 'count', 'sourcePackage'].every((k) => k in items[0]), Object.keys(items[0]).join(','));
  assert('(a): no-origin bucket yields exactly {date,count,sourcePackage}', JSON.stringify(Object.keys(bucketToItem(bucket('2026-09-15', 42, []))).sort()) === JSON.stringify(['count', 'date', 'sourcePackage']), Object.keys(bucketToItem(bucket('2026-09-15', 42, []))).join(','));
  assert('(a): date is the local day from bucket startTime', items[0].date === '2026-09-09', items[0].date);
  assert('(a): count == COUNT_TOTAL (field is count, not steps)', items[0].count === 5100 && items[0].steps === undefined, JSON.stringify(items[0]));
  assert('(a): sparse day (10 Sep) absent from output', !items.some((i) => i.date === '2026-09-10'), items.map((i) => i.date).join(','));
  assert('(a): zero day (13 Sep) absent from output', !items.some((i) => i.date === '2026-09-13'), items.map((i) => i.date).join(','));
  // Absent COUNT_TOTAL is also skipped.
  assert('(a): absent COUNT_TOTAL skipped', bucketToItem({ startTime: '2026-09-14T00:00', result: { dataOrigins: [] } }) === null, 'absent count not skipped');
}

// ── (b) sourcePackage rule: single / multiple / own-package origins ──
{
  assert('(b): single origin -> that package', pickSourcePackage([GARMIN]) === GARMIN, pickSourcePackage([GARMIN]));
  assert('(b): multiple -> first non-own origin', pickSourcePackage([GARMIN, SAMSUNG]) === GARMIN, pickSourcePackage([GARMIN, SAMSUNG]));
  assert('(b): own package skipped in multi-origin', pickSourcePackage([OWN_PACKAGE, GARMIN]) === GARMIN, pickSourcePackage([OWN_PACKAGE, GARMIN]));
  assert('(b): only-own-package falls back to own (never invents null)', pickSourcePackage([OWN_PACKAGE]) === OWN_PACKAGE, pickSourcePackage([OWN_PACKAGE]));
  assert('(b): no origins -> null', pickSourcePackage([]) === null, String(pickSourcePackage([])));
  assert('(b): nulls in set ignored', pickSourcePackage([null, GARMIN]) === GARMIN, String(pickSourcePackage([null, GARMIN])));
  // dataOrigins carried on the item only when non-empty.
  const multi = bucketToItem(bucket('2026-09-12', 100, [GARMIN, SAMSUNG]));
  assert('(b): multi-origin item carries full dataOrigins set', JSON.stringify(multi.dataOrigins) === JSON.stringify([GARMIN, SAMSUNG]), JSON.stringify(multi.dataOrigins));
  const none = bucketToItem(bucket('2026-09-12', 100, []));
  assert('(b): empty-origin item omits dataOrigins key', !('dataOrigins' in none) && none.sourcePackage === null, JSON.stringify(none));
}

// ── (c) aggregate throws -> fallback runs, mode raw-fallback, aggregateError set,
//        items still produced from the raw path (source-bound to real streamMeta) ──
{
  const rawSteps = [
    { date: '2026-09-11', count: 9343, sourcePackage: SAMSUNG },
    { date: '2026-09-12', count: 7947, sourcePackage: SAMSUNG },
  ];
  const rawPageInfo = { pages: 2, truncated: false, endedOnFailure: false, error: null, failedDays: [], sliced: false };
  let rawRan = false;
  const res = await fetchStepsWithFallback({
    aggregate: async () => { throw new Error('count must not be less than 1, currently 0'); },
    rawFetch: async () => { rawRan = true; return { steps: rawSteps, pageInfo: rawPageInfo }; },
    streamMeta,
  });
  assert('(c): raw path ran after aggregate threw', rawRan === true, 'raw path not invoked');
  assert('(c): mode == raw-fallback', res.meta.mode === 'raw-fallback', res.meta.mode);
  assert('(c): aggregateError carries the SDK message', res.meta.aggregateError === 'count must not be less than 1, currently 0', res.meta.aggregateError);
  assert('(c): items produced from raw path', res.steps.length === 2 && res.steps[0].count === 9343, JSON.stringify(res.steps));
  assert('(c): fallback meta is the raw path streamMeta (received/newestAt)', res.meta.received === 2 && res.meta.newestAt === '2026-09-12', JSON.stringify(res.meta));
  assert('(c): fallback meta carries raw pages/truncated', res.meta.pages === 2 && res.meta.truncated === false, JSON.stringify(res.meta));

  // Success path for contrast (new #43 contract: aggregate resolves to
  // { items, origins, originErrors }) -> mode aggregate, additive meta, no aggregateError.
  const ok = await fetchStepsWithFallback({
    aggregate: async () => ({
      items: [{ date: '2026-09-11', count: 8000, sourcePackage: GARMIN, dataOrigins: [GARMIN] }],
      origins: { [GARMIN]: 1 },
      originErrors: {},
    }),
    rawFetch: async () => { throw new Error('raw should not run on aggregate success'); },
    streamMeta,
  });
  assert('(c): success -> mode aggregate', ok.meta.mode === 'aggregate', ok.meta.mode);
  assert('(c): success -> no aggregateError key', !('aggregateError' in ok.meta), JSON.stringify(ok.meta));
  assert('(c): success -> pages 1, not truncated, no failure', ok.meta.pages === 1 && ok.meta.truncated === false && ok.meta.endedOnFailure === false, JSON.stringify(ok.meta));
  assert('(c): success -> item passed through', ok.steps.length === 1 && ok.steps[0].date === '2026-09-11' && ok.steps[0].count === 8000, JSON.stringify(ok.steps));
  assert('(c): success -> meta carries origins/originErrors/selection', ok.meta.selection === 'priority' && ok.meta.origins[GARMIN] === 1 && JSON.stringify(ok.meta.originErrors) === '{}', JSON.stringify(ok.meta));
}

// ── (d) local-naive/day-edge handling for a +10:00 device: the request window is
//        Z-suffixed instants at LOCAL midnight edges, and a bucket's naive
//        startTime maps to the correct local day ──
{
  // Device local dates. new Date(y,m,d,H,...) is constructed in the runtime zone
  // (pinned +10:00 above), modelling the on-device Date the app builds.
  const startDate = new Date(2026, 8, 12, 13, 16, 0); // 12 Sep 13:16 local (+10:00)
  const endDate = new Date(2026, 8, 22, 9, 30, 0);    // 22 Sep 09:30 local (today)
  const filter = localDayFilter(startDate, endDate);
  assert('(d): filter operator between', filter.operator === 'between', filter.operator);
  // 12 Sep 00:00 +10:00 == 11 Sep 14:00Z. A mid-day start must floor to local midnight.
  assert('(d): startTime is LOCAL midnight of the first day as a Z instant', filter.startTime === '2026-09-11T14:00:00.000Z', filter.startTime);
  // endTime is local midnight AFTER today (23 Sep 00:00 +10:00 == 22 Sep 14:00Z) so today is a whole bucket.
  assert('(d): endTime is LOCAL midnight after today as a Z instant', filter.endTime === '2026-09-22T14:00:00.000Z', filter.endTime);
  assert('(d): both bounds are Z-suffixed (bridge Instant.parse requires it)', /Z$/.test(filter.startTime) && /Z$/.test(filter.endTime), `${filter.startTime} / ${filter.endTime}`);

  // A bucket the bridge returns for local day 12 Sep carries a naive startTime
  // '2026-09-12T00:00' (no Z, no offset). It must map to date '2026-09-12'.
  const item = bucketToItem(bucket('2026-09-12', 5100, [GARMIN]));
  assert('(d): naive local bucket startTime -> correct local day', item.date === '2026-09-12', item.date);
  assert('(d): a day edge is not shifted by the UTC offset', item.date !== '2026-09-11', 'day shifted by offset');
}

// ════════════ #43 — per-day selection by writer priority (STEP_ORIGIN_PRIORITY) ════════════

const FITBIT = 'com.fitbit.FitbitMobile';
const OTHER = 'com.other.tracker';
// A per-origin bucket (one origin's filtered aggregate result for a day).
const ob = (day, count) => bucket(day, count, []);
const rawPI = { pages: 2, truncated: false, endedOnFailure: false, error: null, failedDays: [], sliced: false };

// ── (S5a) two origins both with data on a day → priority origin's count alone,
//         dataOrigins lists both (never a sum: the #42 defect) ──
{
  const perOrigin = new Map([
    [GARMIN, [ob('2026-09-10', 10507)]],
    [SAMSUNG, [ob('2026-09-10', 10507)]], // both counted the same steps
  ]);
  const items = selectByPriority(perOrigin, STEP_ORIGIN_PRIORITY);
  assert('(S5a): one item for the day', items.length === 1, `got ${items.length}`);
  assert('(S5a): count is Garmin\'s alone, NOT summed (10507, not 21014)', items[0].count === 10507, String(items[0].count));
  assert('(S5a): sourcePackage is the priority origin (Garmin)', items[0].sourcePackage === GARMIN, items[0].sourcePackage);
  assert('(S5a): dataOrigins lists both, priority-ordered', JSON.stringify(items[0].dataOrigins) === JSON.stringify([GARMIN, SAMSUNG]), JSON.stringify(items[0].dataOrigins));
}

// ── (S5b) priority origin absent on a day → next origin's count ──
{
  const perOrigin = new Map([
    [GARMIN, [ob('2026-09-10', 10507)]],                                  // Garmin only 10 Sep
    [SAMSUNG, [ob('2026-09-10', 10507), ob('2026-09-11', 15589)]],        // Samsung 10 + 11 Sep
  ]);
  const items = selectByPriority(perOrigin, STEP_ORIGIN_PRIORITY);
  const d10 = items.find((i) => i.date === '2026-09-10');
  const d11 = items.find((i) => i.date === '2026-09-11');
  assert('(S5b): 10 Sep -> Garmin (present)', d10.sourcePackage === GARMIN && d10.count === 10507, JSON.stringify(d10));
  assert('(S5b): 11 Sep -> Samsung (Garmin absent that day)', d11.sourcePackage === SAMSUNG && d11.count === 15589, JSON.stringify(d11));
  assert('(S5b): 11 Sep dataOrigins is Samsung only', JSON.stringify(d11.dataOrigins) === JSON.stringify([SAMSUNG]), JSON.stringify(d11.dataOrigins));
}

// ── (S5c) unlisted origins only → first-seen (discovery/insertion) order wins ──
{
  const perOrigin = new Map([
    [FITBIT, [ob('2026-09-10', 500)]],  // first seen
    [OTHER, [ob('2026-09-10', 700)]],   // second seen
  ]);
  const items = selectByPriority(perOrigin, STEP_ORIGIN_PRIORITY);
  assert('(S5c): unlisted winner is first-seen (Fitbit), not the larger count', items[0].sourcePackage === FITBIT && items[0].count === 500, JSON.stringify(items[0]));
  assert('(S5c): dataOrigins in first-seen order', JSON.stringify(items[0].dataOrigins) === JSON.stringify([FITBIT, OTHER]), JSON.stringify(items[0].dataOrigins));
  // listed origin always outranks an unlisted one, whatever the discovery order.
  const mixed = selectByPriority(new Map([[FITBIT, [ob('2026-09-10', 9999)]], [GARMIN, [ob('2026-09-10', 10)]]]), STEP_ORIGIN_PRIORITY);
  assert('(S5c): a listed origin outranks an earlier-seen unlisted one', mixed[0].sourcePackage === GARMIN && mixed[0].count === 10, JSON.stringify(mixed[0]));
}

// ── (S5f) OWN_PACKAGE data is never selected and never listed in dataOrigins ──
{
  const items = selectByPriority(new Map([
    [OWN_PACKAGE, [ob('2026-09-10', 999)]],
    [GARMIN, [ob('2026-09-10', 10507)]],
  ]), STEP_ORIGIN_PRIORITY);
  assert('(S5f): own package never wins', items[0].sourcePackage === GARMIN, items[0].sourcePackage);
  assert('(S5f): own package absent from dataOrigins', !items[0].dataOrigins.includes(OWN_PACKAGE), JSON.stringify(items[0].dataOrigins));
  const ownOnly = selectByPriority(new Map([[OWN_PACKAGE, [ob('2026-09-10', 999)]]]), STEP_ORIGIN_PRIORITY);
  assert('(S5f): a day with only own-package data yields no item', ownOnly.length === 0, JSON.stringify(ownOnly));
}

// ── unionDataOrigins: first-seen union across an unfiltered discovery result ──
{
  const u = unionDataOrigins([bucket('2026-09-10', 5, [SAMSUNG]), bucket('2026-09-11', 6, [GARMIN, SAMSUNG])]);
  assert('unionDataOrigins: first-seen union', JSON.stringify(u) === JSON.stringify([SAMSUNG, GARMIN]), JSON.stringify(u));
  assert('unionDataOrigins: empty/absent safe', JSON.stringify(unionDataOrigins([])) === '[]' && JSON.stringify(unionDataOrigins(null)) === '[]', 'not empty-safe');
}

// ── (S5d) one origin's call throws → others still selected, originErrors set, NO fallback ──
{
  const out = assembleOriginSelection({
    originResults: [
      { origin: GARMIN, buckets: [ob('2026-09-10', 10507)] },
      { origin: SAMSUNG, error: 'aggregate SAMSUNG boom' },
    ],
    discoveryResult: { origins: [GARMIN, SAMSUNG] },
    priority: STEP_ORIGIN_PRIORITY,
  });
  assert('(S5d): surviving origin selected', out.items.length === 1 && out.items[0].sourcePackage === GARMIN && out.items[0].count === 10507, JSON.stringify(out.items));
  assert('(S5d): failed origin recorded in originErrors', out.originErrors[SAMSUNG] === 'aggregate SAMSUNG boom', JSON.stringify(out.originErrors));
  assert('(S5d): origins reports Garmin buckets-with-data', out.origins[GARMIN] === 1, JSON.stringify(out.origins));
  // Through the orchestrator: no fallback, meta surfaces originErrors + selection.
  const res = await fetchStepsWithFallback({
    aggregate: async () => out,
    rawFetch: async () => { throw new Error('raw must not run when one origin survives'); },
    streamMeta,
  });
  assert('(S5d): mode aggregate (no fallback on isolated origin failure)', res.meta.mode === 'aggregate', res.meta.mode);
  assert('(S5d): meta.originErrors surfaced', res.meta.originErrors[SAMSUNG] === 'aggregate SAMSUNG boom', JSON.stringify(res.meta.originErrors));
}

// ── (S5e) every origin call throws → assembleOriginSelection throws → raw fallback ──
{
  let threw = false;
  try {
    assembleOriginSelection({
      originResults: [{ origin: GARMIN, error: 'e1' }, { origin: SAMSUNG, error: 'e2' }],
      discoveryResult: { origins: [] },
      priority: STEP_ORIGIN_PRIORITY,
    });
  } catch (e) { threw = /failed/.test(e.message); }
  assert('(S5e): all-origins-failed throws', threw, 'did not throw on all-failed');
  const res = await fetchStepsWithFallback({
    aggregate: async () => assembleOriginSelection({
      originResults: [{ origin: GARMIN, error: 'e1' }, { origin: SAMSUNG, error: 'e2' }],
      discoveryResult: { origins: [] },
      priority: STEP_ORIGIN_PRIORITY,
    }),
    rawFetch: async () => ({ steps: [{ date: '2026-09-10', count: 1, sourcePackage: GARMIN }], pageInfo: rawPI }),
    streamMeta,
  });
  assert('(S5e): mode raw-fallback when every origin failed', res.meta.mode === 'raw-fallback', res.meta.mode);
  assert('(S5e): aggregateError set, items from raw', /failed/.test(res.meta.aggregateError) && res.steps.length === 1, JSON.stringify(res.meta));
}

// ── (S5h) discovery throws AND all listed origins empty → raw fallback, error names discovery ──
{
  let msg = '';
  try {
    assembleOriginSelection({
      originResults: [{ origin: GARMIN, buckets: [] }, { origin: SAMSUNG, buckets: [] }],
      discoveryResult: { error: 'discovery boom' },
      priority: STEP_ORIGIN_PRIORITY,
    });
  } catch (e) { msg = e.message; }
  assert('(S5h): discovery-fail + all-empty throws, message names discovery', /discovery/i.test(msg), msg);
  // Contrast: discovery fails but a listed origin HAS data → NO throw, _discovery recorded.
  const ok = assembleOriginSelection({
    originResults: [{ origin: GARMIN, buckets: [ob('2026-09-10', 10507)] }, { origin: SAMSUNG, buckets: [] }],
    discoveryResult: { error: 'discovery boom' },
    priority: STEP_ORIGIN_PRIORITY,
  });
  assert('(S5h): discovery-fail but data present -> no throw', ok.items.length === 1 && ok.originErrors._discovery === 'discovery boom', JSON.stringify(ok));
  // Through the orchestrator: raw fallback on discovery-fail + all-empty.
  const res = await fetchStepsWithFallback({
    aggregate: async () => assembleOriginSelection({
      originResults: [{ origin: GARMIN, buckets: [] }, { origin: SAMSUNG, buckets: [] }],
      discoveryResult: { error: 'discovery boom' },
      priority: STEP_ORIGIN_PRIORITY,
    }),
    rawFetch: async () => ({ steps: [{ date: '2026-09-10', count: 1, sourcePackage: GARMIN }], pageInfo: rawPI }),
    streamMeta,
  });
  assert('(S5h): mode raw-fallback', res.meta.mode === 'raw-fallback', res.meta.mode);
  assert('(S5h): aggregateError mentions discovery', /discovery/i.test(res.meta.aggregateError), res.meta.aggregateError);
}

console.log('');
if (failures === 0) {
  console.log('RESULT: PASS — #42 mapping/window/fallback unregressed; #43 selects each day from the highest-priority writer with data (never summed), isolates per-origin failures into originErrors, and falls back to raw only when the read got nothing usable (all origins failed, or discovery failed with no listed data).');
  process.exit(0);
} else {
  console.log(`RESULT: FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
