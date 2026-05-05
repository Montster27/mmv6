-- study_group_forming — Beat 2D RETROFIT: "The Study Group Assumption"
--
-- Existing storylet (academic track, Day 3 afternoon, due_offset_days=3).
-- Retrofit inserts the misogyny friction beat between the existing study
-- session nodes (study_active, study_passive) and the terminal choices.
--
-- Brief: docs/PERIOD-FRICTION-CONTENT-BRIEF.md §"Beat 2D"
-- Prose: docs/PERIOD-FRICTION-PROSE.md §"Day 3, Afternoon — Beat 2D"
--
-- ─────────────────────────────────────────────────────────────────────
-- What changes
-- ─────────────────────────────────────────────────────────────────────
--
-- 1. Existing nodes preserved: join_or_not, study_active, study_passive.
--    BUT — study_active.next changes from "choices" to "paper_assignment".
--    AND — study_active text trimmed: removed final paragraph
--    ("For an hour, you trade observations... You leave knowing...")
--    because the new beat fires DURING the session, before leaving. The
--    leaving framing now lives in study_resolves variants.
--    study_passive.next also redirects to "paper_assignment".
--
-- 2. Three new nodes inserted after study_active/study_passive:
--      paper_assignment      — Bryce assumes Priya will take notes
--      priya_takes_paper     — THE FRICTION (3 micros)
--                              absorbed   → study_absorbed  + period_stance absorbed
--                              deflected  → study_deflected + period_stance deflected
--                                         + set_npc_memory priya.deflected_for_her
--                              challenged → study_challenged + period_stance challenged
--                                         + set_npc_memory priya.challenged_for_her
--      study_resolves        — text_variants on flag, then → choices
--
-- 3. Existing terminals (stay_and_review, head_back_to_dorm) keep their
--    practices_skills, reaction_text, identity_tags — but events_emitted
--    upgrades from [] to ConditionalEmissionGroup[]:
--      • flag study_deflected  → SMALL_KINDNESS priya 0.5
--      • flag study_challenged → SMALL_KINDNESS priya 1.0
--      • else → []  (absorbed = silent pattern, no positive deposit)
--
-- 4. Storylet-level introduces_npc adds ["npc_anderson_bryce",
--    "npc_studious_priya"]. Bryce had no prior introduces_npc anywhere.
--    Priya's NPC_DATA_REFERENCE entry was aspirational (no migration
--    actually introduced her). This is now the canonical Day 3 introduction
--    for both. Beat 2E (priya_dining_hall, Day 4-6) repeats Priya in its
--    introduces_npc — idempotent.

