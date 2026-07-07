# BRANCHES — every branch not master lives here until merged+deleted

| Branch | Purpose | Status | Why parked | Unblocks on |
|--------|---------|--------|-----------|-------------|
| fix/hrv-capture-regression | HRV auth-path guard-proof test (fix itself already on master by patch) | parked | Test tied to the #8 D2 HRV-capture firewall-gap work | firewall-gap session (Brief 1) |
| fix/scraper-sh-relayout | SH scraper UI relayout | parked | 3 unpushed local commits pending Luke's review | your inspection |
| claude/hevy-api-workout-query-teulc2 | auto-named session branch (harness-assigned) | parked | zero unique commits — `git cherry origin/master` empty, patch-identical to master; session was investigation only, no code landed | delete once confirmed (destructive branch ops need explicit ask) or reuse if follow-up work is intentionally scoped here |
