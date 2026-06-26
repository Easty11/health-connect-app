import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
  DeviceEventEmitter, NativeModules, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from './App';
import SyncScreen from './src/SyncScreen';

// Shared auth state lives here and is passed down to both screens.
// TOKEN_KEY matches the key api.js's axios interceptor reads.
const TOKEN_KEY = '@health_app_token';
const USERNAME_KEY = '@health_app_username';

export default function Root() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('scraper'); // 'scraper' | 'healthConnect'

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
  };

  const onLogout = async () => {
    await AsyncStorage.removeMany([TOKEN_KEY, USERNAME_KEY]);
    setToken(null);
    setUsername(null);
    setTab('scraper');
  };

  // A 401 anywhere clears the token (in api.js) and emits "AuthExpired" —
  // drop back to the login screen.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('AuthExpired', () => {
      NativeModules.HRVCapture.clearAuthToken();
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
});
