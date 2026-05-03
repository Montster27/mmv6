---
description: Read MMV session-bootstrap files and report current state
---

Read these files in order, then report:

1. `MMV-CONVENTIONS.md` — MMV-specific rules (file roles, invariants, environment routing)
2. `SOP.md` — process and the four standard commands
3. `HANDOFF.md` — current top-of-stack, branches in flight, recently merged
4. `GLOSSARY.md` — vocabulary lock
5. `~/Projects/MMV/_assets/MMV_Docs/Kanban data/MAPPING.md` — current sprint board

**Do NOT read `HANDOFF-archive.md`** unless I explicitly ask you to look something up in it.

After reading, tell me:
- **Top of stack** — the one concrete next thing per HANDOFF.md
- **Branches in flight** — any non-main branches with their merge gate
- **Active tickets** — what's in `col_doing` and `col_todo` per MAPPING.md (just IDs + titles, not full bodies)
- **Vocabulary drift** — any term in HANDOFF.md or recent commits that contradicts GLOSSARY.md
- **Anything blocked** — tickets with `blocks` links pointing to incomplete work

Then ask me what I'm working on today.
