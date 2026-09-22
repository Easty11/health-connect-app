// Pure, dependency-free core for Health Connect pagination + per-stream fetch
// telemetry. NO react-native imports — so it is node-importable and the
// fetch-meta sim exercises THIS code, not a reimplementation (mirrors the
// source-binding discipline of auth-path-sim.mjs).
//
// `healthConnect.js` (which cannot be imported outside Metro) consumes these.

// Health Connect mirrors the Android SDK default pageSize=1000 and returns a
// pageToken once a type exceeds one page. Default order is ASCENDING, so a short
// read keeps the OLDEST records and drops the recent end — which is exactly the
// silent truncation these diagnostics make visible. (DECISIONS_LOG #38.)
export const HC_PAGE_SIZE = 1000;
// Safety cap against a pathological non-terminating pageToken. Hitting it means
// the fetch is truncated, so it sets the truncation flag rather than spinning.
export const HC_MAX_PAGES = 100;

/**
 * Drive a readRecords-shaped reader through every page.
 *
 * `reader` is injectable so the pure logic is testable:
 *   reader({ timeRangeFilter, pageSize, pageToken }) -> { records, pageToken }
 *
 * Returns { records, pages, truncated, endedOnFailure, error }:
 *   - endedOnFailure: a page read threw; the accumulation so far is still
 *     returned (never discarded), but it is a PARTIAL of the window.
 *   - truncated: endedOnFailure OR the page cap was hit with a token still set —
 *     i.e. the returned records are less than the full window. A clean full fetch
 *     is truncated:false.
 */
export async function paginate(
  reader,
  timeRangeFilter,
  { pageSize = HC_PAGE_SIZE, maxPages = HC_MAX_PAGES } = {},
) {
  const records = [];
  let pageToken;
  let pages = 0;
  let endedOnFailure = false;
  let cappedTruncation = false;
  let error = null;
  try {
    do {
      const result = await reader({ timeRangeFilter, pageSize, pageToken });
      records.push(...result.records);
      pageToken = result.pageToken;
      pages += 1;
      if (pages >= maxPages && pageToken) {
        cappedTruncation = true;
        break;
      }
    } while (pageToken);
  } catch (err) {
    endedOnFailure = true;
    error = err?.message ?? String(err);
  }
  return {
    records,
    pages,
    truncated: endedOnFailure || cappedTruncation,
    endedOnFailure,
    error,
  };
}

/**
 * Build the per-stream `fetchMeta` entry from the timestamps of the records AS
 * POSTED (post-mapping/flatten) and the page telemetry from `paginate`.
 *
 * `received` is the posted array length (matches the backend's `received`
 * counter, which counts len(payload[stream]) regardless of null timestamps).
 * `oldestAt`/`newestAt` are the min/max primary ISO timestamp, null when the
 * stream is empty. Comparison is by parsed epoch, not lexicographic, so mixed
 * zone offsets cannot mis-order the range; the reported value is the original
 * ISO string.
 */
export function streamMeta(times, pageInfo) {
  let oldestAt = null;
  let newestAt = null;
  let oMin = Infinity;
  let oMax = -Infinity;
  for (const t of times) {
    if (t == null) continue;
    const ms = Date.parse(t);
    if (Number.isNaN(ms)) continue;
    if (ms < oMin) { oMin = ms; oldestAt = t; }
    if (ms > oMax) { oMax = ms; newestAt = t; }
  }
  return {
    received: times.length,
    oldestAt,
    newestAt,
    pages: pageInfo.pages,
    truncated: pageInfo.truncated,
    endedOnFailure: pageInfo.endedOnFailure,
    // Carried from the fetch so an on-device failure is observable in the
    // payload (a release APK emits no ReactNativeJS logcat). Defaults keep the
    // pre-slicing pageInfo callers (and the older sim assertions) working.
    error: pageInfo.error ?? null,
    // Populated by paginateWithSlicing: days the slice-resume could not read,
    // and whether the slicing path ran at all.
    failedDays: pageInfo.failedDays ?? [],
    sliced: pageInfo.sliced ?? false,
  };
}

// The last-good-record anchor for the slice resume. Interval records (Steps,
// SleepSession, HeartRate, ExerciseSession) carry `startTime`; instantaneous
// records (HRV, RestingHeartRate, OxygenSaturation, RespiratoryRate) carry
// `time`. The seam runs for every stream, so anchor on either.
function recordStart(r) {
  return r?.startTime ?? r?.time ?? null;
}

