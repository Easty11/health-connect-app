package com.anonymous.healthconnectapp.data

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class HRVSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "HRVSyncWorker"
        private const val SYNC_URL =
            "https://health-app-backend-production-760e.up.railway.app/samsung-hrv/sync"
        private const val PREFS_NAME = "health_hrv_prefs"
        private const val TOKEN_KEY = "auth_token"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Worker started")
        val db = AppDatabase.getInstance(applicationContext)
        val dao = db.hrvDao()
        val unsynced = dao.getUnsynced()

        if (unsynced.isEmpty()) {
            Log.d(TAG, "No unsynced readings")
            return@withContext Result.success()
        }

        val token = applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(TOKEN_KEY, null)

        if (token == null) {
            Log.w(TAG, "No auth token found in SharedPreferences — cannot sync")
            return@withContext Result.failure()
        }

        val validReadings = unsynced.filter { reading ->
            if (reading.id.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) {
                true
            } else {
                Log.w(TAG, "Deleting stale reading with invalid id: ${reading.id}")
                runBlocking { dao.deleteById(reading.id) }
                false
            }
        }
        if (validReadings.isEmpty()) return@withContext Result.success()

        return@withContext try {
            val payload = buildPayload(validReadings)
            Log.d(TAG, "Posting to backend: $payload")
            val responseCode = post(SYNC_URL, token, payload)
            if (responseCode == HttpURLConnection.HTTP_OK) {
                validReadings.forEach { dao.markSynced(it.id) }
                Log.i(TAG, "Synced ${validReadings.size} reading(s)")
                Result.success()
            } else {
                Log.w(TAG, "Sync failed: HTTP $responseCode")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync error: ${e.message}")
            Result.retry()
        }
    }

    private fun buildPayload(readings: List<HRVReading>): String {
        val array = JSONArray()
        for (r in readings) {
            val obj = JSONObject().apply {
                put("captured_at", r.id)   // id IS the date string, e.g. "2026-06-08"
                putOpt("hrv_ms", r.hrvMs)
                putOpt("sleep_hr_bpm", r.sleepHRBpm)
                putOpt("respiratory_rate", r.respiratoryRate)
                putOpt("sleep_efficiency_pct", r.sleepEfficiencyPct)
                putOpt("actual_sleep_time_minutes", r.actualSleepTimeMinutes)
                putOpt("sleep_duration_home_tile", r.sleepDurationHomeTile)
                putOpt("bedtime", r.bedtime)
                putOpt("wake_time", r.wakeTime)
                putOpt("awake_minutes", r.awakeMinutes)
                putOpt("rem_minutes", r.remMinutes)
                putOpt("light_minutes", r.lightMinutes)
                putOpt("deep_minutes", r.deepMinutes)
                putOpt("awake_pct", r.awakePct)
                putOpt("rem_pct", r.remPct)
                putOpt("light_pct", r.lightPct)
                putOpt("deep_pct", r.deepPct)
                putOpt("total_sleep_time_minutes", r.totalSleepTimeMinutes)
                putOpt("spo2_average_pct", r.spO2AveragePct)
                put("extraction_method", r.extractionMethod)
            }
            array.put(obj)
        }
        return JSONObject().put("readings", array).toString()
    }

    private fun post(url: String, token: String, body: String): Int {
        val conn = URL(url).openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000
            conn.doOutput = true
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            conn.responseCode
        } finally {
            conn.disconnect()
        }
    }
}
