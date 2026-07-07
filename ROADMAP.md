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

**Branch:** `claude/hevy-api-workout-query-teulc2` (0 commits ahead of master;
patch-identical — `git cherry origin/master` empty)
**Closed:** 2026-07-07 (Hevy investigation / repo-boundary triage session)

### This session — landed
No commits. Pure investigation and one blocking triage decision; nothing to land.

1. **Hevy exercise-lookup query (`exercise_template_id` for a given workout)** —
   could not be executed. No Hevy API key is available in this environment;
   the `get_hevy_workouts` MCP tool has no per-workout-ID lookup and its
   digest omits `exercise_template_id` entirely. Still blocked on the user
   supplying a real key or running the query themselves.
2. **ANCHOR: `hevy_exercise_templates` table + sync job + `resolve_exercise()`
   resolver (feeds `create_workout` provisioning)** — redirected, not built.
   This repo has no backend/DB surface at all (`package.json` is
   expo/react-native/axios only; no Postgres, no server code, no
   `create_workout` path exists here). The Postgres-schema deliverable in the
   brief belongs in `health-app`. Flagged to the user rather than
   implementing backend infrastructure in the wrong repo (this is the same
   failure shape logged in DECISIONS_LOG #10/#11). User confirmed: close out
   here; re-send the ANCHOR to a `health-app`-scoped session.

### Branch dispositions (terminal state)
- `claude/hevy-api-workout-query-teulc2` — **parked** in `BRANCHES.md`. Zero
  unique commits; harness auto-named session branch (banned for in-flight
  work per this repo's branch-naming convention). Deletion candidate, held
  pending explicit user confirmation.
- `fix/hrv-capture-regression`, `fix/scraper-sh-relayout` — untouched this
  session, still parked in `BRANCHES.md` as before.

### Decisions
No new DECISIONS_LOG entry. Nothing landed this session to log.
DECISIONS_LOG max remains **#18**.

### New work surfaced this session
- Re-send the Hevy `hevy_exercise_templates`/`resolve_exercise` ANCHOR to a
  session scoped to `health-app` — it cannot be built here.
- Hevy exercise-template-id lookup for workout
  `93e9daf2-872a-4a64-abdd-e9f711f3ebc5` is still open, needs a real API key.

### ⚠ Carried forward — top structural debt (UNTOUCHED)
HRV context firewall still LIVE-UNBACKED (Decision #8 D2): `src/contract/` has no
`CaptureSource`/`CaptureContext` enum; the HRV path landed without the #6 firewall.
Also open: Q4 HC date-attribution root cause. #18's Postgres verification
(non-null `source_package` rows post-deploy) is still owed — not touched this
session.

### Next action
Re-open the Hevy exercise-template-resolver ANCHOR in a `health-app`-scoped
session (add that repo, don't build it here). Separately: decide whether to
delete the empty `claude/hevy-api-workout-query-teulc2` branch, and supply a
Hevy API key if the exercise_template_id lookup is still wanted. The HRV
context firewall gap (#8 D2) remains the top structural item once this repo's
session resumes normal feature work.
