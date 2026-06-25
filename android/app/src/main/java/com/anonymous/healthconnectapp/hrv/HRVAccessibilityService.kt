package com.anonymous.healthconnectapp.hrv

// ─────────────────────────────────────────────────────────────────
// HRVAccessibilityService.kt
//
// Navigates Samsung Health, extracts sleep/HRV metrics via the
// AccessibilityNodeInfo tree (no screenshot, no OCR).
//
// Confirmed resource IDs mapped from uiautomator dumps June 2026.
// Tested on One UI 6.x / Samsung Galaxy Ring.
// ─────────────────────────────────────────────────────────────────

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.anonymous.healthconnectapp.data.AppDatabase
import com.anonymous.healthconnectapp.data.HRVSyncWorker
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.time.Instant

class HRVAccessibilityService : AccessibilityService() {

    // ─── Constants ───────────────────────────────────────────────

    companion object {
        private const val TAG = "HRVAccessService"
        private const val SHEALTH = "com.sec.android.app.shealth"

        // How long to wait after last UI event before treating screen as stable.
        private const val STABILITY_DELAY_MS = 1500L

        // If a state doesn't resolve within this window, treat as error.
        private const val STATE_TIMEOUT_MS = 30_000L

        // Max scroll attempts before giving up on finding respiratory rate.
        private const val MAX_SCROLL_ATTEMPTS = 5

        // External trigger: send this broadcast to start extraction.
        const val ACTION_START_EXTRACTION = "com.yourapp.hrv.START_EXTRACTION"

        // Weak handle for the trigger receiver to call startExtraction().
        var instance: HRVAccessibilityService? = null
    }

    // ─── State machine ───────────────────────────────────────────

    /**
     * Each state represents where we are in the extraction flow.
     * WAITING_FOR_* states are passive — we just sit and watch for
     * the expected screen to appear in onScreenStable().
     */
    private enum class State {
        IDLE,

        // Launch → Home
        LAUNCHING_APP,
        WAITING_FOR_HOME,

        // Home → Energy Score
        TAPPING_ENERGY_SCORE,
        WAITING_FOR_ENERGY_SCORE,
        SCROLLING_ENERGY_SCORE,
        WAITING_FOR_ENERGY_SCORE_SCROLLED,
        EXTRACTING_ENERGY_SCORE,

        // Energy Score → Home
        RETURNING_FROM_ENERGY_SCORE,
        WAITING_FOR_HOME_2,

        // Home → Sleep
        TAPPING_SLEEP,
        WAITING_FOR_SLEEP,
        EXTRACTING_SLEEP_TOP,

        // Scroll Sleep screen
        SCROLLING_SLEEP,
        WAITING_FOR_SLEEP_SCROLLED,
        EXTRACTING_SLEEP_SCROLLED,

        // Sleep → Sleep Score Factors
        TAPPING_SLEEP_FACTORS,
        WAITING_FOR_SLEEP_FACTORS,
        EXTRACTING_SLEEP_FACTORS,

        // Sleep Score Factors → Sleep
        RETURNING_FROM_FACTORS,
        WAITING_FOR_SLEEP_2,

        // Sleep → Home
        RETURNING_FROM_SLEEP,
        WAITING_FOR_HOME_3,

        // Done
        COMPLETE,
        ERROR
    }

    // ─── Fields ──────────────────────────────────────────────────

    private val handler = Handler(Looper.getMainLooper())
    private var state = State.IDLE
    private val data = HRVExtractedData()
    private var scrollAttempts = 0
    private var energyScrollAttempts = 0
    private var timeoutRunnable: Runnable? = null

    // Fires after the screen has been stable for STABILITY_DELAY_MS.
    private val stabilityRunnable = Runnable { onScreenStable() }

