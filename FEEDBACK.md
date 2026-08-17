# FEEDBACK.md — health-connect-app

Append-only friction log. Captures what's rough about the *workflow* and about
*Claude's behaviour* — not feature bugs (those go to the issue tracker / ROADMAP).

Purpose: surface recurring friction so the loop and the working pattern improve
over time instead of the same papercut recurring silently.

## Convention
- **Append-only.** New entries at the top. Never edit a past entry.
- One entry per friction event. Keep it short: what happened, why it cost time,
  what would prevent it.
- Tag the source: `[workflow]`, `[chat]`, `[code]`, `[ritual]`, `[env]`.

## Format
```
### YYYY-MM-DD — short title  [tag]
**Friction:** what went wrong / what was slow.
**Cost:** what it cost (time, a redo, a wrong commit).
**Fix:** the change that prevents recurrence (or "open" if unresolved).
```

---

### 2026-08-17 — governance that is a code change's rationale lands with that branch  [ritual]
**Friction:** Two standing rules pointed opposite ways. **Governance batching** says at most one
`gov(...)` commit per session, at close-out, never interleaved with feature work. **Number-at-merge**
and the DECISIONS_LOG discipline ("every code-gating decision carries a How-you-know artifact") both
assume a decision entry rides the branch whose code it decides. `#36`'s reasoning was *produced by
the review of that branch*, so batching it to close-out would have put the implementation on master
ahead of its rationale — and had the session ended in between, the branch would have been deleted
and taken the review with it.
**Cost:** None realised — the collision was named and resolved before the land, and the operator
endorsed the resolution. Untreated, the expensive version is silent: a future session follows
batching literally, lands `majorityWriter()` bare, and the "why not `??=`" reasoning dies with the
branch. That is the `Q12` dies-at-merge and `#19` logged-≠-landed hazard in a new costume.
**Fix:** **Governance that is the rationale for code on a branch lands with that branch, as its own
commit — not at close-out.** Batching's purpose is to keep code commits clean and stores from
thrashing, which a single separate `gov(...)` commit on the same branch fully satisfies. Store
*reconciliation* (question closes, ROADMAP, `closeout.md`) still batches to close-out, because it
cites landing SHAs that do not exist until the merge. The test: does this governance edit explain
the diff beside it, or record what happened to the session? The first rides the branch; the second
waits. When two rules collide, resolve toward the reason behind both and **name the bend** rather
than pick one silently.

