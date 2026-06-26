# CLAUDE.md — health-connect-app

Operating contract for this repo. Read this first on every cold resume.
If `closeout.md` exists, read it second — it is the live handoff.

---

## What this repo is

The **Expo React Native (Android-first) companion app** for the health
intelligence platform. Its job is data acquisition on-device and getting
clean physiological signal off the phone and into the backend event spine.

It is **not** the backend (`health-app`) and **not** the analytics layer.
Connectors, sync, and on-device capture live here; algorithms do not.

---

## Two-mode split (hard boundary)

- **Claude chat** — architecture, algorithm design, knowledge-file *content*,
  PowerShell commands. Proposes. **Never commits.**
- **Claude Code CLI** — all codebase changes. The only actor that writes to
  the working tree and commits.

The commit is the only sync point between the two modes. If it isn't
committed, the other mode cannot see it and it does not exist.

---

## Single-writer convention

The **repo is the source of truth** for all volatile project state — not the
Claude.ai project knowledge, not chat memory, not a doc somewhere.

Only two actors write canonical state:
1. **Claude Code** (this CLI)
2. The **`@claude` GitHub Action**

Chat proposes content; Code writes it. No exceptions.

### Canonical stores
| File | Holds |
|------|-------|
| `CLAUDE.md` | This contract. Conventions, architecture invariants. |
| `DECISIONS_LOG.md` | Append-only decision record. Supersede by reference, never edit in place. |
| `ROADMAP.md` | Forward work + the current sprint block. |
| `FEEDBACK.md` | Friction log on the workflow and on Claude's behaviour. |
| `closeout.md` | The single committed cold-resume handoff. Overwritten each `/closeout`. |

---

## Architecture invariants (do not violate without a logged decision)

- **Raw physiological signals only.** No proprietary composite scores
  (Body Battery, Energy Score, etc.) as inputs. Every signal traces to a
  measurable mechanism.
- **Samsung Health accessibility scraper is the permanent HRV path.**
  Samsung Ring HRV does **not** flow through Health Connect. The scraper is
  not a stopgap — it is the architecture.
- **Health Connect is the bridge for non-Samsung sources** only.
- **Device agnosticism.** A `source` field abstracts hardware. App code never
  couples an algorithm to a device-specific schema.
- **Verify before you build on it.** A signal enters design only with proof it
  works — a confirmed test, a verified query, or official docs. "The API has a
  field for it" is not proof.
- **Infer → surface → confirm.** Never write a confident-but-unverified
  reconstruction into a source of truth.

---

## Decisions log discipline

- **Append-only.** Never edit or delete a past entry.
- **Supersede by reference.** A reversal is a new entry that names the entry it
  supersedes. The old entry stays.
- Every entry records the decision, the reasoning, and — where it matters —
  **how you know** (the verification).

---

## Environment

- **Windows / PowerShell.** Linux idioms do not work here: no backslash line
  continuation, no `head`/`tail`, no inline `*` globbing the way bash does.
- For DB queries, **write a Python script to a file** via
  `Out-File -Encoding utf8` and run it — don't fight inline quoting.

---

## The closeout ritual

- **`/closeout`** (Code slash command) — reads the canonical stores, reports
  actual commits via `git log`, reconciles the pending queue, regenerates the
  handoff, overwrites the single `closeout.md`, and commits it.
- **`;cc`** (Espanso, system-wide) — fires the chat-side closeout: emits a
  pending-commit queue in canonical format flagged PENDING. Writes nothing.
- **`/compact`** is context compression, **not** a closeout. Different thing.

A session is not done until `/closeout` has run and committed.

---

## Session rituals (the contract the close-outs conform to)

_Canonical block, transplanted verbatim from the shared loop rules in
`health-app/CLAUDE.md`. Edit only there, then copy here — never paraphrase in
place._

The trigger is not the payload. The payload is defined here; the snippet/command bodies
must match it.

- **Session open** — at session start, before acting on any brief, Code reports the current
  `DECISIONS_LOG.md` max decision number (matching the file's actual `###` heading format).
  Chat re-aims any brief against it, so a stale project copy never masquerades as canon.
- **Chat close-out (`;cc`)** emits the **pending-commit queue**: canonical-format
  `DECISIONS_LOG` / `OPEN_QUESTIONS` entries for everything decided that session, each
  flagged `PENDING`, ready to paste or file as an issue with zero reformatting. Writes
  nothing to project knowledge.
- **Code close-out (`/closeout`)**:
  1. Reads the canonical stores.
  2. Reports the **actual commits** made this session (`git log` since open) — not
     suggested commit messages.
  3. **Reconciles the pending-commit queue**: confirms each `PENDING` item landed in a
     commit, or states why not.
  4. Regenerates the cold-resume handoff view from the stores.
  5. Overwrites a single `closeout.md`. Never appends narrative; never describes the act
     of writing the close-out.
  6. Emits the full current text of every governance store touched this session
     (`DECISIONS_LOG` / `OPEN_QUESTIONS` / `ROADMAP` / `FEEDBACK` / `Ideas`) for wholesale
     project-copy replacement — not a prose summary. Chat replaces the project copies
     wholesale and never regenerates these stores from memory.
- `/compact` is mid-session context compression, **not** a close-out. Do not conflate.
