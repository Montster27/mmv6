# End-of-Session Handoff Protocol
> When a user says "end session" (or similar), follow this checklist in order.
> This ensures continuity across sessions and keeps all tracking systems in sync.
> Referenced from CLAUDE.md. Lives at `docs/END-OF-SESSION-PROTOCOL.md`.

---

## Step 1: Update HANDOFF.md

Update the repo-root `HANDOFF.md` with:

1. **What we did this session** — add to the "What's Done" section if anything shipped, or note progress in "What's In Progress"
2. **Branches in flight** — if any branch was created, advanced (commit count changed), merged, or had its gate change this session, edit the table near the top. When a branch merges to main, REMOVE its row from this table — the merge commit goes in "What's Done."
3. **What's next** — update the "What's Next" section based on where we stopped
4. **New decisions** — add rows to the "Recent Decisions" table for any design calls made
5. **Known issues** — add or update rows in the "Known Issues" table
6. **Live DB State** — if storylets, NPCs, or tables were added/modified, update those tables
7. **Bump the "Last updated" date** at the top

---

## Step 2: Update Kanban Tickets

The Kanban board lives at a path OUTSIDE the repo:
```
~/Documents/MMV/_assets/MMV_Docs/Kanban data/
```

### For completed work:
- Find the matching ticket(s) in `tickets/`
- Change `status` from `col_todo` or `col_doing` to `col_done`
- Set `modified` to current ISO 8601 timestamp
- Set `modifiedBy: "claude-code"`
- If no ticket existed for the work, create one in `col_done` (see "Creating tickets" below)

### For new work discovered:
- Create a new ticket in `col_backlog` or `col_todo` depending on urgency
- Assign the appropriate `epic` from `board.json` (read it to find valid epic IDs)
- Tag appropriately: `content`, `engine`, `tooling`, `testing`, `bug`, `design`, `ui`, etc.

### For work started but not finished:
- Move the ticket to `col_doing` if it was in `col_todo`
- Add a note in the markdown body describing where you stopped

### Creating a ticket:
```yaml
---
id: "T-{13-digit-timestamp}"
title: "Concise title under 80 chars"
status: "col_backlog"
rank: "a0"
created: "2026-04-16T15:30:00.000Z"
type: "task"
priority: "medium"
assignee: ""
tags: ["engine"]
modified: "2026-04-16T15:30:00.000Z"
modifiedBy: "claude-code"
dueDate: ""
epic: "epic_mmv02mb_squeezes"
sprint: ""
---

Description of the ticket. Include:
- What needs to happen
- Any context from the session
- Acceptance criteria as checkboxes:
  - [ ] Criterion 1
  - [ ] Criterion 2
```

### Critical rules (from Kanban Pro claude.md):
- Filename MUST match the `id` field exactly (e.g., `T-1776329281011.md`)
- Rewrite the ENTIRE file on every edit (Chokidar watches; partial writes corrupt)
- `modifiedBy` MUST be `"claude-code"` — never the user's profile name
- Epic and sprint IDs must be read from `.kanban/board.json` — never invented
- Do NOT regenerate MAPPING.md — the app does it on next load

---

## Step 3: Log Decisions

If any design decisions were made during the session, append to `docs/DECISIONS.md`:

```markdown
### [Date] — [Decision Title]
**Context:** Why we faced this decision
**Decision:** What we chose
**Rationale:** Why
**Alternatives considered:** What we didn't choose and why
**Affects:** Which files/systems/tracks this impacts
```

Skip this step if the session was purely execution with no design calls.

---

## Step 4: MemPalace Note (optional)

Write a MemPalace note ONLY when there's non-obvious rationale that would get re-explained in a future session — the "why" behind a decision, not the "what."

Examples of when to write one:
- "We chose pool mode instead of chain mode for the morning-after variants because..."
- "The Contact scene was deleted because the reveal timing needs to shift to..."
- "We set expires_after_days to 7 for all orientation content because..."

Examples of when NOT to write one:
- Simple bug fixes (that's HANDOFF.md)
- Task completion (that's Kanban)
- Routine code changes (that's git history)

---

## Step 5: Summary to User

After completing steps 1-4, tell the user:

```
Session wrapped. Here's what I updated:
- HANDOFF.md: [brief summary of changes]
- Kanban: [tickets moved/created, with IDs]
- Decisions: [logged / none this session]
- MemPalace: [note written / skipped]

Next session, start with: "Read SOP.md, HANDOFF.md, and GLOSSARY.md."
Top of stack for next time: [the most important next thing]
```

---

## Checklist (quick reference)

```
□ HANDOFF.md updated (what we did, what's next, decisions, issues, DB state)
□ HANDOFF.md "Branches in flight" updated (if any branch state changed; remove row on merge)
□ Kanban tickets updated (completed → col_done, new work → col_backlog/col_todo)
□ modifiedBy set to "claude-code" on all touched tickets
□ docs/DECISIONS.md updated (if any design calls made)
□ MemPalace note written (if non-obvious rationale needs preserving)
□ Summary delivered to user with "top of stack" for next session
```
