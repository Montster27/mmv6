---
name: mmv-content-builder
description: Build narrative content for the MMV life-simulation game. Use this skill whenever the user asks to create storylets, map content for a stream or arc, design NPC encounters, write dialogue trees, plan collision calendars, or develop any narrative content for MMV. Also use when the user mentions streams (roommate, academic, money, belonging, opportunity, home), arc segments, conversational nodes, micro-choices, terminal choices, preclusion design, crystallizer moments, or miss paths. Trigger even for adjacent requests like "write the next Danny scene" or "what happens if the player skips the Herald meeting" — anything involving MMV story content benefits from this skill's methodology.
---

# MMV Content Builder

Build narrative content for MMV using stream-appropriate methods, conversational storylet architecture, and collision-first design.

## When You're Asked to Build Content

Before writing anything, determine **what kind of content** is being requested and follow the matching workflow.

### Workflow A: Single Storylet
The user wants one scene — a conversation, an encounter, a moment.

1. **Identify the stream(s)** this storylet touches (roommate, academic, money, belonging, opportunity, home)
2. **Read the stream shape** → `references/stream-shapes.md` to understand mapping direction
3. **Determine interaction mode** → `references/interaction-modes.md` to decide: flat prose, conversational nodes, or a mix
4. **Draft the storylet** using the schema in `references/conversation-schema.md`
5. **Check collision** — what else competes for the same time slot? A storylet without collision is a storylet without tension
6. **Design the miss path** — what happens if the player never reaches this storylet?
7. **Run the editorial pass** against `references/anti-patterns.md`

### Workflow B: Stream Content Map
The user wants to map an entire stream across an arc segment (e.g., "build out Danny's roommate arc for Week 1-2").

1. **Read `references/stream-shapes.md`** — identify which shape this stream is (accumulative, crystallizer, gate-structured, ambient)
2. **Follow the shape-specific mapping process** described in that file
3. **Build the collision calendar** — overlay this stream's situations with other streams' situations to ensure every time slot has competing pulls
4. **For each situation in the map**, draft a storylet skeleton: body preamble, key nodes, micro-choices, terminal choices, miss path
5. **Audit for ambient texture** — does every storylet contain at least one period-specific physical detail? See `references/anti-patterns.md` for the 1983 audit checklist

### Workflow C: Arc Segment Plan
The user wants to plan an entire arc segment across all streams (e.g., "plan Week 2 of Arc One").

1. **Calendar first.** Map the timeline. Mark external deadlines and events.
2. **Gates and crystallizers.** Read `references/stream-shapes.md`. Design backward: what are the 3-5 big moments this segment must contain? What are their prerequisites?
3. **Situations.** Design forward: what encounters, conversations, and collisions fill the days between big moments?
4. **Collision calendar.** Overlay all streams. Ensure every time slot has at least two competing pulls. Adjust until the guaranteed-slip principle holds: something always falls behind.
5. **Texture pass.** Add ambient period elements. Audit against `references/anti-patterns.md`.
6. **Miss paths.** For every gate and crystallizer, design what happens when the player doesn't get there.

---

## The Guaranteed-Slip Principle

This is MMV's core design law. It applies to every workflow above.

In any time slot, the player must have more compelling options than they can pursue. Choosing one thing means something else — something they might have wanted — happens without them or doesn't happen at all. This is not a punishment system. It is how life works.

**Test:** After designing any content, check: "Can the player do everything available to them in this segment without missing anything?" If yes, add more competing pulls or reduce time slots until something must slip.

---

## The Six Collision Questions

Before finalizing any storylet or content map, answer these:

1. **What stream does this primarily serve?** (roommate, academic, money, belonging, opportunity, home)
2. **What other stream(s) does it collide with?** Every storylet should compete with at least one other stream for the same time/energy.
3. **What does the player miss by being here?** If the answer is "nothing," the storylet lacks tension.
4. **What NPC memory does this create or require?** Check existing NPC state. Don't reference interactions that may not have happened.
5. **What door does this close?** At least one choice should preclude something. If nothing is precluded, the choice doesn't matter enough.
6. **What does the miss path look like?** If the player never reaches this storylet, what do they experience instead? The miss path must be authored, not silent.

