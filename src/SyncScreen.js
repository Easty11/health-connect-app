import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, useColorScheme, Alert,
} from 'react-native';
import { login, logout, getStoredToken, syncHealthData } from './api';
import { requestPermissions, fetchAllData } from './healthConnect';

// ─── Theme ─────────────────────────────────────────────────────────────────

function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return {
    dark,
    bg: dark ? '#0f0f14' : '#f9fafb',
    card: dark ? '#1c1c24' : '#ffffff',
    border: dark ? '#2e2e3e' : '#e5e7eb',
    text: dark ? '#f3f4f6' : '#111827',
    subtext: dark ? '#9ca3af' : '#6b7280',
    accent: '#4f46e5',
    accentLight: dark ? '#312e81' : '#eef2ff',
    green: '#16a34a',
    orange: '#ea580c',
    red: '#dc2626',
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatRow({ label, value, colour, t }) {
  return (
    <View style={[styles.statRow, { borderBottomColor: t.border }]}>
      <Text style={[styles.statLabel, { color: t.subtext }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colour ?? t.text }]}>{value}</Text>
    </View>
  );
}

function DataCard({ title, icon, count, lastReading, t }) {
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={[styles.cardTitle, { color: t.text }]}>{title}</Text>
        {count > 0 && (
          <View style={[styles.badge, { backgroundColor: t.accentLight }]}>
            <Text style={[styles.badgeText, { color: t.accent }]}>{count}</Text>
          </View>
        )}
      </View>
      {lastReading ? (
        <Text style={[styles.cardSub, { color: t.subtext }]}>{lastReading}</Text>
      ) : (
        <Text style={[styles.cardSub, { color: t.subtext }]}>No data</Text>
      )}
    </View>
  );
}

// ─── Login screen ────────────────────────────────────────────────────────────

function LoginForm({ onLogin, t }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.loginContainer}>
      <Text style={[styles.loginTitle, { color: t.text }]}>Health &amp; Performance</Text>
      <Text style={[styles.loginSub, { color: t.subtext }]}>Sign in to sync your health data</Text>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: '#fef2f2' }]}>
          <Text style={{ color: t.red, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      <TextInput
        style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.text }]}
        placeholder="Email" placeholderTextColor={t.subtext}
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
      />
      <TextInput
        style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.text }]}
        placeholder="Password" placeholderTextColor={t.subtext}
        value={password} onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.primaryBtn, { opacity: loading ? 0.6 : 1 }]}
        onPress={handleLogin} disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryBtnText}>Sign in</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Main sync screen ─────────────────────────────────────────────────────────

