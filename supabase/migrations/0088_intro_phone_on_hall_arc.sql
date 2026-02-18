insert into public.content_arcs (key, title, description, tags, is_active)
values (
  'intro_phone_on_hall',
  'The Phone on the Hall',
  'A dorm floor phone, a rule you did not agree to, and a call that keeps landing close to you.',
  array['mandatory','intro','start_day:1','week2_start:6','recombine_day:8'],
  true
)
on conflict (key) do update
  set title = excluded.title,
      description = excluded.description,
      tags = excluded.tags,
      is_active = excluded.is_active;

insert into public.content_arc_steps (arc_key, step_index, title, body, choices)
values
(
  'intro_phone_on_hall',
  0,
  'The Room That Fits Too Well',
  $$The room feels correct in a way that is unsettling. The bed, the desk, the radiator, the pale morning light. It all fits. It fits a little too well, like a memory lined up to meet you.$$,
  $$[
    {"key":"sit_inventory","label":"Sit up and take inventory.","costs":{"energy":1},"rewards":{"stress":-1,"knowledge":1}},
    {"key":"stare_until","label":"Stare at the room until it makes sense.","rewards":{"energy":1},"costs":{"stress":1}},
    {"key":"ask_roommate_day","label":"Ask your roommate what day it is.","rewards":{"socialLeverage":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  1,
  'The Hall Phone Rule',
  $$On your floor, there is one phone in the hall. If it rings, the closest person answers and goes to find the recipient. The logbook is open, the pen is tied to the cord, and the rule is spoken like it has always been there.$$,
  $$[
    {"key":"sign_log","label":"Sign your name on the phone log.","costs":{"energy":1},"rewards":{"socialLeverage":1,"stress":-1}},
    {"key":"keep_head_down","label":"Keep your head down.","rewards":{"energy":1},"costs":{"socialLeverage":1}},
    {"key":"ask_computer_lab","label":"Ask where the nearest computer lab is.","costs":{"stress":1},"rewards":{"knowledge":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  2,
  'The Drawer Envelope',
  $$In the desk drawer, an envelope waits with your name on it. Inside is a note and a few bills. The handwriting is yours. The note is not. When you look up, the seminar poster on the wall is for someone who should not exist yet.$$,
  $$[
    {"key":"pocket_money","label":"Pocket the money without comment.","rewards":{"cashOnHand":2},"costs":{"stress":1},"skill_points":1},
    {"key":"show_roommate_note","label":"Show your roommate the note.","rewards":{"socialLeverage":1},"skill_points":1},
    {"key":"hide_note_leave","label":"Hide the note, leave the money.","rewards":{"stress":-1},"skill_points":1}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  3,
  'Ringing',
  $$The hall phone rings. The voice is calm and tired. The message is for someone down the hall, their father. The request is simple. The weight is not.$$,
  $$[
    {"key":"deliver_immediately","label":"Deliver the message immediately.","costs":{"energy":1},"rewards":{"socialLeverage":2,"stress":-1}},
    {"key":"leave_slip","label":"Leave a slip in their door.","flags":{"compliance":true}},
    {"key":"ask_around_first","label":"Ask around first.","costs":{"energy":1,"socialLeverage":1},"rewards":{"knowledge":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  4,
  'Breakfast Math',
  $$You count your cash, count your time, and count the hours until lunch. It is not the same kind of counting, but it feels similar.$$,
  $$[
    {"key":"full_breakfast","label":"Full breakfast.","costs":{"cashOnHand":1},"rewards":{"energy":2,"physicalResilience":1}},
    {"key":"coffee_toast","label":"Coffee and toast.","rewards":{"energy":1}},
    {"key":"skip_breakfast","label":"Skip.","costs":{"energy":1,"physicalResilience":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  5,
  'The Poster Title',
  $$The seminar poster looks official, but the date is wrong. The speaker name is wrong. It is wrong in ways that only make sense if you already knew the right answer.$$,
  $$[
    {"key":"ignore_poster","label":"Ignore it.","rewards":{"stress":-1},"skill_points":1},
    {"key":"ask_speaker","label":"Ask who the speaker is.","costs":{"energy":1},"rewards":{"knowledge":1},"counters":{"anomaly_progress":1},"skill_points":1},
    {"key":"write_details","label":"Write the details down.","costs":{"energy":1},"rewards":{"stress":-1},"flags":{"anomaly_note_001":true},"skill_points":1}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  6,
  'Laundry Tokens',
  $$The machines take tokens only. The machine eats one and gives nothing back. You consider the clean clothes you need more than the coins you do not have.$$,
  $$[
    {"key":"pay_extras","label":"Pay for extras.","costs":{"cashOnHand":1},"rewards":{"stress":-1,"physicalResilience":1}},
    {"key":"borrow_tokens","label":"Borrow tokens.","costs":{"socialLeverage":1}},
    {"key":"skip_laundry","label":"Skip laundry.","costs":{"socialLeverage":1,"stress":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  7,
  'The Seminar Mention',
  $$Your roommate asks if you are going to the seminar. The poster feels wrong, but the question is ordinary. That makes it worse.$$,
  $$[
    {"key":"say_interesting","label":"Yeah. Sounds interesting.","costs":{"energy":1},"rewards":{"knowledge":1},"counters":{"anomaly_progress":1},"skill_points":1},
    {"key":"say_too_busy","label":"No. Too busy.","rewards":{"energy":1},"skill_points":1},
    {"key":"ask_real_about","label":"What is it really about?","costs":{"stress":1,"socialLeverage":1},"rewards":{"knowledge":1},"skill_points":1}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  8,
  'The Night Split',
  $$Night breaks into three parts: work, people, sleep. You pick one and accept what it will cost.$$,
  $$[
    {"key":"study_late","label":"Study late.","costs":{"energy":2,"stress":1},"rewards":{"knowledge":2}},
    {"key":"common_room","label":"Common room.","costs":{"energy":1},"rewards":{"socialLeverage":2,"stress":-1}},
    {"key":"sleep_early","label":"Sleep.","rewards":{"energy":2,"physicalResilience":1,"stress":-1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  9,
  'RA After-Hours Deal',
  $$The RA tells you to be normal about the visitor. The phone log is open behind them. The rule is still the rule.$$,
  $$[
    {"key":"ask_quiet_space","label":"Ask for quiet study space.","costs":{"socialLeverage":1},"rewards":{"knowledge":1,"stress":-1},"skill_points":1},
    {"key":"ask_phone_log","label":"Ask to see the phone log.","costs":{"energy":1,"stress":1},"counters":{"anomaly_progress":1},"skill_points":1},
    {"key":"do_nothing","label":"Do nothing.","rewards":{"stress":-1},"skill_points":1}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  10,
  'The Call Is For You',
  $$The hall phone rings. The caller says your name. They ask if you are settling in. They do not ask how they know you.$$,
  $$[
    {"key":"play_normal","label":"Play normal.","rewards":{"stress":-1}},
    {"key":"probe_gently","label":"Probe gently.","costs":{"energy":1,"stress":1},"counters":{"anomaly_progress":2}},
    {"key":"refuse_call","label":"Refuse.","rewards":{"socialLeverage":1},"counters":{"risk_flag":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  11,
  'Capstone Investment (Posture)',
  $$You choose where to spend what you have left. It feels like a promise you will have to keep.$$,
  $$[
    {"key":"cap_stability","label":"Stability.","costs":{"cashOnHand":1},"rewards":{"physicalResilience":2,"stress":-1}},
    {"key":"cap_capability","label":"Capability.","costs":{"energy":1},"rewards":{"knowledge":2},"skill_points":1},
    {"key":"cap_people","label":"People.","costs":{"socialLeverage":1},"rewards":{"socialLeverage":2},"flags":{"dorm_network_seed":true}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  12,
  'The Message Slip (Stinger)',
  $$On your bed is a message slip in your handwriting: "Do not answer the phone next time." You do not remember writing it.$$,
  $$[
    {"key":"keep_slip","label":"Keep the slip.","flags":{"week2_unlocked":true},"skill_points":2}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  13,
  'Morning After',
  $$People want to know what happened. You decide how much of the story you let out.$$,
  $$[
    {"key":"share_some","label":"Share a little.","rewards":{"socialLeverage":1,"stress":-1}},
    {"key":"deflect","label":"Deflect.","rewards":{"energy":1}},
    {"key":"shut_down","label":"Shut it down.","rewards":{"stress":-1},"costs":{"socialLeverage":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  14,
  'The Hall Phone Test',
  $$One ring. Then silence. You watch the handset as if it will move on its own.$$,
  $$[
    {"key":"pick_up_anyway","label":"Pick up anyway.","costs":{"stress":1},"counters":{"anomaly_progress":1},"flags":{"line_residue":true}},
    {"key":"dont_pick_up","label":"Do not pick up.","rewards":{"stress":-1},"flags":{"compliance":true}},
    {"key":"watch_approach","label":"Watch who approaches.","costs":{"energy":1},"rewards":{"knowledge":1,"socialLeverage":1},"flags":{"observer":true}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  15,
  'The Poster Is Gone',
  $$The seminar poster is gone. Only staple holes remain. You hear a rumor that it was moved to a private location.$$,
  $$[
    {"key":"ask_ra_poster","label":"Ask the RA.","costs":{"energy":1,"stress":1},"counters":{"anomaly_progress":1}},
    {"key":"ask_around_poster","label":"Ask around.","costs":{"energy":1},"rewards":{"socialLeverage":1,"knowledge":1}},
    {"key":"write_details_poster","label":"Write down the details.","costs":{"energy":1},"rewards":{"stress":-1},"flags":{"anomaly_note_002":true}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  16,
  'Three Doors',
  $$By the end of the week, three paths open. You can follow the seminar rumor, trace the phone log, or work the dorm network.$$,
  $$[
    {"key":"door_seminar","label":"Follow the seminar rumor.","next_step_index":17},
    {"key":"door_phone_log","label":"Trace the phone log.","next_step_index":21},
    {"key":"door_dorm_social","label":"Work the dorm network.","next_step_index":25}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  17,
  'The Whispered Room',
  $$A door is cracked open. The room beyond is quiet, a few chairs turned inward, voices low.$$,
  $$[
    {"key":"tag_along","label":"Tag along.","costs":{"socialLeverage":1},"counters":{"anomaly_progress":1}},
    {"key":"get_invited","label":"Try to get invited.","costs":{"energy":1},"rewards":{"knowledge":1}},
    {"key":"find_building","label":"Find the building yourself.","costs":{"energy":2,"stress":1},"rewards":{"knowledge":2}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  18,
  'The Invite That Is Not an Invite',
  $$An index card slides under your door: "8:30. Old Chapel Basement. Do not be late."$$,
  $$[
    {"key":"bring_roommate","label":"Bring your roommate.","costs":{"socialLeverage":1},"rewards":{"socialLeverage":1,"stress":-1}},
    {"key":"go_alone","label":"Go alone.","costs":{"stress":1},"counters":{"anomaly_progress":1}},
    {"key":"ask_ra_prank","label":"Ask the RA if it is a prank.","costs":{"energy":1,"socialLeverage":1},"rewards":{"knowledge":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  19,
  'Old Chapel Basement',
  $$Older students and a few adults sit in a circle. One voice resembles the caller. They talk about futures like they are concrete.$$,
  $$[
    {"key":"observe_room","label":"Observe.","costs":{"energy":1},"rewards":{"knowledge":2},"counters":{"anomaly_progress":1}},
    {"key":"ask_careful","label":"Ask a careful question.","costs":{"stress":1},"counters":{"anomaly_progress":2}},
    {"key":"leave_early","label":"Leave early.","rewards":{"stress":-1},"costs":{"socialLeverage":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  20,
  'The Handout',
  $$The reading list includes a title you know has not been published yet.$$,
  $$[
    {"key":"take_reading","label":"Take the list.","flags":{"salon_contact":true,"week3_hook_reading_list":true,"week3_ready":true},"skill_points":1,"next_step_index":999}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  21,
  'The Clipboard',
  $$The phone log is on a clipboard. It is plain. It is not for you.$$,
  $$[
    {"key":"ask_politely","label":"Ask politely.","costs":{"socialLeverage":1},"rewards":{"stress":-1}},
    {"key":"help_ra","label":"Help the RA.","costs":{"energy":1},"rewards":{"socialLeverage":1},"counters":{"ra_ally":1}},
    {"key":"sneak_look","label":"Sneak a look.","costs":{"stress":1},"rewards":{"knowledge":1},"counters":{"anomaly_progress":1,"risk_flag":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  22,
  'The Pattern',
  $$Your name appears in the log dated before you arrived. It is not your handwriting.$$,
  $$[
    {"key":"copy_entry","label":"Copy the entry.","costs":{"energy":1},"rewards":{"stress":-1},"flags":{"anomaly_note_003":true}},
    {"key":"ask_ra_about","label":"Ask the RA.","costs":{"stress":1,"socialLeverage":1},"counters":{"anomaly_progress":2}},
    {"key":"say_nothing","label":"Say nothing.","costs":{"stress":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  23,
  'The Missing Page',
  $$A page is torn out. The RA is defensive. The hallway is too quiet.$$,
  $$[
    {"key":"tell_ra","label":"Tell the RA someone is messing with the log.","costs":{"energy":1},"rewards":{"socialLeverage":1},"counters":{"ra_ally":1}},
    {"key":"accuse_ra","label":"Accuse the RA.","costs":{"socialLeverage":2},"counters":{"anomaly_progress":1}},
    {"key":"build_record","label":"Build a private record.","costs":{"energy":1},"rewards":{"knowledge":2,"stress":-1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  24,
  'The Return Call',
  $$The caller warns you: "Stop looking at the log. You are early. That is inconvenient."$$,
  $$[
    {"key":"hold_warning","label":"Hold the warning.","flags":{"week3_hook_log_reconstruction":true,"week3_ready":true},"skill_points":1,"next_step_index":999}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  25,
  'The Floor Economy',
  $$A floor lives or dies by who picks up the phone, who carries messages, who keeps their word.$$,
  $$[
    {"key":"be_reliable","label":"Become the reliable node.","costs":{"energy":1},"rewards":{"socialLeverage":2,"stress":-1}},
    {"key":"stay_private","label":"Stay private.","rewards":{"energy":1},"costs":{"socialLeverage":1}},
    {"key":"trade_reliability","label":"Trade reliability.","costs":{"socialLeverage":1},"rewards":{"cashOnHand":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  26,
  'The Owed Favor',
  $$Someone asks you to pass a message and not tell their roommate. The request is gentle. The stakes are not.$$,
  $$[
    {"key":"agree_favor","label":"Agree.","rewards":{"socialLeverage":2},"costs":{"stress":1}},
    {"key":"refuse_favor","label":"Refuse.","rewards":{"stress":-1},"costs":{"socialLeverage":1}},
    {"key":"ask_why","label":"Agree, but ask why.","costs":{"energy":1},"rewards":{"knowledge":1},"counters":{"anomaly_progress":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  27,
  'The Phone Run',
  $$After quiet hours, a coded caller says: "Package delayed." The message is not for you.$$,
  $$[
    {"key":"deliver_exactly","label":"Deliver it exactly.","rewards":{"socialLeverage":2},"counters":{"anomaly_progress":1}},
    {"key":"change_word","label":"Change one word.","rewards":{"stress":-1,"knowledge":1},"costs":{"socialLeverage":1}},
    {"key":"tell_ra","label":"Tell the RA.","costs":{"socialLeverage":2,"stress":1},"counters":{"ra_ally":1}}
  ]$$::jsonb
),
(
  'intro_phone_on_hall',
  28,
  'The Social Reveal',
  $$In the common room someone says, "Things happen around you. The dorm changes when you pay attention."$$,
  $$[
    {"key":"hold_map","label":"Hold the map.","flags":{"dorm_network_map":true,"week3_hook_dorm_network":true,"week3_ready":true},"skill_points":1,"next_step_index":999}
  ]$$::jsonb
)
on conflict (arc_key, step_index) do update
  set title = excluded.title,
      body = excluded.body,
      choices = excluded.choices;
