# MMV — Meta: How We Work With Claude on This Project

> Standing reference for how Claude (in any form — Claude.ai, Claude Code,
> Cowork) interacts with this repo. Read alongside MMV-CONVENTIONS.md and
> SOP.md when starting any work involving Claude on MMV.
>
> Updated: 2026-05-03 — at completion of Tier 1 of the optimization plan.

---

## What this document is for

We have an active optimization effort (the "Tiered plan") to compress
the development loop and get to playtest faster. That plan has its own
state-of-record at `docs/TIER-PROGRESS.md`. **This document captures
the meta-process** — the *how we work* facts that aren't in any other
file but that future sessions need to know.

If you're a fresh Claude.ai session continuing this work, read in order:
1. This file (META.md)
2. `docs/TIER-PROGRESS.md` (current optimization status)
3. `MMV-CONVENTIONS.md` (project rules)
4. `HANDOFF.md` (current top of stack)

---

## The optimization plan

A tiered plan to reduce Claude usage cost and increase parallel throughput
for solo creative-lead-plus-Code-implementer work on MMV.

| Tier | Theme | Status |
|---|---|---|
| 1 | Quick wins, baseline cuts | ✅ Complete (2026-05-03) |
| 2 | Larger structural payoff | ⏳ Pending |
| 3 | Bigger architectural changes | ⏳ Pending — only if 1+2 plateau |

Detailed status with commit SHAs lives in `docs/TIER-PROGRESS.md`.
**Pick the next Tier 2 item based on real-world friction signal**, not
the plan's a-priori ranking. The plan suggests 2.2 (Supabase preview
branching → Vercel) as highest-leverage for the "playtest faster" goal,
but a week of normal work will tell us better.

---

## Code prompt convention

Every Code prompt that does anything destructive follows this pattern:

```
1. Read context first
   - Existing files relevant to the task
   - Recent commits (`git log --oneline -10`)
   - docs/TIER-PROGRESS.md if optimization-related

2. Show plan and STOP for approval
   - Explicit "STOP. Wait for approval before staging or committing."
   - Show the diff or files-to-create
   - List what will and won't be committed

3. Execute after approval
   - Stage, commit, push as agreed

4. Verify with evidence
   - git log --oneline -N to confirm commits landed
   - Specific file checks (head, wc, ls)
   - Command output to prove state, not just intent
```

**Reasoning:** the STOP-for-approval pattern caught real issues during
Tier 1 install (Kanban-stomped CLAUDE.md, headless `-p` auth wall,
wrong-window paste, blanket `.claude/` ignore breaking commits silently).
It's the single most valuable convention we landed on.

