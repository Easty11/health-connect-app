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
**Closed:** 2026-07-13 (HRV-scraper failure diagnosed to a SyncScreen crash; one-line fix landed)

### This session — landed on master
- `e677f9e` — **fix(sync): drop stale `gate.deepIfConst4` row crashing SyncScreen.**
  `SyncScreen.js:249` rendered `gate.deepIfConst4.segments`, but `validateNight`
  stopped returning `deepIfConst4` when the deep-sleep gate consolidated to DEEP=5
  as the single source (`deepSleepConfidence.js:163`). The undefined access threw
  `TypeError: Cannot read property 'segments' of undefined`, crashing the RN
  process — which killed the co-hosted `HRVAccessibilityService` (framework marked
  it `Crashed services`), so the HRV scraper opened Samsung Health but processed no
  frames and timed out until a reboot rebound the service. One-line deletion;
  every remaining `gate.*` access verified against the `validateNight` contract.

### Diagnosis (device-adjudicated) — the brief's premise was falsified
The brief hypothesised a selector mismatch / SH relayout. The device disproved it:
- SH `7.00.0.107`, `lastUpdateTime 2026-06-24` — unchanged since *before* the last
  known-good scrape.
- The on-device `nodedump.txt` (from the parked `feat/hrv-node-dump` instrumentation)
  held 4 complete runs through 07-12 05:51, each walking all six states and
  extracting HRV/HR/RR with valid bounds (#19's phantom skip working).
- `dumpsys accessibility` → `Crashed services:{{…HRVAccessibilityService}}`; crash
  buffer → the `SyncScreen` JS fatal at 07-12 05:52:53.
- Post-reboot confirmation: `Crashed services:{}`, fresh dump frames 07-13 21:49 —
  scraping healthy again. Root cause was app-process stability, never selectors.

### On-device / live verification (this session)
Read-only adjudication on SM-S921B (`RFCX108PF1J`): SH version query, `dumpsys
accessibility` bound/crashed state, crash-buffer stack, and the pulled `nodedump.txt`
(4 runs). Post-reboot: service rebound and a fresh 07-13 21:49 capture confirmed the
scrape path live. The landed fix itself is a stale-ref deletion validated statically
against the `validateNight` return contract; not yet exercised via an on-device render
(would require a standalone rebuild replacing the working build) — carried as optional.

### Branch dispositions (terminal state)
- `fix/syncscreen-deepifconst4-crash` — **merged+deleted** (`e677f9e`, ff-only onto
  `origin/master`, pushed; local branch deleted). Not in `BRANCHES.md` — terminal.
- `feat/hrv-node-dump` — **parked** in `BRANCHES.md`; `cherry` `+` (`b66d34b`, ahead 1).
  Read-only inspected this session (its `nodedump.txt` cracked the diagnosis); no work
  committed to it. Row updated: day-lag verification is now UNBLOCKED by this fix.
- `fix/hrv-capture-regression` — **parked** in `BRANCHES.md`; `cherry` mixed `-/+`
  (fix itself upstream by patch; test commits ahead). Untouched this session.

### Decisions
No new DECISIONS_LOG entry — this was diagnosis + a bug fix, no architecture decision
(the fix embodies none). DECISIONS_LOG max remains **#19**.

### Open (carried forward)
- **Q4 — day-lag / read-freshness** (OPEN_QUESTIONS): **now runnable** — the blocker
  was this session's crash, not the scraper. Verify by watching one real ~5am sync
  land today's value in Railway.
- **Q5 — historical stale-row reconciliation** (τ-window bleed; e.g. `2026-07-09=117`).
- Structural debt still standing: HRV context firewall #8 D2 unbacked
  (`src/contract/` has no `CaptureSource`/`CaptureContext`); #18 Postgres
  `source_package` gate still owed; Q4 HC date-attribution root cause.
- Uncommitted, unrelated, left in tree: `src/healthConnect.js` (steps `sourcePackage`),
  untracked `checkin_build_brief.md` / `hevy_routine.json` / `nodedump.txt`
  (stray-artifact policy #9). Not this session's concern; preserved, not staged.

### Next action
Watch ONE real overnight/~5am sync land today's HRV value in Railway (Postgres query,
not on-device UI) on the standalone build — now unblocked by `e677f9e`; resolves Q4
day-lag and unblocks `feat/hrv-node-dump` disposition. Housekeeping still owed:
rotate the Hevy API key (exposed in a chat transcript on 2026-07-11).
