import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, useColorScheme, Alert, Linking,
} from 'react-native';
import { login, logout, getStoredToken, syncHealthData } from './api';
import { requestPermissions, fetchAllData, openHealthConnectSettings } from './healthConnect';
// TEMP DEBUG
import { runHealthConnectAudit } from './HealthConnectAudit';

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
      <Text style={[styles.cardSub, { color: t.subtext }]}>
        {lastReading || 'No data'}
      </Text>
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
    const normEmail = email.toLowerCase().trim();
    console.log('Attempting login with:', normEmail);
    try {
      await login(normEmail, password);
      onLogin();
    } catch (err) {
      console.log('Response error:', err.response?.status, err.response?.data);
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.loginContainer}>
      <Text style={[styles.loginTitle, { color: t.text }]}>Health & Performance</Text>
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
      <TouchableOpacity
        onPress={() => Linking.openURL('https://health-app-production-e0ff.up.railway.app/forgot-password')}
      >
        <Text style={styles.forgotPassword}>Forgot password?</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main sync screen ─────────────────────────────────────────────────────────

// Possible states for Health Connect access
// 'unknown'   — haven't asked yet (initial state after login)
// 'granting'  — permission dialog in progress
// 'granted'   — permissions obtained, ready to sync
// 'denied'    — user declined

