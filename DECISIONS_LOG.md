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

### #19 — Energy-score reads select first VALID-BOUNDS node, not `.firstOrNull()` (phantom-duplicate fix)  ·  active  ·  supersedes #12 (value-read portion only)
**Lineage — logged ≠ landed.** This decision was first written 26 Jun 2026 as
`#16` on branch `fix/scraper-sh-relayout` (commit `aab35c4`) and **never landed** —
`git cherry origin/master fix/scraper-sh-relayout` shows its patch-id absent upstream.
Master independently spent #16–#18 in the interim, so the fix is renumbered **#19**
at merge (number-at-merge rule). The code sat correct-but-unmerged for a fortnight
while master kept shipping the phantom read; that gap is the record, not a footnote.
**Decision:** The three Energy-score value reads select the first matching node
with **positive width** (`right > left`), via a new `findByIdValidBounds` helper,
instead of `findById(...).firstOrNull()`. Applies to all three: `last_shrv` (HRV),
`last_shr` (sleep HR), and `vitality_respiratory_rate_average_title` (RR) — a
half-landing that fixed only HRV would leave HR/RR reading phantoms.
**What was wrong:** Samsung Health's Vitality screen renders the factor subtree
**twice** per read — a real on-screen copy and a phantom duplicate left by Compose
view recycling, bearing the *prior* render's value with a degenerate rectangle whose
`right` lands left of `left` (negative width). The phantom sorts first, so
`.firstOrNull()` returned it: the scraper emitted/POSTed the stale copy.
**Discriminator — width, NOT height or importance:** height is unusable (the walk
reads the first Energy-score frame unscrolled, so the real card is below-fold —
`bottom` clamps to screen, `top` past it, giving non-positive height that is NOT
degeneracy); importance is unusable (the RR phantom is `imp=true`). Positive width
(`right > left`) is the sole reliable test.
**Scope:** read-selection only. Parser, navigation, screen detection, scroll, the
Compose Sleep reads, and the POST path are untouched. Three call sites converted.
**Boundary — does NOT fix read-freshness / day-lag.** #19 fixes phantom *selection*.
It does not address the morning day-lag question (whether an earlier `117` was
"yesterday's" value): today's capture proves the valid-bounds node reads on-screen
truth *at capture time*, but the morning-freshness path is verified only by watching
one real morning sync land today's value in Railway post-land. **Day-lag stays OPEN**
— closeout must not mark it resolved on the strength of this entry.
**How you know:** original branch evidence — in-service tree dump (round-3/4 logcat,
`hrv_quarantine/FINDINGS_FINAL.md`) enumerated 2 matches per id with bounds; post-fix
live walk on SM-S921B (26 Jun 2026) read HRV 42 / HR 72 / RR 14.7, each log line
confirming the chosen node had `right>left`. **Re-confirmed 11 Jul 2026** on
`feat/hrv-node-dump`: a read-only node-tree capture (`nodedump.txt`) shows, in one
`WAITING_FOR_ENERGY_SCORE` frame, `last_shrv` phantom `'Average: 106 ms'` at
`Rect(0,4659 - -84,2340)` (width −84) sorting before the real `'Average: 97 ms'` at
`Rect(84,4659 - 996,2340)` (width 912); on-screen value was 97. uiautomator alone
cannot see the phantom (it filters `importantForAccessibility=false`); the service
reads it via `FLAG_INCLUDE_NOT_IMPORTANT_VIEWS`. Backend rows from prior stale POSTs
are not reconciled here (separate concern).

### #20 — Four-state vocabulary adopted; `HANDOFF.md` established in this repo  ·  active
**Decision:** The shared loop-rules block is re-mirrored from health-app `9fa18cc`,
carrying #91's four-state vocabulary (DONE / BLOCKED / OWED / UNSTARTED) as the single
vocabulary for `BRANCHES.md`, `OPEN_QUESTIONS.md`, `ROADMAP.md` and close-outs.
`PENDING`, `parked` and `retired` are struck. `HANDOFF.md` is established here, closing
the interruption-ledger asymmetry #88 left when it scoped that file to health-app only.
The block is additionally amended here with a barrier-vs-trigger tie-break: where the
evidence does not settle whether a dependency is a barrier or a trigger, the row is
UNSTARTED, because a false BLOCKED tells a future reader not to try while a false
UNSTARTED only means someone picks the work up and discovers the dependency.

**G1 knowingly breached.** This session leaves G1 (shared block byte-identical across
repos) breached by our own hand: HCA carries 155/10232/`4243c91ce78e0331ddfa5178aa3006b8`,
health-app `9fa18cc` carries 153/10080/`9436cb223c4b601252152ab4fa6a3547`. The delta is
the barrier/trigger tie-break, added here because this session could not reach health-app
under the single-repo rule. Discharged by re-mirroring HCA→health-app, precedent #17.
Until then **this repo is authoritative for the block.** Recorded here and not only in
`OPEN_QUESTIONS` Q8 because that store is mutable and this one is append-only — the
record must survive Q8 being swept, closed, or renumbered.

