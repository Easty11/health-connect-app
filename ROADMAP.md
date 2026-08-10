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
**Closed:** 2026-08-10 (Brief: forward ExerciseSession record metadata; fix payload-log truncation)

### This session — landed on master (`d569adf`, PR #26)
First `src/` product change in several sessions — a wire-contract addition, not governance. Three
concern-split commits; `placeholder guard (POSIX)` green, merged `--merge` under ruleset `20573455`.
`#35` numbered pre-PR against `origin/master`'s re-read max #34 / Q16.

- `9cc1ee7` — **feat: forward ExerciseSession record metadata.** `workoutMapper` now forwards
  `metadata.id`, `metadata.recordingMethod`, `metadata.device` (all nullable), shared by
  `fetchWorkoutData()` and `fetchAllData()`. `id` is the backend idempotency key for
  `aerobic_sessions.source_session_id`.
- `70c30d0` — **chore: bounded `[HC payload summary]` log.** Fixes a *retrospective* observability
  defect — `Syncing data:` is cut at logcat's 4068-byte cap, so every key after `sleep` (incl.
  `workouts`) was never observable there. Separate concern from the mapper change.
- `db86dee` — **`#35`: the decision record.** G1 findings, land-all-three rationale, truncation +
  ring-buffer notes.

### Gates — all five discharged empirically (see `#35`)
- **G1** — raw `[HC raw] ExerciseSession sample`, two syncs, startTime-keyed → `id` a stable UUID;
  `recordingMethod: 0` / `device.type: 0` = UNKNOWN for Samsung Health (the only writer observed).
- **G2** — `id` present in the *outgoing* body on the release build (`[HC payload summary]`).
- **G3** — round-trip 200 with `recordingMethod`/`device` present, no 422 → backend `extra='ignore'`.
- **G4** — offline run of the extracted `workoutMapper` vs missing/empty metadata → no throw, null.
- **G5** — only `workoutMapper` + the separate log touched; no other mapper, no counts, no perms.

### The finding — recorded, not acted on
The amendment framed `recordingMethod`/`device` as the payload; G1 says they are UNKNOWN for the
only writer (Samsung Health), so the *realized* value is `id` (the v1 objective) plus the truncation
fix. The two fields are forwarded as a **Garmin-contingent bet** — inert until a writer populates
them. Arbitration stays on overlap-plus-fidelity-rank; the micro-session floor stays open. Not
re-opened here — it is a health-app decision.

### Decisions / Questions
Minted **#35**. No new `OPEN_QUESTIONS.md` entries — the one open fork (persist
`recordingMethod`/`device` backend-side, or not) is health-app scope and belongs in that session's
stores, not here. Number claimed at merge, `origin/master` re-read #34 / Q16. Stores changed:
`DECISIONS_LOG`, `ROADMAP` (this block).

### Branch dispositions (terminal state)
- `feat/exercise-metadata-forward` — **merged+deleted** local and remote via PR #26 (`d569adf`);
  `git ls-remote` empty. No `BRANCHES.md` row required (no store cites a branch-produced artefact).
- `feat/hrv-node-dump` **UNSTARTED** · `fix/hrv-capture-regression` **UNSTARTED** — pre-existing,
  rowed in `BRANCHES.md`, neither touched this session.

### Device / environment state (not repo state — carry between sessions)
- Phone **SM_S921B** now runs a **release build carrying `[HC payload summary]`**, installed via
  `npm run android` this session. Committed source matches the installed build — no drift.
- The device's logcat **ring buffer rotates fast** (a torrent client churns it) — a ~20-minute-old
  capture is already gone (observed: a fresh `adb logcat -d` after the syncs had lost them). Future
  captures: `adb logcat -G 5M` (device max; 16M requested and capped) **and stream to a file**, as
  done here. The truncation cap behind `#35` is `max payload is 4068 B` (`adb logcat -g`).

### Open (carried forward — unchanged this session)
- `Q15` UNSTARTED · `Q16` UNSTARTED · `Q13` OPEN · `Q14` OPEN · `Q7` OWED · `Q10` UNSTARTED ·
  `Q9` UNSTARTED. No `BLOCKED` rows in `OPEN_QUESTIONS.md`.

### Next action
**health-app step 3 — backend aerobic ingestion — is unblocked** now `#26` is on master: the wire
carries `metadata.id`, so ingestion keys `aerobic_sessions.source_session_id` on it. **It is not
"build step 3" — it carries an open decision.** The wire now *also* carries `recordingMethod` and
`device`, which step 3 was not written against. **Fork (health-app's to settle, health-app-rooted):
persist them now, or later.** Read: *persist, don't consume* — one nullable JSON blob on
`AerobicSession`, so the evidence exists the day a non-Samsung (Garmin / Deb) sync lands, versus a
second migration plus a blind window. Not a Code-CLI task from this repo.

**Not further along than it looks:** Deb's Garmin lane is blocked on **her first sync**, not on
anything built here — specifically whether Garmin writes HRV to Health Connect at all, and whether
it populates the two fields Samsung leaves UNKNOWN. This session made the *own* aerobic lane work
(needed regardless); it did not advance the Garmin question.
