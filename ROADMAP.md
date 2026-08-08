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
**Closed:** 2026-08-08 (governance: guard propagation → CI surface → block re-mirror → gate closed)
**Span:** 2026-08-04 → 2026-08-08 per the repo's own dated record — 5 / 1 / 5 / 15 commits
across 08-04, 08-05, 08-07, 08-08. Taken from `git log`, not asserted: an earlier draft of
this block stamped a single date from memory and the log contradicted it.

### This session — landed on master (`5bfefa4`, 26 commits from `36a8444`)
Governance, `.githooks/`, `scripts/`, `.github/` only. No `app/`, no `src/`, no scraper
source, no build config. Four arcs, each landed and rowed before the next began.

**A · Placeholder guard propagated (`#22`, `#23`)** — `.githooks/pre-push` and
`scripts/check_governance_placeholders.py` copied byte-for-byte from health-app; shared
block 155 → 215 lines. `#23` then caught the copy landing **mode 100644**: the blob was
byte-exact, the mode was not, and a POSIX clone silently skips a non-executable hook.
`diff` checks content; executability is mode.

**B · CI guard (`#24`), and the defect it caused (`#25`)** — `#170`'s
`governance-guard.yml` propagated: 2a hook mode, 2b hook executed as git executes it, 2c
guard against the ref that would land. Executable body byte-identical; **header adapted at
four sites** where health-app's asserts evidence about its own repo, including that branch
protection is set — false here at the time. Four real Actions runs, three of them red
controls. `#25` then repaired a **bare CR** in `#24`'s own prose: git reads a CR with no LF
as a binary marker, so `core.autocrlf` skipped normalisation and stored all 650 lines of
`DECISIONS_LOG.md` as CRLF. A three-line edit diffed as 1217.

**C · Shared block re-mirrored (`#26`), `land` made repo-local (`#27`)** — G1 breached the
*other* way: health-app amended the block five times on 2026-08-05 with no return trip,
leaving it ahead 259/215. Re-mirrored whole; exactly four HCA-only lines deleted, all
deliberately replaced upstream; diff 48/4. `land` set `--local` to
`!gh pr merge --merge --delete-branch`, because the old `--global --ff-only` body is a
direct-push motion the coming ruleset would refuse — **the alias had to change before the
ruleset, and nothing recorded that they were ordered.**

**D · The gate closed (`#28`)** — the operator created ruleset `master-pr-gated`
(`20573455`) on 2026-08-08. `Q12` closes on **three verified layers**, not on the ruleset
alone, with a table naming what each layer does *not* cover. First non-control land under
the gate, and `#27`'s ordering paid off in the same motion.

### The through-line worth carrying
Five of this session's seven entries are the same defect: **a statement true at one instant,
carried forward as a fact about now.** `Q12`'s misattributed agent, `#24`'s inherited
header, `#25`'s encoding, G1's "still discharged", and a close-out header stamped from
memory. `#26` writes down the general form: record *"discharged at `<md5>`"*, never
*"discharged."*

### Controls — a green suite with no red control proves nothing
| Control | Run / evidence | Result |
|---|---|---|
| clean branch (negative) | `31172574034` | green, all three arms |
| placeholder arm | `31172614745` | **red at 2c**, both offences named |
| mode arm | `31172624557` | **red at 2a**, `tracked mode: 100644` |
| execution arm (2a stripped) | `31172640907` | **red at 2b**, `Permission denied`, exit 126 |
| hook layer, real content | `git push origin gov/close-q12:master` | **refused** at `DECISIONS_LOG.md:823`, **zero transfer lines** — nothing left the machine |
| ruleset layer, real content | same push, tree clean | **`GH013`**, citing the PR requirement *and* the required context by exact string |
| permitted path | PR #16, check pass 6s, `31247187182` | merged `5bfefa4`; push arm `31247235083` green |

### G1 — breached 2026-08-05, re-discharged 2026-08-08 (`fffd314`)
**"Still discharged" was the defect, not a summary of one.** A parity discharge recorded as
a standing state rather than a measurement with a date and a hash cannot be contradicted,
because no surface holds the fingerprint the claim was taken at.

| | lines | bytes (LF) | md5 (LF) |
|---|---|---|---|
| discharged at `#21` (2026-07-20) | 155 | 10232 | `4243c91ce78e0331ddfa5178aa3006b8` |
| HCA before re-mirror (breached) | 215 | 15132 | `592d95c82b48361c73ad3b65677de529` |
| health-app at `73d5cb8` | 259 | 18717 | `552728ade81e90edcbc8f12bbbc02a80` |
| **HCA after re-mirror** | **259** | **18717** | **`552728ade81e90edcbc8f12bbbc02a80`** |

