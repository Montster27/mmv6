# Working together in Content Studio

Implemented October 3, 2026 on `Narrative_rebuild`.

## Start with the team and direction

An administrator opens **My work**, adds existing game accounts to the content team, and assigns writer, lead, reviewer, or publisher roles. Administrator access remains available. Tester access alone does not grant editing rights.

Create an assignment with an owner, reviewer, and brief. Its workspace starts from the current release. In **Narrative map**, write the direction, plots, strands, and arcs. A small plot can skip layers. Link storylets to arcs, and link plans to shared definitions. Planning hierarchy organizes the team's responsibility; it does not prescribe the player's route.

A lead can assign a new workspace to another contributor. For closely related work, the owner can add contributors to one workspace. For independent arcs, use separate workspaces and integrate them after review. Publish a planning brief first when several independent assignments need the same approved direction. Planning-only releases do not require an offer scenario.

The required constraints, creative suggestions, and open questions have separate fields. Record entrances, conclusions, timing, acceptance paths, and what happens when the player misses or declines the arc. Shared library definitions hold guidance for facts, NPCs, locations, calendars, skills, resources, and narrative rules.

## Write and compare

Choose a workspace before opening the existing storylet, track, or rule editor. Released content is read-only. Each browser tab keeps its own workspace selection. Draft saves do not change what players see.

Workspaces hold changed objects and removals against an immutable baseline. Every mutation checks the workspace revision. Concurrent saves are rejected instead of silently overwriting work. Keep your unsaved form open, load the current context, compare the saved version, incorporate the other author's changes, and acknowledge the new revision before retrying. Storylet editors provide the same comparison step.

Different workspaces can advance independently. If another workspace publishes first, compare and rebase your workspace. Independent changes integrate automatically. For overlapping objects, explicitly keep the draft or released version, then re-review. To combine both versions, retain your draft and edit it after rebasing. Any new change to the active release during integration rejects the stale comparison.

## Review and publish

Use **Review & playtests** to inspect before/after content, affected dependencies, structural errors, editorial warnings, and revision discussion. Comments record the authenticated author and revision. Saved tests declare a day, segment, history, flags, choices, and skills, with offers that must or must not appear. The game’s actual track offer selector runs these scenarios against the complete draft.

Request review after resolving blockers. The assigned reviewer can request changes or approve that exact revision. Owners and contributors cannot approve their own work. A publisher activates approved work in **Releases**. Publication checks the complete manifest, re-runs saved scenarios, records the test evidence, and switches the active release in one database transaction. Runtime content changes require at least one passing saved scenario. A changed baseline or further edits invalidate approval.

Existing playthroughs keep their pinned release. New playthroughs use the active release. Resetting a run allows it to pick up the active release. Rolling back selects a previous complete release for new runs and preserves existing runs.

## Current boundaries

- Scope and permissions are enforced at workspace level. Object-level canon steward approvals, live presence, and simultaneous prose co-editing remain future work.
- The shared library stores reviewed planning guidance. It does not introduce new runtime facts, NPC knowledge semantics, skills, or resource mechanics. Mark an unimplemented capability as requiring engine work; that blocks release until resolved.
- Offer scenarios test one declared state across tracks. They do not prove full conversation traversal, prose continuity, resource outcomes, NPC scheduling, or all possible playthroughs. Those still require editorial review and broader playtesting.
- Merge conflicts are resolved per object. There is no automatic paragraph or dialogue-node merge.
- Releases include storylets, tracks, consequence rules, plans, definitions, and scenarios. Compiled game rules remain code and require compatible application deployments.

## Maintenance and verification

Migration `20261003100000_studio_collaboration.sql` imports the existing catalog as an immutable baseline and pins existing lives to it. It adds server-only authoring tables, authenticated runtime reads, and a guard against old direct content writes. Do not update the identity tables directly in future content migrations; use reviewed Studio workspaces. Identity rows are retained for play history foreign keys, while the runtime reads release manifests.

Validation: unit tests in `src/core/studio/manifest.test.ts`; database transaction checks in `scripts/check-studio-database.mjs`; browser workflow tests in `tests/e2e/studio-collaboration.spec.ts`.

The SQL check runs the actual migration in a disposable PGlite database, supplied through `PGLITE_MODULE`. It contacts no remote database. Browser tests use synthetic API responses on a local build with `STUDIO_UI_TEST=1`, `BASE_URL`, and the `https://studio-test.supabase.co` placeholder configuration. The existing live playthrough suite needs real test credentials and is separate from those isolated checks.
