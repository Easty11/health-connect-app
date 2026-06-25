## Commits this session

Session-open ref: `8c63856` (prior close-out). `git log --oneline 8c63856..HEAD`:

```
fb3310e fix(hrv): decouple capture/POST auth path from scraper native module
```

One commit. Branched `fix/hrv-capture-regression` off `8c63856`, pushed (0/0 with
origin). Draft PR [#2](https://github.com/Easty11/health-connect-app/pull/2) opened
to hold the record — **not merged** (held for review before integration).

## PENDING reconciliation

No chat `;cc` PENDING queue was carried into this session. The session executed
**BRIEF 1 — connect-app capture regression**. Item-by-item against that brief:

- **Restore capture→POST path** — LANDED (`fb3310e`). Guarded the three unguarded
  `HRVCapture` native calls in the auth path (`App.js:81/94`, `Root.js:55`).
- **Regression-ID before fixing** — done: commit `ab94ffe`, gap from 24 Jun via
  `get_recovery_metrics` (last good row 2026-06-23). POST contract itself sound;
  `removeMany` is correct for AsyncStorage v3.1.1 (not a bug).
- **Scoped-fix gate** — confirmed: diff touches auth-path lines only (`App.js`
  +8/−2, `Root.js` +5/−1); scraper feature + Kotlin untouched.
- **Isolation validation** — known-good 23 Jun-shape payload validated against the
  live `SyncPayload` OpenAPI contract → PASS / 2xx-eligible. Contract arm only; no
  live production POST, no overnight capture (scraper down → aliases).
- **Step 5 / D2 CaptureContext enum** — NOT landed. Blocked: live `/openapi.json`
  exposes no `CaptureContext`/context/source schema, so it cannot be single-sourced
  (hand-typed literals forbidden). Re-sequenced backend-first.
- **DECISIONS_LOG remediation note** — none. The fix embodies no new decision and
  the enum did not land, so #8 D2 stays false-in-code (per the brief's LOG rule).

## Cold-resume handoff

**Current state.** On `fix/hrv-capture-regression` @ `fb3310e`, pushed, draft PR #2
open. Working tree clean except pre-existing strays `checkin_build_brief.md`,
`hevy_routine.json` (Decision #9 — untracked, leave). The capture→POST regression
from `ab94ffe` is fixed but **not integrated**.

**Open questions / blocks (from ROADMAP).**
- Integration of PR #2: merge to `master` vs. rebase the HRV concern onto
  `feat/hrv-capture` first (Decision #7 concern-split — `ab94ffe` already bled the
  HRV payload onto the deep-sleep branch in pushed history).
- HRV context firewall (#6 / #8 D2) is **backend-blocked**: backend must expose a
  `CaptureContext` enum + context field on the ingest contract before `gen:contract`
  can single-source it. Until then any `session`-context capture is not
  source-guarded against entering readiness.
- Q2 (de-dup `validateNight()`), Q4 (Health Connect date-attribution root cause)
  unchanged.

**Single clearest next action.** Review draft PR
[#2](https://github.com/Easty11/health-connect-app/pull/2) and decide its
integration path (direct merge to `master`, or rebase HRV onto `feat/hrv-capture`
per #7). The firewall work stays parked until `health-app` exposes `CaptureContext`.