Both blocks independently extracted, each asserted non-empty and >=100 lines before `cmp`
was allowed to mean anything; `cmp` silent, `diff` empty.

### Enforcement — three layers, two still without a diff
| Layer | State | Does not cover |
|---|---|---|
| `.githooks/pre-push` via `core.hooksPath` | set in this clone | unconfigured clones, runners, the merge button |
| `.github/workflows/governance-guard.yml` | in tree since `#24`, both arms | prevents nothing on its own |
| ruleset `master-pr-gated` (`20573455`) | active, `bypass_actors: []`, strict | itself — deletion or one bypass actor is silent and leaves runs green |

Live checks: `gh api repos/Easty11/health-connect-app/rules/branches/master` non-empty, and
`git config --get core.hooksPath` returning `.githooks`.

### Branch dispositions (terminal state)
- `gov/placeholder-guard-hca` (`78f460e`), `gov/hook-exec-bit` (`b7e3bf5`),
  `ci/placeholder-guard-hca` (`6483d19`), `gov/decisions-log-crlf-repair` (`e3324ba`),
  `gov/block-remirror` (`3bd196d`) — all **merged+deleted**, all rowed `DONE`.
- `gov/close-q12` — **merged+deleted** via PR #16 (`5bfefa4`). Terminal, so no row required;
  see `Q6`, which asks whether DONE rows are retained and is still UNSTARTED — this is one
  more instance behind that question.
- `scratch/gov-control-{placeholder,mode,exec}` and `control/ruleset-merge-gate` — now
  **rowed** despite being terminal, because a control branch's value is the evidence it
  produced and a deleted branch with no row leaves run IDs pointing at refs nobody can
  account for.
- `feat/hrv-node-dump` BLOCKED · `fix/hrv-capture-regression` UNSTARTED — rowed, neither
  touched this session. PR #2 (June) still open against the latter.

### Decisions
**#22 – #28** minted (max was #21 at session open). Every number claimed at merge with
`origin/master`'s max re-read at that instant and quoted in the entry. **Q12, Q13, Q14**
minted; **Q8**, **Q11** closed → `#26`; **Q12** closed → `#28`.

### Open (carried forward)
- **Q13 · OPEN** — the imported question-state axis is not the axis this store uses; 11
  pre-existing rows still carry `UNSTARTED`/`BLOCKED`, which the new axis lacks. The mapping
  is lossy, so it is a judgement, not a reformat.
- **Q14 · OPEN** — the shared block is the **last surviving site of `parked`** in either
  repo. Mirror of health-app `Q33`; needs its own brief, mirror-first, G1 re-fingerprint.
- **Q4** BLOCKED — day-lag / read-freshness. Still the only BLOCKED row in the repo.
- **Q7** OWED — `#18`'s flat-`sourcePackage` unfulfilled in `aggregateSteps`.
- **Q6** UNSTARTED — retain DONE rows or drop them. Now load-bearing: this session added
  five DONE rows and left one branch unrowed on the gate's own permission.
- **Q9 item 1** — `ROADMAP.md`'s work queue above still carries `RESOLVED` / `parked` /
  `Blocked on`. Inert debt, not a generator.
- **Q10** UNSTARTED — the ritual's own ANCHOR states required state in the declarative.

### Owed to health-app (not actionable from here)
- **Brief D** — `check_governance_placeholders.py`'s exit contract, and the docstring's two
  cross-repo claims. Halted correctly: wrong root. Carry into it that D's step 2 rationale is
  already falsified — the docstring-stripped bodies are **not** identical (`8477d608…` vs
  `174277e7…`, both 78 lines), differing by one advisory string in `main()`.
- The shared block's `parked` — paired with `Q33`, mirror-first.
- FEEDBACK §14's next occurrence: a brief gave health-app's block as `259 / 18757` where the
  tree gives `259 / 18717`.
- health-app's repo-specific section still says HCA has "no `.github/workflows` directory at
  all" — true when written, false since `6483d19`; and its docstring says HCA has "the hook
  only — no workflow, no ruleset", now false twice over.
- **Cleared, no return trip owed:** §14 occurrence 5's "80" was verified correct from here —
  `08cc0b4` is 80 lines / 5205 B, matching `#21`'s record byte-for-byte.

### Next action
**Governance is at a stopping point** — all three enforcement layers live, no `#NEXT` on
master, no branch in limbo. The next action is product, not governance: watch ONE real
overnight/~5am sync land today's HRV value in Railway (Postgres query, not on-device UI) on
the standalone release build — resolves **Q4** and unblocks `feat/hrv-node-dump`.

Still owed: rotate the Hevy API key (exposed in a chat transcript 2026-07-11).
