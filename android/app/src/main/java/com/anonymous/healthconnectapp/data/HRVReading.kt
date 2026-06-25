package com.anonymous.healthconnectapp.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate

@Entity(tableName = "hrv_readings")
data class HRVReading(
    @PrimaryKey val id: String = LocalDate.now().toString(),  // e.g. "2026-06-08" — re-run overwrites same day
    val capturedAt: Long,
    val hrvMs: Double? = null,
    val sleepHRBpm: Int? = null,
    val respiratoryRate: Double? = null,
    val sleepEfficiencyPct: Int? = null,
    val actualSleepTimeMinutes: Int? = null,
    val sleepDurationHomeTile: String? = null,
    val sleepDurationMinutes: Int? = null,
    val bedtime: String? = null,
    val wakeTime: String? = null,
    val awakeMinutes: Int? = null,
    val remMinutes: Int? = null,
    val lightMinutes: Int? = null,
    val deepMinutes: Int? = null,
    val awakePct: Int? = null,
    val remPct: Int? = null,
    val lightPct: Int? = null,
    val deepPct: Int? = null,
    val totalSleepTimeMinutes: Int? = null,
    val spO2AveragePct: Double? = null,
    val extractionMethod: String = "accessibility",
    val synced: Boolean = false
)
