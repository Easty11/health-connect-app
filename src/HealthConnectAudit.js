// TEMPORARY DEBUG — remove this file and the button in SyncScreen when done

import { readRecords } from 'react-native-health-connect';

const AUDIT_TYPES = [
  'HeartRate',
  'RestingHeartRate',
  'HeartRateVariabilitySdnn',
  'RespiratoryRate',
  'SleepSession',
  'SleepStage',
  'OxygenSaturation',
  'SkinTemperature',
  'Steps',
  'Weight',
  'Distance',
];

const SAMSUNG_ORIGIN = 'com.samsung.health';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function runHealthConnectAudit() {
  const timeRangeFilter = {
    operator: 'between',
    startTime: daysAgo(7).toISOString(),
    endTime: new Date().toISOString(),
  };

  const results = {};

  for (const recordType of AUDIT_TYPES) {
    try {
      const { records } = await readRecords(recordType, { timeRangeFilter });
      const samsungCount = records.filter(
        (r) => r.metadata?.dataOrigin === SAMSUNG_ORIGIN
      ).length;
      results[recordType] = {
        total: records.length,
        samsungCount,
        sample: records[0] ?? null,
      };
    } catch (err) {
      results[recordType] = { error: err.message };
    }
  }

  console.log('[HC AUDIT RESULTS]', JSON.stringify(results, null, 2));
  return results;
}