// Seam-dedup key. Prefer the stable Health Connect record id; when absent, the
// whole record serialised — a re-fetch of the same physical record is
// byte-identical (including metadata.lastModifiedTime), so this dedups the
// re-covered record exactly and never merges two genuinely distinct records.
function seamKey(r) {
  const id = r?.metadata?.id;
  return JSON.stringify([
    r?.startTime ?? null,
    r?.endTime ?? null,
    id != null ? id : JSON.stringify(r),
  ]);
}

// Split [startISO, endISO) into UTC-day slices. The first slice may begin
// mid-day (it resumes from the last good record's timestamp) and the last may
// end mid-day (the window end); interior slices are whole UTC days.
function utcDaySlices(startISO, endISO) {
  const slices = [];
  let cursor = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (Number.isNaN(cursor) || Number.isNaN(end) || cursor >= end) return slices;
  while (cursor < end) {
    const d = new Date(cursor);
    const nextMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
    const sliceEnd = Math.min(nextMidnight, end);
    slices.push({
      day: new Date(cursor).toISOString().slice(0, 10),
      startTime: new Date(cursor).toISOString(),
      endTime: new Date(sliceEnd).toISOString(),
    });
    cursor = sliceEnd;
  }
  return slices;
}

/**
 * paginate() with a slice-on-failure resume, so a single poison page cannot
 * lose the rest of the window (the deterministic Steps 30d deep-sync failure,
 * Q22). Wraps paginate() and never changes its behaviour on a clean fetch.
 *
 * On `endedOnFailure` from the initial paged fetch, resume from the last good
 * record (or the whole window if none accumulated) in per-day UTC slices, each
 * a fresh paginate() call. A slice that itself fails is recorded in
 * `failedDays` and skipped; successful slices are appended. No retry, no
 * backoff, no newest-first — a poison page is deterministic, so slicing pins
 * the unreadable day rather than re-hitting it.
 *
 * Returns paginate()'s shape plus:
 *   - failedDays: [{ day: 'YYYY-MM-DD', error }]  (days the resume could not read)
 *   - sliced: whether the slicing path ran
 * Semantics: endedOnFailure = the INITIAL paged fetch threw; truncated = any
 * failedDays remain OR a page cap was hit; error = the first failure.
 */
export async function paginateWithSlicing(reader, timeRangeFilter, opts = {}) {
  const initial = await paginate(reader, timeRangeFilter, opts);

  if (!initial.endedOnFailure) {
    // Clean (or cap-truncated) fetch: paginate()'s output verbatim, plus the
    // two additive fields. No slicing.
    return { ...initial, failedDays: [], sliced: false };
  }

  // ── slice-on-failure resume ──
  const windowEndISO = timeRangeFilter?.endTime ?? null;

  // Resume anchor: the newest good record's timestamp, else the window start.
  let resumeStartISO = timeRangeFilter?.startTime ?? null;
  let maxMs = -Infinity;
  for (const r of initial.records) {
    const t = recordStart(r);
    const ms = t == null ? NaN : Date.parse(t);
    if (!Number.isNaN(ms) && ms > maxMs) { maxMs = ms; resumeStartISO = t; }
  }

  const slices = windowEndISO ? utcDaySlices(resumeStartISO, windowEndISO) : [];

  const records = [...initial.records];
  const seen = new Set(records.map(seamKey));
  const failedDays = [];
  let pages = initial.pages;
  let cappedHit = false;

  for (const slice of slices) {
    const sliceResult = await paginate(
      reader,
      { ...timeRangeFilter, startTime: slice.startTime, endTime: slice.endTime },
      opts,
    );
    pages += sliceResult.pages;

    if (sliceResult.endedOnFailure) {
      // Unreadable day: name it, drop its partial, keep going.
      failedDays.push({ day: slice.day, error: sliceResult.error });
      continue;
    }
    if (sliceResult.truncated) cappedHit = true; // page cap inside a slice

    // Append in fetch order (ascending), deduping the seam re-cover.
    for (const r of sliceResult.records) {
      const key = seamKey(r);
      if (seen.has(key)) continue;
      seen.add(key);
      records.push(r);
    }
  }

  return {
    records,
    pages,
    truncated: failedDays.length > 0 || cappedHit,
    endedOnFailure: initial.endedOnFailure,
    error: initial.error,
    failedDays,
    sliced: true,
  };
}
