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
- **Scraper follow-ups (from 2026-06-25 sleep-capture session).**
  (1) SpO2 *lowest* — deferred; chose average-only. Needs a Blood-oxygen detail tap.
  (2) Derived sleep-efficiency provenance flag on the wire — a new `SyncPayload`
  field = cross-repo contract change, not done from this single-repo session.
  (3) Append a DECISIONS_LOG entry superseding #12's "known gaps" clause now that
  light-sleep + efficiency are captured — needs Luke (don't mint a number solo).
  (4) SH-breakage tally toward #12 SDK-migration trigger: 3rd event 25-Jun-2026
  (home relayout, closed via 06d5a43). Not yet tripping.

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

**Branch:** `fix/scraper-sh-relayout`  
**Closed:** 2026-06-25

### This session — landed
- `6b81eb1` fix(hrv): decouple capture/POST auth path from scraper native module
  (cherry-pick of `fb3310e` from the sibling branch — guards three unguarded
  `HRVCapture` calls so a missing native module can't kill the auth/POST path).
- `06d5a43` feat(scraper): full SH 7.x sleep capture + tap/home-resume re-map.

### Dead native HRV feed — diagnosed; root cause was NOT the manifest
Brief hypothesised a dropped accessibility-`<service>` registration (672ab95).
REFUTED: 672ab95 touched no manifest; the service was first added by `ab94ffe`,
and HEAD's source manifest is intact (all refs resolve). Real cause: the
**installed APK was stale** — `app-release.apk` built 06-23 06:41 (device
`lastUpdateTime` 06-23 06:44) predated `ab94ffe` (06-24 11:13), so the installed
build had no service (merged-manifest `HRVAccessibilityService` count = 0). Fixed
by rebuild + `adb install -r` (release is debug-signed → in-place, no data loss).
Verified on device RFCX108PF1J.

### Scraper re-map + sleep capture (`06d5a43`)
- **Energy-tile tap re-map.** Today's home relayout left `f59c316`'s content-desc
  anchor matching the outer non-clickable card wrapper (clickable `tile_root_layout`
  is a *descendant*). Re-anchored on inner ids `vitality_tile_score_layout` /
  `vitality_title`.
- **Home-resume recovery.** SH reopens on its last screen, not home; added bounded
  back-to-dashboard nav (transient UNKNOWN splash frames waited out).
- **Sleep scroll-accumulate.** Stages breakdown + blood-oxygen render below the
  fold; scroll states keep accumulating until back on HOME (detectScreen can't see
  SLEEP once the top node scrolls off).
- **Closed #12's logged "known gaps":** Light-sleep minutes (312), all stage %
  (Awake 11 / REM 15 / Light 73 / Deep 1), SpO2 average (96). Sleep efficiency
  DERIVED (actual ÷ time-in-bed = 82%), logged as derived. Verified end-to-end on
  device, 25 Jun 2026.

### ⚠ Carried forward — UNTOUCHED this session (still top structural debt)
Firewall gap still LIVE-UNBACKED (Decision #8 D2): `src/contract/` has no
`CaptureSource`/`CaptureContext` enum; `ab94ffe`'s HRV path landed without the #6
context firewall. Unchanged this session. Also open: Q4 HC date-attribution, Q2
`validateNight()` de-dup.

### Next action
Decide branch disposition for `fix/scraper-sh-relayout` (`6b81eb1` + `06d5a43` on
`f59c316`): PR/merge target. Then (a) append the #12-superseding DECISIONS_LOG
entry recording the gap-closure + that today is a *further* SH breakage (another
tick toward the #12 SDK-migration trigger) — needs Luke; (b) the carried-forward
firewall gap (#8 D2) remains the highest structural priority.
