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
import NavigatingScreen from './pages/NavigatingScreen.jsx';
import VeryCloseScreen from './pages/VeryCloseScreen.jsx';
import MatchedScreen from './pages/MatchedScreen.jsx';


const { DateMode } = NativeModules;
const Stack = createNativeStackNavigator();

const DATE_MODE_KEY = 'DATE_MODE_ENABLED';
const SESSION_START_KEY = 'DATE_SESSION_STARTED_AT';

type LatLng = {
  latitude: number;
  longitude: number;
};

function distanceInMeters(a: LatLng, b: LatLng): number {
  const R = 6371000; // earth radius in meters
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


export default function App() {
  const [loading, setLoading] = useState(true);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  const [machineState, dispatchMachine] = useReducer(
    matchReducer,
    initialMatchState
  );

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isForeground, setIsForeground] = useState(true);

  useEffect(() => {
  if (machineState !== 'DATE_MODE_ON') return;

  const watchId = Geolocation.watchPosition(
    pos => {
      const userLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      // MOCK candidate (replace later)
      const candidate = {
        latitude: userLocation.latitude + 0.0007,
        longitude: userLocation.longitude + 0.0007,
      };

      const dist = distanceInMeters(userLocation, candidate);

      if (dist < 1000) {
        dispatchMachine('NEARBY_DETECTED');
      }
    },
    err => console.warn(err),
    {
      enableHighAccuracy: true,
      distanceFilter: 10, // meters
    }
  );

  return () => Geolocation.clearWatch(watchId);
}, [machineState]);


  // 🔔 Notification permission
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }
  }, []);

  // 🔁 Rehydrate state
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

  // 💾 Persist state
  useEffect(() => {
    const active = machineState !== 'IDLE';
    AsyncStorage.setItem(DATE_MODE_KEY, active.toString());

    if (!active) {
      AsyncStorage.removeItem(SESSION_START_KEY);
      setSessionStartedAt(null);
    }
  }, [machineState]);

  // 📱 AppState
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      appState.current = s;
      setIsForeground(s === 'active');
    });
    return () => sub.remove();
  }, []);

  // 🚀 Foreground service
  useEffect(() => {
    if (!DateMode) return;
    machineState !== 'IDLE'
      ? DateMode.startService()
      : DateMode.stopService();
  }, [machineState]);

  // ⏱ Tick
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
              />
            );

          case 'VERY_CLOSE':
            return (
              <VeryCloseScreen
                dispatchMachine={dispatchMachine}
              />
            );

          case 'MATCHED':
            return (
              <MatchedScreen
                dispatchMachine={dispatchMachine}
              />
            );

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
