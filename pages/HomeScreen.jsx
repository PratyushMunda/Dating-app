import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen({
  machineState,
  dispatchMachine,
  sessionStartedAt,
}) {
  const dateModeActive = machineState !== 'IDLE';

  const getActiveDuration = () => {
    if (!sessionStartedAt) return '';
    const min = Math.floor((Date.now() - sessionStartedAt) / 60000);
    return min < 1 ? 'Active just now' : `Active for ${min} min`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>IRLDate</Text>
        <Text style={styles.subtitle}>
          Be open to spontaneous connections
        </Text>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Date Mode</Text>
          <Switch
            value={dateModeActive}
            onValueChange={v =>
              dispatchMachine(
                v ? 'DATE_MODE_ENABLED' : 'DATE_MODE_DISABLED'
              )
            }
          />
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: dateModeActive ? '#d1fae5' : '#fee2e2' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: dateModeActive ? '#065f46' : '#991b1b' },
            ]}
          >
            {dateModeActive
              ? `ACTIVE — ${getActiveDuration()}`
              : 'INACTIVE'}
          </Text>
        </View>

        {machineState === 'NEARBY_CANDIDATE_FOUND' && (
          <View style={styles.nearbyCard}>
            <Text style={styles.nearbyTitle}>Someone nearby 👀</Text>
            <Text style={styles.nearbySubtitle}>
              Looks like someone is close to you
            </Text>

            <View style={styles.nearbyActions}>
              <Text
                style={[styles.btn, styles.accept]}
                onPress={() => dispatchMachine('USER_ACCEPTED')}
              >
                Accept
              </Text>
              <Text
                style={[styles.btn, styles.decline]}
                onPress={() => dispatchMachine('USER_DECLINED')}
              >
                Decline
              </Text>
            </View>
          </View>
        )}

        {/* DEBUG */}
        <Text
          style={styles.debug}
          onPress={() => dispatchMachine('NEARBY_DETECTED')}
        >
          → Simulate NEARBY_DETECTED
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', padding: 24, borderRadius: 18, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#6b7280', marginBottom: 24 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 18 },
  statusBadge: { marginTop: 16, paddingVertical: 10, borderRadius: 999 },
  statusText: { textAlign: 'center', fontWeight: '600' },

  nearbyCard: { marginTop: 24, padding: 20, borderRadius: 16 },
  nearbyTitle: { fontSize: 18, fontWeight: '700' },
  nearbySubtitle: { color: '#6b7280', marginBottom: 16 },
  nearbyActions: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { padding: 10, borderRadius: 999, fontWeight: '600' },
  accept: { backgroundColor: '#d1fae5', color: '#065f46' },
  decline: { backgroundColor: '#fee2e2', color: '#991b1b' },

  debug: { marginTop: 20, color: '#2563eb', fontWeight: '600' },
});
