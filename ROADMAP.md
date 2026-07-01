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
**Closed:** 2026-07-02

### This session — landed on master
- `9e1777a` docs(roadmap): Q2 resolved via `36df9a2` (≡`84a06c6`); Q3 unblocked,
  still #4-gated.

### Session facts (de-chaos brief — outcome differed from premise)
- The brief's "stranded Q2 fix" was already in master: `84a06c6` ≡ `36df9a2`
  (identical patch-id), landed previously via PR #5 rebase-merge. Steps 1–2
  (rescue + ff-merge) were no-ops; no cherry-pick was committed.
- VERIFY ran anyway (gates the ROADMAP "resolved" claim): no test script in
  `package.json`, so `collapseSleepSessions()` was exercised standalone —
  9/9 behavioral checks pass (overlap/duplicate collapse to longest incl.
  transitive chains; single/disjoint/back-to-back non-duplicate paths identity;
  `durationMinutes` precedence; empty/null safe).
- GATE 2 settled: chip B `6e90315` ≡ master's `8a724e6` (identical patch-id) —
  nothing lost by pruning.
- Pruned 4 remote branches (ancestry/equivalence re-verified at machine first):
  `feat/deep-sleep-confidence`, `fix/scraper-sh-relayout` (both strict ancestors),
  `claude/session-lifecycle-sleep-dedup-b9k5qf` (both unique commits patch-identical
  in master), `claude/session-lifecycle-sleep-dedup-yg1xx6` (only unique commit a
  close-out).
- Remote surface now: `master` + 3 consciously deferred branches (see below).

### Decisions
DECISIONS_LOG max unchanged at **#15** on master. NOTE: branch
`chore/closeout-routing` carries a provisional **#17** (closeout body → closeout.md
sole sink) not yet on trunk — it is NOT canon until that branch's governance
session reconciles it against health-app #38/#39.

### Deferred branches (each its own concern — do not batch)
- `chore/closeout-routing` — HCA half of the owed #38/#39 `/closeout` mirror;
  reconcile to match health-app #39 (pointer-only, no emission exception) →
  governance session.
- `chore/governance-held-writes` — 1 commit, tip is a close-out; inspect, likely
  delete → quick follow-up.
- `fix/hrv-capture-regression` — 5 commits, touches HRV capture; ties to the live
  #8 D2 firewall gap → HRV session.

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
