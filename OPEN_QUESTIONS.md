# OPEN_QUESTIONS.md — health-connect-app

Canonical store for machine-checkable code-state defects and unresolved
questions (see the CLAUDE.md stores table). Status is the four-state vocabulary
— DONE / BLOCKED / OWED / UNSTARTED — per the shared loop-rules block. No fifth
state. BLOCKED must name a blocker that holds *now* and an owner; where the
evidence does not settle barrier-vs-trigger, the item is UNSTARTED.

---

### Q1 — SH-relayout cadence vs SDK-migration trigger (#12)  ·  UNSTARTED
Pin the concrete cadence/threshold at which accumulated Samsung Health
Compose-relayout breakages convert the Samsung Health Data SDK migration from
roadmap-LATER into an actioned migration. #12 defines the tactical-re-map
response and the migration's existence but leaves the trigger loosely specified.
Nothing prevents deciding this — it is undecided, not obstructed.

### Q2 — Native HRV scrape end-to-end to DB, post-:355  ·  OWED
Verify the native Samsung Health HRV accessibility scrape end-to-end to the
backend DB (capture -> POST -> persisted row) following the :355 work — confirm a
scraped value persists as a stored row, not only a successful capture/POST.
**Outstanding:** one Postgres query against Railway showing a scraped value as a
persisted row (not on-device UI) — owner Luke. The capture path itself is
device-confirmed healthy (full screen progression + HRV/HR/RR extraction, 07-12
05:51), so what remains is the named check, not the work.

### Q3 — Stale-APK-masked Compose-break defect record  ·  DONE → `db6f50e` (2026-07-11)
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

### Q4 — Day-lag / read-freshness of the HRV scrape  ·  BLOCKED
#19 fixed phantom *selection* (verified: live run read on-screen 97, not the
negative-width phantom 106). It did NOT address read-*freshness*: whether an
earlier morning value (e.g. `117`) was actually yesterday's, i.e. whether the
scrape reads the correct night at ~5am. Resolve only by watching ONE real
overnight/morning sync land today's value in Railway (Postgres query, not
on-device UI) on the fixed standalone release build. Blocks `feat/hrv-node-dump`
disposition.
**Blocker (holds now):** one overnight/~5am sync on the standalone build landing
today's HRV in Railway — owner Luke. This is a genuine barrier, not a trigger:
read-freshness cannot be established by any means other than observing a real
overnight sync.
**Runnable since 2026-07-13:** this verification was silently blocked — the
scraper appeared "broken" (opened SH, no progression, timeout) but the real cause
was a `SyncScreen` render crash killing the co-hosted accessibility service, not
the scrape path (device-confirmed healthy: SH 7.00.0.107 unchanged since 06-24,
full screen progression + HRV/HR/RR extraction as of 07-12 05:51). Fixed
`e677f9e`; service rebound and scraping confirmed live post-reboot. The sync can
now actually run — the blocker is that it has not yet run, not that it cannot.

### Q5 — Historical stale-row reconciliation (τ-window bleed)  ·  UNSTARTED
Pre-fix phantom values already POSTed and persisted are NOT reconciled — e.g. the
Room row `2026-07-09 = 117` (synced=1) remains, and any Railway rows from prior
stale POSTs stand. Decide whether historical rows get corrected/backfilled or left
as-is with a provenance marker. Out of scope for the selector fix (#19 closing
note); needs a deliberate reconciliation pass.
**Not BLOCKED:** the row names no blocker of its own. The Q4 overnight sync is a
trigger for when reconciliation becomes *worth* doing — it refines which rows are
stale — not a barrier to deciding the policy, which can be settled now.

### Q6 — Does `BRANCHES.md` retain DONE rows or drop them?  ·  UNSTARTED
The file header scopes it to branches "until merged+deleted", which implies DONE
rows are dropped once the branch is gone. Current practice here retains them
(`fix/scraper-sh-relayout`, `chore/block-metro-debug-build`) because the row
carries the disposition evidence — how we know the code landed. health-app
appears to retain likewise. Decide the rule, and whether both repos agree; if
they do, it belongs in the shared block rather than in one repo's header.

### Q7 — #18's flat-`sourcePackage` contract unfulfilled in `aggregateSteps`  ·  OWED
`aggregateSteps` in `src/healthConnect.js` drops `sourcePackage`: the accumulator
does not carry the field and the final projection emits only `{date, count}`.
#18 ("HCA emits flat sourcePackage") is therefore overstated on master — the
contract holds on other paths but not this one.
**Outstanding:** a fix exists, stashed at `stash@{0}`
(`pre-gov-parity: healthConnect.js WIP, unreviewed`, +4/-3) — threads the field
through the aggregate row, the first-contributor path (`??=`), and the
projection. Unreviewed and unlanded — owner Luke. A stash is a surface nothing
points at; this row is what points at it. Recover with `git stash list`.

### Q8 — Shared loop-rules block parity is inverted; health-app return trip  ·  OWED
This session amended the shared block *here* (barrier-vs-trigger tie-break), so
HCA is now ahead of health-app rather than mirroring it:
health-app master `9fa18cc` = 153 lines / 10080 bytes / md5
`9436cb223c4b601252152ab4fa6a3547`; HCA = 155 / 10232 / md5
`4243c91ce78e0331ddfa5178aa3006b8`. Until re-mirrored, the two repos hold
different blocks — the exact drift #1 exists to kill.
**Outstanding, on a health-app-rooted session (single-repo rule forbids it from
here) — owner Luke:** re-mirror the amended block to health-app, and set
health-app `Q25` to `DONE → #91` now that
`claude/hevy-api-workout-query-teulc2` carries a row here.
