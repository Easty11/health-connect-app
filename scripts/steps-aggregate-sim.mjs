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

  // Success path for contrast: aggregate returns buckets -> mode aggregate, no aggregateError.
  const ok = await fetchStepsWithFallback({
    aggregate: async () => [bucket('2026-09-11', 8000, [GARMIN]), bucket('2026-09-12', 0, [GARMIN])],
    rawFetch: async () => { throw new Error('raw should not run on aggregate success'); },
    streamMeta,
  });
  assert('(c): success -> mode aggregate', ok.meta.mode === 'aggregate', ok.meta.mode);
  assert('(c): success -> no aggregateError key', !('aggregateError' in ok.meta), JSON.stringify(ok.meta));
  assert('(c): success -> pages 1, not truncated, no failure', ok.meta.pages === 1 && ok.meta.truncated === false && ok.meta.endedOnFailure === false, JSON.stringify(ok.meta));
  assert('(c): success -> zero bucket skipped, 1 item', ok.steps.length === 1 && ok.steps[0].date === '2026-09-11', JSON.stringify(ok.steps));
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

console.log('');
if (failures === 0) {
  console.log('RESULT: PASS — buckets map to {date,count,sourcePackage,dataOrigins?} with empty/zero days skipped; sourcePackage picks single/first-non-own; aggregate throw falls back to raw with mode+aggregateError; local-day window emits Z instants at local-midnight edges for a +10:00 device.');
  process.exit(0);
} else {
  console.log(`RESULT: FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
