# CLAUDE.md — health-connect-app

Operating contract for this repo. Read this first on every cold resume.
If `closeout.md` exists, read it second — it is the live handoff.

---

<!-- ════════════ BEGIN SHARED LOOP RULES ════════════ -->

## Shared loop rules — edit in `health-app`, propagate verbatim

*Everything from this heading down to "END SHARED LOOP RULES" is identical across every
repo in this project. Edit it only here, then copy it verbatim into
`health-connect-app/CLAUDE.md` and any future repo. Never edit a copy in place — that
re-creates the two-master drift this whole model exists to kill.*

***Verbatim propagation replicates a defect at full fidelity.*** *Copy-not-hand-merge kills
drift, and it silently assumes the source is the better copy. It is not always: on
2026-08-04 the destination's wording of the session-open rule was **generic and correct**
where `health-app`'s was pinned to `health-app`'s own heading grammar and returned zero
against the destination's file. Copying would have replaced a correct line with a broken
one. So before any copy, **verify the source's rule against the destination's actual
shape** — run the regex, count the store, check the paths exist. If the source is wrong,
fix it here first and copy after; never fix it in the copy, and never hand-merge the two.
The verification is a precondition of propagation, not a review of it.*

***What belongs in this block at all — the boundary criterion.*** *A rule belongs here only
if its correctness is independent of any surface outside the tree. Invariants qualify:
number-at-merge, terminal-state disposition, patch-id over ancestry, concern-named branches,
single-writer. **Mechanics that depend on unversioned config do not** — they go below
`END SHARED LOOP RULES`, in the repo whose config they describe. The rejected alternative was
a shared rule conditioned on whether the repo has a required status check; that fails on its
own terms, because the check's existence is invisible from the tree, so a reader could not
tell which branch of the rule applied to the repo in front of them. A rule that reads
differently in each repo is a divergent rule wearing a shared rule's clothes — worse than an
honest split, because the empty-diff check still passes. Earned 2026-08-05, when `health-app`
adopted a PR-gated merge path and `health-connect-app` had no CI workflow at all to gate one
with (`#171`, `#172`).*

### The loop (source-of-truth model)

- The **repo is the single source of truth** for all volatile state.
- **Code is the only writer.**
- **Chat proposes; chat never commits.** The claude.ai GitHub connector grants chat
  read/attach only. Any instruction that has "chat commits", "chat writes a spec to the
  repo", or "chat files an issue" is wrong on this surface — chat emits text, a human or
  Code carries it across, Code/Action writes it.
- **The commit is the only sync point. Truth changes only at a commit.** Anything decided
  in chat is *pending* until a commit lands it. Treat an uncommitted decision as
  provisional, not done.
- **Read-back path:** repo → chat via Projects sync (the repo file is mirrored into the
  project and refreshed automatically), or by attach. Chat reads the mirror already in
  context; it keeps no separate editable copy.
- **Kill-rule:** decisions, open questions, roadmap, and task state are **never** saved
  into Claude.ai project knowledge. That is the exact mechanism that produced the drift
  this model exists to kill. Project knowledge holds stable orientation docs only.

### The unseeable-surface rule

Chat can verify only what is on a pushed ref. Any brief statement about a surface chat cannot
read — UI-maintained knowledge files, unpushed branches, local disk, Railway/prod state, the
operator container — is an INSTRUCTION TO VERIFY, never a report of fact, regardless of how it
is phrased. Declarative mood does not make it attested. Verify against the surface or STOP and
report; never land on it.

### Canonical stores

| Store | Holds | Discipline |
|-------|-------|-----------|
| `DECISIONS_LOG.md` | Architecture decisions | Append-only. Supersede via a new entry that references the superseded number. Never edit a locked entry in place. |
| `OPEN_QUESTIONS.md` | Undecided forks, unverified-at-machine items | One status per item, from the four states — see **State vocabulary** below; that section is the sole definition. `DONE → #N` names the decision that resolved the question, as `DONE` names its SHA in `BRANCHES.md`. |
| `ROADMAP.md` | Current sprint + horizon | Mutable. Code updates it at close-out. |
| `FEEDBACK.md` | Behavioural corrections and standing rules | Repo-canonical. Code reads it at session start. The project-knowledge copy is a refreshed mirror, not the master. |
| `ptb-tasks` (external board) | Task status | Single live board. Mutable. Referenced by task ID — never mirrored into the repo. |
| pending-commit queue | The chat → Code handoff payload | Transient. Emitted by the chat close-out as canonical-format entries flagged `PENDING`. Carried by paste, or materialised as a GitHub issue for `@claude`. Consumed at the next Code open, then discarded. Not a stored repo file. |

