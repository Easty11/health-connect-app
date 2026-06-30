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

- **Q2 — de-dup `validateNight()` before `runDeepConfidence`.** ✅ LANDED `36df9a2`
  (`collapseSleepSessions()`, longest-per-night). Cleared — no longer the next action.
- **Q3 — wire `runDeepConfidence` into readiness / Banister.**
  Unblocked on the Q2 side; still gated by the threshold review (DECISIONS_LOG #4).
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

**Branch:** `claude/session-lifecycle-sleep-dedup-yg1xx6` (on `master` tip `2e889d6`)  
**Closed:** 2026-06-30

### This session — no commits (verification only)
No code or governance commits were authored. Work performed:
- Confirmed `claude/session-lifecycle-sleep-dedup-b9k5qf` is fully **superseded** —
  its two commits (`84a06c6` sleep-dedup, `6e90315` chip B) are already on `master`
  as `36df9a2` / `8a724e6` (identical `git patch-id`). Nothing to merge from it; the
  alarming `master..b9k5qf` diffstat was just the branch sitting behind master, not
  destructive change. Safe to delete.
- Confirmed the designated branch `…-yg1xx6` sits exactly on latest `master` (`2e889d6`).
- Build verification: `npm install` clean (492 pkgs); `expo export --platform android`
  bundled 589 modules, 0 errors → 1.8 MB `.hbc`. Full native APK not buildable in this
  environment (no Android SDK). Reverted incidental `package-lock.json` churn; removed
  throwaway `dist/`.

### Decisions
DECISIONS_LOG max unchanged at **#15**. None minted.

### Work queue
Q2 (de-dup `validateNight`) — cleared; LANDED last session (`36df9a2`). Next
real-engineering action is now the HRV context-firewall gap (Decision #8 D2).

### ⚠ Carried forward — UNTOUCHED this session
- HRV context firewall still LIVE-UNBACKED (Decision #8 D2): `src/contract/` has no
  `CaptureSource`/`CaptureContext` enum; `ab94ffe`'s HRV path landed without the #6
  firewall. Top structural debt.
- Q4 — Health Connect date-attribution root cause.
- Cross-repo owed: health-app **#34** (corrects #31's phantom HCA-`#16` /
  `findByIdValidBounds` citation) — PENDING, belongs to a health-app session.

### Next action
Close the HRV context firewall gap (#8 D2): (1) add `CaptureSource`/`CaptureContext`
enum to `src/contract/`, (2) stamp context in `HRVCaptureModule.kt` event payload,
(3) verify D2 — unblocks `feat/hrv-capture`/C3. In parallel: commit health-app #34;
Q4 HC date-attribution.
