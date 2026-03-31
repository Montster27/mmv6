# MMV Handoff Brief
> Context bridge for claude.ai, Claude Code, and Cowork sessions.
> Copy this file to the repo root at V16MMV/mmv/HANDOFF.md
> **Last updated:** 2026-03-31 (verified against TASKS.md and codebase by Claude Code)

---

## Project Summary
**MMV (Many More Versions of You)** is a narrative-driven life simulation set in 1983.
Players wake up in a college dorm room, gradually discover they've been sent back in time,
and make choices that shape their personal journey while uncovering what went wrong in the
world. Target audience: adults 55+. Multiplayer/social elements planned for later phases.

## Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **Database:** Supabase (PostgreSQL) — migrations are source of truth for content
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Repo:** `V16MMV/mmv/`
- **Package manager:** npm

---

## Where Things Live

| Layer | Location | Tool | What's there |
|-------|----------|------|--------------|
| **Design brain** | `/Users/montysharma/Obsidian/Obsidian Vault/` | Cowork Project ("MMV Design Brain") | Specs, phase plans, research, design docs, AmsterFlow teaching tool |
| **Built content** | `V16MMV/mmv/` | Claude Code | Code, Supabase migrations (source of truth for storylets), CLAUDE.md, TASKS.md |
| **Bridge** | `V16MMV/mmv/HANDOFF.md` (this file) | All three environments | Current status, what's done, what's next |
| **PM** | claude.ai | Claude (with memory) | Priority calls, routing, decision capture, status checks |
| **Assets** | `Documents/MMV/_assets/` (once consolidated) | Cowork | Investor decks, logos, promo videos |
| **Archive** | `Documents/_archive/mmv-legacy/` (once cleaned up) | None — cold storage | V6–V12 old versions |

### Key Obsidian vault paths
```
Obsidian Vault/
├── Master mmv/           ← game design docs, phase plans (1-9+)
│   └── current/V12/      ← phase specs (may be outdated — verify against TASKS.md)
├── AmsterFlow/            ← pivot module spec, entrepreneurship research
├── MMV/
│   └── dev/               ← dev notes, status snapshots, UI design options
└── [other teaching/research docs]
```

### Key repo paths
```
V16MMV/mmv/
├── CLAUDE.md              ← project bible (Claude Code reads this automatically)
├── TASKS.md               ← live task board
├── HANDOFF.md             ← this file
├── docs/
│   ├── DECISIONS.md       ← design rationale (needs population!)
│   └── [other docs]
├── agents/
│   └── content-creator/   ← 3-stage pipeline + reference docs
├── skills/
│   └── mmv-content-builder/  ← canonical copy of the content skill
├── supabase/
│   └── migrations/        ← SOURCE OF TRUTH for all storylet content
└── src/                   ← application code
```

---

## Current Milestone
**Phase A — "It Runs"** (~95% complete per Cowork audit, March 2026)

## What's Done
- Core storylet engine running (schema, evaluation, branching)
- Scott roommate stream (renamed from Dana/Danny): first night + weekend morning storylets (verified in migrations + code)
- Contact character (Wren) defined and seeded
- Mysterious stranger / Fruit Loops intro encounter written
- Supabase migrations for Phase A content
- NPC system architecture (relationship tracking, memory, location awareness)
- Content creator agent pipeline (3-stage: schema → period check → style)
- mmv-content-builder skill (well-rated, used in both Code and Cowork)
- CLAUDE.md project bible (excellent quality per Code audit)
- TASKS.md milestone tracker (structured, but "In Progress" may be stale)

