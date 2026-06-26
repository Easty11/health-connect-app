package com.anonymous.healthconnectapp.hrv

// ─────────────────────────────────────────────────────────────────
// SDKSyncObserver.kt
//
// Decides WHEN the Samsung Health accessibility scraper should run.
//
// Strategy:
//   • A WorkManager PeriodicWorkRequest polls every 10 min.
//   • Each poll asks Health Connect — the on-device health SDK that
//     Samsung Health writes sleep/steps into — whether any data has
//     landed for *today*.
//   • If fresh data exists AND we have not already fired today
//     (SharedPreferences flag "scraper_ran_date"), we start the
//     accessibility extraction and stamp the flag.
//   • A separate one-time WorkManager task clears the flag at 03:00
//     and reschedules itself for the next 03:00.
//
// NOTE on "Samsung Health SDK": Samsung does not expose Energy-Score /
// sleep-HRV / respiratory rate through any public SDK — that is why the
// accessibility scraper exists. The freshness signal we *can* read
// cheaply is the sleep/steps that Samsung Health syncs into Health
// Connect, so that is what the observer queries here.
//
// NOTE on "send intent": an AccessibilityService is bound by the system
// and cannot be (re)started with a normal Intent. We therefore reuse the
// service's existing public entry point — HRVAccessibilityService.instance
// .startExtraction() — the same mechanism HRVCaptureModule already uses.
// HRVAccessibilityService itself is left untouched.
// ─────────────────────────────────────────────────────────────────

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.Worker
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.concurrent.TimeUnit

object SDKSyncObserver {

    private const val TAG = "SDKSyncObserver"

    // Re-use the single prefs file already used for the auth token.
    const val PREFS_NAME = "health_hrv_prefs"
    const val FLAG_KEY = "scraper_ran_date"

    private const val POLL_WORK = "sdk_sync_poll"
    private const val IMMEDIATE_POLL_WORK = "sdk_sync_poll_now"
    private const val RESET_WORK = "scraper_flag_reset"

    // Requested cadence. WorkManager enforces a 15-minute floor on
    // PeriodicWorkRequest, so the effective minimum interval is ~15 min.
    private const val POLL_INTERVAL_MIN = 10L

    // ── Scheduling ───────────────────────────────────────────────

    /** Call once from Application.onCreate(). Idempotent (KEEP policy). */
    fun schedule(context: Context) {
        val poll = PeriodicWorkRequestBuilder<SDKSyncPollWorker>(
            POLL_INTERVAL_MIN, TimeUnit.MINUTES
        ).setConstraints(
            // Reads are on-device; only ask to avoid running on a dying battery.
            Constraints.Builder().setRequiresBatteryNotLow(true).build()
        ).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            POLL_WORK, ExistingPeriodicWorkPolicy.KEEP, poll
        )
        scheduleDailyReset(context)
        Log.i(TAG, "Scheduled periodic poll + daily flag reset")
    }

    /** Enqueue a single immediate poll. Used by the USER_PRESENT receiver. */
    fun triggerImmediatePoll(context: Context) {
        val req = OneTimeWorkRequestBuilder<SDKSyncPollWorker>().build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            IMMEDIATE_POLL_WORK, ExistingWorkPolicy.KEEP, req
        )
        Log.d(TAG, "Immediate poll enqueued")
    }

    /** (Re)schedule the 03:00 flag-reset one-time task. */
    fun scheduleDailyReset(context: Context) {
        val delay = minutesUntilNext3am()
        val req = OneTimeWorkRequestBuilder<ScraperFlagResetWorker>()
            .setInitialDelay(delay, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            RESET_WORK, ExistingWorkPolicy.REPLACE, req
        )
        Log.d(TAG, "Flag reset scheduled in $delay min")
    }

    // ── Core observation ─────────────────────────────────────────

    /**
     * The single decision point. Returns true if the scraper was started
     * this call.
     *
     * The once-per-day flag is only stamped when the scraper actually
     * starts, so a poll that finds data while the AccessibilityService is
     * disabled will retry on the next poll instead of silently giving up.
     */
    suspend fun observe(context: Context): Boolean {
        val today = LocalDate.now().toString()
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        if (prefs.getString(FLAG_KEY, null) == today) {
            Log.d(TAG, "Already fired today ($today) — skipping")
            return false
        }

        if (!hasTodayData(context)) {
            Log.d(TAG, "No sleep session starting today yet — skipping")
            return false
        }

        val started = startScraper()
        if (!started) {
            Log.w(TAG, "AccessibilityService not running — cannot start; will retry next poll")
            return false
        }

        prefs.edit().putString(FLAG_KEY, today).apply()
        Log.i(TAG, "Fresh data present — scraper started, $FLAG_KEY set to $today")
        return true
    }

    /**
     * Health Connect read: does a SleepSessionRecord exist whose endTime
     * falls on today's date? Sleep only — no steps/heart-rate fallback.
     *
     * We key off endTime (>= start-of-today): a session that started last
     * night and ended this morning is exactly the morning-sync signal we
     * want. The time-range filter is widened to include yesterday so those
     * overnight sessions are returned, then filtered by endTime.
     */
    private suspend fun hasTodayData(context: Context): Boolean {
        return try {
            if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
                Log.d(TAG, "Health Connect SDK not available")
                return false
            }
            val client = HealthConnectClient.getOrCreate(context)
            val zone = ZoneId.systemDefault()
            val startOfDay = LocalDate.now().atStartOfDay(zone).toInstant()
            val now = Instant.now()
            // For interval records, between() requires the whole record to fall
            // inside the window, so start from yesterday to catch overnight
            // sessions that began last night.
            val range = TimeRangeFilter.between(startOfDay.minus(Duration.ofDays(1)), now)

            val sleep = client.readRecords(
                ReadRecordsRequest(recordType = SleepSessionRecord::class, timeRangeFilter = range)
            ).records
            val endedToday = sleep.any { !it.endTime.isBefore(startOfDay) }
            Log.d(TAG, "Found ${sleep.size} sleep record(s); endedToday=$endedToday")
            endedToday
        } catch (e: Exception) {
            // Most commonly: permission not yet granted, or provider not installed.
            Log.w(TAG, "Health Connect read failed: ${e.message}")
            false
        }
    }

    /** Starts extraction via the service's existing public entry point. */
    private fun startScraper(): Boolean {
        val service = HRVAccessibilityService.instance ?: return false
        // force = false: respect the service's own re-entry guard.
        service.startExtraction()
        return true
    }

    private fun minutesUntilNext3am(): Long {
        val now = LocalDateTime.now()
        var next = now.toLocalDate().atTime(3, 0)
        if (!now.isBefore(next)) next = next.plusDays(1)
        return Duration.between(now, next).toMinutes().coerceAtLeast(1)
    }
}

// ─────────────────────────────────────────────────────────────────
// Workers
// ─────────────────────────────────────────────────────────────────

/** Periodic + immediate poll. Always runs through the once-per-day gate. */
class SDKSyncPollWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        SDKSyncObserver.observe(applicationContext)
        return Result.success()
    }
}

/** Clears the once-per-day flag at 03:00, then reschedules for next 03:00. */
class ScraperFlagResetWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {
    override fun doWork(): Result {
        applicationContext
            .getSharedPreferences(SDKSyncObserver.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(SDKSyncObserver.FLAG_KEY)
            .apply()
        Log.i("ScraperFlagReset", "Cleared ${SDKSyncObserver.FLAG_KEY} at daily reset")
        SDKSyncObserver.scheduleDailyReset(applicationContext)
        return Result.success()
    }
}
