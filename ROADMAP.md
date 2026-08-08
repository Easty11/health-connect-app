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
**Closed:** 2026-08-08 (Brief H: struck the stale merge-path section, retracted `#30`'s exit-0 premise)

### This session — landed on master (`0694428`, PR #23)
Governance/store only. No `app/`, no `src/`, no scraper source. Two concern-split commits + a
placeholder-resolution commit; `placeholder guard (POSIX)` green, merged `--merge` under ruleset
`20573455`. Placeholders resolved **pre-PR** against `origin/master`'s re-read max #31 / Q16, 0 behind.

- `cdfe6a7` — **`#32`: `#30`'s premise retracted.** `#30` asserted at `:948` that `land` from
  master *"finds no PR, and exits 0"* — inside an entry whose heading says it does not reproduce.
  **Measured** 2026-08-08 from master, guard bypassed: `no pull requests found for branch "master"`,
  **exit 1**. Same machine, gh 2.93.0, same day as `#28`'s note. Append-only: `#30` not edited; `#32`
  supersedes its premise. The `case` guard stands on its own merits; it fixes no live defect. **Rule
  earned: an exit code is measured or it is not stated** (sixth in the family).
- `aebb81a` — **`#33`: CLAUDE.md merge-path section struck.** It stated the ruleset absent, PR arm
  non-blocking, direct push succeeding, `Q12` OWED — all false by 2026-08-08 (ruleset `20573455`
  active, `GH013` refuses direct push, `Q12` DONE `#28`); one was internally false even then (prose
  said two layers absent, the table said one). `#184`: strike, don't transcribe. Replaced with
  `gh api …/rulesets` + what the answer *means*. Ordering rationale retained and retensed (`#27`).

### Settled this session (were "Findings to carry" in Brief E)
- **`land` from master exits 1, and always did.** No longer hedged as "did not reproduce" — measured
  as the reported input (`#32`). `#28`'s exit-0 note was inferred from the absence of an error line,
  never measured.
- **The stale merge-path section is struck** (`#33`) — enforcement state is now read live, not
  transcribed.

### Full-section sweep (Brief H gate 2)
Re-read the entire repo-specific `CLAUDE.md` section (266→394), not the named lines only. The only
transcribed-state claim beyond the struck section is `CLAUDE.md:289`'s gh-2.93.0 exit-1 note — a
correct hedge, left as-is. Everything else is durable rules/architecture.

### Decisions / Questions
Minted **#32** (premise measured, supersedes `#30`'s `:948`) and **#33** (merge-path section struck).
No new questions. Each number claimed at merge, `origin/master` re-read #31 / Q16, 0 behind. Stores
changed: `DECISIONS_LOG`, `CLAUDE`, `ROADMAP` (this block).

### Branch dispositions (terminal state)
- `gov/merge-path-strike` — **merged+deleted** local and remote via PR #23 (`0694428`).
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

### Governance threads still open (not health intelligence)
- `#184`'s grep run **repo-wide**, not scoped to one file (this session swept `CLAUDE.md`'s section;
  the whole-tree sweep for transcribed state is still owed).
- `.gitattributes` — the durable fix for the CRLF-binary trap; **health-app**, not here.
- Number-at-merge vs the PR gate: 2c forces resolution before PR-open, opening a collision window
  ff+push did not have. Worth a row when someone has both repos in view.

### Next action
**Both owed merge-path threads are now closed.** What remains here is not health intelligence —
`#184`'s repo-wide grep and health-app's `.gitattributes`. The actual priority is **product**: the
4 August panel — first steady-state androgen read since the 9 June increase to ~122.5 mg/week — is
unread in project knowledge. Reading it needs no repo, no PR, no brief; it is **chat-mode** work
(project-knowledge PDFs + `Clinical_Protocol`/`Athlete_Profile`), not a Code-CLI task. Take it there.
