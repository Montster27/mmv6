# Working together in Content Studio

Updated October 4, 2026 on `Narrative_rebuild`.

## Start with the team and direction

An administrator opens **My work**, adds existing game accounts to the content team, and assigns writer, lead, reviewer, or publisher roles. Administrator access remains available. Tester access alone does not grant editing rights.

Create an assignment with an owner, reviewer, and brief. Its workspace starts from the current release. In **Narrative map**, write the direction, plots, strands, and arcs. A small plot can skip layers. Link storylets to arcs, and link plans to shared definitions. Planning hierarchy organizes the team's responsibility; it does not prescribe the player's route.

A lead can assign a new workspace to another contributor. Select an approved parent plan when creating the assignment, or use “Assign work from the approved version of this plan” in the narrative map. The assignment screen and editor banner show the inherited direction, constraints, suggestions, and acceptance paths with their source plans. For closely related work, the owner can add contributors to one workspace. For independent arcs, use separate workspaces and integrate them after review. Publish a planning brief first when several independent assignments need the same approved direction. Planning-only releases do not require an offer scenario.

The required constraints, creative suggestions, and open questions have separate fields. Record entrances, conclusions, timing, acceptance paths, and what happens when the player misses or declines the arc. Shared library definitions hold guidance for facts, NPCs, locations, calendars, skills, resources, and narrative rules.

## Write and compare

Choose a workspace before opening the existing storylet, track, or rule editor. Released content is read-only. Each browser tab keeps its own workspace selection. Draft saves do not change what players see.

Workspaces hold changed objects and removals against an immutable baseline. Every mutation checks the workspace revision. Concurrent saves are rejected instead of silently overwriting work. Keep your unsaved form open, load the current context, compare the saved version, incorporate the other author's changes, and acknowledge the new revision before retrying. Storylet editors provide the same comparison step.

Different workspaces can advance independently. When a newer release changes a declared dependency or parent brief, Studio shows the changed fields and the connection to your assignment. Removed agreements are included. Review and acknowledge these changes before rebasing; the server checks those acknowledgements against the exact release and records the review in the audit history. Unrelated changes and bookkeeping timestamps do not trigger this impact review. If another workspace publishes first, compare and rebase your workspace. Independent changes integrate automatically. For overlapping objects, explicitly keep the draft or released version, then re-review. To combine both versions, retain your draft and edit it after rebasing. Any new change to the active release during integration rejects the stale comparison.

## Shared facts and calendar agreements

In **Library**, a fact can define true/false, numeric, or named values. An unknown initial state is distinct from a known false value. Plans declare which values they require on entry and which they may establish as possible outcomes. Review blocks missing definitions, invalid values, and contradictory entry assumptions. These references also participate in dependency impact review without requiring a duplicate manual link.

Calendar definitions can reserve a track day and hour range, with defined NPCs, a location, and optional fact conditions. Unconditional overlapping reservations for the same NPC at different locations block review. Conditional overlaps generate editorial warnings; contradictory fact conditions identify mutually exclusive alternatives. Events on different track clocks receive a warning rather than an unsupported claim of simultaneous timing. Adjacent windows do not overlap.

Bind a boolean fact to an existing persistent gameplay flag, with a known false initial value. Each fact agreement can link a scene and, for an output, a producing choice. Studio verifies that the actual scene requires the flag or that the choice sets it. Missing links are warnings; broken links and inconsistent implementations block review. Persistent flags currently support setting/requiring true only. Numeric values, enum transitions, false resets, unknown-state semantics and NPC-specific knowledge need runtime adapters before they can receive such a binding.

Calendar definitions link their actual occurrence scenes and a runtime segment. Studio checks the track, exact track day, segment, active state and fact gate. Conflict scenes cannot enforce an appointment because they bypass segment restrictions when time is tight. The runtime enforces day/segment eligibility; exact clock hours remain planning guidance and receive an explicit warning. These checks verify authored conditions rather than synthesize new effects or a scheduler.

## Rehearse a sequence

In **Review & playtests**, add a **Rehearsal**, set starting resources and time, and add ordered choices, time advances, or state checks. Each step can require or forbid offers and check exact energy/stress values. Advanced editing adds history, flags, trained skills, NPC relationship expectations, practice requests and per-track start days. Apply or discard advanced edits explicitly before saving. Use scene IDs for offer assertions, not ambiguous storylet keys.

The runner uses the game’s selector, resource collector/clamping, relationship event reducer, and default overnight recovery. It records before/after state at every step, including history, persistent flags, chain pointers, preclusions, NPC relationships and resources. A failed transition or expectation stops dependent steps. Traces link to the scene and choice. Tests are bounded to 64 steps each, deterministic, and never write player state. Saved rehearsals run again for submission, approval and publication.

