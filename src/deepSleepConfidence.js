/**
 * deepSleepConfidence.js
 * -----------------------------------------------------------------------------
 * Health Connect deep-sleep artifact flagging.
 *
 * Decides whether each DEEP segment Samsung wrote to Health Connect is real
 * slow-wave sleep or a staging artifact, using per-sample HR (HR is NOT gated
 * by Samsung the way HRV is).
 *
 * Ported from the deepSleepConfidence.ts spec. Init + permissions + record
 * reads are REUSED from ./healthConnect — this module does not re-implement
 * initialize()/requestPermission().
 *
 * GATE FIRST: run validateNight() for one night and read the diagnostic before
 * trusting any stage constant or wiring anything downstream. The diagnostic is
 * deliberately constant-agnostic — it reports a per-stage-integer breakdown so
 * the on-device read itself settles which integer carries DEEP.
 * -----------------------------------------------------------------------------
 */

import {
  initializeHealthConnect,
  requestPermissions,
  fetchSleepData,
  fetchHeartRateData,
} from './healthConnect';
import { SleepStageType as STAGE } from './contract/sleepStages.generated';

// --- Tunables (UNCALIBRATED — calibrate against 3-4 trusted nights, then freeze) -
const HR_NADIR_PCT = 0.1; // 10th percentile = robust nightly HR floor
const DELTA_ARTIFACT = 6; // deep HR median this far ABOVE nadir => suspect
const SPREAD_SPIKE = 10; // intra-segment HR range => micro-arousal inside
const SHORT_MS = 3 * 60 * 1000; // sliver cutoff
const MARGIN_MS = 60 * 1000; // HR window padding around a segment

// --- helpers -----------------------------------------------------------------

function toMs(iso) {
  return +new Date(iso);
}

function medianGapSec(timesMs) {
  const sorted = [...timesMs].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  return Math.round(gaps[gaps.length >> 1] / 1000);
}

function sessionDurMin(s) {
  return s.durationMinutes != null
    ? s.durationMinutes
    : (toMs(s.endTime) - toMs(s.startTime)) / 60000;
}

// =============================================================================
// De-dup overlapping / duplicate SleepSession records (Q2).
// =============================================================================
//
// Samsung sometimes writes several SleepSession records covering the same night
// (a full-night record plus partial/duplicate copies). Flattening stages across
// ALL of them double-counts deep/REM minutes downstream in validateNight() and
// runDeepConfidence().
//
// Mirrors the backend canonical rule
// (health-app/backend/routers/health_connect.py:_aggregate_day —
// `best = max(day_sleep, key=lambda s: s.duration())`): collapse each cluster of
// overlapping sessions to the single LONGEST session, before any stage flatten.
//
// Pure and source-agnostic — operates on {startTime,endTime,durationMinutes}
// only, no device coupling. Returns one session per night, zero overlaps.
export function collapseSleepSessions(sleep) {
  if (!Array.isArray(sleep) || sleep.length <= 1) return sleep ?? [];

  // Sort by start, then greedily cluster any sessions that overlap in time.
  const sorted = [...sleep].sort((a, b) => toMs(a.startTime) - toMs(b.startTime));
  const clusters = [];
  let cur = [sorted[0]];
  let curEnd = toMs(sorted[0].endTime);
  for (let i = 1; i < sorted.length; i++) {
    const s = sorted[i];
    if (toMs(s.startTime) < curEnd) {
      cur.push(s);
      curEnd = Math.max(curEnd, toMs(s.endTime));
    } else {
      clusters.push(cur);
      cur = [s];
      curEnd = toMs(s.endTime);
    }
  }
  clusters.push(cur);

  // One session per cluster: the longest (backend's max-by-duration rule).
  return clusters.map((c) =>
    c.reduce((best, s) => (sessionDurMin(s) > sessionDurMin(best) ? s : best)),
  );
}

