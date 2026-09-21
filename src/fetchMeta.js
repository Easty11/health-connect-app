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
  };
}
