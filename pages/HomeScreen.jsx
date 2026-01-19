import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Sound from 'react-native-sound';
import { sendDecision, checkPairStatus } from '../src/pairingApi';

export default function HomeScreen({
  machineState,
  dispatchMachine,
  sessionStartedAt,
  userId,
  pairId,
}) {
  const dateModeActive = machineState !== 'IDLE';
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [otherUserStatus, setOtherUserStatus] = useState('PENDING');
  const soundRef = useRef(null);
  const hasPlayedSound = useRef(false);

  // Initialize notification sound
  useEffect(() => {
    Sound.setCategory('Playback');
    
    // Load a system notification sound (you can replace with custom sound file)
    const sound = new Sound('notification.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load sound, using vibration only', error);
        return;
      }
      soundRef.current = sound;
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
    };
  }, []);

  // Play notification when someone nearby is detected
  useEffect(() => {
    if (machineState === 'NEARBY_CANDIDATE_FOUND' && !hasPlayedSound.current) {
      hasPlayedSound.current = true;
      
      // Play sound
      if (soundRef.current) {
        soundRef.current.play((success) => {
          if (!success) {
            console.log('Sound playback failed');
          }
        });
      }
      
      // Vibrate (pattern: wait 0ms, vibrate 400ms, wait 200ms, vibrate 400ms)
      try {
        Vibration.vibrate([0, 400, 200, 400]);
      } catch (e) {
        console.log('Vibration failed:', e);
      }
    }
    
    // Reset flag when leaving this state
    if (machineState !== 'NEARBY_CANDIDATE_FOUND') {
      hasPlayedSound.current = false;
    }
  }, [machineState]);

  // Poll for status updates when waiting for other user
  useEffect(() => {
    if (machineState !== 'AWAITING_CONFIRMATION' || !pairId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const status = await checkPairStatus(pairId);
        
        if (status.status === 'BOTH_ACCEPTED') {
          dispatchMachine('BOTH_ACCEPTED');
          clearInterval(pollInterval);
        } else if (status.status === 'CANCELLED') {
          dispatchMachine('PARTNER_DECLINED');
          clearInterval(pollInterval);
        } else if (status.status === 'WAITING_OTHER') {
          setOtherUserStatus(status.otherUserDecision || 'PENDING');
        }
      } catch (e) {
        console.error('Error polling pair status:', e);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [machineState, pairId]);

  const getActiveDuration = () => {
    if (!sessionStartedAt) return '';
    const min = Math.floor((Date.now() - sessionStartedAt) / 60000);
    return min < 1 ? 'Active just now' : `Active for ${min} min`;
  };

  const handleDecision = async (decision) => {
    if (!pairId || !userId) return;
    setDecisionLoading(true);
    setErrorMsg('');

    try {
      const res = await sendDecision(pairId, userId, decision);

      if (decision === 'DECLINE') {
        dispatchMachine('USER_DECLINED');
        return;
      }

      // User accepted
      if (res.status === 'WAITING_OTHER') {
        setOtherUserStatus(res.otherUserDecision || 'PENDING');
        dispatchMachine('USER_ACCEPTED');
      } else if (res.status === 'CANCELLED') {
        dispatchMachine('PARTNER_DECLINED');
      } else if (res.status === 'BOTH_ACCEPTED') {
        dispatchMachine('BOTH_ACCEPTED');
      }
    } catch (e) {
      setErrorMsg('Failed to send decision. Please try again.');
      console.error('Decision error:', e);
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Meet your date</Text>
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
                onPress={() => handleDecision('ACCEPT')}
              >
                {decisionLoading ? 'Sending...' : 'Accept'}
              </Text>
              <Text
                style={[styles.btn, styles.decline]}
                onPress={() => handleDecision('DECLINE')}
              >
                Decline
              </Text>
            </View>
          </View>
        )}

        {machineState === 'AWAITING_CONFIRMATION' && (
          <View style={styles.waitCard}>
            <Text style={styles.waitTitle}>✅ You Accepted</Text>
            <Text style={styles.waitSubtitle}>
              Waiting for the other person to decide...
            </Text>
            <View style={styles.statusIndicator}>
              <Text style={styles.statusLabel}>Their status:</Text>
              <Text style={styles.statusValue}>
                {otherUserStatus === 'PENDING' ? '⏳ Deciding...' : '🤔 Deciding...'}
              </Text>
            </View>
            <Text
              style={[styles.btn, styles.cancelBtn]}
              onPress={() => handleDecision('DECLINE')}
            >
              Cancel
            </Text>
          </View>
        )}

        {machineState === 'CANCELLED' && (
          <View style={styles.declineCard}>
            <Text style={styles.declineTitle}>Better luck next time</Text>
            <Text style={styles.declineSubtitle}>The other person declined. Date Mode stays on to find someone else.</Text>
            <Text
              style={[styles.btn, styles.primary]}
              onPress={() => dispatchMachine('DATE_MODE_ENABLED')}
            >
              Keep looking
            </Text>
          </View>
        )}

        {!!errorMsg && (
          <Text style={styles.error}>{errorMsg}</Text>
        )}

      
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

  waitCard: { marginTop: 24, padding: 20, borderRadius: 16, backgroundColor: '#e0f2fe' },
  waitTitle: { fontSize: 18, fontWeight: '700', color: '#075985' },
  waitSubtitle: { color: '#0ea5e9', marginTop: 8, marginBottom: 12 },

  statusIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 12,
    padding: 12,
    backgroundColor: '#bae6fd',
    borderRadius: 8
  },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#075985' },
  statusValue: { fontSize: 14, marginLeft: 8, color: '#0284c7' },

  cancelBtn: { 
    backgroundColor: '#fee2e2', 
    color: '#991b1b', 
    textAlign: 'center',
    marginTop: 12
  },

  declineCard: { marginTop: 24, padding: 20, borderRadius: 16, backgroundColor: '#fef2f2' },
  declineTitle: { fontSize: 18, fontWeight: '700', color: '#991b1b' },
  declineSubtitle: { color: '#b91c1c', marginTop: 8, marginBottom: 12 },
  primary: { backgroundColor: '#2563eb', color: '#fff', textAlign: 'center' },
  error: { marginTop: 12, color: '#b91c1c' },
});
