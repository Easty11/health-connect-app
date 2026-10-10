// Pure, node-importable core for the "Last background sync" line. NO react-native imports, so
// scripts/sync-age-sim.mjs exercises THIS code, not a reimplementation (mirrors
// backgroundPermission.js / hcSettings.js).
//
// Why this exists (Q25, 9 Oct 2026): background sync was silent for ~40 h and the line showed a bare
// locale date, so nothing on screen said the data was old. The line now leads with a relative age
// ("3 h ago"), turns amber past two background intervals, and keeps the absolute time secondary.
//
// The 13 h threshold is the SAME one health-app uses for its Health Connect delivery gate
// (two 6 h background intervals plus an hour of slack), so the phone and the home load card agree
// about when the data is late.

export const BACKGROUND_STALE_AFTER_MS = 13 * 60 * 60 * 1000;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function relativeAge(ageMs) {
  if (ageMs < MIN) return 'just now';
  if (ageMs < HOUR) return `${Math.floor(ageMs / MIN)} min ago`;
  if (ageMs < 48 * HOUR) return `${Math.floor(ageMs / HOUR)} h ago`;
  return `${Math.floor(ageMs / (24 * HOUR))} d ago`;
}

// describeSyncAge(iso, now, formatAbsolute) -> { relative, absolute, stale }
//   iso            the stored ISO stamp, or null/undefined when no background run has happened
//   now            ms since epoch (injected so the sim and the screen's tick agree on one clock)
//   formatAbsolute (Date) => string, injected: toLocaleString is locale-dependent and the sim
//                  must not be
//
// Never-ran reads 'never' and is NOT amber: a fresh install has not had a chance yet, and amber
// is for "a run is overdue", which needs a last run to be overdue against. An unreadable stamp is
// the opposite: we cannot say it is fresh, so it is amber.
export function describeSyncAge(iso, now, formatAbsolute = (d) => d.toLocaleString()) {
  if (iso === null || iso === undefined || iso === '') {
    return { relative: 'never', absolute: null, stale: false };
  }
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) {
    return { relative: 'unknown', absolute: null, stale: true };
  }
  // A stamp slightly in the future is clock skew, not "negative age".
  const ageMs = Math.max(now - at.getTime(), 0);
  return {
    relative: relativeAge(ageMs),
    absolute: formatAbsolute(at),
    stale: ageMs > BACKGROUND_STALE_AFTER_MS,
  };
}
