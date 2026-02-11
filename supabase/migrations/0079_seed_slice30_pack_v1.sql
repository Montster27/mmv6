insert into public.storylets (slug, title, body, choices, tags, requirements, weight, is_active)
values
  (
    'slice30_core_budget',
    'Notice on the Door',
    $$A thin paper notice is wedged into your doorframe, as if it has been there for hours. It is polite, firm, and insists on a small fee you didn't plan for. It doesn't threaten anything dramatic. It just assumes you will handle it.

You read it twice. It is the kind of reminder that makes everything feel narrower than it is, a quiet pinch on your day. You can clear it now, or you can slide it under your notebook and pretend it will wait.$$,
    $$[
      {"id":"pay_now","label":"Handle it now.","outcome":{"text":"That felt responsible.","deltas":{"stress":-2,"vectors":{"stability":2,"ambition":-1}},"resource_deltas":{"money":-2}}},
      {"id":"delay_it","label":"Let it ride a few days.","outcome":{"text":"You bought time, but it kept a tally.","deltas":{"stress":2,"vectors":{"ambition":1,"stability":-1}},"resource_deltas":{"money":0},"delayed_consequence_key":"late_fee"}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','core','phase:intro_hook'],
    '{"trigger_phase":"intro_hook"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_core_focus',
    'Stacked Tasks',
    $$Your to-do list is stacked in a way that makes everything look equally urgent. One assignment is clearly the most important, but the smaller tasks keep whispering for attention. You can try to focus hard, or you can keep switching and hope the day feels lighter.

Either way, the clock will keep moving.$$,
    $$[
      {"id":"focus_block","label":"Commit to the most important task.","outcome":{"text":"You felt the work tighten into place.","deltas":{"energy":-1,"stress":-1,"vectors":{"focus":2,"agency":1}},"resource_deltas":{"study_progress":1}}},
      {"id":"switch_often","label":"Bounce between smaller tasks.","outcome":{"text":"You stayed busy, but it blurred together.","deltas":{"stress":1,"vectors":{"focus":-1,"reflection":1}},"resource_deltas":{"study_progress":0}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','core','phase:guided_core_loop'],
    '{"trigger_phase":"guided_core_loop"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_core_shift',
    'An Extra Shift',
    $$A last-minute shift opens up. It's not glamorous, but it would ease a small pressure. You had planned to use that time to catch up on your own work.

You weigh what is immediate against what is important and feel the familiar tug of both.$$,
    $$[
      {"id":"take_shift","label":"Take the shift.","outcome":{"text":"You chose the sure thing.","deltas":{"energy":-2,"stress":1,"vectors":{"ambition":2,"stability":-1}},"resource_deltas":{"money":2}}},
      {"id":"keep_time","label":"Keep the time for yourself.","outcome":{"text":"You protected the longer arc.","deltas":{"vectors":{"stability":2,"reflection":1}},"resource_deltas":{"study_progress":1}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','core','phase:guided_core_loop'],
    '{"trigger_phase":"guided_core_loop"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_core_health',
    'Clinic Flyer',
    $$A flyer on the hallway bulletin board advertises a wellness check. It's a small window of time, and you would have to rearrange your schedule to make it.

You can feel the day already pressing in. Still, you can also feel the faint relief you get when you take care of something before it becomes urgent.$$,
    $$[
      {"id":"sign_up","label":"Go for the check-in.","outcome":{"text":"You chose to steady the baseline.","deltas":{"energy":-1,"stress":-2,"vectors":{"stability":2,"reflection":1}},"resource_deltas":{"health":1}}},
      {"id":"ignore","label":"Skip it and keep moving.","outcome":{"text":"You kept pace, but stayed tight.","deltas":{"stress":1,"vectors":{"agency":-1,"ambition":1}},"resource_deltas":{"health":0}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','core','phase:reflection_arc'],
    '{"trigger_phase":"reflection_arc"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_core_social',
    'Group Study Invite',
    $$A classmate asks if you want to join a study table. It could help with the material and keep you in the loop. It could also slow you down.

The choice is small, but it tugs on the shape of your day.$$,
    $$[
      {"id":"join_group","label":"Join the group.","outcome":{"text":"The room felt a little more open.","deltas":{"vectors":{"social":2,"focus":1}},"resource_deltas":{"social_capital":1}}},
      {"id":"decline_group","label":"Work alone.","outcome":{"text":"You kept your own rhythm.","deltas":{"vectors":{"stability":1,"reflection":1}},"resource_deltas":{"study_progress":1}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','core','phase:community_purpose'],
    '{"trigger_phase":"community_purpose"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_core_boundaries',
    'Late-Night Boundary',
    $$A friend knocks on your door late with a question that could stretch into an hour. You could listen, or you could set a boundary and keep your night intact.

Both are reasonable. Only one fits the energy you still have.$$,
    $$[
      {"id":"set_boundary","label":"Ask to talk tomorrow.","outcome":{"text":"You protected the end of the day.","deltas":{"stress":-2,"vectors":{"agency":2,"stability":1}},"resource_deltas":{"health":1}}},
      {"id":"say_yes","label":"Invite them in.","outcome":{"text":"You said yes, and it took something to do it.","deltas":{"stress":2,"vectors":{"social":1,"reflection":1}},"resource_deltas":{"health":-1},"delayed_consequence_key":"late_night_drain"}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','core','phase:community_purpose'],
    '{"trigger_phase":"community_purpose"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_social_family',
    'Family Check-In',
    $$A short message from home lights up your phone: "How are you really?"

You could answer honestly and open a longer thread, or keep it light and move on. Either way, you will feel the choice in your chest.$$,
    $$[
      {"id":"answer_honest","label":"Answer honestly.","outcome":{"text":"You let yourself be seen.","deltas":{"stress":-1,"vectors":{"reflection":2,"social":1}},"resource_deltas":{"social_capital":1}}},
      {"id":"keep_light","label":"Keep it simple.","outcome":{"text":"You kept the surface calm.","deltas":{"vectors":{"stability":1,"reflection":-1}},"resource_deltas":{"social_capital":0}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','social','phase:reflection_arc'],
    '{"trigger_phase":"reflection_arc"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_social_roommate',
    'Roommate''s Question',
    $$Your roommate pauses at the doorway and asks if you want anything from the corner store. It's a small gesture, and it would be easy to turn down.

Sometimes small things set a tone for the rest of a week.$$,
    $$[
      {"id":"share_snack","label":"Ask for a snack and offer to split.","outcome":{"text":"It felt easy to be connected.","deltas":{"vectors":{"social":1,"stability":1}},"resource_deltas":{"money":-1}}},
      {"id":"brush_off","label":"Say no and keep working.","outcome":{"text":"You stayed in your lane.","deltas":{"stress":1,"vectors":{"social":-1,"focus":1}},"delayed_consequence_key":"roommate_distance"}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','social','phase:guided_core_loop'],
    '{"trigger_phase":"guided_core_loop"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_social_oldfriend',
    'An Old Friend Pings You',
    $$A name you haven't seen in a while pops up on your screen. The message is simple: "Still in town?"

You can make space for it, or you can let it wait until you have more time. Both are true. One is more immediate.$$,
    $$[
      {"id":"meet_up","label":"Make time to meet.","outcome":{"text":"You left the room for a moment.","deltas":{"energy":-1,"vectors":{"social":2,"reflection":1}},"resource_deltas":{"social_capital":1}}},
      {"id":"postpone","label":"Say you''re busy and push it out.","outcome":{"text":"You kept the schedule intact.","deltas":{"vectors":{"ambition":1,"stability":1,"social":-1}},"resource_deltas":{"social_capital":-1}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','social','phase:community_purpose'],
    '{"trigger_phase":"community_purpose"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_history_mural',
    'The Mural by the Library',
    $$A large mural wraps the side of the library, older than the building itself. It shows a campus that looks familiar and wrong at the same time. You pause because something about it tugs at memory, not knowledge.

It would take a few minutes to read the plaque. It would take less to keep walking.$$,
    $$[
      {"id":"read_plaque","label":"Read the plaque and take a photo.","outcome":{"text":"You marked it for later.","deltas":{"vectors":{"curiosity":2,"reflection":1}},"resource_deltas":{"study_progress":1},"delayed_consequence_key":"mural_phrase"}},
      {"id":"keep_walking","label":"Keep walking.","outcome":{"text":"You stayed on schedule.","deltas":{"vectors":{"stability":1}},"resource_deltas":{"study_progress":0}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','history','anomaly_beat','phase:intro_hook'],
    '{"trigger_phase":"intro_hook"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_history_tuition',
    'Line Item',
    $$A line item on your account shows a new fee you don't recognize. It is small, but it has a way of lingering in your mind.

You can ask a question and risk spending time on it, or you can let it sit and assume it will resolve later.$$,
    $$[
      {"id":"ask_question","label":"Ask about the fee.","outcome":{"text":"You pushed for clarity.","deltas":{"stress":1,"vectors":{"agency":1,"curiosity":1}},"resource_deltas":{"study_progress":1}}},
      {"id":"let_it_sit","label":"Let it sit for now.","outcome":{"text":"You chose calm over clarity.","deltas":{"vectors":{"stability":1,"reflection":1}},"resource_deltas":{"money":0}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','history','phase:guided_core_loop'],
    '{"trigger_phase":"guided_core_loop"}'::jsonb,
    100,
    true
  ),
  (
    'slice30_history_archive',
    'Archive Room',
    $$The archive room is open, dim and cool. The shelves are neat in the way that makes you slow down without knowing why. A handwritten ledger sits at the edge of a table, untouched.

You could take a closer look, or you could keep the day moving.$$, 
    $$[
      {"id":"browse_ledger","label":"Skim the ledger.","outcome":{"text":"You pulled on a loose thread.","deltas":{"energy":-1,"vectors":{"curiosity":2,"focus":1}},"resource_deltas":{"study_progress":1},"delayed_consequence_key":"archive_stamp"}},
      {"id":"leave_room","label":"Leave it for another day.","outcome":{"text":"You kept the day intact.","deltas":{"vectors":{"stability":1}},"resource_deltas":{"study_progress":0}}}
    ]$$::jsonb,
    ARRAY['slice30_pack_v1','history','anomaly_beat','phase:reflection_arc'],
    '{"trigger_phase":"reflection_arc"}'::jsonb,
    100,
    true
  )
on conflict (slug) do update
  set title = excluded.title,
      body = excluded.body,
      choices = excluded.choices,
      tags = excluded.tags,
      requirements = excluded.requirements,
      weight = excluded.weight,
      is_active = excluded.is_active;
