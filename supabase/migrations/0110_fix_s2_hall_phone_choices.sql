-- Fix s2_hall_phone choices to restore answer_phone and reaction conditions.

update public.storylets
set choices = jsonb_build_array(
  jsonb_build_object(
    'id', 'answer_phone',
    'label', 'Answer the phone.',
    'time_cost', 1,
    'energy_cost', 1,
    'identity_tags', to_jsonb(ARRAY['risk','people']),
    'targetStoryletId', 's3_dining_hall',
    'reaction_text', $$"Hello--Clark Hall, second floor," you say.

A pause. A crackle.

"Is Miguel there?"

The name hits like a cold coin.

You don't know anyone named Miguel.

Dana watches you, waiting to see what you do.$$, 
    'reaction_text_conditions', jsonb_build_array(
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
      )
    ),
    'relational_effects', jsonb_build_object(
      'npc_roommate_dana', jsonb_build_object('curiosity', 1)
    )
  ),
  jsonb_build_object(
    'id', 'ignore_phone',
    'label', 'Let someone else grab it.',
    'time_cost', 0,
    'energy_cost', 0,
    'identity_tags', to_jsonb(ARRAY['safety','avoid']),
    'reaction_text', $$You let the ringing keep its own rhythm.

Someone farther down the hall groans and grabs the receiver.

Dana looks at you like she's taking notes.$$, 
    'targetStoryletId', 's3_dining_hall',
    'relational_effects', jsonb_build_object(
      'npc_roommate_dana', jsonb_build_object('reliability', -1)
    )
  ),
  jsonb_build_object(
    'id', 'tell_dana_answer',
    'label', 'Tell Dana she should answer it.',
    'time_cost', 0,
    'energy_cost', 0,
    'identity_tags', to_jsonb(ARRAY['avoid','people']),
    'reaction_text', $$You nod toward the phone.

Dana hesitates--then picks it up like it might bite.

She turns her back as she listens.

It's a small thing.

It doesn't feel small.$$, 
    'targetStoryletId', 's3_dining_hall',
    'relational_effects', jsonb_build_object(
      'npc_roommate_dana', jsonb_build_object('reliability', -1, 'emotionalLoad', 1)
    )
  )
)
where slug = 's2_hall_phone';