## What's In Progress
- TASKS.md says "nothing currently in progress" — this is accurate as of 2026-03-31
- Spider NPC encounter: DONE — introduced in s_evening_cards (Miguel's room card game), drafted 2026-03-23
- Collision calendar for Week 1: NOT STARTED — listed under "Needs Breakdown" in TASKS.md as "Map remaining Arc One storylets"

## What's Next (probable, pending review)
- Phase A polish pass: period vocab audit, preclusion logic review
- Fill gaps in collision calendar (which NPCs appear when/where in Week 1)
- Phase B planning: second arc segments for roommate + academic streams
- Investor deck refresh (current deck predates the working content system)

## Recent Decisions (known)
- Reveal song: Gangsta's Paradise (confirmed — in docs/CONTACT_AND_REVEAL.md and CLAUDE.md)
- Terminal choices are permanent — no undo mechanic
- Mini-games deferred to Phase B
- Content lives in Supabase migrations, not flat files
- Obsidian vault = design brain; repo = built content (decided 2026-03-31)
- claude.ai serves as PM across all environments (decided 2026-03-31)
- Cowork Project created for Obsidian vault access (decided 2026-03-31)
- DECISIONS.md has only 1 entry (Jan 2026 — "Phase One scope lock") — many decisions are unrecorded

## Active NPCs
| NPC | Stream | Status |
|-----|--------|--------|
| Scott | Roommate | Renamed from Dana → Scott (men's dorm rule). NPC ID: npc_roommate_scott |
| Miguel | ? | Referenced in notes |
| Spider | Money | DONE — introduced in s_evening_cards. Nickname-only, real name unknown. |
| Wren | Contact/Mystery | Defined and seeded |
| Professor Marsh | Academic | Referenced |
| Karen | ? | Referenced |
| Pat | ? | Referenced |
| Mysterious Stranger | MMV Mystery arc | Fruit Loops encounter written |

## Six Narrative Streams
1. **Roommate** — Scott (was Dana/Danny), dorm life, first relationships
2. **Academic** — Classes, professors, intellectual growth
3. **Money** — Part-time work, Spider, financial pressure
4. **Belonging** — Social groups, identity, fitting in
5. **Opportunity** — Career hints, networking, future seeds
6. **Home** — Family ties, homesickness, independence

---

## Environment Playbook

### Starting a Code session
```
Read TASKS.md and HANDOFF.md. Today I'm working on [specific task].
Before we start, confirm: what's the current state of [relevant area]?
```

### Starting a Cowork session (in MMV Design Brain project)
```
Check your project memory for where we left off.
Today I need to [specific task — write a spec / produce a deck / organize docs].
```

### Starting a claude.ai session
```
[paste this file or describe what you need]
PM check-in: where do things stand and what should I work on next?
```

### Closing ANY session
```
Before we wrap:
1. Update HANDOFF.md with what we did and what's next
2. Log any decisions to docs/DECISIONS.md
3. Update TASKS.md status
4. Flag anything that needs attention in the next session
```

---

## Known Issues (from audits, March 2026)
- [ ] Duplicate skill: mmv-content-builder in both repo and ~/.claude/skills/ — repo is canonical
- [ ] Broken cross-skill refs: Cowork skill references non-existent /mnt/skills/ paths
- [ ] DECISIONS.md nearly empty: Only 1 entry despite months of development
- [ ] TASKS.md "In Progress" stale: Not updated at session boundaries
- [x] Build/test permissions: npx vitest, npx tsc, npm run dev, npm run build added to settings.json allowlist (2026-03-31)
- [ ] Legacy clutter: V6-V12 directories need archiving
- [ ] Desktop: 300+ unorganized screenshots from dev sessions
- [ ] Obsidian phase specs may be outdated: Master mmv/current/V12/ plans may not match current build

## Working Style Notes
Monty's process is exploratory and prototype-driven. He often needs to see something
before knowing what's next. PM approach: short build > look > decide cycles.
Don't over-plan ahead; surface the next 1-2 things and let him react.
Mode varies by day: sometimes builds rough versions, sometimes asks for mockups,
sometimes writes narrative to see if it feels right. Match the energy.

## Other Active Projects
- **ArmsterFlow** — React+Vite+Supabase "pivot kit" teaching tool (skeletal CLAUDE.md needs expansion)
- **AmsterFlow** — Older Next.js version, likely superseded. Has pivot module spec in Obsidian.
- **Teaching** — MADE program courses, UAE game dev students, "Applied AI" master's course design

---

> All ⚠️ items verified and resolved on 2026-03-31 by Claude Code against TASKS.md and codebase.
