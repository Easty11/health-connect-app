# DECISIONS_LOG.md — health-connect-app

Append-only. New decisions at the bottom. **Never edit or delete a past entry.**
A reversal is a *new* entry that names the entry it supersedes.

Numbering is local to this repo (independent of health-app's log).
Each entry: the decision, the reasoning, and — where it matters — **how you know**.

Status tags: `active` · `held` · `superseded-by #N`.

---

### #1 — Repo is the single source of truth; chat proposes, Code commits  ·  active
**Decision:** All volatile project state lives in this repo, not in Claude.ai
project knowledge or chat memory. Only Claude Code and the `@claude` Action
write canonical state. Chat proposes content; the commit is the only sync point.
**Why:** Drift between a repo copy and a project-knowledge copy is the failure
mode this loop exists to kill. One writer, one truth.

### #2 — Samsung Health accessibility scraper is the permanent HRV path  ·  active
**Decision:** Samsung Ring HRV is acquired via the on-device accessibility
scraper, not Health Connect. Health Connect is the bridge for non-Samsung
sources only.
**How you know:** Samsung Ring HRV does not surface through Health Connect —
confirmed on-device. The scraper is architecture, not a stopgap.

### #3 — Deep-sleep confidence flagger (`deepSleepConfidence.js`)  ·  active
**Decision:** A confidence-scored deep-sleep flagger sits alongside
`healthConnect.js`, scoring whether a night's deep-sleep reading is trustworthy
rather than passing raw stage data straight through.
**Why:** Stage data quality varies by source and night; a confidence layer lets
downstream consumers gate on trust instead of assuming all readings are equal.

### #4 — `runDeepConfidence` held back from readiness / Banister wiring  ·  held
**Decision:** `runDeepConfidence` is deliberately NOT wired into readiness or
Banister modelling yet. It runs and can be inspected, but does not feed the
model.
**Why:** Thresholds need a manual review pass via the gate button against real
nights before its output is allowed to move a score. Infer → surface → confirm.
**Unblocks when:** threshold review complete.

### #5 — 31 Health Connect rows backfilled  ·  active
**Decision:** 31 historical Health Connect rows were backfilled and verified
into the event spine.
**Open caveat:** a one-day date-attribution mismatch between Health Connect and
the scraper is suspected to have misfiled some of these (see ROADMAP Q4). Root
cause unconfirmed — entry stands, correction tracked separately.

### #6 — Fork #1 RESOLVED: tiered dual-source HRV with context firewall  ·  active
**Supersedes:** the prior "Fork #1 parked" state (Polar SDK scope undecided).
**Decision:** HRV capture is not either/or. Two source tiers, plus a hard
context firewall:

- **Scraper (Samsung Ring) = passive baseline floor.** Lower-quality signal,
  zero friction, runs nightly. The default.
- **Polar H10 = deliberate high-quality override.** Better signal, captured at
  the cost of friction, used when a clean read is wanted.

Both are legal sources, discriminated downstream by the `source` tag — this is
device-agnosticism working as designed, not a violation of it.

**Context firewall (load-bearing):** every capture is stamped with a context:
`passive_overnight | calibration | session`.
- `passive_overnight`, `calibration` → readiness-eligible (resting HRV).
- `session` → **NOT readiness-eligible.** Session R-R under vagal withdrawal is
  a category error as a readiness input. It is captured for recovery-kinetics
  value only and the contract marks it non-eligible at the source.

**How you know:** session RMSSD ≠ readiness HRV is established
(vagal withdrawal during exercise). The guard cannot live in backend good
intentions; it lives in the context tag stamped by the app at capture time.
**Consequence:** `src/contract/` carries `source` + `context`, and is the
component that makes multi-source / multi-context capture safe.

### #7 — Concern-split commit convention  ·  active
**Decision:** The uncommitted payload lands as concern-scoped commits, split by
feature concern across branches (deep-sleep → PR #1 on `feat/deep-sleep-confidence`;
HRV → `feat/hrv-capture`). Files that mix concerns are split at hunk level
(`git add -p`), never whole-file. Strays from other workstreams are excluded.
**Why:** Concern-scoped history keeps PR #1 reviewable and prevents concern-bleed
(the "each branch builds, no bleed" gate). Whole-file staging of mixed files drags
unrelated changes across the branch boundary.

### #8 — `src/contract/` is shared capture infrastructure  ·  active  ·  clarifies #6
**Decision:** `src/contract/` (generated enum + `gen:contract` in `scripts/`) is
shared, consumed by BOTH the deep-sleep sync path and the HRV firewall. It commits
on PR #1 only because that branch merges first and `feat/hrv-capture` forks after,
inheriting it — NOT because it belongs to deep-sleep.
**How you know:** import-graph check D1/D2. **D2 must be true** — the HRV path must
actually import the source/context enum, or the #6 firewall is unbacked. If D2 is
false: STOP; wire it before HRV lands.
**Consequence:** contract is a shared dependency; future edits ripple to both.

### #9 — Stray-artifact policy  ·  active
**Decision:** `push_to_hevy.py`, `hevy_routine.json` (Hevy strength workstream) and
`checkin_build_brief.md` (planning doc) are not tracked here. Gitignore or relocate;
never stage into a feature commit.
**Why:** they belong to other workstreams; tracking them pollutes companion-app
history and the concern-split.

### #10 — ANCHOR self-check baked into /closeout  ·  active
**Decision:** `/closeout` opens with a hard repo-root check:
`git rev-parse --show-toplevel` must end in `\health-connect-app`. If it does not,
the command aborts unconditionally before writing anything.
**Why:** On 2026-06-22 the ritual was nearly run in the wrong repo (health-app
instead of health-connect-app) — the repos share the same workflow and the commands
look identical in chat. A wrong-repo close-out would have overwritten health-app's
`closeout.md` and regenerated its ROADMAP sprint block with stale health-connect-app
state.
**How you know:** the near-miss happened; this entry is the logged prevention.
**Consequence:** the ANCHOR is the first executable line of `.claude/commands/closeout.md`
and cannot be skipped or deferred.
