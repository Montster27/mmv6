# MMV Content Creation Process
> Standard process for creating narrative content across all Claude environments.
> Save to: `V16MMV/mmv/docs/CONTENT-PROCESS.md` and Obsidian vault.

---

## The Loop

Every piece of content follows the same cycle regardless of environment:

```
PLAN (claude.ai)  →  SPEC (claude.ai or Cowork)  →  BUILD (Code)  →  LOOK (play it)  →  DECIDE (claude.ai)
```

Most content will cycle through this 2-3 times before it's right. That's the process working, not failing.

---

## Step 1: Plan (claude.ai)

Before writing anything, answer these questions in conversation with the PM:

### What are we building?
- Single storylet? Stream map? Arc segment plan?
- This determines which workflow to use (A, B, or C from the content builder skill)

### Where does it sit?
- Which stream(s)? (roommate, academic, money, belonging, opportunity, home)
- Which stream shape? (accumulative, crystallizer, gate-structured, ambient)
- What day/segment? (morning, afternoon, evening)
- What came before it? What comes after?

### The Six Collision Questions
1. What stream does this primarily serve?
2. What other stream does it collide with?
3. What does the player miss by being here?
4. What NPC memory does this create or require?
5. What door does this close?
6. What does the miss path look like?

### Output
A brief (10-20 line) **storylet brief** that captures the answers. This is what gets handed to Code or Cowork. Example:

```
STORYLET BRIEF: Room 214 (revised opening)
Stream: roommate (accumulative)
Day: 1, morning. Game entry point.
Setting: Dorm room. Player arriving. Scott is there.
Mode: Conversational nodes. 2-3 micro-choices. No terminal choice.
Ambient texture: Cassette player, Pastime Paradise (Stevie Wonder, 1976)
NPCs introduced: npc_roommate_scott
Collision: None (opening — nothing competes yet)
Miss path: N/A (mandatory)
Must set: game_entry tag. default_next_key → dorm_hallmates
Connects to: s_d1_dorm_hallmates (next), Glenn bench scene (later — 
  tape callback)
```

---

## Step 2: Spec (claude.ai or Cowork)

For simple storylets, the brief IS the spec — skip to Build.

For stream maps or arc segments, produce a structured spec:

### Stream Map spec
```
## [Stream] — [Arc Segment]
Shape: [accumulative | crystallizer | gate-structured | ambient]
Map direction: [forward from situations | backward from peaks | backward from gates]

### Big Moments (gates/crystallizers)
- [Moment]: [gate conditions], [when], [miss path]

### Situations (encounters)
- [Day, Slot]: [description], [collision], [micro-choice summary]

### Collision Calendar entries
- [Day, Slot]: [this stream's pull] vs [competing pull]

### Miss Paths
- [For each gate/crystallizer]: [what player sees instead]
```

### Arc Segment spec (Workflow C — full planning)
1. Calendar with deadlines and events
2. Gates and crystallizers (backward-designed)
3. Situations (forward-designed)
4. Collision calendar (overlay)
5. Texture pass (1983 objects, music, news)
6. Miss paths for every gate and crystallizer

---

## Step 3: Build (Claude Code)

Hand Code the brief or spec with this prompt template:

```
Read the mmv-content-builder skill (skills/mmv-content-builder/SKILL.md) 
and its references:
- references/conversation-schema.md
- references/interaction-modes.md  
- references/anti-patterns.md
- references/stream-shapes.md

Here is the storylet brief:
[paste brief]

Write this as a SQL migration following the existing pattern in 
supabase/migrations/. Use conversational nodes unless the brief 
specifies flat prose. Run the anti-patterns checklist before 
finalizing.

Rules:
- Max 4 sentences per node
- Micro-choice labels: 3-8 words, quotes for dialogue, verbs for action
- 200-350 words across all nodes
- No naming emotions — show through action and physical detail
- 1983 in the nouns, not the narration
- No contemporary vocabulary (see anti-patterns checklist)
- NPC names cannot appear in labels before introduction
```

