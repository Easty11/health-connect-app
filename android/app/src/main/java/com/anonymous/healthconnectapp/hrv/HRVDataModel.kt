package com.anonymous.healthconnectapp.hrv

import com.anonymous.healthconnectapp.data.HRVReading

// ─────────────────────────────────────────────────────────────────
// HRVExtractedData.kt
//
// Data model for one night's extraction.
// Field names match the algorithm document metric inventory.
// ─────────────────────────────────────────────────────────────────

data class HRVExtractedData(
    var capturedAt: Long = System.currentTimeMillis(),

    // ── Energy Score screen ──────────────────────────────────────
    // "Average: 95 ms" → 95.0
    // Samsung labels this "Heart rate variability during sleep" — ms unit.
    // CONFIRM: tap the ⓘ button on Energy Score screen to verify if this is RMSSD.
    var hrvMs: Double? = null,

    // "Average: 58 bpm" → 58
    var sleepHRBpm: Int? = null,

    // ── Sleep screen (after scroll) ──────────────────────────────
    // Same metric as sleepHRBpm but from the detailed chart legend.
    // Use this as primary; sleepHRBpm as fallback.
    var sleepHRBpmDetailed: Int? = null,

    // "13.2 times/min" → 13.2
    var respiratoryRate: Double? = null,

    // ── Sleep Score Factors screen ────────────────────────────────
    // Parsed from "5 h 47 m\nSleep efficiency: 90%"
    var sleepEfficiencyPct: Int? = null,

    // ── SpO2 screen ───────────────────────────────────────────────
    // "Average: 95%" → 95.0
    var spO2AveragePct: Double? = null,
    // "Lowest: 87%" → 87.0
    var spO2LowestPct: Double? = null,

    // ── Home tile data ────────────────────────────────────────────
    // Available without navigating — use as cross-check.
    var sleepDurationHomeTile: String? = null,  // "7h 33m" — raw
    var sleepDurationMinutes: Int? = null,       // computed
    var bedtime: String? = null,                 // "22:57"
    var wakeTime: String? = null,                // "06:30"

    // ── Sleep screen — actual sleep time ─────────────────────────
    var actualSleepTimeRaw: String? = null,      // "7 h 22 m"
    var actualSleepTimeMinutes: Int? = null,

    // ── Sleep stages ──────────────────────────────────────────────
    // Duration in minutes. Percentages available as cross-check.
    var awakeMinutes: Int? = null,
    var remMinutes: Int? = null,
    var lightMinutes: Int? = null,
    var deepMinutes: Int? = null,
    var awakePct: Int? = null,
    var remPct: Int? = null,
    var lightPct: Int? = null,
    var deepPct: Int? = null,
    var totalSleepTimeMinutes: Int? = null,  // from content-desc

    // ── Metadata ──────────────────────────────────────────────────
    var extractionMethod: String = "accessibility",
    var synced: Boolean = false
) {
    fun reset() {
        capturedAt = System.currentTimeMillis()
        hrvMs = null
        sleepHRBpm = null
        sleepHRBpmDetailed = null
        respiratoryRate = null
        sleepEfficiencyPct = null
        spO2AveragePct = null
        spO2LowestPct = null
        sleepDurationHomeTile = null
        sleepDurationMinutes = null
        bedtime = null
        wakeTime = null
        actualSleepTimeRaw = null
        actualSleepTimeMinutes = null
        awakeMinutes = null
        remMinutes = null
        lightMinutes = null
        deepMinutes = null
        awakePct = null
        remPct = null
        lightPct = null
        deepPct = null
        totalSleepTimeMinutes = null
        synced = false
    }

    /** Deep copy for handing off to the database writer. */
    fun snapshot(): HRVExtractedData = copy()

    /**
     * Resolves stage title → field.
     * Always match by title — never assume index order is stable.
     */
    fun setStageDuration(title: String, value: String) {
        val minutes = HRVDataParser.parseDurationToMinutes(value) ?: return
        when (title.trim().lowercase()) {
            "awake"  -> awakeMinutes = minutes
            "rem"    -> remMinutes   = minutes
            "light"  -> lightMinutes = minutes
            "deep"   -> deepMinutes  = minutes
            else     -> android.util.Log.w("HRVData", "Unknown stage title: $title")
        }
    }

    /**
     * Routes a SH 7.x sleep-stage factor (label + already-parsed minutes) to
     * its field. Labels come from Compose content-descs, e.g. "Deep sleep".
     * Always match by label — never assume card order is stable.
     */
    fun setStageMinutes(label: String, minutes: Int) {
        when (label.trim().lowercase()) {
            "awake"               -> awakeMinutes = minutes
            "rem sleep", "rem"    -> remMinutes   = minutes
            "light sleep", "light" -> lightMinutes = minutes
            "deep sleep", "deep"  -> deepMinutes  = minutes
            else -> android.util.Log.w("HRVData", "Unrouted stage label: $label")
        }
    }

    /**
     * Routes a sleep-stage percentage to its field. Labels come from the SH 7.x
     * stages-breakdown content-desc, e.g. "Light". Match by label, never index.
     */
    fun setStagePercent(label: String, pct: Int) {
        when (label.trim().lowercase()) {
            "awake"               -> awakePct = pct
            "rem sleep", "rem"    -> remPct   = pct
            "light sleep", "light" -> lightPct = pct
            "deep sleep", "deep"  -> deepPct  = pct
            else -> android.util.Log.w("HRVData", "Unrouted stage pct label: $label")
        }
    }

    /** Best available sleep HR — detailed screen preferred. */
    val resolvedSleepHR: Int? get() = sleepHRBpmDetailed ?: sleepHRBpm

    /** Convenience: all core fields populated. */
    val isSufficient: Boolean get() =
        hrvMs != null && resolvedSleepHR != null && respiratoryRate != null
}

