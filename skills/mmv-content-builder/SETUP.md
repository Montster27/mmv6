# MMV Content Builder — Setup & Usage

## Installation Complete

The skill is installed at:
```
/Users/montysharma/Documents/V16MMV/mmv/skills/mmv-content-builder/
├── SKILL.md
└── references/
    ├── stream-shapes.md
    ├── conversation-schema.md
    ├── interaction-modes.md
    └── anti-patterns.md
```

---

## Using in Cowork

### Step 1: Open your project in Cowork
1. Open **Claude Desktop**
2. Switch to the **Cowork** tab
3. Open a project pointed at `/Users/montysharma/Documents/V16MMV/mmv/`
4. The skill lives in the `skills/` directory — Cowork picks it up automatically

### Step 2: Paste the starter prompt
Copy and paste this to begin a guided content-building session:

```
I want to build narrative content for MMV. Before we start writing,
interview me to understand what I need. Ask me about:

1. What scope am I working on? (single storylet, one stream's content
   map, or a full arc segment across all streams)
2. Which arc segment and time period? (e.g., Arc One Week 1-2)
3. Which streams are involved?
4. Are there specific NPCs or situations I already have in mind?
5. What existing content should you read first? (point me to specific
   migration files or docs if relevant)

Then, based on my answers, tell me which workflow you're going to
follow (A: single storylet, B: stream content map, C: arc segment plan)
and walk me through the process step by step, checking in with me
before each major output.

Important: Use the conversational node system for any storylet that
involves NPC dialogue. I don't want prose walls — I want conversations
the player participates in.
```

---

## Using in Claude.ai

### Option A: Upload as a .skill file
```bash
cd /Users/montysharma/Documents/V16MMV/mmv/skills
zip -r mmv-content-builder.skill mmv-content-builder/
```
Then go to **Customize > Skills > Upload** and upload the zip.

### Option B: Add to a Claude Project
Upload the files to a Claude Project as project knowledge. Claude will
reference them when you ask about MMV content.

---

## Using in Claude Code

Claude Code finds skills in the `skills/` directory at your project root.
It's already in place — just start a session and ask about MMV content.

---

## What to Expect

After the starter prompt, Claude will:
1. Ask 4-5 scoping questions
2. Identify the stream shape (accumulative, crystallizer, gate-structured, ambient)
3. Choose mapping direction (forward from situations or backward from peaks/gates)
4. Build the content map or storylet skeleton — show you for approval
5. Write prose using conversational nodes where NPCs are present
6. Run the editorial checklist (anti-patterns, period accuracy, name leaks)
7. Deliver production-ready JSON or SQL migration format

It checks in before proceeding at each stage.

---

## Tips

- **Be specific about time range.** "Danny content" is too broad. "Danny encounters for Day 2-5" is right.
- **Name known collisions.** "Herald meeting is Day 3 evening" helps Claude design competing situations.
- **Point at existing migrations.** "Read 0105-0121 first" ensures consistency.
- **Request the collision calendar.** After any stream map, ask Claude to overlay with other streams.
- **Ask for miss paths.** If Claude doesn't design them unprompted, ask: "What happens if the player never gets here?"
