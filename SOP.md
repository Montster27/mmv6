# MMV — Standard Operating Procedures
> The one file you look at when you forget the process.
> Lives in the repo root so every Code session sees it.
> Last updated: 2026-04-27

---

## The Four Commands

You have four standard phrases. Use them literally — they're designed so any environment picks them up without ambiguity.

### 1. "Start session"
Paste this at the top of every Claude Code session:

```
Read SOP.md, HANDOFF.md, and GLOSSARY.md.
Check MAPPING.md at ~/Documents/MMV/_assets/MMV_Docs/Kanban data/MAPPING.md
for current sprint tickets.
Tell me: top of stack, any vocabulary drift, any blocked tickets.
Today I'm working on: [describe what you want to do]
```

When reading HANDOFF.md, scan the **Branches in flight** section near the top — it lists every non-main branch with its merge gate and gate owner. If anything you're about to do touches one of those branches, surface the gate to the user before starting.

For claude.ai (PM) sessions, just say "Start session" — the PM knows this file.

For Cowork sessions (Obsidian / design brain):
```
Check your project memory for where we left off.
Today I need to [specific task — write a spec / produce a deck / organize docs].
```

### 2. "End session"
Say this at the end of every Claude Code session. Code should:

1. **Update HANDOFF.md** — what we did, what's next, any new decisions
2. **Update "Branches in flight"** — if any branch was created, advanced, merged, or had its gate change this session, edit the table near the top of HANDOFF.md to match. When a branch merges to main, remove its row.
3. **Update Kanban tickets** — move completed tickets to `col_done`, create new tickets for work discovered, update `modified` and `modifiedBy: claude-code`. **Before writing `status: col_done` on any ticket, paste the verifying shell output (test result, SQL scan, file listing) into the close note.** Don't close on intent — close on evidence. The ticket body should be a report of what happened, not a summary of what should have happened.
4. **Log decisions** to `docs/DECISIONS.md` if any design calls were made
5. **Write one MemPalace note** if a non-obvious rationale needs preserving (the "why", not the "what")
6. **Flag** anything that needs attention in the next session

