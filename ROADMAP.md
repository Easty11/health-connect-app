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
**Closed:** 2026-08-08 (Brief G: `Q4` closed on operator observation, `feat/hrv-node-dump` unblocked, untracked artifacts dispositioned)

### This session — landed on master (`cd911b1`, PR #19)
Governance/store-only. No `app/`, no `src/`, no scraper source. Three concern-split commits,
`placeholder guard (POSIX)` green, merged `--merge` under the ruleset.

- `64b4438` — **`Q4` closes on operator observation; `Q5` trigger fired.** `Q4` (day-lag /
  HRV read-freshness) was the repo's only `BLOCKED` row. Its blocker was one overnight/~5am
  sync landing today's HRV in Railway (owner Luke). The row→night mapping exists only
  *outside* the pipeline — a stored value is byte-identical whether or not it is fresh — in
  the operator who identified the day-lag and reads it daily on the standalone build. Closed
  `DONE → operator observation (2026-08-08)`, attributed and dated, not softened to
  "reported." `Q5`'s reconciliation trigger fired; it stays `UNSTARTED` (fired trigger =
  worth doing, not done); its correct/backfill-vs-provenance-marker policy fork stays Luke's.
- `4b54f71` — **`feat/hrv-node-dump` unblocked.** `BRANCHES.md` row 18 named the `Q4` sync
  verbatim; `Q4` closed clears the sole live blocker. Status `BLOCKED → UNSTARTED` per the
  store's tie-break (half-done work, no blocker → UNSTARTED; row 17 precedent). keep-behind-
  a-flag vs strip disposition left open — Luke's.
- `d341637` — **stray artifacts gitignored per `#9`.** `hevy_routine.json`,
  `checkin_build_brief.md` — active `#9` rules them not-tracked-here. `nodedump.txt`
  deliberately NOT ignored: cited evidence and its disposition is open.

### Convention findings (Brief G gates)
- **`DONE` needs no decision number here.** Existing `DONE` rows split `DONE → #N` (Q8/Q11/
  Q12) and `DONE → <SHA>` (Q3, `db6f50e`). Q3 proves the store permits `DONE` citing a
  non-decision artefact, so `Q4` closed `DONE → operator observation` with **no `#NEXT`
  minted** — an operator observation is a finding, not a decision, and minting one would
  inflate the log.
- **`Q13` axis conflict acknowledged, not resolved.** This store uses the four-state
  vocabulary (preamble + all pre-existing rows); the imported OPEN/OWED/DONE→#N question-
  state axis is deliberately not adopted (`Q13`, OPEN). `Q4` resolved within the four-state
  axis; `Q13` untouched. Re-labelling the 11 rows is lossy and remains Luke's call.

### `nodedump.txt` — disposition open, recommend gitignore + retain local
382 lines / 65 KB, pure Samsung Health accessibility node tree. **No direct identifiers**
(name/email/account/serial/token scans empty) but **does** contain personal physiological
values (HRV `106`/`97` ms, HR `56` bpm, sleep/energy scores, steps, bed/wake times) — a
public-repo concern. **Never committed anywhere** (not in history, not on
`feat/hrv-node-dump`), yet cited as evidence in `#19`, `BRANCHES.md` row 18, and `FEEDBACK`.
Of commit / gitignore+retain-local / delete: **recommend gitignore + retain-local** — keeps
health data out of the public repo *and* preserves the cited artefact (delete destroys it;
`#19` prose keeps the specific evidentiary detail as a backstop). Left untracked pending
Luke's decision; once the two strays are ignored it is the one file a blanket `git add .`
could stage — flag.

### Branch dispositions (terminal state)
- `gov/close-q4` — **merged+deleted** local and remote via PR #19 (`cd911b1`).
- `feat/hrv-node-dump` **UNSTARTED** (unblocked this session) · `fix/hrv-capture-regression`
  **UNSTARTED** — both rowed in `BRANCHES.md`, neither's code touched this session.

### Decisions / Questions
No decision minted (max stays **#28**). No question minted (max stays **Q14**). `Q4` closed
→ operator observation; `Q5` trigger noted (stays UNSTARTED). Stores changed:
`OPEN_QUESTIONS`, `ROADMAP`, `BRANCHES`, `.gitignore`.

### Open (carried forward)
- **`Q13` · OPEN** — imported question-state axis vs this store's four-state; lossy remap,
  Luke's judgement.
- **`Q14` · OPEN** — shared block is the last surviving site of `parked`. Mirror of
  health-app `Q33`; own brief, mirror-first, G1 re-fingerprint.
- **`Q7` · OWED** — `#18`'s flat-`sourcePackage` unfulfilled in `aggregateSteps`.
- **`Q6` · UNSTARTED** — retain `DONE` rows or drop them.
- **`Q10` · UNSTARTED** — the ritual's own ANCHOR states required state in the declarative.
- **`Q9` item 1** — `ROADMAP.md` work queue above still carries `RESOLVED` / `parked` /
  `Blocked on`. Inert debt.
- No `BLOCKED` rows remain in `OPEN_QUESTIONS.md` after `Q4`'s close.

### Next action
Product, Luke's call: `nodedump.txt` is now committed as cited evidence (Brief E, step 11), so
`feat/hrv-node-dump`'s keep-behind-a-flag vs strip is the residue.

~~Rotate the Hevy API key (exposed 2026-07-11)~~ — **discharged: rotated 2026-07-11 by the
operator** (struck 2026-08-08). It has not been a live action since that date; the stale "still
owed" line is removed.
