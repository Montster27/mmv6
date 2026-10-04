# Content Studio: collaborative narrative production

Status: design approved for implementation October 3, 2026. The first implementation is documented in [CONTENT-STUDIO-TEAM-GUIDE.md](CONTENT-STUDIO-TEAM-GUIDE.md); the broader design below remains the roadmap. It builds on the narrative rebuild and timing contracts. Older content-process documents are reference material, not automatically current requirements.

## 1. Product decision

Studio should connect narrative direction, delegated writing, integration, and playable releases. Its central unit of work should be an assigned brief with a clear boundary, supported by a set of draft changes. A writer should be able to answer four questions immediately: What am I making? What may I assume? What can I change? How will we know it works?

Use a hierarchy for responsibility and a dependency graph for the fiction. A planning branch describes a possible development, not a mandatory player route. Players may enter late, cross between strands, leave, return, or never participate. Streams remain lenses for reviewing life conditions; they do not own arcs, NPCs, or outcomes.

## 2. What the current code supports—and what it does not

The inspected Studio has storylet editing, track views, NPC inspection, a calendar, local validation, linked-scene previews, and the new single-track timing preview. These are useful building blocks.

Important gaps found in the current code:

- `src/app/api/admin/storylets/[id]/route.ts` updates shared storylet rows directly, using only the storylet ID as its write condition. Two editors can overwrite one another. An active storylet can change while players are using it.
- `src/app/api/admin/content-versions/route.ts` creates a snapshot of storylets and consequence rules. Its “published” label is not a complete runtime release boundary. Track resolution and daily selection still read the shared storylet table.
- The rollback route inserts another snapshot record; it does not restore the live storylet rows used by those runtime paths. A snapshot fallback helper exists, but this does not establish consistent version use throughout the engine.
- Studio access is a broad admin/tester check, not separate permissions to write, review, edit shared canon, or release content.
- The storylet client writes author information inside `requirements.audit`. Authenticated server audit records should replace this as the authority for attribution.
- The newer validator knows about timing fields and self-reference, but the create/update endpoints construct a reduced validation draft that omits track keys and timing, then write those fields separately. Those checks are therefore not enforced at these write boundaries. This is a correction to the earlier assumption that adding a validator automatically protected Studio saves.
- The timing preview covers one track, selected gates, and authored choices. It does not reproduce the full game’s resources, NPC knowledge, conversation paths, cross-track interactions, or release selection.
- Existing documents disagree about mandatory chains and independent opportunities. A writer needs an explicit current rule set, with superseded guidance identified.

The first implementation priority is safe editing and a real release boundary. Adding assignments without these protections would organize unsafe writes.

## 3. Planning model

| Level | Purpose | Required decisions | Typical accountable owner |
|---|---|---|---|
| Narrative direction | Define the experience across a chapter or era | Themes, dramatic questions, player freedoms, world constraints, desired range of outcomes, tone | Narrative director |
| Plot | Describe a sustained source of tension | Participants, competing wants, possible developments, public events, consequences if ignored | Plot lead |
| Strand | Delegate a coherent part of a plot | Scope, entry conditions, shared facts, interfaces with other strands, local review authority | Branch/strand lead |
| Arc | Resolve or transform a bounded question | Entrances, turns, possible conclusions, miss/re-entry/repair paths, time and resource constraints | Arc owner |
| Storylet | Author one playable encounter | What must be true, what the player can do, effects, knowledge, timing, later consequences | Writer |
| Scene nodes | Express dialogue and local actions | Prose, local branches, terminal outcomes | Writer within the storylet |

A small plot can go directly to arcs. Do not force six layers of paperwork. Every object has one accountable owner, optional contributors, and a reviewer. Assignment is not permission to alter everything it depends on.

Each arc has one primary parent for navigation and responsibility, plus links to other plots or strands it serves. A shared storylet has one canonical owner and can be referenced by multiple arcs; contributors do not clone it to make their own versions of the same event. Streams are many-to-many annotations on arcs and outcomes.

