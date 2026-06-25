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

### Q3 — Stale-APK-masked Compose-break defect record  ·  PENDING
Record the defect where a stale installed APK masked the SH 7.x Compose
breakage during testing, so a stale build cannot again hide a live scraper break.
This is the defect-log home for Firewall #8 D2 (out of scope to action here).
