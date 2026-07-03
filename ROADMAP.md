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

**Branch:** `master` (trunk, via `chore/propagate-empirical-specificity`)  
**Closed:** 2026-07-03 (empirical-specificity propagation session)

### This session — landed on master
- `f841a29` (verbatim propagation, no new decision — `LOG: None` per brief):
  the Empirical Specificity standing-rule bullet propagated into HCA
  `CLAUDE.md`'s shared loop-rules block, immediately after "Verify before
  design.", closing the two-master drift opened when the bullet landed in
  health-app only (health-app `38061d1`). Parity baseline confirmed
  identical-but-for-the-bullet before insertion; post-insertion diff of the
  shared block (HCA l.8–133 vs health-app l.20–145) against health-app master
  `96281a6` = empty. No other file touched.

### Branch dispositions (terminal state)
- `chore/propagate-empirical-specificity` — **merged+deleted** (`--ff-only`,
  pushed, local branch deleted).
- `fix/hrv-capture-regression` — **parked** in `BRANCHES.md`, untouched this
  session (holds the #8 D2 guard-proof test; unblocks on the firewall-gap
  session, Brief 1).
- `fix/scraper-sh-relayout` — **parked** in `BRANCHES.md`, untouched this
  session (SH scraper UI relayout; 3 unpushed local commits pending Luke's
  review; unblocks on that review).

### Decisions
No new DECISIONS_LOG entry — this session is a verbatim propagation of an
existing health-app rule, not a new decision (per the brief's explicit
`LOG: None`). DECISIONS_LOG max remains **#18**.

### ⚠ Carried forward — top structural debt (UNTOUCHED)
HRV context firewall still LIVE-UNBACKED (Decision #8 D2): `src/contract/` has no
`CaptureSource`/`CaptureContext` enum; the HRV path landed without the #6 firewall.
Also open: Q4 HC date-attribution root cause. #18's Postgres verification
(non-null `source_package` rows post-deploy) is still owed — not touched this
session.

### Next action
Close the HRV context firewall gap (#8 D2) — (1) add
`CaptureSource`/`CaptureContext` enum to `src/contract/`, (2) stamp context in
`HRVCaptureModule.kt` event payload, (3) verify D2 — unblocks
`feat/hrv-capture`/C3 and pairs with the `fix/hrv-capture-regression` triage.
Separately: verify #18's Postgres gate after the next real device sync, and
review/land or discard `fix/scraper-sh-relayout`'s 3 unpushed commits.
