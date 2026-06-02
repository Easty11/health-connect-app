package com.anonymous.healthconnectapp

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class HealthConnectModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "HealthConnectModule"

    @ReactMethod
    fun openHealthConnectPermissions(promise: Promise) {
        try {
            val intent = Intent("androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE")
            intent.setPackage("com.google.android.healthconnect.controller")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e1: Exception) {
            try {
                // Fallback for older Health Connect versions
                val intent2 = Intent("android.health.connect.action.HEALTH_HOME_SETTINGS")
                intent2.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent2)
                promise.resolve(true)
            } catch (e2: Exception) {
                promise.reject("ERROR", e2.message)
            }
        }
    }
}
