# Close-out — 31 Oct 2026: question layer Phase C2 adopted in health-connect-app; `OPEN_QUESTIONS.md` deleted

## Commits this session

`git log --format="%h %ad %s" --date=short 3c2986b..HEAD` at close-out (master at open: `3c2986b`; maxima at open: decisions `#53`, questions `Q25`):

- `ae781aa` chore(question-layer): stale workflow and docs/design scaffolding, byte-identical from health-app master (C2)
- `db8bf53` gov(question-layer): Phase C2 - adopt the question layer in HCA, migrate 13 live questions, delete OPEN_QUESTIONS.md (#54)
- the close-out commit below this file, on the same PR; its merge SHA does not exist until it merges (read it with `git log --first-parent --grep=question-layer`)

GitHub-side writes with no commit: nine labels created; issues GH#80 to GH#86 created (GH#81 closed `not_planned`, with a comment).

## PENDING reconciliation

No `;cc` queue carried in; the C2 brief was the only input. Every step landed except the merge, which follows this commit:
- Labels, `stale.yml`, `docs/design`: done (`ae781aa`; labels compared equal to health-app's).
- Shared block: replaced verbatim, slice sha256 equal to health-app master's (`db8bf53`).
- `CLAUDE.md` repo-specific regions, `/closeout` (including `Q10`), guard, `ROADMAP.md` (`Q9`, Later line), `DECISIONS_LOG` `#54`, `BRANCHES.md` row, `OPEN_QUESTIONS.md` deleted: `db8bf53`.
- Seven issues: created and read back (six open, one closed).
- Deploy check: does not apply. This repo has no Railway services; nothing under `src/`, `android/` or `app.json` changed.

## Cold-resume handoff

**State.** Master `3c2986b` plus this PR. Decisions max `#54` once merged (number-at-merge: re-read master's max immediately before the merge). There is no questions store. Open `fork` issues: none. Open issues: GH#80 `Q1`, GH#82 `Q18`, GH#83 `Q19`, GH#84 `Q20`, GH#85 `Q24`, GH#86 `Q25`. Design docs not in a terminal state: none (only the template exists).

**Single clearest next action.** Operator runs the `Q20` query in GH#84 and comments the result; if Garmin HRV rows exist, the lean flips to a 1w stamp as a comment, not a rewrite.

**Operator actions owed.**
- The `Q20` query (GH#84), then the `Q25` discriminators during the next silence (GH#86).
- Per clone: `git config core.hooksPath .githooks` and the repo-local `land` alias (both were unset in this clone and set here; CLAUDE.md § Fresh-clone setup).

**Things the next reader should know.**
- **C3 (health-app session) owes one fix.** health-app's `scripts/gen_governance_view.py` asks `has_questions_store(repo)` for this repo; with the file gone it should report HCA's store as retired. Likely, not run from here; this session did not edit health-app.
- **Source-side nits, not gates (in health-app's shared block, copied verbatim):** it names `scripts\gen_governance_view.py`, absent from this repo (optional step), and says the stale action closes at 60 days where `stale.yml` says 53. health-app's guard also still carries a comment saying this repo keeps its question arm "until Phase C".
- **The ruleset now exists** on master (`master-pr-gated`, required check `placeholder guard (POSIX)`), so the brief's `[]` reading was stale; read live.
- **Access.** health-app's labels and issues are only readable through the API with the repository attached; it was attached with push scope to do that and was only read from. GH#523, GH#508 and GH#565 were read live.
- **Not run by Code:** the `Q20` SQL and the `Q25` commands (written from the source entries' names); `stale.yml`'s first scheduled run.
- **`ROADMAP.md` work-queue facts** were translated into the State vocabulary, not re-audited (e.g. the `feat/hrv-capture` item may be stale).
- Wording written in the issue bodies and `#54` for chat to ratify, not minted rules: owners on the translated BLOCKED lines (Luke on the threshold review, Code on the firewall item, operator on the payload capture).

**What was NOT touched (named so absence does not read as finished).** All app code and the Samsung scraper: `Q24` (needs the ring), `Q18`, `Q19` (pinned to the ring's return), `Q25` (cause unexplained), `Q20` (unmeasured). The two device-gate items `#52` left open. `FEEDBACK.md` and `HANDOFF.md` unchanged.
