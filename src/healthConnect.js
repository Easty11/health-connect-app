import { Linking, NativeModules } from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  readRecords,
  aggregateGroupByPeriod,
} from 'react-native-health-connect';
import { paginateWithSlicing, streamMeta, HC_PAGE_SIZE, HC_MAX_PAGES } from './fetchMeta';
import {
  localDayFilter,
  fetchStepsWithFallback,
  assembleOriginSelection,
  unionDataOrigins,
  STEP_ORIGIN_PRIORITY,
  OWN_PACKAGE,
} from './stepsAggregate';
// Build fingerprint (Q22 item 1). Generated, gitignored, fail-closed: if the
// generation step did not run, this import fails the bundle rather than shipping
// a stale fingerprint. No fallback (see scripts/gen-build-info.mjs).
import { gitSha, builtAt, appVersion } from './buildInfo';

export { openHealthConnectSettings };

/**
 * Opens the Health Connect permission management screen for this app
 * using a native intent — more reliable than the JS SDK approach.
 * After calling, check getGrantedPermissions() to see what was granted.
 */
export const openHealthConnectPermissionsNative = async () => {
  try {
    await NativeModules.HealthConnectModule.openHealthConnectPermissions();
    console.log('Native HC permissions intent fired');
  } catch (e) {
    console.error('Native HC permissions error:', e);
  }
};

/**
 * Open Health Connect app directly via package URI.
 * Useful as a fallback when the SDK dialog doesn't appear.
 */
export const openHealthConnectPermissions = async () => {
  try {
    await Linking.openURL('package:com.google.android.apps.healthdata');
  } catch (e) {
    console.log('Could not open Health Connect:', e);
  }
};

/**
 * Initialise Health Connect and log SDK status for diagnostics.
 */
export const initializeHealthConnect = async () => {
  try {
    // Log SDK availability status first
    const sdkStatus = await getSdkStatus();
    console.log('HC SDK status:', sdkStatus);
    // SdkAvailabilityStatus: 1=INSTALLED, 2=NOT_INSTALLED, 3=NOT_SUPPORTED, 4=NEEDS_UPDATE

    const result = await initialize();
    console.log('HC initialize result:', result);
    return result;
  } catch (e) {
    console.log('HC initialize error:', e.message ?? e);
    return false;
  }
};

