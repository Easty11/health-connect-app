# closeout — health-connect-app

**Session:** 2026-08-04 → 2026-08-08 · governance (guard propagation → CI surface → block
re-mirror). Span taken from the repo's dated record, not asserted: 5 / 1 / 5 / 7 commits
across 08-04, 08-05, 08-07, 08-08. The first draft of this file stamped a single date from
memory and the `git log` block below contradicted it — which is the reason the contract
requires that block.
**Branch:** `master` · landed `9b5663b` · `master == origin/master`
**Session-open ref:** `36a8444`

## Commits this session

```
9b5663b gov: BRANCHES terminal state for gov/block-remirror (DONE 3bd196d)
3bd196d gov: BRANCHES row for gov/block-remirror
eeae58b gov: resolve #NEXT -> #26/#27, Q#NEXT -> Q14 (on-branch, pre-ff)
c0afce3 gov: DECISIONS_LOG #NEXT x2 — block re-mirror and land-is-repo-local
2a91aeb gov: repair four stale rows, mirror health-app Q33, re-row G1
9efdb89 gov: HCA land is repo-local; document fresh-clone setup and merge path
fffd314 gov: re-mirror the shared block from health-app (G1 breach, health-app ahead)
3add6b1 gov: BRANCHES terminal state for ci/placeholder-guard-hca (DONE 6483d19)
e3324ba gov: #25 repair the CRLF flip a bare CR caused in #24
6483d19 gov: resolve #NEXT -> #24 (on-branch, pre-ff)
6a86376 gov: #NEXT CI guard propagated to HCA; Q12 -> OWED pending the ruleset
983217c ci(gov): propagate #170's placeholder guard workflow to HCA
18841b7 gov: Q12 correct the agent — server-side ref updates, not the @claude Action
82a07da gov: BRANCHES row terminal state for gov/placeholder-guard-hca (DONE 78f460e)
b7e3bf5 gov: #23 track .githooks/pre-push 100755 — mode is part of a verbatim copy
78f460e gov: resolve #NEXT -> #22, Q#NEXT -> Q12/Q13 (on-branch, pre-ff)
db20852 gov: #NEXT placeholder guard in HCA; Q#NEXT CI gap, Q#NEXT question-state axis
f2fb3ef gov: propagate placeholder guard + post-Part-A shared block to HCA
```

Repo's own dated record (`git log --format="%ad %s" --date=short -10`):

```
2026-08-08 gov: BRANCHES terminal state for gov/block-remirror (DONE 3bd196d)
2026-08-08 gov: BRANCHES row for gov/block-remirror
2026-08-08 gov: resolve #NEXT -> #26/#27, Q#NEXT -> Q14 (on-branch, pre-ff)
2026-08-08 gov: DECISIONS_LOG #NEXT x2 — block re-mirror and land-is-repo-local
2026-08-08 gov: repair four stale rows, mirror health-app Q33, re-row G1
2026-08-08 gov: HCA land is repo-local; document fresh-clone setup and merge path
2026-08-08 gov: re-mirror the shared block from health-app (G1 breach, health-app ahead)
2026-08-07 gov: BRANCHES terminal state for ci/placeholder-guard-hca (DONE 6483d19)
2026-08-07 gov: #25 repair the CRLF flip a bare CR caused in #24
2026-08-07 gov: resolve #NEXT -> #24 (on-branch, pre-ff)
```

## PENDING reconciliation

No `;cc` pending-commit queue was carried into this session — work arrived as three
chat→Code briefs, each adjudicated against the tree rather than applied. Reconciled
item-by-item against what each brief asked for:

**Brief 1 (HCA propagation, Parts B & C) — LANDED.**
- Guard files copied byte-for-byte — `f2fb3ef`. Blob SHAs identical to health-app, which
  is stronger than the `diff` the brief asked for.
- Shared block copied verbatim, 155 → 215 — `f2fb3ef`.
- `core.hooksPath .githooks` installed; hook proven to fire by a synthetic both-arms
  refusal, not by its passes.
- `#22`, `Q12`, `Q13` — `db20852`, resolved `78f460e`.
- **Not in the brief, found by Code:** the hook landed mode 100644 — `#23`, `b7e3bf5`.

