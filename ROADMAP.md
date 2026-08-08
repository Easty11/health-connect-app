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
**Closed:** 2026-08-08 (Brief E rev 2: checker mirror, `land` guard, `Q6` criterion, cited evidence committed)

### This session — landed on master (`0d16038`, PR #21)
Governance/store + one dev artefact. No `app/`, no `src/`, no scraper source. Eight
concern-split commits + a placeholder-resolution commit; `placeholder guard (POSIX)` green,
merged `--merge` under ruleset `20573455`. Placeholders resolved **pre-PR** (2c runs `--ref
HEAD` on the merge commit) against `origin/master`'s re-read max #28 / Q14, 0 behind.

- `bf9e545` + `4023ba9` — **checker brought to health-app's repaired form (`#29`).** `read()`
  mirrored byte-for-byte (md5 `154e1871…`, source lines joined `\n` + one trailing `\n`, LF
  blob): byte-capture + explicit UTF-8 decode, non-UTF-8 and empty → exit 2. Docstring-stripped
  bodies pre-mirror differed by **exactly two hunks** (read + main string). Docstring repaired
  **repo-local** (`#22` clause 3): retracted *"the alias calls the same script"* deleted (health-app
  struck it 2026-08-04; HCA had kept it); HCA's three surfaces stated, each verified from this
  tree/API. `main()`'s advisory string left divergent by design. Four exit-code controls re-run
  Windows/`C:\Python314` (0 / 1 file:line / 2 no-traceback / 2) + the `--ref` git-show path.
- `d07b229` — **`land` guard (`#30`) + CLAUDE.md.** Alias refuses from `master`/`main` before
  calling `gh`. **Empirical finding:** the exit-0 silent-no-op premise does **not** reproduce
  under **gh 2.93.0** — no-PR returns **exit 1** from master and from a no-PR work branch. Guard
  kept as fail-fast, version-independent clarity; **partial** (guards master/main only). Three
  land controls observed: master→refuse exit 1; branch-with-PR→permitted (this land); no-PR
  branch→exit 1.
- `1bc0cda` — **`Q6` resolved on a criterion (`#31`).** Row a merged+deleted branch iff a store
  cites an artefact produced on it (run ID, control output, SHA); floor semantics. Tested against
  every row — four control branches rowed (run IDs cited `#24`/`#28`), `gov/close-q12` not.
  `BRANCHES.md` header now states the test.
- `f229dd6` — **`Q15` (parity register, mirrors health-app `Q87`) + `Q16` (land pairing) + Hevy
  strike.** `Q15` in this store's four-state vocab (`Q13` untouched); names five cross-repo
  artefacts. Hevy rotation struck — discharged 2026-07-11.
- `6ce4273` — **`nodedump.txt` committed.** The cited evidence (`#19`/`BRANCHES`/`FEEDBACK`) that
  lived on one machine; privacy objection withdrawn. `#9` does not cover this repo's own evidence.

### Findings to carry
- **`land` exit-0 premise did not reproduce (gh 2.93.0 → exit 1).** `#28`'s session note that
  `land` from master exits 0 is a carried-forward claim; under gh 2.93.0 it is exit 1. The guard
  is retained as clarity, recorded honestly as partial (`#30`).
- **`Q12` confirmed unchanged** (Brief E step 6): `DONE → #28`, three-layer table, residue named.
  Its line-209 "no `.github`" is under a dated `CORRECTED 2026-08-04` header, superseded below —
  a layered narrative, not a live-false claim.
- **`BRANCHES.md` is `i/lf`, not `i/-text`** — HCA does not carry the CRLF-binary trap Brief D hit
  in health-app. `.gitattributes` remains the durable fix (deferred).
- **⚠ Stale `CLAUDE.md` "Merge path — CI-guarded, not yet CI-gated" (≈lines 285–300).** Claims the
  ruleset is **absent** and `Q12` OWED and `git push origin master` still succeeds — all false
  since `#28`/`20573455`. Out of Brief E's scope; flagged for a follow-up correction.
- **Number-at-merge vs the PR gate (from the brief's GUARD).** 2c forces resolution *before* the
  PR opens, so a collision window exists between PR-open and merge that ff+push did not have. Worth
  its own row when someone next has both repos in view.

### Decisions / Questions
Minted **#29** (checker drift), **#30** (`land`), **#31** (`Q6`); **Q15** (parity register), **Q16**
(land pairing). `Q6` closed → `#31`. Each number claimed at merge, `origin/master` re-read #28/Q14.
Stores changed: `DECISIONS_LOG`, `OPEN_QUESTIONS`, `BRANCHES`, `ROADMAP`, `CLAUDE`, plus
`scripts/check_governance_placeholders.py` and `nodedump.txt`.

### Branch dispositions (terminal state)
- `gov/checker-mirror` — **merged+deleted** local and remote via PR #21 (`0d16038`).
- `feat/hrv-node-dump` **UNSTARTED** · `fix/hrv-capture-regression` **UNSTARTED** — both rowed in
  `BRANCHES.md`, neither's code touched this session.

### Open (carried forward)
- **`Q15` · UNSTARTED** — cross-repo artefact-parity register: build it or keep ad hoc. Owner Luke.
- **`Q16` · UNSTARTED** — `land` guard owed to health-app's identical alias. Owner: health-app.
- **`Q13` · OPEN** — imported question-state axis vs this store's four-state; lossy remap.
- **`Q14` · OPEN** — shared block is the last surviving site of `parked`; mirror of health-app `Q33`.
- **`Q7` · OWED** — `#18`'s flat-`sourcePackage` unfulfilled in `aggregateSteps`.
- **`Q10` · UNSTARTED** — the ritual's own ANCHOR states required state in the declarative.
- **`Q9` item 1** — `ROADMAP.md` work queue above still carries `RESOLVED` / `parked` / `Blocked on`.
- No `BLOCKED` rows remain in `OPEN_QUESTIONS.md`.

### Next action
Governance is at a stopping point — all three enforcement layers live, no `#NEXT` on master, no
branch in limbo. Highest-value next: correct the stale `CLAUDE.md` "Merge path" section (ruleset is
present, `Q12` DONE). Product, Luke's call: `feat/hrv-node-dump`'s keep-behind-a-flag vs strip (its
evidence `nodedump.txt` is now committed). Hevy rotation is discharged (2026-07-11) — no longer owed.