// Each permission type requested individually so an unsupported type
// on a given device/Android version doesn't block the rest.
const PERMISSION_GROUPS = [
  [{ accessType: 'read', recordType: 'Steps' }],
  [{ accessType: 'read', recordType: 'HeartRate' }],
  [{ accessType: 'read', recordType: 'RestingHeartRate' }],
  [{ accessType: 'read', recordType: 'SleepSession' }],
  [{ accessType: 'read', recordType: 'HeartRateVariabilityRmssd' }],
  [{ accessType: 'read', recordType: 'ActiveCaloriesBurned' }],
  [{ accessType: 'read', recordType: 'Distance' }],
  [{ accessType: 'read', recordType: 'OxygenSaturation' }],
  [{ accessType: 'read', recordType: 'RespiratoryRate' }],
  [{ accessType: 'read', recordType: 'ExerciseSession' }],
  [{ accessType: 'read', recordType: 'Weight' }],
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toTimeRange(startDate, endDate) {
  return {
    operator: 'between',
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  };
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'RespiratoryRate' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Weight' },
];

export const requestPermissions = async () => {
  try {
    await initialize();
    // Small delay to ensure the client is fully ready after initialisation
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await requestPermission(PERMISSIONS);
    console.log('requestPermission result:', JSON.stringify(result));

    // Check what was actually granted
    const granted = await getGrantedPermissions();
    console.log('granted after request:', JSON.stringify(granted));
    return granted;

  } catch (e) {
    console.error('requestPermissions error:', e.message, e.stack);
    // Fall back to opening Health Connect directly
    try {
      await Linking.openURL('package:com.google.android.apps.healthdata');
    } catch (linkErr) {
      console.log('Could not open Health Connect:', linkErr);
    }
    return [];
  }
};

// ── individual fetchers, each isolated so one failure doesn't stop others ──

// Pagination + truncation telemetry now live in the pure, node-importable core
// `./fetchMeta` (paginate/streamMeta, HC_PAGE_SIZE/HC_MAX_PAGES), so the same
// logic the app runs is what the fetch-meta sim exercises. Default order is
// ASCENDING, so a short read keeps the OLDEST records and drops the recent end —
// the silent truncation `fetchMeta` makes visible per stream. (DECISIONS_LOG #38.)

async function safeFetch(recordType, startDate, endDate, mapper) {
  const reader = ({ timeRangeFilter, pageSize, pageToken }) =>
    readRecords(recordType, { timeRangeFilter, pageSize, pageToken });

  const { records, pages, truncated, endedOnFailure, error, failedDays, sliced } =
    await paginateWithSlicing(reader, toTimeRange(startDate, endDate));

  if (endedOnFailure) {
    // A rate-limit or failure on page N does not discard pages 1..N-1 — the
    // partial is returned with the error, never an empty set (the old catch's bug).
    console.log(`[HC] ${recordType} paged fetch failed —`, error);
  }
  if (sliced) {
    // The initial paged fetch failed; the window was recovered in per-day
    // slices. failedDays names any day still unreadable (carried in the payload —
    // a release APK emits no ReactNativeJS logcat).
    console.log(`[HC] ${recordType}: sliced — failedDays=${JSON.stringify(failedDays)}`);
  }
  if (truncated && !endedOnFailure) {
    console.log(
      `[HC] ${recordType}: hit ${HC_MAX_PAGES}-page safety cap with pageToken still set — records TRUNCATED`,
    );
  }
  // Log a sample raw record so we can verify the actual library shape.
  if (records.length > 0) {
    console.log(`[HC raw] ${recordType} sample:`, JSON.stringify(records[0], null, 2));
  } else {
    console.log(`[HC raw] ${recordType}: 0 records`);
  }
  console.log(
    `[HC] ${recordType}: ${records.length} records across ${pages} page(s)` +
      (truncated ? ' (TRUNCATED)' : ''),
  );
  return {
    data: records.map(mapper).filter(Boolean),
    error, // stays beside pageInfo — fetchAllData's errors[] reads r.error
    pageInfo: { pages, truncated, endedOnFailure, error, failedDays, sliced },
  };
}

export async function fetchSleepData(startDate, endDate) {
  const { data } = await safeFetch('SleepSession', startDate, endDate, (r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    stages: r.stages ?? [],
    durationMinutes: Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000),
    sourcePackage: r.metadata?.dataOrigin ?? null,
  }));
  return data;
}

export async function fetchHRVData(startDate, endDate) {
  const { data } = await safeFetch('HeartRateVariabilityRmssd', startDate, endDate, (r) => ({
    time: r.time,
    rmssd: r.heartRateVariabilityMillis,
    sourcePackage: r.metadata?.dataOrigin ?? null,
  }));
  return data;
}

export async function fetchHeartRateData(startDate, endDate) {
  const { data } = await safeFetch('HeartRate', startDate, endDate, heartRateMapper);
  return data.flat();
}

function heartRateMapper(r) {
  const sourcePackage = r.metadata?.dataOrigin ?? null;
  return (r.samples ?? []).map((s) => ({ time: s.time, bpm: s.beatsPerMinute, sourcePackage }));
}

/**
 * Steps via HC daily aggregate (#42), per-writer-priority (#43), with the raw
 * path retained as the ONLY fallback. aggregateGroupByPeriod(DAYS) reads
 * COUNT_TOTAL per LOCAL day, so Garmin's zero-count StepsRecords — which throw in
 * the SDK's RAW deserialisation ("count must not be less than 1, currently 0")
 * before the app can see or filter them — are never deserialised individually.
 *
 * #42 assumed HC's COUNT_TOTAL over all origins applied source priority; G2 showed
 * it SUMMED writers on days both counted the same steps. #43 instead runs one
 * aggregate per origin (dataOriginFilter) and takes each day's count from the
 * highest-priority origin with data — never a sum. One unfiltered "discovery" read
 * finds origins beyond STEP_ORIGIN_PRIORITY; reads run in parallel; a single
 * origin's failure is isolated into fetchMeta.steps.originErrors. Falls back to the
 * raw+#41-sliced path only when the read got nothing usable (every origin failed,
 * or discovery failed and no listed origin returned data). Returns { steps, meta }
 * (meta.mode 'aggregate' | 'raw-fallback'). Pure logic lives in ./stepsAggregate.
 */