export default function SyncScreen() {
  const t = useTheme();
  const [authed, setAuthed] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  // Health Connect flow
  const [hcState, setHcState] = useState('unknown'); // unknown | granting | granted | denied
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncData, setSyncData] = useState(null);
  const [syncError, setSyncError] = useState('');

  // On mount: only check stored auth token — no Health Connect calls
  useEffect(() => {
    getStoredToken()
      .then((tok) => { if (tok) setAuthed(true); })
      .finally(() => setInitLoading(false));
  }, []);

  // ── Step 1: user taps "Grant Health Connect Access" ──
  async function handleGrantPermissions() {
    try {
      setHcState('granting');
      const granted = await requestPermissions();
      if (granted && granted.length > 0) {
        setHcState('granted');
      } else {
        setHcState('denied');
      }
    } catch (error) {
      console.error('Health Connect permission error:', error);
      setHcState('denied');
    }
  }

  // ── Step 2: user taps "Sync Now" (only shown once granted) ──
  async function handleSync() {
    setSyncing(true);
    setSyncError('');
    try {
      const data = await fetchAllData(7);
      await syncHealthData(data);
      setSyncData(data);
      setLastSync(new Date());
    } catch (err) {
      console.warn('Sync error:', err);
      setSyncError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function handleLogout() {
    Alert.alert('Sign out', 'Sign out of Health & Performance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await logout();
          setAuthed(false);
          setSyncData(null);
          setHcState('unknown');
        },
      },
    ]);
  }

  function formatTime(date) {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function latestTime(arr, key = 'time') {
    return arr?.length ? arr[arr.length - 1][key] : null;
  }

  // ── Loading splash ──
  if (initLoading) {
    return (
      <View style={[styles.centred, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.accent} size="large" />
      </View>
    );
  }

  // ── Login ──
  if (!authed) {
    return (
      <View style={[styles.centred, { backgroundColor: t.bg }]}>
        <LoginForm t={t} onLogin={() => setAuthed(true)} />
      </View>
    );
  }

  // ── Authenticated sync screen ──
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

      {/* ── Step 1: Grant permissions (shown until granted) ── */}
      {hcState !== 'granted' && (
        <View style={[styles.permCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={styles.permIcon}>🏥</Text>
          <Text style={[styles.permTitle, { color: t.text }]}>Health Connect Access</Text>
          <Text style={[styles.permSub, { color: t.subtext }]}>
            Grant access to read your sleep, heart rate, steps, and workout data from Health Connect.
          </Text>
          {hcState === 'denied' && (
            <Text style={[styles.permDenied, { color: t.orange }]}>
              ⚠️ Permission denied. Tap "Try Again" or open Health Connect Settings to grant access manually.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.grantBtn, { opacity: hcState === 'granting' ? 0.6 : 1 }]}
            onPress={handleGrantPermissions}
            disabled={hcState === 'granting'}
          >
            {hcState === 'granting'
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.grantBtnText}>
                  {hcState === 'denied' ? 'Try Again' : 'Grant Health Connect Access'}
                </Text>}
          </TouchableOpacity>
          {hcState === 'denied' && (
            <TouchableOpacity
              onPress={() => openHealthConnectSettings()}
              style={styles.openSettingsBtn}
            >
              <Text style={[styles.openSettingsText, { color: t.accent }]}>
                Open Health Connect Settings
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Step 2: Sync Now (only shown once granted) ── */}
      {hcState === 'granted' && (
        <TouchableOpacity
          style={[styles.syncBtn, { opacity: syncing ? 0.7 : 1 }]}
          onPress={handleSync}
          disabled={syncing}
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
      )}

      {syncError ? (
        <View style={[styles.warningBox, { borderColor: t.red }]}>
          <Text style={{ color: t.red, fontSize: 12 }}>⚠️ {syncError}</Text>
        </View>
      ) : null}

      {/* ── Data cards ── */}
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
              ? `${Math.round(syncData.hrv[syncData.hrv.length - 1].hrv)} ms — ${formatDt(latestTime(syncData.hrv))}`
              : null}
          />
          <DataCard t={t} icon="❤️" title="Heart Rate"
            count={syncData.heartRate.length}
            lastReading={syncData.heartRate.length
              ? `${syncData.heartRate[syncData.heartRate.length - 1].bpm} bpm — ${formatDt(latestTime(syncData.heartRate))}`
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
      ) : hcState === 'granted' ? (
        <View style={[styles.emptyState, { borderColor: t.border }]}>
          <Text style={{ fontSize: 32 }}>📊</Text>
          <Text style={[styles.emptyText, { color: t.subtext }]}>
            Tap Sync Now to fetch your Health Connect data
          </Text>
        </View>
      ) : null}

      {/* ── TEMP DEBUG: HC Audit ── */}
      <TouchableOpacity
        style={styles.debugBtn}
        onPress={() => runHealthConnectAudit().then((results) => {
          const lines = Object.entries(results).map(([type, r]) =>
            r.error
              ? `${type}: ERROR — ${r.error}`
              : `${type}: ${r.total} total, ${r.samsungCount} samsung`
          );
          Alert.alert('HC Audit', lines.join('\n'));
        })}
      >
        <Text style={styles.debugBtnText}>[DEBUG] Run HC Audit</Text>
      </TouchableOpacity>
      {/* ── END TEMP DEBUG ── */}

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
  forgotPassword: { color: '#4f46e5', fontSize: 13, textAlign: 'center', paddingVertical: 4 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  appTitle: { fontSize: 20, fontWeight: '700' },
  appSub: { fontSize: 12, marginTop: 2 },

  // Permission card
  permCard: {
    borderWidth: 1, borderRadius: 18, padding: 24, marginBottom: 20,
    alignItems: 'center', gap: 8,
  },
  permIcon: { fontSize: 36, marginBottom: 4 },
  permTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  permSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permDenied: { fontSize: 12, textAlign: 'center' },
  openSettingsBtn: { paddingVertical: 8, alignItems: 'center' },
  openSettingsText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  grantBtn: {
    backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 24, alignItems: 'center', marginTop: 8, width: '100%',
  },
  grantBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardIcon: { fontSize: 18 },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },

  // Misc
  warningBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8, marginBottom: 8 },
  emptyState: { borderWidth: 1, borderRadius: 16, borderStyle: 'dashed', padding: 30, alignItems: 'center', gap: 10, marginTop: 10 },
  emptyText: { fontSize: 13, textAlign: 'center' },

  // TEMP DEBUG
  debugBtn: { marginTop: 32, borderWidth: 1, borderColor: '#f59e0b', borderRadius: 10, padding: 12, alignItems: 'center' },
  debugBtnText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
});
