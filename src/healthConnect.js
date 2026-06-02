import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  readRecords,
} from 'react-native-health-connect';

export { openHealthConnectSettings };

// Each permission type requested individually so an unsupported type
// on a given device/Android version doesn't block the rest.
const PERMISSION_GROUPS = [
  [{ accessType: 'read', recordType: 'Steps' }],
  [{ accessType: 'read', recordType: 'HeartRate' }],
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

export async function requestPermissions() {
  // Step 1: initialise the SDK
  try {
    const ok = await initialize();
    console.log('Health Connect initialize:', ok);
  } catch (err) {
    console.error('Health Connect initialize() error:', err);
    return null;
  }

  // Step 2: request each permission type individually
  // so an unsupported type doesn't crash the whole batch
  const granted = [];
  for (const group of PERMISSION_GROUPS) {
    try {
      const result = await requestPermission(group);
      if (result?.length) granted.push(...result);
    } catch (e) {
      console.log('Permission not available:', group[0].recordType, e.message);
    }
  }

  console.log('Health Connect total granted:', granted.length);

  // If everything threw, fall back to checking what was previously granted
  if (granted.length === 0) {
    try {
      const existing = await getGrantedPermissions();
      console.log('Health Connect existing permissions:', existing?.length ?? 0);
      return existing?.length > 0 ? existing : null;
    } catch {
      return null;
    }
  }

  return granted;
}

// ── individual fetchers, each isolated so one failure doesn't stop others ──

async function safeFetch(recordType, startDate, endDate, mapper) {
  try {
    const result = await readRecords(recordType, {
      timeRangeFilter: toTimeRange(startDate, endDate),
    });
    return { data: result.records.map(mapper), error: null };
  } catch (err) {
    console.log(`fetchAllData: ${recordType} unavailable —`, err.message);
    return { data: [], error: err.message };
  }
}

export async function fetchSleepData(startDate, endDate) {
  const { data } = await safeFetch('SleepSession', startDate, endDate, (r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    stages: r.stages ?? [],
    durationMinutes: Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000),
  }));
  return data;
}

export async function fetchHRVData(startDate, endDate) {
  const { data } = await safeFetch('HeartRateVariabilityRmssd', startDate, endDate, (r) => ({
    time: r.time,
    hrv: r.heartRateVariabilityMillis,
  }));
  return data;
}

export async function fetchHeartRateData(startDate, endDate) {
  const { data } = await safeFetch('HeartRate', startDate, endDate, (r) => ({
    time: r.time,
    bpm: r.samples?.[0]?.beatsPerMinute ?? r.beatsPerMinute,
  }));
  return data;
}

export async function fetchStepsData(startDate, endDate) {
  const { data } = await safeFetch('Steps', startDate, endDate, (r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    count: r.count,
  }));
  return data;
}

export async function fetchWorkoutData(startDate, endDate) {
  const { data } = await safeFetch('ExerciseSession', startDate, endDate, (r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    exerciseType: r.exerciseType,
    title: r.title ?? null,
    durationMinutes: Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000),
  }));
  return data;
}

export async function fetchAllData(days = 7) {
  const end = new Date();
  const start = daysAgo(days);

  const [sleepRes, hrvRes, hrRes, stepsRes, workoutsRes] = await Promise.all([
    safeFetch('SleepSession', start, end, (r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      stages: r.stages ?? [],
      durationMinutes: Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000),
    })),
    safeFetch('HeartRateVariabilityRmssd', start, end, (r) => ({
      time: r.time,
      hrv: r.heartRateVariabilityMillis,
    })),
    safeFetch('HeartRate', start, end, (r) => ({
      time: r.time,
      bpm: r.samples?.[0]?.beatsPerMinute ?? r.beatsPerMinute,
    })),
    safeFetch('Steps', start, end, (r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      count: r.count,
    })),
    safeFetch('ExerciseSession', start, end, (r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      exerciseType: r.exerciseType,
      title: r.title ?? null,
      durationMinutes: Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000),
    })),
  ]);

  const errors = [sleepRes, hrvRes, hrRes, stepsRes, workoutsRes]
    .filter((r) => r.error)
    .map((r) => r.error);

  return {
    syncedAt: new Date().toISOString(),
    periodDays: days,
    sleep: sleepRes.data,
    hrv: hrvRes.data,
    heartRate: hrRes.data,
    steps: stepsRes.data,
    workouts: workoutsRes.data,
    errors,
  };
}