fun HRVExtractedData.toEntity() = HRVReading(
    capturedAt            = capturedAt,
    hrvMs                 = hrvMs,
    sleepHRBpm            = sleepHRBpm,
    respiratoryRate       = respiratoryRate,
    sleepEfficiencyPct    = sleepEfficiencyPct,
    actualSleepTimeMinutes = actualSleepTimeMinutes,
    sleepDurationHomeTile = sleepDurationHomeTile,
    sleepDurationMinutes  = sleepDurationMinutes,
    bedtime               = bedtime,
    wakeTime              = wakeTime,
    awakeMinutes          = awakeMinutes,
    remMinutes            = remMinutes,
    lightMinutes          = lightMinutes,
    deepMinutes           = deepMinutes,
    awakePct              = awakePct,
    remPct                = remPct,
    lightPct              = lightPct,
    deepPct               = deepPct,
    totalSleepTimeMinutes = totalSleepTimeMinutes,
    spO2AveragePct        = spO2AveragePct,
    extractionMethod      = extractionMethod,
    synced                = synced
)


// ─────────────────────────────────────────────────────────────────
// HRVDataParser.kt
//
// Stateless parsing utilities for Samsung Health UI text strings.
// All inputs are the confirmed raw strings from uiautomator dumps.
// ─────────────────────────────────────────────────────────────────

object HRVDataParser {

    /**
     * Parses "Average: 95 ms" with unit "ms" → 95.0
     * Parses "Average: 95%"  with unit "%"  → 95.0
     * Parses "Average: 58 bpm" with unit "bpm" → 58.0
     *
     * Strips prefix "Average:" and suffix unit, trims, converts.
     */
    fun parseAverage(text: String, unit: String): Double? = runCatching {
        text.removePrefix("Average:")
            .removeSuffix(unit)
            .trim()
            .toDouble()
    }.getOrNull()

    /**
     * Parses "Lowest: 87%" → 87.0
     */
    fun parseLowest(text: String): Double? = runCatching {
        text.removePrefix("Lowest:")
            .removeSuffix("%")
            .trim()
            .toDouble()
    }.getOrNull()

    /**
     * Extracts the first decimal number from an arbitrary string.
     * "13.2 times/min" → 13.2
     * "58 bpm"         → 58.0
     */
    fun parseFirstNumber(text: String): Double? =
        Regex("\\d+\\.?\\d*").find(text)?.value?.toDoubleOrNull()

    /**
     * Parses "1 h 29 m" or "19 m" or "4 h 4 m" → total minutes.
     * Handles hours-only, minutes-only, and both.
     */
    fun parseDurationToMinutes(text: String): Int? {
        var total = 0
        var found = false

        Regex("(\\d+)\\s*h").find(text)?.groupValues?.get(1)?.toIntOrNull()?.let {
            total += it * 60
            found = true
        }
        Regex("(\\d+)\\s*m(?!in)").find(text)?.groupValues?.get(1)?.toIntOrNull()?.let {
            total += it
            found = true
        }

        return if (found) total else null
    }

