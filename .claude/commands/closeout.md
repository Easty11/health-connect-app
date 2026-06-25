---
description: Code session close-out — reconcile stores, regenerate ROADMAP sprint block, write + commit closeout.md
allowed-tools: Bash(git*), PowerShell, Read, Edit, Write, Glob, Grep
---

# /closeout — Code session close-out (health-connect-app)

Close out this Code session per the contract in `CLAUDE.md`. This is **not** `/compact`
(that is mid-session context compression). Trust the canonical stores over any pasted
summary; if a summary contradicts `CLAUDE.md`, `CLAUDE.md` wins.

---

## ANCHOR — run this first, stop if it fails

```powershell
$root = git rev-parse --show-toplevel
if ($root -notmatch '[/\\]health-connect-app$') {
    throw "WRONG REPO: $root — /closeout aborted."
}
git branch --show-current   # confirm feat branch or master
```

If the root does not end in `\health-connect-app`, **stop immediately**. Do not write
anything. Report the actual root and ask the user to switch to the correct repo.

---

## Steps — execute in order, each gates the next

### 1. Read the canonical stores

Read all four in full before writing anything:

| File | Holds |
|------|-------|
| `DECISIONS_LOG.md` | Append-only decision record |
| `ROADMAP.md` | Forward work + current sprint block (Code-owned) |
| `FEEDBACK.md` | Friction log on workflow and Claude behaviour |
| `CLAUDE.md` | Contract — conventions, architecture invariants |

Open questions live in `ROADMAP.md`'s work queue (Q2–Q5 sections). There is no
`OPEN_QUESTIONS.md` in this repo.

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

### 4. Regenerate the ROADMAP.md sprint block

Update the `## Current Sprint` section of `ROADMAP.md` to reflect what landed this
session. Rules:
- Completed items → checked off or removed from the sprint block.
- New work surfaced this session → added to the appropriate Q-section.
- Never edit past entries in `DECISIONS_LOG.md` — append only.
- Use `Edit` to overwrite only the sprint block section, not the full file.

> **DB queries:** write a Python script via `Out-File -Encoding utf8` and run it.
> Do not fight inline PowerShell quoting against the DB connection string.

### 5. Write closeout.md and commit

**Overwrite** `closeout.md` (single file, root of repo, lowercase) with exactly three
sections:

```
## Commits this session
<real git log output>

## PENDING reconciliation
<item-by-item: landed (hash) or still provisional>

## Cold-resume handoff
<current sprint state · open questions from ROADMAP · single clearest next action>
```

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
- **ANCHOR must pass** before any write — wrong repo aborts unconditionally.