Separate the narrative map from editing workspaces. A fictional branch is a possibility for the player. A draft workspace is a proposed change to authored content. The UI must not call both “branches.”

## 4. The handoff brief

A lead creates a brief before asking a writer to implement an arc. Studio presents a short form with optional detail, not a blank specification page.

Required fields:

1. **Player experience:** What should this encounter let the player explore or express?
2. **Dramatic question:** What remains unresolved, and what changes by the end?
3. **Scope:** What this assignment owns; linked material it may reference.
4. **People and world:** Relevant NPC wants, facts, commitments, and locations.
5. **Entrances:** What may already have happened; what must not be assumed.
6. **Possible conclusions:** Including decline, absence, failure, or unresolved departure when appropriate.
7. **Timing and cost:** Fixed event, flexible opportunity, or event-relative proposal; resource bounds and competing claims.
8. **Connections:** Facts consumed and produced, reserved encounters, promised callbacks, and owners of dependent work.
9. **Acceptance examples:** A few concrete paths a reviewer must see working.
10. **Owner and reviewer:** Who does the work and who resolves disagreements.

Distinguish **required constraints**, **creative suggestions**, and **open questions** visually. “Priya has not heard the rumor” is a constraint. “Consider a tense library conversation” is a suggestion. A suggestion must not silently become a runtime rule.

A brief refers to a particular approved revision of its parent. When a lead changes direction, Studio identifies affected assignments and asks their owners to reconcile the change. Existing drafts are never silently rewritten. A revised paragraph about tone should not invalidate every arc; a changed deadline or fact that an arc consumes should.

## 5. Shared agreements between authors

The main integration mechanism is a small set of explicit agreements about facts, events, people, and time.

A shared fact definition includes a stable ID, plain-language meaning, scope, value type, default/unknown meaning, owner, allowed writers, readers, and how it can change. Distinguish a world fact, the player’s knowledge, an NPC’s knowledge, and an interpretation. False and unknown cannot be treated as interchangeable.

Example: “The player accepted the Thursday study meeting” is separate from “Priya knows they accepted,” “the player attended,” and “Priya believes the absence was deliberate.” One generic relationship score cannot substitute for these facts.

Cross-arc handoffs specify:

- What a producing arc can establish, on which outcomes, and by when.
- What a consuming arc requires and what it does if that fact never arrives.
- Whether the consumer requires an exact producer, any approved producer, or merely the fact itself.
- Who must approve a change to that agreement.

Most connections should use meaningful facts or events. Direct scene-to-scene requirements remain appropriate for actual callbacks and short local sequences. Do not make every arc depend on having seen every previous scene.

NPC profiles provide versioned biography, voice guidance, wants, knowledge constraints, relationships, and availability. An arc owns its contributions to that NPC’s behavior; the NPC steward reviews changes to shared characterization or incompatible scheduling. Stewards review meaningful changes, not every line of dialogue.

Resources and skills use the same shared library. Writers choose approved effects with narrative explanations and suggested ranges. Inventing a new resource, skill, or global fact creates a proposal for the relevant owner rather than an unannounced runtime field.

Capabilities must be explicit. Event-relative scheduling, cross-track causal requirements, persistent commitments, and broader fact semantics are not all supported by the present engine. Studio may let leads plan them, but must mark unsupported behavior as requiring engine work and prevent it from being presented as playable content.

## 6. Daily workflow and screens

### My work

Make this the default screen for contributors. Show assigned briefs, revision requests, blocked dependencies, upcoming reviews, and relevant changes since their last visit. Each card answers “What needs my attention?” and opens the exact object or comment. Do not default writers into a graph of the entire game.

### Narrative map

Use an expandable outline with a focused visual map beside it. Leads move from direction to plots, strands, and arcs; summaries show owner, status, dependencies, and unresolved questions. An arc card summarizes its player question and possible outcomes before its list of storylets. Calendar, stream, NPC, and resource views are filters on the same content.

