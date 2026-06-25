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
- **HRV context firewall unbacked — blocks `feat/hrv-capture`/C3. Now BACKEND-FIRST.**
  `src/contract/` has no `CaptureSource`/`CaptureContext` enum; the native
  module stamps no context on any capture. The #6 firewall (Decision #8 D2)
  is unbacked. **2026-06-25 finding:** the live backend `/openapi.json` exposes
  **no** `CaptureContext`/context/source schema, and `SyncPayload` carries no
  context field — so the enum cannot be single-sourced app-side (gen:contract
  pattern needs a backend schema; hand-typed literals are forbidden). Sequence
  is therefore backend-first: (1) backend exposes `CaptureContext` enum +
  context field on the ingest contract; (2) `gen:contract` pulls it into
  `src/contract/`; (3) stamp context in `HRVCaptureModule.kt` event payload;
  (4) verify D2 (HRV path imports the enum).
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

**Branch:** `fix/hrv-capture-regression` (0/0 synced with origin)  
**Closed:** 2026-06-25

### Landed (prior sessions)
- `4581f91` feat(contract): add SleepStageType generated enum + gen:contract script
- `672ab95` feat(deep-sleep): add confidence flagger, gate UI; remove HealthConnectAudit
- `ab94ffe` feat(hrv): native Samsung Health HRV accessibility scraper pipeline
- `8c63856` chore: session close-out

### This session — capture→POST regression fix (BRIEF 1)
- `fb3310e` fix(hrv): decouple capture/POST auth path from scraper native module
- `a389a2c` chore: session close-out
- `b7621c4` test(hrv): auth-path simulation — module-absent guard proof
- `a1a387d` chore: record auth-path simulation gate (integration precondition met)

Branched `fix/hrv-capture-regression` off `8c63856`. All pushed (0/0). Draft PR
[#2](https://github.com/Easty11/health-connect-app/pull/2) holds the record —
now **integration-eligible** (auth-path sim passes) but held **draft per standing
instruction**, not merged.

**Unrelated in-flight work present in tree (NOT mine, NOT committed):** modified
scraper Kotlin `HRVAccessibilityService.kt` / `HRVDataModel.kt` and untracked
`_scraper_dumps/` — belongs to the scraper/Brief 2 workstream. Left untouched per
the "commit only close-out artifacts" rule. `_scraper_dumps/` is a likely stray
(Decision #9 candidate — gitignore or relocate).

### Regression diagnosis
`get_recovery_metrics` shows recovery rows landing daily through **2026-06-23**,
dead from the 24th — the day `ab94ffe` shipped. Root cause **diverged from the
brief's hypothesis**: the POST itself is sound (`syncHealthData` →
`/health-connect/sync`, `SyncPayload` shape, and `AsyncStorage.removeMany` —
which is the correct API in AsyncStorage v3.1.1, *not* a bug). The real
regression: `ab94ffe` coupled the auth path to the scraper's `HRVCapture` native
module, **unguarded**, at `App.js:81` (login), `App.js:94` (logout), and
`Root.js:55` (AuthExpired). When `HRVCapture` is absent (JS-only reload, no
native rebuild) login throws → no token → SyncScreen never mounts → capture→POST
dies.

### Fix + validation
Guarded all three calls with the safe idiom already at `src/api.js:7-17`
(optional chaining + try/catch). Diff = `App.js` +8/−2, `Root.js` +5/−1 —
auth-path lines only; scraper feature code (`NativeEventEmitter`,
`triggerManualExtraction`, extraction listeners) and all Kotlin untouched.
Validated a known-good 23 Jun-shape payload against the **live `SyncPayload`
OpenAPI contract → PASS, 2xx-eligible** — but that arm confirms an already-sound
surface, so it does not test the fix. **Integration precondition met** via an
**auth-path simulation** (`b7621c4`, `npm run test:auth-path`): exercises
login/logout/AuthExpired with `HRVCapture` ABSENT (the ab94ffe condition),
asserting no throw AND capture→POST proceeds; guards extracted verbatim from
source; a negative control reproduces the pre-fix throw/dead-end. All PASS. No
JWT, no production POST, no overnight capture (scraper down → would alias).

### Firewall / D2 — confirmed BACKEND-BLOCKED (was "next action: close it")
Investigated closing the #8 D2 firewall gap this session. The live
`/openapi.json` exposes **no** `CaptureContext`/context/source enum and
`SyncPayload` has no context field — so it **cannot** be single-sourced app-side
(hand-typed literals forbidden by the gate). D2 remains false-in-code; the gap
is now correctly re-sequenced **backend-first** (see work queue). No
DECISIONS_LOG append — the fix embodies no new decision.

### Next action
PR #2 is integration-eligible (auth-path sim passes) but held draft for the
record. Decide its integration: mark ready + merge to `master`, or rebase the HRV
concern onto `feat/hrv-capture` per Decision #7 first. Separately, the firewall is
blocked on the backend exposing `CaptureContext` — raise that on `health-app`
before any further app-side firewall work.