UPDATE public.storylets
SET
  introduces_npc = ARRAY['npc_anderson_bryce', 'npc_studious_priya']::text[],

  nodes = $nodes$[
    {
      "id": "join_or_not",
      "text": "There's an empty chair. The textbook is open to Chapter One. Someone has already outlined the key points on a legal pad — numbered, with sub-points. They're ahead of you, or they're at the same place and just more organized.",
      "micro_choices": [
        {
          "id": "sit_and_contribute",
          "next": "study_active",
          "label": "Sit down. Pull out your notes.",
          "condition": { "requires_flag": "did_reading" },
          "sets_flag": "joined_study_group"
        },
        {
          "id": "sit_and_listen",
          "next": "study_passive",
          "label": "Sit down. Listen first.",
          "sets_flag": "joined_study_group"
        },
        {
          "id": "keep_walking",
          "next": "choices",
          "label": "Keep walking. You'll figure it out yourself."
        }
      ]
    },
    {
      "id": "study_active",
      "next": "paper_assignment",
      "text": "You open the reader to your underlines. Hammurabi's Code, the grain accounting, the difference between writing and literature. You say something about the inventory point — that writing started as bureaucracy, not art — and the guy with the legal pad writes it down.\n\n\"Good. That's the thesis of the chapter. Moretti's going to build on that.\""
    },
    {
      "id": "study_passive",
      "next": "paper_assignment",
      "text": "You listen. They're comparing notes, debating whether Moretti emphasized the legal codes or the agricultural systems. You haven't done the reading, or you have but didn't take notes, and either way you're behind the conversation.\n\nBut you're here. And being here counts for something — the next time they meet, they'll remember you showed up. The student with the legal pad glances at you once, not unkindly. \"You'll catch up. Everyone's figuring it out.\""
    },
    {
      "id": "paper_assignment",
      "speaker": "npc_anderson_bryce",
      "text": "\"Cool, so we're set on Tuesday and Thursday. Who's got paper?\" Bryce — the guy with the legal pad — looks at Priya. Doesn't ask. Just looks. \"You're good at that, right?\"",
      "next": "priya_takes_paper"
    },
    {
      "id": "priya_takes_paper",
      "text": "Priya pulls a notebook out of her bag. Doesn't say anything. Doesn't react. Just opens to a fresh page.",
      "micro_choices": [
        {
          "id": "study_absorbed",
          "label": "Don't say anything. She's handling it.",
          "next": "study_resolves",
          "sets_flag": "study_absorbed",
          "period_stance": "absorbed"
        },
        {
          "id": "study_deflected",
          "label": "\"I can take notes — I write fast.\"",
          "next": "study_resolves",
          "sets_flag": "study_deflected",
          "period_stance": "deflected",
          "set_npc_memory": {
            "npc_studious_priya": { "deflected_for_her": true }
          }
        },
        {
          "id": "study_challenged",
          "label": "\"Why don't we rotate?\"",
          "next": "study_resolves",
          "sets_flag": "study_challenged",
          "period_stance": "challenged",
          "set_npc_memory": {
            "npc_studious_priya": { "challenged_for_her": true }
          }
        }
      ]
    },
    {
      "id": "study_resolves",
      "text": "The group settles on the schedule. Tuesdays and Thursdays after Western Civ. Priya closes her notebook.",
      "text_variants": [
        {
          "condition": { "flag": "study_deflected" },
          "text": "Priya looks at you for half a second. Closes her notebook. Doesn't push back on the offer. The group settles on the schedule. Tuesdays and Thursdays."
        },
        {
          "condition": { "flag": "study_challenged" },
          "text": "Bryce — looks confused for a second, then shrugs. \"Yeah, sure, rotate.\" Priya doesn't react. Closes her notebook. The group settles on the schedule."
        }
      ],
      "next": "choices"
    }
  ]$nodes$::jsonb,

  choices = $choices$[
    {
      "id": "stay_and_review",
      "label": "Stay at the library to keep studying",
      "precludes": [],
      "sets_flag": ["extra_study"],
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["achievement"],
      "reaction_text": "They leave after an hour. You stay. The library is different when it's just you — the silence stops being communal and starts being private. You read another twenty pages. Some of it sticks. Some of it slides. But the chair is comfortable and the light through the window is good and for an hour, college feels like the thing it's supposed to be.",
      "events_emitted": [
        {
          "condition": { "flag": "study_deflected" },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS", "magnitude": 0.5 }
          ]
        },
        {
          "condition": { "flag": "study_challenged" },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS", "magnitude": 1.0 }
          ]
        },
        { "condition": { "else": true }, "events": [] }
      ],
      "practices_skills": ["study_discipline"]
    },
    {
      "id": "head_back_to_dorm",
      "label": "Head back to the dorm",
      "precludes": [],
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "reaction_text": "You pack up and walk back across the quad. The afternoon light is doing the thing where it makes every brick building look like a postcard. Two people are throwing a football. A girl is reading on the grass with her shoes off. It looks like a brochure and you're in it now.",
      "events_emitted": [
        {
          "condition": { "flag": "study_deflected" },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS", "magnitude": 0.5 }
          ]
        },
        {
          "condition": { "flag": "study_challenged" },
          "events": [
            { "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS", "magnitude": 1.0 }
          ]
        },
        { "condition": { "else": true }, "events": [] }
      ]
    }
  ]$choices$::jsonb
WHERE slug = 'study_group_forming';
