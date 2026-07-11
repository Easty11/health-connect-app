# BRANCHES — every branch not master lives here until merged+deleted

| Branch | Purpose | Status | Why parked | Unblocks on |
|--------|---------|--------|-----------|-------------|
| fix/hrv-capture-regression | HRV auth-path guard-proof test (fix itself already on master by patch) | parked | Test tied to the #8 D2 HRV-capture firewall-gap work | firewall-gap session (Brief 1) |
| fix/scraper-sh-relayout | SH scraper phantom-node fix | retired 2026-07-11 | Code landed on master as 1db8833 (DECISIONS_LOG #19, renumbered from stale #16); .kt byte-identical upstream. Residual delta = stale #16 log wording (superseded by #19) + 2 chore close-outs (dropped). `git cherry` still shows `+` only because the log portion diverged — code is fully landed. Force-deleted. | — |
