import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VeryCloseScreen({ dispatchMachine }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>You’re very close 👀</Text>
        <Text style={styles.subtitle}>
          Looks like you found each other
        </Text>

        <Text
          style={styles.confirm}
          onPress={() => dispatchMachine('MATCH_CONFIRMED')}
        >
          Confirm Meet
        </Text>

        <Text
          style={styles.cancel}
          onPress={() => dispatchMachine('CANCEL')}
        >
          Cancel
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 28, borderRadius: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#6b7280', marginBottom: 24 },
  confirm: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: 14,
    borderRadius: 999,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  cancel: {
    color: '#991b1b',
    fontWeight: '600',
  },
});
