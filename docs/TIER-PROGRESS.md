# TIER-PROGRESS — Optimization Install State

**Purpose.** Permanent state-of-record for the Claude Code optimization plan. Future Code sessions can grep `Tier 1.2`, `Tier 2.4`, etc. and find current status, commits, and remaining work without re-explanation.

**Origin.** Plan came out of a Claude.ai planning session. Tiers reflect cost vs. payoff, not priority within a tier.

**Legend.** ✅ shipped · ⏳ partial · ❌ pending

---

## Tier overview

| Tier | Theme | Effort | Status |
|------|-------|--------|--------|
| **Tier 1** | Quick wins — token baseline, model alias, hygiene, first worktree | ~6 hrs | ⏳ 3 of 4 shipped |
| **Tier 2** | Structural — local LLM router, preview branching, PR review action, state.json, pre-commit hooks | 1–2 weeks | ❌ all pending |
| **Tier 3** | Workflow polish — gstack roles, multi-worktree, Scheduled Tasks, storylet sim | After 1+2 plateau | ❌ all pending |

---

## Tier 1 — Quick wins

### Tier 1.1 — Audit + prune per-session token baseline

**Status.** ✅ shipped.

**What it does.** Cuts the per-session token cost of every Code chat by trimming HANDOFF.md to a thin pointer doc, archiving the long-form history, extracting durable conventions into a Kanban-Pro-immune file, and adding `.claudeignore` so Claude Code skips heavy directories during indexing.

| Commit | Message | What it landed |
|--------|---------|----------------|
| `9841c0e` | chore(tier1): split HANDOFF, add MMV-CONVENTIONS, add .claudeignore | HANDOFF.md 857 → 73 lines · HANDOFF-archive.md (835 lines, new) · MMV-CONVENTIONS.md (67 lines, new) · .claudeignore (51 lines, new) · SOP.md +11 lines |
| `d34a480` | chore: stop tracking Kanban Pro auto-generated files | Untracked CLAUDE.md, README.md, AGENTS.md, .github/copilot-instructions.md (Kanban Pro overwrites these on every project load — the real MMV content now lives in MMV-CONVENTIONS.md, which Kanban does not touch). Ignored `.tier1-backup-*/`. |
| `b585db7` | chore(tier1): ship project-shared .claude/ contents | Replaced blanket `.claude/` ignore with surgical pattern. Shipped `.claude/commands/` (8 slash commands: audit-content, drift-check, end-session, new-mini-game, new-npc, new-storylet, start-session, sync-board), `.claude/settings.json`, `.claude/agents/`. Still ignored: `.claude/settings.local.json`, `.claude/worktrees/`, logs, cache. |

**Adjacent ground-clearing commits (same install window, not in scope but cleared the deck).**

| Commit | What |
|--------|------|
| `be5fbdb` | chore(kanban): commit shared board topology, ignore agent-instruction auto-gens |
| `ba4d548` | docs(briefs): archive 4 code session briefs from 2026-04-29 / 2026-04-30 |

**Deviations from plan.**

- `d1f3e2d` — HANDOFF addendum committed *before* the Tier 1.1 install. Rather than going straight into the trimmed HANDOFF.md, the T-1777320000007 session log paragraph was appended to the old HANDOFF.md and got swept into HANDOFF-archive.md by `9841c0e`. Net effect is the same (the content is preserved in the archive), but the install was not a clean cut.
- **SOP.md duplicate "Drift check" heading.** Line 61 (`### 4. "Drift check"`) and line 147 (`## 5. "Drift check"`) both exist after the SOP.md edits in `9841c0e`. Known leftover, not yet cleaned up. The `## 5` block is the canonical one (it points at `MMV-CONVENTIONS.md → "Drift checks"` for the actual commands); the `### 4` is the orphan from the pre-split structure.

---

### Tier 1.2 — opusplan model alias as default

**Status.** ✅ shipped.

**What it does.** Defaults the project to the `opusplan` alias — Opus 4.7 in plan mode (architecture, design briefs, hard reasoning), Sonnet 4.6 in execution mode (codegen, refactors, test writing). Project-scoped so `news_agg` keeps its own defaults.

| Commit | Message | Files |
|--------|---------|-------|
| `1a62366` | chore(tier1): default to opusplan model alias | `.claude/settings.json` (+27 lines, new) |

**Verification.** `cat .claude/settings.json` → `"model": "opusplan"`. Confirmed.

---

### Tier 1.3 — Session hygiene routine

**Status.** ✅ shipped (behavioral commitment + slash command support).

- `/start-session` and `/end-session` encode the SOP rituals (`b585db7`) — operator no longer needs to paste the template
- Remaining behaviors (`/clear` between tasks, `/compact` when slow, one-task-per-chat, `diff`-pipe-to-`claude -p`) are operator-side; no harness enforcement by design

**Potential Tier 2 enhancement.** Status-line nag or pre-prompt hook for `/clear` and `/compact` reminders — would push enforcement from operator to harness. Track if Tier 1 hygiene proves hard to maintain in practice.

---

### Tier 1.4 — First parallel worktree

**Status.** ❌ pending.

