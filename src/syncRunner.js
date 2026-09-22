// Pure, dependency-injected sync core. NO react-native / expo / axios / AsyncStorage
// imports — so node imports it directly and scripts/background-sync-sim.mjs exercises
// THIS code, not a reimplementation (mirrors the source-binding discipline of
// fetchMeta.js / stepsAggregate.js). Every runtime dependency (token read, HC fetch,
// backend POST, last-sync write) is injected at the call sites — SyncScreen.handleSync
// and src/backgroundSync.js — which is what keeps api.js and healthConnect.js untouched
// (GUARD: the only payload change is client.trigger, stamped here).
//
// healthConnect.js and api.js cannot be imported outside Metro (react-native /
// NativeModules / axios), so the same logic could not live there and stay testable.

// The special Health Connect permission that gates reads while the app is backgrounded
// (react-native-health-connect 3.5.3: recordType 'BackgroundAccessPermission', accepted
// by requestPermission and returned by getGrantedPermissions). 3.5.3 exposes NO
// per-feature availability call — only getSdkStatus — so membership of the granted list
// IS the availability signal (V4 fallback: request it, treat its absence as unavailable).
export const BACKGROUND_PERMISSION = 'BackgroundAccessPermission';

/**
 * True when the granted-permissions list carries the background-read permission.
 * Shape-tolerant: the SDK returns `{ accessType, recordType }` objects.
 */
export function hasBackgroundPermission(granted) {
  return Array.isArray(granted)
    && granted.some((p) => p && p.recordType === BACKGROUND_PERMISSION);
}

/**
 * Registration gate (S3): the periodic task is NEVER registered without the background
 * permission. Pure predicate so the gate is node-testable (S6 e).
 */
export function shouldRegisterBackground(granted) {
  return hasBackgroundPermission(granted);
}

// Same record tally the sync screen shows — sleep + hrv + heartRate + step-days + workouts.
function countRecords(data) {
  const steps = data.steps || [];
  return (data.sleep?.length || 0)
    + (data.hrv?.length || 0)
    + (data.heartRate?.length || 0)
    + steps.length
    + (data.workouts?.length || 0);
}

/**
 * Headless-safe sync. Reads the token (V5 path), fetches the HC window, stamps
 * client.trigger, POSTs. Runs identically from the manual button and the background
 * task; only `trigger` differs. NEVER throws — a failed fetch or POST returns
 * { ok:false, error } so the background task can map it to a result code and the
 * manual path can surface it in the UI.
 *
 * @param {object}   o
 * @param {number}   o.days            window in days (7 routine, 30 deep sync)
 * @param {string}   o.trigger         'manual' | 'background' — stamped into client
 * @param {function} o.getToken        () => Promise<string|null>  (api.getStoredToken)
 * @param {function} o.fetchAllData    (days) => Promise<data>     (healthConnect.fetchAllData)
 * @param {function} o.syncHealthData  (data, token) => Promise    (api.syncHealthData)
 * @param {function} [o.setLastSync]   ({trigger, at}) => Promise  (local timestamp; best-effort)
 * @param {function} [o.now]           () => ISO string
 * @returns {Promise<{ok:boolean, received:number, data:object|null, meta:object|null, error:string|null}>}
 */
export async function runSync({
  days = 7,
  trigger,
  getToken,
  fetchAllData,
  syncHealthData,
  setLastSync,
  now = () => new Date().toISOString(),
} = {}) {
  try {
    const token = await getToken();
    if (!token) {
      // Logged out — no fetch, no POST (S6 c). A background run in this state is a
      // no-op success would be a lie, so it reports not-ok and the task fails cleanly.
      return { ok: false, received: 0, data: null, meta: null, error: 'no auth token' };
    }

    const data = await fetchAllData(days);
    // Stamp manual vs background so health_connect_sync_events records provenance.
    // Kept HERE, not in fetchAllData, so healthConnect.js and api.js stay untouched —
    // the client block already carries the build fingerprint (#40); trigger rides beside
    // it. ClientInfo is extra="allow" backend-side (health-app #321), so this never 422s;
    // persisting it into a column is the owed health-app follow-up (OPEN_QUESTIONS).
    data.client = { ...(data.client || {}), trigger };

    await syncHealthData(data, token);

    if (setLastSync) {
      // Best-effort local timestamp for the sync-screen status line (S5). A storage
      // failure must never fail the sync it is only annotating.
      try { await setLastSync({ trigger, at: now() }); } catch (_) {}
    }

    return { ok: true, received: countRecords(data), data, meta: data.fetchMeta ?? null, error: null };
  } catch (err) {
    // No throw on failure — the background task returns a result code, never rejects
    // (S1, S3). The manual caller reads { ok:false, error } and shows it.
    return { ok: false, received: 0, data: null, meta: null, error: err?.message ?? String(err) };
  }
}
