package com.anonymous.healthconnectapp

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.anonymous.healthconnectapp.hrv.HRVAccessibilityService

class HRVCaptureModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val PREFS_NAME = "health_hrv_prefs"
        const val TOKEN_KEY = "auth_token"
    }

    override fun getName() = "HRVCapture"

    @ReactMethod
    fun triggerManualExtraction(promise: Promise) {
        val service = HRVAccessibilityService.instance
        if (service == null) {
            promise.reject(
                "SERVICE_UNAVAILABLE",
                "HRV Accessibility Service is not running. Enable it in Settings → Accessibility."
            )
            return
        }
        service.startExtraction(force = true)
        promise.resolve(null)
    }

    @ReactMethod
    fun storeAuthToken(token: String, promise: Promise) {
        reactApplicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(TOKEN_KEY, token)
            .apply()
        promise.resolve(null)
    }

    @ReactMethod
    fun clearAuthToken(promise: Promise) {
        reactApplicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(TOKEN_KEY)
            .apply()
        promise.resolve(null)
    }

    // Required by NativeEventEmitter — stubs satisfy the JS-side listener
    // lifecycle (events are dispatched via RCTDeviceEventEmitter).
    @ReactMethod
    fun addListener(eventName: String) { }

    @ReactMethod
    fun removeListeners(count: Int) { }
}
