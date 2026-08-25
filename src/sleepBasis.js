/**
 * sleepBasis.js
 * -----------------------------------------------------------------------------
 * Sleep-basis window validity gate.
 *
 * Answers one question, reproducibly: over a span of calendar nights (the
 * `basis_window`), do we hold ENOUGH valid nights of sleep data to form a
 * basis — a baseline the analytics layer is allowed to build on?
 *
 * Pure and source-agnostic (mirrors flagDeepSegments in ./deepSleepConfidence):
 * no I/O, no device coupling. Each night carries a `source` tag that is passed
 * through and NEVER branched on — the evaluator classifies on the physiological
 * values alone, so a Health Connect night and a scraper night are gated by the
 * same rule (architecture invariant: device agnosticism).
 *
 * GATE FIRST: the thresholds below are UNCALIBRATED. Run evaluateSleepBasis()
 * over a handful of trusted nights and eyeball the per-night reason_codes before
 * wiring the outcome into readiness / anything downstream. When a threshold is
 * changed, BUMP RULESET_VERSION in the same commit — the version is what lets a
 * stored outcome be reproduced against the rules that produced it.
 *
 * Schema returned (the task contract):
 *   basis_window: { start, end, nights_required }
 *   nights: [ { date, status, reason_code, evidence,
 *               sleep_efficiency, time_in_bed, total_sleep, source } ]
 *   nights_valid, nights_required, outcome, outcome_reason
 *   ruleset_version
 * -----------------------------------------------------------------------------
 */

// --- Ruleset version ---------------------------------------------------------
// Frozen identifier for the gate below. ANY change to a threshold, a reason
// code, or the outcome policy MUST bump this in the same commit so a stored
// outcome remains reproducible against the rules that produced it.
export const RULESET_VERSION = 'sleep-basis/2026-08-25.1';

// --- Tunables (UNCALIBRATED — calibrate against trusted nights, then freeze) --
// Quality floors: a night below either is real data but too poor to seed a basis.
const MIN_TOTAL_SLEEP_MIN = 180; // < 3 h asleep => not a usable basis night
const MIN_SLEEP_EFFICIENCY = 0.6; // asleep / in-bed floor (fraction, 0..1)

// Plausibility bounds: a night outside these is a capture/parse artifact, not a
// quality problem. The time-in-bed ceiling is deliberately tight enough to trip
// the Q19 class of defect — a meridiem-less 12-h clock that renders a 465-min
// night as ~1185 min in bed lands well above MAX_TIME_IN_BED_MIN and is rejected
// as IMPLAUSIBLE rather than counted as a long, valid night.
const MIN_TIME_IN_BED_MIN = 60; // < 1 h in bed => not a night
const MAX_TIME_IN_BED_MIN = 16 * 60; // > 16 h in bed => artifact

// --- Reason codes (machine-readable; `evidence` carries the human string) -----
export const ReasonCode = Object.freeze({
  VALID: 'VALID',
  MISSING: 'MISSING', // no record for this calendar date in the window
  IMPLAUSIBLE: 'IMPLAUSIBLE', // values fail a physiological sanity bound
  SHORT_SLEEP: 'SHORT_SLEEP', // total_sleep below the floor
  LOW_EFFICIENCY: 'LOW_EFFICIENCY', // sleep_efficiency below the floor
});

const Status = Object.freeze({ VALID: 'valid', INVALID: 'invalid' });
const Outcome = Object.freeze({ SUFFICIENT: 'SUFFICIENT', INSUFFICIENT: 'INSUFFICIENT' });

// --- date helpers (UTC calendar dates, TZ-drift-free) ------------------------

