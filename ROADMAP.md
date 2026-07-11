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

**Branch:** `master` (trunk, via `claude/hevy-api-exercise-query-hc8zgh`)  
**Closed:** 2026-07-11 (Hevy exercise-template query tool — a small utility session, concurrent with the HRV phantom-selector session)

### This session — landed on master
- `88652fb` — **feat(scripts): reusable Hevy exercise-template title query** (PR #8).
  New `scripts/hevy-exercise-query.ps1`: paginates `GET /v1/exercise_templates`
  (pageSize 100), filters client-side on a case-insensitive title substring
  (`-Search`, default `Pallof`), prints title / id / type / primary_muscle_group +
  a count. Key from `$env:HEVY_API_KEY` with a clear unset error. Generalises the
  ad-hoc Pallof lookup; `$found` accumulator avoids shadowing the automatic
  `$Matches`.
- `536c2dd` — **fix(scripts): render Hevy query table at full width** (PR #9).
  `Format-Table -AutoSize` truncated the last column under a narrow console
  (`primary_muscle_group` wrapped one char per line); piped through
  `Out-String -Width 4096 | Write-Host` to force a wide virtual render.

### On-device / live verification (this session)
Run on Luke's Windows box against the live Hevy API: two Pallof templates returned —
`Anti‑Rotation Pallof Press` (`12b590de-078b-411d-ac22-dce2cf745ad0`) and
`Cable Core Pallof Press` (`CC55119B`), both `weight_reps` / `abdominals`. The
full-width fix (#9) was confirmed on a second run: `primary_muscle_group` renders
`abdominals` in full, no truncation. (This container is Linux with the Hevy host
off its egress allowlist — the tool could only be exercised on-device.)

### Branch dispositions (terminal state)
- `claude/hevy-api-exercise-query-hc8zgh` — feature **merged+deleted** (PR #8
  `88652fb`, PR #9 `536c2dd`, both rebase-merged; remote branch auto-deleted).
  Name reused to carry this close-out; `BRANCHES.md` row removed.
- `feat/hrv-node-dump`, `fix/hrv-capture-regression` — **parked** in `BRANCHES.md`,
  untouched this session.

### Decisions
No new DECISIONS_LOG entry — a utility script embodies no architecture decision.
DECISIONS_LOG max remains **#19** (unchanged; #19 landed in the concurrent HRV session).

### Open (carried forward — UNTOUCHED this session)
- **Q4 — day-lag / read-freshness** (OPEN_QUESTIONS): #19 fixed *selection*, not
  freshness; verify by watching one real ~5am sync land today's value in Railway.
- **Q5 — historical stale-row reconciliation** (τ-window bleed; e.g. `2026-07-09=117`).
- Structural debt still standing: HRV context firewall #8 D2 unbacked
  (`src/contract/` has no `CaptureSource`/`CaptureContext`); #18 Postgres
  `source_package` gate still owed; Q4 HC date-attribution root cause.

### Next action
Unchanged from the HRV session, still the top priority: watch ONE real
overnight/~5am sync land today's HRV value in Railway (Postgres query, not
on-device UI) on the fixed standalone build — resolves Q4 day-lag and unblocks
`feat/hrv-node-dump` disposition. Housekeeping: rotate the Hevy API key (exposed
in a chat transcript this session).