**Stays in project knowledge, never in the repo** (stable, chat-analysis context):
`Clinical_Protocol`, `Athlete_Profile`, lab PDFs, `Stack`, `API_CONTRACTS`,
`Hevy_Pattern`, `Readiness_Algorithm`.

### State vocabulary

Four work-states, exhaustive, no fifth. Applies to `BRANCHES.md` Status, `ROADMAP.md`, and
close-outs. `OPEN_QUESTIONS.md` uses the **question-state** axis below instead — a question is
not a work item.

- **DONE** — landed on master (SHA) or applied to a named UI file. Nothing further required by
  anyone.
- **BLOCKED** — cannot proceed; names the blocker and its owner. A trigger for when work
  becomes *worth* doing is not a blocker on its being *possible* — that is UNSTARTED.
  Where the evidence does not settle whether a dependency is a barrier or a trigger,
  the row is UNSTARTED: a false BLOCKED tells a reader not to try.
- **OWED** — work or decision settled, loop not closed; names the exact command or check
  outstanding.
- **UNSTARTED** — untouched.

No "in progress": half-done work is **BLOCKED** (has a blocker) or **UNSTARTED** (doesn't).

**Question state (`OPEN_QUESTIONS.md` only).** The four work-states do not fit a question — an
untouched question is a live fork, not "UNSTARTED", and a question awaiting a dependency is not
"BLOCKED". A question carries exactly one state, under the sole label `**State:**` (never
`**Status:**`):

- **OPEN** — the fork is live; no decision answers it yet. A question gated on a dependency
  before it is *worth* deciding is OPEN with a `**Blocked by:**` note — not BLOCKED.
- **OWED** — the fork is decided, but a named verification or loop-close is still outstanding
  (mirrors the work-state OWED).
- **DONE → #N** — resolved; decision `#N` is the answer (mirrors the work-state `DONE → #N`).

### DECISIONS_LOG discipline

Preserve the existing entry format:

> **Decision · Rationale · Status · How you know · Do not revisit unless**

- Append-only. To change a decision, add a new entry that supersedes the old one by
  number. Do not edit a locked entry's text — the history is the point.
- Every decision that gates code carries a **How you know** artifact: a confirmed test, a
  verified search result, or official documentation. "The API has a field for it" is
  insufficient. Founding rule, earned from the HRV pipeline failure.
- **Number-at-merge.** On a branch, a new entry is headed `### #NEXT`. The integer is
  claimed only when the governance commit lands on master (next sequential at that
  instant). Eliminates the two-branches-both-claim-#N collision and the
  renumber-on-`--ff` dance. Stated against *landing*, not against any one merge motion —
  the motion is repo-local and differs between repos; this rule does not.
- **Number-at-merge names its window.** Resolving `#NEXT` and landing it are two acts, and
  master can advance between them. So resolve **immediately before** merging, having re-read
  master's max at that moment — not at session open, not from a prior report — and if master
  advances in the interval, **re-resolve before merging**. The window is small, never zero,
  and an unnamed race is how `#162`'s hole rode four sessions. A repo may have a mechanism
  that forces a pause when master advances; a forced pause is not an adjudicated number, and
  the re-read is owed either way. The guard refuses an unresolved *placeholder* reaching
  master — it has no opinion on whether the integer you resolved to was still free.
- **Number-at-merge is ENFORCED, not trusted.** `scripts/check_governance_placeholders.py`
  refuses any push to master whose `DECISIONS_LOG.md` still carries `^#{2,3} #NEXT` or whose
  `OPEN_QUESTIONS.md` still carries `^#{2,3} Q#NEXT`. It guards the **ref**, not one command:
  the merge that made this necessary was done by hand, so a guard living inside the `land`
  alias would not have fired. Branch pushes are untouched — a placeholder is *correct* on a
  branch and only wrong on master. Anchored on the heading form, never a substring, because
  the rule text and every corrected entry legitimately quote the token (`#113`). The anchor
  tolerates the heading **level** and never the **form**: the repos disagree on level —
  `health-app` heads a question `## Q77.`, `health-connect-app` heads it `### Q8 — …` — so a
  level-pinned pattern reads one of them as permanently clean, which is a guard that is
  installed, green and blind. One rule, one implementation, matched to each repo's grammar.
  Install once per clone, alongside the aliases: `git config core.hooksPath .githooks`.
  Bypass is `git push --no-verify`, and needing it twice is a signal the ritual is wrong,
  not the guard. Earned: the placeholder reached master three sessions running and left a
  permanent hole at `#162`.

### Session rituals (the contract the close-outs conform to)

The trigger is not the payload. The payload is defined here; the snippet/command bodies
must match it.

- **Session open** — at session start, before acting on any brief, Code reports **both**
  maxima: the `DECISIONS_LOG.md` max decision number, counted with `^### #?[0-9]+`, and the
  `OPEN_QUESTIONS.md` max question number, counted with `^#{2,3} Q[0-9]+`. Never
  `^### [0-9]+\.`, never `^### [0-9]+`, never `^## Q[0-9]+`. **Period-agnostic** because
  `health-app` entries `126`–`128` carry no trailing period and a period-requiring sweep
  undercounts by three and invents phantom gaps (verified 2026-08-02). **Sigil- and
  level-agnostic** because `health-connect-app` heads a decision `### #21 — …` and a
  question `### Q8 — …`, against `health-app`'s `### 166.` and `## Q77.`: the pinned forms
  return **0 / 78** and **0 / 168** across the two repos (verified against both trees
  2026-08-04). A sweep that returns zero does not look broken — it looks like an empty
  store, at the one moment whose entire job is establishing canon. **Both arms are named
  because only one used to be**, and the missing arm was filled in by analogy to the arm
  that was there — which is how a health-app-shaped `^## Q` got reached for. Chat re-aims
  any brief against these, so a stale project copy never masquerades as canon.
- **Chat close-out (`;cc`)** emits the **pending-commit queue**: canonical-format
  `DECISIONS_LOG` / `OPEN_QUESTIONS` entries for everything decided that session, each
  flagged `PENDING`, ready to paste or file as an issue with zero reformatting. Writes
  nothing to project knowledge.
- **Code close-out (`/closeout`)**:
  1. Reads the canonical stores.
  2. Reports the **actual commits** made this session (`git log` since open) — not
     suggested commit messages. Additionally emits
     `git log --format="%ad %s" --date=short -10` so the handoff carries the repo's own
     record — commit dates are immutable and cannot drift, where a self-reported stamp can.
     (This binds here, not in `closeout.md`: that file is session-local and overwritten every
     close-out, so a rule left only there would not survive.)
  3. **Reconciles the pending-commit queue**: confirms each `PENDING` item landed in a
     commit, or states why not.
  4. **Branch terminal-state gate** — every branch touched this session ends
     merged+deleted or listed in `BRANCHES.md`; none in undefined limbo. The gate
     enumerates local branches (`git branch`) as well as `refs/remotes/origin`; a local
     branch with `+` commits vs `origin/master` must be pushed, parked in `BRANCHES.md`,
     or discarded before close. If any touched branch is neither, the close-out HALTS
     until resolved.
  5. Regenerates the cold-resume handoff view from the stores.
  6. Overwrites a single `closeout.md`. Never appends narrative; never describes the act
     of writing the close-out.
  7. Writes the close-out body verbatim to `closeout.md` and prints only a terse pointer to
     stdout — path, branch, single next action, and the filenames of governance stores
     changed this session (`DECISIONS_LOG` / `OPEN_QUESTIONS` / `ROADMAP` / `FEEDBACK` /
     `Ideas`; names only, never contents). It does not emit store text; pre-merge copy-back
     is `cat`/open of the changed store file on disk. Chat replaces the project copies
     wholesale from those files and never regenerates these stores from memory.
- `/compact` is mid-session context compression, **not** a close-out. Do not conflate.

### Project-wide standing rules

- **Windows / PowerShell only.** No Linux syntax — no `head`, no backslash line
  continuation. Single-line, or PowerShell backtick continuation.
  **PowerShell-safe is not the same as Linux-syntax-free, and the difference is a quoting
  bug, not a style one.** PowerShell re-quotes arguments when it hands them to a native
  executable, and **embedded double quotes do not survive** — a single-quoted PowerShell
  string containing `"` reaches `git`/`gh` split across several arguments. It fails with
  whatever that program says about wrong argument counts, never with anything naming quoting:
  `git config --local alias.land '…"$(git branch --show-current)"…'` returns
  `error: no action specified`, which reads like a missing flag. **So a command written for
  this project must avoid embedded double quotes in its argument, not merely avoid `head`**,
  and a command Code emits for Luke to run must be exercised in **PowerShell** — Code's own
  Bash tool passes these strings cleanly and will never reproduce the failure. Earned
  2026-08-05: the `land` body documented at `#171` was Bash-verified, committed, and then
  refused on first use.
- **Verify before design.** Verify data paths end-to-end before designing against them.
  Standing rule after the HRV pipeline failure.
- **Empirical specificity.** A recorded test result must state the exact pathway
  exercised and the payload returned — never the generalised conclusion. "X is not
  available via AccessLink" is an assertion; "the exercise summary JSON returned no
  per-second field" is a fact. A negative is only as broad as its recorded scope — do
  not widen it to the whole route/API/device. Mirror of the rule above: as "the API has
  a field" doesn't prove capability, "a test failed" doesn't prove absence.
- **Device-agnostic schema.** All health data is normalised to a `source`- and
  `confidence`-tagged schema before any algorithm or AI layer. The intelligence layer
  never references device-specific schemas.
- **Data verification = Postgres query against Railway**, not on-device UI.
- **Never run a command that renders a secret value.** Includes `railway variables` in
  any form (`--kv`, `-k`, `--json`, the `variable` singular, and the bare `list` — the
  CLI's own help states that both `--kv` and `--json` print raw values), `printenv`,
  `env`, and reading any `.env` by any tool or alias. **To check existence**, read names
  or presence. **To use a value**, inject it with `railway run <cmd>` — the value enters
  the child process and never the transcript. **To compare values**, compare SHA-256
  digests, first 12 characters, both sides. Earned twice: a `--kv` invocation put a live
  Postgres credential into four session transcripts, and a `.env` grep matching key
  *names* printed a live API key and a Fernet key while establishing that nothing had
  been printed. `.claude/settings.json` carries deny patterns as a second layer; it is a
  speed bump, not the enforcement — this instruction is (DECISIONS_LOG #111).
- **Branch disposition (patch-id, never SHA).** Merged-vs-pending is decided by
  `git cherry origin/master <branch>` (`-` = patch-upstream, delete; `+` = real work),
  never `merge-base`/`rev-list` — rebase/squash merges rewrite SHAs and make ancestry lie.
  Every branch not master lives in `BRANCHES.md` (repo root) until merged+deleted.
  Install once (git `!` aliases run in git's own sh; the invocation is single-line
  PowerShell-safe):
  `git config --global alias.stale '!f() { git fetch origin -q; git cherry origin/master "${1:-HEAD}"; }; f'`
  `git config core.hooksPath .githooks`  (per clone, not global — the hook is repo-versioned)
  **`stale` is global because disposition is an invariant — every repo decides it the same
  way. The merging alias is not here, and is no longer global.** How a branch *reaches*
  master depends on enforcement config that exists in one repo and not another, so it is
  repo-local by the boundary criterion above, and a `--global` alias cannot hold two bodies.
  Each repo defines its own `land` with `git config --local` and documents it below its own
  `END SHARED LOOP RULES`. **Repo-local config is NOT cloned**, so that alias joins
  `core.hooksPath` as per-clone setup a fresh checkout silently lacks — two unversioned things,
  both absent by default, neither of which announces itself. Every repo lists its full
  fresh-clone setup below its own `END SHARED LOOP RULES`; do not assume a clone is configured
  because the repo is. Disposition, the ledger, and the terminal-state gate are unchanged by
  this and remain shared.
- **Branch naming & reuse.** One branch per concern, concern-named
  (`fix/validatenight-dedup`), reused across sessions until merged. Claude Code
  `claude/<session-hash>` auto-names are banned for in-flight work — they spawn duplicates.
- Full behavioural corrections live in `FEEDBACK.md`. Full decision history lives in
  `DECISIONS_LOG.md`. This file points at them; it does not duplicate them.

## END SHARED LOOP RULES — repo-specific below

<!-- ════════════ END SHARED LOOP RULES ════════════ -->

---

## Fresh-clone setup — health-connect-app

**Two commands, both per-clone, neither cloned with the repo.** A fresh clone has the guard
files in the tree and no enforcement wired to them until these run:

```powershell
git config core.hooksPath .githooks
git config --local alias.land '!f() { b=$(git branch --show-current); case $b in master|main) echo land: refusing, not on a work branch; exit 1;; esac; gh pr merge --merge --delete-branch; }; f'
```

`stale` stays global and unchanged. `land` is **repo-local** because one global body cannot
hold both repos' motions — see the `land` decision below and health-app `#171`. Verify with
`git config --local --get alias.land`; the bare `git config --get` cannot tell a local value
from a stale global one and is not a control (health-app `#103`).

**Why the `case` guard (not a bare `gh pr merge`).** `gh pr merge` finds the PR for the
*current* branch; run from `master` it operates on no branch of ours and does nothing. The
guard makes `land` from `master`/`main` refuse loudly and deterministically (exit 1, explicit
message) instead of leaning on `gh`'s own exit code, which is version-dependent — gh 2.93.0
returns exit 1 with `no pull requests found`, so the exit-0 silent-success no-op the guard was
minted against does **not** reproduce here. The guard still earns its place as fail-fast
clarity, and it is version-independent; it does **not** cover the general no-PR-on-a-work-branch
case, which still falls through to `gh`. No embedded double quotes — a single-quoted
PowerShell string containing `"` reaches `git` split across arguments (project rule).

### Merge path — CI-guarded, not yet CI-gated

Enforcement here spans three layers and **two of them are absent**:

| Layer | State |
|-------|-------|
| `core.hooksPath .githooks` (pre-push hook) | per-clone, set in this clone |
| `.github/workflows/governance-guard.yml` | in the tree since `#24`; both arms run |
| ruleset requiring `placeholder guard (POSIX)` | **absent** — `gh api repos/Easty11/health-connect-app/rules/branches/master` returns `[]` |

So the PR arm **reports and does not block**, `push: [master]` is detection after the fact,
and `git push origin master` still succeeds. That is why `Q12` is OWED rather than DONE. The
`land` body above is nonetheless already the PR motion, **because the ordering is not
optional**: setting the ruleset first would refuse the direct-push motion this file used to
document, on an alias then shared machine-globally with health-app. Alias first, ruleset
second.

**`--merge`, never `--squash` or `--rebase`, and never `--auto` or `--admin`** — same
reasoning as health-app `#171`: `BRANCHES.md` rows record landing SHAs, and squash or rebase
rewrites them into objects unreachable from master; `--auto` queues a merge instant you do
not hold, which cannot satisfy number-at-merge.

---


## What this repo is

The **Expo React Native (Android-first) companion app** for the health
intelligence platform. Its job is data acquisition on-device and getting
clean physiological signal off the phone and into the backend event spine.

It is **not** the backend (`health-app`) and **not** the analytics layer.
Connectors, sync, and on-device capture live here; algorithms do not.

---

## Two-mode split (hard boundary)

- **Claude chat** — architecture, algorithm design, knowledge-file *content*,
  PowerShell commands. Proposes. **Never commits.**
- **Claude Code CLI** — all codebase changes. The only actor that writes to
  the working tree and commits.

The commit is the only sync point between the two modes. If it isn't
committed, the other mode cannot see it and it does not exist.

---

## Repo-specific canonical stores (HCA additions to the shared table)

| File | Holds |
|------|-------|
| `CLAUDE.md` | This contract. Conventions, architecture invariants. |
| `closeout.md` | The single committed cold-resume handoff. Overwritten each `/closeout`. |

In this repo, `OPEN_QUESTIONS.md` additionally tracks machine-checkable
code-state defects (PENDING until resolved into a decision or a fix), and
`FEEDBACK.md` is the friction log on the workflow and on Claude's behaviour.

---

## Architecture invariants (do not violate without a logged decision)

- **Raw physiological signals only.** No proprietary composite scores
  (Body Battery, Energy Score, etc.) as inputs. Every signal traces to a
  measurable mechanism.
- **Samsung Health accessibility scraper is the permanent HRV path.**
  Samsung Ring HRV does **not** flow through Health Connect. The scraper is
  not a stopgap — it is the architecture.
- **Health Connect is the bridge for non-Samsung sources** only.
- **Device agnosticism.** A `source` field abstracts hardware. App code never
  couples an algorithm to a device-specific schema.
- **Verify before you build on it.** A signal enters design only with proof it
  works — a confirmed test, a verified query, or official docs. "The API has a
  field for it" is not proof.
- **Infer → surface → confirm.** Never write a confident-but-unverified
  reconstruction into a source of truth.

---

## Environment

- **Windows / PowerShell.** Linux idioms do not work here: no backslash line
  continuation, no `head`/`tail`, no inline `*` globbing the way bash does.
- For DB queries, **write a Python script to a file** via
  `Out-File -Encoding utf8` and run it — don't fight inline quoting.

---

## The closeout ritual

- **`/closeout`** (Code slash command) — reads the canonical stores, reports
  actual commits via `git log`, reconciles the pending queue, regenerates the
  handoff, overwrites the single `closeout.md`, and commits it.
- **`;cc`** (Espanso, system-wide) — fires the chat-side closeout: emits a
  pending-commit queue in canonical format flagged PENDING. Writes nothing.
- **`/compact`** is context compression, **not** a closeout. Different thing.

A session is not done until `/closeout` has run and committed.
