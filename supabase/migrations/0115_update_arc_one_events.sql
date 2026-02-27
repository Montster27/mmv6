-- Add relationship events and knowledge-gated reactions for arc_one_core storylets.

update public.storylets
set choices = (
  select jsonb_agg(
    case
      when choice->>'id' = 'answer_phone' then
        jsonb_set(
          jsonb_set(
            choice,
            '{events_emitted}',
            jsonb_build_array(
              jsonb_build_object(
                'npc_id', 'npc_connector_miguel',
                'type', 'OVERHEARD_NAME',
                'magnitude', 1
              )
            )
          ),
          '{reaction_text_conditions}',
          jsonb_build_array(
            jsonb_build_object(
              'if', jsonb_build_object(
                'requires_npc_known', jsonb_build_array('npc_connector_miguel')
              ),
              'text', $$"Hello--Clark Hall, second floor," you say.

There's a crackle on the line.

"Can you get Miguel?"

Your stomach drops--because you know exactly who that is.

"Yeah," you hear yourself say. "Hold on."

Dana's eyes are on you now. Curious. A little wary.$$
            ),
            jsonb_build_object(
              'if', jsonb_build_object(
                'not', jsonb_build_object(
                  'requires_npc_known', jsonb_build_array('npc_connector_miguel')
                )
              ),
              'text', $$"Hello--Clark Hall, second floor," you say.

A pause. A crackle.

"Is there a guy down the hall named Miguel?"

The name hits like a cold coin.

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
          jsonb_set(
            jsonb_set(
              choice - 'set_npc_memory',
              '{events_emitted}',
              jsonb_build_array(
                jsonb_build_object(
                  'npc_id', 'npc_connector_miguel',
                  'type', 'INTRODUCED_SELF',
                  'magnitude', 1
                )
              )
            ),
            '{reaction_text}',
            to_jsonb(
              $$You walk straight up before you can talk yourself out of it.

"Hey--mind if I sit?"

He breaks into an easy grin.

"Miguel," he says, like you should have met weeks ago.$$::text
            )
          ),
          '{reaction_text_conditions}',
          jsonb_build_array(
            jsonb_build_object(
              'if', jsonb_build_object(
                'requires_npc_met', jsonb_build_array('npc_connector_miguel')
              ),
              'text', $$He looks like he recognizes you already.

"Hey--mind if I sit?"

"Miguel," he says again, easy and familiar.$$ 
            )
          )
        )
      when choice->>'id' = 'hover_near_table' then
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_connector_miguel',
              'type', 'NOTICED_FACE',
              'magnitude', 1
            )
          )
        )
      else choice
    end
  )
  from jsonb_array_elements(choices) as choice
)
where slug = 's3_dining_hall';

update public.storylets
set choices = (
  select jsonb_agg(
    case
      when choice->>'id' = 'bookstore_line' then
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_roommate_dana',
              'type', 'SMALL_KINDNESS',
              'magnitude', 1
            )
          )
        )
      when choice->>'id' = 'freshman_social' then
        jsonb_set(
          choice - 'set_npc_memory',
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_connector_miguel',
              'type', 'SMALL_KINDNESS',
              'magnitude', 1
            ),
            jsonb_build_object(
              'npc_id', 'npc_connector_miguel',
              'type', 'INTRODUCED_SELF',
              'magnitude', 1
            )
          )
        )
      when choice->>'id' = 'walk_alone' then
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_roommate_dana',
              'type', 'AWKWARD_MOMENT',
              'magnitude', 1
            )
          )
        )
      else choice
    end
  )
  from jsonb_array_elements(choices) as choice
)
where slug = 's4_midday_choice';

update public.storylets
set choices = (
  select jsonb_agg(
    case
      when choice->>'id' = 'address_directly' then
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_roommate_dana',
              'type', 'REPAIR_ATTEMPT',
              'magnitude', 1
            )
          )
        )
      when choice->>'id' = 'joke_deflect' then
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_roommate_dana',
              'type', 'AWKWARD_MOMENT',
              'magnitude', 1
            )
          )
        )
      when choice->>'id' = 'deal_tomorrow' then
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_roommate_dana',
              'type', 'CONFLICT_LOW',
              'magnitude', 1
            )
          )
        )
      else choice
    end
  )
  from jsonb_array_elements(choices) as choice
)
where slug = 's5_roommate_tension';
