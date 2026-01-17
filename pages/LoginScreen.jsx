import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ onLogin, onSignup, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>IRLDate</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading ? styles.btnDisabled : null]}
          disabled={loading}
          onPress={() =>
            mode === 'login'
              ? onLogin(username.trim(), password)
              : onSignup(username.trim(), password)
          }
        >
          <Text style={styles.btnText}>
            {loading ? (mode === 'login' ? 'Signing in…' : 'Creating…') : mode === 'login' ? 'Sign in' : 'Create account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>
            {mode === 'login' ? 'New here? Create account' : 'Have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  card: { width: '85%', padding: 24, borderRadius: 18, backgroundColor: '#fff', elevation: 2 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#6b7280', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  error: { marginTop: 10, color: '#b91c1c', textAlign: 'center' },
  btn: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700' },
  linkBtn: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#2563eb', fontWeight: '600' },
});
