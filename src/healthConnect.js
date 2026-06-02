import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'RespiratoryRate' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
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
  try {
    await initialize();
  } catch (err) {
    console.error('Health Connect initialize() error:', err);
    return null;
  }
  try {
    const granted = await requestPermission(PERMISSIONS);
    return granted;
  } catch (err) {
    console.error('Health Connect requestPermission() error:', err);
    return null;
  }
}

export async function fetchSleepData(startDate, endDate) {
  const result = await readRecords('SleepSession', {
    timeRangeFilter: toTimeRange(startDate, endDate),
  });
  return result.records.map((r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    stages: r.stages ?? [],
    durationMinutes: Math.round(
      (new Date(r.endTime) - new Date(r.startTime)) / 60000
    ),
  }));
}

export async function fetchHRVData(startDate, endDate) {
  const result = await readRecords('HeartRateVariabilityRmssd', {
    timeRangeFilter: toTimeRange(startDate, endDate),
  });
  return result.records.map((r) => ({
    time: r.time,
    hrv: r.heartRateVariabilityMillis,
  }));
}

export async function fetchHeartRateData(startDate, endDate) {
  const result = await readRecords('HeartRate', {
    timeRangeFilter: toTimeRange(startDate, endDate),
  });
  return result.records.map((r) => ({
    time: r.time,
    bpm: r.samples?.[0]?.beatsPerMinute ?? r.beatsPerMinute,
  }));
}

export async function fetchStepsData(startDate, endDate) {
  const result = await readRecords('Steps', {
    timeRangeFilter: toTimeRange(startDate, endDate),
  });
  return result.records.map((r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    count: r.count,
  }));
}

export async function fetchWorkoutData(startDate, endDate) {
  const result = await readRecords('ExerciseSession', {
    timeRangeFilter: toTimeRange(startDate, endDate),
  });
  return result.records.map((r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    exerciseType: r.exerciseType,
    title: r.title ?? null,
    durationMinutes: Math.round(
      (new Date(r.endTime) - new Date(r.startTime)) / 60000
    ),
  }));
}

export async function fetchAllData(days = 7) {
  const end = new Date();
  const start = daysAgo(days);

  const [sleep, hrv, heartRate, steps, workouts] = await Promise.allSettled([
    fetchSleepData(start, end),
    fetchHRVData(start, end),
    fetchHeartRateData(start, end),
    fetchStepsData(start, end),
    fetchWorkoutData(start, end),
  ]);

  return {
    syncedAt: new Date().toISOString(),
    periodDays: days,
    sleep: sleep.status === 'fulfilled' ? sleep.value : [],
    hrv: hrv.status === 'fulfilled' ? hrv.value : [],
    heartRate: heartRate.status === 'fulfilled' ? heartRate.value : [],
    steps: steps.status === 'fulfilled' ? steps.value : [],
    workouts: workouts.status === 'fulfilled' ? workouts.value : [],
    errors: [sleep, hrv, heartRate, steps, workouts]
      .filter((r) => r.status === 'rejected')
      .map((r) => r.reason?.message),
  };
}
