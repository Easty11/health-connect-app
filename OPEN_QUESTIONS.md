# OPEN_QUESTIONS.md — health-connect-app

Canonical store for machine-checkable code-state defects and unresolved
questions (see the CLAUDE.md stores table). Each item stays PENDING until it is
resolved into a DECISIONS_LOG entry or a code fix. Items below are carried from
the session handoff.

---

### Q1 — SH-relayout cadence vs SDK-migration trigger (#12)  ·  PENDING
Pin the concrete cadence/threshold at which accumulated Samsung Health
Compose-relayout breakages convert the Samsung Health Data SDK migration from
roadmap-LATER into an actioned migration. #12 defines the tactical-re-map
response and the migration's existence but leaves the trigger loosely specified.

### Q2 — Native HRV scrape end-to-end to DB, post-:355  ·  PENDING
Verify the native Samsung Health HRV accessibility scrape end-to-end to the
backend DB (capture -> POST -> persisted row) following the :355 work — confirm a
scraped value persists as a stored row, not only a successful capture/POST.

### Q3 — Stale-APK-masked Compose-break defect record  ·  RESOLVED (2026-07-11)
Record the defect where a stale installed APK masked the SH 7.x Compose
breakage during testing, so a stale build cannot again hide a live scraper break.
This is the defect-log home for Firewall #8 D2 (out of scope to action here).
**Resolution:** the exact defect recurred this session — a pre-fix APK
(`a5d1643`, instrumentation-only) masked the landed #19 selector fix and emitted
the phantom `106`. Recorded in `FEEDBACK.md` (2026-07-11 entry) and codified
mechanically: PreToolUse hook `.claude/hooks/block-metro-build.cjs` + npm-script
flip (`db6f50e`) block Metro-dependent debug installs, and the standing rule
"dex-gate the *installed* APK after any scraper rebuild (source-clean ≠ deployed)"
is now on record. A stale build can no longer silently hide a live scraper break.

### Q4 — Day-lag / read-freshness of the HRV scrape  ·  PENDING
#19 fixed phantom *selection* (verified: live run read on-screen 97, not the
negative-width phantom 106). It did NOT address read-*freshness*: whether an
earlier morning value (e.g. `117`) was actually yesterday's, i.e. whether the
scrape reads the correct night at ~5am. Resolve only by watching ONE real
overnight/morning sync land today's value in Railway (Postgres query, not
on-device UI) on the fixed standalone release build. Blocks `feat/hrv-node-dump`
disposition.

### Q5 — Historical stale-row reconciliation (τ-window bleed)  ·  PENDING
Pre-fix phantom values already POSTed and persisted are NOT reconciled — e.g. the
Room row `2026-07-09 = 117` (synced=1) remains, and any Railway rows from prior
stale POSTs stand. Decide whether historical rows get corrected/backfilled or left
as-is with a provenance marker. Out of scope for the selector fix (#19 closing
note); needs a deliberate reconciliation pass.
