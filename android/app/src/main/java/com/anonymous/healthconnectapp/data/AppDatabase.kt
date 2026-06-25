package com.anonymous.healthconnectapp.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [HRVReading::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun hrvDao(): HRVDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "hrv_database"
                ).build().also { instance = it }
            }
    }
}