**Standing rule for the shared block, either side:** Edit it only from a session that can
reach both repos, or land the edit and its mirror as a paired obligation recorded in an
append-only store before the session closes. An edit made where the mirror is unreachable
guarantees divergence for as long as the return trip is outstanding.

**Why:** A vocabulary holding in one repo and not the other is two dialects wearing one
name — the exact drift #1 exists to kill. `PENDING` was this repo reaching for a state
its sanctioned set could not express. And propagation is not adoption: #16 established
the shared block here and #17 re-mirrored it back, yet this repo's own stores kept labels
the block never sanctioned for two further sessions.

**How you know:**
- Shared block, index content (`git ls-files --eol CLAUDE.md` → `i/lf`, so the gate is on
  LF bytes, not the CRLF worktree): fetched health-app `9fa18cc` block measured
  153 lines / 10080 bytes / md5 `9436cb223c4b601252152ab4fa6a3547`, identical to the
  staged HCA block after splice (`cmp` clean, commit `c6daa92`). Post-amendment
  (`4fa44e6`): 155 / 10232 / `4243c91ce78e0331ddfa5178aa3006b8`, `diff` against source
  showing the two added lines and nothing else.
- Branch enumeration, local **and** remote, run before relabelling rather than trusting
  the existing row set: locals `feat/hrv-node-dump`, `fix/hrv-capture-regression`,
  `gov/branches-vocabulary`, `master`; remotes add
  `claude/hevy-api-workout-query-teulc2`. That last carried no row — the omission
  health-app Q25 records — and now has one. `feat/hrv-node-dump` was local-disk-only and
  was pushed to origin before being rowed.
- Out-of-vocabulary label sweep across both swept stores returns zero:
  `grep -nEi '\b(PENDING|parked|retired|verifying|resolved|open)\b' BRANCHES.md OPEN_QUESTIONS.md`
  → no matches. Status **fields** (not word occurrences) tally 2 BLOCKED / 3 DONE /
  4 OWED / 4 UNSTARTED = 13, reconciling against a population of 5 branch rows + 8
  question rows.
- Q5 was ruled UNSTARTED against the brief's instruction to mark it BLOCKED: its row
  names no blocker in its own content, and the overnight sync is a trigger for when
  reconciliation becomes worth doing, not a barrier to settling the policy.

**Do not revisit unless:** a fifth state is genuinely needed — in which case it is added
to the shared block from a both-repos-reachable session and propagated, never minted in
one repo's store.

### #21 — `/closeout` ritual swept to the four states; the last self-regenerating surface closed  ·  active
**Decision:** `.claude/commands/closeout.md` no longer instructs the superseded
`purpose / why-parked / unblocks-on` column set; it references `CLAUDE.md`'s
State-vocabulary section instead, without restating the states — one definition, one
location. A second form the brief did not anticipate was struck with it: `parked` used as
a *status verb* ("must be pushed, parked in `BRANCHES.md`"), at lines 72 and 74, replaced
with `rowed` — which names the mechanical act without asserting a state, so the ritual can
no longer suggest a label.

The `PENDING` handoff-queue section is **deliberately unchanged**. `PENDING` flags a
transient chat→Code payload — a different object from a branch or question status — and
remains canonical in the stores table. Verified byte-identical across the edit (313 bytes
both sides, non-empty asserted before the comparison was allowed to mean anything).

**The 77-vs-132 divergence is ruled INTENTIONAL as to structure, and NOT ALIGNED as to
vocabulary.** Structure: the two rituals legitimately differ because the repos differ —
health-app's carries a "Recent landings" `CLAUDE.md` block (its step 6) and the #38/#39
copy-back retirement (step 9); HCA's carries the ANCHOR wrong-repo self-check earned by
#10/#11 and the write-a-Python-script DB-query rule earned by this repo's environment.
`CLAUDE.md` permits repo-specific content below the shared block, and none of that content
is vocabulary. Vocabulary: **not aligned** — health-app's
`.claude/commands/closeout.md:34` still reads "must be pushed, **parked** in
`BRANCHES.md`". The #21 brief asserted health-app's ritual was "already struck"; that is
false for this line. Logged as Q11, paired obligation, mirror-first in the next health-app
session; **HCA is authoritative for the ritual's vocabulary in the interim.**

**Why:** #20 swept the stores; the ritual that writes them kept the old dialect, so every
close-out would have re-emitted it. Inert debt is merely carried — a ritual *regenerates*.
This was the only remaining surface of the second kind, which is why it was worth its own
brief. It also refines #91's finding: **over-application is a failure mode alongside
under-application.** Sweeping `PENDING` would have destroyed a live distinction while
claiming to enforce consistency; so would sweeping health-app's line-68 "retired", which
describes a convention being retired, not a branch status. Consistency is enforced on the
*object* the rule governs, never on the *word*.

