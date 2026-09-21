// Metro config — and the CONFIRMED build-fingerprint generation hook.
//
// Metro loads this file for EVERY bundle entry point: `expo start`,
// `expo run:android --variant release` (the real release build command), EAS
// builds. So regenerating src/buildInfo.js here means the fingerprint is rebuilt
// on every bundle regardless of which command triggered it — the hook point the
// operator asked to confirm. If generation fails, this throws and Metro fails to
// start: fail-closed, no stale fingerprint (see scripts/gen-build-info.mjs).

const { execSync } = require('node:child_process');
const { getDefaultConfig } = require('expo/metro-config');

execSync('node scripts/gen-build-info.mjs', { cwd: __dirname, stdio: 'inherit' });

module.exports = getDefaultConfig(__dirname);
