# closeout.md — health-connect-app

Session close-out, 2026-08-17. Cold-resume handoff. Overwritten each `/closeout`.

---

## Commits this session

Session-open ref `e566895`. Real `git log --oneline e566895..HEAD`:

```
10651cb Merge pull request #31 from Easty11/fix/aggregatesteps-sourcepackage
2de57e3 gov: DECISIONS_LOG #36 — majority-count writer attribution for aggregated step days
2ee21dc fix: attribute an aggregated step day by majority count, not first writer
fe2ebee fix: thread sourcePackage through aggregateSteps (fulfils #18 on the steps path)
1edfdf8 Merge pull request #30 from Easty11/chore/store-omnibus
ff2f3f6 gov: OPEN_QUESTIONS — adopt question vocabulary (Q13 DONE), mint Q18/Q19
```

Plus this close-out commit on `gov/closeout-0817`.

Two concerns, landed in brief order. Guard `placeholder guard (POSIX)` green on every pushed
head; both branches merged `--merge` under ruleset `20573455`, deleted local and remote.

---

## PENDING reconciliation

No `;cc` pending-commit queue was carried into this session — the brief was the payload. Each
brief item reconciled against what actually landed:

| Brief item | Disposition |
|---|---|
| Canary question minted | **LANDED** `ff2f3f6` — `Q18`, placeholder resolved at merge against re-read max `Q17`. |
| `Q90` vocabulary re-home | **LANDED** `ff2f3f6` — six rows `UNSTARTED → OPEN`, `Q16 → OWED`, zero `BLOCKED` to re-tag, preamble rewritten. `Q13` closed as the self-observation of the same defect. |
| `Q42` carry | **LANDED** `ff2f3f6` — `Q19`. Brief's verify-first gate honoured: the defect is still on master at the lines named, and the 12-hour rendering is recorded as **inferred, not observed**. |
| Stash adjudicated live, not silently | **DONE** — diff reported verbatim before any action; disposition (a) on the operator's explicit word; `Q7` closed with evidence. |
| Stash landed | **LANDED** `10651cb`, and **amended** — see below. Stash dropped (`3d3d395`). |
| Majority-count amendment | **LANDED** `2ee21dc` + `#36` (`2de57e3`). |

**Provisional: nothing.** No decision from this session is uncommitted.

**One thing the brief expected that did not happen, and it is the right outcome:** the brief
allowed a companion hazard question for the multi-writer collision. None was minted, because
the collision is **resolved at source** by `#36` rather than carried — logging a hazard that no
longer exists would be debt theatre.

---

## Cold-resume handoff

### Where the repo stands
Two concerns landed. Governance: `OPEN_QUESTIONS.md` now uses the **question** vocabulary
(`OPEN` / `OWED` / `DONE → #N`) store-wide, preamble included, closing `Q13`. Code: `Q7`'s
year-old stash was adjudicated, reworked and landed as `#36`.

### Decisions / questions moved
- Minted **`#36`** — an aggregated step day is attributed to its **majority-count** writer.
  Claimed at merge against a re-read `#35` / `Q19`.
- Minted **`Q18`** (scraper canary — the sole HRV path has no failure detection) and **`Q19`**
  (`parseSleepTimingContentDesc` accepts a meridiem-less clock).
- Closed **`Q7` → `#36` (`10651cb`)** and **`Q13` → `ff2f3f6`**.
- Stores changed: `DECISIONS_LOG`, `OPEN_QUESTIONS`, `BRANCHES`, `FEEDBACK`, `ROADMAP`.

### Why `#36` is not the stash it came from
The recovered stash attributed a step day by **first non-null writer** (`??=`). Review found a
data-loss path: a day of 100 Polar steps + 5000 Samsung steps shipped as `fi.polar.polarflow`,
and `#18`'s own note says health-app's F1 dedup prefers direct AccessLink v4 over that package
— so F1 could discard the whole 5100-step day as a Polar duplicate. That is **worse than the
`'unknown'` sentinel it replaced**: an absent provenance is inert, a wrong one is silently
actionable. Attribution is now majority-count, ties holding the first writer seen.

The control is what makes the green mean anything — 18 assertions extracted from the **source
on disk**, 18/18 on the landed code, and both negative controls discriminate: 17 of 18 fail
against `origin/master` (sole pass: the count regression guard, correctly), and **exactly 3**
fail against `fe2ebee`, which are exactly the three majority assertions. Everything else
passing against the `??=` version is the evidence the rework is surgical.

### Open questions in this repo
`Q1` · `Q5` · `Q9` · `Q10` · `Q15` · `Q17` · `Q18` · `Q19` — all **OPEN**. `Q16` **OWED**
(settled by `#30`; owed to a health-app-rooted session). No `BLOCKED` — the state does not
exist in this store any more.

### The single clearest next action
**Run `#18`'s owed Postgres check.** One Railway dashboard query: non-null `source_package` on
steps-type rows in `health_connect_record_sources`, after one post-deploy sync has carried the
`#36` emitter. `#18`'s How-you-know named it and it has never run; `Q7` closes the **emitter**
half only. This is the entire distance between "emitter verified" and `#18` fully closed, it
takes about thirty seconds, and it needs the operator — Railway, not on-device UI, not runnable
from a Code session.

Nothing in this repo is blocked behind it. `Q19` wants a real 12-hour-locale capture before a
fix is written against it (the defect is proved from the code; the trigger condition is not).
`Q18` wants its gap-vs-failure discriminator decided before a detector is built.

### Not reachable from here
The live frontier is health-app-side and the single-repo rule forbids it from an HCA-rooted
session: the `fix/q45-nap-attribution` orphan (unmerged, unrowed, collides with `#218`'s
`EvaluationOffer.jsx` rewrite, and its `Q45` close criterion asserts clinician/VA-protocol
provenance whose basis is unestablished) and `Q102` restriction-mapping. Both need a
health-app-rooted session; neither was touched or inspected from here.

### Environment state (carried, unchanged this session)
No device work this session — no build, no install, no sync. The 2026-08-10 device notes still
stand: phone **SM_S921B** runs a release build carrying `[HC payload summary]`; logcat ring
buffer rotates fast (use `adb logcat -G 5M` and stream to a file); logcat payload cap 4068 B.
**The `#36` emitter is on master but has not run on the device** — which is exactly why the
Postgres check above is the next action rather than a formality.