**How you know:**
- The struck lines, by number, in this repo's copy at 132 lines / 5067 bytes:
  `67` (`purpose / why-parked / unblocks-on` — hyphenated, which is why a `why parked`
  search missed it), `72` and `74` (`parked` as status verb). Post-edit residual grep for
  `why[- ]parked|\bparked\b|unblocks-on|\bretired\b|\bverifying\b`: **zero**.
- `git diff` confined to exactly those three sites (three hunks, `@@ -67 +67,3`,
  `@@ -72 +74`, `@@ -74 +76`); zero changes inside the `PENDING` section (lines 55–61
  byte-identical, both extractions asserted non-empty first); the output template's
  `## PENDING reconciliation` shifted 98→100 by the two inserted lines, content unchanged.
- Shared block untouched by this session and still at 155 lines / 10232 bytes / md5
  `4243c91ce78e0331ddfa5178aa3006b8` — G1 not re-breached.
- health-app's ritual read from `raw.githubusercontent.com` at 80 lines / 5205 bytes
  (the brief said 77 — a third count discrepancy of the same family), non-empty asserted
  before any comparison; `parked` located at its line 34.

**Do not revisit unless:** a further generator of governed text is found — the test is
whether a surface *re-emits* the vocabulary on each run or merely *stores* it. Generators
are swept before stores; a store fixed under a stale generator is fixed only until the
next run.

### #22 — Placeholder guard propagated to HCA; verbatim propagation gains a verify-first precondition  ·  active

**Decision:** three things land together, and the third is the one that outlives the
other two.

1. **The guard is copied, not ported.** `.githooks/pre-push` and
   `scripts/check_governance_placeholders.py` are byte-for-byte copies of health-app at
   `44a4d28` (post-Part-A). Installed per clone with `git config core.hooksPath .githooks`.
   The script is Python and this is a JS/Expo repo — **that cost is real and is being
   stated, not buried**: HCA now carries a Python dev-tooling dependency it did not have.
   It is accepted because a Node port means two implementations of one rule drifting
   apart, which is the exact failure the shared block exists to prevent, rebuilt inside
   the mechanism meant to prevent it. Same machine, same operator, health-app already
   pays the toolchain. Revisit only if HCA is cloned somewhere without Python, and the
   honest fix then is **one** implementation both repos can run — never two.

