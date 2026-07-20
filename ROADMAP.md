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
**Closed:** 2026-07-20 (ritual vocabulary — the last self-regenerating surface closed)

### This session — landed on master (`347af28`)
Governance and `.claude/` only. Five files; no `app/`, no `src/`, no scraper source, no
build config. `CLAUDE.md` absent from the diff, so the shared block is untouched by
construction.
- `616b801` — HANDOFF receipt, committed alone before any work.
- `273a429` — **`/closeout` column vocabulary struck.** Line 67's
  `purpose / why-parked / unblocks-on` now points at `CLAUDE.md`'s State-vocabulary
  section without restating it; lines 72/74's `parked`-as-status-verb → `rowed`.
  The `PENDING` section deliberately untouched.
- `b686801` — **stale-reference fix:** step 5 named `## Current Sprint`, a heading that
  does not exist. Real one is `## Sprint block`.
- `61c4f95` — **DECISIONS_LOG #21**, carrying the divergence ruling.
- `c6cfeae` — FEEDBACK ×2; Q10/Q11 added; Q9 item 2 discharged.
- `347af28` — HANDOFF CODE→CHAT entry.

### Why this brief existed at all
#20 swept the stores; the ritual that *writes* them kept the old dialect, so every
close-out would have re-emitted it. Inert debt is carried — a generator regenerates.
This was the only remaining surface of the second kind. Confirmed live: the re-invoked
ritual read back its own swept text this session.

### The 77-vs-132 divergence — ruled
**Structure: intentional.** The rituals legitimately differ because the repos do —
health-app carries a "Recent landings" block and the #38/#39 copy-back retirement; HCA
carries the ANCHOR wrong-repo self-check (#10/#11) and the write-a-Python-script DB rule.
`CLAUDE.md` permits repo-specific content, and none of it is vocabulary.
**Vocabulary: NOT aligned.** health-app's `.claude/commands/closeout.md:34` still reads
"pushed, **parked** in `BRANCHES.md`" — the brief's "already struck" was false. Logged
Q11; **HCA is authoritative for the ritual's vocabulary in the interim.**

### Exit condition — met on values, one residue in the frame
Status **fields**, counted by field across four files in both repos, totals reconciling
against row populations:

| Store | DONE | BLOCKED | OWED | UNSTARTED | fields / rows |
|---|---|---|---|---|---|
| HCA `BRANCHES.md` | 2 | 1 | 1 | 1 | 5 / 5 |
| HCA `OPEN_QUESTIONS.md` | 1 | 1 | 4 | 5 | 11 / 11 |
| health-app `BRANCHES.md` | 12 | 0 | 9 | 1 | 22 / 22 |
| health-app `OPEN_QUESTIONS.md` | 11 | 2 | 5 | 14 | 32 / 32 |

**Zero status fields outside the four states, all four files.** Residue is in the *frame*,
not the values: health-app `BRANCHES.md:3` still heads its columns
`| Why parked | Unblocks on |`. HCA swept its headers under #20. Folded into Q11 — a
column header tells the next writer what to put there.

### G1 — verified, still discharged
Both blocks independently extracted and compared, each asserted non-empty and ≥100 lines
before `cmp` was allowed to mean anything: HCA and health-app both
155 lines / 10232 bytes / md5 `4243c91ce78e0331ddfa5178aa3006b8`, `cmp` identical.
This session did not touch `CLAUDE.md`.

### Branch dispositions (terminal state)
- `gov/ritual-vocabulary` — **merged+deleted** (ff-only at `347af28`, pushed; local
  deleted). Terminal, so no row.
- `feat/hrv-node-dump` BLOCKED · `fix/hrv-capture-regression` UNSTARTED ·
  `claude/hevy-api-workout-query-teulc2` OWED — all rowed, none touched this session.

### Decisions
**#21** minted (max was #20). Number claimed at merge.

### Open (carried forward)
- **Q4** — day-lag / read-freshness. Still the only BLOCKED row in the repo.
- **Q7** — #18's flat-`sourcePackage` unfulfilled in `aggregateSteps`; fix at `stash@{0}`,
  unreviewed and unlanded, so #18 is overstated on master.
- **Q8, Q11** — the health-app return trip, now **six items** across both.
- **Q9 item 1** — `ROADMAP.md`'s own work queue above still carries `RESOLVED` / `parked`
  / `Blocked on`. Inert debt, not a generator.
- **Q10** — the ritual's own ANCHOR still states required state in the declarative.

### Next action
Watch ONE real overnight/~5am sync land today's HRV value in Railway (Postgres query, not
on-device UI) on the standalone release build — resolves Q4 and unblocks
`feat/hrv-node-dump`. Housekeeping still owed: rotate the Hevy API key (exposed in a chat
transcript 2026-07-11).
