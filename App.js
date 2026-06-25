import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Linking,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';

const { HRVCapture } = NativeModules;
const LOGIN_URL = 'https://health-app-backend-production-760e.up.railway.app/auth/login';

// Dark-aware theme so the result card is readable on the dark background.
function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return {
    dark,
    bg: dark ? '#0f0f14' : '#f9fafb',
    border: dark ? '#2e2e3e' : '#e5e7eb',
    text: dark ? '#f3f4f6' : '#111827',
    subtext: dark ? '#9ca3af' : '#6b7280',
  };
}

export default function App({ token, username, onLogin, onLogout }) {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Extraction flow
  const [extracting, setExtracting] = useState(false);
  const [serviceError, setServiceError] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { type: 'complete', data } | { type: 'failed', reason }

  // Subscribe to native extraction events for the lifetime of the component.
  useEffect(() => {
    const emitter = new NativeEventEmitter(HRVCapture);

    const completeSub = emitter.addListener('HRVExtractionComplete', (payload) => {
      setExtracting(false);
      setServiceError(false);
      setLastResult({ type: 'complete', data: payload });
    });

    const failedSub = emitter.addListener('HRVExtractionFailed', (payload) => {
      setExtracting(false);
      setLastResult({ type: 'failed', reason: payload?.reason ?? 'Unknown error' });
    });

    return () => {
      completeSub.remove();
      failedSub.remove();
    };
  }, []);

  const login = async () => {
    setLoading(true);
    setStatus('');
    try {
      const params = new URLSearchParams();
      params.append('username', email.trim().toLowerCase());
      params.append('password', password);
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      // Mirror token to native (used by the scraper's HRVSyncWorker).
      // Guarded: the auth/POST path must not depend on the scraper native
      // module being present (matches the safe idiom in src/api.js).
      if (HRVCapture?.storeAuthToken) {
        try { await HRVCapture.storeAuthToken(data.access_token); } catch (_) {}
      }
      setPassword('');
      setStatus('');
      // Hand the token + username up to Root, which owns shared auth state.
      await onLogin(data.access_token, email.trim().toLowerCase());
    } catch (e) {
      setStatus('Login failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (HRVCapture?.clearAuthToken) {
      try { await HRVCapture.clearAuthToken(); } catch (_) {}
    }
    setEmail('');
    setPassword('');
    setStatus('');
    setLastResult(null);
    setServiceError(false);
    setExtracting(false);
    await onLogout();
  };

  const testHRV = async () => {
    setStatus('');
    setServiceError(false);
    setLastResult(null);
    setExtracting(true);
    try {
      await HRVCapture.triggerManualExtraction();
      // Extraction started; the result arrives via the native event listeners.
    } catch (e) {
      setExtracting(false);
      if (e.code === 'SERVICE_UNAVAILABLE') {
        setServiceError(true);
      } else {
        setStatus('Error: ' + e.message);
      }
    }
  };

  const openAccessibilitySettings = () => {
    Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
  };

  if (!token) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Health Connect</Text>
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : (
          <Button title="Login" onPress={login} />
        )}
        {status ? <Text style={s.error}>{status}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[s.authedContainer, { backgroundColor: t.bg }]}>
      <Text style={[s.loggedIn, { color: t.text }]}>Logged in as {username || '(token stored)'}</Text>
      <View style={s.btn}>
        <Button title="Test HRV Extraction" onPress={testHRV} disabled={extracting} />
      </View>
      <View style={s.btn}>
        <Button title="Log out" color="#c0392b" onPress={logout} />
      </View>

      {/* Extraction in progress */}
      {extracting ? (
        <View style={s.progressBox}>
          <ActivityIndicator />
          <Text style={[s.progressText, { color: t.subtext }]}>Extracting — Samsung Health is running...</Text>
        </View>
      ) : null}

      {/* Service-not-running error + settings shortcut */}
      {serviceError ? (
        <View style={s.serviceErrorBox}>
          <Text style={s.error}>
            HRV Accessibility Service is not running. Enable it in Settings → Accessibility.
          </Text>
          <View style={s.btn}>
            <Button title="Open Accessibility Settings" onPress={openAccessibilitySettings} />
          </View>
        </View>
      ) : null}

      {/* Only the result card scrolls; the buttons above stay fixed. */}
      <ScrollView style={s.cardScroll} contentContainerStyle={s.cardScrollContent}>
      {/* Successful extraction result */}
      {lastResult?.type === 'complete' ? (
        <View style={[s.resultBox, { borderColor: t.border }]}>
          <Text style={[s.resultTitle, { color: t.text }]}>Last Extraction</Text>
          <ResultRow t={t} label="HRV (RMSSD)" value={formatValue(lastResult.data.hrv_rmssd, 'ms')} />
          <ResultRow t={t} label="Sleep Efficiency" value={formatValue(lastResult.data.sleep_efficiency, '%')} />
          <ResultRow t={t} label="Sleep Duration" value={formatValue(lastResult.data.sleep_duration_minutes, 'min')} />
          <ResultRow t={t} label="Respiratory Rate" value={formatValue(lastResult.data.respiratory_rate, '/min')} />

          <Text style={[s.sectionHeader, { color: t.subtext }]}>SLEEP TIMING</Text>
          <ResultRow t={t} label="Bedtime" value={formatRaw(lastResult.data.bedtime)} />
          <ResultRow t={t} label="Wake Time" value={formatRaw(lastResult.data.wakeTime)} />
          <ResultRow t={t} label="Actual Sleep Time" value={formatRaw(lastResult.data.actualSleepTimeRaw)} />

          <Text style={[s.sectionHeader, { color: t.subtext }]}>SLEEP STAGES (minutes)</Text>
          <ResultRow t={t} label="Deep" value={formatValue(lastResult.data.deepMinutes, 'min')} />
          <ResultRow t={t} label="REM" value={formatValue(lastResult.data.remMinutes, 'min')} />
          <ResultRow t={t} label="Light" value={formatValue(lastResult.data.lightMinutes, 'min')} />
          <ResultRow t={t} label="Awake" value={formatValue(lastResult.data.awakeMinutes, 'min')} />

          <Text style={[s.sectionHeader, { color: t.subtext }]}>SLEEP STAGES (%)</Text>
          <ResultRow t={t} label="Deep" value={formatValue(lastResult.data.deepPct, '%')} />
          <ResultRow t={t} label="REM" value={formatValue(lastResult.data.remPct, '%')} />
          <ResultRow t={t} label="Light" value={formatValue(lastResult.data.lightPct, '%')} />
          <ResultRow t={t} label="Awake" value={formatValue(lastResult.data.awakePct, '%')} />

          <Text style={[s.sectionHeader, { color: t.subtext }]}>CARDIAC</Text>
          <ResultRow t={t} label="Sleep HR" value={formatValue(lastResult.data.sleepHRBpm, 'bpm')} />
          <ResultRow t={t} label="SpO2 Average" value={formatValue(lastResult.data.spO2AveragePct, '%')} />

          <ResultRow t={t} label="Recorded At" value={formatDate(lastResult.data.recorded_at)} />
        </View>
      ) : null}

      {/* Failed extraction */}
      {lastResult?.type === 'failed' ? (
        <View style={[s.resultBox, { borderColor: t.border }]}>
          <Text style={[s.resultTitle, { color: t.text }]}>Extraction Failed</Text>
          <Text style={s.error}>{lastResult.reason}</Text>
        </View>
      ) : null}
      </ScrollView>

      {status ? <Text style={[s.status, { color: t.subtext }]}>{status}</Text> : null}
    </View>
  );
}