### Code should also:
- Verify the storylet connects to existing content (check next_keys, order_index)
- Run `npx tsc --noEmit` to verify no type errors
- Check introduces_npc is set for any new NPCs
- Confirm tags include required values (arc_one, day1, etc.)

---

## Step 4: Look (play it or read it)

This is Monty's "need to see it" step. Options:

- **Play it** — run the app locally (`npm run dev`) and walk through the content
- **Read the migration** — review the SQL output, read the node text in sequence
- **Ask Code to trace it** — "Walk me through this storylet as if I'm playing it. Show me each node, each micro-choice, each reaction, in order."

### What to check:
- Does the opening land in under 3 sentences?
- Do micro-choices feel like things you'd actually say/do?
- Is there a prose wall anywhere? (4+ sentences without interaction)
- Does it feel like 1983 without announcing it?
- Would a second playthrough feel different?
- Could you identify this as AI-written? If any line triggers that, flag it.

---

## Step 5: Decide (claude.ai)

Come back to the PM with reactions:

- "The tone is right, build the next beat"
- "Scott doesn't feel real yet — his voice needs work"
- "The tape detail is too heavy / too light"
- "I want to see the Glenn scene before I know what Day 2 looks like"

The PM routes the next task based on the reaction:
- Another storylet → back to Step 1 with a new brief
- Revision of this one → back to Step 3 with specific notes
- Broader planning needed → stay in Step 1, zoom out to stream map or arc plan

---

## Quality Gates

No content ships without passing these:

### Structural
- [ ] Correct interaction mode for each moment (prose / micro-choice / terminal)
- [ ] 2-4 micro-choice depth before terminal choices (not more)
- [ ] Every micro-choice changes something (flag, NPC memory, or gates a future node)
- [ ] Terminal choices have real tradeoffs (time, energy, preclusion)
- [ ] No dead branches (every path reconnects or gates something)
- [ ] Branching map reviewed — no orphan next_keys pointing to missing slugs

### Prose
- [ ] No emotion-naming ("a wave of loneliness")
- [ ] No symmetrical constructions ("part of him... but another part")
- [ ] No evaluative one-liners ("that changed everything")
- [ ] No contemporary vocabulary (see anti-patterns blacklist)
- [ ] Characters are NOT articulate about feelings
- [ ] 1983 lives in the nouns — objects, brands, physical media

### Period (September 1983)
- [ ] At least one period-specific physical detail per storylet
- [ ] No objects that can't exist (smartphones, PCs in dorms, CDs, email)
- [ ] No language that can't exist ("toxic," "boundaries," "vibes," "literally")
- [ ] Slang used sparingly — max one per page of dialogue
- [ ] Social climate rendered through behavior, not narration

### Technical
- [ ] SQL migration follows existing pattern
- [ ] introduces_npc set for new NPCs
- [ ] Tags include stream, arc, day markers
- [ ] game_entry set on the opening storylet (and only that one)
- [ ] order_index and segment are consistent (no morning content after evening)
- [ ] default_next_key points to an existing slug
- [ ] precludes arrays reference existing slugs only

---

## Environment Routing for Content Work

| Task | Environment | Why |
|------|-------------|-----|
| "What should the next storylet be about?" | claude.ai | Planning — needs collision awareness and story context |
| "Write a storylet brief" | claude.ai | PM produces the brief from conversation |
| "Map Danny's encounters for Week 2" | claude.ai → Cowork | Plan here, spec can be written in Cowork with Obsidian access |
| "Build the SQL migration for this brief" | Claude Code | Needs repo access, migration pattern, type checking |
| "This doesn't feel right, revise" | claude.ai → Code | Diagnose here, fix in Code |
| "Plan the full Week 2 collision calendar" | claude.ai | Thinking work — needs all-stream awareness |
| "Update the phase plan in Obsidian" | Cowork | File access to the vault |
| "Write a design doc for the reflection engine" | Cowork | Longer document, save to Obsidian |
