# Code session brief — NPC name color extension to body prose

## Why

Spot-check of §3a (commit 69ecf6d) revealed the color-coding only fires on speaker-tagged dialogue nodes (the attribution line beneath italicized quoted blocks). 90% of MMV's prose uses narrative-style dialogue where NPC names appear inline in body text ("Doug says," "Keith steps forward," "Mike points at the one with the textbook") — and these get no color treatment.

Speed-reading recognition was the design intent of the color system. The current implementation only delivers it in the minority rendering path. This brief extends color to where it's actually needed.

## Scope

Wrap known NPC display names in body prose with the NPC's `display_color`. Mechanically:

1. **A new render-time pass on storylet `body` and node `text` strings.** Given the content's body text, find each NPC display name as a word-boundary token and wrap it in a `<span style={{color: npc.display_color}}>...</span>`.
2. **Available wherever body/text renders.** Both the storylet preamble (`body`) and dialogue node text (`DialogueNode.text`). The same render path that already produces `<p>` tags for these strings should now produce styled spans for matched names within them.
3. **Keep §3a's speaker-attribution coloring.** That continues to fire for explicitly speaker-tagged nodes — it's a different signal (this is the speaker, here speaking directly) and worth retaining.

## Implementation

### Where the changes go

- **NPC name registry already loaded.** §3a fetches NPC display data including `display_color`. Same query/cache surface — extend the consumer side, not the data-fetching side.
- **The render pass.** Likely in the prose-rendering helper that turns `body` and `node.text` into JSX. If there's no shared helper, this is the right moment to extract one (`<NarrativeProse text={...} npcs={...} />` or similar). Don't sprawl this logic across multiple components; one helper, used everywhere body/text strings render.
- **Match logic.** For each NPC in the registry, build a regex like `\b<DisplayName>\b` and split the input text on matches. Wrap matched tokens with the colored span; render unmatched segments as plain text. React-friendly: return an array of fragments and strings.

### Edge cases to handle

1. **Names that are also common nouns.** "Will" (verb / future tense), "Mark" (noun / verb), "Faith" (noun) if they exist in the cast. For Arc One, the cast is mostly distinctive (Doug, Keith, Mike, Scott, Bryce, Karen, Priya, Glenn) — this is largely fine. But add a per-NPC `is_ambiguous: boolean` flag to the registry (defaulting false) so a future NPC named "Will" can opt out of automatic body-prose coloring without needing custom logic.

2. **Possessive forms.** "Doug's hand," "Scott's room." The word boundary regex `\bDoug\b` won't match "Doug's" — need to extend the match to include trailing `'s`. Decision: do match possessives (color "Doug's"). They still refer to the named NPC and the eye benefits from the same color signal.

3. **Substring collisions.** "Doug" inside "doughy," "Mike" inside "Mickey." Word-boundary regex prevents these. Verify with a unit test that runs the matcher against a paragraph with adjacent-but-not-NPC text.

4. **First-occurrence-only?** Some games color a name only on its first appearance per scene. Don't do this for MMV — the speed-reading benefit comes from consistency. Color every occurrence.

5. **Within already-styled text.** If a node has speaker-tagged italicized quote (Image 1's Scott node), and the italicized body of the quote contains another NPC's name, the inner name should still color appropriately. The render pass operates on text strings; CSS color cascades cleanly inside italic-styled parents.

6. **Pronouns are NOT colored.** "He" / "She" / "They" are semantically NPC references but ambiguous within a scene with multiple NPCs. Coloring them would mis-attribute. Names only.

7. **"You" is the player.** Never colored regardless of any future "name the player" feature.

### Tests

Add unit tests for the matcher helper:

- Match a single NPC name in a sentence, verify span wraps it, verify color attribute
- Match multiple NPC names in one paragraph (Doug, Keith, Mike all in one block — Image 2's content is a perfect test corpus)
- Possessive "Doug's" matches and colors
- "doughy" does NOT match Doug
- "Will" does NOT match if `is_ambiguous: true` for any NPC named Will (write the test now even if Will isn't in the registry yet)
- A name within an italicized speaker-tagged block colors correctly

These tests live alongside the matcher helper, not in `play/page.tsx`'s test file.

### Performance

The matcher will run on every render of every storylet body and node text. For Arc One's 11 NPCs, that's 11 regex matches per text string. This is fine — text strings are short (200-400 words max per node), and React memoizes naturally. Don't pre-optimize. If it becomes a measurable problem later, memoize per `(text, npcs)` key.

## What §3a stays doing

The speaker-attribution line color from §3a is unchanged. When a node has `speaker: "npc_roommate_scott"` and renders as `— Scott` beneath the italicized quote, that "Scott" continues to render in steel blue. The new body-prose name coloring runs *additionally* on the body text content.

If the same node has both:
- An attribution line (speaker-tagged): colored Scott via §3a
- Italicized quoted dialogue body that mentions Doug: colored Doug via this new pass

Both should render correctly. Verify with a spot-check on a node that exercises both.

## Migration

No DB migration required. The `display_color` column added by §3a is the data source; this brief only changes how it's consumed at render time.

## Verification

- [ ] Unit tests for the matcher helper pass
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` parity (246 + new tests passing / 1 skipped)
- [ ] `playthrough:all` parity (13/7)
- [ ] Browser spot-check on the same storylets where §3a was tested:
  - Room 214 (speaker-tagged node — Scott color on attribution + any body mentions)
  - Dorm hallmates (narrative dialogue — Doug, Mike, Keith all color in body)
  - lunch_floor.evening_pitch (Doug + Whitmore world-pointer prose)
  - scott_day2_morning (Scott named multiple times in narrative + speaker-tagged nodes)
- [ ] No false-positive coloring (visually scan for "doughy," "miked up," or other substring collisions if the prose contains them)

## Commit

Single commit on `feature/period-stance-infrastructure`:

```
feat(ui): color NPC names inline in narrative body prose

§3a wired display_color to speaker-tagged attribution lines only,
which fire on ~10% of MMV's prose. The remaining 90% uses
narrative-style dialogue where names appear inline ("Doug says,"
"Mike points") and got no color treatment.

This commit adds a render-time matcher that wraps known NPC display
names with their assigned color in storylet body and node text.
Speed-reading recognition now works across both rendering modes.

Word-boundary matched. Possessives included. Pronouns not colored
(ambiguous). NPCs can opt out via is_ambiguous: true (added to
registry for future names like "Will").
```

## Out of scope

- Speaker chip / avatar / initial badge (Option D from claude-pm's analysis) — pre-graphics-system work, not now
- Coloring quoted dialogue passages themselves (Option B) — requires content-format changes; revisit when content is more stable
- Restyling the speaker-attribution line — §3a's choice stays
- Any extension to non-NPC entities (places, songs, objects) — color is for NPCs only

## Begin.
