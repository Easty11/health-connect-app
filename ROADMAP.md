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
**Closed:** 2026-06-27

### This session — landed on master
- `8a724e6` chore(governance): adopt session-lifecycle ritual (chip B) — `## Session
  rituals` section transplanted verbatim from `health-app/CLAUDE.md`.
- `36df9a2` fix(sleep): de-dup `validateNight` SleepSession records (Q2) —
  `collapseSleepSessions()` mirrors backend `_aggregate_day` (longest-per-night),
  applied before stage-flatten in `validateNight`/`runDeepConfidence`. Verified on a
  known multi-session night (3 overlapping → 1 longest; deep segments 3→1; zero overlaps).
- `6f454a2` merge `feat/deep-sleep-confidence` → master (PR #1). Governance conflict
  resolved take-master (master ⊇ branch; DECISIONS_LOG stayed #15).
- `c257b00` merge `fix/scraper-sh-relayout` → master (PR #3). SH 7.x scraper-capture
  code (`f59c316`/`6b81eb1`/`06d5a43`) reached trunk; only DECISIONS_LOG conflicted,
  resolved take-master (subsumption verified — branch carried no unique governance).
- `e1ceab4` docs(roadmap): record 3rd SH-breakage tick (#12 SDK-migration trigger).

Three open PRs drained to trunk: #1 (deep-sleep), #5 (chip B + Q2, rebase-merged →
`8a724e6`+`36df9a2`), #3 (SH 7.x scraper). All merged/closed.

### Decisions
DECISIONS_LOG max unchanged at **#15**. #16 NOT minted — ruling: the 25-Jun
SH-breakage is operational watch-state, homed in the work queue above (tally tick),
not a decision (#14 already superseded #12's open-gaps portion).

### ⚠ Cross-repo defect found — PROVISIONAL (next health-app session)
health-app DECISIONS_LOG #31 cites a phantom companion fix — "`health-connect-app`
DECISIONS_LOG #16, `findByIdValidBounds`". Verified this session: no HCA #16 (max is
#15), `findByIdValidBounds` exists on no ref, and neither `06d5a43` nor `f59c316`
touches the scalar-tile reads or carries staleness logic. Approved supersede **#34**
drafted for health-app (corrects citation, names the absence, affirms #31's data
core). PENDING — belongs to a health-app session; uncommitted = provisional.

### ⚠ Carried forward — top structural debt (UNTOUCHED)
HRV context firewall still LIVE-UNBACKED (Decision #8 D2): `src/contract/` has no
`CaptureSource`/`CaptureContext` enum; `ab94ffe`'s HRV path landed without the #6
firewall. Also open: Q4 HC date-attribution root cause.

### Next action
Close the HRV context firewall gap (#8 D2): (1) add `CaptureSource`/`CaptureContext`
enum to `src/contract/`, (2) stamp context in `HRVCaptureModule.kt` event payload,
(3) verify D2 — unblocks `feat/hrv-capture`/C3. In parallel: commit health-app #34;
Q4 HC date-attribution. NOTE: the work-queue "Q2 — de-dup validateNight" item landed
this session (`36df9a2`) — update the queue on next open.
