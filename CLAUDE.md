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

### The loop (source-of-truth model)

- The **repo is the single source of truth** for all volatile state.
- **Code — and the `@claude` GitHub Action — is the only writer.**
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

Four states, exhaustive, no fifth. Applies to `BRANCHES.md` Status, `OPEN_QUESTIONS.md`,
`ROADMAP.md`, and close-outs.

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

### DECISIONS_LOG discipline

Preserve the existing entry format:

> **Decision · Rationale · Status · How you know · Do not revisit unless**

- Append-only. To change a decision, add a new entry that supersedes the old one by
  number. Do not edit a locked entry's text — the history is the point.
- Every decision that gates code carries a **How you know** artifact: a confirmed test, a
  verified search result, or official documentation. "The API has a field for it" is
  insufficient. Founding rule, earned from the HRV pipeline failure.
- **Number-at-merge.** On a branch, a new entry is headed `### #NEXT`. The integer is
  claimed only when the governance commit fast-forwards to master (next sequential at that
  instant). Eliminates the two-branches-both-claim-#N collision and the
  renumber-on-`--ff` dance.

### Session rituals (the contract the close-outs conform to)

The trigger is not the payload. The payload is defined here; the snippet/command bodies
must match it.

- **Session open** — at session start, before acting on any brief, Code reports the current
  `DECISIONS_LOG.md` max decision number (matching the file's actual `###` heading format).
  Chat re-aims any brief against it, so a stale project copy never masquerades as canon.
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
- **Branch disposition (patch-id, never SHA).** Merged-vs-pending is decided by
  `git cherry origin/master <branch>` (`-` = patch-upstream, delete; `+` = real work),
  never `merge-base`/`rev-list` — rebase/squash merges rewrite SHAs and make ancestry lie.
  Every branch not master lives in `BRANCHES.md` (repo root) until merged+deleted.
  Install once (git `!` aliases run in git's own sh; the invocation is single-line
  PowerShell-safe):
  `git config --global alias.stale '!f() { git fetch origin -q; git cherry origin/master "${1:-HEAD}"; }; f'`
  `git config --global alias.land '!f() { b="${1:-$(git branch --show-current)}"; git checkout master && git merge --ff-only "$b" && git push origin master && git branch -d "$b" && git push origin --delete "$b"; }; f'`
- **Branch naming & reuse.** One branch per concern, concern-named
  (`fix/validatenight-dedup`), reused across sessions until merged. Claude Code
  `claude/<session-hash>` auto-names are banned for in-flight work — they spawn duplicates.
- Full behavioural corrections live in `FEEDBACK.md`. Full decision history lives in
  `DECISIONS_LOG.md`. This file points at them; it does not duplicate them.

## END SHARED LOOP RULES — repo-specific below

<!-- ════════════ END SHARED LOOP RULES ════════════ -->

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
