---
description: Run the MMV drift-check commands and report findings
---

Run these checks in order. Report any failures.

1. **Closed tickets vs disk**:
   ```
   npx tsx scripts/audit-closed-tickets.ts
   ```
   Exit 1 means a `col_done` ticket references a missing file. Triage findings.

2. **Type check**:
   ```
   npx tsc --noEmit
   ```

3. **Tests**:
   ```
   npx vitest run
   ```

4. **Playthroughs**:
   ```
   npm run playthrough:all
   ```

5. **Migration order**:
   ```
   ls supabase/migrations/ | sort -c
   ```
   Fails on out-of-order timestamps — usually means a rebase didn't fix up timestamps after a merge.

6. **Vocabulary drift** — read GLOSSARY.md, then grep recent commits and HANDOFF.md for any deprecated terms:
   ```
   git log --since="2 weeks ago" --pretty=format:"%s" | head -30
   ```
   Compare against GLOSSARY.md. Flag anything you don't recognize as a term-of-art.

Report what passed, what failed, and what needs a decision.
