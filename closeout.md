## Commits this session

```
a1484ca Merge pull request #56 from Easty11/feat/background-sync
fea0a2b feat(sync): background-sync status line on the sync screen (#44)
924333f feat(sync): periodic background sync task + background HC permission (#44)
cae12f2 feat(sync): extract headless runSync core + stamp client.trigger (#44)
```
Plus this close-out commit (`gov/background-sync-closeout`): `#44`, `Q22` CLOSE (both arms), `Q23`
minted, `ROADMAP` sprint block, `closeout.md`.

## PENDING reconciliation

No `;cc` pending-commit queue carried in — the session opened from a self-contained brief. All work landed:

- **Scheduled background HC sync (`#44`, OBJECTIVE)** — LANDED `a1484ca` (PR #56). Expo SDK 56 background
  task runs the 7-day sync at `minimumInterval:360`; `runSync` extracted headless into pure DI
  `src/syncRunner.js`; `client.trigger` stamps manual vs background; background permission added to both
  app.json lists + `requestPermissions`. `test:background-sync` 19/19.
- **S0/G0 report** — ratified (V1–V7, file layout). V6 correction accepted by the operator: `client.trigger`
  is accepted (`extra="allow"`) but NOT persisted server-side, so G2 is cadence-based and the trigger column
  is owed to health-app (`Q23`). Landed-is-live confirmed by the operator (migration ran 21 Sep).
- **Governance (`#44`, `Q22` CLOSE, `Q23`)** — in this close-out commit.
- **G2 (operator, post-merge, multi-day)** — OWED; unrun. Device-side verification only the operator can run.

## Cold-resume handoff

**Sprint:** `#44` landed (HCA side) — the 7-day sync now runs unattended via an Expo SDK 56 background task
(`hc-background-sync`, 6h `minimumInterval`), gated on a live `BackgroundAccessPermission` read and
registered on app start after login. Sync logic extracted into pure, node-importable `src/syncRunner.js`
(`runSync`, never throws, DI deps), stamping `client.trigger`. Manual button + 30d deep-sync unchanged.
`test:background-sync` 19/19; other sims unregressed; guard green. Self-merged on green (PR #56).

**Store maxima:** decisions `#44`, questions `Q23` (OWED — health-app `trigger` column). `Q22` closed → `#44`.

**Open questions carried:** `Q23` (health-app persists `client.trigger`; migration = HOLD there), `Q18`
(scraper canary), `Q19` (12-hour clock), `Q20` (HC HRV mapper unexercised), `Q21` (owed verifications).
`Q22` is DONE → `#44`.

**Single clearest next action:** operator **G2** — rebuild `npm run android`, install, grant the new
background permission, set the app Unrestricted (Samsung Settings → Battery), then do NOT open the app for
48h. Read `SELECT synced_at, git_sha, fetch_meta IS NOT NULL AS has_meta FROM health_connect_sync_events
ORDER BY id DESC LIMIT 12;`. **Pass:** ≥6 rows over 48h with the new `git_sha` and no manual opens. Partial
(rows only after unlock/charge) = WorkManager deferral, acceptable. Fail (zero) → report battery-optimisation
state + HC feature status from the phone.