### Assignment workspace

Use three areas: inherited brief and constraints; the current arc/storylet editor; contextual feedback. Keep only relevant people, facts, vocabulary, and dependencies in view. Advanced raw JSON remains available but is not required for ordinary authorship.

Writers can start from a planned storylet card with no prose. They can propose a changed ending or new entrance with a note. Out-of-scope changes are routed to the relevant lead instead of silently modifying the shared brief.

### Review

Show the base revision, proposed revision, playable consequences, and unresolved comments. Reviewers can distinguish prose changes from changes to facts, timing, gates, or costs. Every issue links to its cause and affected content. A reviewer can request changes on a specific passage, branch outcome, or shared agreement.

### World and releases

The shared library holds people, locations, calendar events, facts, skills, resource definitions, and the current narrative rules. The release screen assembles approved revisions, displays dependency completeness and playtest evidence, and offers an authorized publish action.

Navigation should be: **My work · Narrative map · Library · Review · Releases**, with Calendar, Graph, Streams, and Economy available as working views inside the map/library. Preserve deep links to existing editors.

## 7. Working together without lost changes

Use versioned change sets, presented as “draft workspaces.” A workspace starts from an approved baseline and contains only the objects changed for an assignment. Writers can preview the baseline plus those changes without making them live.

Every save sends the object revision the writer began with. The server accepts it only if that revision is still current in the workspace. Otherwise Studio preserves the local work and displays both edits. Presence indicators are helpful, but they are not the protection against lost updates.

Prefer different writers owning different storylets within the same arc. Support comments and suggestions immediately. Defer real-time simultaneous typing until evidence shows it is needed. This reduces coordination and implementation complexity without preventing concurrent work across arcs.

When integrating two workspaces, use their shared base to compare changes. Disjoint changes can merge after validation. Conflicting prose, ordered dialogue nodes, choices, and semantic effects require explicit review; never silently resolve them by last save. Stable node and choice IDs are needed to make this comparison meaningful.

Recommended permissions:

- Contributors edit assigned draft scope and propose changes elsewhere.
- Arc/strand leads approve local work and manage assignments within their scope.
- Canon stewards approve changes to shared definitions they own.
- Reviewers comment, test, and approve the scopes assigned to them.
- Release managers publish approved combinations.
- Administrators manage access; tester access alone does not grant production authoring or publishing rights.

One person may hold several roles. For small teams, self-review may be allowed by explicit policy with attribution. Permissions are enforced by the server and database, not only hidden controls.

## 8. Completion, review, and release

Use a short revision workflow: **Brief → Draft → In review → Approved**. “Blocked” is a reason attached to an assignment, not a competing content lifecycle. Published status belongs to a release containing exact approved revisions. An arc can therefore have a live revision while another revision is in draft.

Approvals record the exact revision reviewed. Any subsequent edit requires an appropriate new review. Changes to shared interfaces re-open the approvals that rely on them; the system shows why. Reviewers may explicitly re-affirm unaffected work after an impact analysis.

A release manifest identifies exact approved revisions and the runtime capability version they require. Validate the complete manifest, including referenced NPCs, facts, rules, and calendar data—not only storylets. Activate the release atomically so players cannot observe a half-updated graph.

Recommended default: a playthrough remains on its content release. New runs receive the current release. Moving existing runs requires a tested compatibility plan for resolved scenes, pending commitments, facts, and identities. An urgent compatible correction may be issued separately, but changing a release pointer must not rewrite what a player previously experienced.

Rollback changes which complete release is served; it is not merely another snapshot row. Keep the artifacts needed by active runs. Retire authored content through revisions and deprecation, not destructive deletion of objects still referenced by history.

## 9. Checks that help authors

