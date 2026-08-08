#!/usr/bin/env python
"""Refuse to let an unresolved governance placeholder reach master.

Number-at-merge says a new entry is headed `### #NEXT` on a branch and claims its
integer when the governance commit fast-forwards. Nothing enforced the second half. The
placeholder rode master for three sessions: `feat/hub-shell` merged with its heading
still reading `#NEXT`, #163 and #164 were then minted on top of it, and #162 became a
hole in the canonical store. The fix kept being written on branches that did not merge.

WHY A REF CHECK AND NOT A `git land` GUARD. The merge that finally healed it was done by
hand — `git checkout master && git merge --ff-only && git push` — not through the `land`
alias. A guard living only in that alias would not have fired for it, which is the whole
failure mode: the placeholder reaches master by whichever path is convenient that day.
So the check runs against the ref being pushed.

WHICH SURFACES ACTUALLY RUN THIS — health-connect-app's three, and none of them is the
`land` alias. An earlier version of this docstring claimed "the alias calls the same
script"; it never did. HCA's `land` is `gh pr merge --merge --delete-branch`, a
server-side merge that invokes nothing in this file. The real set, each verified from
this tree or the GitHub API:

  * `.githooks/pre-push` — client-side, per clone (`git config core.hooksPath .githooks`,
    confirmed set here). Guards `refs/heads/master` and `refs/heads/main` only. Live on
    Windows — a real push to master was refused with zero transfer lines at
    `DECISIONS_LOG.md:823` (`#28`) — and on Linux, the `#24` execution arm exiting 126.
    `git push --no-verify` bypasses it; `gh pr merge` never invokes it.
  * `.github/workflows/governance-guard.yml` — `#24`, the job `placeholder guard (POSIX)`.
    Runs on `pull_request` (step 2c is `--ref HEAD`, the merge commit that would land) and
    on `push` to master. Covers the server-side ref updates a client hook structurally
    cannot see.
  * Ruleset `20573455` (`master-pr-gated`) — makes the PR arm binding by requiring the
    `placeholder guard (POSIX)` context and refusing every non-PR route to master.
    `bypass_actors` is `[]` and `current_user_can_bypass` is `never`, so it binds the repo
    owner too; a real push to master was refused `GH013`, naming both rules and the
    required context by exact string.

A green run is evidence this script passed, never evidence the layers are installed — two
of the three are unversioned config a `git diff` cannot see (`core.hooksPath` per clone,
the ruleset per repo). Check them directly:
`gh api repos/Easty11/health-connect-app/rules/branches/master` must be non-empty.

Exit 0 = clean. Exit 1 = a placeholder would reach master. Exit 2 = the check itself
could not run (missing file, bad ref) — never silently pass, because a check that cannot
run is not a check that passed.

Usage:
    python scripts/check_governance_placeholders.py              # working tree
    python scripts/check_governance_placeholders.py --ref HEAD   # a commit
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

# Anchored, never a bare substring (#113): a corrected entry legitimately QUOTES the
# token it superseded, and several do. Anchoring on the heading form means prose about
# the convention — CLAUDE.md's own rule text, #148's entry, historical BRANCHES rows —
# is not a false positive, and the matches are printed so they are read, not counted.
#
# HEADING LEVEL IS TOLERATED, HEADING FORM IS NOT. This script is one implementation of
# one rule across every repo in the project, so it must match each repo's grammar. The
# two stores do not agree on level: `health-app/OPEN_QUESTIONS.md` heads a question `##
# Q77.` while `health-connect-app/OPEN_QUESTIONS.md` heads it `### Q8 — …  ·  OWED`
# (verified against both trees 2026-08-04). A `^## Q#NEXT`-only pattern therefore reads
# HCA as permanently clean — installed, green, and blind, which is worse than absent
# because the next session stops checking by hand. `{2,3}` covers both without loosening
# the anchor: the token must still open a heading. Decision headings are `### ` in both
# repos today; the level is generalised there too so the two arms cannot drift apart.
CHECKS = [
    ("DECISIONS_LOG.md", re.compile(r"^#{2,3} #NEXT\b.*$", re.M), "a #NEXT decision heading"),
    ("OPEN_QUESTIONS.md", re.compile(r"^#{2,3} Q#NEXT\b.*$", re.M), "a Q#NEXT question heading"),
]


def read(path: str, ref: str | None) -> str:
    # Capture BYTES and decode explicitly here. Never let subprocess decode in text
    # mode inside a reader thread: a UnicodeDecodeError there kills the thread, leaves
    # git's returncode at 0, and returns a non-string a returncode check cannot catch.
    # Route every path that yields no checkable content to exit 2 — the contract above:
    # a check that cannot run is not a check that passed.
    if ref is None:
        p = Path(path)
        if not p.exists():
            print(f"check-placeholders: cannot read {path}", file=sys.stderr)
            sys.exit(2)
        raw = p.read_bytes()
        where = path
    else:
        r = subprocess.run(["git", "show", f"{ref}:{path}"], capture_output=True)
        if r.returncode != 0:
            err = r.stderr.decode("utf-8", "replace").strip()
            print(f"check-placeholders: cannot read {path} at {ref}: {err}",
                  file=sys.stderr)
            sys.exit(2)
        raw = r.stdout
        where = f"{path} at {ref}"
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        print(f"check-placeholders: {where} is not valid UTF-8: {e}",
              file=sys.stderr)
        sys.exit(2)
    if not text.strip():
        print(f"check-placeholders: {where} is empty or whitespace-only "
              f"(a governance store is never legitimately empty)", file=sys.stderr)
        sys.exit(2)
    return text


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default=None,
                    help="git ref to check; omit to check the working tree")
    args = ap.parse_args()

    offences: list[str] = []
    for path, pattern, label in CHECKS:
        text = read(path, args.ref)
        for m in pattern.finditer(text):
            line_no = text.count("\n", 0, m.start()) + 1
            offences.append(f"  {path}:{line_no}  {m.group(0)[:100]}")

    if not offences:
        return 0

    where = args.ref or "the working tree"
    print(f"\nREFUSED: unresolved governance placeholder in {where}.\n",
          file=sys.stderr)
    print("\n".join(offences), file=sys.stderr)
    print(
        "\nNumber-at-merge: claim the integer ON THE BRANCH, before the fast-forward,"
        "\nre-reading master's max at that instant. Resolve every token the branch"
        "\nintroduced (#148 — classified, not counted) and leave every token it did not."
        "\n\nAudit after resolving:"
        "\n  python scripts/check_governance_placeholders.py"
        "\n\nThis check exists because the placeholder reached master three sessions"
        "\nrunning and left a permanent hole at #162.\n",
        file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
