// Pure, node-importable decision logic for the "Enable background sync" button (#45).
// NO react-native / expo imports, so node imports it and scripts/background-permission-sim.mjs
// exercises THIS code (mirrors syncRunner.js / fetchMeta.js discipline). It reuses the
// background-permission predicate from syncRunner read-only — it does not modify it.
// Explicit .js so plain-node ESM (the sim) resolves it; Metro resolves it too.
import { hasBackgroundPermission } from './syncRunner.js';

/**
 * Show the "Enable background sync" button exactly when the base READ_* set is granted
 * (so the app is otherwise usable) but the background permission is NOT — the gap #45
 * fixes. Hidden before base permissions exist (the first-run Grant flow requests the
 * whole set, background included) and once background is granted.
 *
 * @param {object}  o
 * @param {boolean} o.basePermissionsGranted  SyncScreen's permissionsGranted
 * @param {Array}   o.granted                 getGrantedPermissions() result
 */
export function shouldShowEnableBackground({ basePermissionsGranted, granted }) {
  return !!basePermissionsGranted && !hasBackgroundPermission(granted);
}

/**
 * The button's tap flow, minus React state: request the background permission, and only
 * on a grant run the registration path. Injected so the branch is node-testable — the
 * real wiring passes healthConnect.requestBackgroundPermission and
 * backgroundSync.ensureBackgroundSyncRegistered.
 *
 * @param {object}   o
 * @param {function} o.requestBackground  () => Promise<boolean>  (grant result)
 * @param {function} o.register           () => Promise<any>      (idempotent, self-gating)
 * @returns {Promise<{granted:boolean, registered:boolean}>}
 */
export async function runEnableBackground({ requestBackground, register }) {
  const granted = await requestBackground();
  if (!granted) {
    // Denied — never register (registration self-gates on the permission anyway).
    return { granted: false, registered: false };
  }
  await register();
  return { granted: true, registered: true };
}
