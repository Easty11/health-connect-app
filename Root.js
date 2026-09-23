import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
  DeviceEventEmitter, NativeModules, StatusBar, AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from './App';
import SyncScreen from './src/SyncScreen';
import { ensureBackgroundSyncRegistered, getNeedsSignIn, clearNeedsSignIn } from './src/backgroundSync';

// Shared auth state lives here and is passed down to both screens.
// TOKEN_KEY matches the key api.js's axios interceptor reads.
const TOKEN_KEY = '@health_app_token';
const USERNAME_KEY = '@health_app_username';

export default function Root() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('scraper'); // 'scraper' | 'healthConnect'
  // ISO time of the first background-sync 401 (#47). A 401 clears the token, so the
  // user lands HERE, on the login screen — this is where the pause must be visible.
  const [needsSignIn, setNeedsSignIn] = useState(null);

  // Re-read whenever we are (or become) logged out, and on every return to the
  // foreground: a background 401 in a live runtime clears the token (AuthExpired) a
  // moment BEFORE runSync writes the flag, so the logout re-render can miss it.
  useEffect(() => {
    if (token) return undefined;
    getNeedsSignIn().then(setNeedsSignIn);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') getNeedsSignIn().then(setNeedsSignIn);
    });
    return () => sub.remove();
  }, [token]);

  // Restore auth from storage on mount.
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
          setUsername(await AsyncStorage.getItem(USERNAME_KEY));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onLogin = async (newToken, newUsername) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    if (newUsername != null) await AsyncStorage.setItem(USERNAME_KEY, newUsername);
    setToken(newToken);
    setUsername(newUsername ?? null);
    // A successful login ends the pause (#47).
    await clearNeedsSignIn();
    setNeedsSignIn(null);
  };

  const onLogout = async () => {
    await AsyncStorage.removeMany([TOKEN_KEY, USERNAME_KEY]);
    setToken(null);
    setUsername(null);
    setTab('scraper');
  };

  // Register the periodic background sync once we have a token (app start after
  // login). ensureBackgroundSyncRegistered re-reads the LIVE Health Connect grant, so
  // a cold start with the background permission already granted registers with no
  // screen interaction; it no-ops (idempotent) when unregistered already, and never
  // registers — nor throws — without the permission. A same-session first grant is
  // covered by SyncScreen after the grant dialog.
  useEffect(() => {
    if (!token) return;
    ensureBackgroundSyncRegistered();
  }, [token]);

  // A 401 anywhere clears the token (in api.js) and emits "AuthExpired" —
  // drop back to the login screen.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('AuthExpired', () => {
      // Guarded: a missing scraper native module must not crash the auth
      // recovery path (onLogout already clears the scraper token via App).
      if (NativeModules.HRVCapture?.clearAuthToken) {
        try { NativeModules.HRVCapture.clearAuthToken(); } catch (_) {}
      }
      onLogout();
    });
    return () => sub.remove();
  }, []);

  // Restoring auth — avoid flashing the login screen.
  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.centred]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  // Auth gate: until logged in, only App (login UI) renders.
  // SyncScreen never mounts without a token.
  if (!token) {
    return (
      <SafeAreaView style={styles.root}>
        {needsSignIn ? (
          <Text style={styles.pausedBanner}>
            Background sync: paused — sign in required (since {new Date(needsSignIn).toLocaleString()})
          </Text>
        ) : null}
        <App token={token} username={username} onLogin={onLogin} onLogout={onLogout} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.tabBar}>
        <TabButton
          label="Scraper"
          active={tab === 'scraper'}
          onPress={() => setTab('scraper')}
        />
        <TabButton
          label="Health Connect"
          active={tab === 'healthConnect'}
          onPress={() => setTab('healthConnect')}
        />
      </View>

      <View style={styles.body}>
        {tab === 'scraper' ? (
          <App token={token} username={username} onLogin={onLogin} onLogout={onLogout} />
        ) : (
          <SyncScreen token={token} username={username} onLogout={onLogout} />
        )}
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // RN's SafeAreaView only insets on iOS; add the Android status-bar height so
  // the tab bar sits below the status bar instead of overlapping it.
  root: { flex: 1, paddingTop: StatusBar.currentHeight || 0 },
  centred: { justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#4f46e5' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#4f46e5' },
  body: { flex: 1 },
  pausedBanner: {
    padding: 12, fontSize: 14, fontWeight: '600', textAlign: 'center',
    color: '#92400e', backgroundColor: '#fef3c7',
  },
});
