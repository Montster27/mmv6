# MMV — Claude Code Project Guide

> **Many More Versions of You** — a narrative life-simulation game set in 1983 at fictional Harwick University. The player faces more compelling choices than they can take. Every selection permanently closes other story tracks. Life is modeled as overlapping concurrent tracks that collide and compete for limited resources. The player is a time traveler who doesn't fully understand their situation yet.

---

## Quick Orientation

| What | Where |
|------|-------|
| **Stack** | Next.js App Router, TypeScript, Supabase, Tailwind |
| **Supabase project** | `dztobkowaemgvvylgvcx.supabase.co` |
| **Storylet content (source of truth)** | `supabase/migrations/` |
| **NPC registry** | `docs/NPC_DATA_REFERENCE.md` |
| **Contact + reveal design** | `docs/CONTACT_AND_REVEAL.md` |
| **Mini-game design** | `docs/MINI_GAME_DESIGN.md` |
| **Content Studio (admin UI)** | `src/app/(admin)/studio/` |
| **Player game UI** | `src/app/(player)/` |
| **Type definitions** | `src/types/` |
| **Domain logic** | `src/domain/` |
| **Content creation agent** | `agents/content-creator/` (has its own CLAUDE.md) |
| **Task tracker** | `TASKS.md` (root) |
| **Design docs** | `docs/` |

---

## Before Every Session

1. Read `TASKS.md` to understand current priorities and what's in progress
2. Read this file for project rules
3. Before writing any migration, read `docs/CONTENT-RULES.md`
4. For content work, also read `agents/content-creator/CLAUDE.md`
5. Use Plan Mode (Shift+Tab) before making changes — propose a plan, get approval, then execute

---

## Architecture Rules

### Migrations Are Truth
- `supabase/migrations/` is the authoritative source for all storylet content and schema changes
- Never edit storylet content in TypeScript files — it goes through migrations
- Migration naming: numbered `NNNN_description.sql` for legacy, `YYYYMMDDNNNNNN_description.sql` for new

### Content Model: Track + Storylet
See `docs/TRACK_AND_STORYLET_MODEL.md` for the full spec. Summary:

- **Track** = a named parallel narrative thread (DAG of storylets). Multiple run concurrently.
- **Storylet** = the universal content unit. Can belong to a track or float standalone.
- DB tables: `tracks` (was arc_definitions), `track_progress` (was arc_instances), `storylets` (unchanged).
- Types: `src/types/tracks.ts` (TrackKey, Track, TrackProgress, TrackStorylet, DueStorylet).

Six Chapter One tracks run concurrently. Each has a narrative FSM state stored on `track_progress.track_state`:
- **Roommate** — `neutral_coexistence | genuine_connection | surface_tension | open_conflict | avoidance_pattern`
- **Academic** — `false_confidence | quiet_doubt | active_engagement | avoidance_spiral | found_a_thread`
- **Money** — `not_yet_felt | background_hum | friction_visible | active_stress | resolved`
- **Belonging** — `open_scanning | first_anchor | performing_fit | genuine_match | withdrawal`
- **Opportunity** — `undiscovered | noticed | considering | pursuing | committed | expired`
- **Home** — `clean_break | background_warmth | guilt_current | active_pull | identity_rupture`

A 7th track ("Echoes") is reserved for the time-travel frame layer. Not yet implemented.

### Choice Schema
Every storylet choice must include:
```
{
  label: string,              // Short, physical, in-the-moment
  identity_tags: string[],    // risk | people | achieve | safety
  time_cost: number,
  energy_cost: number,
  money_effect?: string,
  skill_requirement?: object,
  skill_modifier?: object,
  relational_effects?: object,
  set_npc_memory?: object,
  events_emitted?: array,
  sets_track_state?: object,  // { state: "genuine_connection" }
  precludes?: string[],       // REQUIRED — storylet slugs this choice locks out
  outcome | outcomes: object, // deterministic or weighted
  mini_game?: object          // optional — see Mini-Game System below
}
```

