## Commits this session

```
2b1d5ac Merge pull request #58 from Easty11/feat/background-permission-button
9eef46d feat(sync): "Enable background sync" button on an already-permitted install (#45)
e387717 feat(sync): request the background permission on its own (#45)
```
Plus this close-out commit (`gov/background-permission-closeout`): `#45`, `ROADMAP` sprint block, `closeout.md`.

## PENDING reconciliation

No `;cc` pending-commit queue carried in — the session opened from a self-contained brief. All work landed:

- **Background permission requestable on an already-permitted install (`#45`, OBJECTIVE)** — LANDED `2b1d5ac`
  (PR #58). `healthConnect.requestBackgroundPermission()` (single-permission request); pure
  `src/backgroundPermission.js` (`shouldShowEnableBackground` + `runEnableBackground`); "Enable background
  sync" button in `SyncScreen` shown only in the base-granted/background-missing gap. `test:background-permission`
  10/10.
- **Governance (`#45`)** — in this close-out commit. No new question (bug-fix follow-on to `#44`).
- **G2 (operator)** — OWED; unrun. Device-side tap + prompt only the operator can run.

## Cold-resume handoff

**Sprint:** `#45` landed (HCA side) — an already-permitted install can now grant the background-read
permission via a dedicated `requestBackgroundPermission()` + an "Enable background sync" button, closing the
gap `#44` left (its first-run grant flow never shows once base permissions exist). GUARD held: `syncRunner`,
the background task body, and the 6h interval untouched. `test:background-permission` 10/10; other sims
unregressed; guard green. Self-merged on green (PR #58).

**Store maxima:** decisions `#45`, questions `Q23` (OWED — health-app `trigger` column; unchanged this session).

**Open questions carried:** `Q23` (health-app persists `client.trigger`; migration = HOLD there), `Q18`
(scraper canary), `Q19` (12-hour clock), `Q20` (HC HRV mapper unexercised), `Q21` (owed verifications).
`Q22` is DONE → `#44`.

**Single clearest next action:** operator **G2** — rebuild `npm run android`, open the app, tap **Enable
background sync**, accept the prompt. **Pass:** status flips to "Background sync: on". If the prompt never
appears and the result is denied, HC's background-read feature is unavailable on this device/HC version —
report it (it changes the plan to the off-phone alternatives named in `#44`, not the code). Once background
is on, `#44`'s multi-day G2 follows (Unrestricted battery, 48h no-open, read `health_connect_sync_events`).