export default function SyncScreen() {
  const t = useTheme();
  const [authed, setAuthed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncData, setSyncData] = useState(null);
  const [initLoading, setInitLoading] = useState(true);

  // Check stored token on mount
  useEffect(() => {
    getStoredToken().then((tok) => {
      if (tok) {
        setAuthed(true);
        autoSync();
      }
    }).finally(() => setInitLoading(false));
  }, []);

  const autoSync = useCallback(async () => {
    setSyncing(true);
    try {
      await requestPermissions();
      const data = await fetchAllData(7);
      await syncHealthData(data);
      setSyncData(data);
      setLastSync(new Date());
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  function handleLogout() {
    Alert.alert('Sign out', 'Sign out of Health & Performance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => { await logout(); setAuthed(false); setSyncData(null); },
      },
    ]);
  }

  function formatTime(date) {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function latestReading(arr, timeKey = 'time') {
    if (!arr?.length) return null;
    return arr[arr.length - 1][timeKey];
  }

  function formatDt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (initLoading) {
    return (
      <View style={[styles.centred, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.accent} size="large" />
      </View>
    );
  }

  if (!authed) {
    return (
      <View style={[styles.centred, { backgroundColor: t.bg }]}>
        <LoginForm t={t} onLogin={() => { setAuthed(true); autoSync(); }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.appTitle, { color: t.text }]}>Health Sync</Text>
          <Text style={[styles.appSub, { color: t.subtext }]}>
            Last sync: {formatTime(lastSync)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: t.red, fontSize: 13 }}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Sync button */}
      <TouchableOpacity
        style={[styles.syncBtn, { opacity: syncing ? 0.7 : 1 }]}
        onPress={autoSync} disabled={syncing}
        activeOpacity={0.8}
      >
        {syncing ? (
          <View style={styles.syncBtnInner}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.syncBtnText}>Syncing…</Text>
          </View>
        ) : (
          <Text style={styles.syncBtnText}>⟳  Sync Now</Text>
        )}
      </TouchableOpacity>

      {/* Data cards */}
      {syncData ? (
        <>
          <Text style={[styles.sectionTitle, { color: t.subtext }]}>LAST 7 DAYS</Text>

          <DataCard t={t} icon="😴" title="Sleep"
            count={syncData.sleep.length}
            lastReading={syncData.sleep.length
              ? `${syncData.sleep[syncData.sleep.length - 1].durationMinutes} min — ${formatDt(syncData.sleep[syncData.sleep.length - 1].endTime)}`
              : null}
          />
          <DataCard t={t} icon="💓" title="Heart Rate Variability"
            count={syncData.hrv.length}
            lastReading={syncData.hrv.length
              ? `${Math.round(syncData.hrv[syncData.hrv.length - 1].hrv)} ms — ${formatDt(latestReading(syncData.hrv))}`
              : null}
          />
          <DataCard t={t} icon="❤️" title="Heart Rate"
            count={syncData.heartRate.length}
            lastReading={syncData.heartRate.length
              ? `${syncData.heartRate[syncData.heartRate.length - 1].bpm} bpm — ${formatDt(latestReading(syncData.heartRate))}`
              : null}
          />
          <DataCard t={t} icon="👟" title="Steps"
            count={syncData.steps.length}
            lastReading={syncData.steps.length
              ? `${syncData.steps.reduce((s, r) => s + r.count, 0).toLocaleString()} total steps`
              : null}
          />
          <DataCard t={t} icon="🏋️" title="Workouts"
            count={syncData.workouts.length}
            lastReading={syncData.workouts.length
              ? `${syncData.workouts[syncData.workouts.length - 1].durationMinutes} min — ${formatDt(syncData.workouts[syncData.workouts.length - 1].startTime)}`
              : null}
          />

          {syncData.errors?.length > 0 && (
            <View style={[styles.warningBox, { borderColor: t.orange }]}>
              <Text style={{ color: t.orange, fontSize: 12 }}>
                ⚠️ Some data types unavailable: {syncData.errors.join(', ')}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={[styles.emptyState, { borderColor: t.border }]}>
          <Text style={{ fontSize: 32 }}>📊</Text>
          <Text style={[styles.emptyText, { color: t.subtext }]}>
            Tap Sync Now to fetch your Health Connect data
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 40 },

  // Login
  loginContainer: { width: '100%', paddingHorizontal: 24, gap: 12 },
  loginTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  loginSub: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  errorBox: { borderRadius: 10, padding: 10 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  appTitle: { fontSize: 20, fontWeight: '700' },
  appSub: { fontSize: 12, marginTop: 2 },

  // Sync button
  syncBtn: {
    backgroundColor: '#4f46e5', borderRadius: 18, paddingVertical: 22,
    alignItems: 'center', marginBottom: 24,
  },
  syncBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Section
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },

  // Cards
  card: {
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardIcon: { fontSize: 18 },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },

  // Stat row
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 13, fontWeight: '600' },

  // Misc
  warningBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8 },
  emptyState: { borderWidth: 1, borderRadius: 16, borderStyle: 'dashed', padding: 30, alignItems: 'center', gap: 10, marginTop: 10 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