### NPC Rules
- **Name discipline:** NPC names MUST NOT appear in body text or choice labels before the player could plausibly know them. Use `introduces_npc` field to mark first encounters.
- **Relational state:** trust (-3 to +3), reliability (-3 to +3), emotionalLoad (0-3), relationship (1-10)
- **NPC IDs follow pattern:** `npc_role_firstname` (e.g., `npc_roommate_dana`, `npc_floor_miguel`)
- **Canonical registry:** `docs/NPC_DATA_REFERENCE.md` — update when adding new NPCs
- **Protagonist is male.** All dorm-floor NPCs and the RA are male (men's dorm). Female NPCs (Priya, etc.) exist elsewhere on campus — classrooms, library, social events.

### Three-Slot Time System
Each game day has three time segments. Storylets have a `segment` field:
- `morning`
- `afternoon`
- `evening`

Some activities cost 2 segments. Something always slips — this is by design.

---

## Time-Travel Frame

The player is a time traveler who has returned to 1983. This is revealed on Day 1 morning when they hear someone humming "Gangsta's Paradise" (Coolio, 1995) on the quad. Time travel is the **frame**, not the game — 95% of gameplay is the college life simulation. The frame gives it weight.

### The Contact
A male upperclassman. Watchful, circumspect, cagey. He gives four directives:
1. Build a strong social network
2. Make money / have financial power
3. Gain knowledge / be in the right places
4. Work together with others to make the world better

He does NOT explain who "we" are, how many others exist, who the adversaries are, or how time travel works. He reappears once more in Arc One, briefly. Full spec: `docs/CONTACT_AND_REVEAL.md`.

### The Alternate History Rule
**This is NOT exactly the history the player remembers.** The timeline has anomalies and shifts. Future knowledge is useful but unreliable.

- **Sports** are the clearest signal — almost none of the games go as expected
- **Historical events** are similar in shape but different in detail
- **NPCs** may behave differently than the player would predict
- This prevents the "replay history perfectly" exploit
- This justifies the choice-driven design — if history were identical, there'd be an optimal path

**For content writers:** Never let future knowledge be perfectly accurate. Sports "close but wrong." Cultural events shifted. NPCs occasionally surprising.

### Academic Paths
The contact's advice opens five strategic areas of study, which emerge through NPCs and opportunities (NOT as a menu):
- **History** — know your adversaries, understand the terrain
- **Physics** — understand time travel itself
- **Computer Science** — early-mover advantage in 1983
- **Sociology / Political Science** — understand power and group dynamics
- **Business** — money-making skills, financial strategy

These compete for time slots. You cannot study everything. What you choose shapes what you can do later.

---

## Mini-Game System

See `docs/MINI_GAME_DESIGN.md` for the full spec. Summary:

- Triggered by storylets, not free-standing
- Binary outcome: success or failure, each linking to different storylets
- Adaptive difficulty (invisible to player)
- Under 2 minutes each
- 1983-themed visuals and framing
- Brain-training genre: memory, timing, sorting, pattern recognition

Confirmed games: Memory Cards, Caps, Sorting (bartender skin). More TBD.

---

## Code Conventions

### TypeScript
- Strict mode. No `any` types.
- Domain logic in `src/domain/`, UI components in `src/components/`, server functions in `src/server/`
- Use Tailwind for styling. No custom CSS files for components.
- React components use functional style with hooks

### Testing
- Test framework: Vitest (`vitest.config.ts` in root)
- Run tests before committing: `npx vitest run`
- For storylet content: run the schema validator (see Verification below)

### Git
- Small, focused commits with clear messages
- Patterns: `content: add storylet s_name`, `studio: add feature`, `fix: description`, `chore: description`
- Claude Code can push (allowlisted in `.claude/settings.json`)
- `.claude/` is in `.gitignore`

---

## Verification Checklist

Before considering any content or code change complete:

### For Storylet Content
- [ ] Valid JSON — parseable, no trailing commas
- [ ] All required schema fields present (especially `precludes`)
- [ ] NPC names don't appear before `introduces_npc` — check body text AND choice labels
- [ ] No anachronistic vocabulary (no post-1983 slang, tech, or cultural references)
- [ ] Future knowledge references follow the alternate history rule (never perfectly accurate)
- [ ] Stream state values match the canonical lists above
- [ ] Identity tags are from the valid set: `risk`, `people`, `achieve`, `safety`
- [ ] `events_emitted` uses correct NPC IDs from the registry

### For Code Changes
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Tests pass: `npx vitest run`
- [ ] No console errors in browser
- [ ] Content Studio still loads and Preview Simulator works

---

## Prose Quality Rules

### Anti-Pattern Blacklist (flag and revise if found)
1. **Naming emotions directly** when surrounding physical detail could carry them
2. **Symmetrical constructions** ("Part of him wanted X. Another part wanted Y.")
3. **End-of-paragraph evaluative one-liners** ("It was the kind of moment that changes things.")
4. **Metaphors too polished** for the character's interiority
5. **Labeling the déjà vu** instead of rendering it

### Prose Reference Authors
Primary: Rohinton Mistry (sentence-level precision)
Also: Raymond Carver, Denis Johnson, Lorrie Moore, Alice Munro
Game writing: Disco Elysium, Kentucky Route Zero, 80 Days

### Period Rules (1983)
- No smartphones, email, texting, personal computers in dorms
- Yes: bulletin boards, dorm floor phones, cassettes, paper maps, typewriters
- Music as identity signaling (record collection = social currency)
- Dialogue lightly salted with period slang, never saturated
- Ambient social climate of 1983, not contemporary vocabulary
- See `agents/content-creator/period-reference.md` for full details

---

## Key Design Philosophy

**Scarcity and preclusion** — the player always has more compelling options than time to take them. Choosing one thing closes others permanently.

**Collision over sequence** — drama comes from streams competing for the same slot, not from linear beat progressions. The "guaranteed slip" (something always falls behind) is a core mechanic.

**Fixed questions, variable answers** — pillars encode human tensions (Belonging, Agency, Integrity, Love, Craft, Courage). Each has 3 modes. Combinations of tension resolutions create different lives.

**Alternate history** — the past is not a perfect copy. Future knowledge helps but cannot be trusted completely. This keeps every playthrough genuinely uncertain.

**Three questions every run must answer:**
1. Who did I become?
2. What did it cost?
3. What would I try next time?

---

## Current Status

Check `TASKS.md` for the live state of all work. The project is in early Arc One development. The revised opening sequence (time-travel reveal via Gangsta's Paradise on the quad, contact conversation, dining hall with three evening invitations) is designed but not yet written. One design decision remains: the three evening event NPCs. After that, content writing begins.
