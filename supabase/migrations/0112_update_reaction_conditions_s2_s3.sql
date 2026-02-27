-- Update reaction text conditions for s2_hall_phone and s3_dining_hall.

update public.storylets
set choices = (
  select jsonb_agg(
    case
      when choice->>'id' = 'answer_phone' then
        jsonb_set(
          choice,
          '{reaction_text_conditions}',
          jsonb_build_array(
            jsonb_build_object(
              'if', jsonb_build_object(
                'all', jsonb_build_array(
                  jsonb_build_object('path', 'npc_memory.npc_connector_miguel.met', 'equals', true),
                  jsonb_build_object('path', 'npc_memory.npc_connector_miguel.knows_name', 'equals', true)
                )
              ),
              'text', $$"Hello--Clark Hall, second floor," you say.

There's a crackle on the line.

"Can you get Miguel?"

Your stomach drops--because you know exactly who that is.

"Yeah," you hear yourself say. "Hold on."

Dana's eyes are on you now. Curious. A little wary.$$, 
              'relational_effects', jsonb_build_object(
                'npc_connector_miguel', jsonb_build_object('trust', 1)
              )
            ),
            jsonb_build_object(
              'if', jsonb_build_object(
                'all', jsonb_build_array(
                  jsonb_build_object('path', 'npc_memory.npc_connector_miguel.met', 'equals', true),
                  jsonb_build_object('path', 'npc_memory.npc_connector_miguel.knows_name', 'equals', false)
                )
              ),
              'text', $$"Hello--Clark Hall, second floor," you say.

A pause. A crackle.

"Is Miguel there?"

The name hits and you feel the shape of a face, but not the word.

Dana watches you, waiting to see what you do.$$
            )
          )
        )
      else choice
    end
  )
  from jsonb_array_elements(choices) as choice
)
where slug = 's2_hall_phone';

update public.storylets
set choices = (
  select jsonb_agg(
    case
      when choice->>'id' = 'approach_miguel' then
        jsonb_set(
          choice,
          '{reaction_text_conditions}',
          jsonb_build_array(
            jsonb_build_object(
              'if', jsonb_build_object(
                'path', 'npc_memory.npc_connector_miguel.met', 'equals', true
              ),
              'text', $$You step up and he looks like he recognizes you already.

"Hey--mind if I sit?" you ask.

"Miguel," he says again, easy and familiar.$$ 
            )
          )
        )
      else choice
    end
  )
  from jsonb_array_elements(choices) as choice
)
where slug = 's3_dining_hall';
