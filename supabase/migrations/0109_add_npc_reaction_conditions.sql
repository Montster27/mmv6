-- Add npc memory-based reaction text and memory updates.

-- s2_hall_phone updates
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'answer_phone' THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(
              choice,
              '{reaction_text_conditions}',
              '[
                {
                  "if": {
                    "all": [
                      { "path": "npc_memory.npc_connector_miguel.met", "equals": true },
                      { "path": "npc_memory.npc_connector_miguel.knows_name", "equals": true }
                    ]
                  },
                  "text": "“Hello—Clark Hall, second floor,” you say.\\n\\nThere’s a crackle on the line.\\n\\n“Can you get Miguel?”\\n\\nYour stomach drops—because you know exactly who that is.\\n\\n“Yeah,” you hear yourself say. “Hold on.”\\n\\nDana’s eyes are on you now. Curious. A little wary.",
                  "relational_effects": {
                    "npc_connector_miguel": { "trust": 1 }
                  }
                },
                {
                  "if": {
                    "not": {
                      "all": [
                        { "path": "npc_memory.npc_connector_miguel.met", "equals": true },
                        { "path": "npc_memory.npc_connector_miguel.knows_name", "equals": true }
                      ]
                    }
                  },
                  "text": "“Hello—Clark Hall, second floor,” you say.\\n\\nA pause. A crackle.\\n\\n“Is Miguel there?”\\n\\nThe name hits like a cold coin.\\n\\nYou don’t know anyone named Miguel.\\n\\nDana watches you, waiting to see what you do."
                }
              ]'::jsonb
            ),
            '{reaction_text}',
            to_jsonb(null::text)
          ),
          '{relational_effects}',
          '{"npc_roommate_dana": { "curiosity": 1 }}'::jsonb
        )
      WHEN choice->>'id' = 'ignore_phone' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{reaction_text}',
            to_jsonb(
              $$You let the ringing keep its own rhythm.

Someone farther down the hall groans and grabs the receiver.

Dana looks at you like she’s taking notes.$$::text
            )
          ),
          '{relational_effects}',
          '{"npc_roommate_dana": { "reliability": -1 }}'::jsonb
        )
      WHEN choice->>'id' = 'tell_dana_answer' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{reaction_text}',
            to_jsonb(
              $$You nod toward the phone.

Dana hesitates—then picks it up like it might bite.

She turns her back as she listens.

It’s a small thing.

It doesn’t feel small.$$::text
            )
          ),
          '{relational_effects}',
          '{"npc_roommate_dana": { "reliability": -1, "emotionalLoad": 1 }}'::jsonb
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's2_hall_phone';

-- s3_dining_hall updates
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'approach_miguel' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{reaction_text}',
            to_jsonb(
              $$You walk straight up before you can talk yourself out of it.

“Hey—mind if I sit?”

He breaks into an easy grin.

“Miguel,” he says, like you should’ve met weeks ago.$$::text
            )
          ),
          '{set_npc_memory}',
          '{"npc_connector_miguel": { "met": true, "knows_name": true }}'::jsonb
        )
      WHEN choice->>'id' = 'sit_with_dana' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{reaction_text}',
            to_jsonb(
              $$You choose the quiet two-seat table like it’s a compromise with yourself.

Dana exhales like she’s relieved you didn’t abandon her.

For a moment, it almost feels like a team.$$::text
            )
          ),
          '{set_npc_memory}',
          '{"npc_roommate_dana": { "met": true, "knows_name": true }}'::jsonb
        )
      WHEN choice->>'id' = 'sit_alone' THEN
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$You take the smallest table you can find and unfold your schedule like a map.

It’s calming.

Also lonely, in a way you can’t admit yet.$$::text
          )
        )
      WHEN choice->>'id' = 'hover_near_table' THEN
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$You hover near Miguel’s table, waiting for the right second.

He glances up.

For a heartbeat, you think he recognizes you.

Then he looks away.$$::text
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's3_dining_hall';
