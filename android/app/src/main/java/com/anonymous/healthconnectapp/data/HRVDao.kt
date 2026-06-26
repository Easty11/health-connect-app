package com.anonymous.healthconnectapp.data

import androidx.room.*

@Dao
interface HRVDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(reading: HRVReading)

    @Query("SELECT * FROM hrv_readings WHERE synced = 0")
    suspend fun getUnsynced(): List<HRVReading>

    @Query("SELECT * FROM hrv_readings WHERE capturedAt >= :startOfDay LIMIT 1")
    suspend fun getReadingForToday(startOfDay: Long): HRVReading?

    @Query("UPDATE hrv_readings SET synced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("DELETE FROM hrv_readings WHERE id = :id")
    suspend fun deleteById(id: String)
}
