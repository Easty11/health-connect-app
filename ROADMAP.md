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

- **Q2 — de-dup `validateNight()` before `runDeepConfidence`.**
  The single next real-engineering action. Blocks Q3.
- **Q3 — wire `runDeepConfidence` into readiness / Banister.**
  Blocked by Q2 *and* by the threshold review gate (DECISIONS_LOG #4).
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

**Branch:** `feat/deep-sleep-confidence` (0/0 synced with origin)  
**Closed:** 2026-06-24

### Landed (prior sessions)
- `4581f91` feat(contract): add SleepStageType generated enum + gen:contract script
- `672ab95` feat(deep-sleep): add confidence flagger, gate UI; remove HealthConnectAudit
- `82ee3f2` chore: session close-out
- `c415f6a` chore: session close-out
- `ab94ffe` feat(hrv): native Samsung Health HRV accessibility scraper pipeline

### This session
No commits. Operational only — closed the `add -A` / dead-script hazard:
- Deleted untracked `push_to_hevy.py` (hardcoded — now rotated — API key + non-canonical `/v1/routines`). Working-tree delete; nothing to commit (Decision #9).
- Verified branch is 0/0 with origin → the firewall/HRV work was already pushed, so the handoff's "push stranded work" had nothing to do. No-op `--force-with-lease` correctly skipped.
- Phase B (hevy-client `f6d94a8`/`82f0b88` topology fix) deferred to its own hevy-client-rooted session; step-3 topology hard-stop preserved.

### HRV payload now LANDED (was "parked unstaged" last session)
`ab94ffe` committed the full HRV payload (App.js, Root.js, `HRVCaptureModule.kt`, `data/`, `hrv/`, manifest, gradle, etc.) onto `feat/deep-sleep-confidence` — onto the deep-sleep branch, NOT `feat/hrv-capture` as Decision #7's concern-split intended. Concern-bleed is already in pushed history (noted, not reversed). Tree is now clean (only strays `checkin_build_brief.md`, `hevy_routine.json` remain — Decision #9).

### ⚠ Firewall gap is now LIVE-UNBACKED (priority raised)
`ab94ffe` added the HRV capture path but **no `src/contract/` enum** — `src/contract/` still holds only `sleepStages.generated.js`, and no tracked source references `CaptureContext`. So Decision #8 D2 is FALSE in committed, pushed code: HRV landed without the #6 context firewall. Decision #8 said "if D2 false: STOP; wire it before HRV lands" — HRV has now landed ahead of it.

### Next action
Close the firewall gap, now urgent: add `CaptureSource`/`CaptureContext` enum to `src/contract/`, stamp `passive_overnight | calibration | session` context in `HRVCaptureModule.kt`'s event payload, and verify D2 (HRV path imports the enum). Until then any `session`-context capture is not source-guarded against entering readiness. Then resolve the concern-split (keep HRV on this branch vs. rebase onto `feat/hrv-capture`).
