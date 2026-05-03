# New NPC

You are adding a new named character to MMV. Follow this process.

## Step 1: Character Design

Answer these before writing anything:

1. **What is their role?** (roommate, floormate, professor, classmate, RA, townie, etc.)
2. **When does the player first encounter them?** (Day and segment)
3. **Which streams do they connect to?** (roommate, academic, money, belonging, opportunity, home)
4. **What is their 1983 context?** (major, hometown, ethnicity, economic background, musical taste, style)
5. **What do they want from the player?** (nothing, friendship, help, validation, to be left alone)
6. **What's their voice?** Write 2-3 sample lines of dialogue.

## Step 2: Assign NPC ID

Format: `npc_[role]_[firstname]`

Examples:
- `npc_roommate_danny`
- `npc_floor_miguel`
- `npc_prof_heller`
- `npc_studious_priya`

Check `docs/NPC_DATA_REFERENCE.md` to ensure no ID collision.

## Step 3: Define Starting Relational Values

```json
{
  "met": false,
  "knows_name": false,
  "knows_face": false,
  "role_tag": "[role]",
  "relationship": 5,
  "trust": 0,
  "reliability": 0,
  "emotionalLoad": 0
}
```

Adjust defaults based on role:
- Roommate starts at relationship 6 (forced proximity creates baseline)
- Parents start at relationship 7
- Professors start at trust 0 (earned)
- Everyone else starts at 5/0/0/0

## Step 4: Write the Short Intro

Every NPC needs a `short_intro` — 1-2 sentences shown when `introduces_npc` fires. This is the player's first impression. It should be:
- Physical (what do they look like right now, in this moment)
- Specific (not "a tall guy" but "a tall guy in a faded Springsteen tee with a coffee ring on his schedule")
- Period-appropriate
- No name yet if the player doesn't know it

## Step 5: Gender Rule (Arc One)

All dorm-floor NPCs must be male (protagonist is male, it's a men's floor in 1983).

NPCs outside the dorm (classmates, professors, townies) can be any gender. Characters encountered at campus-wide events, in classes, or off-campus are not restricted.

## Step 6: Update the Registry

Add the new NPC to `docs/NPC_DATA_REFERENCE.md` with:
- NPC ID
- Name
- Role tag
- Starting values
- Short intro text
- Which storylet introduces them
- Voice notes (2-3 sample lines)

## Step 7: Update Content Creator Agent

If this NPC will appear in multiple storylets, add their voice description to `docs/NPC_SYSTEM.md` so content writers can match the voice consistently.

## Step 8: Check for Conflicts

- Does this NPC overlap with an existing character's role? (Two "social connector" types?)
- Does their introduction storylet actually trigger before any storylet that references them?
- Are they in the right demographic context for 1983? (See `agents/content-creator/period-reference.md`)
