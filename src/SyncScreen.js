import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, useColorScheme, Alert, Button,
} from 'react-native';
import { syncHealthData } from './api';
import { requestPermissions, fetchAllData } from './healthConnect';
import { validateNight } from './deepSleepConfidence';

// Last-night window: yesterday 18:00 → today 11:00 local. Wide enough to capture
// a single overnight sleep session without spilling into the night before.
function lastNightWindow() {
  const end = new Date();
  end.setHours(11, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

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
    red: '#dc2626',
  };
}

// ─── Result row (matches App.js "Last Extraction" card) ──────────────────────

function ResultRow({ label, value, t }) {
  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <Text style={[styles.rowLabel, { color: t.subtext }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

// ─── Main sync screen ─────────────────────────────────────────────────────────
// Auth is guaranteed by Root before this renders, so there is no login gate.

export default function SyncScreen({ token, username, onLogout }) {
  const t = useTheme();

  // Health Connect flow
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [granting, setGranting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { lastSynced: Date, count: number }
  const [syncError, setSyncError] = useState('');

  // DEV: deep-sleep gate diagnostic (validateNight) — not wired to anything.
  const [validating, setValidating] = useState(false);
  const [gate, setGate] = useState(null); // validateNight() diag object
  const [gateError, setGateError] = useState('');

  // ── Health Connect requires permissions before reading ──
  async function handleGrantPermissions() {
    setGranting(true);
    setSyncError('');
    try {
      const granted = await requestPermissions();
      if (granted && granted.length > 0) {
        setPermissionsGranted(true);
      } else {
        setSyncError('Permissions not granted. Tap Grant Permissions to try again.');
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      setSyncError(err.message || 'Permission request failed');
    } finally {
      setGranting(false);
    }
  }

  // ── Manual sync: read from Health Connect, then push to backend ──
  async function handleSync() {
    setSyncing(true);
    setSyncError('');
    try {
      const data = await fetchAllData();
      await syncHealthData(data, token);
      const steps = data.steps || [];
      const sleep = data.sleep?.length || 0;
      const hrv = data.hrv?.length || 0;
      const heartRate = data.heartRate?.length || 0;
      const workouts = data.workouts?.length || 0;
      const count = sleep + hrv + heartRate + steps.length + workouts;
      setSyncResult({
        lastSynced: new Date(),
        count,
        sleep,
        hrv,
        heartRate,
        workouts,
        stepDays: steps.length,
        stepsTotal: steps.reduce((sum, r) => sum + (r.count || 0), 0),
      });
    } catch (err) {
      console.warn('Sync error:', err);
      setSyncError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  // ── DEV: run the deep-sleep gate for last night and show the diagnostic ──
  async function handleValidateNight() {
    setValidating(true);
    setGateError('');
    setGate(null);
    try {
      const { startISO, endISO } = lastNightWindow();
      const diag = await validateNight(startISO, endISO);
      setGate(diag);
    } catch (err) {
      console.warn('validateNight error:', err);
      setGateError(err.message || 'validateNight failed');
    } finally {
      setValidating(false);
    }
  }

  function handleLogout() {
    Alert.alert('Sign out', 'Sign out of Health & Performance?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => onLogout() },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* Header (fixed) */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.appTitle, { color: t.text }]}>Health Sync</Text>
          {username ? (
            <Text style={[styles.appSub, { color: t.subtext }]}>Signed in as {username}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: t.red, fontSize: 13 }}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Permissions gate: Grant first, then Sync (fixed above the card) */}
      {!permissionsGranted ? (
        <View style={styles.btn}>
          <Button
            title="Grant Permissions"
            onPress={handleGrantPermissions}
            disabled={granting}
          />
        </View>
      ) : (
        <View style={styles.btn}>
          <Button
            title="SYNC HEALTH CONNECT"
            onPress={handleSync}
            disabled={syncing}
          />
        </View>
      )}

      {/* DEV: deep-sleep gate — runs validateNight() for last night */}
      <View style={styles.btn}>
        <Button
          title="DEV: VALIDATE DEEP-SLEEP GATE"
          color="#6b7280"
          onPress={handleValidateNight}
          disabled={validating}
        />
      </View>

      {/* Requesting permissions */}
      {granting ? (
        <View style={styles.progressBox}>
          <ActivityIndicator />
          <Text style={styles.progressText}>Requesting permissions...</Text>
        </View>
      ) : null}

      {/* Sync in progress */}
      {syncing ? (
        <View style={styles.progressBox}>
          <ActivityIndicator />
          <Text style={styles.progressText}>Syncing...</Text>
        </View>
      ) : null}

      {/* Gate in progress */}
      {validating ? (
        <View style={styles.progressBox}>
          <ActivityIndicator />
          <Text style={styles.progressText}>Reading last night...</Text>
        </View>
      ) : null}

      {/* Failure (fixed) */}
      {syncError ? <Text style={styles.error}>{syncError}</Text> : null}
      {gateError ? <Text style={styles.error}>{gateError}</Text> : null}

      {/* Only the result card scrolls; the button above stays fixed. */}
      <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardScrollContent}>
        {syncResult ? (
          <View style={[styles.resultBox, { borderColor: t.border }]}>
            <Text style={[styles.resultTitle, { color: t.text }]}>Last Sync</Text>
            <ResultRow t={t} label="Last Synced" value={syncResult.lastSynced.toLocaleString()} />
            <ResultRow t={t} label="Total records" value={String(syncResult.count)} />

            <Text style={[styles.sectionHeader, { color: t.subtext }]}>SYNCED DATA</Text>
            <ResultRow t={t} label="Sleep sessions" value={String(syncResult.sleep)} />
            <ResultRow t={t} label="HRV readings" value={String(syncResult.hrv)} />
            <ResultRow t={t} label="Heart rate samples" value={String(syncResult.heartRate)} />
            <ResultRow t={t} label="Steps" value={`${syncResult.stepsTotal.toLocaleString()} (${syncResult.stepDays}d)`} />
            <ResultRow t={t} label="Workouts" value={String(syncResult.workouts)} />
          </View>
        ) : null}

        {gate ? (
          <View style={[styles.resultBox, { borderColor: t.border }]}>
            <Text style={[styles.resultTitle, { color: t.text }]}>Deep-Sleep Gate</Text>
            <ResultRow t={t} label="Sleep records" value={String(gate.sleepRecords)} />
            <ResultRow t={t} label="Stage segments" value={String(gate.totalStageSegments)} />

            <Text style={[styles.sectionHeader, { color: t.subtext }]}>
              GATE 1 — STAGE INTEGERS
            </Text>
            <ResultRow t={t} label="distinctStageValues" value={`[${gate.distinctStageValues.join(', ')}]`} />
            {Object.keys(gate.perStage).sort().map((k) => (
              <ResultRow
                key={k}
                t={t}
                label={`stage ${k}`}
                value={`${gate.perStage[k].segments} seg · ${gate.perStage[k].totalMin}m · ${gate.perStage[k].slivers} sliver`}
              />
            ))}
            <ResultRow t={t} label="if DEEP=5" value={`${gate.deepIfConst5.segments} seg · ${gate.deepIfConst5.totalMin}m`} />
            <ResultRow t={t} label="if DEEP=4" value={`${gate.deepIfConst4.segments} seg · ${gate.deepIfConst4.totalMin}m`} />

            <Text style={[styles.sectionHeader, { color: t.subtext }]}>
              GATE 2 — SLIVER SURVIVAL
            </Text>
            <ResultRow t={t} label="deepSegmentCount (DEEP=5)" value={String(gate.deepSegmentCount)} />

            <Text style={[styles.sectionHeader, { color: t.subtext }]}>
              GATE 3 — HR DENSITY
            </Text>
            <ResultRow t={t} label="HR samples" value={String(gate.hrSampleCount)} />
            <ResultRow t={t} label="hrMedianGapSec" value={gate.hrMedianGapSec == null ? '—' : `${gate.hrMedianGapSec}s`} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Fixed outer screen; header + button live here, only the card scrolls.
  screen: { flex: 1, padding: 20 },
  cardScroll: { flex: 1 },
  cardScrollContent: { paddingBottom: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  appTitle: { fontSize: 20, fontWeight: '700' },
  appSub: { fontSize: 12, marginTop: 2 },

  // Button wrapper — matches App.js "Test HRV Extraction" (s.btn)
  btn: { marginBottom: 12 },

  // Progress — matches App.js extracting box
  progressBox: { marginTop: 16, alignItems: 'center' },
  progressText: { marginTop: 8, fontSize: 14, color: '#555', textAlign: 'center' },

  // Result card — matches App.js "Last Extraction" card
  resultBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
  },
  resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 14, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowLabel: { fontSize: 14, color: '#555' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111' },

  // Error — matches App.js error text
  error: { marginTop: 12, fontSize: 14, color: '#c0392b', textAlign: 'center' },
});
