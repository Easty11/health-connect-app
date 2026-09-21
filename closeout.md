## Commits this session

```
a0cd282 Merge pull request #48 from Easty11/claude/heart-rate-sync-lag-wk0y2o
8c154c8 feat: sync build fingerprint + per-stream fetch telemetry (Q22 S1, HCA side)
80fb10e Merge pull request #47 from Easty11/claude/heart-rate-sync-lag-wk0y2o
6fd8b3e docs: record H1 confirmed + scope S1 (design-gated); correct Q22 and Q21.1 state
17956f6 docs: S0 adjudication of the heart-rate ~6-day-lag brief (report only)
```
Plus this close-out commit on `gov/heartrate-s1-closeout` (governance: `DECISIONS_LOG.md` `#40`,
`OPEN_QUESTIONS.md` `Q22` progress, `ROADMAP.md` sprint block, `FEEDBACK.md`, `closeout.md`).

## PENDING reconciliation

No `;cc` pending-commit queue was handed in — the session input was the heart-rate ~6-day-lag brief
(S0 = stop-and-report), then two operator turns (H1 confirmation + ratified S1 scope). Reconciled
against the tree:

- **S0 adjudication → DONE** (`17956f6`, PR #47). H3 ruled out by read of health-app
  `/health-connect/sync`; H1/H2 shown un-splittable from the repo; `Q22` minted.
- **H1 confirmation → DONE** (`6fd8b3e`, PR #47). Operator `dumpsys` read (`lastUpdateTime=2026-08-10`
  predates `#38` `712db1b`): the pagination fix has never run on a device. `Q22` reframed to
  H1-confirmed; `Q21.1` corrected to OWED/unrun (not failed).
- **S1 diagnostics, HCA side → DONE** (`8c154c8`, PR #48). `client` fingerprint + per-stream
  `fetchMeta` on the `/sync` payload; fail-closed `src/buildInfo.js` generated via `metro.config.js`;
  pure `src/fetchMeta.js`; `test:fetch-meta` 22/22 PASS. `#40` minted.
- **Health-app spec → DONE (written, handed off)** — `docs/health-app-sync-events-spec.md`. NOT
  implemented here (single-repo rule; that repo's session owns it).
- **Backend persistence + APK rebuild → OWED**, sequenced backend-first (see next action).

## Cold-resume handoff

**Sprint state:** heart-rate ~6-day-lag adjudicated to **H1 confirmed** (the `#38` pagination fix never
ran on a device — the installed APK predates it). S1 diagnostics **HCA side landed** (`8c154c8`, PR #48):
a fail-closed build fingerprint and per-stream truncation telemetry now ride the `/sync` payload, so a
future lag is self-diagnosing server-side. Decisions max **#40**, questions max **Q22**.

**Open questions:** `Q22` (OPEN — HCA side landed; health-app persistence + APK rebuild owed),
`Q21` (OWED — item-1 HR-coverage gate now unrun-pending on a fingerprinted build; item-2 30-day
deep-sync body limit), `Q18` (scraper canary), `Q19` (12-hour clock), `Q20` (HC HRV mapper unexercised).

**Single clearest next action — health-app backend, FIRST.** Implement
`docs/health-app-sync-events-spec.md` in a health-app session: new `health_connect_sync_events` table
(JSONB `fetch_meta`, first-class nullable `git_sha`) + persistence in `sync()`. Schema migration =
HOLD (operator sign-off). Deploy it **before** the HCA APK rebuild — the fingerprint has nowhere to
land until the table is live. Then rebuild/install the paginating, fingerprinted APK; then `Q21.1`
finally runs (latest `heart_rate` within hours of `synced_at`) and, on pass, closes `Q22`.
Newest-first fetch and backoff retry stay gated unless `Q21.1` fails on a fingerprinted build.
