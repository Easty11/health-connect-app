## Commits this session

```
672ab95 feat(deep-sleep): add confidence flagger, gate UI; remove HealthConnectAudit
4581f91 feat(contract): add SleepStageType generated enum + gen:contract script
```

## PENDING reconciliation

No `;cc` chat close-out preceded this session. No PENDING queue to reconcile.

## Cold-resume handoff

**Branch:** `feat/deep-sleep-confidence` | **Date:** 2026-06-22

**Sprint state:** C1 (contract) and C2 (deep-sleep) landed clean — no concern bleed, no `add -p` required. The concern routing differed from the pre-session brief: App.js is entirely HRV (complete rewrite, not a three-way split); api.js has no contract hunks. Both commits are clean single-concern. HRV payload is parked unstaged.

**D2 gate outcome:** FALSE. `src/contract/` has only `SleepStageType` (sleep stage integers) — no `CaptureSource`/`CaptureContext` enum. The native module stamps no context on HRV captures. The Decision #6/#8 firewall is unbacked. This is logged in the ROADMAP work queue (not DECISIONS_LOG — no new decision, existing #8 covers it).

**Parked unstaged (HRV — do not stage until firewall gap closed):**
- `App.js`, `src/api.js`, `Root.js`, `index.js`, `package.json`
- `android/` — build.gradle (×2), AndroidManifest.xml, MainApplication.kt, strings.xml
- Untracked: `Root.js`, `HRVCaptureModule.kt`, `HRVCapturePackage.kt`, `data/`, `hrv/`, `xml/`

**Strays (never stage — Decision #9):** `checkin_build_brief.md`, `hevy_routine.json`, `push_to_hevy.py`

**Single clearest next action:** Add `CaptureSource`/`CaptureContext` enum to `src/contract/` (update `gen-contract.mjs` or write a second generated file), then stamp `context: "passive_overnight"` in `HRVAccessibilityService.kt`'s event payload. Verify D2 passes. Then fork `feat/hrv-capture` and commit C3.