function toUTCDate(dateStr) {
  // Accepts 'YYYY-MM-DD' (or any ISO prefix); anchors to UTC midnight.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

// Every calendar date in [start, end] inclusive, as 'YYYY-MM-DD' strings.
function enumerateNights(start, end) {
  const s = toUTCDate(start);
  const e = toUTCDate(end);
  if (!s || !e || s > e) return [];
  const out = [];
  for (let d = s; d <= e; d = new Date(d.getTime() + 86400000)) out.push(ymd(d));
  return out;
}

function isFiniteNum(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

// --- per-night classification (pure) -----------------------------------------
//
// Precedence, most-severe first: MISSING > IMPLAUSIBLE > SHORT_SLEEP >
// LOW_EFFICIENCY > VALID. The first failing gate wins, so `reason_code` names
// the single dominant reason a night did not count.
function classifyNight(observed) {
  if (!observed) {
    return { status: Status.INVALID, reason_code: ReasonCode.MISSING, evidence: 'no sleep record for this date' };
  }

  const tib = observed.time_in_bed;
  const tst = observed.total_sleep;

  // Efficiency: use the reported value if finite, else derive asleep / in-bed.
  let eff = observed.sleep_efficiency;
  if (!isFiniteNum(eff) && isFiniteNum(tst) && isFiniteNum(tib) && tib > 0) {
    eff = tst / tib;
  }

  // Plausibility first — a bad capture must not be read as a quality signal.
  if (!isFiniteNum(tib) || !isFiniteNum(tst)) {
    return { status: Status.INVALID, reason_code: ReasonCode.IMPLAUSIBLE, evidence: 'non-finite time_in_bed or total_sleep' };
  }
  if (tib < MIN_TIME_IN_BED_MIN || tib > MAX_TIME_IN_BED_MIN) {
    return {
      status: Status.INVALID,
      reason_code: ReasonCode.IMPLAUSIBLE,
      evidence: `time_in_bed ${Math.round(tib)} min outside [${MIN_TIME_IN_BED_MIN}, ${MAX_TIME_IN_BED_MIN}]`,
    };
  }
  if (tst < 0 || tst > tib) {
    return {
      status: Status.INVALID,
      reason_code: ReasonCode.IMPLAUSIBLE,
      evidence: `total_sleep ${Math.round(tst)} min exceeds time_in_bed ${Math.round(tib)} min`,
    };
  }

  // Quality floors.
  if (tst < MIN_TOTAL_SLEEP_MIN) {
    return {
      status: Status.INVALID,
      reason_code: ReasonCode.SHORT_SLEEP,
      evidence: `total_sleep ${Math.round(tst)} min below ${MIN_TOTAL_SLEEP_MIN} min floor`,
    };
  }
  if (isFiniteNum(eff) && eff < MIN_SLEEP_EFFICIENCY) {
    return {
      status: Status.INVALID,
      reason_code: ReasonCode.LOW_EFFICIENCY,
      evidence: `sleep_efficiency ${(eff * 100).toFixed(0)}% below ${(MIN_SLEEP_EFFICIENCY * 100).toFixed(0)}% floor`,
    };
  }

  return {
    status: Status.VALID,
    reason_code: ReasonCode.VALID,
    evidence: `${Math.round(tst)} min asleep, ${(eff * 100).toFixed(0)}% efficiency`,
  };
}

// De-dup observed nights by date. If a date appears more than once, keep the
// record with the greatest total_sleep — same max-by-duration rule the backend
// and collapseSleepSessions() use, so basis and deep-confidence agree on which
// record represents a night.
function indexByDate(observedNights) {
  const byDate = new Map();
  for (const n of observedNights ?? []) {
    const key = ymd(toUTCDate(n.date) ?? new Date(NaN));
    if (key === 'Invalid') continue;
    const prev = byDate.get(key);
    const prevTst = isFiniteNum(prev?.total_sleep) ? prev.total_sleep : -Infinity;
    const curTst = isFiniteNum(n.total_sleep) ? n.total_sleep : -Infinity;
    if (!prev || curTst > prevTst) byDate.set(key, n);
  }
  return byDate;
}

// =============================================================================
// Evaluate one basis window (pure — no I/O). This is the entry point.
// =============================================================================
//
//   basisWindow    { start, end, nights_required }  'YYYY-MM-DD' dates inclusive
//   observedNights [ { date, sleep_efficiency, time_in_bed, total_sleep, source } ]
//
// Returns the full schema object documented at the top of this file.
export function evaluateSleepBasis(basisWindow, observedNights) {
  const { start, end } = basisWindow || {};
  const nights_required = Number.isInteger(basisWindow?.nights_required)
    ? basisWindow.nights_required
    : 0;

  const dates = enumerateNights(start, end);
  const byDate = indexByDate(observedNights);

  const nights = dates.map((date) => {
    const observed = byDate.get(date) || null;
    const verdict = classifyNight(observed);
    return {
      date,
      status: verdict.status,
      reason_code: verdict.reason_code,
      evidence: verdict.evidence,
      sleep_efficiency: observed ? (observed.sleep_efficiency ?? null) : null,
      time_in_bed: observed ? (observed.time_in_bed ?? null) : null,
      total_sleep: observed ? (observed.total_sleep ?? null) : null,
      source: observed ? (observed.source ?? null) : null,
    };
  });

  const nights_valid = nights.filter((n) => n.status === Status.VALID).length;
  const sufficient = nights_valid >= nights_required;
  const outcome = sufficient ? Outcome.SUFFICIENT : Outcome.INSUFFICIENT;

  // Human summary: the count, and — when short — the dominant failure reasons so
  // the shortfall is legible without walking the per-night array.
  let outcome_reason;
  if (sufficient) {
    outcome_reason = `${nights_valid}/${dates.length} valid nights meets the ${nights_required}-night basis`;
  } else {
    const tally = {};
    for (const n of nights) {
      if (n.status !== Status.VALID) tally[n.reason_code] = (tally[n.reason_code] || 0) + 1;
    }
    const breakdown = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => `${count} ${code}`)
      .join(', ');
    outcome_reason =
      `${nights_valid}/${dates.length} valid nights below the ${nights_required}-night minimum` +
      (breakdown ? ` (${breakdown})` : '');
  }

  return {
    basis_window: { start: start ?? null, end: end ?? null, nights_required },
    nights,
    nights_valid,
    nights_required,
    outcome,
    outcome_reason,
    ruleset_version: RULESET_VERSION,
  };
}

export { Status, Outcome };
