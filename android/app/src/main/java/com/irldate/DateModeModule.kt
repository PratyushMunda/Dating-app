package com.irldate

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DateModeModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DateMode"

  @ReactMethod
  fun startService() {
    val intent = Intent(reactContext, DateModeService::class.java)
    reactContext.startForegroundService(intent)
  }

  @ReactMethod
  fun stopService() {
    val intent = Intent(reactContext, DateModeService::class.java)
    reactContext.stopService(intent)
  }
}
