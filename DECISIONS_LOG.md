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
