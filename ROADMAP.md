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

**Branch:** `master` (trunk, via `chore/gate-remirror` + `feat/f1-writer-forwarding`)  
**Closed:** 2026-07-02 (gate-remirror + F1-forwarding session)

### This session — landed on master
- `e2a88ed` / `46597cb` (**#17**): HCA's shared loop-rules block re-mirrored
  verbatim from health-app `504e5e5` (l.20–139), carrying #41's
  terminal-state-gate extension — the gate now enumerates local branches
  (`git branch`) as well as `refs/remotes/origin`; a local branch with `+`
  commits vs `origin/master` must be pushed, parked in `BRANCHES.md`, or
  discarded before close. `.claude/commands/closeout.md` step 4 extended
  lockstep. First application of the edit-in-health-app-copy-to-HCA mechanism
  established by #16 — a verbatim copy, not a hand-merge. Local-branch limbo
  cleared under the new gate: `feat/deep-sleep-confidence` deleted (empty
  cherry, fully upstream); `fix/scraper-sh-relayout` parked in `BRANCHES.md`
  (3 unpushed commits, pending review). #17 claimed at the `--ff` instant
  (max confirmed #16). Landed `--ff-only` via `git land`;
  `chore/gate-remirror` self-deleted.
- `bd8ba89` / `09552ed` (**#18**): F1 writer-identity forwarding — every
  mapper in `src/healthConnect.js` (sleep, HRV, heart rate, steps, workouts)
  now forwards `sourcePackage: record.metadata?.dataOrigin ?? null`.
  `dataOrigin` verified against a live device `[HC raw]` log to be a flat
  package-name string, not a `{packageName}` object — corrects the
  originally-briefed field path. Implements the HCA half of health-app
  #36/#37; backend's `get_source_package()` reads the alias with no backend
  change needed. #18 claimed at the `--ff` instant (max confirmed #17).
  Landed `--ff-only` via `git land`; `feat/f1-writer-forwarding` self-deleted.

### Branch dispositions (terminal states, per #17/#18)
- `chore/gate-remirror` — **merged+deleted**.
- `feat/f1-writer-forwarding` — **merged+deleted**.
- `fix/hrv-capture-regression` — **parked** in `BRANCHES.md` (holds the #8 D2
  guard-proof test; unblocks on the firewall-gap session, Brief 1).
- `fix/scraper-sh-relayout` — **parked** in `BRANCHES.md` (SH scraper UI
  relayout; 3 unpushed local commits pending Luke's review; unblocks on that
  review).

### Decisions
DECISIONS_LOG max now **#18** on master. #17 supersedes the #16 shared-block
snapshot (remotes-only gate) with #41's local+remote gate. #18 implements the
HCA half of health-app #36/#37 (writer-identity forwarding).

### ⚠ Verification owed (not verifiable from this session)
#18's Postgres check is still open: after the next deploy + a real device
sync, confirm `health_connect_record_sources` shows non-null `source_package`
rows (e.g. `com.sec.android.app.shealth`, `fi.polar.polarflow`) replacing the
`'unknown'` sentinel. Report a sample row.

### ⚠ Carried forward — top structural debt (UNTOUCHED)
HRV context firewall still LIVE-UNBACKED (Decision #8 D2): `src/contract/` has no
`CaptureSource`/`CaptureContext` enum; the HRV path landed without the #6 firewall.
Also open: Q4 HC date-attribution root cause.

### Next action
Deploy + run a real sync to verify #18's Postgres gate (sample row of non-null
`source_package`). In parallel: close the HRV context firewall gap (#8 D2) —
(1) add `CaptureSource`/`CaptureContext` enum to `src/contract/`, (2) stamp
context in `HRVCaptureModule.kt` event payload, (3) verify D2 — unblocks
`feat/hrv-capture`/C3 and pairs with the `fix/hrv-capture-regression` triage.
Separately: review/land or discard `fix/scraper-sh-relayout`'s 3 unpushed
commits.
