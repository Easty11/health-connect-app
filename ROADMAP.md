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

- **Q2 — de-dup `validateNight()` — RESOLVED (`36df9a2`, on master).**
  Landed via PR #5 rebase-merge; patch-identical to branch commit `84a06c6`
  (same patch-id). Re-verified 2026-07-02: `collapseSleepSessions()` collapses
  overlapping/duplicate `SleepSession` records to the longest per cluster
  (incl. transitive chains) with the non-duplicate path untouched.
- **Q3 — wire `runDeepConfidence` into readiness / Banister.**
  Unblocked by Q2's resolution; still gated by the threshold review
  (DECISIONS_LOG #4 — tunables uncalibrated).
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

**Branch:** `master` (trunk)  
**Closed:** 2026-07-11 (HRV phantom-selector fix landed + on-device verified; Metro-guard codified)

### This session — landed on master
- `1db8833` — **fix(scraper): select valid-bounds Energy-score node, not `firstOrNull` phantom.**
  Landed the fortnight-old fix from unmerged `fix/scraper-sh-relayout`: the three
  Energy-score reads (HRV/HR/RR) now use `findByIdValidBounds` (first match with
  `right > left`), skipping the duplicate negative-width phantom node. DECISIONS_LOG
  entry renumbered stale `#16` → **#19** at merge (master had spent #16–#18).
- `db6f50e` — **chore(build): codify standalone-release-only; block Metro debug installs.**
  PreToolUse hook `.claude/hooks/block-metro-build.cjs` (+ `npm run android` → release,
  `npm run android:dev` = debug opt-in, FEEDBACK entry). Closes the recurring
  Metro-dependent-debug-build trap that masked the fix as a "scraper bug."
- `c878f52`, `e3b6d12` — branch-retirement records for the two landed branches.
- On the parked `feat/hrv-node-dump`: `b66d34b` read-only node-dump instrumentation
  (used this session to prove the phantom from real nodes; rebased onto master).

### On-device verification (this session)
Rebuilt from `feat/hrv-node-dump`, dex-gated the **installed** APK
(`findByIdValidBounds` PRESENT), ran a live extraction: logcat
`findByIdValidBounds(last_shrv): 2 matches, chose … text="Average: 97 ms"` →
POST `hrv_ms:97` → `Synced 1 reading(s)` → Room row `2026-07-11 = 97.0, synced=1`.
Standalone release build proven Metro-independent (loads with Metro killed).

### Branch dispositions (terminal state)
- `fix/scraper-sh-relayout` — **merged+deleted** (code landed as `1db8833`/#19;
  byte-identical upstream). Recorded in `BRANCHES.md`.
- `chore/block-metro-debug-build` — **merged+deleted** (clean `--ff-only` → `db6f50e`).
  Recorded in `BRANCHES.md`.
- `feat/hrv-node-dump` — **parked** in `BRANCHES.md` (+1 vs origin/master, `b66d34b`
  instrumentation); disposition pending day-lag verification.
- `fix/hrv-capture-regression` — **parked** in `BRANCHES.md`, untouched this session.

### Decisions
- **#19** appended — Energy-score reads select first valid-bounds node (phantom-duplicate
  fix); supersedes #12 (value-read portion). Renumbered from the stale branch `#16`.
  DECISIONS_LOG max is now **#19**.

### Open (carried forward)
- **Q4 — day-lag / read-freshness** (OPEN_QUESTIONS): #19 fixed *selection*, not
  freshness; verify by watching one real ~5am sync land today's value in Railway.
- **Q5 — historical stale-row reconciliation** (τ-window bleed; e.g. `2026-07-09=117`).
- Pre-existing structural debt **UNTOUCHED**: HRV context firewall #8 D2 unbacked
  (`src/contract/` has no `CaptureSource`/`CaptureContext`); #18 Postgres
  `source_package` gate still owed; Q4 HC date-attribution root cause.

### Next action
Watch ONE real overnight/~5am sync land today's HRV value in Railway (Postgres
query, not on-device UI) on the fixed standalone build — resolves Q4 day-lag and
unblocks `feat/hrv-node-dump` disposition. The standalone release build made this
session is what makes that unattended capture possible.
