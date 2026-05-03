# New Storylet

You are adding a new storylet to MMV. Follow this process exactly.

## Step 1: Gather Context

Before writing anything, answer these questions:

1. **Which day and segment?** (Day N, morning/afternoon/evening)
2. **Which streams are active?** List all six streams with current states.
3. **Which NPCs are present?** Check `docs/NPC_DATA_REFERENCE.md` — have they been met yet?
4. **What does this storylet collide with?** What else competes for this time slot?
5. **What does this preclude?** What storylets should become unavailable after choices here?

## Step 2: Check the Schema

Read `agents/content-creator/schema-reference.md` for the full field reference. Every choice MUST include:
- `id`, `label`, `identity_tags`, `time_cost`, `energy_cost`
- `precludes` (REQUIRED — even if empty array)
- `outcome` or `outcomes`
- `reaction_text`

### Resource Fields (optional but validated when present)
Valid resource keys: `energy`, `stress`, `cashOnHand`, `knowledge`, `socialLeverage`, `physicalResilience`

- **`requires_resource`** — gate: choice is hidden/locked if player lacks the minimum
  - Format: `{ "key": "cashOnHand", "min": 20 }`
  - The player sees "Need 20 cash (have 5)" and cannot click
- **`costs_resource`** — deduction: subtracted when the choice is selected
  - Format: `{ "key": "cashOnHand", "amount": 15 }`
  - The player sees "−15 cash" on the button; locked if they can't afford it
- **`outcome.deltas.resources`** — grants/penalties applied after choice resolves
  - Format: `{ "cashOnHand": -10, "knowledge": 5 }`
- **`costs.resources` / `rewards.resources`** — structured costs/rewards (alternative to outcome deltas)

If a choice costs a resource, always ask: can the player plausibly have enough by this point in the game? Check the economy: starting cash ~$200-600, daily allocation gains ~$20-30.

## Step 3: NPC Name Discipline

**CRITICAL:** Check every line of body text AND every choice label.
- If an NPC has NOT been met (check `introduces_npc` on prior storylets), their name MUST NOT appear
- Use descriptions instead: "the guy from down the hall", "your roommate"
- If this storylet introduces an NPC, add their ID to `introduces_npc` array

## Step 4: Write the Content

Follow the three-stage pipeline from `agents/content-creator/CLAUDE.md`:
1. **Situation Analysis** — structural skeleton, choice options with effects
2. **Prose Draft** — body text, choice labels, reaction text
3. **Editorial Review** — check against `agents/content-creator/style-guide.md` anti-patterns

Present each stage. Wait for approval before proceeding.

## Step 5: Period Check

Verify against `agents/content-creator/period-reference.md`:
- No post-1983 slang, technology, or cultural references
- Objects are period-specific (Casio watch, not smartwatch)
- No contemporary therapy language ("boundaries", "processing", "validating")

## Step 6: Anomaly Rule Check

If the storylet references any real-world event, sports outcome, or historical fact:
- History rhymes but doesn't repeat. No specific predictions work.
- Sports outcomes are scrambled.
- See `docs/CONTACT_AND_REVEAL.md` for the full rule.

## Step 7: Format as Migration

Create the SQL migration file:
- Filename: `YYYYMMDDNNNNNN_seed_[slug].sql`
- Use `$$` quoting for JSON to avoid escaping nightmares
- Wrap in `BEGIN; ... COMMIT;`
- Test that the JSON parses: `echo '[json]' | python3 -m json.tool`

## Step 8: Validate

Run these checks:

### Structure & Schema
- [ ] JSON is valid (no trailing commas, proper quoting)
- [ ] All required choice fields present
- [ ] `precludes` field exists on every choice

### NPC & Content
- [ ] NPC names don't appear before introduction
- [ ] Identity tags are from valid set: risk, safety, people, achievement, confront, avoid
- [ ] Stream states match canonical values in CLAUDE.md
- [ ] NPC IDs match registry in `docs/NPC_DATA_REFERENCE.md`
- [ ] No anachronistic vocabulary
- [ ] Body text has at least one concrete physical detail grounding the scene

### Resource Enforcement
- [ ] `requires_resource.key` is a valid resource key (`energy`, `stress`, `cashOnHand`, `knowledge`, `socialLeverage`, `physicalResilience`)
- [ ] `costs_resource.key` is a valid resource key
- [ ] `outcome.deltas.resources` keys are all valid resource keys
- [ ] Resource costs are achievable — player can plausibly have enough by this day (starting cash ~$200-600, daily gains ~$20-30)
- [ ] If a choice has `costs_resource`, at least one other choice in the storylet does NOT have that cost (so the player always has an option)
- [ ] If a choice has `requires_resource` with a high gate, the storylet body hints at what's needed (don't silently lock choices with no narrative reason)
- [ ] `costs_resource.amount` is positive; `requires_resource.min` is positive
- [ ] No choice both requires AND costs the same resource at amounts that would fail after the gate passes (e.g., requires 20, costs 25)

## Step 9: Update Tracking

After the storylet is written and approved:
- Update `TASKS.md` if this completes a task
- Note any new NPCs that need registry entries
- Note any new preclusion chains that affect other storylets