**Brief 2 (health-app CI) — NOT DONE HERE, and correctly so.**
Its ANCHOR requires a health-app root on `ci/placeholder-guard-action`; this session is
HCA-rooted on `master`. HALTED without writing. Independently, the work was already on
health-app master as `#170` (`0a6acf0` → `a9d52d3`), so building it would have minted a
second implementation. **Step 1's finding, reported not guessed:** there is no `@claude`
Action in either repo — `.github` appears in exactly one commit in health-app's history,
the CI commit itself. The real uncovered path is the web-UI merge button.

**Brief 3 (Brief B: block re-mirror, `land`, stale rows) — LANDED.**
- Precondition checked first: Brief A on health-app master (`#182` at `fb16336`).
- Block re-mirrored, `cmp` silent — `fffd314`.
- `land` set `--local`, verified with the discriminating form — `9efdb89`.
- Four stale rows repaired, `Q14` minted, G1 re-rowed — `2a91aeb`.
- `#26`, `#27` — `c0afce3`, resolved `eeae58b`.

**Amendments, all three answered:**
1. HCA-only content — **exactly the four lines predicted**, all deliberately replaced
   upstream. Nothing lost.
2. Vocabulary-neutral — **confirmed**; `parked` identical text on both sides. Not struck;
   rowed as `Q14`, the mirror of health-app `Q33`.
3. §14 occurrence 5 — **clears.** `08cc0b4` is 80 lines / 5205 B, matching `#21`'s record
   byte-for-byte; the 77 belongs to `35b4110`. Not a miscount, no return trip owed. The
   amendment aimed the check at HCA's closeout.md, which has never been 80.

**Deviation from a brief's wording, deliberate:** Brief 2's follow-up said the CI work
"closes Q12". It does not. `push: [master]` fires after the ref has moved — against the
merge button that is detection, not prevention. `Q12` is **OWED**.

## Cold-resume handoff

**Sprint state.** Six decisions minted (`#22`–`#27`), three questions minted (`Q12`–`Q14`),
two closed (`Q8`, `Q11` → `#26`). Enforcement in this repo now spans three layers and
**two of three are present**: the pre-push hook (per clone, set here) and
`.github/workflows/governance-guard.yml` (both arms, four real runs). The third — a
ruleset requiring the `placeholder guard (POSIX)` context — does not exist.

**The through-line.** Four of the six entries are one defect: a statement true at one
instant, carried forward as a fact about now. `Q12`'s misattributed agent, `#24`'s
inherited header, `#25`'s encoding, G1's "still discharged". `#26` writes down the general
form: record *"discharged at `<md5>`"*, never *"discharged"*.

**Open questions.**
- `Q12` **OWED** — no ruleset; `rules/branches/master` returns `[]`. The alias
  prerequisite is discharged (`#27`); the ruleset is the only remaining item.
- `Q13` **OPEN** — imported question-state axis vs the four work-states this store uses.
  Lossy mapping, so a judgement, not a reformat.
- `Q14` **OPEN** — the shared block is the last surviving site of `parked` in either repo.
  Paired with health-app `Q33`; needs its own brief, mirror-first, G1 re-fingerprint.
- `Q4` BLOCKED (day-lag), `Q7` OWED, `Q9` item 1, `Q10` — carried, untouched.

**Branch gate.** All five session branches merged+deleted; three control refs closed and
deleted. `feat/hrv-node-dump` (BLOCKED) and `fix/hrv-capture-regression` (UNSTARTED) rowed,
neither touched. No branch in limbo. `feat/cbti-eval-trigger` is **health-app's**, not
this repo's — checked read-only: two `+` commits, pushed, and already rowed there, so it
does not halt that repo's ritual either.

**Owed to health-app, not actionable from here:** the shared block's `parked` (paired with
`Q33`); FEEDBACK §14's next occurrence — a brief gave health-app's block as `259 / 18757`
where the tree gives `259 / 18717`; and health-app's repo-specific section still says HCA
has "no `.github/workflows` directory at all", true when written, false since `6483d19`.

### Single clearest next action

Set the ruleset on `Easty11/health-connect-app` requiring the `placeholder guard (POSIX)`
status check by that exact string, mirroring health-app's `master-pr-gated` (`20414758`).
That closes `Q12` and makes `#27`'s PR-shaped `land` load-bearing rather than
anticipatory. **GitHub-side repo config, not committable — owner Luke.**
