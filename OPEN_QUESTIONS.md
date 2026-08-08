# OPEN_QUESTIONS.md — health-connect-app

Canonical store for machine-checkable code-state defects and unresolved
questions (see the CLAUDE.md stores table). Status is the four-state vocabulary
— DONE / BLOCKED / OWED / UNSTARTED — per the shared loop-rules block. No fifth
state. BLOCKED must name a blocker that holds *now* and an owner; where the
evidence does not settle barrier-vs-trigger, the item is UNSTARTED.

---

### Q1 — SH-relayout cadence vs SDK-migration trigger (#12)  ·  UNSTARTED
Pin the concrete cadence/threshold at which accumulated Samsung Health
Compose-relayout breakages convert the Samsung Health Data SDK migration from
roadmap-LATER into an actioned migration. #12 defines the tactical-re-map
response and the migration's existence but leaves the trigger loosely specified.
Nothing prevents deciding this — it is undecided, not obstructed.

### Q2 — Native HRV scrape end-to-end to DB, post-:355  ·  OWED
Verify the native Samsung Health HRV accessibility scrape end-to-end to the
backend DB (capture -> POST -> persisted row) following the :355 work — confirm a
scraped value persists as a stored row, not only a successful capture/POST.
**Outstanding:** one Postgres query against Railway showing a scraped value as a
persisted row (not on-device UI) — owner Luke. The capture path itself is
device-confirmed healthy (full screen progression + HRV/HR/RR extraction, 07-12
05:51), so what remains is the named check, not the work.

### Q3 — Stale-APK-masked Compose-break defect record  ·  DONE → `db6f50e` (2026-07-11)
Record the defect where a stale installed APK masked the SH 7.x Compose
breakage during testing, so a stale build cannot again hide a live scraper break.
This is the defect-log home for Firewall #8 D2 (out of scope to action here).
**Resolution:** the exact defect recurred this session — a pre-fix APK
(`a5d1643`, instrumentation-only) masked the landed #19 selector fix and emitted
the phantom `106`. Recorded in `FEEDBACK.md` (2026-07-11 entry) and codified
mechanically: PreToolUse hook `.claude/hooks/block-metro-build.cjs` + npm-script
flip (`db6f50e`) block Metro-dependent debug installs, and the standing rule
"dex-gate the *installed* APK after any scraper rebuild (source-clean ≠ deployed)"
is now on record. A stale build can no longer silently hide a live scraper break.

### Q4 — Day-lag / read-freshness of the HRV scrape  ·  DONE → operator observation (2026-08-08)
#19 fixed phantom *selection* (verified: live run read on-screen 97, not the
negative-width phantom 106). It did NOT address read-*freshness*: whether an
earlier morning value (e.g. `117`) was actually yesterday's, i.e. whether the
scrape reads the correct night at ~5am. Resolve only by watching ONE real
overnight/morning sync land today's value in Railway (Postgres query, not
on-device UI) on the fixed standalone release build. Blocks `feat/hrv-node-dump`
disposition.
**Blocker (holds now):** one overnight/~5am sync on the standalone build landing
today's HRV in Railway — owner Luke. This is a genuine barrier, not a trigger:
read-freshness cannot be established by any means other than observing a real
overnight sync.
**Runnable since 2026-07-13:** this verification was silently blocked — the
scraper appeared "broken" (opened SH, no progression, timeout) but the real cause
was a `SyncScreen` render crash killing the co-hosted accessibility service, not
the scrape path (device-confirmed healthy: SH 7.00.0.107 unchanged since 06-24,
full screen progression + HRV/HR/RR extraction as of 07-12 05:51). Fixed
`e677f9e`; service rebound and scraping confirmed live post-reboot. The sync can
now actually run — the blocker is that it has not yet run, not that it cannot.
**Resolution (2026-08-08 — operator observation, Luke):** the blocker was "one
overnight/~5am sync on the standalone build landing today's HRV in Railway — owner
Luke … read-freshness cannot be established by any means other than observing a
real overnight sync." That instrument is the owner's own: Luke identified the
day-lag originally and reads the HRV value each morning on the standalone build,
where it lands on the correct night. The mapping from a stored row to the night it
belongs to exists only *outside* the pipeline — a stored value is byte-identical
whether or not it is fresh, so no instrument inside the system could settle it —
and the operator's daily reading is that external mapping. Read-freshness
confirmed: the ~5am scrape reads the correct night. Not re-derived and not softened
to "reported" — this is the direct daily observation of the one person positioned
to make it. Consequences: `feat/hrv-node-dump` is released from this blocker
(`BRANCHES.md`), its keep-or-strip disposition still open; `Q5`'s reconciliation
trigger has now fired (see `Q5`), its policy fork untouched.

