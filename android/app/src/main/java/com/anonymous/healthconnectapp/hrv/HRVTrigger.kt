package com.anonymous.healthconnectapp.hrv

// ─────────────────────────────────────────────────────────────────
// HRVTrigger.kt
//
// USER_PRESENT trigger.
//
// Previously this receiver applied a 5am–9am morning window and a
// once-per-day DB check before calling startIfReady(). That gate has
// been removed. The receiver now simply asks SDKSyncObserver to run a
// single immediate poll — the observer alone decides whether the
// scraper should fire (fresh sleep/steps data present AND not already
// run today). All cadence/scheduling now lives in SDKSyncObserver.
//
// The unused HRVCaptureWorker and the startIfReady()/alreadyCapturedToday
// helpers were removed; SDKSyncObserver's WorkManager polling supersedes
// them.
// ─────────────────────────────────────────────────────────────────

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Fires when the user unlocks their phone. No time window — just nudges
 * the observer to take one immediate look.
 */
class HRVUnlockReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "HRVUnlockReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_USER_PRESENT) return
        Log.d(TAG, "USER_PRESENT — requesting one immediate SDK poll")
        SDKSyncObserver.triggerImmediatePoll(context.applicationContext)
    }
}