| Check | Example | Treatment |
|---|---|---|
| Structure and references | A choice targets a missing storylet; a referenced fact has the wrong type | Block approval/publication |
| Engine support | Brief asks for a delay after an event, but runtime only supports offset from track start | Block playable release; allow planning |
| Causality | Follow-up requires both mutually exclusive introductions | Block when provably contradictory; otherwise show a review concern |
| Timing | Prerequisite cannot complete before its fixed-day sequel expires | Block with a concrete trace or constraint proof |
| Knowledge and continuity | Dialogue claims Scott witnessed an event that only Priya attended | Block for contradictory declared facts; prose interpretation is a review warning |
| NPC/world overlap | The same NPC is required at two incompatible locations | Block if co-occurrence is proven; otherwise flag a potential collision |
| Commitments and costs | Accepting an appointment has no fulfillment, renegotiation, or missed-appointment treatment | Review required; block missing runtime references |
| Playability | Low energy leaves no affordable action; a branch never offers a valid exit | Block demonstrated dead ends; use bounded simulation for coverage |
| Narrative quality | Multiple choices produce indistinguishable consequences; every opening is urgent | Editorial review, not an automatic verdict |
| Integration | A changed fact invalidates another writer’s approved arc | Mark affected approval stale and notify its owner |

Show three distinct outcomes: **must fix**, **needs judgment**, and **information**. Never call a bounded test a proof that all paths work. Report which time horizon and state combinations were checked, unsupported mechanics, and paths not explored.

Each issue should say what could happen to a player, why Studio believes it, who owns the correction, and how to replay a witness path. Example: “The player can hear about the private conversation without anyone telling them. Reproduce: decline lunch → take evening walk → enter this scene.” If the system cannot construct a witness, label it as a potential issue.

Prose assistance can highlight suspicious temporal words, voice drift, or ungrounded claims. It should not silently rewrite work or invent canonical facts. Human review remains responsible for meaning and quality.

## 10. Playtesting a combination of arcs

Extend the current preview into a shared sandbox using the same versioned content loading, eligibility, time, and consequence logic as the player runtime. Do not maintain an increasingly different simulation in Studio.

Test packages should include: early and late entry; take and pass; unmet NPC; exhausted/low-money states; trained and untrained approaches; accepted versus merely offered commitments; two arcs needing the same person; branch convergence; and return after an absence.

Save the release/workspace manifest, initial state, seed, decisions, event trace, and expected outcomes. A reviewer opens a failing case at the relevant moment. Replay an affected subset after edits and run broader integration tests before release.

Coverage reports show tested entrances, conclusions, missed paths, and dependency boundaries. Avoid rewarding raw storylet count or requiring every player to experience every story. The important coverage is whether plausible ways of living remain coherent and meaningful.

## 11. Example: five people building one plot

Direction: belonging sometimes competes with academic confidence, but the player can build a satisfying life without joining the central social group.

- The director approves the plot brief and sets the freedom to decline as a constraint.
- A strand lead develops “forming a study group,” reserving Thursday’s invitation and defining the outputs of accepting, declining, or arriving late.
- Writer A builds the initial invitation and first meeting arc.
- Writer B builds disagreement and repair, consuming the fact that the player participated—not assuming a particular invitation scene was seen.
- Writer C builds a competing floor event, with consequences for attendance and nonattendance.
- A reviewer checks the integrated package, including a run where the player meets nobody on arrival day.

If the strand lead moves the meeting to Friday, Studio finds the invitation, reminders, calendar reservation, dependent scenes, and affected acceptance cases. Their owners receive an impact summary. Unrelated prose work continues. If Writer C proposes that Priya attends the floor event, the overlap is evaluated against the meeting’s conditions; mutually exclusive branches do not produce a false conflict.

Before release the team demonstrates at least: attending the study group; choosing the floor event without having promised to study; accepting the meeting then renegotiating; and ignoring both with a valid later entry. These are coherent possibilities, not a completion checklist imposed on the player.

## 12. Implementation sequence

