// Pure, dependency-free core for the Steps daily-aggregate path (#42). NO
// react-native imports — so it is node-importable and scripts/steps-aggregate-sim.mjs
// exercises THIS code, not a reimplementation (mirrors fetchMeta.js / auth-path-sim.mjs).
//
// Why aggregate at all: Garmin (the chosen priority step source) writes
// zero-count StepsRecords. The Health Connect SDK throws on those in RAW
// deserialisation ("count must not be less than 1, currently 0" — Certain from
// the prod failedDays message; Garmin the Likely writer, prior art xDrip #4351)
// BEFORE the app sees the record, unfilterable app-side. aggregateGroupByPeriod
// reads COUNT_TOTAL per local day and never deserialises the individual poison
// record. `healthConnect.js` (which cannot be imported outside Metro) wires the
// RN aggregateGroupByPeriod call to these.

// This app's own Android package (app.json). Excluded from multi-origin
// attribution so the app — were it ever to write Steps, which it does not — can
// never be named the source of a day it only read.
export const OWN_PACKAGE = 'com.anonymous.healthconnectapp';

/**
 * Build the aggregateGroupByPeriod timeRangeFilter for a [startDate, endDate]
 * span, snapped to LOCAL day boundaries and emitted as Z-suffixed UTC instants.
 *
 * Two things are load-bearing and verified against the react-native-health-connect
 * 3.5.3 Kotlin bridge (#42):
 *   1. Z-suffixed, NOT naive. getAggregateGroupByPeriodRequest routes through
 *      getTimeRangeFilterLocal, which does
 *      `Instant.parse(startTime).atZone(ZoneId.systemDefault()).toLocalDateTime()`.
 *      Instant.parse REQUIRES the Z/offset and throws DateTimeParseException on a
 *      naive ISO; the bridge itself converts the instant to device-local wall
 *      time. `Date.prototype.toISOString()` gives exactly the Z form.
 *   2. startTime MUST be local midnight of the first day. The SDK's period
 *      buckets step from the request startTime by one period, so a mid-day start
 *      yields mid-day buckets, not calendar days. endTime is local midnight AFTER
 *      endDate's day, so endDate's (today's) partial day is a whole bucket.
 *
 * `now`-relative Dates are floored in the runtime's local zone (= the device's
 * systemDefault on-device); TZ-injectable for the sim.
 */
export function localDayFilter(startDate, endDate) {
  const startMidnight = new Date(startDate);
  startMidnight.setHours(0, 0, 0, 0);
  const endMidnight = new Date(endDate);
  endMidnight.setHours(0, 0, 0, 0);
  endMidnight.setDate(endMidnight.getDate() + 1); // local midnight AFTER endDate's day
  return {
    operator: 'between',
    startTime: startMidnight.toISOString(),
    endTime: endMidnight.toISOString(),
  };
}

/**
 * Pick the sourcePackage for an aggregate bucket from its dataOrigins set.
 *   single origin  -> that package
 *   multiple       -> the first origin that is not our own package (lean, #42)
 *   none           -> null
 * Aggregate mode CANNOT rank origins by step count (COUNT_TOTAL is one deduped
 * total), so this lean pick is arbitrary among multiple origins; the full set
 * travels as `dataOrigins` (V4: backend per-item model is extra="allow"). The
 * backend's F1 dedup reads only the single sourcePackage string today, so when
 * multiple sources contribute a day, aggregate mode cannot influence which F1
 * keeps beyond this pick (Q22). Garmin, the priority source, is the sole or
 * first origin on the days that matter, so this is low-risk in practice.
 */
export function pickSourcePackage(dataOrigins) {
  const origins = Array.isArray(dataOrigins) ? dataOrigins.filter((o) => o != null) : [];
  if (origins.length === 0) return null;
  if (origins.length === 1) return origins[0];
  return origins.find((o) => o !== OWN_PACKAGE) ?? origins[0];
}

/**
 * Map one aggregateGroupByPeriod bucket to the existing per-day Steps item shape
 * { date, count, sourcePackage, dataOrigins? }. `count` (NOT `steps`) is the
 * canonical field the backend requires. Returns null — SKIP — for a bucket whose
 * COUNT_TOTAL is 0 or absent (a day with no steps).
 *
 * The bucket's startTime is a naive LocalDateTime string from the bridge (e.g.
 * '2026-09-12T00:00'), so its first 10 chars ARE the local day — no offset
 * reconstruction needed. `dataOrigins` is carried only when non-empty.
 */
export function bucketToItem(bucket) {
  const count = bucket?.result?.COUNT_TOTAL;
  if (count == null || count === 0) return null;
  const startTime = bucket?.startTime;
  const date = typeof startTime === 'string' ? startTime.slice(0, 10) : null;
  if (!date) return null;
  const dataOrigins = Array.isArray(bucket?.result?.dataOrigins)
    ? bucket.result.dataOrigins.filter((o) => o != null)
    : [];
  const item = { date, count, sourcePackage: pickSourcePackage(dataOrigins) };
  if (dataOrigins.length > 0) item.dataOrigins = dataOrigins;
  return item;
}

/**
 * Map a full aggregateGroupByPeriod result to per-day items, skipping empty
 * buckets. Buckets may be sparse (a day with no data has no bucket) or
 * dense-with-empties depending on the underlying androidx.health SDK build — not
 * verifiable from the RN package, which forwards the SDK list verbatim (#42 V3).
 * The empty-bucket skip makes the output identical either way.
 */
export function bucketsToItems(buckets) {
  return (Array.isArray(buckets) ? buckets : []).map(bucketToItem).filter(Boolean);
}

/**
 * Orchestrate the aggregate read with a raw-path fallback. Pure and injectable —
 * so the sim exercises the real branch logic, source-bound like paginate's
 * reader. healthConnect.js injects the RN aggregateGroupByPeriod, the existing
 * raw safeFetch+aggregateSteps path (kept as the ONLY fallback, #42), and the
 * real streamMeta.
 *
 * deps:
 *   aggregate() -> Promise<buckets[]>            (may throw — the Garmin poison record)
 *   rawFetch()  -> Promise<{ steps, pageInfo }>  (raw path incl. #41 slice-resume)
 *   streamMeta(dates, pageInfo) -> per-stream meta entry
 *
 * Returns { steps, meta }. On success meta.mode='aggregate'; when aggregate()
 * throws, the raw path runs and meta = raw path's streamMeta + mode:'raw-fallback'
 * + aggregateError:<message>. Additive fields only — nothing renamed. No log here
 * (pure); the caller logs the fallback, mirroring fetchMeta.js/healthConnect.js.
 */
export async function fetchStepsWithFallback({ aggregate, rawFetch, streamMeta }) {
  try {
    const buckets = await aggregate();
    const steps = bucketsToItems(buckets);
    const meta = {
      ...streamMeta(steps.map((s) => s.date), {
        pages: 1, truncated: false, endedOnFailure: false, error: null,
      }),
      mode: 'aggregate',
    };
    return { steps, meta };
  } catch (aggErr) {
    const aggregateError = aggErr?.message ?? String(aggErr);
    const { steps, pageInfo } = await rawFetch();
    const meta = {
      ...streamMeta(steps.map((s) => s.date), pageInfo),
      mode: 'raw-fallback',
      aggregateError,
    };
    return { steps, meta };
  }
}
