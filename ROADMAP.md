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
**Closed:** 2026-07-20 (HCA vocabulary parity — #91's four-state set adopted; `HANDOFF.md` established)

### This session — landed on master (`271abdd`)
Governance only. Six files, no `app/`, no scraper source, no build config.
- `e28e40f` — **HANDOFF.md established here.** Closes the interruption-ledger asymmetry
  #88 left when it scoped that file to health-app only; the single-repo rule makes
  health-app's unreachable from an HCA-rooted session. Header convention copied from
  health-app `9fa18cc`; first entry is the CHAT→CODE receipt, written before any work.
- `c6daa92` — **shared loop-rules block re-mirrored** from health-app `9fa18cc`, carrying
  #91's four-state vocabulary. Index content verified byte-identical at
  153 lines / 10080 bytes / md5 `9436cb22…`, `cmp` clean against the fetched source.
- `4fa44e6` — **barrier/trigger tie-break added** to the block: where evidence does not
  settle whether a dependency is a barrier or a trigger, the row is UNSTARTED.
- `f15b545` — **`BRANCHES.md` swept**; `claude/hevy-api-workout-query-teulc2` rowed.
- `0f7ff89` — **`OPEN_QUESTIONS.md` swept**; Q6–Q8 added.
- `3547e72` — **DECISIONS_LOG #20.**
- `7aa06bb` — **FEEDBACK ×4.**
- `271abdd` — HANDOFF CODE→CHAT entry.

### G1 breached by our own hand — this repo is authoritative for the block
The tie-break was added from a session that could not reach health-app, so the two repos
now hold different blocks: HCA 155/10232/`4243c91c…` vs health-app `9fa18cc`
153/10080/`9436cb22…`. Recorded in #20 itself (append-only) as well as Q8, because a
mutable store is the wrong home for a breached core invariant. Discharged only by the
return trip.

### Vocabulary state
Status **fields** — not word occurrences — across both swept stores: 2 BLOCKED / 3 DONE /
4 OWED / 4 UNSTARTED = 13, reconciling against 5 branch rows + 8 question rows.
Exit-condition grep for `PENDING|parked|retired|verifying|resolved|open` across
`BRANCHES.md` + `OPEN_QUESTIONS.md` on `origin/master`: **zero matches.**
Not yet swept, logged as Q9: this file's work queue above, and the `/closeout` command
definition — which re-emits the struck dialect every session until amended.

### Branch dispositions (terminal state)
- `gov/branches-vocabulary` — **merged+deleted** (ff-only onto `origin/master` at
  `271abdd`, pushed; local branch deleted). Terminal, so no `BRANCHES.md` row.
- `feat/hrv-node-dump` — **BLOCKED** in `BRANCHES.md`. **Pushed to origin this session**
  before rowing; its one commit (`b66d34b`) previously existed on local disk only.
- `fix/hrv-capture-regression` — **UNSTARTED** in `BRANCHES.md` (was `parked`). Its D2
  firewall-gap dependency is unsettled as barrier-or-trigger; the tie-break takes the
  label that asserts less. Untouched otherwise.
- `claude/hevy-api-workout-query-teulc2` — **OWED** in `BRANCHES.md`, rowed for the first
  time. Origin-only; deletion is Luke's call, not Code's.

### Decisions
**#20** minted (max was #19). Number claimed at merge per the number-at-merge rule.

### Open (carried forward)
- **Q4 — day-lag / read-freshness**: the one BLOCKED row. Blocker holds now.
- **Q7 — #18's flat-`sourcePackage` contract unfulfilled in `aggregateSteps`.** The fix
  is stashed at `stash@{0}`, unreviewed and unlanded; #18 is currently overstated on
  master. The row exists so something points at the stash.
- **Q8 — the G1 inversion + health-app return trip.** Last open item of the two-repo sweep.
- Structural debt still standing: HRV context firewall #8 D2 unbacked; Q4 HC
  date-attribution root cause.
- Untracked, preserved, not staged: `checkin_build_brief.md`, `hevy_routine.json`,
  `nodedump.txt` (the last is #19's consumed evidence, not a fresh artifact).

### Next action
Watch ONE real overnight/~5am sync land today's HRV value in Railway (Postgres query, not
on-device UI) on the standalone build — resolves Q4 and unblocks `feat/hrv-node-dump`.
Then the health-app return trip (4 items, see `closeout.md`). Housekeeping still owed:
rotate the Hevy API key (exposed in a chat transcript on 2026-07-11).