**Phase 1 — Make collaboration safe.** Correct save-boundary validation; protect writes with revisions; separate draft edits from runtime content; add server-owned attribution and permissions; implement complete release manifests and consistent runtime reads. Preserve/import current content as a baseline and verify legacy run compatibility. Acceptance: concurrent saves cannot erase work, an unfinished draft never appears in play, and rollback actually changes runtime content safely.

**Phase 2 — Delegate through briefs.** Add direction, plot, optional strand, arc, assignment, ownership, revisioned brief, and comments. Add My work and the outline. Acceptance: a lead assigns an arc without SQL or an external handoff document; the writer can find all relevant constraints and submit it for review.

**Phase 3 — Integrate shared fiction.** Add typed shared definitions and dependency links, change impact review, scheduling checks, and capability-aware authoring. Acceptance: changing a shared deadline or knowledge fact identifies exactly which dependent work needs attention.

**Phase 4 — Prove combined playability.** Reuse runtime logic in versioned sandbox tests, add saved scenarios and witness traces, and gate releases on known issues and reviewed coverage. Acceptance: the five-person example can be authored and released with tested take, pass, late-entry, and collision paths.

Each phase ships useful capability. Real-time co-editing, full-world exhaustive analysis, automated prose rewriting, and fine-grained permissions on every sentence are intentionally deferred.

## 13. Proposed storage responsibilities

Conceptual entities, not a final SQL schema:

- Narrative plans and briefs, including parent revision and links to other plans.
- Assignments: scope, owner, collaborators, reviewer, workflow state, blockers.
- Stable content identities and immutable revisions, including storylets, nodes, and shared definitions.
- Draft workspaces: baseline manifest and proposed revisions.
- Dependency links: producer, consumer, type, conditions, and approved agreement revision.
- Comments, review decisions, and immutable audit events tied to revisions.
- Test scenarios and results tied to the exact tested manifest and runtime version.
- Release manifests and activation records; playthrough release references.

Plan metadata must not be embedded in gameplay requirements. All authoring/publishing writes stay server-authorized. Database transactions provide atomic operations; expensive analysis should run in resumable bounded units compatible with Vercel, with progress persisted rather than held in a long-lived server process. Live presence may use an ephemeral channel but must never be necessary for correctness.

## 14. Decisions to settle before implementation

Recommended defaults:

1. Start with a small team and one chapter; one primary owner per arc, one reviewer, and a shared NPC steward.
2. Require independent review for shared canon and releases; allow lighter review for local prose corrections.
3. Pin runs to release versions, with explicit compatibility handling for urgent fixes.
4. Use versioned draft workspaces and conflict detection before live collaborative typing.
5. Allow high-level plans for unsupported mechanics, but label their implementation dependency clearly.
6. Keep mandatory outcomes limited to true world constraints. An approved plot promises possibilities and coherence, not player obedience.

Questions with material cost consequences: expected team size; whether outside writers need restricted visibility; who has final authority over shared NPCs; whether live runs can remain on older content; and how much integration review time the team can sustain. These refine the design without preventing adoption of the defaults above.


## October 4 implementation: playable contracts and rehearsals

Delivered flag producer/consumer bindings, occurrence-scene calendar checks, bounded multi-scene track rehearsals, before/after failure traces, and a study-group collaboration template. Review, approval and publication rerun rehearsals against the exact proposed manifest. The template installs atomically using the existing revision/ownership/audit rules.

See `CONTENT-STUDIO-TEAM-GUIDE.md` for the supported model and workflow. Deliberate limits: author clock-hour reservations are not engine appointment slots; authored track scene durations are not currently charged by the track resolver; practice requests do not imply completed training. Dialogue walks, routine weeks, probabilistic/identity mechanics and full consequence processing need further rehearsal adapters. The seven pilot paths isolate their scenes from the surrounding catalog. Real team assignment, independent editorial review and integrated catalog playtests remain distinct from a passing template test.