The Kanban board lives at: `~/Documents/MMV/_assets/MMV_Docs/Kanban data/`
Ticket conventions: see `claude.md` in that directory. Key rules:
- Filename = ticket ID (`T-<13-digit-timestamp>.md`)
- `modifiedBy: claude-code` (never use Monty's profile name)
- Rewrite the ENTIRE ticket file on every edit (Chokidar watches for partial writes)
- Don't regenerate MAPPING.md — the app does it on next load

### 3. "Sprint plan"
Say this in claude.ai. The PM will:

1. Read MAPPING.md for current board state
2. Review what's in `col_todo` and `col_doing`
3. Ask what you want to focus on this sprint (1-2 week window)
4. Pull tickets from backlog into the sprint
5. Create a sprint in `board.json` with dates
6. Flag any tickets that need breakdown first

### 4. "Drift check"
Say this in claude.ai when things feel fuzzy. The PM will audit:

- **Vocabulary**: are we using GLOSSARY.md terms or have synonyms crept in?
- **Epic coverage**: is every active epic getting touched, or are some stalling?
- **Stranded tickets**: anything in `col_doing` for more than a week?
- **MemPalace health**: is it being queried or just written to?
- **Doc freshness**: are HANDOFF.md, CHAIN-MAP.md, ENGINE-SPEC.md current?
- **Test health**: are playthrough traces passing? Any new content without coverage?
- **Ticket-vs-disk audit** *(added 2026-04-27 after the T-1777215600001/002 fabricated-work incident)*: run `npx tsx scripts/audit-closed-tickets.ts` from the repo root. The script walks every `col_done` ticket, regex-extracts file references (migrations, playthrough scripts, source paths, docs), and reports any reference whose target file is missing from disk. Triage findings — most are real (file was claimed but not written); some are false positives ("replaces planned `docs/X.md`" phrasing matches the regex). Either delete the dead reference or reopen the ticket. See `docs/AUDIT-PATTERN.md` for the protocol.

---

## File Roles (canonical — no duplicates)

| File | Role | Updated by | Lives at |
|------|------|-----------|----------|
| **HANDOFF.md** | Session bridge — what's done, what's next, current state | Code (end of session) | repo root |
| **SOP.md** | Process instructions — how to work (this file) | PM (when process changes) | repo root |
| **GLOSSARY.md** | Vocabulary lock — canonical terms | PM (when terms drift) | repo root |
| **TASKS.md** | Legacy task board — **being superseded by Kanban Pro** | Deprecated | repo root |
| **docs/CONTENT-RULES.md** | Engine placement rules (chain vs pool, the 10-rule spec) | Code (when engine changes) | `docs/` |
| **docs/CONTENT-PROCESS.md** | Content creation workflow (plan → spec → build → look → decide) | PM (when workflow changes) | `docs/` |
| **docs/DECISIONS.md** | Design rationale log — the "why" behind choices | Code or PM (after decisions) | `docs/` |
| **docs/CHAIN-MAP.md** | Current chain wiring + flags | Code (after content changes) | `docs/` |
| **docs/ENGINE-SPEC.md** | Engine behavior spec (partially outdated — see HANDOFF) | Code (needs refresh) | `docs/` |
| **CLAUDE.md** | Claude Code project bible — auto-read by Code | Code (when conventions change) | repo root |
| **Kanban MAPPING.md** | Ticket index — read-first triage view | Kanban Pro (auto-generated) | `~/Documents/MMV/_assets/MMV_Docs/Kanban data/` |
| **Kanban board.json** | Board topology, epics, sprints | Kanban Pro UI or PM | `.kanban/` in Kanban dir |
| **MemPalace** | Decision memory — rationale that would get re-explained | Code or PM (after non-obvious decisions) | Obsidian vault |

### What does NOT go where
- **Kanban** does not store design rationale (that's DECISIONS.md or MemPalace)
- **MemPalace** does not track task state (that's Kanban)
- **HANDOFF.md** does not store process instructions (that's SOP.md)
- **TASKS.md** is being superseded — stop adding to it; use Kanban tickets instead

---

## Environment Routing

| I want to... | Go to | Why |
|--------------|-------|-----|
| Decide what to build next | claude.ai | PM has board context + memory |
| Write a storylet brief | claude.ai | Needs collision awareness, story context |
| Write code / SQL migrations | Claude Code | Needs repo, types, test runner |
| Plan a stream map or arc | claude.ai → Cowork | Plan in PM, spec in Obsidian |
| Playtest in browser | You (manually) | Code can't run browser tests reliably |
| Update design docs in Obsidian | Cowork | File access to the vault |
| Review board state / sprint plan | claude.ai | PM reads MAPPING.md |
| Debug a broken engine behavior | Claude Code | Needs codebase + test runner |
| "This doesn't feel right" | claude.ai → Code | Diagnose here, fix there |

---

## The Content Loop

Every piece of content follows this cycle (detail in `docs/CONTENT-PROCESS.md`):

```
PLAN (claude.ai)  →  SPEC (claude.ai or Cowork)  →  BUILD (Code)  →  LOOK (play it)  →  DECIDE (claude.ai)
```

Most content cycles 2-3 times. That's the process working, not failing.

---

## Drift Prevention (mirrors Code's 4-tier model)

| Tier | Code equivalent | Process equivalent |
|------|----------------|-------------------|
| **1 — Invariants** | Unit tests (`selectTrackStorylets.test.ts`) | Every session ends with HANDOFF + Kanban updated |
| **2 — Traces** | Playthrough golden files | HANDOFF.md history shows drift over time |
| **3 — Coverage** | Storylet coverage reporter | Sprint retro checks epic coverage, stranded tickets |
| **4 — Validation** | `validate-content.ts` in CI | Kanban ticket YAML validity, GLOSSARY.md term audit |

---

## When You Forget

If you can't remember the process: **read this file.**
If you can't remember a term: **read GLOSSARY.md.**
If you can't remember what's been done: **read HANDOFF.md.**
If you can't remember what's next: **read MAPPING.md** (Kanban triage view).
If you can't remember why a decision was made: **check docs/DECISIONS.md or ask the PM to check MemPalace.**
