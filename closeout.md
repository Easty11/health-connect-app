## Commits this session

`git log --format="%h %ad %s" --date=short 05e03e6..HEAD` at close-out (master at open: `05e03e6`, PR #68):

- `83b9db9` 2026-10-09 docs(sync): correct the registration idempotency comment
- `515fc5d` 2026-10-09 feat(sync): "Open Health Connect" button with a never-throws fallback hint
- `98fff88` 2026-10-09 feat(brand): launcher label -> "Pocket EP Sync" (display only)
- the close-out commit itself (`closeout.md`, `ROADMAP`, `OPEN_QUESTIONS`, `FEEDBACK`), same branch, same PR

The merge SHA does not exist yet; it is the PR's merge commit. Stores read this close-out: `OPEN_QUESTIONS`, `BRANCHES`
in full; `ROADMAP` (queue + sprint block), `FEEDBACK` (head), `DECISIONS_LOG` (tail from `#49`), `CLAUDE.md` — not every line.

## PENDING reconciliation

No `;cc` pending-commit queue carried in — the session opened from a self-contained brief and six in-session rulings.

1. **Ruling 1 — does `ensureBackgroundSyncRegistered` on every open reset the window?** Answered **no**, from the
   installed `expo-background-task` / `expo-task-manager` 56.0.27 sources (`npm pack` into a scratch dir). So the
   conditional fix was not triggered: no registration change, no test. The false comment that prompted the question is
   corrected — landed `83b9db9`. The gate's "registered once, not on every open" is satisfied by the library's own
   guards; the logcat check below is how the operator confirms it on the device.
2. **Ruling 2 — record origins / why the Samsung relay stopped on 30 Sep.** Reported, info only. The sleep mapper forwards
   `dataOrigin` only, so relay-vs-ring is **not determinable from stored data**; the timestamp-alignment query was handed
   over and has **not been run** — provisional. Cause of the 30 Sep stop: not established. Recorded in `Q24` (landed in the
   close-out commit).
3. **Ruling 3 — snapshot sleep, Garmin primary.** Ratified; the work is a **health-app** PR ("own PR after Part 2").
   **Not landed, not started** — health-app is read-only from this session. Provisional until that PR merges. Recorded in
   `Q24` and the ROADMAP next action.
4. **Ruling 4 — scraper: no fix, fail visibly, record an OQ.** OQ landed as `Q24` (close-out commit). The visible-failure
   half rides the staleness brief (item 6) — not built.
5. **Ruling 5 — accessibility service before install `[ON / OFF]`, Part 2 GO.** The field was **left as the unfilled
   template**; not assumed. Part 2 landed (`98fff88`, `515fc5d`). The device gate is the operator's and has **not run**.
6. **Ruling 6 — staleness signal.** Brief owed after Part 2 (operator-written, with the training-load home card).
   **Not built**; its design inputs are in `Q25` and the FEEDBACK age-display entry.

## Cold-resume handoff

**Sprint state:** Part 2 shipped as a companion PR — launcher label "Pocket EP Sync" (display only; `applicationId`
unchanged), "Open Health Connect" button (SDK-gated, never throws, fallback hint "Settings > Apps > Health Connect"),
`test:hc-settings` added, six sims PASS. Part 1 diagnosis closed into `Q24` / `Q25`. Store maxima: decisions `#50`
(unchanged), questions `Q23` → `Q25`.

**What the diagnosis found:** the late walk was a **40 h background-sync silence**, not a dropped stream (`Q25`, cause
unresolved — OS deferral suspected, not observed). Snapshot sleep is stuck at 14 Sep because it reads only the dead
Samsung scraper table while Health Connect sleep is current (`Q24`).

**Open questions carried:** `Q24` (OWED), `Q25` (OPEN), `Q23` (HELD), `Q18`, `Q19`, `Q20`, `Q21`.

**Device gate and install steps (PowerShell, from the repo root, after the PR is merged):**

```powershell
git checkout master
git pull origin master
git config core.hooksPath .githooks
npm install
npm run android
```

`npm run android` is the release build (`expo run:android --variant release`); never the global `expo`/`expo-cli`. It
installs over the existing app because `applicationId` is unchanged, the release build is signed with the debug keystore
(`Q17`; use the same machine's keystore as the installed build), and `versionCode` is still 1 (an equal `versionCode` installs; a lower one would not). **Do not uninstall first** — that wipes Health Connect
grants. Before installing, note the accessibility service state (Settings > Accessibility > Pocket EP) and fill the
ruling-5 field. Then check:

1. Launcher label reads **Pocket EP Sync**.
2. Open the app: Health Connect grants intact (no grant prompt; SYNC and DEEP SYNC buttons shown).
3. Tap **Open Health Connect**: it opens Health Connect. (If it ever cannot, the screen shows "Settings > Apps > Health
   Connect".)
4. Background sync registered once, not on every open:
   `adb logcat -s BackgroundTaskScheduler:D BackgroundTaskConsumer:D` — open and close the app three times; expect no
   "Enqueuing worker" line on the re-opens (a pending worker is kept: "Worker is already scheduled, skipping").
5. Accessibility service still ON after the install; if it went OFF, record that (it bears on `Q24`).

**Single clearest next action:** run the device gate above, then hand back the brief for the staleness signal + the
health-app snapshot-sleep PR. Operator also deletes the merged ref `claude/medical-doc-storage-sync-o926xi` (remote
deletes are refused in remote sessions).
