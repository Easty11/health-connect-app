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