### Prompt drafting rules
- **Inline file content** in prompts when possible (don't reference
  files that Code can't see)
- **Avoid triple-backtick code fences** in long prompts — they caused
  buffer truncation 2026-05-03
- **For long prompts include a sentinel check at the top:** "before
  doing anything else, scroll to the bottom and confirm you can see
  'End of files' followed by the trailing instructions. If you cannot,
  the prompt was truncated."
- **Use `═══` horizontal separators** instead of code fences for
  visual section breaks within prompts

---

## Known gotchas (from Tier 1 install)

### Kanban Pro overwrites files on project load
These four files are **auto-regenerated** by Kanban Pro and gitignored:
- `CLAUDE.md`
- `README.md`
- `AGENTS.md`
- `.github/copilot-instructions.md`

**Real MMV-specific Claude rules live in `MMV-CONVENTIONS.md`** —
immune from overwrite. Do NOT edit `CLAUDE.md` expecting changes to
persist; edit `MMV-CONVENTIONS.md`.

`.kanban/board.json` IS tracked (shared topology — column defs, field
defs, tag colors). No per-machine paths.

### Worktree types
Two distinct kinds, easy to confuse:

| Kind | Path | Branch | Purpose |
|---|---|---|---|
| Operator-spun | `.claude/worktrees/<topic-slug>/` | `worktree-<topic-slug>` | Manual parallel work via `claude --worktree <name>` |
| Auto-isolation | `.claude/worktrees/<random-slug>/` | `claude/<random-slug>` | Code's internal sandbox; leave alone |

When opening a "second window" for parallel work in the Mac desktop
client, **explicitly navigate to the operator worktree path** (use
Cmd+Shift+G in the open dialog to enter the dotfile path). Otherwise
the desktop client may default to creating an agent-isolation worktree.

### Headless `claude -p` can't read OAuth
A Claude session cannot spawn a child Claude via `claude -p` — the
child fails with "Not logged in" because OAuth tokens aren't passed
to headless processes. Only `ANTHROPIC_API_KEY` works for headless.

**Implication:** parallel agentic work is operator-driven (humans
opening second windows/terminals), not Code-driven (one Claude
spawning others). This matches the cognitive ceiling research
anyway — cap at 2 concurrent operator sessions.

### Mac dialog dotfiles
To navigate to `.claude/` paths in any Mac open/save dialog:
- `Cmd+Shift+.` toggles hidden file visibility (per-dialog), or
- `Cmd+Shift+G` opens "Go to folder" path field

### `.gitignore` patterns for `.claude/`
The blanket `.claude/` ignore breaks slash commands and project
settings that should ship. Use surgical pattern (already in place):

```
.claude/*
!.claude/commands/
!.claude/commands/**
!.claude/settings.json
!.claude/agents/
!.claude/agents/**
.claude/settings.local.json
.claude/worktrees/
.claude/logs/
.claude/cache/
```

---

## File ownership map (who edits what)

| File | Owner | Notes |
|---|---|---|
| `MMV-CONVENTIONS.md` | Claude.ai or Code | MMV rules, immune to Kanban Pro |
| `SOP.md` | PM (Claude.ai) | Process |
| `HANDOFF.md` | Code (at end-of-session) | One-page current state |
| `HANDOFF-archive.md` | Code (append-only) | Historical log; do NOT read unless asked |
| `WORKTREES.md` | Code or PM | Parallel-session rules |
| `docs/TIER-PROGRESS.md` | Code or PM | Optimization status |
| `docs/META.md` (this file) | Code or PM | Meta-process |
| `docs/DECISIONS.md` | Code or PM | Design rationale |
| `docs/CHAIN-MAP.md` | Code | Storylet wiring |
| `.claude/commands/*.md` | Code or PM | Slash commands |
| `.claude/settings.json` | Code or PM | Project Code config |
| `CLAUDE.md`, `README.md`, `AGENTS.md`, `.github/copilot-instructions.md` | **Kanban Pro auto-gen** | Don't edit |
| Kanban tickets | Code (with `modifiedBy: claude-code`) | Real task state |
| `MAPPING.md` (Kanban) | Kanban Pro auto-gen | Read-only triage |

---

## Tooling stack as of 2026-05-03

- **Editor for code:** Claude Code (Mac desktop client, v2.1.50+)
- **Default model:** `opusplan` (Opus 4.7 in plan, Sonnet 4.6 in execution) — set in `.claude/settings.json`
- **PM environment:** claude.ai (with project memory — see userMemories block)
- **Knowledge work / file management:** Cowork (where applicable)
- **Local LLM:** Ollama (running via `news_agg` project at `~/Projects/news_agg/`)
  — currently unused for MMV; Tier 2.1 plans LiteLLM router integration
- **MCP servers active:** zen, mempalace, vercel (auth pending),
  filesystem, supabase, granola, brave-search, github
- **CI:** none yet (Tier 2.3 plans Claude Code Action)
- **Preview deployments:** Vercel (per branch); Tier 2.2 plans Supabase
  preview branching to pair with this

---

## Things that are easy to forget but matter

1. **Type `/start-session` first.** Don't paste session-opener templates by hand. The slash command does the same thing, more reliably.
2. **Close on evidence, not intent.** Before marking a Kanban ticket `col_done` or claiming a feature works, paste the verifying shell output (test pass, file listing, SQL scan).
3. **Migrations are sequential.** Only the main worktree writes `supabase/migrations/`. Other worktrees pull, never write. Timestamp collisions on rebase are a real risk.
4. **`.claude/worktrees/` is gitignored.** Worktree dirs themselves don't ship; only the `.worktreeinclude` config does.
5. **Backups from install scripts go in `.gitignore`.** The `.tier1-backup-*/` pattern is already covered.
6. **Don't read `HANDOFF-archive.md`** unless explicitly asked. It's where old session logs go to die. Reading it on every session re-introduces the 22K-token leak that Tier 1.1 fixed.
