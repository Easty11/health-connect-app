## Commits this session

```
fd50198 Merge pull request #60 from Easty11/fix/manifest-background-permission
434df23 fix(android): declare READ_HEALTH_DATA_IN_BACKGROUND in the native manifest (#46)
```
Plus this close-out commit (`gov/manifest-background-closeout`): `#46`, `FEEDBACK`, `CLAUDE.md` § Environment,
`ROADMAP` sprint block, `closeout.md`.

## PENDING reconciliation

No `;cc` pending-commit queue carried in — the session opened from a self-contained brief. All work landed:

- **Background permission in the native manifest (`#46`, OBJECTIVE)** — LANDED `fd50198` (PR #60). One
  `<uses-permission>` line for `READ_HEALTH_DATA_IN_BACKGROUND` in
  `android/app/src/main/AndroidManifest.xml`. This is the real root cause behind `#44`/`#45` failing on the
  device: the repo builds from committed `android/` with no `expo prebuild`, so `app.json` permissions never
  reached the build.
- **Governance (`#46`, FEEDBACK, CLAUDE.md § Environment)** — in this close-out commit. No new question.
- **G2 (operator)** — OWED; unrun. Device-side rebuild + on-device permission read only the operator can run.

## Cold-resume handoff

**Sprint:** `#46` landed — `READ_HEALTH_DATA_IN_BACKGROUND` now declared in the native manifest, the only
declaration site this bare-workflow build (committed `android/`, no prebuild) reads. Closes the gap that made
`#44` (permission in `app.json`) and `#45` (in-app request/button) inert on the device. Manifest well-formed;
governance-guard green. Recorded the build-shape trap in FEEDBACK + CLAUDE.md § Environment so it does not
recur. Self-merged on green (PR #60).

**Store maxima:** decisions `#46`, questions `Q23` (OWED — health-app `trigger` column; unchanged this session).

**Open questions carried:** `Q23` (health-app persists `client.trigger`; migration = HOLD there), `Q18`
(scraper canary), `Q19` (12-hour clock), `Q20` (HC HRV mapper unexercised), `Q21` (owed verifications).
`Q22` is DONE → `#44`.

**Single clearest next action:** operator **G2** — rebuild `npm run android`, install; the OS "All
permissions" screen for the app now lists a background/health item; tap **Enable background sync** → status
flips to "Background sync: on". That confirms `#44`→`#45`→`#46` end-to-end. Then `#44`'s multi-day G2
(Unrestricted battery, 48h no-open, read `health_connect_sync_events`).
