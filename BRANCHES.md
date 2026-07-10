# BRANCHES — every branch not master lives here until merged+deleted

| Branch | Purpose | Status | Why parked | Unblocks on |
|--------|---------|--------|-----------|-------------|
| fix/hrv-capture-regression | HRV auth-path guard-proof test (fix itself already on master by patch) | parked | Test tied to the #8 D2 HRV-capture firewall-gap work | firewall-gap session (Brief 1) |
| fix/scraper-sh-relayout | SH scraper phantom-node fix | retired 2026-07-11 | Code landed on master as 1db8833 (DECISIONS_LOG #19, renumbered from stale #16); .kt byte-identical upstream. Residual delta = stale #16 log wording (superseded by #19) + 2 chore close-outs (dropped). `git cherry` still shows `+` only because the log portion diverged — code is fully landed. Force-deleted. | — |
| chore/block-metro-debug-build | Metro-block guard (hook + npm script + FEEDBACK) | retired 2026-07-11 | Landed on master as db6f50e via clean `--ff-only`; `git diff master..chore` empty and `git cherry` clean (byte-identical upstream). Safe-deleted (`git branch -d`, true ancestor). | — |
| feat/hrv-node-dump | Read-only node-tree dump instrumentation (dumpTree/dumpActiveTree in HRVAccessibilityService.kt) | parked 2026-07-11 | +1 vs origin/master (`b66d34b`, `git cherry` `+`); rebased onto master so it carries the #19 fix + Metro guard. Diagnostic dump kept live to read the real tree; not landed because its disposition depends on the day-lag verification (keep behind a flag, or strip, once read-freshness is proven). | day-lag freshness verification (one overnight sync on the fixed standalone build) |
| claude/hevy-api-exercise-query-hc8zgh | Reusable Hevy exercise-template title-query script (`scripts/hevy-exercise-query.ps1`) | active | Awaiting merge/review | Luke running it against live Hevy API |
