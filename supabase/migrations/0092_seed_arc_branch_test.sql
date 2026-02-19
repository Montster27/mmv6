-- Seed a branching test arc with three 6-step branches.

insert into public.arc_definitions (key, title, description, tags, is_enabled)
values
  (
    'arc_branch_test',
    'Branching Test Arc',
    'A short arc to verify multi-branch progression.',
    '["Belonging","Courage"]'::jsonb,
    true
  )
on conflict (key) do update
  set title = excluded.title,
      description = excluded.description,
      tags = excluded.tags,
      is_enabled = excluded.is_enabled;

with arc as (
  select id from public.arc_definitions where key = 'arc_branch_test'
)
insert into public.arc_steps (
  arc_id,
  step_key,
  order_index,
  title,
  body,
  options,
  default_next_step_key,
  due_offset_days,
  expires_after_days
)
select arc.id, steps.*
from arc
cross join (
  values
    (
      'step_1',
      0,
      'The Fork',
      'You have three clear ways forward.',
      '[
        {"option_key":"choose_a","label":"Take path A.","next_step_key":"branch_a_step_1"},
        {"option_key":"choose_b","label":"Take path B.","next_step_key":"branch_b_step_1"},
        {"option_key":"choose_c","label":"Take path C.","next_step_key":"branch_c_step_1"}
      ]'::jsonb,
      null,
      0,
      2
    ),
    (
      'branch_a_step_1',
      1,
      'Branch A — Step 1',
      'You follow the first line of inquiry.',
      '[{"option_key":"a1_continue","label":"Continue.","next_step_key":"branch_a_step_2"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_step_2',
      2,
      'Branch A — Step 2',
      'The thread deepens.',
      '[{"option_key":"a2_continue","label":"Continue.","next_step_key":"branch_a_step_3"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_step_3',
      3,
      'Branch A — Step 3',
      'A small consequence follows.',
      '[{"option_key":"a3_continue","label":"Continue.","next_step_key":"branch_a_step_4"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_step_4',
      4,
      'Branch A — Step 4',
      'You see a clearer pattern.',
      '[{"option_key":"a4_continue","label":"Continue.","next_step_key":"branch_a_step_5"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_step_5',
      5,
      'Branch A — Step 5',
      'The path narrows.',
      '[{"option_key":"a5_continue","label":"Continue.","next_step_key":"branch_a_step_6"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_a_step_6',
      6,
      'Branch A — Step 6',
      'The branch concludes.',
      '[{"option_key":"a6_finish","label":"Finish."}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_step_1',
      7,
      'Branch B — Step 1',
      'You choose the second line.',
      '[{"option_key":"b1_continue","label":"Continue.","next_step_key":"branch_b_step_2"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_step_2',
      8,
      'Branch B — Step 2',
      'A detail changes the tone.',
      '[{"option_key":"b2_continue","label":"Continue.","next_step_key":"branch_b_step_3"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_step_3',
      9,
      'Branch B — Step 3',
      'You weigh a decision.',
      '[{"option_key":"b3_continue","label":"Continue.","next_step_key":"branch_b_step_4"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_step_4',
      10,
      'Branch B — Step 4',
      'Momentum builds.',
      '[{"option_key":"b4_continue","label":"Continue.","next_step_key":"branch_b_step_5"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_step_5',
      11,
      'Branch B — Step 5',
      'You feel the pressure.',
      '[{"option_key":"b5_continue","label":"Continue.","next_step_key":"branch_b_step_6"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_b_step_6',
      12,
      'Branch B — Step 6',
      'The branch concludes.',
      '[{"option_key":"b6_finish","label":"Finish."}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_step_1',
      13,
      'Branch C — Step 1',
      'You take the third path.',
      '[{"option_key":"c1_continue","label":"Continue.","next_step_key":"branch_c_step_2"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_step_2',
      14,
      'Branch C — Step 2',
      'The thread shifts.',
      '[{"option_key":"c2_continue","label":"Continue.","next_step_key":"branch_c_step_3"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_step_3',
      15,
      'Branch C — Step 3',
      'You notice a pattern.',
      '[{"option_key":"c3_continue","label":"Continue.","next_step_key":"branch_c_step_4"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_step_4',
      16,
      'Branch C — Step 4',
      'The stakes rise.',
      '[{"option_key":"c4_continue","label":"Continue.","next_step_key":"branch_c_step_5"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_step_5',
      17,
      'Branch C — Step 5',
      'You commit to the path.',
      '[{"option_key":"c5_continue","label":"Continue.","next_step_key":"branch_c_step_6"}]'::jsonb,
      null,
      1,
      2
    ),
    (
      'branch_c_step_6',
      18,
      'Branch C — Step 6',
      'The branch concludes.',
      '[{"option_key":"c6_finish","label":"Finish."}]'::jsonb,
      null,
      1,
      2
    )
) as steps(
  step_key,
  order_index,
  title,
  body,
  options,
  default_next_step_key,
  due_offset_days,
  expires_after_days
)
on conflict (arc_id, step_key) do update
  set title = excluded.title,
      body = excluded.body,
      options = excluded.options,
      default_next_step_key = excluded.default_next_step_key,
      order_index = excluded.order_index,
      due_offset_days = excluded.due_offset_days,
      expires_after_days = excluded.expires_after_days;
