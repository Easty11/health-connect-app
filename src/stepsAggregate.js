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

// Per-day step-writer priority (#43). Each day's count is taken from the FIRST
// origin in this list that has data that day — never a sum across writers (the
// #42 defect: HC's COUNT_TOTAL over all origins summed Samsung + Garmin on days
// both counted the same steps). Garmin first: the watch is worn when the phone
// isn't, so it is the fuller record; Samsung Health (phone/ring) is the fill-in.
// An origin not listed here ranks AFTER every listed origin, in first-seen
// (discovery) order. OWN_PACKAGE never ranks (see selectByPriority).
export const STEP_ORIGIN_PRIORITY = [
  'com.garmin.android.apps.connectmobile',
  'com.sec.android.app.shealth',
];

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
 * SUPERSEDED in the aggregate path by selectByPriority (#43), which ranks origins
 * by STEP_ORIGIN_PRIORITY across per-origin reads instead of guessing from one
 * summed bucket's origin set. Retained: still used by bucketToItem (single-origin
 * per-origin buckets → that origin) and covered by its own sim assertions.
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
 * Union of the dataOrigins seen across an unfiltered aggregateGroupByPeriod
 * result, in first-seen order (the discovery call, #43). Used to find origins
 * beyond STEP_ORIGIN_PRIORITY that also wrote steps in the window.
 */
export function unionDataOrigins(buckets) {
  const seen = [];
  for (const b of Array.isArray(buckets) ? buckets : []) {
    const origins = Array.isArray(b?.result?.dataOrigins) ? b.result.dataOrigins : [];
    for (const o of origins) {
      if (o != null && !seen.includes(o)) seen.push(o);
    }
  }
  return seen;
}

/**
 * Per-day selection by writer priority (#43). `perOrigin` is a Map<origin,
 * buckets[]> — one aggregateGroupByPeriod result per origin (each read with
 * dataOriginFilter:[origin], so its buckets carry only that origin's steps).
 * Map insertion order IS the discovery order, which decides the first-seen
 * ranking of unlisted origins.
 *
 * For each local day, the count is taken from the FIRST origin (by rank) that
 * has a bucket with COUNT_TOTAL > 0 that day — never a sum across origins. Rank:
 * an origin in `priority` ranks by its index there; an unlisted origin ranks
 * after all listed ones, by its first-seen position. OWN_PACKAGE never ranks and
 * is dropped entirely (the app only reads; it must never be named a step source).
 *
 * Emits the #42 item shape { date, count, sourcePackage:<winning origin>,
 * dataOrigins:<every ranking origin with data that day, by rank> }, ascending by
 * date. dataOrigins excludes OWN_PACKAGE for the same reason it never wins.
 */
export function selectByPriority(perOrigin, priority) {
  const listed = Array.isArray(priority) ? priority : [];
  // Ranking universe: listed origins first (in priority order), then the
  // remaining perOrigin keys in insertion/discovery order. OWN_PACKAGE excluded.
  const keys = perOrigin instanceof Map ? [...perOrigin.keys()] : [];
  const unlisted = keys.filter((o) => o !== OWN_PACKAGE && !listed.includes(o));
  const rankOf = (o) => {
    const i = listed.indexOf(o);
    return i !== -1 ? i : listed.length + unlisted.indexOf(o);
  };

  // date -> Map<origin, count>  (only origins with COUNT_TOTAL > 0 that day)
  const byDay = new Map();
  for (const [origin, buckets] of perOrigin instanceof Map ? perOrigin : []) {
    if (origin === OWN_PACKAGE) continue;
    for (const b of Array.isArray(buckets) ? buckets : []) {
      const item = bucketToItem(b); // null on 0/absent count; extracts date+count
      if (!item) continue;
      if (!byDay.has(item.date)) byDay.set(item.date, new Map());
      byDay.get(item.date).set(origin, item.count);
    }
  }

  const items = [];
  for (const date of [...byDay.keys()].sort()) {
    const perOriginCounts = byDay.get(date);
    const candidates = [...perOriginCounts.keys()].sort((a, b) => rankOf(a) - rankOf(b));
    const winner = candidates[0];
    items.push({
      date,
      count: perOriginCounts.get(winner),
      sourcePackage: winner,
      dataOrigins: candidates,
    });
  }
  return items;
}

/**
 * Assemble the priority selection from the (already caught) per-origin reads and
 * the discovery read, deciding when to hand off to the raw fallback (#43). Pure
 * and node-importable so the fallback decision is source-bound (sim S5 d/e/h).
 *
 *   originResults: [{ origin, buckets } | { origin, error }]   (the filtered reads)
 *   discoveryResult: { origins: string[] } | { error }         (the unfiltered read)
 *   priority: STEP_ORIGIN_PRIORITY
 *
 * Returns { items, origins:{[origin]: bucketsWithData}, originErrors:{[origin]:
 * message} }. A single origin failing is isolated (recorded in originErrors, that
 * origin treated as no data). THROWS — so fetchStepsWithFallback falls back to raw
 * — only when the read got nothing usable: every filtered call threw, OR the
 * discovery call threw AND no listed origin returned any data (that run may have
 * missed an unlisted writer, so POSTing an empty steps array would be wrong).
 */
export function assembleOriginSelection({ originResults, discoveryResult, priority }) {
  const results = Array.isArray(originResults) ? originResults : [];
  const perOrigin = new Map();
  const originErrors = {};
  let anySuccess = false;
  for (const r of results) {
    if (r?.error != null) { originErrors[r.origin] = r.error; continue; }
    anySuccess = true;
    perOrigin.set(r.origin, Array.isArray(r.buckets) ? r.buckets : []);
  }

  const discoveryFailed = discoveryResult?.error != null;
  if (discoveryFailed) originErrors._discovery = discoveryResult.error;

  const items = selectByPriority(perOrigin, priority);

  if (results.length > 0 && !anySuccess) {
    throw new Error(`all ${results.length} Steps origin aggregate call(s) failed: ${JSON.stringify(originErrors)}`);
  }
  if (discoveryFailed && items.length === 0) {
    throw new Error(`Steps discovery aggregate call failed (${discoveryResult.error}) and no listed origin returned data`);
  }

  const origins = {};
  for (const [o, buckets] of perOrigin) {
    origins[o] = buckets.filter((b) => bucketToItem(b) != null).length;
  }
  return { items, origins, originErrors };
}

/**
 * Orchestrate the aggregate read with a raw-path fallback. Pure and injectable —
 * so the sim exercises the real branch logic, source-bound like paginate's
 * reader. healthConnect.js injects the RN per-origin aggregate (via
 * assembleOriginSelection), the existing raw safeFetch+aggregateSteps path (kept
 * as the ONLY fallback, #42), and the real streamMeta.
 *
 * deps:
 *   aggregate() -> Promise<{ items, origins, originErrors }>  (#43; may throw ->
 *                  raw fallback when the whole read got nothing usable)
 *   rawFetch()  -> Promise<{ steps, pageInfo }>               (raw path incl. #41 slice-resume)
 *   streamMeta(dates, pageInfo) -> per-stream meta entry
 *
 * Returns { steps, meta }. On success meta.mode='aggregate' with additive
 * origins/originErrors/selection:'priority'; when aggregate() throws, the raw path
 * runs and meta = raw path's streamMeta + mode:'raw-fallback' + aggregateError.
 * Additive fields only — nothing renamed. No log here (pure); the caller logs.
 */
export async function fetchStepsWithFallback({ aggregate, rawFetch, streamMeta }) {
  try {
    const { items, origins, originErrors } = await aggregate();
    const meta = {
      ...streamMeta(items.map((s) => s.date), {
        pages: 1, truncated: false, endedOnFailure: false, error: null,
      }),
      mode: 'aggregate',
      origins,
      originErrors,
      selection: 'priority',
    };
    return { steps: items, meta };
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
