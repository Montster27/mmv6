# The Ticket-vs-Disk Audit Pattern

> Established 2026-04-27 after the T-1777215600001 / T-1777215600002 fabricated-work incident.
> Tracking ticket: T-1777215600100.

## Why this pattern exists

On 2026-04-27 a sprint review surfaced two `col_done` Kanban tickets whose bodies described work that had not been performed:

- **T-1777215600001** claimed five Week 2 playthrough scripts at `scripts/playthroughs/week2_l*.yaml` plus a `navigateTo` patch in `src/core/playthrough-runner/harness.ts`. None of those artifacts existed on disk.
- **T-1777215600002** (a node-usage review) was closed in the same edit window with detailed verdicts; by association the verdicts could not be trusted.

Both tickets were reopened. The work that *should* have been described in T-1777215600001 was then performed legitimately and the ticket re-closed with verifying output pasted into the close note.

The lesson: a `col_done` status without verifying evidence is just an assertion, and assertions decay. We need a routine that catches "claim without artifact" cheaply.

## The two-layer protocol

### Layer 1 — Per-edit verification (cultural, prompt-level)

When any agent (or human) closes a ticket, the close note must contain **the actual output of the verifying command**, not a summary of it. Examples:

- Closing a migration ticket: paste the result of `SELECT ... FROM storylets WHERE storylet_key = 'X'` showing the post-migration state.
- Closing a test ticket: paste the `npm run playthrough X.yaml` exit line + step count.
- Closing an audit ticket: paste the `ls` / `grep` / `wc -l` showing the file exists with the expected shape.

This is enforced via `SOP.md` "End session" step 3 (added 2026-04-27): "Before writing `status: col_done`, paste the verifying shell output."

The cultural norm is: **ticket bodies are reports, not summaries.** A reader six weeks from now should be able to reconstruct what happened from the ticket alone.

### Layer 2 — Periodic disk-vs-ticket audit (mechanical, scriptable)

Run `npx tsx scripts/audit-closed-tickets.ts` during every `drift check`. The script:

1. Walks `~/Documents/MMV/_assets/MMV_Docs/Kanban data/tickets/*.md`.
2. Filters to `status: col_done`.
3. Regex-extracts file references from the body. Patterns:
   - `supabase/migrations/<14digits>_<slug>.sql`
   - `scripts/playthroughs/*.yaml`
   - `src/**/*.{ts,tsx}`
   - `docs/*.md`
   - `scripts/*.{ts,tsx,sh}`
4. For each match, checks whether the file exists at `<repo-root>/<ref>`.
5. Reports any reference whose target is missing.
6. Exits 1 on findings, 0 if clean.

Flags supported:
- `--recent N` — only scan the N most-recently-modified `col_done` tickets (cheap routine pass).

### Triaging findings

The regex catches every file path mention, including:

- **Real stale claims** — file was named in the ticket but never written. **Action:** reopen the ticket, file a follow-up, or re-do the work and paste the output before re-closing.
- **Replaced/inlined references** — phrasing like "replaces planned `docs/X.md`" or "instead of writing `scripts/Y.ts` we did Z inline." The script flags these as missing because it can't read the surrounding sentence. **Action:** delete the dead reference from the ticket body, or rewrite it as a non-path mention. Don't leave the misleading phrasing.
- **Renamed/moved artifacts** — file was created at the path claimed, then renamed without updating the ticket. **Action:** correct the path in the ticket body.

The script is heuristic, not authoritative. Treat its output as a triage queue, not a fail/pass.

## Retroactive sweep — first run

The first retroactive sweep ran on 2026-04-27 against the full `col_done` set:

```
$ npx tsx scripts/audit-closed-tickets.ts
Scanned 125 col_done ticket(s). 50 file reference(s) extracted.
1 missing artifact(s) across 1 ticket(s).

STALE TICKETS:

  T-1776329281200  Strategic: Define release timeline and playtest gates
    modified: 2026-04-22T18:00:00.000Z by claude-ai
    [doc] MISSING: docs/RELEASE-TIMELINE.md
```

**Triage:** false positive. Body text says "Release timeline captured here (replaces planned `docs/RELEASE-TIMELINE.md`)" — the doc was deliberately not written; the content was inlined into the ticket. The ticket prose is misleading by including the path-shaped reference at all.

**Recommended cleanup:** edit T-1776329281200 to either (a) drop the path reference, or (b) rewrite as "Release timeline captured here instead of in a separate doc." Not done in the 2026-04-27 sweep — the ticket is honest about what happened and the regex flagging it counts as the script working as designed.

## When to extend the script

Add new patterns when a class of artifact starts being referenced regularly:
- A new content directory like `agents/<name>/...`
- A new migration scheme (e.g. dated SQL files outside `supabase/migrations/`)

When in doubt, add the pattern and accept some false positives. Triage cost is low; missed staleness is the failure mode the audit exists to prevent.

## Related tickets

- **T-1777215600001** (closed 2026-04-27, second time) — the originating fabricated-work case; contains the verifying output template that closures should follow.
- **T-1777215600002** (closed 2026-04-27, second time) — the by-association case; closure references `docs/L1-L5-NODE-USAGE-REVIEW-2026-04-27.md` as the artifact.
- **T-1777215600100** (this pattern) — the process-improvement ticket that established this audit step.
- **T-1777300000002** (open) — retroactive `col_done` audit; reads MAPPING.md to enumerate, then runs `audit-closed-tickets.ts` on the set. Was blocked on T-1777300000003 (MAPPING regen, closed 2026-04-27) — now unblocked.
