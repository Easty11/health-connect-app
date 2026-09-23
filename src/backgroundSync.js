// Background HC sync (#44). Module-scope task registration — Expo requires the task
// to be DEFINED outside any component, at import time. The task runs the SAME 7-day
// sync as the manual button through the pure runSync core, stamped trigger:'background'.
//
// Everything that only exists in the RN/Expo runtime is imported HERE, never in
// syncRunner.js, so the pure core stays node-importable for the sim. Nothing in the
// task body may throw: the whole body is wrapped and a failure returns
// BackgroundTaskResult.Failed, never a rejection.
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { getGrantedPermissions } from 'react-native-health-connect';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { runSync, shouldRegisterBackground } from './syncRunner';
import { getStoredToken, storeToken, syncHealthData } from './api';
import { fetchAllData } from './healthConnect';

export const BACKGROUND_SYNC_TASK = 'hc-background-sync';
export const LAST_BACKGROUND_SYNC_KEY = '@hc_last_background_sync';
// Set (ISO timestamp) when a background sync gets a 401; cleared on login (#47). Without
// it a dead token is silent: the interceptor clears the token and every later run just
// exits 'no auth token', while the sync-events table stops growing.
export const NEEDS_SIGN_IN_KEY = '@hc_needs_sign_in';

// 6 hours. Expo SDK 56's minimumInterval is in MINUTES with a 15-minute floor, so 360
// is well above it. The OS treats it as a minimum delay only — WorkManager defers the
// run to a maintenance window (device unlocked / charging), which is the expected
// "partial" outcome in G2, not a failure.
const INTERVAL_MINUTES = 360;

async function writeLastBackgroundSync({ trigger, at }) {
  // Only the background trigger owns the "Last background sync" line (S5); a manual
  // run does not overwrite it. Best-effort — a storage failure never fails the sync.
  if (trigger !== 'background') return;
  try { await AsyncStorage.setItem(LAST_BACKGROUND_SYNC_KEY, at); } catch (_) {}
}

// Only the FIRST 401 is stamped, so "since" stays the moment sync stopped. Best-effort.
async function writeNeedsSignIn({ at }) {
  try {
    if (!(await AsyncStorage.getItem(NEEDS_SIGN_IN_KEY))) {
      await AsyncStorage.setItem(NEEDS_SIGN_IN_KEY, at);
    }
  } catch (_) {}
}

// Define the task at module scope. runSync never throws, but the outer try/catch is
// the belt-and-braces guarantee the task body demands.
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const { ok } = await runSync({
      days: 7,
      trigger: 'background',
      getToken: getStoredToken,
      fetchAllData,
      syncHealthData,
      setLastSync: writeLastBackgroundSync,
      setToken: storeToken,
      onAuthExpired: writeNeedsSignIn,
    });
    return ok
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
  } catch (_) {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Idempotent registration, called on app start after login (Root) and again after a
 * fresh permission grant (SyncScreen). NEVER registers without the background HC
 * permission — 3.5.3 has no feature-status call, so a live getGrantedPermissions read
 * IS the availability gate (V4 fallback). registerTaskAsync overwrites the existing
 * registration of the same name, so repeated calls are safe. Never throws.
 *
 * @returns {Promise<{registered:boolean, reason:string|null}>}
 */
export async function ensureBackgroundSyncRegistered() {
  try {
    const granted = await getGrantedPermissions();
    if (!shouldRegisterBackground(granted)) {
      return { registered: false, reason: 'background permission not granted' };
    }
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: INTERVAL_MINUTES,
    });
    return { registered: true, reason: null };
  } catch (err) {
    return { registered: false, reason: err?.message ?? String(err) };
  }
}

export async function getLastBackgroundSync() {
  try { return await AsyncStorage.getItem(LAST_BACKGROUND_SYNC_KEY); } catch (_) { return null; }
}

export async function getNeedsSignIn() {
  try { return await AsyncStorage.getItem(NEEDS_SIGN_IN_KEY); } catch (_) { return null; }
}

export async function clearNeedsSignIn() {
  try { await AsyncStorage.removeItem(NEEDS_SIGN_IN_KEY); } catch (_) {}
}
