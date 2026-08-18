-- Remove branch-authoring language that leaked into the player-facing reaction.
-- This is a content-only update; it does not alter schema or policies.
begin;

update public.storylets
set choices = (
  select jsonb_agg(
    case
      when option->>'reaction_text' = 'You pick up your backpack. The room is small enough that leaving it changes the air pressure. Scott says "see ya" or the note says "gone to breakfast" or nobody says anything at all, depending on the morning you''ve had. The door closes behind you and the hallway is bright and the day is starting and you''re in it now.'
      then jsonb_set(
        option,
        '{reaction_text}',
        to_jsonb('You pick up your backpack. The room is small enough that leaving changes the air pressure. The door closes behind you. The hallway is bright, the day is starting, and you are in it now.'::text)
      )
      else option
    end
    order by ordinal
  )
  from jsonb_array_elements(choices) with ordinality as entries(option, ordinal)
)
where slug = 'scott_day2_morning'
  and jsonb_typeof(choices) = 'array';

commit;