async function fetchStepsAggregate(startDate, endDate) {
  const timeRangeFilter = localDayFilter(startDate, endDate);
  const timeRangeSlicer = { period: 'DAYS', length: 1 };
  const readOrigin = (dataOriginFilter) => aggregateGroupByPeriod({
    recordType: 'Steps',
    timeRangeFilter,
    timeRangeSlicer,
    ...(dataOriginFilter ? { dataOriginFilter } : {}),
  });

  const result = await fetchStepsWithFallback({
    aggregate: async () => {
      // Discovery: one unfiltered read to find origins beyond the priority list.
      // Best-effort — its failure only means no extra origins this run.
      let discoveryResult;
      let discovered = [];
      try {
        discovered = unionDataOrigins(await readOrigin(null));
        discoveryResult = { origins: discovered };
      } catch (e) {
        discoveryResult = { error: e?.message ?? String(e) };
      }
      // Priority list ∪ discovered, never our own package. Per-origin reads run in
      // parallel; each origin's failure is caught and isolated (not a whole-read fail).
      const queried = [...new Set([...STEP_ORIGIN_PRIORITY, ...discovered])]
        .filter((o) => o !== OWN_PACKAGE);
      const originResults = await Promise.all(queried.map((origin) => readOrigin([origin])
        .then((buckets) => ({ origin, buckets }))
        .catch((e) => ({ origin, error: e?.message ?? String(e) }))));
      return assembleOriginSelection({ originResults, discoveryResult, priority: STEP_ORIGIN_PRIORITY });
    },
    // Fallback: the unchanged raw path (safeFetch -> stepsMapper -> aggregateSteps),
    // incl. #41 slice-resume. Kept as fallback only (invariant: raw path retained).
    rawFetch: async () => {
      const raw = await safeFetch('Steps', startDate, endDate, stepsMapper);
      return { steps: aggregateSteps(raw), pageInfo: raw.pageInfo };
    },
    streamMeta,
  });

  if (result.meta.mode === 'raw-fallback') {
    console.log('[HC] Steps: aggregate read nothing usable, used raw fallback —', result.meta.aggregateError);
  } else {
    const errs = Object.keys(result.meta.originErrors ?? {});
    console.log(
      `[HC] Steps: priority aggregate ${result.steps.length} day(s) across origins ` +
        `${JSON.stringify(Object.keys(result.meta.origins ?? {}))}` +
        (errs.length ? ` (originErrors: ${JSON.stringify(errs)})` : ''),
    );
  }
  return result;
}

export async function fetchStepsData(startDate, endDate) {
  const { steps } = await fetchStepsAggregate(startDate, endDate);
  return steps;
}

function stepsMapper(r) {
  const offsetMs = (r.startZoneOffset?.totalSeconds ?? 0) * 1000;
  const date = new Date(new Date(r.startTime).getTime() + offsetMs).toISOString().slice(0, 10);
  const durationMs = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
  return { date, count: r.count, durationMs, sourcePackage: r.metadata?.dataOrigin ?? null };
}

function aggregateSteps(raw) {
  const byDate = {};
  for (const r of raw.data) {
    if (!byDate[r.date]) {
      byDate[r.date] = { hasAggregate: false, count: 0, sourcePackage: null, bySource: new Map() };
    }
    if (r.durationMs >= 23 * 60 * 60 * 1000) {
      // A daily aggregate wins outright for count, so it wins outright for the writer:
      // its own package, never a tally over the interval records it supersedes.
      byDate[r.date] = {
        hasAggregate: true, count: r.count, sourcePackage: r.sourcePackage, bySource: null,
      };
    } else if (!byDate[r.date].hasAggregate) {
      byDate[r.date].count += r.count;
      // Tally steps per writer rather than locking whichever writer arrived first.
      // The day carries ONE flat sourcePackage (#18), and that one string is read by
      // health-app's F1 dedup — which prefers direct-API Polar over `fi.polar.polarflow`
      // arriving via HC. Attributing a 5100-step day to a writer who contributed 100 of
      // them lets F1 discard the whole day as that minority source's duplicate. Majority
      // contributor is the provenance F1 should actually keep.
      // Null writers are counted in `count` but excluded from the tally: they name nobody,
      // so they cannot win, and a plain-object key would coerce them to the string "null".
      if (r.sourcePackage != null) {
        const bySource = byDate[r.date].bySource;
        bySource.set(r.sourcePackage, (bySource.get(r.sourcePackage) ?? 0) + r.count);
      }
    }
  }
  return Object.entries(byDate).map(([date, v]) => ({
    date,
    count: v.count,
    sourcePackage: v.hasAggregate ? v.sourcePackage : majorityWriter(v.bySource),
  }));
}

