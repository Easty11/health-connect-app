## Commits this session

```
06d5a43 feat(scraper): full SH 7.x sleep capture + tap/home-resume re-map
6b81eb1 fix(hrv): decouple capture/POST auth path from scraper native module
```

Session-open HEAD was `f59c316`. Both commits sit on `fix/scraper-sh-relayout`.
`6b81eb1` is a cherry-pick of `fb3310e` from a sibling branch (applied cleanly —
HEAD's `App.js`/`Root.js` matched `fb3310e`'s parent). `06d5a43` is the SH 7.x
scraper re-map + sleep-capture expansion. (The `chore: session close-out` commit
for this file lands on top.)

## PENDING reconciliation

Session opened from a task brief (manifest-repair hypothesis), not a `;cc` PENDING
queue — nothing carried in to reconcile. The brief's own premise was tested and
**refuted**, then the work evolved on-device:

- **Brief's hypothesis — dropped accessibility-`<service>` registration in the
  manifest (672ab95):** REFUTED. 672ab95 touched no manifest; the service was
  first added by `ab94ffe`; HEAD's source manifest is intact, all refs resolve.
  Real cause: **stale installed APK** (06-23 build predated `ab94ffe`'s 06-24
  service add). Fixed by rebuild + `adb install -r`, not a code change.
- **Briefed OPEN_QUESTIONS.md defect entry ("fixed by manifest repair"):** NOT
  written — that cause was false, and the file doesn't exist in this repo. The
  accurate account lives here + in the ROADMAP sprint block instead.

## Cold-resume handoff

**Branch:** `fix/scraper-sh-relayout` — `6b81eb1` + `06d5a43` on `f59c316`. Not
yet pushed/PR'd. Tree clean except strays `checkin_build_brief.md`,
`hevy_routine.json` (Decision #9 — leave untracked).

**What landed:** the native HRV scraper is alive end-to-end on device RFCX108PF1J
(SH 7.x, 25 Jun 2026). Dead feed was a stale APK, not the manifest. Re-mapped the
Energy-tile tap (today's home relayout broke `f59c316`'s anchor), added recovery
for when SH reopens off-home, and added Sleep scroll-accumulate that now captures
**Light minutes (312), all stage % (11/15/73/1), SpO2 average (96)** and a
**derived** sleep efficiency (82% = actual ÷ time-in-bed). This closes the
"known gaps" DECISIONS_LOG #12 left open.

**Needs Luke's call (surfaced, not actioned):**
1. **DECISIONS_LOG #12 superseder.** #12's "light + efficiency left null, resolve
   later" is now resolved, and today is a *further* SH breakage on top of #12's —
   another tick toward the SDK-migration trigger #12 flagged. Append a new
   superseding entry (don't edit #12; don't mint a number solo).
2. **Branch disposition** for `fix/scraper-sh-relayout` — push / PR / merge target.
3. SpO2 *lowest* deferred (chose average-only). Derived-efficiency wire-provenance
   flag deferred (new `SyncPayload` field = cross-repo contract change).

**⚠ Highest structural priority — UNCHANGED this session:** the firewall gap is
still LIVE-UNBACKED. `src/contract/` has no `CaptureSource`/`CaptureContext` enum;
`ab94ffe`'s HRV path landed without the #6 context firewall (Decision #8 D2 FALSE
in committed code). No `session`-context capture is source-guarded against entering
readiness until this is wired. Also open in ROADMAP: Q4 (HC date-attribution), Q2
(`validateNight()` de-dup).

**Single clearest next action:** push/PR `fix/scraper-sh-relayout`, then return to
the firewall gap (#8 D2) as the top structural fix.
