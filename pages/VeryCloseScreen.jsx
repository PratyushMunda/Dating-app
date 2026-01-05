import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BleManager, State } from 'react-native-ble-plx';

const RSSI_THRESHOLD = -60; // ~1–3 meters

export default function VeryCloseScreen({ dispatchMachine }) {
  const manager = useRef(new BleManager()).current;
  const [bluetoothReady, setBluetoothReady] = useState(false);

  /* 🔵 Check Bluetooth state */
  useEffect(() => {
    const sub = manager.onStateChange(state => {
      if (state === State.PoweredOn) {
        setBluetoothReady(true);
      } else {
        setBluetoothReady(false);
      }
    }, true);

    return () => {
      sub.remove();
      manager.destroy();
    };
  }, []);

  /* 🔍 Start scan ONLY when Bluetooth is ON */
  useEffect(() => {
    if (!bluetoothReady) return;

    manager.startDeviceScan(
      null,
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          console.warn(error);
          return;
        }

        if (device?.name?.startsWith('IRLDate')) {
          if (device.rssi && device.rssi > RSSI_THRESHOLD) {
            manager.stopDeviceScan();
            dispatchMachine('MATCH_CONFIRMED');
          }
        }
      }
    );

    return () => manager.stopDeviceScan();
  }, [bluetoothReady]);

  /* ⚠️ Prompt user if Bluetooth is OFF */
  if (!bluetoothReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Turn on Bluetooth</Text>
          <Text style={styles.subtitle}>
            Bluetooth is required to confirm proximity
          </Text>
          <Text style={styles.icon}>📶</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Almost there…</Text>
        <Text style={styles.subtitle}>
          Waiting for nearby confirmation
        </Text>
        <Text style={styles.pulse}>🔵</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 24, borderRadius: 18, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#6b7280', marginTop: 8 },
  pulse: { fontSize: 40, marginTop: 20 },
  icon: { fontSize: 36, marginTop: 16 },
});
