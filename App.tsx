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
import { sendPresence, getPairedUserLocation } from './src/pairingApi';





const { DateMode } = NativeModules;
const Stack = createNativeStackNavigator();

const DATE_MODE_KEY = 'DATE_MODE_ENABLED';
const SESSION_START_KEY = 'DATE_SESSION_STARTED_AT';

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
  const userIdRef = useRef<string>(
  Math.random().toString(36).slice(2)
);
const userId = userIdRef.current;
  const [pairId, setPairId] = useState<string | null>(null);
  const hasTriggeredVeryClose = useRef<boolean>(false);


  const [loading, setLoading] = useState<boolean>(true);
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
  if (Platform.OS === 'android') {
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
  }
}, []);

  /* 📍 GPS — foreground only */
  useEffect(() => {
  if (machineState !== 'DATE_MODE_ON' && machineState !== 'NAVIGATING') return;

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
    err => console.warn(err),
    {
      enableHighAccuracy: true,
      distanceFilter: 10, // meters
    }
  );

  return () => Geolocation.clearWatch(watchId);
}, [machineState]);

  /* 🔄 Poll paired user's location during navigation */
  useEffect(() => {
    if (machineState !== 'NAVIGATING' || !pairId) return;

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
      const dm = await AsyncStorage.getItem(DATE_MODE_KEY);
      const ss = await AsyncStorage.getItem(SESSION_START_KEY);
      

      if (dm === 'true') dispatchMachine('DATE_MODE_ENABLED');
      if (ss) setSessionStartedAt(Number(ss));

      setLoading(false);
    };

    load();
  }, []);

  /* 💾 Persist */
  useEffect(() => {
    const active = machineState !== 'IDLE';
    AsyncStorage.setItem(DATE_MODE_KEY, active.toString());

    if (!active) {
      AsyncStorage.removeItem(SESSION_START_KEY);
      setSessionStartedAt(null);
    }
  }, [machineState]);

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
