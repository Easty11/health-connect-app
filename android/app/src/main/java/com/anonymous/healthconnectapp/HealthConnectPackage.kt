package com.anonymous.healthconnectapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class HealthConnectPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext):
        List<NativeModule> = listOf(HealthConnectModule(context))

    override fun createViewManagers(context: ReactApplicationContext):
        List<ViewManager<*, *>> = emptyList()
}