// =============================================================================
// Step 0: VALIDATION HARNESS — run this FIRST, one night, before anything else.
// =============================================================================
//
// Confirms, from the raw on-device read:
//   1. distinctStageValues   — which stage integers HC actually delivers
//                              (settles DEEP=4 vs DEEP=5 via perStage below).
//   2. deepSegmentCount      — did the thin deep slivers survive the HC write,
//                              or did HC flatten the hypnogram? (capped here if so)
//   3. hrMedianGapSec        — HR sampling density during sleep (60 = 1/min).
//
// Reuses initializeHealthConnect()/requestPermissions() from ./healthConnect.
export async function validateNight(startISO, endISO) {
  await initializeHealthConnect();
  await requestPermissions();

  const start = new Date(startISO);
  const end = new Date(endISO);

  const rawSleep = await fetchSleepData(start, end); // [{startTime,endTime,stages,durationMinutes}]
  const sleep = collapseSleepSessions(rawSleep); // Q2: one session per night, zero overlaps
  const hr = await fetchHeartRateData(start, end); // [{time, bpm}]

  const stages = sleep.flatMap((r) => r.stages ?? []);

  // Per-stage-integer breakdown — the constant-agnostic arbiter.
  // For each raw `stage` value: how many segments, total minutes, and how many
  // are slivers (< SHORT_MS). Whichever integer carries the small deep-sized
  // block (vs the large light-sized block) is the real DEEP for this device.
  const perStage = {};
  for (const s of stages) {
    const durMin = (toMs(s.endTime) - toMs(s.startTime)) / 60000;
    const k = String(s.stage);
    if (!perStage[k]) perStage[k] = { segments: 0, totalMin: 0, slivers: 0, durMin: [] };
    perStage[k].segments += 1;
    perStage[k].totalMin += durMin;
    if (toMs(s.endTime) - toMs(s.startTime) < SHORT_MS) perStage[k].slivers += 1;
    perStage[k].durMin.push(+durMin.toFixed(1));
  }
  for (const k of Object.keys(perStage)) {
    perStage[k].totalMin = +perStage[k].totalMin.toFixed(1);
  }

  const deepFor = (stageVal) => {
    const seg = stages.filter((s) => s.stage === stageVal);
    return {
      segments: seg.length,
      totalMin: +(
        seg.reduce((a, s) => a + (toMs(s.endTime) - toMs(s.startTime)), 0) / 60000
      ).toFixed(1),
    };
  };

  const hrTimes = hr.map((s) => toMs(s.time));

  const diag = {
    window: { startISO, endISO },
    rawSleepRecords: rawSleep.length, // Q2: records before de-dup
    sleepRecords: sleep.length, // after de-dup — should be one per night
    totalStageSegments: stages.length,
    // GATE 1 — confirm enum / which integer is DEEP
    distinctStageValues: [...new Set(stages.map((s) => s.stage))].sort((a, b) => a - b),
    perStage,
    deepIfConst5: deepFor(STAGE.DEEP), // DEEP=5 per backend spec (single source)
    // GATE 2 — did the slivers survive the HC write?
    deepSegmentCount: deepFor(STAGE.DEEP).segments,
    // GATE 3 — HR sampling density during sleep (1/min ~= 60, denser is better)
    hrSampleCount: hrTimes.length,
    hrMedianGapSec: medianGapSec(hrTimes),
  };

  console.log('[validateNight]', JSON.stringify(diag, null, 2));
  return diag;
}

// =============================================================================
// Core: flag each deep segment (pure — no I/O)
// =============================================================================
export function flagDeepSegments(deepSegments, hrSamples) {
  const sortedBpm = hrSamples.map((s) => s.bpm).sort((a, b) => a - b);
  const nadir = sortedBpm.length
    ? sortedBpm[Math.floor(sortedBpm.length * HR_NADIR_PCT)]
    : NaN;

  const segments = deepSegments.map((seg) => {
    const dur = seg.end - seg.start;
    const win = hrSamples.filter(
      (s) => s.t >= seg.start - MARGIN_MS && s.t <= seg.end + MARGIN_MS,
    );
    const bpms = win.map((s) => s.bpm).sort((a, b) => a - b);
    const median = bpms.length ? bpms[bpms.length >> 1] : null;
    const spread = bpms.length ? bpms[bpms.length - 1] - bpms[0] : null;
    const delta = median == null ? null : median - nadir;

    let flag;
    let confidence;
    if (win.length === 0) {
      flag = 'NO_HR_COVERAGE';
      confidence = 'low'; // PPG dropout = motion signal
    } else if (delta != null && delta > DELTA_ARTIFACT) {
      flag = 'ARTIFACT_SUSPECT';
      confidence = dur < SHORT_MS ? 'low' : 'med';
    } else if (spread != null && spread > SPREAD_SPIKE) {
      flag = 'SPIKE_INSIDE';
      confidence = 'low';
    } else if (dur < SHORT_MS) {
      flag = 'SLIVER_UNVERIFIED';
      confidence = 'low';
    } else {
      flag = 'TRUSTED_DEEP';
      confidence = 'high';
    }

    return {
      startISO: new Date(seg.start).toISOString(),
      durMin: +(dur / 60000).toFixed(1),
      hrMedian: median,
      deltaFromNadir: delta == null ? null : +delta.toFixed(1),
      hrSpread: spread,
      nSamples: win.length,
      flag,
      confidence,
    };
  });

  const rawDeepMin = +(
    deepSegments.reduce((a, s) => a + (s.end - s.start), 0) / 60000
  ).toFixed(1);
  const trustedDeepMin = +segments
    .filter((s) => s.confidence === 'high')
    .reduce((a, s) => a + s.durMin, 0)
    .toFixed(1);

  return { nadir, trustedDeepMin, rawDeepMin, segments };
}

// =============================================================================
// Orchestrator: read a night and return the flagged result.
// EXPOSED but NOT yet wired into readiness/Banister — eyeball nights first.
// Uses STAGE.DEEP, so it is only valid once validateNight confirms that constant.
// =============================================================================
export async function runDeepConfidence(startISO, endISO) {
  await initializeHealthConnect();
  await requestPermissions();

  const start = new Date(startISO);
  const end = new Date(endISO);

  const sleep = collapseSleepSessions(await fetchSleepData(start, end)); // Q2: de-dup first
  const hr = await fetchHeartRateData(start, end);

  const deepSegments = sleep
    .flatMap((r) => r.stages ?? [])
    .filter((s) => s.stage === STAGE.DEEP)
    .map((s) => ({ start: toMs(s.startTime), end: toMs(s.endTime) }));

  const hrSamples = hr.map((s) => ({ t: toMs(s.time), bpm: s.bpm }));

  return flagDeepSegments(deepSegments, hrSamples);
}

export { STAGE };
