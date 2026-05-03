# Audit Content

You are reviewing existing storylet content for quality and compliance. Run every check in order.

## What to Audit

If given a specific migration file, audit that file. If given "all", scan all storylet migrations in `supabase/migrations/` that contain INSERT INTO public.storylets.

## Check 1: Schema Compliance

For every storylet in the file:
- [ ] `slug` exists and is snake_case
- [ ] `body` exists and is non-empty
- [ ] `choices` is a valid JSON array with 2-4 entries
- [ ] Every choice has: `id`, `label`, `identity_tags`, `time_cost`, `energy_cost`
- [ ] Every choice has `precludes` (even if empty array `[]`)
- [ ] Every choice has either `outcome` or `outcomes`
- [ ] Every choice has `reaction_text` (can be empty if `reaction_text_conditions` handles it)
- [ ] `identity_tags` values are from: `risk`, `safety`, `people`, `achievement`, `confront`, `avoid`

Report: list any missing fields with the storylet slug and choice id.

## Check 2: NPC Name Leaks

For every storylet, check if any NPC names appear in `body` or choice `label` fields BEFORE the player has met that NPC.

Process:
1. Read `introduces_npc` field — these NPCs are being introduced HERE
2. Read `requirements` — check if `requires_npc_met` gates this storylet
3. For every named NPC in the registry (`docs/NPC_DATA_REFERENCE.md`), search body text and all choice labels
4. If a name appears and neither `introduces_npc` nor a prior storylet's introduction covers it, FLAG IT

Report: list exact text where name appears, which NPC, and why it's a problem.

## Check 3: Period Accuracy

Scan all prose (body, reaction_text, choice labels) for:
- Post-1983 technology (smartphones, email, internet, laptops, CDs)
- Post-1983 slang ("ghost" as a verb, "vibe check", "lowkey", "slay")
- Contemporary therapy language ("boundaries", "processing", "validating", "gaslighting", "toxic")
- Post-1983 cultural references (movies, music, events after September 1983)

Report: list each anachronism with the exact text and suggested period-appropriate replacement.

## Check 4: Prose Quality (Anti-Patterns)

Check all prose against the blacklist in `agents/content-creator/style-guide.md`:
- [ ] No "a mix of [emotion] and [emotion]"
- [ ] No "Part of you wanted X. But another part..."
- [ ] No paragraphs ending with evaluative one-liners
- [ ] No "In that moment..."
- [ ] No "something shifted"
- [ ] No metaphors too polished for an 18-year-old's interiority
- [ ] No naming emotions directly when detail could carry them
- [ ] No characters perfectly articulate about their feelings

Report: quote the flagged sentence and provide a specific revision.

## Check 5: Preclusion Integrity

For every storylet with precludes values:
1. Verify the precluded slug actually exists in the database
2. Check for circular preclusion (A precludes B which precludes A)
3. Check for orphaned storylets (precluded by something but no alternate path reaches the same content)

Report: list any broken references or suspicious chains.

## Check 6: Stream State Validity

Check all `sets_stream_state` values against the canonical FSM in CLAUDE.md:
- Stream name must be one of: roommate, academic, money, belonging, opportunity, home
- State value must be valid for that stream's state machine

Report: list any invalid stream/state combinations.

## Check 7: Anomaly Rule

If any storylet references specific real-world events, sports outcomes, or historical facts after 1983:
- Flag it. The anomaly rule says history rhymes but doesn't repeat.
- Future knowledge gives frameworks, not specifics.

## Output Format

Produce a summary:
```
AUDIT RESULTS: [filename or "all"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Schema:     X issues found
NPC Names:  X leaks found
Period:     X anachronisms found
Prose:      X anti-patterns found
Preclusion: X issues found
Streams:    X invalid states found
Anomaly:    X violations found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:      X issues
```

Then list each issue with its category, severity (ERROR / WARNING), and the specific fix needed.
