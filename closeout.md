# Close-out — sync-age: the "Last background sync" line shows a relative age, amber past 13 h (#51); freshness is visible, `Q25` stays open

## Commits this session

`git log --format="%h %ad %s" --date=short eed6492..HEAD` at close-out (master at open: `eed6492`; maxima at open: decisions `#50`, questions `Q25`):

- `201daee` 2026-10-10 feat(sync): the "Last background sync" line shows a relative age, amber past 13 h
- `845f8c4` 2026-10-10 Merge pull request #70 (PR 3 of the freshness brief)
- the `gov(sync-age)` commit (`#51`, the `Q25` and `Q24` addenda, ROADMAP items 2 and 3, FEEDBACK, BRANCHES), and the close-out commit below this file, on the same governance PR

This is the companion half of a three-PR brief. The other two PRs are in health-app (`#358` snapshot sleep, `#359` the freshness read model and home load card; its `closeout.md` is the full handoff). `feat/sync-status-age` was merged and its local ref deleted.

## PENDING reconciliation

No `;cc` pending-commit queue carried in; the chat brief was the only input. Its LOG block, and the previous close-out's owed items it discharges:
- *Leave `Q25` open and add that freshness is now visible:* `Q25` status addendum written (this branch); it stays **OPEN** because the cause of the 8-9 Oct silence is still unknown.
- *Previous ruling 3 (snapshot sleep, Garmin primary):* landed in health-app as `#405` (merge `2156b71`), verified live 10 Oct. ROADMAP item 2 is DONE.
- *Previous ruling 4 (scraper fails visibly) and ruling 6 (staleness signal):* landed as health-app `#406` (merge `ed1764e`), which lists the scraper as an amber `STALE` line; `Q24`'s loop-close (1) is discharged, the question stays OWED for the ring's return. ROADMAP item 3 is DONE.
- *The 9 Oct FEEDBACK item (show age, not a bare locale date):* resolved by `#51`; marked in `FEEDBACK.md`.
- *The device gate from the previous session* (launcher label, "Open Health Connect", registration-once logcat check, accessibility state): **not reported as run**; it is still the operator's and stays provisional.
Nothing is decided and uncommitted.

## Cold-resume handoff

**Sprint state.** The companion change is small and complete: `src/syncAge.js` (pure, `describeSyncAge`), `SyncScreen` renders the age (amber and bold past 13 h, absolute time as a smaller second line, re-rendered each minute), `npm run test:sync-age` added. Seven sims now exist and all pass. Store maxima: decisions `#50` to `#51`, questions `Q25` (unchanged, addendum only).

**What the work found.** Nothing new about the silence itself. The visibility half of `Q25` is now closed on both sides (the phone's line here, and health-app's snapshot and home card); the cause half is not.

**Single clearest next action.** The operator's device look on the next build: (1) the "Last background sync" line reads a relative age and turns amber when the last background run is over 13 h old (a quick way to see it: leave the phone untouched past 13 h, or inspect the line with a stale stamp); (2) the previous session's device gate, still unreported. Then, the next time a silence occurs, take the `Q25` discriminators on the phone while it lasts (`adb shell am get-standby-bucket com.anonymous.healthconnectapp`; `adb shell dumpsys jobscheduler` filtered to the package; Settings > Apps > Pocket EP Sync > Battery reads Unrestricted).

**Operator actions owed.** The device look above; the previous session's device gate; deleting the merged ref `claude/medical-doc-storage-sync-o926xi` (remote deletes are refused in remote sessions).

**Things the next reader should know.**
- The 13 h threshold is deliberately **the same** as health-app's Health Connect amber gate (two 6 h background intervals plus an hour of slack). If one moves, move the other (`#51`).
- A device that has **never** run a background sync reads `never` and is not amber; an unreadable stamp reads `unknown` and is amber.
- This session could not run the app: the amber rendering is OWED to the operator. The screen file parses (esbuild) and the logic is sim-tested; the minute tick is three lines of React state and was not run.

**What was NOT touched (named so absence does not read as finished).**
- **The cause of the 40 h silence (`Q25`):** unexplained. The discriminators have not been taken; the change here only makes the next silence visible.
- **The Samsung scraper (`Q24`):** not fixed, by instruction (no live device); re-proving the scrape end to end when the ring returns is untouched. `Q18` (the scraper canary's gap-vs-failure discriminator) is also untouched.
- **`Q23`** (`client.trigger` not persisted; HELD, needs a health-app column), **`Q19`**, **`Q20`**, **`Q21`**.
- **The per-stream staleness for the phone's own data** (steps, heart rate, sleep as seen on the device): that lives in health-app (`#406`); the phone shows only the background-run age.

**Open questions by status.** `Q24` (OWED), `Q25` (OPEN), `Q23` (HELD), `Q18`, `Q19`, `Q20`, `Q21`.
