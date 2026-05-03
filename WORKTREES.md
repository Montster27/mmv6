# MMV — Worktree Rules

> Parallel Claude Code sessions on the same repo, without conflict.
> Read this before starting a second concurrent session.

---

## Why we use worktrees

Two Claude Code sessions can edit the same repo simultaneously without `git stash` or branch-switching. Each session gets its own working directory and its own branch; the `.git/` dir is shared.

**Distinction worth knowing:** Claude Code also creates auto-isolated agent worktrees under `.claude/worktrees/` for its own internal agent invocations. Those are different from the operator-spun worktrees this document covers. Operator worktrees are explicitly created via `claude --worktree <name>` for parallel session work.

## Hard rules

1. **Cap at 2 concurrent sessions.** Three is the cognitive ceiling per the research. Going to 3 requires one to be "set-and-forget" (long-running test gen, doc regeneration). Four+ degrades quality faster than it gains throughput.

2. **One worktree owns migrations.** Supabase migrations are timestamp-ordered. Two worktrees both writing supabase/migrations/*.sql will collide on rebase. Designate the **main worktree** (the one in ~/Projects/V16MMV/mmv/) as the migration writer. Other worktrees pull migrations, never write them.

3. **One worktree owns the dev server.** npm run dev binds to a port. Pick a worktree to run the dev server in; the other reads from the deployed Vercel preview when it needs to playtest.

4. **One worktree owns Kanban writes per session.** Kanban Pro's Chokidar watcher reacts to file writes; two parallel sessions both writing tickets can race. Either: (a) the migration-owner worktree also owns Kanban writes, or (b) the non-owner uses Cowork/claude.ai for Kanban work.

5. **Non-overlapping file scopes.** Tell each session in its opening prompt which dirs it owns. Example: session A "you only touch src/storylets/ and supabase/migrations/"; session B "you only touch src/components/ and __tests__/".

6. **Always start with /start-session.** Each worktree gets its own conversation history; both still need the SOP context.

## Naming convention

Operator worktrees live at .claude/worktrees/<branch-slug>/. Branch names use worktree-<topic>:

- worktree-storylet-eligibility
- worktree-content-lint
- worktree-day3-friction

When a worktree's branch merges to main, delete the worktree by running:
git worktree remove .claude/worktrees/<branch-slug>

## Daily workflow

**Starting a parallel session:**

In your main terminal:
cd ~/Projects/V16MMV/mmv
claude --worktree storylet-eligibility "Implement X per .claude/briefs/X.md"

In a separate terminal:
claude --worktree content-lint "Add a content-rules linter that scans /content for violations"

The --worktree flag (or -w):
- Creates .claude/worktrees/storylet-eligibility/ as a new working dir
- Creates branch worktree-storylet-eligibility off main
- Auto-copies files from .worktreeinclude (env files, .vercel/) into the new dir
- Starts a Claude Code session inside that worktree

**Listing what's running:**
git worktree list

**Cleaning up after a merge:**
git worktree remove .claude/worktrees/<branch-slug>
git branch -d worktree-<branch-slug>

## When to NOT spin up a parallel worktree

- The two tasks share files (cognitive switching cost > throughput gain)
- You can't articulate the file-scope split in one sentence
- The "second" task is small enough to do after the first finishes (most tasks)
- You're tired — split attention degrades fast

The default is **serial**. Parallel is opt-in for genuinely independent work.

## Cost note

Two parallel sessions burn roughly 2x the tokens. The win comes from compressing wall-clock time, not from reducing token cost. If your weekly cap is the binding constraint, parallel worktrees make it worse, not better. Use them when *time* is the constraint.

## Failure modes seen in the wild

- **Migration timestamp collision after rebase** — fix: always rebase the non-migration worktree onto the migration worktree before pushing
- **.env.local missing in new worktree** — fix: ensure it's listed in .worktreeinclude
- **Vercel deploy from wrong worktree** — fix: only the migration-owner worktree pushes to deploy branches
- **Cognitive ping-pong** — fix: 25-minute Pomodoro per worktree before checking the other
- **Headless `-p` flow can't read OAuth credentials** — `claude --worktree <name> -p "..."` fails with "Not logged in" because OAuth tokens aren't passed to headless child processes. Fix: open the worktree directory in a separate Code window/tab (the intended operator pattern), or export ANTHROPIC_API_KEY for true headless use.
