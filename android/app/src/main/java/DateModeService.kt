package com.irldate

import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat

class DateModeService : Service() {

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {

    val notification = NotificationCompat.Builder(this, "date_mode")
      .setContentTitle("IRLDate active")
      .setContentText("Date Mode is running")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()

    startForeground(1, notification)

    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? {
    return null
  }

  override fun onDestroy() {
    super.onDestroy()
    stopForeground(true)
  }
}