    /**
     * Parses "1 h 56 m\nSleep efficiency: 85%" → 85
     * Also handles "5 h 47 m\nSleep efficiency: 90%"
     *
     * Splits on newline, finds the efficiency line, extracts integer.
     */
    fun parseSleepEfficiency(text: String): Int? {
        val efficiencyLine = text.split("\n")
            .firstOrNull { it.contains("Sleep efficiency", ignoreCase = true) }
            ?: return null

        return Regex("(\\d+)%").find(efficiencyLine)
            ?.groupValues?.get(1)
            ?.toIntOrNull()
    }

    /**
     * Parses the sleep_stages_chart content-desc string into the data model.
     *
     * Confirmed format (One UI 6.x):
     * "Chart from , Sleep time 6 hours 6 minutes, Bedtime 22:25,
     *  wake-up time 04:31, Awake5%, REM24%, Light66%, Deep3%,
     *  Double tap other records on chart to view details."
     *
     * Also handles the home tile content-desc variant:
     * "Sleep , 3 sleep records Total sleep time 7 hours 33 minutes
     *  Sleep start time 22:57 Wake-up time 06:30, Sleep score 37, Attention"
     */
    fun parseStagesContentDesc(desc: String, data: HRVExtractedData) {
        // Total sleep time: "6 hours 6 minutes" or "7 hours 33 minutes"
        Regex("(\\d+)\\s*hours?\\s*(\\d+)\\s*minutes?").find(desc)?.let { match ->
            val hours = match.groupValues[1].toIntOrNull() ?: 0
            val mins  = match.groupValues[2].toIntOrNull() ?: 0
            data.totalSleepTimeMinutes = hours * 60 + mins
        }

        // Stage percentages — Awake5%, REM24%, Light66%, Deep3%
        data.awakePct = Regex("Awake(\\d+)%", RegexOption.IGNORE_CASE)
            .find(desc)?.groupValues?.get(1)?.toIntOrNull()
        data.remPct   = Regex("REM(\\d+)%",   RegexOption.IGNORE_CASE)
            .find(desc)?.groupValues?.get(1)?.toIntOrNull()
        data.lightPct = Regex("Light(\\d+)%", RegexOption.IGNORE_CASE)
            .find(desc)?.groupValues?.get(1)?.toIntOrNull()
        data.deepPct  = Regex("Deep(\\d+)%",  RegexOption.IGNORE_CASE)
            .find(desc)?.groupValues?.get(1)?.toIntOrNull()
    }

    /**
     * Parses Samsung Health 7.x natural-language durations into minutes.
     *   "1 hour 6 minutes"   → 66
     *   "6 hours 23 minutes" → 383
     *   "49 minutes"         → 49
     *   "5 minutes"          → 5
     *
     * Confirmed against live SH 7.00.0.107 (Jetpack Compose Sleep screen),
     * 25 June 2026. Distinct from parseDurationToMinutes, which handles the
     * legacy "1 h 6 m" compact form (now gone from the Sleep screen).
     */
    fun parseNaturalLanguageDuration(text: String): Int? {
        val h = Regex("(\\d+)\\s*hours?").find(text)?.groupValues?.get(1)?.toIntOrNull()
        val m = Regex("(\\d+)\\s*minutes?").find(text)?.groupValues?.get(1)?.toIntOrNull()
        if (h == null && m == null) return null
        return (h ?: 0) * 60 + (m ?: 0)
    }

    /**
     * Parses the combined Sleep-screen header content-desc (SH 7.x Compose).
     *
     * Confirmed live string (25 June 2026):
     * "Sleep time,7 hours 12 minutes,Bedtime 22:12, wake-up time 05:57,
     *  Actual sleep time, 6 hours 23 minutes"
     *
     * Populates totalSleepTimeMinutes, bedtime, wakeTime, actualSleepTime*.
     */
    fun parseSleepTimingContentDesc(desc: String, data: HRVExtractedData) {
        Regex(
            "Sleep time,\\s*(.+?),\\s*Bedtime\\s*(\\d+:\\d+).*?" +
            "wake-up time\\s*(\\d+:\\d+).*?Actual sleep time,\\s*(.+)$"
        ).find(desc)?.let { m ->
            parseNaturalLanguageDuration(m.groupValues[1])?.let { data.totalSleepTimeMinutes = it }
            data.bedtime = m.groupValues[2]
            data.wakeTime = m.groupValues[3]
            parseNaturalLanguageDuration(m.groupValues[4])?.let {
                data.actualSleepTimeMinutes = it
                data.actualSleepTimeRaw = m.groupValues[4].trim()
            }
        }
    }