/**
 * The writer contributing the most steps on a day, or null if no record named one.
 *
 * Tie-break is deliberate, not an accident of key ordering: `Map` iterates in insertion
 * order and the comparison is strict `>`, so on equal step counts the FIRST writer seen
 * holds and no later equal writer displaces it. `best` starts below zero so a writer
 * whose records total zero steps is still attributed rather than dropped to null.
 */
function majorityWriter(bySource) {
  let winner = null;
  let best = -1;
  for (const [pkg, steps] of bySource) {
    if (steps > best) {
      winner = pkg;
      best = steps;
    }
  }
  return winner;
}

function workoutMapper(r) {
  return {
    startTime: r.startTime,
    endTime: r.endTime,
    type: r.exerciseType,
    title: r.title ?? null,
    durationMinutes: Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000),
    sourcePackage: r.metadata?.dataOrigin ?? null,
    // Health Connect record metadata forwarded for backend cross-source ingestion.
    // Paths confirmed empirically from a real [HC raw] ExerciseSession sample (see
    // DECISIONS_LOG #35). All nullable — Samsung Health populates `id` with a stable
    // UUID but leaves recordingMethod/device at their UNKNOWN sentinels (0 / type 0);
    // other writers may populate them, so they are forwarded rather than dropped.
    id: r.metadata?.id ?? null,
    recordingMethod: r.metadata?.recordingMethod ?? null,
    device: r.metadata?.device ?? null,
  };
}

export async function fetchWorkoutData(startDate, endDate) {
  const { data } = await safeFetch('ExerciseSession', startDate, endDate, workoutMapper);
  return data;
}

export async function fetchAllData(days = 7) {
  const end = new Date();
  const start = daysAgo(days);

  const [sleepRes, hrvRes, hrRes, stepsAgg, workoutsRes] = await Promise.all([
    safeFetch('SleepSession', start, end, (r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      stages: r.stages ?? [],
      durationMinutes: Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000),
      sourcePackage: r.metadata?.dataOrigin ?? null,
    })),
    safeFetch('HeartRateVariabilityRmssd', start, end, (r) => ({
      time: r.time,
      rmssd: r.heartRateVariabilityMillis,
      sourcePackage: r.metadata?.dataOrigin ?? null,
    })),
    safeFetch('HeartRate', start, end, heartRateMapper),
    // Steps read via HC daily aggregate (#42) with the raw path as fallback.
    fetchStepsAggregate(start, end),
    safeFetch('ExerciseSession', start, end, workoutMapper),
  ]);

  const heartRate = hrRes.data.flat();
  const steps = stepsAgg.steps;

  // Steps no longer flows through safeFetch. Its error surfaces only on
  // raw-fallback where the raw path itself errored, carried in stepsAgg.meta.error
  // — appended so errors[] keeps its prior meaning (a real partial, not the
  // handled aggregate throw, which is telemetry in fetchMeta.steps.aggregateError).
  const errors = [sleepRes, hrvRes, hrRes, workoutsRes]
    .filter((r) => r.error)
    .map((r) => r.error);
  if (stepsAgg.meta.error) errors.push(stepsAgg.meta.error);

  // Per-stream fetch telemetry (Q22 item 2): received count, oldest/newest
  // timestamp of what was POSTED, page count, and whether the fetch truncated.
  // Timestamps are taken from the mapped payload arrays, so oldestAt/newestAt
  // describe exactly the range the backend receives.
  const fetchMeta = {
    sleep: streamMeta(sleepRes.data.map((r) => r.startTime), sleepRes.pageInfo),
    hrv: streamMeta(hrvRes.data.map((r) => r.time), hrvRes.pageInfo),
    heartRate: streamMeta(heartRate.map((r) => r.time), hrRes.pageInfo),
    steps: stepsAgg.meta,
    workouts: streamMeta(workoutsRes.data.map((r) => r.startTime), workoutsRes.pageInfo),
  };

  return {
    syncedAt: new Date().toISOString(),
    periodDays: days,
    // Build fingerprint — lets the backend tell which build wrote a sync without
    // a device-side dumpsys read (Q22 item 1).
    client: { gitSha, builtAt, appVersion, platform: 'android' },
    sleep: sleepRes.data,
    hrv: hrvRes.data,
    heartRate,
    steps,
    workouts: workoutsRes.data,
    fetchMeta,
    errors,
  };
}
