# Conversational Storylet Schema

## Overview

Storylets can optionally include a `nodes` array that turns them from "prose block → choice wall" into interactive conversation trees. When `nodes` is present, the `body` becomes a short scene-setting preamble, and the engine walks the node tree before presenting terminal choices.

**Backward compatibility:** If `nodes` is absent or empty, the storylet renders as before.

---

## Top-Level Storylet (existing fields + new)

```typescript
{
  // ── Existing fields (unchanged) ──────────────────────
  slug: string,
  title: string,
  body: string,              // When using nodes: 1-3 sentences max (preamble)
  choices: Choice[],         // Terminal choices — unchanged
  tags: string[],
  requirements: object,
  weight: number,
  is_active: boolean,
  introduces_npc: string[],
  arc_id: uuid | null,
  step_key: string | null,
  order_index: number | null,
  due_offset_days: number | null,
  expires_after_days: number | null,
  default_next_step_key: string | null,

  // ── New field ────────────────────────────────────────
  nodes?: DialogueNode[]     // Optional conversation tree
}
```

---

## DialogueNode

```typescript
interface DialogueNode {
  id: string,                // Unique within storylet (e.g. "mom_asks")

  // ── Content ───────────────────────────────────────────
  text: string,              // 1-4 sentences max
  speaker?: string,          // NPC ID or null for narrator/interiority

  // ── Gating ────────────────────────────────────────────
  condition?: {
    npc_memory?: Record<string, boolean>,
    identity_min?: Record<string, number>,
    flag?: string            // Local conversation flag
  },

  // ── Branching ─────────────────────────────────────────
  micro_choices?: MicroChoice[],   // If present: player picks before continuing
  next?: string                     // If no micro_choices: auto-advance target
                                    // "choices" = show terminal choices
                                    // null = also show terminal choices
}
```

---

## MicroChoice

```typescript
interface MicroChoice {
  id: string,                // Unique within this node
  label: string,             // 3-8 words. Dialogue in quotes, actions as verbs.
  next: string,              // Target node ID, "choices", or "exit"

  // ── Light Effects (all optional) ──────────────────────
  sets_flag?: string,        // Local to this storylet only
  set_npc_memory?: Record<string, Record<string, boolean>>,
  relational_effect?: Record<string, Record<string, number>>,
  identity_tags?: string[]   // Use sparingly — most micros should have none
}
```

---

## Terminal Choice Additions

Terminal choices gain two optional fields for conversation flag gating:

```typescript
{
  // ... all existing Choice fields ...
  requires_flag?: string,    // Show only if this flag was set during node walk
  excludes_flag?: string     // Hide if this flag was set during node walk
}
```

---

## Rendering Flow

```
1. Show body (preamble, 1-3 sentences)
2. Start at nodes[0]
3. Show node.text (format as dialogue if speaker is set)
4. If node has micro_choices → show them as inline options
   On selection: apply effects, navigate to micro_choice.next
5. If node has no micro_choices → show "continue" → go to node.next
6. When next = "choices" or null → show terminal choices array
   Terminal choices may be gated by requires_flag / excludes_flag
```

---

## Design Constraints

| Rule | Limit | Why |
|------|-------|-----|
| Sentences per node | 4 max | Player should never scroll within a node |
| Micro-choices per node | 2-4 | More = decision paralysis |
| Depth before terminal choices | 2-4 micro-choice points | Deeper = storylet is doing too much; split it |
| NPC memory writes per storylet | 2 max via micro-choices | Don't overload single scenes with persistent state |
| Identity tags on micro-choices | 0-1, usually 0 | Tags are for reflection engine; most conversation moves aren't identity-defining |
| Time/energy cost on micro-choices | NEVER | That's what terminal choices are for |
| Preclusion on micro-choices | NEVER | Micro-choices shape tone, not life direction |
| Word budget (all nodes combined) | 200-350 words | Same total as the flat body it replaces |

---

## Branching Pattern

Conversations should branch and reconverge:

```
         npc_asks
        /    |    \
    opt_a  opt_b  opt_c     ← micro-choices (set different flags)
      |      |       |
      |   deeper?    |      ← optional second branch
      |   /    \     |
      | yes    no    |
      \  |    /     /
       converge_node        ← paths rejoin with different flags set
          |
       CHOICES              ← terminal choices, gated by flags
```

The paths converge but the *state* differs. Different NPC memory, different flags, different terminal choices visible. This is how the same structural outcome produces different felt experiences.

---

## Flag Naming Convention

Flags are local to the storylet (persist only during the node walk).

- Use: `lowercase_snake_case`, descriptive of what happened
- Good: `told_mom_truth`, `asked_for_money`, `noticed_them_first`
- Bad: `path_a`, `branch_2`, `flag1`

If a flag needs to persist beyond this storylet, it's NPC memory, not a flag. Use `set_npc_memory` instead.

---

## SQL Migration Format

```sql
INSERT INTO public.storylets (slug, title, body, choices, nodes, tags, is_active)
VALUES (
  'slug_here',
  'Title Here',
  $$Preamble text — 1-3 sentences.$$,
  '[... terminal choices JSON ...]'::jsonb,
  '[... nodes JSON ...]'::jsonb,
  ARRAY['tag1', 'tag2']::text[],
  true
);
```

The `nodes` column is `jsonb DEFAULT NULL`. Omit it (or pass NULL) for flat storylets.

---

## Example: Conversational vs Flat

**Flat (old pattern):**
```json
{
  "body": "Seven paragraphs describing a phone call with mom. What she says, how it feels, the delay on the line, dad in the background, déjà vu moment. Player reads all of it passively.",
  "choices": [
    { "id": "tell_truth", "label": "Tell her it's harder than expected." },
    { "id": "say_fine", "label": "Tell her everything is great." },
    { "id": "deflect", "label": "Ask about home instead." }
  ]
}
```

**Conversational (new pattern):**
```json
{
  "body": "The dorm phone rings twice before you register it might be for you.\n\nYou are right.",
  "nodes": [
    { "id": "pickup", "text": "Your mother's voice sounds closer than she is. Half-second delay on the line.", "next": "mom_asks" },
    { "id": "mom_asks", "text": "\"So. How is it?\"", "speaker": "npc_parent_mom",
      "micro_choices": [
        { "id": "good", "label": "\"It's good. It's really good.\"", "next": "react_good", "sets_flag": "performed_fine" },
        { "id": "lot", "label": "\"It's... a lot.\"", "next": "react_honest", "sets_flag": "was_honest", "identity_tags": ["confront"] },
        { "id": "flip", "label": "\"Tell me what's going on there first.\"", "next": "mom_home", "sets_flag": "deflected" }
      ]
    }
  ],
  "choices": [
    { "id": "call_pat", "label": "Dial Pat's number at Ohio State.", "requires_flag": "was_honest", "time_cost": 1 },
    { "id": "write_letter", "label": "Find a pen. Start writing what you couldn't say.", "excludes_flag": "was_honest", "time_cost": 1 }
  ]
}
```

Same word count. Completely different experience. The player is *in* the call, not reading about it.
