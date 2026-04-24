-- 2026-04-24 — Gate 0 playtest P3.9: rewrite orientation_fair as a Day 1
-- afternoon pool storylet on the belonging track. Previous version
-- chained to cal_midnight_knock and had been disabled; the replacement
-- is a pool storylet (no default_next_key) that expires after Day 1 so
-- it competes with advisor_visit / terminal_first_visit / lunch_floor
-- for the Day 1 afternoon slot(s). Each choice sets a flag that
-- downstream Day 2+ content can gate on — skipping a table is a
-- visible loss, not a silent one.

UPDATE storylets
SET
  title = 'The Quad, at One',
  body = 'The quad between the library and the student union has been colonized. Folding tables end-to-end, paper signs stapled to cardboard, a kid with a megaphone clearing his throat between announcements. THE HARWICK HERALD NEEDS WRITERS. STUDENT JOBS — ASK AT THE BROWN TABLE. FILM SOCIETY WEDNESDAYS 8PM ROOM 208. CHESS CLUB. YOUNG DEMOCRATS. YOUNG REPUBLICANS. A SOCCER TRYOUT THAT IS EITHER TOMORROW OR HAS ALREADY HAPPENED.

Everyone is handing out paper. Your arm has flyers now. A guy in a crewneck is trying to sell you on the sailing club even though Harwick is a hundred miles from any water bigger than the reservoir. Somewhere a stereo is playing Talking Heads out a second-floor window, which does not help the signal-to-noise.

You could chase any one of these. You can''t chase all of them.',
  is_active = true,
  due_offset_days = 1,
  expires_after_days = 0,
  default_next_key = NULL,
  segment = 'afternoon',
  choices = '[
    {
      "id": "herald_table",
      "label": "Sign up for the Herald",
      "identity_tags": ["achieve", "people"],
      "time_cost": 1,
      "energy_cost": 1,
      "sets_flag": ["signed_up_herald"],
      "reaction_text": "The girl at the Herald table has three pens lined up and a clipboard with a list of names going back to what looks like 1981. ''We need bodies,'' she says, not selling it. ''Tuesdays, basement of the union. Bring your own coffee.'' You write your name under the last one. No one introduces themselves. Everyone assumes you''re already someone.",
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "precludes": []
    },
    {
      "id": "job_board",
      "label": "Stop at the campus jobs table",
      "identity_tags": ["safety", "achieve"],
      "time_cost": 1,
      "energy_cost": 1,
      "sets_flag": ["saw_job_board"],
      "reaction_text": "A woman in her fifties with a perfect gray bob hands you a mimeographed sheet. Work-study, library shelving, dining hall grills, grounds crew. Ten hours a week, $3.35 an hour. ''Come see me next week if you''re serious,'' she says. You fold the sheet into quarters and put it in your back pocket. The paper smells like the purple ink it was printed with.",
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "precludes": []
    },
    {
      "id": "film_society",
      "label": "Linger at the film society table",
      "identity_tags": ["people"],
      "time_cost": 1,
      "energy_cost": 1,
      "sets_flag": ["met_film_society"],
      "reaction_text": "Two guys at the film society table are arguing about whether Blade Runner counts as noir. They pause when you approach. ''You seen it?'' the taller one asks. ''We''re doing it next Wednesday, 16mm print, basement of Jacoby Hall.'' You write your name on a stapled mailing list. They don''t quite make eye contact. Neither do you.",
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "precludes": []
    },
    {
      "id": "walk_through",
      "label": "Walk through — don''t stop",
      "identity_tags": ["safety"],
      "time_cost": 0,
      "energy_cost": 0,
      "sets_flag": ["skipped_orientation_fair"],
      "reaction_text": "You walk through the table gauntlet with your hands in your pockets and your eyes on the brick path. A flyer is pressed into your hand by someone you don''t look at. You keep walking. On the other side, the quad opens up again: oaks, grass, a dog you''re not sure anyone owns. The megaphone kid starts in on the Young Republicans.",
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": -1 } },
      "precludes": []
    }
  ]'::jsonb
WHERE storylet_key = 'orientation_fair';

-- Verify it landed
DO $$
DECLARE
  row_data record;
BEGIN
  SELECT is_active, due_offset_days, expires_after_days, default_next_key, segment,
         jsonb_array_length(choices) AS choice_count
    INTO row_data
    FROM storylets WHERE storylet_key = 'orientation_fair';

  IF row_data.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'orientation_fair is not active after migration';
  END IF;
  IF row_data.default_next_key IS NOT NULL THEN
    RAISE EXCEPTION 'orientation_fair must be pool mode (default_next_key NULL) — got %', row_data.default_next_key;
  END IF;
  IF row_data.segment <> 'afternoon' THEN
    RAISE EXCEPTION 'orientation_fair segment expected afternoon, got %', row_data.segment;
  END IF;
  IF row_data.due_offset_days <> 1 OR row_data.expires_after_days <> 0 THEN
    RAISE EXCEPTION 'orientation_fair expected Day 1 / expires after Day 1, got due=% expires=%',
      row_data.due_offset_days, row_data.expires_after_days;
  END IF;
  IF row_data.choice_count <> 4 THEN
    RAISE EXCEPTION 'orientation_fair expected 4 choices, got %', row_data.choice_count;
  END IF;
END $$;
