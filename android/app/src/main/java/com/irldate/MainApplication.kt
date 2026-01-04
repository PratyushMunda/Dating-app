package com.irldate

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
           add(DateModePackage())
          // Manually add packages here if needed
        },
    )
  }

  override fun onCreate() {
    super.onCreate()

    // 🔔 Notification channel for Date Mode foreground service
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "date_mode",
        "Date Mode",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Keeps IRLDate active during Date Mode"
        setShowBadge(false)
      }

      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }

    loadReactNative(this)
  }
}
