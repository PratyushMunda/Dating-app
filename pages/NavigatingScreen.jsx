import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  magnetometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import { map } from 'rxjs/operators';

/* ---------- utils ---------- */

function bearingBetween(a, b) {
  const toRad = v => (v * Math.PI) / 180;
  const toDeg = v => (v * 180) / Math.PI;

  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* ---------- screen ---------- */

export default function NavigatingScreen({
  dispatchMachine,
  userLocation,
  candidateLocation,
}) {
  const [heading, setHeading] = useState(0);
  const [directionCorrect, setDirectionCorrect] = useState(null);

  /* 📡 Compass — SAFE sampling rate (Android 13+) */
  useEffect(() => {
    // 200ms = smooth + allowed (no HIGH_SAMPLING_RATE permission)
    setUpdateIntervalForType(SensorTypes.magnetometer, 200);

    const sub = magnetometer
      .pipe(
        map(({ x, y }) => {
          const angle = Math.atan2(y, x) * (180 / Math.PI);
          return (angle + 360) % 360;
        })
      )
      .subscribe(setHeading);

    return () => sub.unsubscribe();
  }, []);

  /* 🧭 Compare heading vs bearing */
  useEffect(() => {
    if (!userLocation || !candidateLocation) return;

    const bearing = bearingBetween(userLocation, candidateLocation);
    const diff = Math.abs(heading - bearing);

    // ±25° tolerance
    const correct = diff < 25 || diff > 335;
    setDirectionCorrect(correct);
  }, [heading, userLocation, candidateLocation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Getting closer…</Text>

        <Text style={styles.arrow}>
          {directionCorrect === null
            ? '🧭'
            : directionCorrect
            ? '⬆️'
            : '↩️'}
        </Text>

        <Text style={styles.status}>
          {directionCorrect === null
            ? 'Find the right direction'
            : directionCorrect
            ? 'You’re moving in the right direction'
            : 'Turn around'}
        </Text>

        {/* DEBUG — remove later */}
        <Text style={styles.debug}>
          Heading: {Math.round(heading)}°
        </Text>

        <View style={styles.actions}>
          <Text
            style={[styles.btn, styles.primary]}
            onPress={() => dispatchMachine('BLUETOOTH_CLOSE')}
          >
            Simulate VERY CLOSE
          </Text>

          <Text
            style={[styles.btn, styles.cancel]}
            onPress={() => dispatchMachine('CANCEL')}
          >
            Cancel
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 48,
    marginVertical: 16,
  },
  status: {
    color: '#0369a1',
    marginBottom: 12,
  },
  debug: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  actions: {
    gap: 12,
    width: '100%',
  },
  btn: {
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e0f2fe',
    fontWeight: '600',
    textAlign: 'center',
  },
  primary: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  cancel: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
});
