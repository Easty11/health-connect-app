#!/usr/bin/env node
// PreToolUse guard: block any command that would build/install a Metro-dependent
// DEBUG Android build. The overnight/on-unlock HRV scraper needs a STANDALONE
// (release, Hermes-embedded) APK — a debug build silently depends on the Metro
// dev server and fails whenever Metro or the dev machine is down.
//
// Rule: allow anything with `--variant release`; otherwise block the known
// debug build/install invocations. Exit 2 = block (stderr is fed back to Claude).
'use strict';

const fs = require('fs');

let cmd = '';
try {
  const raw = fs.readFileSync(0, 'utf8');
  cmd = ((JSON.parse(raw).tool_input) || {}).command || '';
} catch (e) {
  // No parseable input → nothing to judge; let it through.
  process.exit(0);
}

// Explicit standalone builds are always allowed.
if (/--variant\s+release/i.test(cmd)) process.exit(0);

const DEBUG_BUILD_PATTERNS = [
  /\bexpo\s+run:android\b/i,          // default expo run:android == debug/Metro
  /\breact-native\s+run-android\b/i,  // RN CLI default == debug
  /\brun-android\b/i,                 // bare run-android alias
  /\binstallDebug\b/,                 // gradlew :app:installDebug
  /\bassembleDebug\b/,                // gradlew :app:assembleDebug
  /adb\s+install\b[^\n]*?(app-debug\.apk|-debug\.apk)/i, // installing a debug APK
];

if (DEBUG_BUILD_PATTERNS.some((re) => re.test(cmd))) {
  process.stderr.write(
    'Blocked: this installs a Metro-dependent debug build. Use `npm run android` ' +
      '(expo run:android --variant release) for a standalone APK. ' +
      'Override only by including --variant release explicitly.\n'
  );
  process.exit(2);
}

process.exit(0);