    /**
     * Parses a single Sleep-score-factor card content-desc (SH 7.x Compose).
     *
     * Confirmed live strings (25 June 2026), each on its own View node:
     * "Deep sleep, 5 minutes, Attention, Button"
     * "REM sleep, 1 hour 6 minutes, Fair, Button"
     * "Awake, 49 minutes, Good, Button"
     * "Actual sleep time, 6 hours 23 minutes, Fair, Button"
     * "Sleep latency, 6 minutes, Excellent, Button"
     *
     * Returns (label, minutes) or null if the desc isn't a known factor.
     * Note: Light sleep is NOT exposed as a factor on this screen.
     */
    fun parseSleepFactorContentDesc(desc: String): Pair<String, Int>? {
        val m = Regex(
            "^\\s*(Deep sleep|REM sleep|Light sleep|Awake|Actual sleep time|Sleep latency)" +
            "\\s*,\\s*(.+?)\\s*,"
        ).find(desc) ?: return null
        val mins = parseNaturalLanguageDuration(m.groupValues[2]) ?: return null
        return m.groupValues[1] to mins
    }

    /**
     * Parses the SH 7.x Sleep-screen stages-breakdown content-desc, which lists
     * every stage's duration AND percentage in one string. This is the only
     * place Light-sleep minutes and the per-stage percentages are exposed.
     *
     * Confirmed live string (25 June 2026):
     * "Awake, 49 minutes, 11 percent,  Typical range,  REM, 1 hour 6 minutes,
     *  15 percent,  Typical range,  Light, 5 hours 12 minutes, 73 percent,
     *  Typical range,  Deep, 5 minutes, 1 percent"
     *
     * Distinct from parseStagesContentDesc (the older "Awake5%, REM24%…" chart
     * form), which is gone from this screen.
     */
    fun parseSleepStagesContentDesc(desc: String, data: HRVExtractedData) {
        Regex("(Awake|REM|Light|Deep)\\s*,\\s*(.+?)\\s*,\\s*(\\d+)\\s*percent")
            .findAll(desc)
            .forEach { m ->
                val label = m.groupValues[1]
                parseNaturalLanguageDuration(m.groupValues[2])?.let { data.setStageMinutes(label, it) }
                m.groupValues[3].toIntOrNull()?.let { data.setStagePercent(label, it) }
            }
    }

    /**
     * Minutes between two "HH:mm" clock times, wrapping past midnight — e.g.
     * bedtime 22:12 → wake 05:57 = 465. Returns null on malformed input.
     */
    fun minutesBetweenClockTimes(start: String?, end: String?): Int? {
        val s = parseClockToMinutes(start) ?: return null
        val e = parseClockToMinutes(end) ?: return null
        val diff = e - s
        return if (diff >= 0) diff else diff + 24 * 60
    }

    private fun parseClockToMinutes(t: String?): Int? {
        val m = Regex("^(\\d{1,2}):(\\d{2})$").find(t?.trim() ?: return null) ?: return null
        val h = m.groupValues[1].toIntOrNull() ?: return null
        val min = m.groupValues[2].toIntOrNull() ?: return null
        if (h !in 0..23 || min !in 0..59) return null
        return h * 60 + min
    }

    /**
     * Validates a reading is within physiologically plausible ranges.
     * Reject values outside these ranges as likely parse errors.
     *
     * Ranges from Readiness Algorithm document.
     */
    fun validate(data: HRVExtractedData): List<String> {
        val warnings = mutableListOf<String>()

        data.hrvMs?.let {
            if (it < 5 || it > 200) warnings.add("HRV $it ms outside plausible range (5–200)")
        }
        data.resolvedSleepHR?.let {
            if (it < 30 || it > 100) warnings.add("Sleep HR $it bpm outside range (30–100)")
        }
        data.respiratoryRate?.let {
            if (it < 8 || it > 25) warnings.add("Respiratory rate $it outside range (8–25)")
        }
        data.sleepEfficiencyPct?.let {
            if (it < 0 || it > 100) warnings.add("Sleep efficiency $it% outside range (0–100)")
        }
        data.spO2AveragePct?.let {
            if (it < 70 || it > 100) warnings.add("SpO2 avg $it% outside range (70–100)")
        }
        data.totalSleepTimeMinutes?.let {
            if (it < 60 || it > 720) warnings.add("Sleep duration $it min outside range (1–12h)")
        }

        return warnings
    }
}
