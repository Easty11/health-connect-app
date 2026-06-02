import { Linking } from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  readRecords,
} from 'react-native-health-connect';

export { openHealthConnectSettings };

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
  // Step 1: initialise the SDK (with detailed logging)
  const ok = await initializeHealthConnect();
  if (!ok) {
    console.error('Health Connect failed to initialise — aborting permission request');
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