2. **The shared block is replaced verbatim**, 155 → 215 lines, inside the existing
   `BEGIN/END SHARED LOOP RULES` markers. Not hand-merged, not improved in transit
   (#16/#17). The guard's file list was **verified, not assumed**: HCA has both
   `DECISIONS_LOG.md` and `OPEN_QUESTIONS.md`, so the copied `CHECKS` needs no scoping,
   and the script's `read()` exits **2** on a missing file rather than skipping it — a
   check that cannot run is not a check that passed.

3. **`#16`/`#17` acquire a precondition.** Copy-not-hand-merge kills drift and silently
   assumes the source is the better copy. On 2026-08-04 it was not: HCA's wording of the
   session-open rule was *generic and correct* — "matching the file's actual `###` heading
   format" — where health-app's was pinned to health-app's own grammar and returned **0**
   against HCA's file. A verbatim copy in the direction the rule mandates would have
   **replaced correct wording with the defect, at full fidelity.** The clause now in the
   block's preamble: *verify the source's rule against the destination's actual shape
   before any copy; if the source is wrong, fix it at the source and copy after — never
   fix it in the copy, never hand-merge.* Its first application was its own propagation.

**What the guard actually fixes here, and it is not what the v1 brief claimed.** v1 said
the guard anchors on `^### [0-9]+`. It does not — it matches the literal placeholder token
and computes no max. Three real defects, all cross-repo grammar assumptions:

- **The session-open sweep counted zero in HCA.** `^### [0-9]+` sat in the *session-open
  ritual* bullet, not the guard. HCA heads a decision `### #21 — …`; the sigil defeats the
  pattern. A canon-establishing sweep reporting an empty file as fact. Now `^### #?[0-9]+`.
- **The guard's question arm could never fire in HCA.** `CHECKS` pinned `^## Q#NEXT`;
  health-app heads a question `## Q77.`, HCA heads it `### Q8 — …`. The decision arm was
  already safe in both repos, so **exactly one of two arms was broken** — the shape most
  likely to survive review. Now `^#{2,3} #NEXT` / `^#{2,3} Q#NEXT`: level tolerated, form
  still pinned.
- **The sweep had no question arm at all.** Not a wrong regex — a silence. Anyone
  reporting a Q-max filled the gap *by analogy to the arm that was there*, reaching for a
  health-app-shaped `^## Q`, which counts 0 in HCA. **A missing arm beside a present
  sibling is not neutral; it is a template, and the next reader completes it wrongly.**

**Why:** number-at-merge was enforced by nothing on this side. HCA has never actually
suffered the failure — `git log -S'#NEXT' -- DECISIONS_LOG.md OPEN_QUESTIONS.md` returns
exactly one commit (`46597cb`), and it is prose inside `#17`'s entry, which the guard
correctly does not flag. That makes this prophylactic, and it is worth saying plainly:
health-app earned this guard with a permanent hole at its `#162`; HCA is inheriting the
lesson without having paid for it. Two repos with the same rule and one enforcement is
how the next hole gets dug on the unguarded side.

**How you know:**
- `diff` of `.githooks/pre-push` and `scripts/check_governance_placeholders.py` against
  health-app `44a4d28`: **both empty**.
- `diff` of the two shared blocks post-copy (HCA `CLAUDE.md:8-222` vs health-app
  `CLAUDE.md:20-234`): **empty**. All three `#169` regions present and located: preamble
  clause at `17`, guard bullet at `112`, session-open sweep at `133`.
- **Defect 1 regression control — real, not synthetic, supplied by HCA's own tree:**
  `grep -cE '^### [0-9]+' DECISIONS_LOG.md` → **0**; `grep -cE '^### #?[0-9]+'` → **21**.
  The old rule reported this repo's canonical store as empty.
- **Defect 3 regression control, likewise real:** `^## Q[0-9]+` → **0**;
  `^#{2,3} Q[0-9]+` → **11**.
- **Defect 2 regression control:** against the control commit, `^## Q#NEXT` → **0**,
  `^#{2,3} Q#NEXT` → **1**. The question arm was dead in this repo and is now live.
- **Positive control is SYNTHETIC and the entry says so.** No placeholder has ever reached
  HCA master, so no real case exists to replay. Constructed on a throwaway branch
  (`scratch/guard-control`, `2a3426d`, deleted) carrying both arms in HCA's own grammars —
  `### #NEXT` and `### Q#NEXT`. Pushed to a local bare remote as `master`: **REFUSED**,
  exit 1, with *both* offences named by file and line. A guard verified only against a
  constructed case is weaker evidence and this entry must not read as though it were not.
- **The hook fires — proven by the refusal, not by the passes.** A clean push is
  indistinguishable from an uninstalled hook; that is a false green by a quieter route,
  so the refusal is the load-bearing observation.
- Negative controls, all **exit 0 / ALLOWED**: clean working tree; `--ref master`; clean
  `master` → remote `master`; the placeholder-carrying ref pushed to a *branch*; zero-sha
  branch deletion.

**What arrived with the block that the brief did not name — read this before assuming the
copy was inert.** The block was 60 lines behind, not 3 regions behind, and verbatim copy
brought all of it:
- **A question-state axis** (`OPEN` / `OWED` / `DONE → #N`, under the sole label
  `**State:**`) that displaces the four work-states for `OPEN_QUESTIONS.md`. HCA's
  `OPEN_QUESTIONS.md` preamble and all 11 existing rows still use the four-state
  vocabulary, including `UNSTARTED`, which the new axis does not have. **This copy created
  that divergence.** Logged as its own question below rather than swept here — reformatting
  the store is outside this brief's fence, and #20/#21 established vocabulary sweeps are
  their own concern.
- **The never-render-a-secret rule** (health-app `#111`), which was absent from HCA's block
  entirely. It binds here now.
- The `git config core.hooksPath .githooks` install line beside the `stale`/`land` aliases.

**One inaccuracy carried across deliberately.** The guard script's docstring says "the
alias calls the same script". The installed global `land` alias does **not** — it is
`checkout && merge --ff-only && push && branch -d && push --delete`, with no call to the
guard. The hook is the sole enforcement, and it does cover `land` because `land` pushes.
The claim was not corrected because correcting it here would be fixing the copy in transit,
which #16/#17 forbid and clause 3 above re-forbids. It belongs in a health-app-rooted
session.

**Number claimed at merge.** `origin/master`'s maxima were re-read at the instant of the fast-forward and are quoted here rather than carried from the brief: `git show origin/master:DECISIONS_LOG.md | grep -oE '^### #?[0-9]+'` gives max **`### #21`**; the same sweep over `OPEN_QUESTIONS.md` with `^#{2,3} Q[0-9]+` gives max **`### Q11`**. This branch therefore takes **#22**, **Q12** and **Q13**. The brief's last-verified figures (21 / Q11, 3 Aug) happened to still hold; they were re-read, not assumed.

**Q resolution order at the ff:** two `Q#NEXT` tokens are introduced by this branch. They
resolve **in file order, top to bottom, to the next two integers ascending** — the CI-gap
row first, the question-state-axis row second. Stated here so the resolver is not guessing
against a store whose tail happens to run descending.

**Do not revisit unless:** a third repo joins the project, or a surface pushes to master
without running the hook. The first makes "one implementation both repos can run" a real
question rather than a hypothetical; the second is already tracked below and is the known,
named limit of this work — `core.hooksPath` is per-clone and client-side and cannot bind a
runner, so the `@claude` Action's pushes stay unguarded in HCA exactly as in health-app.

### #23 — The propagated hook landed non-executable; mode is part of the copy  ·  active  ·  rider to #22

**Decision:** `.githooks/pre-push` is tracked **100755**, not 100644. Set with
`git update-index --chmod=+x`, because `core.filemode=false` on this Windows clone means
git will not notice the bit either way and `cp` does not carry it.

**Why it is a defect and not a tidy-up.** `#22` verified the copy with `diff` and got
empty, which is true and insufficient: `diff` compares **content**, and a git hook's
executability is **mode**. Both repos' blobs are the same object —
`8cd10013aa69f4170856c01a7f20b0f265f42039` — while health-app tracked it `100755` and HCA
tracked it `100644`. On a POSIX clone git checks the executable bit and **silently skips a
hook that lacks it**: no error, no output, push succeeds. That is a guard that is
installed, green and blind — the exact failure `#169`/`#22` exist to kill, reproduced
inside the propagation of the fix, one layer below where anyone was looking.

**It did not fire as a false green here**, which is why it survived `#22`'s controls:
Git for Windows treats a file with a shebang as executable regardless of mode, so every
control in `#22` — including the synthetic both-arms refusal — ran a hook that a Linux
clone would have ignored. **A control passing on the only platform that cannot detect the
defect is not evidence about the platforms that can.**

**How you know:**
- `git ls-files -s .githooks/pre-push`: health-app `100755`, HCA `100644` pre-fix, HCA
  `100755` post-fix; blob SHA identical across all three, so the content copy was and
  remains byte-exact.
- `git config core.filemode` → `false` in both clones, which is why neither `git status`
  nor `git diff` would ever have raised it.
- **Scope of the POSIX claim, stated narrowly per the empirical-specificity rule:** the
  mode difference is directly observed; git's skip-if-not-executable behaviour on POSIX is
  documented behaviour and was **not** exercised here — no Linux clone was tested. What is
  attested is the mode, not the skip.

**The generalisation, which is the reason this is a numbered entry and not a chore
commit:** `#22` clause 3 made *verify the source against the destination's shape* a
precondition of verbatim propagation. This adds the dimension that clause did not name —
**verbatim means every attribute git tracks, not merely the bytes.** A copy checked only
by `diff` is checked on one axis. For anything git executes, check `ls-files -s` too.

**Number claimed at merge:** `origin/master`'s max re-read at the fast-forward instant with `^### #?[0-9]+` gives **`### #22`**; this entry takes **#23**.

**Do not revisit unless:** another executable is propagated between repos, in which case
the mode check is part of the copy and not a follow-up to it.

### #24 — `#170`'s CI guard propagated to HCA; the copy's header is repo-specific evidence and cannot be verbatim  ·  active

**Decision:** `.github/workflows/governance-guard.yml` runs the placeholder guard on
`ubuntu-latest`, on `pull_request` targeting master and `push` to master, asserting in order
**(2a)** `.githooks/pre-push` tracked mode `100755`, **(2b)** the hook *executed* as git
executes it against a known-clean ref, **(2c)** the guard against the ref that would land.
Propagated from health-app `#170` — **not authored here**, per the `#169` preamble clause;
parallel authorship would mint the second implementation that clause exists to prevent.
This is HCA's first `.github` directory.

**The executable body is byte-identical. The header is not, and that is the finding.**
Everything from `name: governance-guard` down is a verbatim copy — `diff` against
health-app's copy is **empty**, verified before commit. The header is not, because
health-app's header states **evidence about its own repo**, and four of its claims are false
here:

| health-app's claim | HCA's verified fact |
|---|---|
| "this repo's history has five of them: `e62f89f`, `0aa0200`, `f4b538f`, `cb1b58f`, `9f9437c`" | **one**: `a7cc309`, `Merge pull request #4 from Easty11/chore/governance-held-writes`. Those five SHAs do not exist here. |
| "`Q79` originally attributed this gap to the `@claude` Action" | it was `Q12` here, corrected `18841b7` |
| "branch protection … **IS** set as of 2026-08-05: ruleset `master-pr-gated` (id `20414758`)" | `gh api repos/Easty11/health-connect-app/rules/branches/master` → **`[]`**. No ruleset. |
| `gh api repos/Easty11/health-app/rules/…` | wrong repo path |

The third is the one that matters. **A verbatim copy would have told every future reader
that branch protection is in place here when it is not** — a green check sitting on top of a
false claim of enforcement, which is the exact defect class `#167` → `#169` → `#22` → `#23`
→ `#170` have been chasing, arriving this time inside the propagation of the fix. Adapting
it is **not** improving the copy in transit (`#16`/`#17`); it is `#22` clause 3 applied —
*verify the source against the destination's actual shape before copying, or replicate the
defect at full fidelity.* **The rule is the job; the header is the evidence for it, and
evidence does not propagate.** That distinction is the reusable part: `#16`/`#17` said "copy
verbatim" without ever saying *what a copy is of*, and a file can be simultaneously one
implementation and two repos' evidence.

**`jobs.guard.name` is `placeholder guard (POSIX)` and must stay that string byte-for-byte** —
it is the context a ruleset binds by name, and a required context that never reports reads
as *pending*, not *failed*. Renaming the job would silently unbind a future ruleset.

**Line endings were a real destination check, not a formality.** Both repos set
`core.autocrlf=true`, so the workflow's blob is LF (`122` LF, `0` CRLF) despite being CRLF
on disk. Had HCA differed, every `run:` block would have carried a bare CR into bash on a Linux
runner. Verified on the blob after commit, not on the working copy.

**How you know — four real runs on this repo, and the output quoted is the failing one:**

- **Negative control** — PR `#11`, clean branch, run `31172574034`: **success**, all three arms.
- **Positive, placeholder arm** — PR `#12`, run `31172614745`: **failure at 2c** against the
  merge commit, naming both offences in HCA's own grammars —
  `REFUSED: unresolved governance placeholder in HEAD.` /
  `DECISIONS_LOG.md:571  ### #NEXT — CONTROL ONLY …` /
  `OPEN_QUESTIONS.md:244  ### Q#NEXT — CONTROL ONLY …`
- **Positive, mode arm** — PR `#13`, hook at `100644`, run `31172624557`: **failure at 2a** —
  `tracked mode: 100644  (100644 8cd1001… .githooks/pre-push)`, with the `#23` remediation in
  the error. `#23` reproduced deliberately on a surface that can see it.
- **Positive, execution arm** — PR `#14`, run `31172640907`. Minted for `#170`'s reason and it
  held here too: **2a fires first and short-circuits, so the mode control never runs 2b.**
  With 2a stripped and the hook still `100644`, 2b failed on its own —
  `./.githooks/pre-push: Permission denied`, **exit 126**. Without this the execution arm
  would be argued, not shown.
- All three control PRs closed and their branches deleted, local and remote; `git branch` and
  `git ls-remote --heads origin` both clean at close.

**What this does NOT close, stated because the brief's phrasing was "closes `Q12`".** It does
not. `push: [master]` fires **after** the ref has moved — against the merge button that is
**detection, not prevention**. Prevention needs the `pull_request` arm *plus* a ruleset
requiring the check, and **HCA has no ruleset**: `rules/branches/master` is `[]`. That is
GitHub-side repo config, not committable, **owner Luke**. So `Q12` moves to **OWED** — the
fork is decided and the versioned half is landed — and not to `DONE`, which would assert
nothing further is required by anyone. Marking it `DONE` here would be `#170`'s own
prevention-vs-detection warning ignored one repo later.

**The enforcement now spans three layers here and only one is versioned:** `core.hooksPath`
per clone, the ruleset per repo, this file. Two of the three are absent in HCA today.

**Number claimed at merge:** `origin/master`'s maxima re-read at the fast-forward instant — `^### #?[0-9]+` gives **`### #23`**, `^#{2,3} Q[0-9]+` gives **`### Q13`**. This entry takes **#24**; no new question is minted, `Q12` is reused.

**Do not revisit unless:** the ruleset lands (at which point `Q12` closes and the header's
"NOT set" paragraph becomes false and must be corrected — it is dated for exactly that
reason); the job name changes; or health-app's executable body changes, in which case the
body is re-copied verbatim and the header is re-checked against this repo, not carried.

### #25 — A bare CR in `#24`'s prose silently flipped the whole store to CRLF  ·  active  ·  repair to #24

**Decision:** `DECISIONS_LOG.md` is renormalised to an LF blob, and the one byte that caused
the flip — a bare carriage return inside `#24`'s prose, where the words "a bare CR" were
intended — is replaced by those words. Nothing else in `#24` changes.

**Mechanism, which is the reason this is a numbered entry.** `core.autocrlf=true` normalises
CRLF to LF on `git add` **only for content git classifies as text**, and git's auto
detection treats a carriage return **not followed by a line feed** as a binary marker. One
stray byte therefore switched the whole file to "binary", normalisation was skipped, and
`6a86376` committed all 650 lines as CRLF where every previous commit had stored LF. The
visible symptom was a **three-line edit appearing as a 1217-line diff** — and it would have
recurred on every subsequent commit, permanently, because the CRLF blob is now the baseline
the next diff is taken against.

**Every guard in this repo was green throughout.** The placeholder guard reads decoded text
and is indifferent to line endings; CI's 2a/2b/2c passed; the pre-push hook passed. The
defect is one layer below everything built to watch this store. **`#23` said verbatim means
every attribute git tracks, not merely the bytes — this is the converse: the bytes can be
right in meaning and wrong in encoding, and nothing here was looking at encoding at all.**
It was caught only because the `git merge --ff-only` diffstat was read rather than skimmed.

**Why this is a repair and not an edit to a locked entry.** The append-only rule protects the
*record* — what was decided and why. What changed in `#24` is a control character that was
never intended to be there and that no reader could see, plus the file's line-ending
encoding, which is not part of the record. The change is named here byte-for-byte precisely
so the history still shows it: `#24` is otherwise untouched, and its claims are unaltered.

**How you know:**
- Before `6a86376`, at `18841b7`: `git show 18841b7:DECISIONS_LOG.md` → **CRLF 0, LF 569**.
  After: **CRLF 650, LF 650**.
- Scope was checked, not assumed: of the seven tracked governance and CI files, only
  `DECISIONS_LOG.md` flipped — `OPEN_QUESTIONS.md`, `BRANCHES.md`, `CLAUDE.md`, `ROADMAP.md`,
  `FEEDBACK.md` and `.github/workflows/governance-guard.yml` were all LF and stayed LF.
- Cause located at byte `43578`, a single carriage return with no line feed after it;
  `b.replace(CRLF, b'').count(CR)` → **1** before, **0** after.
- With that byte gone the staged blob normalises again with no config change: **CRLF 0,
  LF 650**. The repair is the removal, not a setting.

**The deterministic fix is a `.gitattributes`, and it is deliberately not in this commit.**
`* text=auto` or `*.md text eol=lf` would make normalisation a declared property of the repo
rather than a heuristic that one byte can flip. That touches every file in an Expo repo and
belongs in its own change with its own controls, not smuggled into a repair.

**Number claimed at merge:** `origin/master`'s max re-read at the fast-forward instant with `^### #?[0-9]+` gives **`### #24`**; this entry takes **#25**.

**Do not revisit unless:** a `.gitattributes` lands, which makes this class impossible rather
than merely fixed; or a store flips again, in which case check for a bare CR **first** — the
diffstat is the tell, and it is visible in the `--ff-only` output of every merge.

### #NEXT — Shared block re-mirrored; G1 was breached the other way and every store said otherwise  ·  active

**Decision:** HCA's shared loop-rules block is replaced whole with health-app's at `73d5cb8`.
`215 / 15132 / 592d95c82b48361c73ad3b65677de529` → `259 / 18717 /
552728ade81e90edcbc8f12bbbc02a80` (LF form, both sides), `cmp` silent and `diff` empty after.
Both extractions were asserted non-empty and >100 lines **before** either comparison was
allowed to mean anything.

**What was breached, and in which direction.** `#21` discharged G1 at
`4243c91ce78e0331ddfa5178aa3006b8` / 155 lines / 10232 B, with HCA *ahead*. `#22` then took
HCA to 215 by copying health-app. health-app's 2026-08-05 session amended the block five
times with no return trip, putting **health-app** ahead at 259 against HCA's 215 — parity
inverted from the direction the last two entries were written to guard.

**Nothing detected it, and the reason is the entry.** `ROADMAP.md:120` and `closeout.md:101`
both continued to read *"G1 — verified, still discharged."* That sentence was **true when
written and became false without changing**, because a parity discharge was recorded as a
**standing state** rather than as a measurement carrying a date and a hash. There was no
surface holding the fingerprint the claim was taken at, so no surface could contradict it.

> **The rule this earns: a store may record "discharged at `<md5>`" and never "discharged."**

Same defect family as `#24`'s header — a true statement about one instant, carried forward as
a fact about now — and the same family as `Q12`'s original misattribution. Third appearance in
four entries, which is the argument for writing it as a rule rather than a lesson.

**Five amendments land in one edit:** the boundary criterion, number-at-merge's window, the
PowerShell-quoting rule, the `land`-is-no-longer-global ruling, and `#182`'s corrected writer
claim.

**Nothing HCA-only was lost, and that was checked rather than assumed** — the check is the
point, because a whole-block mirror is a silent deletion of anything the source lacks.
Exactly four lines were HCA-only, all four deliberately replaced upstream: the writer claim
(replaced by `#182`), two number-at-merge lines (replaced by the motion-neutral restatement),
and the `--global alias.land` `--ff-only` body (replaced by the `land` ruling — which is why
that ruling is the next entry and the same session).

The staged diff was **48 insertions / 4 deletions**: proportional, and the four deletions are
exactly the four predicted. A whole-file diffstat here would have meant `#25` recurring.

**The mirror is vocabulary-neutral, verified not assumed.** `Q11` gave HCA interim authority
over the struck vocabulary, so a mirror could in principle have re-imported `parked`. It
could not: the word sits at block-relative line 157 in HCA and 179 in health-app, **identical
text**, and no other struck term (`why parked`, `unblocks-on`, `RESOLVED`, `verifying`)
appears anywhere in the incoming block. The mirror neither imports nor removes it. It is now
the **last surviving site of the struck word in either repo** — rowed as the mirror of
health-app `Q33`, and deliberately **not** struck here: editing the block re-breaches the
obligation this entry just discharged, and it needs its own brief with a mirror-first plan and
a G1 re-fingerprint on both sides. Same reasoning that kept `.gitattributes` out of `#25`.

**Four stale rows repaired, none closed on the brief's authority.** Each was read from
health-app `origin/master` from here first: `Q8` item 1 (`Q25` reads `**State:** DONE → #91`,
with a `#93` addendum closing both limbs), `Q8` item 2 (FEEDBACK §14's fifth occurrence
appended at `c7cffa5`), `Q11` items 1 and 2 (`parked` grep over
`.claude/commands/closeout.md` returns **empty**; `BRANCHES.md`'s header now reads the
four-state form at line 8, not the line 3 the row recorded). `Q8` and `Q11` both close.

**A count in the brief did not survive the tree, and it is logged rather than smoothed over.**
The brief gave health-app's block as `259 / 18757`. The tree gives `259 / 18717` — line count
right, byte count 40 out — measured from the blob at `origin/master` with the worktree
verified identical to it. HCA's triple in the same brief matched exactly. This is health-app
FEEDBACK §14's family (a number asserted rather than measured) and belongs in §14's recurrence
log on the return trip; it is recorded here because this is the session that measured it.

**Also checked, and it clears.** §14 occurrence 5 rests on health-app's
`.claude/commands/closeout.md` being **80 lines** where a brief said 77. From this HCA-rooted
session the file's whole history was counted: `08cc0b4` (2026-07-20) is **80 lines / 5205 B**,
matching `#21`'s recorded 5205 byte-for-byte, and the 77 belongs to `35b4110` (2026-07-04).
**Occurrence 5 is not itself a miscount** — 77 was stale, 80 was current. No return trip is
owed on that account. The amendment requesting this check aimed it at *HCA's* closeout.md,
which has never been 80: it was 132 at `#21` and is 134 now. The 80 was always health-app's.

**Do not revisit unless:** either repo amends the block, at which point the other has a return
trip and the fingerprint in `ROADMAP.md` is the thing to compare against — not the word
"discharged".

### #NEXT — `land` is repo-local here too; the global ff-only body was a prerequisite of the ruleset, not a detail  ·  active

**Decision:** HCA sets `git config --local alias.land '!gh pr merge --merge --delete-branch'`.
The machine-global `alias.land` stays absent; `stale` stays global and unchanged. HCA's
fresh-clone setup — `core.hooksPath .githooks` plus the local alias, two commands, neither
cloned with the repo — is documented below `END SHARED LOOP RULES`, matching health-app's.

**The ordering is the finding.** Until now HCA's shared block instructed
`git config --global alias.land` with an `--ff-only … git push origin master` body: a
**direct-push** motion, on an alias shared machine-wide with health-app. The ruleset Brief C
sets refuses exactly that push. Setting the ruleset first would therefore have **broken the
landing motion this repo documents, in both repos, at the instant it was set** — and the
break would have presented as a permission error on an unrelated branch, not as a governance
decision. The two were sitting on an outstanding list as independent items. They are ordered,
and nothing recorded that they were. `Q12`'s *"requires that ruleset and nothing else"* is
amended accordingly: it named one prerequisite and missed the one that had to come first.

**Verified with the discriminating form, because the bare form is not a control (`#103`).**
`git config --local --get alias.land` returns the new body; `git config --global --get
alias.land` exits 1 (absent); the bare `git config --get` returns the same value but cannot
distinguish a local value from a stale global one, so it is reported alongside and never
relied on. health-app's own local alias was re-verified intact and identical.

**The global was already unset.** Brief A had done it, so this session's `--global --unset`
would have been a no-op that errors — checked before running rather than run and rationalised.
Had health-app lacked a local override at that moment, unsetting the global would have left it
with no `land` at all.

**The body carries no embedded double quotes**, per the PowerShell-quoting rule this same
session's mirror imported. `--merge`, never `--squash` or `--rebase` (both rewrite the commits
`BRANCHES.md` rows record as landing SHAs); never `--auto` (queues a merge instant you do not
hold, which cannot satisfy number-at-merge); never `--admin`.

**What this does not do:** it does not gate anything. HCA still has no ruleset —
`gh api repos/Easty11/health-connect-app/rules/branches/master` returns `[]` — so
`git push origin master` still succeeds and the PR arm still reports rather than blocks. The
alias is now *shaped* for a gate that does not exist yet. `Q12` stays **OWED**.

**Do not revisit unless:** the ruleset lands, which closes `Q12` and makes the alias
load-bearing rather than anticipatory; or a third repo joins, at which point "one global body
cannot hold two repos' motions" becomes three and the per-clone setup block is the thing to
copy.