### Q5 — Historical stale-row reconciliation (τ-window bleed)  ·  UNSTARTED
Pre-fix phantom values already POSTed and persisted are NOT reconciled — e.g. the
Room row `2026-07-09 = 117` (synced=1) remains, and any Railway rows from prior
stale POSTs stand. Decide whether historical rows get corrected/backfilled or left
as-is with a provenance marker. Out of scope for the selector fix (#19 closing
note); needs a deliberate reconciliation pass.
**Not BLOCKED:** the row names no blocker of its own. The Q4 overnight sync is a
trigger for when reconciliation becomes *worth* doing — it refines which rows are
stale — not a barrier to deciding the policy, which can be settled now.
**Trigger fired (2026-08-08):** `Q4` closed on operator observation, so the
overnight-sync trigger this row names has fired — reconciliation is now worth
doing. State stays **UNSTARTED**: a fired trigger makes the work worth doing, it
does not do it, and the policy fork (correct/backfill vs leave with a provenance
marker) remains Luke's, unchanged and out of scope here.

### Q6 — Does `BRANCHES.md` retain DONE rows or drop them?  ·  DONE → #31
The file header scopes it to branches "until merged+deleted", which implies DONE
rows are dropped once the branch is gone. Current practice here retains them
(`fix/scraper-sh-relayout`, `chore/block-metro-debug-build`) because the row
carries the disposition evidence — how we know the code landed. health-app
appears to retain likewise. Decide the rule, and whether both repos agree; if
they do, it belongs in the shared block rather than in one repo's header.
**Resolved (#31, 2026-08-08):** on a criterion, not a preference. **Row a
merged+deleted branch when any store cites an artefact produced on it — a CI run
ID, control output, or a SHA quoted as evidence; otherwise merged+deleted suffices
and no row is required** (a floor: cited ⇒ must row, uncited ⇒ may row). Tested
against every existing row before adoption — the four control branches are rowed
(run IDs cited in `#24`/`#28`), `gov/close-q12` is not (its refusal is quoted
inline in `#28`, pointing at nothing), and the two legacy disposition-evidence rows
are permitted-not-required. The test is now stated in `BRANCHES.md`'s header. Whether
it rises to the shared block is left open — this repo's header states it for now.

### Q7 — #18's flat-`sourcePackage` contract unfulfilled in `aggregateSteps`  ·  OWED
`aggregateSteps` in `src/healthConnect.js` drops `sourcePackage`: the accumulator
does not carry the field and the final projection emits only `{date, count}`.
#18 ("HCA emits flat sourcePackage") is therefore overstated on master — the
contract holds on other paths but not this one.
**Outstanding:** a fix exists, stashed at `stash@{0}`
(`pre-gov-parity: healthConnect.js WIP, unreviewed`, +4/-3) — threads the field
through the aggregate row, the first-contributor path (`??=`), and the
projection. Unreviewed and unlanded — owner Luke. A stash is a surface nothing
points at; this row is what points at it. Recover with `git stash list`.

### Q14 — The shared block still says `parked`; mirror of health-app `Q33`  ·  OPEN
**State:** OPEN. **Mirrors:** health-app `Q33` (OPEN). **Related:** `#20` (four states), `#21`,
`#93` (health-app's sweep), `Q9`, `Q11` (both now closed against it).

`CLAUDE.md:186` here and `CLAUDE.md:198` in health-app carry the same sentence:

> branch with `+` commits vs `origin/master` must be pushed, parked in `BRANCHES.md`,

**It is a generator instruction, not narration** — it tells the next session what to *call* a
branch, so it re-emits the struck vocabulary every time it is read. It survives the
frame-vs-narration filter that correctly exempts `retired` (prose about a convention) and the OAuth
`parks the request` (a different word-sense).

**This is now the LAST surviving site of the struck word in either repo.** `#21` swept HCA's ritual,
`#93` swept health-app's ritual and its `BRANCHES` frame (both verified from here at `Q11`'s close).
Both rituals say `rowed`; the document that *defines* the vocabulary still says `parked`.

**Why this row exists here and did not before.** health-app's `Q33` was a health-app-local row while
HCA held interim authority over the struck vocabulary. `Q11`'s close ends that asymmetry, so under
`#20`'s mirror-first rule the obligation is now **paired across two repos** — and a paired obligation
tracked in only one store is how the unpaired half rides another four sessions. Same failure `Q12`
was minted to prevent.

**Deliberately NOT struck in this session, for the reason `Q33` gives and one more.** Editing the
block from either side re-breaches G1 — the obligation `#26` has just discharged, at
`552728ade81e90edcbc8f12bbbc02a80` / 259 lines / 18717 B. It needs its own brief with a mirror-first
plan and a G1 re-fingerprint on both sides. Same reasoning that kept `.gitattributes` out of `#25`:
a change deserving its own controls does not ride in on an unrelated one.

**Note for the return trip:** `Q33`'s own text quotes stale coordinates — `CLAUDE.md:128` / `:116`
and fingerprint `4243c91c…` / 155 lines / 10232 B, all superseded by `#22` and `#26`. Correct them
there; do not carry them from `Q33` into a plan.

**Outstanding — owner Luke:** one shared-block brief, mirror-first, both repos, one G1
re-fingerprint.

### Q12 — The guard cannot see server-side ref updates  ·  DONE → #28
**State:** DONE → #28. **Mirrors:** health-app `Q79` (closed → `#170`). **Related:** `#22`
(the hook), `#24` (the CI surface), `#27` (the alias prerequisite).

**The versioned half is LANDED; the fork is decided.** `#24` propagated `#170`'s
`.github/workflows/governance-guard.yml` here — 2a hook mode, 2b hook executed, 2c guard
against the ref that would land, on `pull_request` and `push: [master]`, proven by four
real runs including three red controls. **OWED, not DONE, and the distinction is not
bookkeeping:** `push: [master]` fires *after* the ref has moved, so against the merge
button it is **detection, not prevention**. Prevention needs the `pull_request` arm plus a
ruleset requiring the `placeholder guard (POSIX)` context by that exact string.

**The one outstanding action, and it is not committable:** HCA has no ruleset —
`gh api repos/Easty11/health-connect-app/rules/branches/master` returns `[]`, verified
2026-08-07. health-app's counterpart is `master-pr-gated` (id `20414758`). Until HCA has
an equivalent, the PR arm reports and does not block, and the merge button that dug
`a7cc309` stays open behind a green check. **Owner Luke, GitHub-side repo settings.**
**AMENDED — “that ruleset and nothing else” was false when written.** It named one prerequisite and
missed a second that had to come *first*: HCA's `land` was the shared block's `--global` `--ff-only`
body, a **direct-push** motion, on an alias shared machine-wide with health-app. A ruleset refusing
direct pushes to master would have broken the landing motion this repo documented, in both repos, at
the moment it was set. The alias is now repo-local and PR-shaped (`#27`), so the prerequisite is
discharged and the ordering is recorded rather than rediscovered. **Closing this row now requires
the ruleset and nothing else** — which is what the original sentence asserted one step too early.

**CLOSED. All three layers are installed and each was verified against this repo, not inferred
from health-app's.** Ruleset `master-pr-gated` (id `20573455`) was created 2026-08-08 by the
operator: `enforcement: active`, `bypass_actors: []` — so it binds the repo owner holding an
admin token — with rules `pull_request`, `required_status_checks`, `non_fast_forward`, and the
required context read back as exactly `'placeholder guard (POSIX)'`, `strict: true`.

**The context string is the part worth checking, and it was checked.** It must match
`jobs.guard.name` byte-for-byte; a required context that never reports reads as *pending*, not
*failed*, so a typo here produces a gate that blocks everything forever rather than one that
blocks nothing — and neither failure looks like a misconfiguration from the PR page.

**What each layer covers, and what it does not.** Closing this row on "the ruleset" alone would
repeat the error the amendment above already corrected once:

| Layer | Binds | Covers | Does **not** cover |
|---|---|---|---|
| `.githooks/pre-push` via `core.hooksPath` | this clone only | any `git push` to master from a configured working copy; refuses **before bytes leave the machine** | a clone that never ran the install; CI runners; the merge button. Client-side by construction — this is the gap that opened the row. |
| `.github/workflows/governance-guard.yml` | server-side, every ref | `pull_request`: the merge commit that **would** land. `push: [master]`: anything that reached master | on its own, **prevents nothing** — the PR arm only reports unless something requires it, and the push arm fires after the ref has already moved |
| ruleset `master-pr-gated` (`20573455`) | the repository | makes the PR arm **binding**: requires a PR, requires the exact context, forbids non-fast-forward, binds the owner | itself — it is unversioned config. A deleted ruleset or one added `bypass_actor` removes enforcement silently and leaves every run green |

**Two of the three layers still have no diff**, and that is the residue this row closes *with*,
not despite. `core.hooksPath` is per clone and the ruleset is per repo; only the workflow file is
visible to `git diff`. A green run is evidence the script passed — never evidence the layers are
installed. Check them directly: `gh api repos/Easty11/health-connect-app/rules/branches/master`
must be non-empty, and `git config --get core.hooksPath` must return `.githooks`.

**Verified end-to-end on real content, not on a control branch.** The PR that closed this row was
itself the proof, and each layer refused in turn before anything landed — see `#28` for the
quoted output.

**Owner Luke's action is complete.** health-app's counterpart is `master-pr-gated` (id
`20414758`); the two repos are now symmetric in enforcement for the first time, which is what
`Q79`'s close and this row's `**Mirrors:**` line were always pointing at.

`core.hooksPath` is a **per-clone, client-side** setting; it cannot bind a runner *or a
merge button*. Some ref update reaches HCA master without ever running the hook, so the
guard is installed and green over a surface it does not observe.

**CORRECTED 2026-08-04, same day this row was minted — the gap is real, the agent named
was not.** As first written (and as health-app's `Q79` was written), this row said the
`@claude` GitHub Action pushes from a checkout that never ran `git config core.hooksPath`.
**HCA has no `.github` directory in any commit on any ref** — `git log --all -- .github`
returns empty — so the Action has never been wired to this repo and that push path does
not exist. The claim came from the shared block's *"Code — and the `@claude` GitHub
Action — is the only writer"*, carried as fact about a surface nobody checked: `FEEDBACK`
§12, committed by Code rather than chat, which is the failure this row now also records.
health-app `#170` made the identical correction to `Q79` independently.

**The real uncovered path is demonstrated, not hypothesised.** `a7cc309` on HCA master is
committed by `GitHub <noreply@github.com>` — a github.com **web-UI merge**, i.e. a
server-side ref update (`Merge pull request #4 from Easty11/chore/governance-held-writes`).
One instance here against five in health-app. Its positive control needed no construction.
**A gap recorded against the wrong agent would have been "closed" by covering a path that
does not exist, leaving the merge button open behind a green check.**

**Why this is minted rather than left in the decision entry.** health-app's `#167`
recorded exactly this gap in its own prose and a `BRANCHES` row — and neither outlives the
branch: a decision entry is append-only history, a `BRANCHES` row dies at merge. The hole
had no home a reader of `OPEN_QUESTIONS` would find, so the store whose job is "what is
undecided" showed a fully-enforced guard. That is the same shape as the defect this work
just fixed: an instrument reading green over what it cannot see. **Two repos with the same
hole recorded is honest; one admitting it and one not is how the hole rides another four
sessions.**

**Closing it requires a CI check, not a hook — and health-app has already built the one to
propagate.** `#170` landed `.github/workflows/governance-guard.yml` on `ubuntu-latest`:
(2a) hook tracked mode `100755`, (2b) the hook *executed* as git executes it, (2c) the guard
against the ref that would land, on `pull_request` **and** `push: [master]`. Per the `#169`
preamble clause this arrives here **by propagation, not parallel authorship** — authoring a
second implementation is the exact defect that clause exists to prevent.

**`#170`'s prevention-vs-detection distinction carries across and must not be lost in the
copy.** `push: [master]` fires *after* the ref has moved: against the merge button that is
**detection**, not prevention. Prevention needs the `pull_request` arm **plus branch
protection requiring the check** — GitHub-side repo config, not committable, **owner Luke**.
Enforcement then spans three layers of which only the workflow file has a diff.

**Open fork, untested here:** whether an HCA runner image ships a Python the script can use.
The local install does not test it — this machine has 3.14.5 and a runner image need not.

**Outstanding — owner Luke.** The propagation is done (`#24`, 2026-08-07); the asymmetry
that remains is narrower and now symmetrical in kind: **health-app has its ruleset, HCA does
not.** One `gh api` call or one settings page closes this row.

### Q13 — The imported block's question-state axis is not the axis this store uses  ·  OPEN
**State:** OPEN. **Created by:** the verbatim shared-block copy in `#22`.
**Related:** `#20` (four states adopted here), `#21`, `Q9` (struck vocabulary outside the
swept stores — the inverse direction of the same seam).

The shared block now defines a **question-state axis** for `OPEN_QUESTIONS.md` — `OPEN` /
`OWED` / `DONE → #N`, carried under the sole label `**State:**`, on the reasoning that a
question is not a work item: an untouched question is a live fork, not `UNSTARTED`, and a
question gated on a dependency is `OPEN` with a `**Blocked by:**` note, not `BLOCKED`.

**This store does not use it.** Its preamble still reads "Status is the four-state
vocabulary — DONE / BLOCKED / OWED / UNSTARTED … No fifth state", and all 11 pre-existing
rows carry a four-state suffix in the heading, including `UNSTARTED` (Q1, Q5, Q6, Q9, Q10)
and `BLOCKED` (Q4) — neither of which exists on the new axis. The two rows minted by this
branch conform to the new canon, so the file is now **mixed**, deliberately and visibly.

**Note what this is not.** `Q9` tracks *struck* vocabulary surviving on unswept surfaces —
old dialect left behind. This is the opposite direction: a *new* axis arriving by
propagation into a store that never adopted it. Same seam, opposite sign, which is why it
is a separate row and not an item appended to `Q9`.

**Undecided, and deliberately not settled by Code:** whether HCA re-labels all 11 rows to
the new axis (mapping `UNSTARTED`/`BLOCKED` → `OPEN` with a `**Blocked by:**` note where
one applies, and `Status:` → `State:`), or whether the block's clause is itself wrong for
this repo and the return trip narrows it. **The mapping is lossy in one direction** — `Q4`'s
`BLOCKED` names a real barrier that `OPEN` + a note describes but does not assert — so this
is a judgement about what the store is *for*, not a reformat. Sweeping 11 rows unbidden is
not Code's call, and #21 already recorded that over-application is a failure mode beside
under-application.

**Outstanding — owner Luke:** rule the axis, then sweep or narrow in one pass.


### Q11 — health-app's `/closeout` still instructs `parked`; ritual divergence ruled  ·  DONE → #26
Step 4 of #21 read both definitions. **Structural divergence is intentional and
legitimate** — see #21 — but **the vocabulary is not aligned**: health-app's
`.claude/commands/closeout.md:34` still reads "must be pushed, **parked** in
`BRANCHES.md`, or discarded before close." Same struck status-verb this repo fixed at
its own lines 72/74. The #21 brief asserted health-app's ritual was "already struck";
that is false for this line, and it was verified by reading the file, not assumed.
Note what is *not* a defect there: line 68's "**retired**" describes a *convention*
being retired, not a branch status — legitimate prose. Sweeping it would repeat the
over-application error `PENDING` taught.
**Second residue, found at #21's exit gate:** health-app's `BRANCHES.md:3` column header
still reads `| Branch | Purpose | Status | Why parked | Unblocks on |`. Its 22 Status
*values* are clean (12 DONE / 9 OWED / 1 UNSTARTED, zero outside the four states) — the
struck dialect survives only in the frame. HCA swept its own headers to
`| … | Status | Detail | Blocker / outstanding (owner) |` under #20; health-app did not.
A column header encodes vocabulary as surely as a cell value: it tells the next writer
what to put there.
**BOTH ITEMS DISCHARGED at health-app `#93`, verified from here against `origin/master` before
closing — the brief asserted it, this row did not close on that assertion:**
1. `.claude/commands/closeout.md` — grep for `parked` over the file at health-app master returns
   **empty**. The status verb is struck.
2. `BRANCHES.md` column header now reads `| Branch | Purpose | Status | Detail | Blocker /
   outstanding (owner) |` (at line 8, not the line 3 this row recorded) — identical to HCA's
   swept form. The frame no longer teaches the struck word.
**HCA is no longer authoritative-by-default for the ritual's vocabulary**; the two repos agree.
The one site where the struck word survives in BOTH is the shared block itself — rowed separately
below, deliberately not fixed here.

*Superseded, retained for the record —* **Outstanding, on a health-app-rooted session (single-repo
rule forbids it from here) — owner Luke, two items:** (1) strike `parked` at `.claude/commands/closeout.md:34`;
(2) rename the `BRANCHES.md:3` header pair. **HCA is authoritative for the ritual's
vocabulary and for the header frame in the interim.** Paired obligation, mirror-first,
per #20's standing rule.

### Q10 — The `/closeout` ANCHOR states required state in the declarative  ·  UNSTARTED
`.claude/commands/closeout.md:14-25` still carries the shape last session's FEEDBACK
entry flagged in briefs: "**ANCHOR — run this first, stop if it fails**", with no
separation of required state from how to reach it, and no statement of which failures
are hard stops. In practice only the wrong-repo case is a genuine hard stop — a missing
branch is a step. The same correction that was applied to brief ANCHORs has not been
applied to the ritual's own. Out of #21's scope fence (that brief was the column set);
logged rather than swept, because amending a ritual's halt semantics unbidden is not
Code's call.

### Q9 — Struck vocabulary survives outside the two swept stores  ·  UNSTARTED
The #20 sweep covered `BRANCHES.md` and `OPEN_QUESTIONS.md`, and the exit-condition
grep returns zero across both. But the shared block names `ROADMAP.md` and close-outs
as governed too, and two surfaces still carry the struck dialect:
1. **`ROADMAP.md`'s work queue** above the sprint block — `Q2 … RESOLVED`, `parked`,
   `Blocked on`. Prose in places, labels in others; needs reading, not a regex.
2. ~~**The `/closeout` command definition itself**~~ — **DISCHARGED by #21**
   (`273a429`). The column set now points at `CLAUDE.md`'s State-vocabulary section, and
   `parked` as a status verb is struck. The "PENDING queue" section was deliberately left
   alone: `PENDING` flags the transient chat→Code payload, not a branch or question
   status.
Item (2) was the higher priority and the reason this was a row rather than a footnote: a
ritual definition that teaches the dead dialect re-emits it every session, so the defect
had a source and sweeps downstream of a source are temporary. **Item (1) remains open**
— `ROADMAP.md`'s work queue still carries `RESOLVED` / `parked` / `Blocked on`. It is
inert debt, carried rather than regenerated, which is why it outranks nothing.

### Q8 — Shared loop-rules block parity is inverted; health-app return trip  ·  DONE → #26
#20 amended the shared block *here* (barrier-vs-trigger tie-break) from a session that
could not reach health-app, leaving G1 breached with HCA ahead at 155/10232 against
health-app `9fa18cc`'s 153/10080.
**The G1 limb is DISCHARGED** (verified at #21's exit gate): both repos' blocks extracted
independently, each asserted non-empty and ≥100 lines before comparison, both measuring
155 lines / 10232 bytes / md5 `4243c91ce78e0331ddfa5178aa3006b8`, `cmp` identical. The
tie-break clause arrived inside the block, so that limb needed no separate edit.
**Still outstanding, on a health-app-rooted session (single-repo rule forbids it from
here) — owner Luke, two items:**
1. Set health-app `Q25` to `DONE → #91`. Q25's entire content was that
   `claude/hevy-api-workout-query-teulc2` had no row in HCA's `BRANCHES.md`. It acquired
   one on 2026-07-20 (`f15b545`), and **the operator deleted the branch from origin the
   same day** — verified from here, `git ls-remote --heads origin` returns empty for that
   ref. Both the omission Q25 records and the branch it records it about are gone, so Q25
   resolves on sight; no investigation needed on the return trip.
2. Append the count-the-field recurrence to health-app `FEEDBACK` §14 — it now has a
   third instance (the brief's "77 lines" against an actual 80).
See also Q11 for the two ritual/frame items on the same return trip.

**BOTH RETURN-TRIP ITEMS DISCHARGED, verified from here against health-app `origin/master`, not
taken on a brief's word.**
1. **Q25 → `DONE → #91`.** health-app's `OPEN_QUESTIONS.md` carries `**State:** DONE → #91`, plus a
   `#93` addendum closing both limbs: the operator deleted the remote ref, HCA's row reads
   `DONE → discarded 2026-07-20`, and `git ls-remote --heads origin` returns empty for it.
2. **FEEDBACK §14 fifth occurrence appended** at health-app `c7cffa5` (2026-08-07), recording the
   77-vs-80 count. Independently re-verified here — see the new `parked` row below for why that
   check was run and what it returned.
**The G1 limb was discharged at `#21` and has since been breached AGAIN and re-discharged** — see
`#26`. That is not this row reopening: `#21`'s discharge was valid at its hash and stopped being
true when health-app amended the block on 2026-08-05. A parity discharge is only ever valid
against the hash it was taken at.

### Q15 — Which cross-repo-parity artefacts are governed, and by what rule?  ·  UNSTARTED
Mirror of health-app `Q87`. Recorded in this store's **four-state vocabulary** (heading suffix,
no `**State:**` line): the imported `OPEN`/`OWED`/`DONE → #N` axis is deliberately not adopted
here (`Q13`) and this row does not resolve `Q13` in passing — an undecided fork with no blocker
and nothing owed is `UNSTARTED`.

The shared-loop model has exactly one explicit parity mechanism: **G1** governs the
verbatim-propagated shared block by byte-identity, measured, under health-app `#92`'s
paired-obligation protocol. Several files **outside** the shared block are also expected to stay
in parity across `health-app` and `health-connect-app`, and no store enumerates which, under which
mechanism, or with what equivalence criterion (byte-identity vs behavioural-equivalence). Five
instances, each verified from this tree:

| Artefact | Parity status (HCA-verified) |
|----------|------------------------------|
| shared loop block (`CLAUDE.md`) | **G1-governed** — byte-identity, measured, paired-obligation (health-app `#92`) |
| `.github/workflows/governance-guard.yml` | mirrored byte-identical, **ad hoc** (`#24`) — under no named rule |
| `scripts/check_governance_placeholders.py` | **was drifted, undeclared** — HCA carried the retracted "alias calls the same script" claim and the pre-repair `read()`; both fixed this session (`#29`). `read()` now byte-identical; docstrings repo-local by design |
| `.claude/commands/closeout.md` | **undeclared** — HCA 134 lines vs health-app 90 (both counted here) |
| checker `main()` advisory string | **divergent by design** — HCA `"before the fast-forward"` vs health-app `"before it lands"`; left unreconciled this session |

Two were known-drifted and nothing declares which paths are parity-governed. The checker is the
sharp case: its own comment calls it *one implementation of one rule across every repo*, yet no
register names it a parity artefact and nothing checks the two copies against each other — so a
fix in one repo silently leaves the other stale, which is the drift `#29` just cleaned up.

**The fork:** build an explicit artefact-parity register (each cross-repo file, its governing
mechanism, its equivalence criterion) or keep parity ad hoc per artefact. Not settled here — the
register spans both repos, **owner Luke**. Cross-refs health-app `#92`/`Q87`, `#22`/`#24` (checker
+ workflow), this session's `#29` (checker drift). **Not this question:** the shared block itself
(G1-governed, settled) or any single artefact's current drift (a data point, not the gap).

### Q16 — HCA's `land` guard is owed to health-app's identical alias  ·  UNSTARTED
`#30` gave HCA's local `land` alias a `case` guard refusing from `master`/`main`. health-app's
alias body is byte-identical, so the same fail-fast improvement applies there — but `land` is
**repo-local config, not shared-block content**, so it is not editable from this repo. Rowed here
so the pairing is not lost; **owner: health-app's next session**. Note the empirical finding that
travels with it: the exit-0 silent-no-op premise did **not** reproduce under gh 2.93.0 (no-PR
returns exit 1), so the guard is fail-fast clarity, not a fix for a live exit-0 bug — see `#30`.
