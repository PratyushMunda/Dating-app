import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MatchedScreen({ dispatchMachine }) {
  useEffect(() => {
    const t = setTimeout(() => {
      dispatchMachine('DATE_MODE_DISABLED');
    }, 2500);

    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>It’s a match!</Text>
        <Text style={styles.subtitle}>
          Say hi in real life 🙂
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#6b7280', marginTop: 8 },
});
