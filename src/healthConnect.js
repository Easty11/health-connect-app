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

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
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
