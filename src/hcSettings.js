// Pure, node-importable core for the "Open Health Connect" button. NO react-native imports,
// so scripts/hc-settings-sim.mjs exercises THIS code, not a reimplementation (mirrors
// backgroundPermission.js / fetchMeta.js). The library calls are injected by healthConnect.js.
//
// Why a pre-check and not just try/catch: react-native-health-connect 3.5.3's
// openHealthConnectSettings() is a void native call — HealthConnectManager.kt does
// `currentActivity?.startActivity(Intent(ACTION_HEALTH_CONNECT_SETTINGS))`. It returns no
// result, and an exception raised on the native side (no activity resolves the intent)
// never reaches a JS try/catch. So the only reliable "never throws" is to ask the SDK
// whether Health Connect is available BEFORE firing the intent, and fall back to a hint.

export const HC_SETTINGS_HINT = 'Settings > Apps > Health Connect';

/**
 * Open the Health Connect settings screen, or report where to find it by hand.
 * NEVER throws: every failure returns { opened:false, hint }.
 *
 * @param {object}   o
 * @param {function} o.getSdkStatus  () => Promise<number>   (library getSdkStatus)
 * @param {function} o.open          () => void              (library openHealthConnectSettings)
 * @param {number}   o.available     SdkAvailabilityStatus.SDK_AVAILABLE
 * @returns {Promise<{opened:boolean, hint:string|null}>}
 */
export async function openHealthConnectSafely({ getSdkStatus, open, available }) {
  try {
    const status = await getSdkStatus();
    if (status !== available) {
      // Not installed / provider update required: the intent would have nowhere to go.
      return { opened: false, hint: HC_SETTINGS_HINT };
    }
    open();
    return { opened: true, hint: null };
  } catch (_) {
    return { opened: false, hint: HC_SETTINGS_HINT };
  }
}
