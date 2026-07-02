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

### #11 — corrects and supersedes #10's justification and details  ·  active  ·  supersedes #10 (rationale only)
**Decision:** The ANCHOR self-check in `/closeout` (the intent of #10) stays. #10's recorded cause, "how you know," and path detail are corrected here; #10 remains in place per append-only.
**Corrections:**
1. FALSE CAUSE. #10 claims the ritual was "nearly run," that the repos "share the same workflow and the commands look identical in chat," and that "the near-miss happened." All false. `/closeout` existed only in health-app; here it returned "unknown command." The wrong-repo run was not a near-miss — it ran to completion in health-app as a benign no-op, noticed afterward by reading its reported commit.
2. BROKEN MECHANISM. #10's check as first written matched `\\health-connect-app$`, which false-aborts on every Windows run (git returns forward slashes). Corrected in the command file to `[/\\]health-connect-app$` (commit 1f8a952).
3. STALE PROSE. #10's body says the root "must end in `\health-connect-app`" (backslash); the working check is the slash-tolerant regex above.
**Why the check still stands:** a ritual ran in an unintended repo with nothing structural to stop it — that fact alone justifies it, not a near-miss.
**How you know:** "unknown command: /closeout" here disproves the shared-command claim; 1f8a952's diff is the mechanism fix.

### #12 — SH 7.x breakage response: tactical re-map; SDK migration not auto-triggered  ·  active
**Decision:** When a Samsung Health UI update breaks the accessibility scraper,
the standing response is a tactical re-map against the accessibility layer. The
Samsung Health Data SDK migration is the structural exit from UI-coupling but is
NOT triggered by a single breakage; it stays roadmap-LATER until a defined trigger
(e.g. Nth breakage in a rolling window, or SDK positive-control passes). The
25 June 2026 re-map embodies that choice.
**What broke (SH 7.00.0.107, One UI 7 / Android 16, verified live on SM-S921B,
25 June 2026):**
1. **Sleep detail → Jetpack Compose.** All sleep data resource-ids gone
   (`sleep_main_scroll_view`, `sleep_stages_chart`, `chart_detail_*`,
   `actual_sleep_time`, `contributor_insight_message_text`). Compose exposes no
   per-element `viewIdResourceName`; sleep values now read from `content-desc`.
2. **Home dashboard redesigned.** `me_recycler_view` / `vitality_score` /
   sleep-timing tile ids gone; energy & sleep are now content-desc cards. Home
   detection moved to `bottom_tab_navigation`; energy nav to a content-desc tap.
3. **Signal relocation, not removal.** HRV (`last_shrv` "Average: 62 ms") and
   sleep HR (`last_shr` "Average: 65 bpm") text ids are INTACT on the Vitality
   screen but render lazily on scroll (and recycle) — so the scraper now
   scroll-accumulates. Respiratory rate moved from the Sleep screen to Vitality
   (`vitality_respiratory_rate_average_title`). Skin-temp is newly available
   (`vitality_skin_chart_layout`), not yet consumed.
**Re-map:** prefer resource-id where it survives (HRV/HR/respiratory on Vitality);
fall back to content-desc string parsing where Compose left no ids (Sleep screen,
home cards). Navigation/detection/scroll re-pointed accordingly. Verified by
parsing the live captured strings — extracted values match SH's on-screen numbers
exactly (HRV 62 ms, HR 65 bpm, RR 13.9 /min; sleep 7h12m / actual 6h23m /
bed 22:12 / wake 05:57; Deep 5m, REM 1h6m, Awake 49m; score 64).
**Known gaps (surfaced, not reconstructed):** Light-sleep minutes and sleep
efficiency are not exposed on the new Compose Sleep screen and are left null —
not inferred. To resolve later (Sleep-stages expandable / factor detail tap).
**Rationale:** stops the bleed without pulling a large migration into a fire, and
prevents single-incident scope creep on the structural path. NOTE: the Compose
migration materially raises UI-coupling fragility and is the kind of event that
should COUNT toward the SDK-migration trigger — flagged, not actioned, here.
**How you know:** live uiautomator dumps from SM-S921B on 25 June 2026 (branch
`fix/scraper-sh-relayout`); parse layer validated against the captured strings
before any code was written into the scraper.
### #13 — health-connect-app master carries the canonical governance stores  ·  active
**Decision:** Governance is per-repo by default (convention locked this session;
the cross-repo statement of it is logged in health-app, not here). This repo's
master is the canonical trunk for the governance stores — CLAUDE.md,
DECISIONS_LOG, FEEDBACK, ROADMAP, OPEN_QUESTIONS, and the `/closeout` command —
which feature branches inherit. The stores were originally bootstrapped on a
feature branch and never merged, leaving master a stub (`CLAUDE.md` =
`@AGENTS.md`, no `DECISIONS_LOG`). This entry ratifies master-as-trunk and
records the one-time, file-scoped transplant. `closeout.md` is deliberately NOT
carried on the trunk — it is session-local handoff state, written per `/closeout`
on the working branch.
**Supersedes:** none.
**How you know:** pre-transplant `git show master:DECISIONS_LOG.md` failed and
master's `CLAUDE.md` was the one-line `@AGENTS.md` stub; stores were taken
file-scoped from `fix/scraper-sh-relayout` onto `chore/governance-bootstrap` and
fast-forwarded into master — a single commit touching store files only, no
feature code (verified by `git diff --stat`).

### #14 — SH scraper sleep-capture gaps resolved  ·  active  ·  supersedes #12 (open-gaps portion only)
**Decision:** The sleep-capture gaps left open by #12 — Light-sleep minutes,
full stage percentages, SpO2 average, and derived sleep efficiency — are
resolved by the SH 7.x re-map landed this session.
**Supersedes:** #12 (open-gaps portion only).

### #15 — OPEN_QUESTIONS.md added to the canonical store hierarchy  ·  active
**Decision:** OPEN_QUESTIONS.md joins this repo's canonical-store hierarchy as
the home for machine-checkable code-state defects and unresolved questions; the
CLAUDE.md stores table is updated to list it.
**Supersedes:** none.

### #16 — HCA governance parity: shared loop-rules block established; #38/#39 discharged, #40 landed  ·  active
**Decision:** HCA adopts the health-app shared loop-rules block verbatim
(BEGIN/END markers), replacing its parallel Single-writer / Canonical-stores /
Decisions-log-discipline / Session-rituals sections and retiring the stale
Session-rituals transplant. This discharges the owed #38/#39 `/closeout` mirror
(body→file sole sink, pointer-only stdout, store-emission retired) and lands
#40's Rules 2–5 (patch-id disposition, terminal-state gate as a new `/closeout`
step, number-at-merge, concern-named branches) plus a `BRANCHES.md` ledger.
Propagation of shared rules is now a verbatim copy from health-app, not a
hand-merge. Twins attribution (grounds health-app #40): the
`claude/session-lifecycle-sleep-dedup-b9k5qf` / `-yg1xx6` twins cited in
health-app #40 were this repo's autonomous session branches, pruned 2 Jul 2026
in the sleep-dedup cleanup — verifiable from HCA history, not health-app's.
Branch disposition: `chore/governance-held-writes` deleted (husk);
`chore/closeout-routing` deleted as superset-superseded (its body→file
substance is now on master; its on-branch "#17" discarded per Rule 4, never a
canon number); `fix/hrv-capture-regression` parked in `BRANCHES.md` (holds the
#8 D2 guard-proof test).
**Supersedes:** the stale in-place Session-rituals transplant;
closeout-routing's provisional "#17".
**How you know:** shared block copied byte-for-byte from health-app `83e0cb2`
l.20–136 (`diff` against source = empty); `/closeout` renumbered, emission step
absent; `git ls-remote` post-session = master + `fix/hrv-capture-regression`
only.

### #17 — Shared block re-mirrored to health-app 504e5e5; #41 local+remote gate landed  ·  active
**Decision:** HCA's shared loop-rules block re-synced verbatim to health-app
master `504e5e5`, carrying #41's terminal-state-gate extension (the gate
enumerates local branches (`git branch`) as well as `refs/remotes/origin` — a
local branch with `+` commits vs `origin/master` must be pushed, parked in
`BRANCHES.md`, or discarded before close). HCA's `/closeout` command step 4
extended lockstep. First application of the edit-in-health-app-copy-to-HCA
mechanism established by #16 — a verbatim copy, not a hand-merge. Local limbo
cleared under the new gate: `feat/deep-sleep-confidence` local deleted (empty
cherry), `fix/scraper-sh-relayout` parked (3 unpushed commits pending review).
**Supersedes:** the #16 shared-block snapshot (remotes-only gate) → now #41's
local+remote gate.
**Note:** "#17" was the provisional number `chore/closeout-routing` tried to
mint on-branch and had discarded (#16 disposition); it is now legitimately
claimed at merge — Rule 4 as intended.
**How you know:** shared block diff vs health-app `504e5e5` l.20–139 = empty;
command step 4 == shared-block bullet verbatim; #NEXT claimed #17 with HCA max
verified `### #16` at the merge instant.

### #18 — F1 writer-identity forwarding: HCA emits flat sourcePackage  ·  active
**Decision:** HCA mappers forward `metadata.dataOrigin` (`react-native-health-connect`
surfaces it as a flat package-name string, not a `{packageName}` object — verified
against a live device `[HC raw]` log, 2 Jul 2026) as the flat `sourcePackage` alias on
every record passed through `safeFetch` in `src/healthConnect.js` (sleep, HRV, heart
rate, steps, workouts). Backend's `get_source_package()` reads the alias first — no
backend change needed. Populates `health_connect_record_sources` with real writers
instead of the `'unknown'` sentinel; dedup behaviour unchanged. Implements the HCA
half of health-app #36/#37.
**Note for the F1 dedup consumer (health-app, pending):** Polar arrives via two
paths — direct AccessLink v4 (health-app #17, authoritative) and `fi.polar.polarflow`
via HC. The dedup pass must prefer direct-API. To be logged to health-app
OPEN_QUESTIONS in a separate session.
**Supersedes:** none.
**How you know:** device log confirms `record.metadata.dataOrigin` is a flat string
(not `.packageName`); code review of every mapper in `src/healthConnect.js` confirms
`sourcePackage` is forwarded on all five record types. Postgres verification (non-null
`source_package` rows in `health_connect_record_sources` post-deploy) still owed —
not verifiable from this session (no live sync run).
