## Commits this session

```
e3e2333 2026-10-04 Merge pull request #64 from Easty11/fix/background-sync-init
82d3d8c 2026-10-03 gov(#48): DECISIONS #48 — background sync init, honest result, S2 shape ratified, S3 findings
4a1a180 2026-10-03 feat(sync): scheduled background sync reads a 30-day window (#370 S5)
40902ca 2026-10-03 test(sync): sim cases for init failure, all-failed result, init ordering (#370 S6)
6b1937c 2026-10-03 fix(sync): init before getGrantedPermissions; surface registered:false (#370 S4)
1f3fc21 2026-10-03 fix(sync): runSync reports ok:false when every stream failed (#370 S2)
b5a0d44 2026-10-03 fix(sync): init Health Connect at fetchAllData; uninitialised is a failed fetch (#370 S1)
```
Plus this close-out commit (`gov/hca-background-init-closeout`): `ROADMAP` sprint block, two `FEEDBACK` entries,
`closeout.md`.

## PENDING reconciliation

No `;cc` pending-commit queue carried in — the session opened from a self-contained brief (hca-background-init,
health-app `#370`). Brief items:

- **S1 init at the choke point** — LANDED `b5a0d44` (PR #64 → `e3e2333`).
- **S2 honest result** — LANDED `1f3fc21`. Error shape (per-stream `fetchMeta` entries + `errors[]`, no top-level
  string) operator-ratified at the gate; not to be changed.
- **S3 background permission** — verified, NO CHANGE (reported at the gate; recorded in `#48`). Not established:
  the device's Android version, and whether a background read without the permission succeeds.
- **S4 registration init + surfaced `registered:false`** — LANDED `6b1937c`.
- **S5 window 7 → 30** — LANDED `4a1a180`, after the gate cleared.
- **S6 tests** — LANDED `40902ca` (sim 41 → 59 PASS; mutation-checked).
- **S7 build and deliver** — NOT DONE by Code (no Android SDK in the remote container). Release recipe handed to
  the operator in chat; it is carried as the sprint block's Next action 1. OWED — operator.
- **S8 governance** — LANDED: `#48` in `82d3d8c` (rode the branch); ROADMAP/FEEDBACK/closeout in this commit.
  `Q23` stays HELD, no new question, no `BRANCHES` row required.
- **Post-install verification** (scheduled-run row; health-app `#371` overlap) — OWED, operator + Code. Unrunnable
  until the operator installs.

## Cold-resume handoff

**Sprint:** `#48` landed — the scheduled background sync now initialises Health Connect at `fetchAllData`, treats
an all-failed fetch as `ok:false` (task reports Failed, WorkManager retries), registers only after init and shows
`not registered: <reason>`, and reads 30 days. Cause and library behaviour are Certain (read from
`react-native-health-connect@3.5.3`); the field evidence (sync events 59/60) is brief-reported, not re-observed.
The deployed backend schema was never read (egress proxy) — `#48` records the per-stream error shape as
operator-ratified, with that surface Unverified.

**Store maxima:** decisions `#48`, questions `Q23` (OWED — health-app `trigger` column; unchanged this session).

**Open questions carried:** `Q23`, `Q18` (scraper canary), `Q19` (12-hour clock), `Q20` (HC HRV mapper
unexercised), `Q21` (owed verifications).

**Single clearest next action:** operator **G2** — on a clean master tree run `npm install`, then `npm run android`
(release; never the global `expo-cli`), install, keep the app Unrestricted on battery, let one scheduled run fire,
and read the newest `health_connect_sync_events` row: new `git_sha`, no `-dirty`, `hr_received > 0`, no error,
`period_days 30`, server time in seconds. If it still posts empty, paste the row — the `fetchMeta` entries will
carry the init error. Then the health-app `#371` overlap check (manual sync during a scheduled one, both 200).
