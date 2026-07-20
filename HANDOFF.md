# HANDOFF — interruption-survival ledger

One append-only ledger of session handoffs, so a session interrupted mid-crossing is
resumable from the repo alone — without reconstructing state from chat scrollback. One
ledger, not two.

**Append-only. Never edit or delete an existing line** — only add new lines, at the top of
the list below the header (newest first).

Format: `YYYY-MM-DD HH:MM AEST | LANE | one line`
Lanes: `CHAT→CODE` · `CODE→CHAT` · `CHAT` · `CODE` · `LUKE`. Code writes every entry.

The `CHAT→CODE` receipt is written before any work begins and states received-not-started —
that entry is the one that survives an interruption, so it must not wait for the work. Other
entries may ride the next substantive commit.

This ledger is repo-local. `health-app` keeps its own; neither mirrors the other, and the
single-repo rule means a session rooted here cannot write that one.

---

2026-07-20 13:24 AEST | CHAT→CODE | Ritual vocabulary brief received — strike struck column set from `.claude/commands/closeout.md`, rule on 77-vs-132 divergence (→ HCA #21 at merge). Received, not started.
2026-07-20 12:02 AEST | CODE→CHAT | HCA vocabulary parity LANDING to master — minted **#20**. Shared block re-mirrored from health-app `9fa18cc` (byte-identical at 153/10080/`9436cb22…`), then **amended here** with the barrier/trigger tie-break → 155/10232/`4243c91c…`. **G1 is now breached by our own hand: HCA is ahead, this repo is authoritative for the block until re-mirrored** (recorded in #20 itself, append-only, not only in Q8). BRANCHES: 5 rows four-state (2 DONE / 1 BLOCKED / 1 OWED / 1 UNSTARTED); `claude/hevy-api-workout-query-teulc2` rowed at last — **resolves health-app Q25**; `feat/hrv-node-dump` pushed to origin before rowing (was local-disk-only). OPEN_QUESTIONS: 8 rows (1 DONE / 1 BLOCKED / 3 OWED / 3 UNSTARTED), Q6–Q8 new. **Q5 ruled UNSTARTED against the brief's BLOCKED** — its row names no blocker; the overnight sync is a trigger, not a barrier. Brief's "PENDING ×6" was a word-count; 4 rows. `src/healthConnect.js` stashed at `stash@{0}` — an unlanded limb of #18, rowed as Q7 so something points at it. FEEDBACK ×4. **Return trip (4 items) in closeout.md.** Re-sync CLAUDE.md, BRANCHES, OPEN_QUESTIONS, DECISIONS_LOG, FEEDBACK, HANDOFF from disk; master SHA in closeout.
2026-07-20 09:18 AEST | CHAT→CODE | HCA vocabulary parity brief received — propagate #91 shared block, sweep BRANCHES + OPEN_QUESTIONS to four states (→ HCA #20 at merge). Received, not started.
