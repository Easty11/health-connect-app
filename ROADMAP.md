# ROADMAP.md — health-connect-app

Forward work for the Android companion app. The **sprint block** at the bottom
is owned by `/closeout` — it regenerates from `git log` each session. Don't
hand-edit it; edit the queue above it.

---

## Now

Bootstrap the repo-canonical loop (CLAUDE.md, FEEDBACK.md, DECISIONS_LOG.md,
ROADMAP.md, `/closeout`) and land the uncommitted payload as clean,
concern-split commits across PR #1 (deep-sleep) and `feat/hrv-capture` (HRV).

## Work queue

- **Q2 — de-dup `validateNight()` before `runDeepConfidence`.**
  The single next real-engineering action. Blocks Q3.
- **Q3 — wire `runDeepConfidence` into readiness / Banister.**
  Blocked by Q2 *and* by the threshold review gate (DECISIONS_LOG #4).
- **Q4 — Health Connect date-attribution root cause.**
  One-day mismatch between Health Connect and the scraper; suspected to misfile
  backfilled rows (DECISIONS_LOG #5). Highest-priority correctness fix. Root
  cause (scraper date assignment vs HC record timestamp/timezone) unconfirmed.
- **HRV context firewall unbacked — blocks `feat/hrv-capture`/C3.**
  `src/contract/` has no `CaptureSource`/`CaptureContext` enum; the native
  module stamps no context on any capture. The #6 firewall (Decision #8 D2)
  is unbacked. Must wire before C3 lands: (1) add enum to `src/contract/`,
  (2) stamp context in `HRVCaptureModule.kt` event payload, (3) verify D2.
- **HRV capture (`feat/hrv-capture`).** Native module + scraper + Polar override
  parked (C3 unstaged). Unblocks after firewall gap above is closed.
  Follow-on: implement the `passive_overnight | calibration | session` context
  stamp end-to-end and prove the `session` → non-readiness routing
  (DECISIONS_LOG #6).

## Phase 2

- **Q5 — backend dual-field collapse.** Blocked on capturing a real sync payload
  to drive the schema shape.

## Open / unverified (carry until proven)

- `SleepSessionRecord` — confirm the full sleep-stages array surfaces via
  `react-native-health-connect`, not just session duration.
- `HeartRateRecord` — samples-array vs envelope shape.
- Polar Flow / Garmin Connect writing to Health Connect — verify via Postgres
  query on Railway, not on-device UI.

## UI debt

- Session cards not clickable.
- Dual-panel scroll layout issue.

---

<!-- SPRINT BLOCK — owned by /closeout, regenerated from git log. Do not hand-edit. -->
## Sprint block

**Branch:** `feat/deep-sleep-confidence`  
**Closed:** 2026-06-22

### Landed (prior sessions)
- `eeafb62` chore: bootstrap repo-canonical loop (CLAUDE.md, FEEDBACK.md, DECISIONS_LOG.md, ROADMAP.md)
- `58706e7` docs: log decisions 7-9 (concern-split convention, src/contract shared, stray-artifact policy)
- `f5cd6e9` chore: ignore *.zip and dump.xml, remove stray artifacts
- `83717f9` feat: port /closeout ritual to health-connect-app
- `7a60cb0` docs: log Decision #10 (ANCHOR self-check) and wrong-repo near-miss feedback
- `47bcc71` chore: session close-out (first /closeout run)

### Landed this session
- `4581f91` feat(contract): add SleepStageType generated enum + gen:contract script
- `672ab95` feat(deep-sleep): add confidence flagger, gate UI; remove HealthConnectAudit

### Parked — HRV payload (unstaged, stays on feat/deep-sleep-confidence until firewall gap closed)
- `App.js`, `src/api.js`, `Root.js`, `index.js`, `package.json` — HRV scraper UI + auth wiring
- `android/app/build.gradle`, `AndroidManifest.xml`, `MainApplication.kt`, `strings.xml`, `android/build.gradle` — native module registration
- `Root.js` (untracked), `HRVCaptureModule.kt`, `HRVCapturePackage.kt`, `data/`, `hrv/`, `xml/` (all untracked) — HRV native module

### Next action
Close the HRV context firewall gap (see work queue above): add `CaptureSource`/`CaptureContext` enum to `src/contract/`, stamp context in `HRVCaptureModule.kt` event payload, verify D2. Then fork `feat/hrv-capture` off this branch and commit C3.
