package com.irldate

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.nio.charset.Charset

class DateModeModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private var advertiser: BluetoothLeAdvertiser? = null
  private var advertiseCallback: AdvertiseCallback? = null

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
    stopAdvertising()
  }

  @ReactMethod
  fun startAdvertising(userId: String) {
    val manager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    val adapter: BluetoothAdapter? = manager.adapter

    if (adapter == null || !adapter.isEnabled) {
      Log.w("DateMode", "Bluetooth adapter not available or disabled")
      return
    }

    val adv = adapter.bluetoothLeAdvertiser
    if (adv == null) {
      Log.w("DateMode", "BLE advertising not supported")
      return
    }

    // stop any previous advertising session
    stopAdvertising()

    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
      .setConnectable(false)
      .build()

    val payload = "IRLDate-${userId.take(12)}".toByteArray(Charset.forName("UTF-8"))

    val data = AdvertiseData.Builder()
      .addManufacturerData(0x1234, payload)
      .build()

    val callback = object : AdvertiseCallback() {
      override fun onStartFailure(errorCode: Int) {
        Log.w("DateMode", "BLE advertise failed: $errorCode")
      }
    }

    advertiseCallback = callback
    advertiser = adv

    try {
      adv.startAdvertising(settings, data, callback)
    } catch (e: SecurityException) {
      Log.w("DateMode", "BLE advertise security exception: ${e.message}")
    }
  }

  @ReactMethod
  fun stopAdvertising() {
    try {
      advertiseCallback?.let { cb ->
        advertiser?.stopAdvertising(cb)
      }
    } catch (e: SecurityException) {
      Log.w("DateMode", "BLE stop advertise security exception: ${e.message}")
    } finally {
      advertiseCallback = null
      advertiser = null
    }
  }
}
