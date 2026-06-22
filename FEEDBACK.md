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
