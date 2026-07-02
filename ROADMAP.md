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
**Closed:** 2026-07-02 (governance-parity session)

### This session — landed on master
- Governance parity (Commit A): health-app shared loop-rules block (`83e0cb2`
  l.20–136) copied verbatim into `CLAUDE.md`, replacing the parallel
  Single-writer / Canonical-stores / Decisions-log-discipline sections and the
  stale Session-rituals transplant; `/closeout` brought current (#38/#39
  body→`closeout.md` sole sink, pointer-only stdout; #40 branch terminal-state
  gate inserted as step 4); `BRANCHES.md` ledger created.
- DECISIONS_LOG **#16** (Commit B): parity entry — #38/#39 discharged, #40
  landed, twins attribution grounded, branch dispositions recorded.

### Branch dispositions (terminal states, per #16)
- `chore/governance-held-writes` — **deleted** (husk: single commit, bare
  close-out; `git cherry` inspected, no substance).
- `chore/closeout-routing` — **deleted**, superset-superseded: its body→file +
  pointer-stdout substance is on master via the mirrored `/closeout`; its
  emission carve-out is retired by #39; its on-branch provisional "#17" is
  discarded per number-at-merge — never canon.
- `fix/hrv-capture-regression` — **parked** in `BRANCHES.md` (holds the #8 D2
  guard-proof test; unblocks on the firewall-gap session, Brief 1).

### Decisions
DECISIONS_LOG max now **#16** on master. The provisional "#17" that lived on
`chore/closeout-routing` was discarded with the branch — it was never canon.

### ⚠ Cross-repo — PROVISIONAL (next health-app session, carried forward)
health-app DECISIONS_LOG #31 cites a phantom companion fix ("HCA #16,
`findByIdValidBounds`" — neither exists). Approved supersede **#34** drafted for
health-app. Also owed there: flip health-app OPEN_QUESTIONS Q2 (backend-side
mirror of the sleep de-dup bug) open→resolved. Both PENDING — health-app session.

### ⚠ Carried forward — top structural debt (UNTOUCHED)
HRV context firewall still LIVE-UNBACKED (Decision #8 D2): `src/contract/` has no
`CaptureSource`/`CaptureContext` enum; the HRV path landed without the #6 firewall.
Also open: Q4 HC date-attribution root cause.

### Next action
Close the HRV context firewall gap (#8 D2): (1) add `CaptureSource`/`CaptureContext`
enum to `src/contract/`, (2) stamp context in `HRVCaptureModule.kt` event payload,
(3) verify D2 — unblocks `feat/hrv-capture`/C3 and pairs with the
`fix/hrv-capture-regression` triage. In parallel: health-app session for #34 + its
OPEN_QUESTIONS Q2 flip; Q4 HC date-attribution.
