# Close-out — device-gate: the PR #69/#70 device gate is met on build `d2d42b8` except two items (#52); an install-over does not disable the accessibility service (Q24)

## Commits this session

`git log --format="%h %ad %s" --date=short d2d42b8..HEAD` at close-out (master at open: `d2d42b8`; maxima at open: decisions `#51`, questions `Q25`):

- the `gov(device-gate)` commit (`#52`, the `Q24` addendum, ROADMAP next-action item 1, BRANCHES), and the close-out commit below this file, on one governance PR. No code changed; no sim was needed.

## PENDING reconciliation

No `;cc` pending-commit queue carried in; the operator's device evidence was the only input. It asked for two things, both done:
- *Record the #69/#70 device gate as met:* `DECISIONS_LOG` `#52`, with the two items the evidence did not report left OWED rather than assumed (below).
- *Add to `Q24` that an install-over does not disable the accessibility service:* `Q24` status addendum, scoped to one observation.
The evidence is relayed and Unverified by Code. I verified in the tree that the installed build contains the work (`eed6492`, `845f8c4`, `201daee` are ancestors of `d2d42b8`; `src/hcSettings.js`, `src/syncAge.js` and the "Pocket EP Sync" label are present). Nothing is decided and uncommitted.

## Cold-resume handoff

**State.** Met on a real device: launcher label, no permission prompt, SYNC and DEEP SYNC shown, "Open Health Connect" opens Health Connect, the status line shows a relative age with the absolute time secondary, accessibility service still ON after the install-over. Store maxima: decisions `#51` to `#52`, questions `Q25` (unchanged; `Q24` gained an addendum).

**Single clearest next action.** Nothing blocks. The next time the background run is silent past 13 h (or on the next natural silence), the operator looks at the status line: it should be amber and bold. That one observation closes `#52`'s first OWED item. While the silence lasts, take the `Q25` discriminators on the phone (`adb shell am get-standby-bucket com.anonymous.healthconnectapp`; `adb shell dumpsys jobscheduler` filtered to the package; Settings > Apps > Pocket EP Sync > Battery reads Unrestricted).

**Operator actions owed.**
- **The amber rendering** (needs a >13 h silence; not reported on 10 Oct).
- **The registration-once logcat check** (not reported): `adb logcat -s BackgroundTaskScheduler:D BackgroundTaskConsumer:D`, open and close the app three times, expect no "Enqueuing worker" line on the re-opens ("Worker is already scheduled, skipping" instead).
- Deleting the merged ref `claude/medical-doc-storage-sync-o926xi` if it still exists (remote deletes are refused in remote sessions).

**Things the next reader should know.**
- The operator did not report the amber rendering, only "x h ago" with the absolute time secondary. It is recorded as unobserved, not as met.
- The "accessibility service stays ON after an install-over" observation is one install on one device by the same-key release path. It does not show the scraper works (that needs the ring) and says nothing about uninstall-and-reinstall.
- health-app's ROADMAP NOW row and `closeout.md` still list "a look at the amber line" as owed; that is still true and unchanged. They also list this repo's earlier device gate as owed; items 1, 2, 3 and 5 of it are now met (`#52`). That file is in the other repo and was not edited here.

**What was NOT touched (named so absence does not read as finished).**
- **The cause of the 40 h silence (`Q25`):** unexplained; the discriminators have not been taken.
- **The Samsung scraper (`Q24`):** still not fixed or re-proved; it needs the ring. `Q18` untouched.
- **`Q23`** (HELD), **`Q19`**, **`Q20`**, **`Q21`**.
- **No code, in either repo.** This session was a governance record of device evidence.

**Open questions by status.** `Q24` (OWED), `Q25` (OPEN), `Q23` (HELD), `Q18`, `Q19`, `Q20`, `Q21`.
