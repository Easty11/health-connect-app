# closeout.md — health-connect-app

## Commits this session

Session-open ref: `c8be2fa` (master tip at open).

Landed on `master` (pushed → origin/master @ `e3b6d12`):
```
e3b6d12 chore(branches): retire chore/block-metro-debug-build — landed as db6f50e
db6f50e chore(build): codify standalone-release-only; block Metro debug installs
c878f52 chore(branches): retire fix/scraper-sh-relayout — code landed as 1db8833 (#19)
1db8833 fix(scraper): select valid-bounds Energy-score node, not firstOrNull phantom
```
On parked `feat/hrv-node-dump` (+1 vs origin/master, unpushed):
```
b66d34b feat(hrv): dump Samsung Health node tree for selector diagnosis
```
(Plus this close-out commit on master.)

## PENDING reconciliation

No formal `;cc` chat PENDING queue was carried in; the session's briefs acted as the
chat proposals. Reconciling what they proposed:

- **Node-dump instrumentation** (Brief 1) — LANDED as `b66d34b` (parked on
  `feat/hrv-node-dump`). Read-only; proved the phantom from real nodes.
- **Brief 1's pre-drafted DECISIONS_LOG `#N`/`#N+1`** (fixed-index "chart-drift"
  framing) — **NOT landed as written; consciously superseded.** The dump disproved
  chart-drift: the bug is a duplicate negative-width phantom node. The real fix
  already existed unmerged (`aab35c4`, DECISIONS_LOG stale `#16`) and LANDED as
  **`1db8833` / DECISIONS_LOG #19** with the corrected phantom framing.
- **Metro-guard codification** (session request) — LANDED as `db6f50e` (hook +
  npm-script flip + FEEDBACK entry), fast-forwarded to master.
- **Provisional / NOT done:** Railway-side persistence of the corrected value and
  day-lag read-freshness are NOT verified (on-device evidence only: POST 200 +
  Room `synced=1`). Tracked as OPEN_QUESTIONS Q4/Q5.

## Cold-resume handoff

**LOCKED (done + verified):**
- Phantom root cause proven from real nodes: duplicate `last_shrv` node — a
  negative-width phantom (`Rect(0,4659 - -84,2340)`, "106 ms") sorts before the real
  positive-width node ("97 ms"); `findById(...).firstOrNull()` picked the phantom.
- Fix landed on master (`1db8833`, DECISIONS_LOG **#19**) — all three Energy-score
  reads (HRV/HR/RR) via `findByIdValidBounds` — and verified on-device (live run read
  97, POST `hrv_ms:97`, `Synced 1`, Room row `synced=1`).
- Metro-debug-build trap codified off master (`db6f50e`): PreToolUse hook blocks
  Metro-dependent installs; standalone release build proven Metro-independent.

**OPEN:**
- **Q4 — day-lag / read-freshness:** #19 fixed selection, not freshness. Verify by
  watching one real ~5am sync land today's value in Railway (Postgres, not UI).
- **Q5 — historical stale-row reconciliation** (τ-window bleed; e.g. `2026-07-09=117`).
- Pre-existing UNTOUCHED debt: HRV context firewall #8 D2 unbacked; #18 Postgres
  `source_package` gate owed; ROADMAP Q4 HC date-attribution root cause.

**Branches:** `fix/scraper-sh-relayout` + `chore/block-metro-debug-build`
merged+deleted (recorded in `BRANCHES.md`). `feat/hrv-node-dump` parked
(instrumentation, disposition pending day-lag). `fix/hrv-capture-regression` parked,
untouched.

**Single clearest next action:** watch ONE real overnight/~5am sync land today's HRV
value in Railway on the fixed standalone build — resolves Q4 and unblocks the
`feat/hrv-node-dump` disposition. The standalone release build made this session is
what makes that unattended capture possible.
