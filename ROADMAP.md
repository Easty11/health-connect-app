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
**Closed:** 2026-08-17 (Brief 2: store omnibus + stash adjudication, then the majority-count amendment)

### This session — two concerns landed, `1edfdf8` (PR #30) and `10651cb` (PR #31)
Governance first, then the last stranded code item. Guard green on every head; both branches
merged+deleted local and remote, both rowed in `BRANCHES.md` under `#31`'s cited-⇒-must-row floor.
Minted **`#36`**, **`Q18`**, **`Q19`**; closed **`Q7`** and **`Q13`**.

**PR #30 — `chore/store-omnibus` (`ff2f3f6`).** Three stranded store items in one pass.
- **`Q13` ruled and closed.** The store's preamble taught the *work-item* axis while the shared
  block defines a *question* axis. Resolved toward **adoption**, not narrowing: every row here is a
  fork or a defect awaiting a ruling, not work someone failed to start. The preamble was rewritten
  too — it is a generator, and leaving it would re-teach the wrong axis next session (`#21`'s rule).
- **Sweep, read row-by-row rather than regexed.** Six `UNSTARTED → OPEN`; **`Q16 → OWED`**, the one
  that is not `OPEN` and the reason a regex would have been wrong — `#30` settled it and only a
  health-app-rooted execution remains, with its loop-close named. **Zero `BLOCKED` to re-tag**: `Q4`
  was the sole occurrence and closed 2026-08-08, so the lossy mapping `Q13` flagged never had to be
  paid.
- **`Q18` minted — scraper canary.** Canonical home for what health-app's register calls *"issue
  #9"*; no GitHub issue of that number exists. HRV is absent at source, so the scraper is the only
  delivery path and the SPOF residual is this repo's. The 2026-08-16 operator read shows no rows
  08-09/10/11 and nothing after 08-14, silently. Sub-question left open and named as the reason it
  is a question not a task: **gap-vs-failure discrimination** — an unworn ring is a legitimate gap,
  three silent days is not.
- **`Q19` minted — the `Q42` carry.** `parseSleepTimingContentDesc` captures `(\d+:\d+)`, which
  cannot hold a meridiem; `parseClockToMinutes` accepts the truncation as a valid time. Verified on
  master at the lines named. Recorded as **inferred, not observed** — every confirmed live string on
  file is 24-hour, so the trigger wants a real 12-hour capture before a fix.

**PR #31 — `fix/aggregatesteps-sourcepackage` (`fe2ebee` → `2ee21dc` → `2de57e3`).** `Q7`'s stash,
adjudicated live and then amended.
- **Adjudication:** the stash still applied clean and master had **not** satisfied `#18`
  independently — only `9cc1ee7` touched the file since base `63bdc73`, and it edits
  `workoutMapper`. Disposition (a), operator's word. Stash dropped at close (`3d3d395`).
- **Review found a data-loss path in the stash's own fix.** `??=` shipped a day of 100 Polar + 5000
  Samsung steps as `fi.polar.polarflow`; `#18`'s note says F1 dedup prefers direct AccessLink v4
  over that package, so F1 could discard the whole 5100-step day. **Worse than the `'unknown'`
  sentinel it replaced** — an absent provenance is inert, a wrong one is silently actionable.
- **`#36` — majority-count attribution.** The day attributes to the writer contributing the most
  steps; ties hold the first writer seen (stated in the helper, not left to key order); the `>=23h`
  aggregate branch is unchanged in kind; null writers count but never attribute. Resolved at source
  rather than logged as a hazard, which is why no companion question was minted.

### Gates — the control is what makes the green mean something
18 assertions, extracted from the **source text on disk** rather than re-implemented. 18/18 pass on
the landed code, and **both negative controls discriminate**:
- vs `origin/master`: **17 of 18 fail**; the sole pass is the count regression guard — correct,
  counts are untouched.
- vs `fe2ebee` (the `??=` commit): **exactly 3 fail**, and they are exactly the three majority
  assertions. Everything else passing is the evidence the rework is **surgical** — single-writer
  days, null handling, aggregate precedence, counts, tie-breaks, zero-step attribution, key safety
  and emitted shape all unchanged.

### Decisions / Questions
Minted **`#36`** (claimed at merge against a re-read `#35` / `Q19`), **`Q18`**, **`Q19`**. Closed
**`Q7` → `#36` (`10651cb`)** and **`Q13` → `ff2f3f6`**. Stores changed: `DECISIONS_LOG`,
`OPEN_QUESTIONS`, `BRANCHES`, `FEEDBACK`, `ROADMAP` (this block).

### The one residual, stated plainly
**`#18`'s Postgres check stays owed** — non-null `source_package` on steps-type rows in
`health_connect_record_sources` after one post-deploy sync. `#18`'s own How-you-know named it; it
has never run. `Q7` closes the **emitter** half only. This is a ~30-second Railway dashboard query
and it is the entire distance between "emitter verified" and `#18` fully closed.

### Branch dispositions (terminal state)
- `chore/store-omnibus` — **merged+deleted** (`1edfdf8`), rowed in `BRANCHES.md`.
- `fix/aggregatesteps-sourcepackage` — **merged+deleted** (`10651cb`), rowed in `BRANCHES.md`.
- `feat/hrv-node-dump` · `fix/hrv-capture-regression` — pre-existing, rowed, **neither touched**.

### Next action
**Run `#18`'s owed Postgres check.** One Railway dashboard query: non-null `source_package` on
steps-type rows in `health_connect_record_sources`, after one post-deploy sync has carried the
`#36` emitter. It is the only thing between "emitter verified" and `#18` fully closed, and it needs
the operator (Railway, not on-device UI, not runnable from a Code session).

Behind it, in this repo, nothing is blocked — `Q18` (canary) and `Q19` (12-hour clock) are the two
freshly-minted opens, and `Q19` wants a real 12-hour-locale capture before a fix is written against
it. The live frontier is health-app-side and **not reachable from an HCA-rooted session**: the
`fix/q45-nap-attribution` orphan and `Q102` restriction-mapping.

### Superseded by this session (kept for the record)
The block below described the 2026-08-10 ExerciseSession-metadata session (`d569adf`, `#35`). Its
device/environment notes still carry — see "Device / environment state" there, unchanged.

### 2026-08-10 session (superseded) — landed on master (`d569adf`, PR #26)
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

### Open (as of 2026-08-10 — superseded; states re-tagged to the question axis on 2026-08-17)
- `Q15` UNSTARTED · `Q16` UNSTARTED · `Q13` OPEN · `Q14` OPEN · `Q7` OWED · `Q10` UNSTARTED ·
  `Q9` UNSTARTED. No `BLOCKED` rows in `OPEN_QUESTIONS.md`.
  **Stale — read `OPEN_QUESTIONS.md`, not this line.** `Q13` and `Q7` have since closed and the
  `UNSTARTED` states no longer exist in that store (`Q13`, `ff2f3f6`).

### Next action (2026-08-10 — superseded, see the current one above)
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
