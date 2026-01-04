import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NavigatingScreen({ dispatchMachine }) {
  const [directionCorrect, setDirectionCorrect] = useState(null);

  useEffect(() => {
    setDirectionCorrect(null);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Getting closer…</Text>

        <Text style={styles.arrow}>
          {directionCorrect === null ? '🧭' : directionCorrect ? '⬆️' : '↩️'}
        </Text>

        <Text style={styles.status}>
          {directionCorrect === null
            ? 'Find the right direction'
            : directionCorrect
            ? 'You’re getting closer'
            : 'You’re moving away'}
        </Text>

        <View style={styles.actions}>
          <Text style={styles.btn} onPress={() => setDirectionCorrect(true)}>
            Simulate Correct
          </Text>
          <Text style={styles.btn} onPress={() => setDirectionCorrect(false)}>
            Simulate Wrong
          </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 24, borderRadius: 18, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  arrow: { fontSize: 48, marginVertical: 16 },
  status: { color: '#0369a1', marginBottom: 16 },
  actions: { gap: 12 },
  btn: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: '#e0f2fe',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancel: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
});
