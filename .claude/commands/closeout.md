---
description: Code session close-out — reconcile stores, regenerate ROADMAP sprint block, write + commit closeout.md
allowed-tools: Bash(git*), PowerShell, Read, Edit, Write, Glob, Grep
---

# /closeout — Code session close-out (health-connect-app)

Close out this Code session per the contract in `CLAUDE.md`. This is **not** `/compact`
(that is mid-session context compression). Trust the canonical stores over any pasted
summary; if a summary contradicts `CLAUDE.md`, `CLAUDE.md` wins.

---

## ANCHOR — run this first

**PRECONDITIONS** — the state `/closeout` needs, and how to reach it. A failure here is a
step to take, not a reason to halt:
- Rooted in `health-connect-app` (the one thing that cannot be fixed from inside; see the hard stop below).
- On a work branch or `master`, fetched (`git fetch origin`), tree clean or holding only
  close-out artifacts.
- `core.hooksPath` → `.githooks` and the repo-local `land` alias set (the fresh-clone
  commands in `CLAUDE.md`).
- `gh api` reachable (REST form; GraphQL may be blocked in a cloud session).

**HARD STOPS** — the only failures that abort. There is one: **wrong repo**.

```powershell
$root = git rev-parse --show-toplevel
if ($root -notmatch '[/\\]health-connect-app$') {
    throw "WRONG REPO: $root — /closeout aborted."
}
git branch --show-current   # confirm work branch or master
```

If the root does not end in `\health-connect-app`, **stop immediately**. Do not write
anything. Report the actual root and ask the user to switch to the correct repo. Every other
precondition is met by acting on it (checkout, fetch, configure), not by stopping.

---

## Steps — execute in order, each gates the next

### 1. Read the canonical stores

Read all of these before writing anything:

| Store | Holds |
|-------|-------|
| `DECISIONS_LOG.md` | Append-only decision record |
| GitHub Issues | Undecided forks, unknowns awaiting measurement, watch-points; typed by label |
| `docs/design/` | Architecture-scale design docs (`**State:**` ideation / discussion / committed / abandoned) |
| `ROADMAP.md` | Forward work + current sprint block (Code-owned) |
| `FEEDBACK.md` | Friction log on workflow and Claude behaviour |
| `CLAUDE.md` | Contract — conventions, architecture invariants |

Issues, in the REST form that works in a cloud session (`gh` substitutes `{owner}/{repo}`
from the current repo; GraphQL is blocked there):

```powershell
gh api "repos/{owner}/{repo}/issues?labels=fork&state=open" --jq ".[] | \"GH#\(.number) \(.title)\""
gh api "repos/{owner}/{repo}/issues?state=all&since=<session-open-iso>" --jq ".[] | select(.pull_request == null) | \"GH#\(.number) \(.state) \(.title)\""
```

The first lists the open `fork` issues; the second, the issues touched this session.

### 2. Report actual commits this session

Determine the session-open ref (first commit of this session; use `git reflog` if
ambiguous) and run:

```powershell
git log --oneline <open-ref>..HEAD
```

Report **real commit hashes and messages only** — never suggested or hypothetical.
If no commits were made this session, say so plainly.

### 3. Reconcile the PENDING queue

For each `PENDING` item carried in from the chat close-out (`;cc`), either:
- **Confirm** it landed — cite the commit hash.
- **State explicitly** why it did not — it remains provisional.

Anything decided but uncommitted is provisional. The commit is the only sync point.

### 4. Branch terminal-state gate

Every branch touched this session must end in a terminal state:
- **merged+deleted**, or
- **listed in `BRANCHES.md`** (repo root) with its purpose and a Status from the
  State-vocabulary section of `CLAUDE.md`, carrying whatever that section requires
  of the Status assigned.

Confirm merge status with `git cherry origin/master <branch>` (patch-id, never
SHA — rebase/squash merges rewrite SHAs and make ancestry lie). The gate
enumerates local branches (`git branch`) as well as `refs/remotes/origin`; a local
branch with `+` commits vs `origin/master` must be pushed, rowed in `BRANCHES.md`,
or discarded before close. If any touched branch is in undefined limbo — neither
merged+deleted nor rowed in `BRANCHES.md` — **HALT** before writing `closeout.md`
and resolve it first.

**Sweep the open rows too (health-app `Q138`).** Not only this session's branches: for every
`OWED` or `BLOCKED` `BRANCHES.md` row, check that the named branch exists on `origin`
(`git ls-remote --heads origin <branch>`) and whether its work is on master
(`git cherry origin/master <branch>` all `-`, or the row's SHA is an ancestor of master).
List the rows that are landed-but-unflipped, and flip them in this same close-out.

### 5. Regenerate the ROADMAP.md sprint block

Update the `## Sprint block` section of `ROADMAP.md` to reflect what landed this
session. Rules:
- Completed items → checked off or removed from the sprint block.
- New work surfaced this session → added to the appropriate Q-section.
- Never edit past entries in `DECISIONS_LOG.md` — append only.
- Use `Edit` to overwrite only the sprint block section, not the full file.

> **DB queries:** write a Python script via `Out-File -Encoding utf8` and run it.
> Do not fight inline PowerShell quoting against the DB connection string.

### 6. Write closeout.md and commit

**Overwrite** `closeout.md` (single file, root of repo, lowercase) with exactly three
sections:

```
## Commits this session
<real git log output>

## PENDING reconciliation
<item-by-item: landed (hash) or still provisional>

## Cold-resume handoff
<current sprint state · open `fork` issues (step 1 REST form) and design docs not in a terminal state · single clearest next action>
```

`closeout.md` is the **sole sink** for the close-out body — write it verbatim to the
file. To stdout print **only a terse pointer**: path, branch, single next action, and
the filenames of governance stores changed this session (`DECISIONS_LOG` /
`ROADMAP` / `FEEDBACK` / `docs/design/`; names only, never contents).
Do **not** emit governance-store text — pre-merge copy-back is `cat`/open of the
changed store file on disk.

**Never append.** Never narrate the act of writing the close-out. Never include a
"suggested commits" list.

Then commit:

```powershell
git add closeout.md ROADMAP.md   # add DECISIONS_LOG.md / FEEDBACK.md if updated
git commit -m "chore: session close-out"
```

If the tree has unrelated uncommitted work, commit **only** the close-out artifacts.

---

## Hard rules

- **Real `git log` output only** — not aspirational messages.
- **Windows / PowerShell syntax** in any commands you emit.
- **Code is the only writer** — this command may commit; chat may not.
- **Write nothing to project knowledge** (Claude.ai project files).
- **The HARD STOP must not trip** before any write — wrong repo aborts unconditionally.