---

## Conversational Architecture

Most storylets should use the conversational node system rather than flat prose blocks. Read `references/conversation-schema.md` for the full schema, but here's the decision framework:

**Use conversational nodes when:**
- An NPC is present and talking
- The player is in a social situation with options for engagement
- There's information exchange (what to reveal, what to ask)
- The scene has 2+ emotional registers the player could inhabit

**Keep flat (body + choices) when:**
- The choice is environmental, not interpersonal ("go to bookstore or job table")
- The moment is brief and immediate
- Solo reflection that doesn't branch
- Only one NPC line before the real choice

**The rhythm:** Preamble (1-3 sentences) → Node (NPC speaks) → Micro-choice (player responds) → Node (world reacts) → repeat 1-2x → Terminal choices (the real decision).

**Cardinal rule:** Micro-choices are cheap (no time/energy cost). Terminal choices are expensive. Don't blur the line.

---

## Writing Standards

### Prose Rules
- Max 4 sentences per node. If you need more, split with an auto-advance.
- Micro-choice labels: 3-8 words, in quotes for dialogue, physical verbs for action.
- Terminal choice labels: put the player in their body. "Slide your tray over" not "Sit with him."
- Trust concrete physical detail over emotional narration.
- Characters are not articulate about their feelings.
- 1983 texture lives in the nouns — objects, brands, physical media.

### What to Never Write
Read the full blacklist in `references/anti-patterns.md`. The critical ones:
- No "a wave of [emotion] washed over"
- No symmetrical sentence pairs ("Part of him wanted X. But another part...")
- No naming emotions when surrounding detail carries them
- No explaining what a choice means — let the choice speak
- No NPC names in labels before the player could know them

---

## Connecting to Existing Skills

When building content produces artifacts beyond storylet JSON:

- **Creating a presentation of the content map** → read `/mnt/skills/public/pptx/SKILL.md`
- **Creating a design document** → read `/mnt/skills/public/docx/SKILL.md`
- **Building a visual collision calendar or interactive tool** → read `/mnt/skills/public/frontend-design/SKILL.md`
- **Reading uploaded reference files** → read `/mnt/skills/public/file-reading/SKILL.md`

---

## Output Formats

### Storylet JSON
Follow the production schema in `references/conversation-schema.md`. All storylets must include: slug, title, body, choices (with identity_tags, relational_effects, events_emitted), tags, requirements. Conversational storylets add: nodes array.

### Content Map
When mapping a stream or arc segment, output as structured markdown:
```
## [Stream Name] — [Arc Segment]
### Shape: [accumulative | crystallizer | gate-structured | ambient]
### Map Direction: [forward from situations | backward from peaks | backward from gates | texture layer]

#### Big Moments (gates/crystallizers)
- [Moment]: [gate conditions], [week/day], [miss path summary]

#### Situations (forward-mapped encounters)
- [Day X, Slot]: [situation description], [streams in collision], [micro-choice summary]

#### Collision Calendar
[Day-by-day overlay of all streams' situations competing for the same slots]

#### Miss Paths
- [For each gate/crystallizer]: [What the player experiences instead]
```

### SQL Migration
When the user needs production-ready content, format as SQL INSERT matching the existing migration pattern in `supabase/migrations/`. Include the `nodes` column for conversational storylets.

---

## Reference Files

Read these as needed — don't load everything upfront:

| File | Read When |
|------|-----------|
| `references/stream-shapes.md` | Mapping content for any stream. Choosing mapping direction. |
| `references/conversation-schema.md` | Writing any storylet with dialogue. Designing nodes and micro-choices. |
| `references/interaction-modes.md` | Deciding whether a moment needs nodes, flat prose, or terminal choices only. |
| `references/anti-patterns.md` | Editorial pass on any written content. Period accuracy audit. |
