package com.anonymous.healthconnectapp.hrv

// ─────────────────────────────────────────────────────────────────
// HRVAccessibilityService.kt
//
// Navigates Samsung Health, extracts sleep/HRV metrics via the
// AccessibilityNodeInfo tree (no screenshot, no OCR).
//
// Re-mapped for Samsung Health 7.00.0.107 (One UI 7 / Android 16),
// verified live against SM-S921B on 25 June 2026. Two structural shifts
// from the prior layout:
//   1. Home dashboard redesigned — energy/sleep are now content-desc cards
//      (old `me_recycler_view` / `vitality_score` / `sleep_*_text_view` gone).
//   2. Sleep detail migrated to Jetpack Compose — no data resource-ids;
//      all sleep values now read from content-desc strings.
// HRV/HR/respiratory still live on the Vitality (Energy score) screen and
// keep their `last_shrv` / `last_shr` text ids, but render lazily on scroll.
// ─────────────────────────────────────────────────────────────────

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.graphics.Rect
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
import java.io.File
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

        // Vitality screen renders HR/HRV/respiratory cards lazily as you
        // scroll, and recycles them out again — so we scroll-and-accumulate
        // until all three are captured or we hit this cap.
        private const val MAX_ENERGY_SCROLL_ATTEMPTS = 8

        // Sleep screen also renders lazily: the stages breakdown (Light minutes
        // + per-stage %) and the Blood-oxygen card sit below the fold, so we
        // scroll-and-accumulate the same way until they are captured or we cap.
        private const val MAX_SLEEP_SCROLL_ATTEMPTS = 8

        // Samsung Health resumes on whatever screen it was last left on, not the
        // home dashboard. If we launch into a detail screen we walk back toward
        // home, capped so a stuck screen still fails via the state timeout.
        private const val MAX_HOME_NAV_ATTEMPTS = 5

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

        // Home → Vitality (Energy score). Scroll-and-accumulate: HR/HRV/
        // respiratory render lazily, so we loop scroll → extract on these
        // two states until all three are captured.
        TAPPING_ENERGY_SCORE,
        WAITING_FOR_ENERGY_SCORE,
        SCROLLING_ENERGY_SCORE,
        WAITING_FOR_ENERGY_SCORE_SCROLLED,

        // Vitality → Home
        RETURNING_FROM_ENERGY_SCORE,
        WAITING_FOR_HOME_2,

        // Home → Sleep (Compose). Scroll-and-accumulate: the stages breakdown
        // (Light + %) and Blood-oxygen render lazily below the fold, so we loop
        // scroll → extract until they are captured.
        TAPPING_SLEEP,
        WAITING_FOR_SLEEP,
        SCROLLING_SLEEP,
        WAITING_FOR_SLEEP_SCROLLED,

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
    private var energyScrollAttempts = 0
    private var sleepScrollAttempts = 0
    private var homeNavAttempts = 0
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
        energyScrollAttempts = 0
        sleepScrollAttempts = 0
        homeNavAttempts = 0
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

        // ── DIAGNOSTIC (feat/hrv-node-dump) ─────────────────────────
        // Read-only node-tree capture. Fires once per stable Samsung Health
        // frame, so every page the state machine walks (home → Vitality/HRV →
        // each scroll frame → Sleep detail) is recorded to nodedump.txt. Uses
        // the already-package-checked `root` above — the header will always
        // resolve to Samsung Health. Additive only; selector logic untouched.
        dumpActiveTree(root)

        val screen = detectScreen(root)
        Log.d(TAG, "Stable | screen=$screen | state=$state")

        when (state) {

            // ── Wait for home after launch ──────────────────────
            State.LAUNCHING_APP,
            State.WAITING_FOR_HOME -> {
                if (screen == Screen.HOME) {
                    cancelTimeout()
                    homeNavAttempts = 0
                    // Bonus: grab sleep duration from home tile to cross-check later.
                    extractHomeData(root)
                    transition(State.TAPPING_ENERGY_SCORE)
                    tapEnergyScoreTile(root)
                    startTimeout()
                } else if (
                    (screen == Screen.SLEEP || screen == Screen.ENERGY_SCORE || screen == Screen.SPO2) &&
                    homeNavAttempts < MAX_HOME_NAV_ATTEMPTS
                ) {
                    // SH resumed on a detail screen (it reopens wherever it was
                    // last left). Walk back toward the dashboard. UNKNOWN frames
                    // are transient launch/splash states — wait those out rather
                    // than risk backing out of the app.
                    homeNavAttempts++
                    Log.d(TAG, "Not on home (screen=$screen) — backing to dashboard (attempt $homeNavAttempts)")
                    goBack()
                    transition(State.WAITING_FOR_HOME)
                    startTimeout()
                }
            }

            // ── Vitality (Energy score) — scroll-and-accumulate ──
            // HR/HRV/respiratory cards render lazily and recycle back out, so
            // we extract whatever is on screen each frame and keep scrolling
            // until all three are captured (or we hit the scroll cap).
            State.TAPPING_ENERGY_SCORE,
            State.WAITING_FOR_ENERGY_SCORE,
            State.SCROLLING_ENERGY_SCORE,
            State.WAITING_FOR_ENERGY_SCORE_SCROLLED -> {
                if (screen == Screen.ENERGY_SCORE) {
                    extractEnergyScoreData(root)
                    if (energyComplete || energyScrollAttempts >= MAX_ENERGY_SCROLL_ATTEMPTS) {
                        if (!energyComplete) Log.w(
                            TAG,
                            "Energy data incomplete after $energyScrollAttempts scrolls " +
                            "(hrv=${data.hrvMs} hr=${data.sleepHRBpm} rr=${data.respiratoryRate})"
                        )
                        cancelTimeout()
                        transition(State.RETURNING_FROM_ENERGY_SCORE)
                        goBack()
                        startTimeout()
                    } else {
                        energyScrollAttempts++
                        Log.d(TAG, "Vitality scroll-accumulate (attempt $energyScrollAttempts)")
                        findById(root, "main_scrollable")
                            ?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
                        transition(State.WAITING_FOR_ENERGY_SCORE_SCROLLED)
                        startTimeout()
                    }
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

            // ── Sleep screen (Jetpack Compose, SH 7.x) ───────────
            // No data resource-ids: extract from content-desc/text each frame.
            // The timing header + factor cards are at the top, but the stages
            // breakdown (Light + %) and Blood-oxygen render lazily below the
            // fold — so we scroll-and-accumulate until both are captured.
            // Respiratory rate is no longer here — it lives on the Vitality
            // screen and is captured there.
            // First arrival on the Sleep screen: wait for the Compose tree to
            // populate, read the top (timing header + factor cards), then begin
            // scrolling for the below-the-fold data.
            State.TAPPING_SLEEP,
            State.WAITING_FOR_SLEEP -> {
                if (screen == Screen.SLEEP) {
                    // Compose tree can detect (compose_view present) before the
                    // score card content-desc populates — wait for it.
                    if (!hasContentDesc(root, "Sleep score")) {
                        Log.d(TAG, "Sleep screen not ready yet — waiting for Compose content")
                        return
                    }
                    extractSleepCompose(root)
                    advanceSleepScroll(root)
                }
            }

            // Mid-scroll: the top "Sleep score" node has scrolled off, so
            // detectScreen reports UNKNOWN (or SPO2 once the blood-oxygen card
            // scrolls into view). We're still inside the Sleep detail activity
            // as long as we haven't landed back on HOME, so keep accumulating.
            State.SCROLLING_SLEEP,
            State.WAITING_FOR_SLEEP_SCROLLED -> {
                if (screen != Screen.HOME) {
                    extractSleepCompose(root)
                    advanceSleepScroll(root)
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

    /**
     * Shared tail of the Sleep scroll-accumulate loop. Stops (and navigates
     * back) once the below-the-fold data is captured or the scroll cap is hit;
     * otherwise scrolls one page and waits for the next stable frame. Each path
     * (re)arms the state timeout so a stalled scroll still fails cleanly.
     */
    private fun advanceSleepScroll(root: AccessibilityNodeInfo) {
        if (sleepComplete || sleepScrollAttempts >= MAX_SLEEP_SCROLL_ATTEMPTS) {
            if (!sleepComplete) Log.w(
                TAG,
                "Sleep data incomplete after $sleepScrollAttempts scrolls " +
                "(light=${data.lightMinutes} spo2=${data.spO2AveragePct})"
            )
            transition(State.RETURNING_FROM_SLEEP)
            goBack()
            startTimeout()
        } else {
            sleepScrollAttempts++
            Log.d(TAG, "Sleep scroll-accumulate (attempt $sleepScrollAttempts)")
            findScrollable(root)?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
            transition(State.SCROLLING_SLEEP)
            startTimeout()
        }
    }

    // ─── Screen detection ─────────────────────────────────────────

    private enum class Screen {
        HOME, ENERGY_SCORE, SLEEP, SPO2, UNKNOWN
    }

    /**
     * Identifies the current screen by checking for distinctive nodes
     * confirmed via uiautomator dumps (SH 7.00.0.107, 25 June 2026).
     *
     * Order matters: HOME is checked first — its bottom-nav node is absent on
     * the full-screen detail activities, so this disambiguates the Sleep card's
     * "Sleep score" content-desc (on HOME) from the Compose Sleep screen.
     */
    private fun detectScreen(root: AccessibilityNodeInfo): Screen {
        // Home dashboard — bottom tab nav exists only on the main SH shell,
        // not on the full-screen detail activities. (Old `me_recycler_view`
        // grid is gone in the SH 7.x redesign.)
        if (findById(root, "bottom_tab_navigation") != null) return Screen.HOME

        // Vitality (Energy score) — root container is present immediately.
        // We can't key on `last_shrv` any more: the HRV card renders only
        // after scrolling, so detection must use an always-present node.
        if (findById(root, "vitality_main_view") != null) return Screen.ENERGY_SCORE

        // SpO2 — unique layout container
        if (findById(root, "spo2_sleep_detail_layout") != null) return Screen.SPO2

        // Sleep — Jetpack Compose screen (SH 7.x). No data resource-ids, so
        // key on the Compose host plus the sleep-score content-desc.
        if (findById(root, "compose_view") != null && hasContentDesc(root, "Sleep score")) {
            return Screen.SLEEP
        }

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
     * Taps the Energy score card on the redesigned home dashboard (SH 7.x).
     * Anchor on the inner score ids (`vitality_tile_score_layout` /
     * `vitality_title`), which survive the SH 7.x relayout, then walk up to the
     * clickable container (`tile_root_layout`). The card's content-desc
     * ("Energy score, Double tap…") now sits on the *outer* wrapper whose
     * clickable container is a descendant — so a content-desc anchor + ancestor
     * walk can never reach it; it is kept only as a last-resort fallback.
     */
    private fun tapEnergyScoreTile(root: AccessibilityNodeInfo) {
        val anchor = findById(root, "vitality_tile_score_layout")
            ?: findById(root, "vitality_title")
            ?: findByContentDescPrefix(root, "Energy score")
            ?: run {
                onError("Energy score card not found on home screen")
                return
            }
        val tile = if (anchor.isClickable) anchor else findClickableAncestor(anchor)
        if (tile == null) {
            onError("No clickable ancestor for Energy score card")
            return
        }
        tile.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        transition(State.WAITING_FOR_ENERGY_SCORE)
    }

    /**
     * Taps the Sleep score card on the home dashboard. The `sleep_score_text_view`
     * id survives the redesign; fall back to the "Sleep score" content-desc card.
     */
    private fun tapSleepTile(root: AccessibilityNodeInfo) {
        val anchor = findById(root, "sleep_score_text_view")
            ?: findByContentDescPrefix(root, "Sleep score")
            ?: run {
                onError("Sleep card not found on home screen")
                return
            }
        val tile = if (anchor.isClickable) anchor else findClickableAncestor(anchor)
        if (tile == null) {
            onError("No clickable ancestor for Sleep card")
            return
        }
        tile.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        transition(State.WAITING_FOR_SLEEP)
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
     * Home dashboard (SH 7.x). The redesign dropped the sleep-timing tile ids
     * (`wakeup_time_text_view` etc.) — bedtime/wake/duration now come from the
     * Sleep screen content-desc instead. Kept as a hook; currently a no-op.
     */
    private fun extractHomeData(root: AccessibilityNodeInfo) {
        Log.d(TAG, "Home reached — timing/stages now sourced from the Sleep screen")
    }

    /** True once HRV, sleep HR, and respiratory rate have all been captured. */
    private val energyComplete: Boolean
        get() = data.hrvMs != null && data.sleepHRBpm != null && data.respiratoryRate != null

    /**
     * True once the below-the-fold Sleep data is captured: Light-sleep minutes
     * (which arrives with the per-stage %) and the Blood-oxygen average. The
     * top-of-screen timing header and factor cards are read on the first frame,
     * so these two are what the scroll is for.
     */
    private val sleepComplete: Boolean
        get() = data.lightMinutes != null && data.spO2AveragePct != null

    /**
     * Vitality (Energy score) screen, SH 7.x. HRV/HR keep their text ids;
     * respiratory rate moved here from the old Sleep screen. Cards render and
     * recycle as the screen scrolls, so this is called once per scroll frame
     * and only fills a field that isn't already set.
     *
     *   last_shrv → "Average: 42 ms"  → HRV in ms
     *   last_shr  → "Average: 72 bpm"  → Sleep HR
     *   vitality_respiratory_rate_average_title → "Average: 14.7 times/min"
     *
     * Each id matches TWO nodes: a degenerate-bounds phantom duplicate left by
     * Compose recycling, bearing the prior render's stale value, and the real
     * node. Read via findByIdValidBounds (not findById) so the phantom is
     * skipped — see findByIdValidBounds / DECISIONS_LOG.
     */
    private fun extractEnergyScoreData(root: AccessibilityNodeInfo) {
        if (data.hrvMs == null) findByIdValidBounds(root, "last_shrv")?.text?.toString()?.let { raw ->
            data.hrvMs = HRVDataParser.parseAverage(raw, "ms")
            Log.d(TAG, "HRV: $raw → ${data.hrvMs}")
        }
        if (data.sleepHRBpm == null) findByIdValidBounds(root, "last_shr")?.text?.toString()?.let { raw ->
            data.sleepHRBpm = HRVDataParser.parseAverage(raw, "bpm")?.toInt()
            Log.d(TAG, "Sleep HR: $raw → ${data.sleepHRBpm}")
        }
        if (data.respiratoryRate == null)
            findByIdValidBounds(root, "vitality_respiratory_rate_average_title")?.text?.toString()?.let { raw ->
                data.respiratoryRate = HRVDataParser.parseFirstNumber(raw)
                Log.d(TAG, "Respiratory rate: $raw → ${data.respiratoryRate}")
            }
    }

    /**
     * Sleep screen — Jetpack Compose (SH 7.x). No data resource-ids, so we walk
     * the whole node tree and parse content-desc strings in one pass:
     *
     *   "Sleep time,7 hours 12 minutes,Bedtime 22:12, wake-up time 05:57,
     *    Actual sleep time, 6 hours 23 minutes"   → duration/bedtime/wake/actual
     *   "Deep sleep, 5 minutes, Attention, Button" / "REM sleep, …" / "Awake, …"
     *                                              → per-stage minutes
     *
     * Light sleep and sleep efficiency are not exposed on this screen and are
     * left null (see DECISIONS_LOG — surfaced as known gaps, not reconstructed).
     */
    private fun extractSleepCompose(root: AccessibilityNodeInfo) {
        forEachNode(root) { node ->
            // SpO2 average is a plain TextView ("Average: 96%") under the
            // Blood-oxygen card — the only "Average:" on the Sleep screen.
            if (data.spO2AveragePct == null) {
                node.text?.toString()?.let { txt ->
                    if (txt.startsWith("Average:") && txt.contains("%")) {
                        HRVDataParser.parseAverage(txt, "%")?.let {
                            data.spO2AveragePct = it
                            Log.d(TAG, "SpO2 average: $txt → $it")
                        }
                    }
                }
            }

            val desc = node.contentDescription?.toString() ?: return@forEachNode

            if (desc.startsWith("Sleep time,") && desc.contains("Bedtime")) {
                HRVDataParser.parseSleepTimingContentDesc(desc, data)
                Log.d(TAG, "Sleep timing desc: $desc")
                return@forEachNode
            }

            // Stages breakdown: a single content-desc carries every stage's
            // minutes AND percentage — the only source of Light-sleep minutes
            // and the per-stage percentages.
            //   "Awake, 49 minutes, 11 percent, … Light, 5 hours 12 minutes,
            //    73 percent, … Deep, 5 minutes, 1 percent"
            // Must run before the factor parser, which would otherwise match the
            // leading "Awake, 49 minutes," fragment of this same string.
            if (desc.contains("percent") &&
                Regex("(Awake|REM|Light|Deep)\\s*,").containsMatchIn(desc)) {
                HRVDataParser.parseSleepStagesContentDesc(desc, data)
                Log.d(TAG, "Sleep stages desc: $desc")
                return@forEachNode
            }

            HRVDataParser.parseSleepFactorContentDesc(desc)?.let { (label, mins) ->
                when (label.lowercase()) {
                    "actual sleep time" -> if (data.actualSleepTimeMinutes == null) {
                        data.actualSleepTimeMinutes = mins
                        data.actualSleepTimeRaw = "$mins min"
                    }
                    "sleep latency" -> { /* no field in model — ignore */ }
                    else -> data.setStageMinutes(label, mins)
                }
                Log.d(TAG, "Sleep factor: $label = $mins min")
            }
        }
    }

    // ─── Completion and error ────────────────────────────────────

    private fun completeExtraction() {
        transition(State.COMPLETE)
        deriveSleepEfficiency()
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
     * Like [findById] but skips degenerate-bounds phantom duplicates.
     *
     * The Energy-score value cards (HRV/HR/respiratory) each resolve to TWO
     * nodes under the same id: a stale phantom left by Compose view recycling —
     * bearing the prior render's value with an invalid rectangle (its `right`
     * lands left of `left`, i.e. negative width) — and the real node. Plain
     * `firstOrNull()` returns the phantom (it sorts first), so the scraper read
     * stale HRV/HR/RR. We select the first match with **positive width**
     * (`right > left`).
     *
     * Width, not height: the real node is below the fold at read time (the walk
     * reads the first Energy-score frame without scrolling), so its `bottom` is
     * clamped to the screen while `top` is past it — a non-positive height that
     * is NOT degeneracy. Importance is also not usable: the respiratory phantom
     * is `importantForAccessibility=true`. Bounds-width is the sole reliable
     * discriminator (verified: round-4 uiautomator/logcat capture).
     */
    private fun findByIdValidBounds(root: AccessibilityNodeInfo, id: String): AccessibilityNodeInfo? {
        val matches = root.findAccessibilityNodeInfosByViewId("$SHEALTH:id/$id")
        val chosen = matches.firstOrNull { node ->
            val r = android.graphics.Rect()
            node.getBoundsInScreen(r)
            r.right > r.left
        }
        if (matches.size > 1) {
            val r = android.graphics.Rect()
            chosen?.getBoundsInScreen(r)
            Log.d(TAG, "findByIdValidBounds($id): ${matches.size} matches, " +
                    "chose bounds=$r text=\"${chosen?.text}\"")
        }
        return chosen
    }

    /**
     * Depth-first walk of the node tree. Needed for Compose screens, where
     * data has no resource-ids and must be read from content-desc.
     */
    private fun forEachNode(node: AccessibilityNodeInfo?, action: (AccessibilityNodeInfo) -> Unit) {
        if (node == null) return
        action(node)
        for (i in 0 until node.childCount) forEachNode(node.getChild(i), action)
    }

    /** True if any node's content-desc contains [substr]. */
    private fun hasContentDesc(root: AccessibilityNodeInfo, substr: String): Boolean {
        var found = false
        forEachNode(root) {
            if (!found && it.contentDescription?.toString()?.contains(substr) == true) found = true
        }
        return found
    }

    /** First node whose content-desc starts with [prefix], or null. */
    private fun findByContentDescPrefix(
        root: AccessibilityNodeInfo,
        prefix: String
    ): AccessibilityNodeInfo? {
        var result: AccessibilityNodeInfo? = null
        forEachNode(root) {
            if (result == null && it.contentDescription?.toString()?.startsWith(prefix) == true) {
                result = it
            }
        }
        return result
    }

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

    /**
     * Sleep efficiency is not displayed anywhere on Samsung Health 7.x, so it is
     * DERIVED (not scraped): actual sleep time ÷ time in bed (bedtime → wake),
     * per Samsung's own definition. The value is logged as derived; every other
     * sleep field remains scraped ground truth. Only set when both inputs exist.
     */
    private fun deriveSleepEfficiency() {
        if (data.sleepEfficiencyPct != null) return
        val actual = data.actualSleepTimeMinutes ?: return
        val inBed = HRVDataParser.minutesBetweenClockTimes(data.bedtime, data.wakeTime) ?: return
        if (inBed <= 0) return
        val pct = Math.round(actual * 100.0 / inBed).toInt()
        data.sleepEfficiencyPct = pct
        Log.i(TAG, "Sleep efficiency DERIVED (actual $actual ÷ in-bed $inBed) = $pct%")
    }

    /**
     * First scrollable node in the tree. The Sleep screen's scroll containers
     * carry no resource-id (unlike the Vitality screen's `main_scrollable`), so
     * we locate the scroller generically by its `isScrollable` flag.
     */
    private fun findScrollable(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var result: AccessibilityNodeInfo? = null
        forEachNode(root) { if (result == null && it.isScrollable) result = it }
        return result
    }

    // ─── DIAGNOSTIC: node-tree dump (feat/hrv-node-dump) ──────────
    //
    // Read-only. Exists to diagnose the HRV selector against the *real*
    // Samsung Health node tree instead of inference. Records every node
    // carrying text or content-desc, with the full attribute set needed to
    // choose an identity-based selector: viewId, text, desc, isSelected,
    // isChecked, className, and screen bounds. Remove once the selector is
    // fixed — this writes to app-private external storage on every frame.

    /**
     * Depth-first dump of one node subtree. Emits a line per node that has
     * text or a content-desc (structural containers are skipped to keep the
     * file readable); indentation encodes depth.
     */
    private fun dumpTree(node: AccessibilityNodeInfo?, depth: Int, out: StringBuilder) {
        node ?: return
        val t = node.text?.toString()
        val cd = node.contentDescription?.toString()
        if (!t.isNullOrBlank() || !cd.isNullOrBlank()) {
            val b = Rect().also { node.getBoundsInScreen(it) }
            out.appendLine(
                "${"  ".repeat(depth)}i=${node.viewIdResourceName} " +
                "text='$t' desc='$cd' sel=${node.isSelected} chk=${node.isChecked} " +
                "cls=${node.className} $b"
            )
        }
        for (i in 0 until node.childCount) dumpTree(node.getChild(i), depth + 1, out)
    }

    /**
     * Writes one framed dump of [root] (already confirmed to be Samsung Health
     * by the caller) to nodedump.txt in app-private external storage. The
     * header carries the package so the capture can be verified as Samsung
     * Health's tree, not our own. Appends — multiple pages accumulate in one
     * file. Failures are swallowed and logged; instrumentation must never
     * disturb the extraction flow.
     */
    private fun dumpActiveTree(root: AccessibilityNodeInfo) {
        try {
            val sb = StringBuilder()
            sb.appendLine("=== ${System.currentTimeMillis()} pkg=${root.packageName} state=$state ===")
            dumpTree(root, 0, sb)
            File(getExternalFilesDir(null), "nodedump.txt").appendText(sb.toString() + "\n\n")
        } catch (e: Exception) {
            Log.w(TAG, "nodedump failed: ${e.message}")
        }
    }
}
