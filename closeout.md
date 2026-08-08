# closeout — health-connect-app

**Session:** 2026-08-04 → 2026-08-08 · governance (guard propagation → CI surface → block
re-mirror → gate closed). Span taken from the repo's dated record, not asserted: 5 / 1 / 5 / 15
commits across 08-04, 08-05, 08-07, 08-08.
**Branch:** `master` · landed `5bfefa4` · `master == origin/master`
**Session-open ref:** `36a8444` · 26 commits

**Supersedes the close-out at `5076dec`**, which headered `9b5663b`. That one was written
before the ruleset existed and before `Q12` closed; seven commits have landed since. This file
is the single sink, so the earlier body is replaced rather than appended to.

## Commits this session

Leg since the previous close-out (`5076dec..HEAD`):

```
5bfefa4 GitHub          Merge pull request #16 from Easty11/gov/close-q12
0436994 Luke Eastlake   gov: #28 quote the real refusal output from both layers
059d62a Luke Eastlake   gov: resolve #NEXT -> #28 (on-branch, pre-merge)
2c810f5 Luke Eastlake   gov: row the control branches Q12's evidence cites
2d892f9 Luke Eastlake   gov: #NEXT close Q12 on three verified layers; ruleset 20573455 live
5459886 GitHub          Merge pull request #15 from Easty11/control/ruleset-merge-gate
754b9b7 Luke Eastlake   CONTROL ONLY - merge gate
```

`754b9b7` / `5459886` are the operator's own merge-gate control, not Code's work — recorded
here because they are on master and the gate proof in `#28` builds on them.

Earlier legs (`36a8444..5076dec`, 19 commits) are unchanged from the superseded close-out:
`f2fb3ef` → `5076dec`, covering `#22`–`#27`, `Q12`–`Q14`, and the CI propagation.

Repo's own dated record (`git log --format="%ad %s" --date=short -10`), verbatim:

```
2026-08-08 Merge pull request #16 from Easty11/gov/close-q12
2026-08-08 gov: #28 quote the real refusal output from both layers
2026-08-08 gov: resolve #NEXT -> #28 (on-branch, pre-merge)
2026-08-08 gov: row the control branches Q12's evidence cites
2026-08-08 gov: #NEXT close Q12 on three verified layers; ruleset 20573455 live
2026-08-08 Merge pull request #15 from Easty11/control/ruleset-merge-gate
2026-08-08 CONTROL ONLY - merge gate
2026-08-08 chore: session close-out
2026-08-08 gov: BRANCHES terminal state for gov/block-remirror (DONE 3bd196d)
2026-08-08 gov: BRANCHES row for gov/block-remirror
```

## PENDING reconciliation

No `;cc` pending-commit queue was carried in. Work arrived as five chat→Code briefs, each
adjudicated against the tree rather than applied.

**Briefs 1 and 3 (HCA propagation; Brief B) — LANDED.** Reconciled in the superseded
close-out; unchanged. `#22`–`#27`, `Q13`, `Q14`, `Q8`/`Q11` closed.

**Brief 2 (health-app CI) — NOT DONE HERE, correctly.** ANCHOR required a health-app root;
this session is HCA-rooted. HALTED without writing. The work was already on health-app master
as `#170`. Step 1's finding, reported not guessed: no `@claude` Action exists in either repo.

**Brief D (health-app checker exit-contract) — NOT DONE HERE, correctly.** Same halt, same
reason. Two read-only findings handed back rather than acted on:
- D's step 2 rationale is **falsified**: docstring-stripped bodies are *not* identical —
  `8477d608…` (health-app) vs `174277e7…` (HCA), both 78 lines, differing by one advisory
  string in `main()`. `read()` itself is byte-identical, so the exit-contract analysis
  transfers; the halt condition was keyed on the wrong thing.
- D's step 6 strike list is **two sentences, not one**: the parenthetical
  `(id 20414758, health-app only)` is the same defect and would have survived a strike aimed
  at the first sentence.

**`Q12` closure (this leg) — LANDED, `#28`, merged `5bfefa4` via PR #16.**
- Closed on **three verified layers**, not "the ruleset and nothing else" — `#27` had already
  amended that wording once, and closing on it again would repeat the error the amendment
  exists to record.
- Control branches rowed — `2c810f5`.
- Deviation, deliberate: `gov/close-q12` itself is **not** rowed. Merged+deleted, which the
  gate permits; flagged under `Q6` rather than resolved unilaterally.

## Cold-resume handoff

**Sprint state.** Seven decisions minted (`#22`–`#28`), three questions minted (`Q12`–`Q14`),
three closed (`Q8`, `Q11` → `#26`; `Q12` → `#28`). **All three enforcement layers are live in
this repo for the first time**, and health-app and HCA are symmetric in enforcement for the
first time.

| Layer | State | Does not cover |
|---|---|---|
| `.githooks/pre-push` via `core.hooksPath` | set in this clone | unconfigured clones, runners, the merge button |
| `.github/workflows/governance-guard.yml` | in tree since `#24`, both arms | prevents nothing on its own |
| ruleset `master-pr-gated` (`20573455`) | active, `bypass_actors: []`, strict | itself — deletion or one bypass actor is silent and leaves runs green |

**Two of the three still have no diff.** A green run is evidence the script passed, never
evidence the layers are installed. Live checks:
`gh api repos/Easty11/health-connect-app/rules/branches/master` non-empty, and
`git config --get core.hooksPath` returning `.githooks`.

**The through-line.** Five of the seven entries are one defect: a statement true at one instant
carried forward as a fact about now — `Q12`'s misattributed agent, `#24`'s inherited header,
`#25`'s encoding, G1's "still discharged", and this file's own first draft stamping a date from
memory. `#26` writes the general form: record *"discharged at `<md5>`"*, never *"discharged."*

**Open questions.** `Q13` OPEN (question-state axis vs the four work-states; lossy mapping, so a
judgement not a reformat) · `Q14` OPEN (shared block is the last surviving site of `parked` in
either repo; paired with health-app `Q33`) · `Q4` BLOCKED (day-lag) · `Q7` OWED · `Q6` UNSTARTED
(retain DONE rows — now load-bearing, five added this session and one branch left unrowed on the
gate's permission) · `Q9` item 1 · `Q10` UNSTARTED.

**Branch gate.** Six work branches and four control branches all terminal. `feat/hrv-node-dump`
(BLOCKED, `+1`) and `fix/hrv-capture-regression` (UNSTARTED, `+4/-1`) rowed, pushed, neither
touched. PR #2 (June) still open against the latter. Nothing in limbo. Guard exits 0 against
`origin/master`; no `#NEXT` in either store.

**Owed to health-app, not actionable from here.** Brief D in full; the shared block's `parked`
(paired with `Q33`); FEEDBACK §14's next occurrence (`259 / 18757` asserted vs `259 / 18717`
measured); and two stale cross-repo claims in health-app — its repo-specific section says HCA
has no `.github/workflows`, and its checker docstring says HCA has the hook only, both false
since `6483d19` and `20573455`.

### Single clearest next action

**Governance is at a stopping point.** Next action is product, not governance: watch ONE real
overnight/~5am sync land today's HRV value in Railway — Postgres query against Railway, not
on-device UI — on the standalone release build. That resolves **Q4**, the only BLOCKED row in
the repo, and unblocks `feat/hrv-node-dump`.

Still owed from before: rotate the Hevy API key, exposed in a chat transcript 2026-07-11.
