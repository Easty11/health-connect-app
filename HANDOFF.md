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

2026-07-20 09:18 AEST | CHAT→CODE | HCA vocabulary parity brief received — propagate #91 shared block, sweep BRANCHES + OPEN_QUESTIONS to four states (→ HCA #20 at merge). Received, not started.
