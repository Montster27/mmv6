---
description: Run the MMV end-of-session protocol per SOP.md §2
---

Run the End Session protocol from SOP.md §2. In order:

1. **Update `HANDOFF.md`**:
   - Replace "Top of stack" with the next concrete thing
   - Update "Branches in flight" if any branch was created/advanced/merged this session (remove rows for merged branches)
   - Add a 1-line entry to "Recently merged (last 7 days)" for each meaningful commit
   - Trim "Recently merged" to last 7 days; move older entries to `HANDOFF-archive.md` (append, never edit existing content)
   - Keep `HANDOFF.md` under ~600 words. Detail goes to `HANDOFF-archive.md`.

2. **Update Kanban tickets**:
   - Move completed tickets to `col_done`
   - Create new tickets for work discovered
   - Update `modified` to current ISO 8601
   - Set `modifiedBy: claude-code`
   - **Before writing `status: col_done`, paste verifying shell output** (test result, SQL scan, file listing) into the close note. Close on evidence, not intent.
   - Rewrite the ENTIRE ticket file on every edit (Chokidar watches for partial writes).

3. **Log decisions** to `docs/DECISIONS.md` if any design calls were made.

4. **Write one MemPalace note** if a non-obvious rationale needs preserving (the "why", not the "what").

5. **Flag** anything that needs attention next session in HANDOFF.md "Open questions for next session."

Show me what you wrote in HANDOFF.md before committing anything.
