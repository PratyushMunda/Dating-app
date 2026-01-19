import React, { useEffect, useReducer, useState, useRef } from 'react';
import {
  StatusBar,
  AppState,
  AppStateStatus,
  PermissionsAndroid,
  Platform,
  NativeModules,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';

import { matchReducer, initialMatchState } from './logic/matchMachine';
import HomeScreen from './pages/HomeScreen';
import NavigatingScreen from './pages/NavigatingScreen';
import VeryCloseScreen from './pages/VeryCloseScreen';
import MatchedScreen from './pages/MatchedScreen';
import { sendPresence, getPairedUserLocation, clearPresence, login, signup, setAuthToken } from './src/pairingApi';
import LoginScreen from './pages/LoginScreen';





const { DateMode } = NativeModules;
const Stack = createNativeStackNavigator();

const DATE_MODE_KEY = 'DATE_MODE_ENABLED';
const SESSION_START_KEY = 'DATE_SESSION_STARTED_AT';
const USER_ID_KEY = 'DATE_USER_ID';
const AUTH_TOKEN_KEY = 'DATE_AUTH_TOKEN';

/* ---------- types ---------- */

type LatLng = {
  latitude: number;
  longitude: number;
};

/* ---------- utils ---------- */

function distanceInMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* ---------- app ---------- */

export default function App() {
  const userIdRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [pairId, setPairId] = useState<string | null>(null);
  const hasTriggeredVeryClose = useRef<boolean>(false);


  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [, forceTick] = useState<number>(0);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [candidateLocation, setCandidateLocation] = useState<LatLng | null>(null);

  const [machineState, dispatchMachine] = useReducer(
    matchReducer,
    initialMatchState
  );

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isForeground, setIsForeground] = useState<boolean>(true);
  

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    (async () => {
      const perms = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ];
      // Background location is needed only if you expect updates when app isn't foregrounded
      if (Platform.Version >= 29) {
        perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
      }
      try {
        const statuses = await PermissionsAndroid.requestMultiple(perms);
        const fineGranted =
          statuses[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted =
          statuses[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        if (!fineGranted && !coarseGranted) {
          console.warn('Location permission not granted: ', statuses);
        }
      } catch (e) {
        console.warn('Permission request error', e);
      }
    })();
  }, []);

  /* 📍 GPS — foreground only */
  useEffect(() => {
  if (!userId) {
    console.log('GPS effect: no userId');
    return;
  }
  if (!authToken) {
    console.log('GPS effect: no authToken yet, waiting...');
    return;
  }
  if (machineState !== 'DATE_MODE_ON' && machineState !== 'NAVIGATING') {
    console.log('GPS effect: wrong machine state:', machineState);
    return;
  }

  console.log('GPS effect triggered:', { machineState, userId, hasAuth: !!authToken });

  // Send an immediate presence ping on toggle (some devices don't fire an initial watch callback)
  Geolocation.getCurrentPosition(
    pos => {
      (async () => {
        const user: LatLng = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };

        setUserLocation(user);

        try {
          const res = await sendPresence(
            userId,
            user.latitude,
            user.longitude
          );

          console.log('sendPresence response:', res);

          if (res.status === 'PAIRED' && machineState === 'DATE_MODE_ON') {
            setPairId(res.pairId);
            setCandidateLocation({
              latitude: res.otherUser.lat,
              longitude: res.otherUser.lon,
            });
            dispatchMachine('NEARBY_DETECTED');
          }
        } catch (err) {
          console.warn('sendPresence (initial) failed', err);
        }
      })();
    },
    err => {
      console.warn('getCurrentPosition error', err);
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
  );

  const watchId = Geolocation.watchPosition(
    pos => {
      // wrap async logic inside an IIFE
      (async () => {
        const user: LatLng = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };

        setUserLocation(user);

        try {
          const res = await sendPresence(
            userId,
            user.latitude,
            user.longitude
          );

          if (res.status === 'PAIRED' && machineState === 'DATE_MODE_ON') {
            setPairId(res.pairId);
            
            // Set real candidate location from server response
            setCandidateLocation({
              latitude: res.otherUser.lat,
              longitude: res.otherUser.lon,
            });
            
            dispatchMachine('NEARBY_DETECTED');
          }
        } catch (err) {
          console.warn('sendPresence failed', err);
        }
      })();
    },
    err => {
      console.warn('Geolocation error', err);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10, // meters
      timeout: 20000,
      maximumAge: 5000,
    }
  );

  return () => Geolocation.clearWatch(watchId);
}, [machineState, userId, authToken]);

  /* 🔄 Poll paired user's location during navigation */
  useEffect(() => {
    if (machineState !== 'NAVIGATING' || !pairId || !userId) return;

    const pollLocation = async () => {
      try {
        const location = await getPairedUserLocation(pairId, userId);
        setCandidateLocation({
          latitude: location.lat,
          longitude: location.lon,
        });
      } catch (err) {
        console.warn('Failed to fetch paired user location', err);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(pollLocation, 2000);
    
    // Fetch immediately
    pollLocation();

    return () => clearInterval(interval);
  }, [machineState, pairId, userId]);

  /* 📡 Start/stop BLE advertising for close-range detection */
  useEffect(() => {
    if (!DateMode || !DateMode.startAdvertising) return;

    if (machineState === 'NAVIGATING') {
      DateMode.startAdvertising(userId);
      return () => DateMode.stopAdvertising && DateMode.stopAdvertising();
    }

    DateMode.stopAdvertising && DateMode.stopAdvertising();
  }, [machineState, userId]);

  /* 📏 Auto-trigger very-close when within 25m (fallback when BLE is unavailable) */
  useEffect(() => {
    if (machineState !== 'NAVIGATING') {
      hasTriggeredVeryClose.current = false;
      return;
    }

    if (!userLocation || !candidateLocation) return;

    const dist = distanceInMeters(userLocation, candidateLocation);

    if (dist < 25 && !hasTriggeredVeryClose.current) {
      hasTriggeredVeryClose.current = true;
      dispatchMachine('BLUETOOTH_CLOSE');
    }
  }, [machineState, userLocation, candidateLocation]);

  /* 🔔 Notification permission */
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }
  }, []);

  /* 🔁 Rehydrate */
  useEffect(() => {
    const load = async () => {
      const [dm, ss, storedUserId, storedAuthToken] = await Promise.all([
        AsyncStorage.getItem(DATE_MODE_KEY),
        AsyncStorage.getItem(SESSION_START_KEY),
        AsyncStorage.getItem(USER_ID_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
      ]);

      if (storedAuthToken) {
        setAuthTokenState(storedAuthToken);
        setAuthToken(storedAuthToken);
      }

      const uid = storedUserId ?? null;
      userIdRef.current = uid;
      setUserId(uid);

      if (dm === 'true') dispatchMachine('DATE_MODE_ENABLED');
      if (ss) setSessionStartedAt(Number(ss));

      setLoading(false);
    };

    load();
  }, []);

  const completeAuth = async (res: { token: string; userId: string }) => {
    console.log('completeAuth: Setting token and userId:', { token: res.token.substring(0, 10) + '...', userId: res.userId });
    setAuthTokenState(res.token);
    setAuthToken(res.token);
    setUserId(res.userId);
    userIdRef.current = res.userId;
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, res.token),
      AsyncStorage.setItem(USER_ID_KEY, res.userId),
    ]);
    dispatchMachine('DATE_MODE_DISABLED');
  };

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await login(username, password);
      await completeAuth(res);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Invalid username or password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await signup(username, password);
      await completeAuth(res);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Signup failed. Try another username.');
    } finally {
      setAuthLoading(false);
    }
  };

  /* 💾 Persist */
  useEffect(() => {
    const active = machineState !== 'IDLE';
    AsyncStorage.setItem(DATE_MODE_KEY, active.toString());

    if (!active) {
      AsyncStorage.removeItem(SESSION_START_KEY);
      setSessionStartedAt(null);
      if (userId) clearPresence(userId);
    }
  }, [machineState, userId]);

  /* 📱 AppState */
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      appState.current = s;
      setIsForeground(s === 'active');
    });
    return () => sub.remove();
  }, []);

  /* 🚀 Foreground service */
  useEffect(() => {
    if (!DateMode) return;
    machineState !== 'IDLE'
      ? DateMode.startService()
      : DateMode.stopService();
  }, [machineState]);

  /* ⏱ Tick */
  useEffect(() => {
    if (machineState === 'IDLE' || !isForeground) return;
    const id = setInterval(() => forceTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [machineState, isForeground]);

  if (loading) return null;

  if (!authToken || !userId) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={handleLogin} onSignup={handleSignup} loading={authLoading} error={authError} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />

      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Root">
            {() => {
              switch (machineState) {
                case 'NAVIGATING':
                  return (
                    <NavigatingScreen
                      dispatchMachine={dispatchMachine}
                      userLocation={userLocation}
                      candidateLocation={candidateLocation}
                    />
                  );

                case 'VERY_CLOSE':
                  return <VeryCloseScreen dispatchMachine={dispatchMachine} />;

                case 'MATCHED':
                  return <MatchedScreen dispatchMachine={dispatchMachine} />;

                default:
                  return (
                    <HomeScreen
                      machineState={machineState}
                      dispatchMachine={dispatchMachine}
                      sessionStartedAt={sessionStartedAt}
                      userId={userId}
                      pairId={pairId}
                    />
                  );
              }
            }}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