The current track runtime does **not** deduct `time_cost` or `time_cost_hours` on a terminal choice. Rehearsals preserve that behavior and explicitly report the gap; advancing a segment consumes four hours. Practice records an opportunity to accelerate active real-time training, not a skill level or a newly trained skill. Sleep assumes no allocations or unresolved tensions. Dialogue walks, probabilistic checks, mini-games, identity/vector effects and other unsupported choice mechanics fail with an adapter-needed message. Routine-week progression, consequence processing, prose meaning and persistence/network failures are outside this bounded track rehearsal.

## Run the team pilot

Create a fresh draft and choose **Add study-group pilot to draft** in Review & playtests. The import contains seven scenes, seven role/plan briefs, nine shared definitions and seven saved paths. It is one database transaction with normal ownership checks, revision conflicts and per-object audit records. A failure rolls back the whole import. It never publishes or creates fake contributors.

The seven paths cover attendance, decline, late entry, breaking and repairing a promise, renegotiation, choosing a competing floor gathering, and ignoring the arc. They deliberately preclude the surrounding catalog **within the test state only**. Passing these isolated paths does not prove integration with every existing arc; add integration rehearsals before publication.

Use the director and strand briefs to agree the direction. The invitation writer owns invitation/meeting/rescheduling; the repair writer owns missed commitments and late entry; another writer owns the floor gathering. An independent reviewer challenges the producer/consumer contracts and timing. Assign real people through My work. Publish agreed planning briefs first if separate workspaces need the same approved parent, then hand off work through the existing assignment workflow. Template role labels are not evidence of human review.

## Review and publish

Use **Review & playtests** to inspect before/after content, affected dependencies, structural errors, editorial warnings, and revision discussion. Comments record the authenticated author and revision. Saved tests declare a day, segment, history, flags, choices, and skills, with offers that must or must not appear. The game’s actual track offer selector runs these scenarios against the complete draft.

Request review after resolving blockers. The assigned reviewer can request changes or approve that exact revision. Owners and contributors cannot approve their own work. A publisher activates approved work in **Releases**. Publication checks the complete manifest, re-runs saved scenarios, records the test evidence, and switches the active release in one database transaction. Runtime content changes require at least one passing saved scenario. A changed baseline or further edits invalidate approval.

Existing playthroughs keep their pinned release. New playthroughs use the active release. Resetting a run allows it to pick up the active release. Rolling back selects a previous complete release for new runs and preserves existing runs.

## Current boundaries

- Scope and permissions are enforced at workspace level. Object-level canon steward approvals, live presence, and simultaneous prose co-editing remain future work.
- The shared library stores reviewed planning guidance. It does not introduce new runtime facts, NPC knowledge semantics, skills, or resource mechanics. Mark an unimplemented capability as requiring engine work; that blocks release until resolved.
- Offer scenarios test one declared state. Multi-scene rehearsals add bounded track choices, resource effects and NPC reactions. Their explicit scope limits above still require editorial review and broader playtesting.
- Merge conflicts are resolved per object. There is no automatic paragraph or dialogue-node merge.
- Releases include storylets, tracks, consequence rules, plans, definitions, and scenarios. Compiled game rules remain code and require compatible application deployments.

## Maintenance and verification

Migration `20261003100000_studio_collaboration.sql` imports the existing catalog as an immutable baseline and pins existing lives to it. It adds server-only authoring tables, authenticated runtime reads, and a guard against old direct content writes. Do not update the identity tables directly in future content migrations; use reviewed Studio workspaces. Identity rows are retained for play history foreign keys, while the runtime reads release manifests.

Migration `20261004130000_studio_atomic_batch.sql` adds a service-only transactional wrapper around the existing draft-save command for pilot installation. It changes no player tables or content.

Validation: rehearsal and binding tests in `src/core/studio/rehearsal.test.ts`; unit tests in `src/core/studio/manifest.test.ts`; database transaction checks in `scripts/check-studio-database.mjs`; browser workflow tests in `tests/e2e/studio-collaboration.spec.ts`.

The SQL check runs the actual migration in a disposable PGlite database, supplied through `PGLITE_MODULE`. It contacts no remote database. Browser tests use synthetic API responses on a local build with `STUDIO_UI_TEST=1`, `BASE_URL`, and the `https://studio-test.supabase.co` placeholder configuration. The existing live playthrough suite needs real test credentials and is separate from those isolated checks.