function ResultRow({ label, value, t }) {
  return (
    <View style={[s.row, { borderBottomColor: t.border }]}>
      <Text style={[s.rowLabel, { color: t.subtext }]}>{label}</Text>
      <Text style={[s.rowValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

function formatValue(value, unit) {
  if (value === null || value === undefined) return '—';
  return `${value} ${unit}`;
}

function formatRaw(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 40 },
  // Authed view is top-aligned so buttons stay fixed and the card scrolls below.
  authedContainer: { flex: 1, paddingHorizontal: 40, paddingTop: 32, paddingBottom: 16 },
  cardScroll: { flex: 1, marginTop: 8 },
  cardScrollContent: { paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  loggedIn: { fontSize: 16, marginBottom: 24, textAlign: 'center' },
  btn: { marginBottom: 12 },
  status: { marginTop: 16, fontSize: 14, color: '#555', textAlign: 'center' },
  error: { marginTop: 12, fontSize: 14, color: '#c0392b', textAlign: 'center' },

  progressBox: { marginTop: 16, alignItems: 'center' },
  progressText: { marginTop: 8, fontSize: 14, color: '#555', textAlign: 'center' },

  serviceErrorBox: { marginTop: 8 },

  resultBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
  },
  resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowLabel: { fontSize: 14, color: '#555' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111' },
});