**What it should land.** `.worktreeinclude` (whitelist of paths copied into each worktree), `WORKTREES.md` (operator runbook), and a 2-concurrent-session cap.

**Current state.** The 4 directories under `.claude/worktrees/` are auto-created **agent isolation** worktrees (one per agent invocation), not operator-designed parallel worktrees. The Tier 1.4 design specifies **operator-spun** worktrees via `claude --worktree <name>` for parallel session work, with a `.worktreeinclude` file and written rules in `WORKTREES.md`. Neither file exists yet.

- `.worktreeinclude` — does not exist
- `WORKTREES.md` (root or `docs/`) — does not exist
- `.claude/worktrees/` — interesting-thompson, quirky-mclaren, suspicious-shannon-2d9a47, vigilant-hermann (all dormant, Feb–Apr 2026)
- `git worktree list` confirms 5 active worktrees (main + 4 dormant agent worktrees + 1 prunable `/private/tmp/mmv-signal-hunt`); none are operator-driven

**Next step when picked up.** Decide cap (2 concurrent), draft `.worktreeinclude` (likely: `.claude/`, `supabase/migrations/`, `docs/`, `MMV-CONVENTIONS.md`, `SOP.md`, `GLOSSARY.md`, `HANDOFF.md`), write `WORKTREES.md` with the create/cleanup commands, prune the 4 dormant agent worktrees.

---

## Tier 2 — Structural (1–2 weeks)

| # | Item | Status | Notes |
|---|------|--------|-------|
| **Tier 2.1** | Hybrid local/cloud LLM router (LiteLLM + existing Ollama from news_agg) | ❌ pending | — |
| **Tier 2.2** | Supabase preview branching wired to Vercel preview deploys | ❌ pending | **Priority within Tier 2** — directly serves "compress loop to playtest faster." |
| **Tier 2.3** | Install `anthropics/claude-code-action@v1` (autonomous PR review, nightly content-rule lint) | ❌ pending | — |
| **Tier 2.4** | Replace prose HANDOFF.md with machine-readable `state.json` | ⏳ partial-anticipated | HANDOFF was trimmed in Tier 1.1 (857 → 73 lines), which sets up the state.json migration. The `state.json` file itself does not exist yet. |
| **Tier 2.5** | Pre-commit hooks for deterministic checks (typecheck, lint, storylet schema, content-rules grep, migration-order) | ❌ pending | — |

---

## Tier 3 — Workflow polish (only after 1+2 plateau)

| # | Item | Status |
|---|------|--------|
| **Tier 3.1** | gstack-style role workflow subset (`/office-hours`, `/review`, `/retro`, `/ship` cherry-picked from garrytan/gstack) | ❌ pending |
| **Tier 3.2** | 3-worktree pattern with WIP discipline | ❌ pending |
| **Tier 3.3** | Cloud Scheduled Tasks via `/schedule` for overnight work | ❌ pending |
| **Tier 3.4** | Storylet graph simulator (formal narrative verification) | ❌ pending |

---

## Install convention for future prompts

All Tier installs follow this four-step pattern. Future Code sessions should obey it without reminder.

### 1. Read context first

Before proposing changes, read what's already on disk and recent commits. Examples:

```bash
git log --oneline --since="3 days ago" main
git status
ls .claude/commands/ docs/
cat docs/TIER-PROGRESS.md   # this file
```

Specifically verify: does the file we're about to add already exist (in any form)? Has a previous attempt left partial state? Are there commits with `tier1`, `tier2`, etc. in the message that already covered this?

### 2. Show plan and STOP for approval

Before any destructive op (file delete, gitignore change, mass rename, untrack of tracked files, branch creation, force-push), surface the full plan as text and **stop**. Wait for explicit approval. Never roll forward through approval gates.

A plan should include:
- Files to be created (paths)
- Files to be modified (paths + 1-line summary of the change)
- Files to be untracked or deleted (paths + why)
- Commits to be created (subjects, in order)
- What "verify" looks like at the end

### 3. Execute

Once approved, execute the plan exactly as proposed. If mid-execution something looks different from what was planned (a file already exists with conflicting content, a command errors), stop and surface the divergence — don't improvise.

### 4. Verify with evidence

After execution, prove the install landed correctly. Acceptable evidence:

- `git log --oneline -n 5` showing the new commits
- `cat <file>` showing key content
- `ls -la <dir>` showing files exist with right perms
- `npx tsc --noEmit` / `npx vitest run` for code changes
- `wc -l` before/after for content trims

Then: update this file (`docs/TIER-PROGRESS.md`) with the new commits and any deviations, and commit that update separately as `docs(tier): update TIER-PROGRESS for Tier X.Y install`.

---

## Maintenance

When a Tier item ships:

1. Update its status row (✅) and fill in the commit + file table.
2. Note any deviations from plan in a "Deviations" subsection — future sessions need to know what's slightly off.
3. Update the **Tier overview** table at the top.
4. Commit as `docs(tier): update TIER-PROGRESS for Tier X.Y install`.

When a Tier item is started but not finished, mark it ⏳ and add a "Current state" subsection so the next session can pick it up cold.
