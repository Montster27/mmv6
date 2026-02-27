-- Add reaction_text, relational_effects, and npc memory updates for s4/s5 choices.

update public.storylets
set choices = (
  select jsonb_agg(
    case
      when choice->>'id' = 'bookstore_line' then
        jsonb_set(
          jsonb_set(
            choice,
            '{reaction_text}',
            to_jsonb(
              $$You take your place in the line.

The wait is slow, but it feels like something you can control.$$::text
            )
          ),
          '{relational_effects}',
          jsonb_build_object(
            'npc_roommate_dana', jsonb_build_object('reliability', 1)
          )
        )
      when choice->>'id' = 'freshman_social' then
        jsonb_set(
          jsonb_set(
            jsonb_set(
              choice,
              '{reaction_text}',
              to_jsonb(
                $$Miguel claps you on the shoulder and steers you toward the crowd.

"Come on," he says, like you already belong there.$$::text
              )
            ),
            '{set_npc_memory}',
            jsonb_build_object(
              'npc_connector_miguel', jsonb_build_object('met', true, 'knows_name', true)
            )
          ),
          '{relational_effects}',
          jsonb_build_object(
            'npc_connector_miguel', jsonb_build_object('trust', 1),
            'npc_roommate_dana', jsonb_build_object('reliability', -1)
          )
        )
      when choice->>'id' = 'walk_alone' then
        jsonb_set(
          jsonb_set(
            choice,
            '{reaction_text}',
            to_jsonb(
              $$You peel away from the noise and walk the edge of the quad.

The air feels lighter when no one is asking you to choose.$$::text
            )
          ),
          '{relational_effects}',
          jsonb_build_object(
            'npc_roommate_dana', jsonb_build_object('emotionalDistance', 1)
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
          '{reaction_text}',
          to_jsonb(
            $$You meet Dana's eyes and say it plainly.

The room goes quiet for a beat. Then she nods.$$::text
          )
        )
      when choice->>'id' = 'joke_deflect' then
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$You make it a joke and keep moving.

Dana laughs, but it doesn't quite reach her eyes.$$::text
          )
        )
      when choice->>'id' = 'deal_tomorrow' then
        jsonb_set(
          choice,
          '{reaction_text}',
          to_jsonb(
            $$You say you're tired and step around the moment.

Dana looks past you like she's already somewhere else.$$::text
          )
        )
      else choice
    end
  )
  from jsonb_array_elements(choices) as choice
)
where slug = 's5_roommate_tension';
