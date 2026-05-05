-- pay_phone_line — Phys-B RETROFIT: pay-phone line texture
--
-- Existing storylet (home track, Day 7 evening, due_offset_days=7).
-- Pure node-prepend retrofit: insert one ambient texture node before the
-- existing call-home content. No micro-choices. No flags. No events.
-- The smell of 1983 calling home — three guys ahead of you with rolls of
-- dimes, the kinked coiled cord, "look, MOM" through the receiver from
-- where you're standing. It frames the call that follows.
--
-- Brief: docs/PERIOD-FRICTION-CONTENT-BRIEF.md §"Phys-B"
-- Prose: docs/PERIOD-FRICTION-PROSE.md §"Day 7, Evening — Phys-B"

UPDATE public.storylets
SET
  nodes = $nodes$[
    {
      "id": "phone_line",
      "text": "The hallway phone is a payphone bolted to the wall between the lounge and the stairs. There's a line — three guys ahead of you, each working through their roll of dimes. The cord is the long coiled kind, kinked from being yanked into rooms. Whoever's on it now has been arguing for ten minutes; you can hear \"look, MOM\" through the receiver from where you're standing.",
      "next": "receiver_warm"
    },
    {
      "id": "receiver_warm",
      "text": "The receiver is warm in your hand. The dial tone hums. The alcove smells like the wall — old plaster and something that might be cigarette smoke that has been here since the seventies.",
      "micro_choices": [
        {
          "id": "call_home",
          "next": "mom_answers",
          "label": "Dial home",
          "sets_flag": "called_home_week2"
        },
        {
          "id": "call_pat",
          "next": "pat_out",
          "label": "Dial Pat at Ohio State",
          "sets_flag": "called_pat"
        },
        {
          "id": "hang_up_phone",
          "next": "walk_back",
          "label": "Put the receiver back",
          "sets_flag": "didnt_call"
        }
      ]
    },
    {
      "id": "mom_answers",
      "next": "choices",
      "text": "She picks up on the fourth ring. You talk for six minutes about nothing. She asks if you are eating. You say yes. She asks if you need anything. You say no. She tells you your father fixed the screen door and that Mrs. Bartoli's daughter is getting married. You say that is nice.\n\nWhen you hang up the receiver is warm from you now. The dial tone comes back like it was waiting."
    },
    {
      "id": "pat_out",
      "next": "choices",
      "text": "Pat's roommate answers. \"He's out.\" The roommate's voice is flat and far away — Columbus is a long-distance call and it sounds like it. You say tell him I called. The roommate says \"sure\" in a way that means he will not.\n\nYou hang up. The dime drops inside the phone with a small sound."
    },
    {
      "id": "walk_back",
      "next": "choices",
      "text": "You put the receiver back on the hook. The dial tone cuts off. You walk back down the hall past a door that has a Farrah Fawcett poster on it that has been there since 1978. The tape at the top corner has yellowed and the paper has a curl to it. Farrah's hair is eternal."
    }
  ]$nodes$::jsonb
WHERE slug = 'pay_phone_line';