### 2026-08-17 — a PowerShell read-modify-write silently double-encoded a store  [env]
**Friction:** A one-token substitution in `OPEN_QUESTIONS.md` was done as
`(Get-Content -Raw).Replace(...) | Set-Content -Encoding utf8`. Windows PowerShell 5.1's
`Get-Content` decodes a BOM-less UTF-8 file as the **ANSI codepage**, so every em-dash, `→` and `·`
came into memory as mojibake; `-Encoding utf8` then wrote that mojibake back as valid UTF-8 and
added a BOM. The substitution itself never matched (its search string contained a real `→`), so the
command's *only* effect was to corrupt 166 lines of a canonical store.
**Cost:** None landed — caught immediately by `git diff --stat` reading 189/166 for a
one-line change, and reverted with `git checkout --`. The near-miss is the point: had the diff not
been checked, a governance store would have gone to master with every special character mangled and
a BOM the guard does not inspect.
**Fix:** **Never round-trip a repo file through `Get-Content`/`Set-Content` for an edit.** Use the
`Edit` tool, which is encoding-correct by construction. Where PowerShell must touch file content,
read bytes explicitly (`[System.IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)`). Standing check
that caught this one and should be habitual: **after any scripted edit, `git diff --stat` must match
the edit's expected size** — a one-line change reporting hundreds of touched lines is an encoding
event, not a big edit. Generalises the existing rule about DB scripts (CLAUDE.md: write a Python
file, don't fight inline quoting) from quoting to encoding.

### 2026-07-20 — a convention holds only where it is generated  [ritual]
**Friction:** The stores were swept to the four states twice (#16/#17 propagated the
block, #20 swept `BRANCHES.md` and `OPEN_QUESTIONS.md`), while the ritual that *writes*
those stores kept instructing the superseded `purpose / why-parked / unblocks-on` column
set and `parked` as a status verb. The defect had a source, and every close-out would
have re-emitted it.
**Cost:** None realised — caught before a close-out ran under the swept stores. Untreated
it would have silently reintroduced the dialect on the next run, indefinitely.
**Fix:** When a convention changes, **sweep the generators before the stores.** A store
fixed under a stale generator is fixed until the next run. The test for whether a surface
is a generator: does it *re-emit* the governed text each run, or merely *store* it? Inert
debt is carried; a generator regenerates. Landed as #21.

### 2026-07-20 — a check that agrees with the expected answer is not thereby confirmed  [chat]
**Friction:** Chat's G1 audit returned PASS by comparing two *empty* extractions — the
extraction failed, both sides were zero bytes, and `cmp` duly reported them identical.
Separately, label counts were reported from word-greps three times running (health-app's
21/16/2, this repo's "`PENDING` ×6", and health-app's ritual at "77" lines against an
actual 80). Same family: a measurement substituted for the measurement actually needed.
**Cost:** A false PASS on the repo pair's core invariant, and three scope figures that
had to be re-derived rather than trusted.
**Fix:** Every integrity check asserts its input is **non-empty and plausibly sized**
before the comparison is allowed to mean anything. A verdict that agrees with the
expected answer is the dangerous case, not the reassuring one — it is where a broken
check is least likely to be questioned. Applied throughout #21: the `PENDING`-section
comparison and the health-app fetch both assert non-empty before comparing, and both
report their byte counts so the assertion is visible rather than merely performed.

### 2026-07-20 — propagation is not parity  [ritual]
**Friction:** #16 established the shared loop-rules block in this repo and #17 re-mirrored
it back to health-app, yet this repo's own `OPEN_QUESTIONS.md` and `BRANCHES.md` went on
carrying `PENDING`, `parked` and `retired` — labels the block never sanctioned. The block
was byte-identical the whole time; the stores it governs were not swept.
**Cost:** Two further sessions read and wrote a vocabulary no rule licensed, and a
third (this one) was needed to sweep it.
**Fix:** Copying a rules block does not adopt the rules. Adoption is complete only when
every store the block governs has been swept to it — treat a propagation commit as
unfinished until that sweep runs, and name the stores in the same session.

### 2026-07-20 — a brief's ANCHOR was read as observed state, and wasn't  [chat]
**Friction:** The brief's ANCHOR stated the branch `gov/branches-vocabulary` was "cut from
master" and the tree clean. Neither was true — the branch did not exist locally or on
origin, and `src/healthConnect.js` was modified. Written in the declarative, an ANCHOR
reads as an attestation the author cannot make: chat has not seen the tree. Phase 1 had
the same shape and only survived because that session happened to cut the branch first.
**Cost:** A halted gate and a round trip before any work began. Cheap here; the same
pattern silently passing is the expensive version.
**Fix:** ANCHOR separates required state from how to reach it, and names which failures
are hard stops. Only the repo root is a genuine hard stop; a missing branch is cut, not
halted on. The "clean tree" line reads "clean except known untracked strays." Corollary
already standing: a statement about a surface chat cannot read is an instruction to
verify, never a report of fact.

### 2026-07-20 — barrier-vs-trigger, and which way to fail  [ritual]
**Friction:** `fix/hrv-capture-regression` names a D2 firewall-gap dependency without
settling whether that dependency prevents the work or merely makes it not-yet-worthwhile.
The four-state rules said a trigger is not a blocker, but said nothing about the case
where the evidence does not settle which one you have.
**Cost:** None yet — caught at the gate. Untreated it produces false BLOCKED rows, which
are the costly direction.
**Fix:** Where the evidence does not settle barrier-vs-trigger, take UNSTARTED — the label
that asserts less. The errors are asymmetric: a false BLOCKED tells a future reader not to
try, while a false UNSTARTED just means someone picks the work up and discovers the
dependency. Now in the shared block (#20). Keep the dependency in the row text as context,
never as an assertion that the work is impossible.

### 2026-07-20 — counting the word instead of counting the field  [chat]
**Friction:** The brief reported this repo carrying "`PENDING` ×6". There were four
PENDING rows: the count included the header's "stays PENDING until" and Q4's body text
"Q4 stays PENDING". The same substitution has now produced wrong counts three times
(health-app's 21/16/2, and this).
**Cost:** Small individually — a scope figure wrong by two. Cumulatively it means every
population figure in a brief has to be re-derived rather than trusted.
**Fix:** Count the field, never the word, and check the total against the population
before reporting. The failure is not carelessness but a substitution that feels
equivalent: full-text search for a label looks like counting the label, and it is not —
it counts prose, headers and cross-references too. Recurred twice after being written
down, so the rule is not yet a rule. **Return trip:** health-app `FEEDBACK` §14 already
carries the rule and needs this recurrence appended; it is unreachable from an
HCA-rooted session (see #20, Q8).

### 2026-07-13 — a "scraper broken" brief was really an app-process crash  [workflow]
**Friction:** The brief diagnosed the dead HRV scraper as a selector mismatch (SH
relayout) and scoped a node-dump build to prove it. The device falsified that: SH
unchanged since 2026-06-24, and the already-present `nodedump.txt` showed the scraper
walking every screen and extracting HRV/HR/RR cleanly as recently as 07-12 05:51. The
real cause was a JS render crash — `SyncScreen` read `gate.deepIfConst4`, which
`validateNight` no longer returns — that killed the RN process and, with it, the
co-hosted `HRVAccessibilityService` (framework marked it `Crashed services`). A reboot
rebound the service, masking the bug. Two things generalise: (1) **a scraper
"opens SH, no progression, timeout" symptom can be an app-process crash, not a
selector problem** — check `dumpsys accessibility` `Crashed services` and the crash
buffer before rebuilding the scraper; the a11y service shares the RN PID and dies with
it. (2) **Parked-on-observation needs a liveness check.** `feat/hrv-node-dump` and
`fix/hrv-capture-regression` were both parked on "empirical verification not yet run,"
and that verification could not run because the app was crashing — a park whose unblock
condition is silently unrunnable reads as "waiting" when it is actually "blocked."
**Cost:** A full diagnostic pass chasing selectors before the device evidence redirected
it; the fix itself was a one-line deletion (`e677f9e`).
**Fix:** Before treating a scraper failure as a selector/relayout issue, adjudicate
against the device first: SH `versionName`/`lastUpdateTime`, `dumpsys accessibility`
Crashed-services state, and the crash buffer. Selector re-map is the response only once
progression is confirmed reaching SH's tree. See [[uiautomator-blind-to-scraper-nodes]].

### 2026-07-11 — debug rebuilds keep re-installing a Metro-dependent APK  [workflow]
**Friction:** Every time we rebuild to debug on-device, `npx expo run:android` (and the
`npm run android` script) installed the **debug** variant, which loads its JS bundle from
the Metro dev server. The overnight/on-unlock HRV scraper then silently fails whenever
Metro or the dev machine is down. This recurred repeatedly; verbal "won't happen again"
assurances did nothing because nothing enforced them — and each recurrence re-masqueraded
as a scraper bug (e.g. the morning `106` deploy gap).
**Cost:** Repeated wasted debugging chasing "scraper" failures that were really a
Metro-dependent build; one full misdiagnosis cycle before dex-gating the installed APK.
**Fix (codified, not remembered):** (1) PreToolUse hook `.claude/hooks/block-metro-build.cjs`
(wired in `.claude/settings.json`, matches Bash|PowerShell) BLOCKS any `expo run:android`
/`run-android`/`installDebug`/`assembleDebug`/`adb install …-debug.apk` that lacks
`--variant release`. (2) `npm run android` now = `expo run:android --variant release`
(standalone Hermes-embedded); `npm run android:dev` is the explicit debug/Metro opt-in.
(3) Standing rule: **only standalone release builds go on the scraper device** — after any
scraper rebuild, dex-gate the *installed* APK (source-clean ≠ deployed). See
[[hrv-last-shrv-phantom-node-misresolution]].

### 2026-06-24 — handoff asserted unpushed work that was already synced  [workflow]
**Friction:** The chat-generated CODE HANDOFF directed a `git push --force-with-lease` to publish "the firewall commit + stranded work," but `feat/deep-sleep-confidence` was already 0/0 with origin — nothing to push. The same handoff carried audit branch positions (`f6d94a8`/`82f0b88`) it itself flagged as unverified.
**Cost:** None — the handoff's own "verify what's ahead BEFORE pushing" step caught it before a no-op force-push. But the premise was wrong end to end.
**Fix:** Treat any git state a handoff *asserts* (unpushed commits, branch topology) as a claim to verify against `git log @{u}..HEAD` / `git rev-list --left-right --count`, never as fact to act on. The protocol's "verify before you build on it" + `;raw` state check is what held; keep gating every destructive git op on a fresh state check, not the handoff's description.

### 2026-06-23 — git stash without --include-untracked breaks release build  [workflow]
**Friction:** `git stash` (default) parks tracked modified files but leaves untracked files in place. The HRV payload includes untracked files in Android source dirs (`res/xml/`, `data/`, `hrv/`, `.kt` files). These were picked up by the build system and caused two sequential failures: (1) AAPT resource linking — `accessibility_service_config.xml` referenced `@string/hrv_service_description` from the stashed `strings.xml`; (2) Kotlin compile — `AppDatabase.kt` referenced Room classes whose dependency was in the stashed `build.gradle`. Required manually moving four directories aside and back.
**Cost:** Two failed build attempts + manual directory shuffling to isolate and clear each blocker.
**Fix:** Use `git stash push --include-untracked` when the working tree has untracked source files that could be picked up by the build system. The `--include-untracked` flag parks all untracked files alongside the tracked ones and restores them atomically on `stash pop`.

### 2026-06-22 — correction to the entry below  [ritual]
The entry below ("wrong-repo close-out near-miss") is inaccurate: it claims the repos share the ritual and that the run was caught before execution. Neither is true — /closeout existed only in health-app, and the run completed there as a no-op, noticed afterward. The mechanism fix (ANCHOR self-check) is unaffected. See DECISIONS_LOG #11.

### 2026-06-22 — wrong-repo close-out near-miss  [ritual]
**Friction:** `/closeout` was about to be run from health-app instead of
health-connect-app. Both repos share the same ritual and the commands look identical
in a chat context where the repo root isn't visible.
**Cost:** Caught before execution, but only because the user noticed. A missed catch
would have overwritten health-app's `closeout.md` and ROADMAP sprint block with
health-connect-app state — silent corruption of the wrong repo.
**Fix:** ANCHOR self-check now baked into `/closeout` (Decision #10). Command refuses
and prints the actual root if it isn't `\health-connect-app`.

<!-- New entries above this line -->