    // ─── Lifecycle ───────────────────────────────────────────────

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "Service connected")

        // Limit event scope to Samsung Health only — privacy + performance.
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
            packageNames = arrayOf(SHEALTH)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        handler.removeCallbacksAndMessages(null)
    }

    override fun onInterrupt() {
        Log.w(TAG, "Service interrupted")
    }

    // ─── Entry point ─────────────────────────────────────────────

    /**
     * Called by BroadcastReceiver, WorkManager worker, or the
     * manual trigger button in the Expo UI.
     *
     * Guards against re-entry if already running.
     */
    fun startExtraction(force: Boolean = false) {
        if (state != State.IDLE) {
            Log.w(TAG, "Already running (state=$state) — ignoring trigger")
            return
        }
        Log.i(TAG, "Starting extraction")
        data.reset()
        scrollAttempts = 0
        energyScrollAttempts = 0
        transition(State.LAUNCHING_APP)
        launchSamsungHealth()
        startTimeout()
    }

    // ─── Event handling ──────────────────────────────────────────

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (state == State.IDLE) return
        if (event.packageName?.toString() != SHEALTH) return

        val relevant = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
                       event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        if (!relevant) return

        // Reset debounce timer on every event.
        handler.removeCallbacks(stabilityRunnable)
        handler.postDelayed(stabilityRunnable, STABILITY_DELAY_MS)
    }

    // ─── Screen stable callback ───────────────────────────────────

    /**
     * Called once per stable screen — this is the heart of the state machine.
     * Identifies what's on screen, then either extracts data or navigates.
     */
    private fun onScreenStable() {
        val root = rootInActiveWindow ?: return
        if (root.packageName?.toString() != SHEALTH) return

        val screen = detectScreen(root)
        Log.d(TAG, "Stable | screen=$screen | state=$state")

        when (state) {

            // ── Wait for home after launch ──────────────────────
            State.LAUNCHING_APP,
            State.WAITING_FOR_HOME -> {
                if (screen == Screen.HOME) {
                    cancelTimeout()
                    // Bonus: grab sleep duration from home tile to cross-check later.
                    extractHomeData(root)
                    transition(State.TAPPING_ENERGY_SCORE)
                    tapEnergyScoreTile(root)
                    startTimeout()
                }
            }

            // ── Wait for Energy Score screen ─────────────────────
            State.TAPPING_ENERGY_SCORE,
            State.WAITING_FOR_ENERGY_SCORE -> {
                if (screen == Screen.ENERGY_SCORE) {
                    cancelTimeout()
                    val hrvNode = findById(root, "last_shrv")
                    if (!hrvNode?.text.isNullOrBlank()) {
                        Log.d(TAG, "Energy Score data already visible — skipping scroll")
                        transition(State.EXTRACTING_ENERGY_SCORE)
                        extractEnergyScoreData(root)
                        transition(State.RETURNING_FROM_ENERGY_SCORE)
                        goBack()
                        startTimeout()
                    } else {
                        Log.d(TAG, "Energy Score data not visible — scrolling")
                        val scrollable = findById(root, "vitality_main_view")
                        scrollable?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
                        transition(State.WAITING_FOR_ENERGY_SCORE_SCROLLED)
                        startTimeout()
                    }
                }
            }

            // ── Energy Score scrolled — extract when HRV text is populated ──
            State.SCROLLING_ENERGY_SCORE,
            State.WAITING_FOR_ENERGY_SCORE_SCROLLED -> {
                if (screen == Screen.ENERGY_SCORE) {
                    val hrvNode = findById(root, "last_shrv")
                    if (hrvNode?.text.isNullOrBlank()) {
                        if (energyScrollAttempts >= 3) {
                            Log.w(TAG, "last_shrv still blank after $energyScrollAttempts scrolls — extracting anyway")
                            cancelTimeout()
                            transition(State.EXTRACTING_ENERGY_SCORE)
                            extractEnergyScoreData(root)
                            transition(State.RETURNING_FROM_ENERGY_SCORE)
                            goBack()
                            startTimeout()
                            return
                        }
                        energyScrollAttempts++
                        Log.d(TAG, "Energy Score not ready yet — scrolling again (attempt $energyScrollAttempts)")
                        val scrollable = findById(root, "vitality_main_view")
                            ?: root.findAccessibilityNodeInfosByViewId(
                                "$SHEALTH:id/initial_layout").firstOrNull()?.parent
                        scrollable?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
                        startTimeout()
                        return
                    }
                    cancelTimeout()
                    transition(State.EXTRACTING_ENERGY_SCORE)
                    extractEnergyScoreData(root)
                    transition(State.RETURNING_FROM_ENERGY_SCORE)
                    goBack()
                    startTimeout()
                }
            }

            // ── Wait for home after Energy Score ────────────────
            State.RETURNING_FROM_ENERGY_SCORE,
            State.WAITING_FOR_HOME_2 -> {
                if (screen == Screen.HOME) {
                    cancelTimeout()
                    transition(State.TAPPING_SLEEP)
                    tapSleepTile(root)
                    startTimeout()
                }
            }

            // ── Wait for Sleep screen ────────────────────────────
            State.TAPPING_SLEEP,
            State.WAITING_FOR_SLEEP -> {
                if (screen == Screen.SLEEP) {
                    // Wait for sleep stages chart to load
                    if (findById(root, "sleep_stages_chart") == null) {
                        Log.d(TAG, "Sleep screen not ready yet — waiting for content")
                        return
                    }
                    cancelTimeout()
                    val scrollView = findById(root, "sleep_main_scroll_view")
                    scrollView?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD)
                    handler.postDelayed({
                        transition(State.EXTRACTING_SLEEP_TOP)
                        extractSleepTopData(root)
                        transition(State.TAPPING_SLEEP_FACTORS)
                        tapSleepFactors(root)
                        startTimeout()
                    }, 800L)
                }
            }

            // ── Sleep scrolled — extract or scroll more ──────────
            State.SCROLLING_SLEEP,
            State.WAITING_FOR_SLEEP_SCROLLED -> {
                if (screen == Screen.SLEEP) {
                    cancelTimeout()
                    val found = extractSleepScrolledData(root)
                    if (found || scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
                        if (!found) Log.w(TAG, "Respiratory rate not found after $scrollAttempts scrolls")
                        transition(State.RETURNING_FROM_SLEEP)
                        goBack()
                        startTimeout()
                    } else {
                        scrollAttempts++
                        Log.d(TAG, "Scrolling again (attempt $scrollAttempts)")
                        scrollSleepScreen(root)
                        startTimeout()
                    }
                }
            }

            // ── Wait for Sleep Score Factors ─────────────────────
            State.TAPPING_SLEEP_FACTORS,
            State.WAITING_FOR_SLEEP_FACTORS -> {
                if (screen == Screen.SLEEP_FACTORS) {
                    if (findById(root, "sleep_score_body_nested_scroll_view") == null) {
                        Log.d(TAG, "Sleep Factors not ready yet — waiting")
                        return
                    }
                    cancelTimeout()
                    transition(State.EXTRACTING_SLEEP_FACTORS)
                    extractSleepFactorsData(root)
                    transition(State.RETURNING_FROM_FACTORS)
                    goBack()
                    startTimeout()
                }
            }

            // ── Back on Sleep after factors — now scroll for respiratory rate ──
            State.RETURNING_FROM_FACTORS,
            State.WAITING_FOR_SLEEP_2 -> {
                if (screen == Screen.SLEEP) {
                    cancelTimeout()
                    scrollAttempts = 0
                    transition(State.SCROLLING_SLEEP)
                    scrollSleepScreen(root)
                    startTimeout()
                }
            }

            // ── Back on home after Sleep — done ─────────────────
            State.RETURNING_FROM_SLEEP,
            State.WAITING_FOR_HOME_3 -> {
                if (screen == Screen.HOME) {
                    cancelTimeout()
                    completeExtraction()
                }
            }

            else -> { /* terminal or transitional states — no action */ }
        }
    }

    // ─── Screen detection ─────────────────────────────────────────

    private enum class Screen {
        HOME, ENERGY_SCORE, SLEEP, SLEEP_FACTORS, SPO2, UNKNOWN
    }

    /**
     * Identifies the current screen by checking for distinctive
     * resource IDs confirmed via uiautomator dumps.
     *
     * Order matters: SLEEP_FACTORS must be checked before SLEEP
     * as both share the Sleep package activity.
     */
    private fun detectScreen(root: AccessibilityNodeInfo): Screen {
        // Home dashboard — unique grid view
        if (findById(root, "me_recycler_view") != null) return Screen.HOME

        // Energy Score — unique HRV summary node
        if (findById(root, "last_shrv") != null) return Screen.ENERGY_SCORE

        // SpO2 — unique layout container
        if (findById(root, "spo2_sleep_detail_layout") != null) return Screen.SPO2

        // Sleep Score Factors — must check BEFORE Sleep (shares sleep package)
        if (findById(root, "contributor_insight_message_text") != null) return Screen.SLEEP_FACTORS

        // Sleep — unique scroll container
        if (findById(root, "sleep_main_scroll_view") != null) return Screen.SLEEP

        return Screen.UNKNOWN
    }

    // ─── Navigation ───────────────────────────────────────────────

    private fun launchSamsungHealth() {
        val intent = packageManager.getLaunchIntentForPackage(SHEALTH) ?: run {
            Log.e(TAG, "Samsung Health not installed")
            onError("Samsung Health not installed")
            return
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)
    }

    /**
     * Taps the Energy Score home tile.
     * The tile_root_layout is the clickable container; we locate it
     * by finding the vitality_score TextView inside it and walking up.
     */
    private fun tapEnergyScoreTile(root: AccessibilityNodeInfo) {
        val anchor = findById(root, "vitality_score") ?: run {
            onError("vitality_score not found on home screen")
            return
        }
        val tile = findClickableAncestor(anchor) ?: run {
            onError("No clickable ancestor for Energy Score tile")
            return
        }
        tile.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        transition(State.WAITING_FOR_ENERGY_SCORE)
    }

    /**
     * Taps the Sleep home tile.
     * Located the same way — find sleep_score_text_view, walk up to clickable parent.
     */
    private fun tapSleepTile(root: AccessibilityNodeInfo) {
        val anchor = findById(root, "sleep_score_text_view") ?: run {
            onError("sleep_score_text_view not found on home screen")
            return
        }
        val tile = findClickableAncestor(anchor) ?: run {
            onError("No clickable ancestor for Sleep tile")
            return
        }
        tile.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        transition(State.WAITING_FOR_SLEEP)
    }

    private fun tapSleepFactors(root: AccessibilityNodeInfo) {
        val factorRow = findById(root, "sleep_contributors_block_1") ?: run {
            Log.w(TAG, "sleep_contributors_block_1 not found — skipping factors")
            transition(State.RETURNING_FROM_SLEEP)
            goBack()
            startTimeout()
            return
        }
        Log.d(TAG, "Tapping sleep_contributors_block_1")
        factorRow.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        transition(State.WAITING_FOR_SLEEP_FACTORS)
    }

    private fun scrollSleepScreen(root: AccessibilityNodeInfo) {
        val scrollable = findById(root, "sleep_main_scroll_view") ?: run {
            Log.w(TAG, "sleep_main_scroll_view not found — trying global scroll")
            // Fallback: scroll via gesture on the centre of the screen.
            performGlobalAction(GLOBAL_ACTION_BACK) // won't scroll but avoids hang
            return
        }
        scrollable.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
        transition(State.WAITING_FOR_SLEEP_SCROLLED)
    }

    /**
     * Goes back to the previous screen.
     * Uses the system back action — more reliable than finding the
     * "Navigate up" button which has no resource ID.
     */
    private fun goBack() {
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    // ─── Data extraction ──────────────────────────────────────────

    /**
     * Home screen — sleep tile shows duration without navigating anywhere.
     * Use as a cross-check / fallback for sleep duration.
     */
    private fun extractHomeData(root: AccessibilityNodeInfo) {
        // "7h 33m" — sleep duration (note: this is in the wakeup_time_text_view
        // confusingly — the third item in the bedtime/duration/wakeup row)
        findById(root, "wakeup_time_text_view")?.text?.toString()?.let {
            data.sleepDurationHomeTile = it  // e.g. "7h 33m"
        }
        findById(root, "bed_time_text_view")?.text?.toString()?.let {
            data.bedtime = it  // e.g. "22:57"
        }
        findById(root, "duration_time_text_view")?.text?.toString()?.let {
            data.wakeTime = it  // e.g. "06:30"
        }
        val spo2Nodes = root.findAccessibilityNodeInfosByViewId("$SHEALTH:id/tile_main_layout")
        for (node in spo2Nodes) {
            val desc = node.contentDescription?.toString() ?: continue
            if (desc.contains("blood oxygen", ignoreCase = true)) {
                Regex("(\\d+)\\s*percent").find(desc)
                    ?.groupValues?.get(1)?.toDoubleOrNull()?.let {
                        data.spO2AveragePct = it
                        Log.d(TAG, "SpO2 from home tile: $it")
                    }
                break
            }
        }
        Log.d(TAG, "Home data: bedtime=${data.bedtime} wake=${data.wakeTime} duration=${data.sleepDurationHomeTile}")
    }

    /**
     * Energy Score screen:
     *   last_shrv → "Average: 95 ms"   → HRV in ms
     *   last_shr  → "Average: 58 bpm"  → Sleep HR
     */
    private fun extractEnergyScoreData(root: AccessibilityNodeInfo) {
        findById(root, "last_shrv")?.text?.toString()?.let { raw ->
            data.hrvMs = HRVDataParser.parseAverage(raw, "ms")
            Log.d(TAG, "HRV: $raw → ${data.hrvMs}")
        } ?: Log.w(TAG, "last_shrv not found")

        findById(root, "last_shr")?.text?.toString()?.let { raw ->
            data.sleepHRBpm = HRVDataParser.parseAverage(raw, "bpm")?.toInt()
            Log.d(TAG, "Sleep HR: $raw → ${data.sleepHRBpm}")
        } ?: Log.w(TAG, "last_shr not found")
    }

    /**
     * Sleep screen — top section (no scrolling needed):
     *   sleep_stages_chart content-desc → total time + stage percentages
     *   chart_detail_section_title_N + chart_detail_description_N → stage durations
     *
     * Always pair the title with its description — do not assume index 1 = Awake.
     * Samsung could reorder stages in future updates.
     */
    private fun extractSleepTopData(root: AccessibilityNodeInfo) {
        // Total sleep time + stage percentages from content-desc.
        findById(root, "sleep_stages_chart")?.contentDescription?.toString()?.let { desc ->
            HRVDataParser.parseStagesContentDesc(desc, data)
            Log.d(TAG, "Stages content-desc: $desc")
        } ?: Log.w(TAG, "sleep_stages_chart not found")

        // Stage durations — pair by index, match by title.
        for (i in 1..4) {
            val title = findById(root, "chart_detail_section_title_$i")?.text?.toString()
            val value = findById(root, "chart_detail_description_$i")?.text?.toString()
            if (title != null && value != null) {
                data.setStageDuration(title, value)
                Log.d(TAG, "Stage $i: $title = $value")
            }
        }

        findById(root, "actual_sleep_time")?.text?.toString()?.let {
            data.actualSleepTimeRaw = it
            data.actualSleepTimeMinutes = HRVDataParser.parseDurationToMinutes(it)
            Log.d(TAG, "Actual sleep time: $it → ${data.actualSleepTimeMinutes} min")
        }
    }

    /**
     * Sleep screen — after scrolling:
     *   sleep_hr_legend_avg            → "58 bpm"      → sleep HR (detailed)
     *   sleep_respiratory_rate_average → "13.2 times/min" → respiratory rate
     *
     * Returns true if respiratory rate was found (scroll success signal).
     */
    private fun extractSleepScrolledData(root: AccessibilityNodeInfo): Boolean {
        findById(root, "sleep_hr_legend_avg")?.text?.toString()?.let { raw ->
            data.sleepHRBpmDetailed = HRVDataParser.parseFirstNumber(raw)?.toInt()
            Log.d(TAG, "Sleep HR detailed: $raw → ${data.sleepHRBpmDetailed}")
        }

        val respNode = findById(root, "sleep_respiratory_rate_average")
        respNode?.text?.toString()?.let { raw ->
            data.respiratoryRate = HRVDataParser.parseFirstNumber(raw)
            Log.d(TAG, "Respiratory rate: $raw → ${data.respiratoryRate}")
        }
        return respNode != null
    }

    /**
     * Sleep Score Factors screen:
     *   contributor_insight_message_text → "5 h 47 m\nSleep efficiency: 90%"
     *
     * Split on newline, parse the efficiency line.
     */
    private fun extractSleepFactorsData(root: AccessibilityNodeInfo) {
        findById(root, "contributor_insight_message_text")?.text?.toString()?.let { raw ->
            data.sleepEfficiencyPct = HRVDataParser.parseSleepEfficiency(raw)
            Log.d(TAG, "Sleep efficiency raw: $raw → ${data.sleepEfficiencyPct}%")
        } ?: Log.w(TAG, "contributor_insight_message_text not found")
    }

    // ─── Completion and error ────────────────────────────────────

    private fun completeExtraction() {
        transition(State.COMPLETE)
        Log.i(TAG, "Extraction complete: $data")

        // Return to home screen — don't leave Samsung Health in foreground.
        performGlobalAction(GLOBAL_ACTION_HOME)

        // Persist to local Room database for sync queue.
        saveToDatabase(data.snapshot())

        // Enqueue background sync to backend.
        WorkManager.getInstance(applicationContext)
            .enqueue(
                OneTimeWorkRequestBuilder<HRVSyncWorker>()
                    .setConstraints(
                        Constraints.Builder()
                            .setRequiredNetworkType(NetworkType.CONNECTED)
                            .build()
                    )
                    .build()
            )

        // Notify the JS layer that fresh data is available.
        emitToJs("HRVExtractionComplete", buildCompletePayload())

        // Bring our app back to the foreground without creating a new instance.
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        intent?.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        intent?.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)

        // Reset for next run.
        transition(State.IDLE)
    }

    private fun onError(reason: String) {
        Log.e(TAG, "Error: $reason (was in state $state)")
        transition(State.ERROR)
        cancelTimeout()
        // Return to home — don't leave a half-navigated Samsung Health.
        performGlobalAction(GLOBAL_ACTION_HOME)
        // TODO: post error notification to user
        emitToJs(
            "HRVExtractionFailed",
            Arguments.createMap().apply { putString("reason", reason) }
        )
        transition(State.IDLE)
    }

    // ─── React Native event bridge ───────────────────────────────

    /** Current ReactContext from the host application, or null if JS isn't up. */
    private fun reactContext(): ReactContext? =
        (applicationContext as? ReactApplication)?.reactHost?.currentReactContext

    /** Emit a DeviceEventEmitter event to JS. No-op (logged) if JS isn't ready. */
    private fun emitToJs(eventName: String, params: WritableMap) {
        try {
            val ctx = reactContext()
            if (ctx == null) {
                Log.w(TAG, "No ReactContext — dropping $eventName")
                return
            }
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to emit $eventName: ${e.message}")
        }
    }

    /** Builds the success payload from the just-extracted data. */
    private fun buildCompletePayload(): WritableMap = Arguments.createMap().apply {
        data.hrvMs?.let { putDouble("hrv_rmssd", it) } ?: putNull("hrv_rmssd")
        data.sleepEfficiencyPct?.let { putInt("sleep_efficiency", it) } ?: putNull("sleep_efficiency")
        val durationMin = data.totalSleepTimeMinutes ?: data.actualSleepTimeMinutes
        durationMin?.let { putInt("sleep_duration_minutes", it) } ?: putNull("sleep_duration_minutes")
        data.respiratoryRate?.let { putDouble("respiratory_rate", it) } ?: putNull("respiratory_rate")

        // Sleep timing — skip if null
        data.bedtime?.let { putString("bedtime", it) }
        data.wakeTime?.let { putString("wakeTime", it) }
        data.actualSleepTimeRaw?.let { putString("actualSleepTimeRaw", it) }

        // Sleep stages (minutes) — skip if null
        data.deepMinutes?.let { putInt("deepMinutes", it) }
        data.remMinutes?.let { putInt("remMinutes", it) }
        data.lightMinutes?.let { putInt("lightMinutes", it) }
        data.awakeMinutes?.let { putInt("awakeMinutes", it) }

        // Sleep stages (%) — skip if null
        data.deepPct?.let { putInt("deepPct", it) }
        data.remPct?.let { putInt("remPct", it) }
        data.lightPct?.let { putInt("lightPct", it) }
        data.awakePct?.let { putInt("awakePct", it) }

        // Cardiac — skip if null
        data.sleepHRBpm?.let { putInt("sleepHRBpm", it) }
        data.spO2AveragePct?.let { putDouble("spO2AveragePct", it) }

        putString("recorded_at", Instant.ofEpochMilli(data.capturedAt).toString())
    }

    @OptIn(DelicateCoroutinesApi::class)
    private fun saveToDatabase(snapshot: HRVExtractedData) {
        GlobalScope.launch(Dispatchers.IO) {
            val db = AppDatabase.getInstance(applicationContext)
            db.hrvDao().insert(snapshot.toEntity())
            Log.i(TAG, "Saved to DB: capturedAt=${snapshot.capturedAt}")
        }
    }

    // ─── State machine helpers ───────────────────────────────────

    private fun transition(newState: State) {
        Log.d(TAG, "$state → $newState")
        state = newState
    }

    private fun startTimeout() {
        cancelTimeout()
        timeoutRunnable = Runnable {
            onError("Timeout waiting in state $state")
        }.also {
            handler.postDelayed(it, STATE_TIMEOUT_MS)
        }
    }

    private fun cancelTimeout() {
        timeoutRunnable?.let { handler.removeCallbacks(it) }
        timeoutRunnable = null
    }

    // ─── Node lookup helpers ─────────────────────────────────────

    /** Find first node matching a Samsung Health resource ID. */
    private fun findById(root: AccessibilityNodeInfo, id: String): AccessibilityNodeInfo? =
        root.findAccessibilityNodeInfosByViewId("$SHEALTH:id/$id").firstOrNull()

    /**
     * Walk up the node tree to find the nearest clickable ancestor.
     * Used when the target text node itself is not clickable but its
     * container is (e.g. list item rows, tile cards).
     */
    private fun findClickableAncestor(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var current: AccessibilityNodeInfo? = node.parent
        var depth = 0
        while (current != null && depth < 10) {
            if (current.isClickable) return current
            current = current.parent
            depth++
        }
        return null
    }
}
