# CLAUDE.md — health-connect-app

Operating contract for this repo. Read this first on every cold resume.
If `closeout.md` exists, read it second — it is the live handoff.

---

<!-- ════════════ BEGIN SHARED LOOP RULES ════════════ -->

## Shared loop rules — edit in `health-app`, propagate verbatim

Identical across all repos in this project. Edit only here; copy verbatim into each other
repo's CLAUDE.md. Before copying, verify any grammar-dependent line (regex counts, store
paths) against the destination's actual file shape — if the source line is wrong for the
destination, fix it here first, then copy. Never hand-merge, never edit a copy in place.

Rules whose correctness depends on unversioned config (CI checks, local aliases) are
repo-specific and live below END SHARED LOOP RULES in their own repo.

### The loop
- The repo is the single source of truth for all volatile state.
- Code is the only writer. Chat proposes; chat never commits.
- The commit is the only sync point. An uncommitted decision is provisional.
- Read-back: repo → chat via Projects mirror or attach. Chat keeps no editable copy.
- Kill-rule: decisions, open questions, roadmap, task state never live in project
  knowledge — orientation docs only.

### The unseeable-surface rule
Chat can verify only what is on a pushed ref. Any brief statement about a surface chat
cannot read (UI knowledge files, unpushed branches, local disk, Railway state) is an
INSTRUCTION TO VERIFY, never a report of fact. Verify or STOP; never land on it.

### Canonical stores
| Store | Holds | Discipline |
|-------|-------|-----------|
| `DECISIONS_LOG.md` | Architecture decisions | Append-only; supersede by new entry, never edit locked text. |
| `OPEN_QUESTIONS.md` | Undecided forks | One `**State:**` per item: OPEN / OWED / DONE → #N. |
| `ROADMAP.md` | Current sprint + horizon | Mutable; Code updates at close-out. |
| `FEEDBACK.md` | Behavioural corrections, condensed verification rules | Read at session start. |
| `FEEDBACK_ARCHIVE.md` | Full provenance essays | NOT read at session start. |
| `ptb-tasks` (external) | Task status | Referenced by ID, never mirrored in. |
| pending-commit queue | Chat → Code handoff | Transient; emitted at chat close-out, consumed at Code open. |

Stays in project knowledge, never in the repo: `Clinical_Protocol`, `Athlete_Profile`,
lab PDFs, `Stack`, `API_CONTRACTS`, `Hevy_Pattern`, `Readiness_Algorithm`.

### State vocabulary
Work items: DONE (landed, SHA named) · BLOCKED (names blocker + owner) · OWED (settled,
loop-close named) · UNSTARTED. No "in progress". Questions (`OPEN_QUESTIONS.md` only):
OPEN · OWED · DONE → #N, under the label `**State:**`.

### DECISIONS_LOG discipline
- Entry format: **Decision · Rationale · Status · How you know · Do not revisit unless**.
- Append-only. Every code-gating decision carries a How-you-know artifact (confirmed test,
  verified search, official doc).
- Number-at-merge: entries on a branch are headed `### #NEXT`; resolve the integer by
  re-reading master's max immediately before landing, re-resolve if master advances.
  Enforced by `scripts/check_governance_placeholders.py` via the repo hook
  (`git config core.hooksPath .githooks`, once per clone).

### Session rituals
- **Open:** report both maxima — decisions `^### #?[0-9]+`, questions `^#{2,3} Q[0-9]+`
  (period-, sigil- and level-agnostic; the pinned forms return zero on one repo or the
  other). Chat re-aims any brief against these.
- **Chat close-out (`;cc`):** emits the pending-commit queue as canonical-format entries
  flagged PENDING. Writes nothing to project knowledge.
- **Code close-out (`/closeout`):** reads the stores; reports actual commits
  (`git log --format="%ad %s" --date=short -10`); reconciles every PENDING item;
  branch terminal-state gate — every touched branch ends merged+deleted or in
  `BRANCHES.md`, else HALT.

### Project-wide standing rules
- Windows / PowerShell only for operator commands. No Linux syntax. Avoid embedded double
  quotes in arguments (PowerShell strips them handing to native exes — fails with a
  misleading error). Exercise operator commands in PowerShell, not the Bash tool.
- Verify before design — data paths end-to-end first.
- Empirical specificity: record the exact pathway and payload, never the generalised
  conclusion. A negative is only as broad as its recorded scope.
- Device-agnostic schema: all health data normalised to source- and confidence-tagged
  schema before any algorithm layer.
- Data verification = Postgres query against Railway, not on-device UI.
- **Secrets:** never run a command that renders a secret value — no `railway variables`
  in any form (`--kv`, `-k`, `--json`, the `variable` singular, or the bare `list` — all
  print raw values), no `printenv`/`env`, no reading `.env` by any tool. Check existence
  by names only; use values via `railway run <cmd>`; compare values via SHA-256 digests,
  first 12 chars. `.claude/settings.json` deny patterns are a speed bump; this rule is
  the enforcement (#111).
- Branch disposition by patch-id, never SHA: `git cherry origin/master <branch>`
  (`-` delete, `+` real work). Alias `stale` is global; each repo defines its own `land`
  locally and documents its fresh-clone setup below END SHARED LOOP RULES.
- One branch per concern, concern-named. `claude/<hash>` auto-names banned for
  in-flight work.
- **Severity gate on review:** raise as a gate only defects that change an outcome,
  corrupt data, leak a secret, or block the next step. Cosmetic, consistency, and
  wording defects batch into a single trailing "nits" note — never a reason to withhold
  a green-light or halt a land.
- **Governance batching:** at most one `gov(...)` commit per session, at close-out.
  Governance edits never interleave with feature work mid-session.
- Full corrections live in `FEEDBACK.md`; full history in `DECISIONS_LOG.md` and
  `FEEDBACK_ARCHIVE.md`. This file points at them; it does not duplicate them.

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

### Merge path — three enforcement layers, read live

Enforcement spans three layers. Two are unversioned config a `git diff` cannot see — a per-clone
hook and a per-repo ruleset — so their state is **not transcribed here; read it live** (`#184`,
`#33`). What a layer *does* is durable and stated; whether it is *installed* is a live read:

| Layer | What it does | Read it live |
|-------|--------------|--------------|
| `.githooks/pre-push` (client hook) | refuses a placeholder push to master before bytes leave the machine; guards `master`/`main` only, `--no-verify` bypasses | `git config --get core.hooksPath` returns `.githooks` when installed in this clone |
| `.github/workflows/governance-guard.yml` | server-side, on `pull_request` and `push: [master]`; job `placeholder guard (POSIX)` | versioned in the tree since `#24` |
| ruleset (branch protection) | requires a PR and the exact check, forbids non-fast-forward, binds the owner | `gh api repos/Easty11/health-connect-app/rulesets` — a `master-pr-gated` entry with `enforcement: active` and `bypass_actors: []` means the gate is on and a direct push to master is refused `GH013`; no such entry means it is off |

A green CI run is evidence the script passed, never evidence the layers are installed — the hook is
per clone, the ruleset is per repo, and only the workflow has a diff. Check them directly, above;
do not read installation state off a green run.

**Why the alias was already the PR motion before the ruleset was set.** `land` was made the
`gh pr merge` motion (`#27`) *before* the ruleset existed, and the order was not optional: a ruleset
refusing direct pushes to master would have broken the direct-push motion this file used to
document — on an alias then shared machine-globally with health-app. Alias first, ruleset second;
`#27` bore it out. (Reasoning retained and retensed to past — not a state claim.)

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
