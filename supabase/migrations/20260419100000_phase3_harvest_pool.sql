-- ================================================================
-- Phase 3: Daily Harvest Pool — schema + 28 authored items
--
-- Creates:
--   harvest_items       — content catalog (dreams / letters / usenet)
--   harvest_seen        — per-player read log (prevents re-serving)
--   player_arc_flags    — arc-scoped flags (persist beyond walk / run)
--
-- Inserts 28 authored items from docs/harvest_templates_draft.md:
--   8 dreams, 6 letters, 14 usenet (8 texture + 6 investigation traces).
--
-- Design notes are kept as a column but NULLed for production inserts
-- per task spec (the editorial notes stay in the draft doc, not the DB).
--
-- Walk-flag scope: investigation traces use `gate_requires` and `sets_flag`
-- that reference arc-scoped flags stored in the new `player_arc_flags`
-- table. This is deliberately separate from the existing `sets_flag`
-- mechanism on storylet choices, which writes FLAG_SET events to
-- `choice_log` at track scope. Harvest traces need to persist for
-- Arc Two compound checks (three N. Voss sightings, Harwick mention,
-- etc.), so track-scoped storage is wrong.
--
-- Idempotent: IF NOT EXISTS on tables, ON CONFLICT DO NOTHING on inserts.
-- ================================================================


-- ============================================================
-- 1. harvest_items — authored content catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.harvest_items (
  slug            TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('dream', 'letter', 'usenet')),
  subtype         TEXT,
  day_min         INT,
  day_max         INT,
  gate_requires   TEXT,
  weight          INT NOT NULL DEFAULT 1 CHECK (weight > 0),
  body            TEXT NOT NULL,
  attribution     TEXT,
  sets_flag       TEXT,
  identity_tags   JSONB NOT NULL DEFAULT '[]'::jsonb,
  design_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS harvest_items_type_idx
  ON public.harvest_items (type);

CREATE INDEX IF NOT EXISTS harvest_items_gate_idx
  ON public.harvest_items (gate_requires)
  WHERE gate_requires IS NOT NULL;

CREATE INDEX IF NOT EXISTS harvest_items_day_idx
  ON public.harvest_items (day_min, day_max);

ALTER TABLE public.harvest_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'harvest_items' AND policyname = 'harvest_items_read'
  ) THEN
    CREATE POLICY harvest_items_read ON public.harvest_items
      FOR SELECT USING (true);
  END IF;
END $$;


-- ============================================================
-- 2. harvest_seen — per-player read log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.harvest_seen (
  player_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL REFERENCES public.harvest_items(slug) ON DELETE CASCADE,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, slug)
);

CREATE INDEX IF NOT EXISTS harvest_seen_player_idx
  ON public.harvest_seen (player_id);

ALTER TABLE public.harvest_seen ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'harvest_seen' AND policyname = 'harvest_seen_select_own'
  ) THEN
    CREATE POLICY harvest_seen_select_own ON public.harvest_seen
      FOR SELECT USING (player_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'harvest_seen' AND policyname = 'harvest_seen_insert_own'
  ) THEN
    CREATE POLICY harvest_seen_insert_own ON public.harvest_seen
      FOR INSERT WITH CHECK (player_id = auth.uid());
  END IF;
END $$;


-- ============================================================
-- 3. player_arc_flags — arc-scoped flags (persist across walks and runs)
-- ============================================================
-- Named "arc" to distinguish from track-scoped FLAG_SET events in
-- choice_log. Used for compound checks across arcs — e.g. three
-- N. Voss sightings from harvest traces unlocking an Arc Two beat.
CREATE TABLE IF NOT EXISTS public.player_arc_flags (
  player_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_name     TEXT NOT NULL,
  source_slug   TEXT,
  set_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, flag_name)
);

CREATE INDEX IF NOT EXISTS player_arc_flags_player_idx
  ON public.player_arc_flags (player_id);

ALTER TABLE public.player_arc_flags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_arc_flags' AND policyname = 'player_arc_flags_select_own'
  ) THEN
    CREATE POLICY player_arc_flags_select_own ON public.player_arc_flags
      FOR SELECT USING (player_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_arc_flags' AND policyname = 'player_arc_flags_insert_own'
  ) THEN
    CREATE POLICY player_arc_flags_insert_own ON public.player_arc_flags
      FOR INSERT WITH CHECK (player_id = auth.uid());
  END IF;
END $$;


-- ============================================================
-- 4. draw_harvest_item — weighted-random pool draw helper
-- ============================================================
-- One eligible item, weighted random, excluding already-seen.
-- Returns NULL when pool is empty for this player+day.
-- Caller enforces the "one per login session" rule.
CREATE OR REPLACE FUNCTION public.draw_harvest_item(
  p_player_id UUID,
  p_current_day INT
) RETURNS public.harvest_items AS $func$
DECLARE
  chosen public.harvest_items%ROWTYPE;
  total_weight INT;
BEGIN
  SELECT COALESCE(SUM(h.weight), 0) INTO total_weight
  FROM public.harvest_items h
  WHERE (h.day_min IS NULL OR h.day_min <= p_current_day)
    AND (h.day_max IS NULL OR p_current_day <= h.day_max)
    AND (
      h.gate_requires IS NULL
      OR EXISTS (
        SELECT 1 FROM public.player_arc_flags f
        WHERE f.player_id = p_player_id
          AND f.flag_name = h.gate_requires
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.harvest_seen s
      WHERE s.player_id = p_player_id
        AND s.slug = h.slug
    );

  IF total_weight = 0 THEN
    RETURN NULL;
  END IF;

  WITH eligible AS (
    SELECT h.*,
      SUM(h.weight) OVER (ORDER BY h.slug) AS running_total
    FROM public.harvest_items h
    WHERE (h.day_min IS NULL OR h.day_min <= p_current_day)
      AND (h.day_max IS NULL OR p_current_day <= h.day_max)
      AND (
        h.gate_requires IS NULL
        OR EXISTS (
          SELECT 1 FROM public.player_arc_flags f
          WHERE f.player_id = p_player_id
            AND f.flag_name = h.gate_requires
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.harvest_seen s
        WHERE s.player_id = p_player_id
          AND s.slug = h.slug
      )
  ),
  pick AS (
    SELECT (floor(random() * total_weight) + 1)::INT AS threshold
  )
  SELECT e.slug, e.type, e.subtype, e.day_min, e.day_max, e.gate_requires,
         e.weight, e.body, e.attribution, e.sets_flag, e.identity_tags,
         e.design_note, e.created_at
    INTO chosen
  FROM eligible e, pick p
  WHERE e.running_total >= p.threshold
  ORDER BY e.running_total ASC
  LIMIT 1;

  RETURN chosen;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. INSERT 28 authored items (design_note NULLed for production)
-- ============================================================

-- ── DREAMS (8) ──

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_001', 'dream', NULL, 1, NULL, NULL,
$body$You are late for something. The hallway is the right hallway — you're certain of it — but the door numbers are wrong, all of them, incrementing in an order that made sense a moment ago. Someone passes you going the other way and you almost say their name. You don't know their name. The carpet is the same industrial blue as this building. You wake up before you find the room.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_002', 'dream', NULL, 1, 14, NULL,
$body$Your mother is talking but you can't hear her through the car window. She's on the other side of the glass, still in the parking lot where she dropped you off, and her mouth is moving with something important. You put your hand up. She puts her hand up. The car isn't yours — it belongs to someone you haven't met yet. You understand this in the dream as a fact, not a question.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_003', 'dream', NULL, 3, NULL, NULL,
$body$The quad in winter. Snow on the brick. You know exactly how cold it is without feeling it. There are people you recognize from years from now, their faces aged correctly, wearing their 1990s clothes. They aren't surprised to see you. One of them waves like you're a neighbor. You wave back. When you wake up you can't remember which one waved, only that it was someone you trust.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_004', 'dream', NULL, 2, NULL, NULL,
$body$A phone ringing in an empty room. You answer it and it's your own voice on the other end, saying something you can't make out — not a bad connection, just words arriving in the wrong order. You listen until the call drops. The phone is not a phone you recognize. The room has a window and outside is a city you have visited, or will visit, or both.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_005', 'dream', NULL, 5, NULL, NULL,
$body$You are explaining something to a group of people sitting in a circle. You don't know what you're explaining but you can feel the shape of it — something about time, or sequence, or which things happen before which other things. The people in the circle are nodding. One of them writes something down. You think: they believe me. Then the dream shifts and you're in a dining hall and you can't remember what you were explaining, only that it mattered.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_006', 'dream', NULL, 1, NULL, NULL,
$body$Your old bedroom, but emptied out. Not cleaned out — emptied, like it was never yours. The walls are the right color. The window faces the right direction. But the desk is someone else's desk and there are clothes in the closet that don't fit anyone in your family. You open a drawer and inside is a photograph you don't recognize of people you don't know standing in front of a building you will walk past tomorrow.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_007', 'dream', NULL, 7, NULL, NULL,
$body$You're reading something — a letter, a printout, a page of something — and you can read every word but the meaning won't assemble. You read the same paragraph four times. The fifth time it becomes clear for one second, the way a word stops looking like itself when you stare too long, and then it's gone. You fold the paper carefully. You put it somewhere safe. You wake up before you can check where you put it.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_dream_008', 'dream', NULL, 10, NULL, NULL,
$body$Glenn is sitting on the bench and you are standing in front of him, which is how it happened except in the dream you are the one who speaks first. You say something direct. He listens. He says: that's the right question, I don't know the answer to that one. You believe him, which surprises you. The bench is wet from rain that isn't falling. You sit down anyway. Neither of you says anything else. It doesn't feel unfinished.$body$,
NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;


-- ── LETTERS (6) ──

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_letter_mom_001', 'letter', 'parent_mom', 3, 14, NULL,
$body$Dear —

I hope you're settling in okay. I've been meaning to write since Sunday but your father had a thing with the Johnsons and then the hot water heater acted up again so this is the first quiet moment I've had. Did you get the extra checks I put in your bag? Don't cash them both at once, just in case.

Your room feels very quiet. I don't say that to make you feel bad — I just notice it. The cat has started sleeping in the doorway, which she never did before, which I think means she's confused. Animals don't understand logistics.

Call on Sunday if you can get to the phone. Before eight, your father goes to bed early now, I don't know why, he won't say. We love you. Don't eat the dining hall food every single day if you can help it.

Love, Mom$body$,
'Mom', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_letter_dad_001', 'letter', 'parent_dad', 5, 21, NULL,
$body$—

Your mother says you haven't called. I told her you're busy getting settled, which is what you should be doing. Don't worry about us.

Work is the same. Jenkins got the promotion, which was expected. I'm not bitter about it, just noting. You'll understand when you're older how much of life is watching the wrong people get the right things and deciding what to do with that.

Anyway. Study hard. Make friends but don't be an idiot about it. You're smarter than most of the people you'll meet — try not to let them know that right away. It makes things harder.

— Dad

P.S. Your mother wants me to say we're proud of you. We are.$body$,
'Dad', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_letter_friend_001', 'letter', 'hometown_friend', 4, 18, NULL,
$body$Hey —

So how is it? Is it what you thought? I keep picturing you there and I can't make it look real in my head, like I can picture the buildings from the brochure but I can't picture you actually IN them, you know?

Things here are fine. Working at the Sunoco until I figure out what I'm doing, which my mom says I need to do faster. Saw Debbie at the mall last week, she's at county now, she seems okay. Eric got a job in Pittsburgh which is kind of insane if you think about it, Eric in Pittsburgh.

I'm not jealous or anything. I just want you to know it's weird here without you, or without whoever you're going to be now. Does that make sense? Like I know you'll come back different and that's probably fine but it's still weird to think about. Anyway. Write back if you get a second.

— [name]$body$,
'[hometown friend]', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_letter_sibling_001', 'letter', 'sibling', 6, 21, NULL,
$body$ok so mom is being SO weird now that you're gone, like she keeps coming in my room to "check in" which she never did when you were here. I think she's practicing on me. It's annoying.

also I have your room now. don't freak out, I'm not touching your stuff, your stuff is in boxes in the corner. but my room is so much bigger, I didn't realize how much bigger it was. I moved my desk to where your bed was and now I can see the whole backyard from it. it's actually really good.

dad said I could have the stereo on weekends if I do the yard. I said yes before I thought about it. anyway.

are you coming home for Thanksgiving? mom won't say if you are or not.

— [sibling name]$body$,
'[younger sibling]', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_letter_grandparent_001', 'letter', 'grandparent', 7, 28, NULL,
$body$My dear —

Your grandfather and I have been thinking of you since the news came that you'd arrived safely. Your mother called, which she is good about. In our day we would have sent a telegram but I understand that is not done anymore.

I want to tell you something I wish someone had told me at your age, though I'm not sure you'll understand it yet, which is fine — store it somewhere and take it out later. The thing about being young is that you think the person you are right now is the person you will be. You won't be. I have been five or six different people in my life and I am friends with all of them, more or less. Don't be too loyal to whoever you are this year.

Enclosed is twenty dollars. Buy yourself something that isn't food.

All my love, Grandma [name]$body$,
'Grandma [name]', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_letter_teacher_001', 'letter', 'mentor', 8, 28, NULL,
$body$Dear —

I hope this finds you well and in the thick of things. I heard from your mother at the school board meeting — small town, you remember — that you made it safely and are getting settled.

I won't take much of your time. I only wanted to say that of the students I've had in twelve years, you are one of perhaps four that I think about sometimes and wonder what they'll do with it. That's not a burden I'm giving you. It's just a fact. Do with it what you like.

If you find yourself needing someone to think out loud with who isn't going to tell your parents what you said, you know where to write. I'm not going anywhere.

Best,
[Teacher name]$body$,
'[Teacher name]', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;


-- ── USENET TEXTURE POSTS (8) ──

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_001', 'usenet', 'texture', 1, NULL, NULL,
$body$Newsgroup: net.college
Date: Fri, 02 Sep 1983 14:22:07 -0500
From: pklein@umich.edu (P. Klein)
Subject: first week

Anyone else find the dining hall situation untenable? I have been here
five days and eaten scrambled eggs for four of them. There must be a
better option within walking distance. Responses appreciated.

--
P. Klein, Ann Arbor$body$,
'pklein @ net.college', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_002', 'usenet', 'texture', 2, NULL, NULL,
$body$Newsgroup: net.music
Date: Sat, 03 Sep 1983 09:14:51 -0500
From: rwalsh@mit.edu (R. Walsh)
Subject: Re: The Police - Synchronicity (was: overrated?)

> The first side is unimpeachable. The second side is them disappearing
> up their own ambitions. This is not a controversial statement.

Strong disagree. "Tea in the Sahara" alone justifies the runtime.
The problem with people who call things "overrated" is that they
mistake familiarity for exhaustion.

--
rwalsh$body$,
'rwalsh @ net.music', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_003', 'usenet', 'texture', 3, NULL, NULL,
$body$Newsgroup: net.general
Date: Sun, 04 Sep 1983 21:08:33 -0500
From: fcampbell@purdue.edu (F. Campbell)
Subject: new to the network

Hello. I am a junior at Purdue in electrical engineering and a friend
showed me how to use this. I'm not sure what the etiquette is. Is
there a particular place to introduce yourself or do you just start
talking? Apologies if this is the wrong group.

F. Campbell$body$,
'fcampbell @ net.general', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_004', 'usenet', 'texture', 4, NULL, NULL,
$body$Newsgroup: net.college
Date: Mon, 05 Sep 1983 16:44:17 -0500
From: sbauer@ohio-state.edu (S. Bauer)
Subject: roommate situation (no advice needed, just venting)

My roommate has informed me that he plans to practice trumpet between
10pm and midnight because "that is when inspiration strikes." He is
not, as far as I can tell, joking. I have filed a housing complaint.
The housing office has suggested I "work it out between yourselves."
I am posting this so that there is a record somewhere that I tried.

S. Bauer, Columbus$body$,
'sbauer @ net.college', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_005', 'usenet', 'texture', 5, NULL, NULL,
$body$Newsgroup: net.politics
Date: Tue, 06 Sep 1983 11:23:04 -0500
From: dmorrow@uchicago.edu (D. Morrow)
Subject: KAL 007 / what are we supposed to think

I don't know what the right response is to this week's news and I
suspect most of us don't. The administration is framing it one way,
the Soviets another. In between there are 269 people who are dead
and a lot of confident voices explaining why. I am not confident.
I am a 20-year-old in a library in Chicago and I am not confident
about any of this.

Does anyone else feel like the correct reaction is just quiet?

D. Morrow$body$,
'dmorrow @ net.politics', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_006', 'usenet', 'texture', 6, NULL, NULL,
$body$Newsgroup: net.rec
Date: Wed, 07 Sep 1983 18:55:40 -0500
From: lortega@nyu.edu (L. Ortega)
Subject: anyone going to the Patti Smith thing in October

Checking if there's interest in coordinating travel from the city
for the October show. I have a car that fits four if people want
to split gas. Not looking for money up front, just commitment.
Reply here or to my address directly.

L. Ortega, New York$body$,
'lortega @ net.rec', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_007', 'usenet', 'texture', 8, NULL, NULL,
$body$Newsgroup: net.college
Date: Fri, 09 Sep 1983 20:11:28 -0500
From: tgreene@cornell.edu (T. Greene)
Subject: Re: Re: Re: study strategies (long)

I want to push back on the "read everything twice" advice that keeps
circulating here. Reading everything twice is a strategy for people
who have infinite time, which none of us do. Better to read the hard
thing once carefully than the easy thing twice. That is all.

T. Greene$body$,
'tgreene @ net.college', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_texture_008', 'usenet', 'texture', 9, NULL, NULL,
$body$Newsgroup: net.social
Date: Sat, 10 Sep 1983 13:07:55 -0500
From: anonymous (via net relay)
Subject: question about loneliness (please be kind)

I've been at school for two weeks and I haven't made a real friend yet.
I have acquaintances. I can have conversations. But I go back to my room
at night and there is no one I would call. I don't know if this is
normal or if something is wrong with me specifically. I'm not looking
for advice, I just wanted to say it somewhere.

[anon]$body$,
'anonymous @ net.social', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;


-- ── USENET INVESTIGATION TRACES (6) — gated by terminal_accessed ──

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_trace_001', 'usenet', 'trace', 4, NULL, 'terminal_accessed',
$body$Newsgroup: net.misc
Date: Mon, 05 Sep 1983 08:34:12 -0500
From: nv_observer@arpa (N. Voss)
Subject: pattern recognition in repeated events

I'm working on something for a cognitive science seminar and I'd like
to hear from people who have had the following experience: a strong
sense of having been in a specific situation before, not as a feeling
but as a certainty. Not déjà vu in the colloquial sense — more like
structural recognition. You don't just feel you've been here. You know
the sequence of what happens next.

If this resonates, reply or post to net.sci.psych. I am compiling
responses for research purposes.

-- N. Voss$body$,
'nv_observer @ net.misc', 'saw_trace_username_NV', NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_trace_002', 'usenet', 'trace', 6, NULL, 'terminal_accessed',
$body$Newsgroup: net.sports
Date: Wed, 07 Sep 1983 22:18:04 -0500
From: stathead_77@bu.edu (unknown)
Subject: preseason prediction thread — baseball

Posting my AL East predictions for the record before the end of
the season makes them useless. I want to be accountable to something.

Baltimore takes the division. Not close. Weaver or no Weaver,
this is their year. Anyone who's watched the second half knows it.

Posting this now, not in October. Hold me to it.

-- stathead_77$body$,
'stathead_77 @ net.sports', 'saw_trace_sports_anomaly', NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_trace_003', 'usenet', 'trace', 8, NULL, 'terminal_accessed',
$body$Newsgroup: net.philosophy
Date: Thu, 08 Sep 1983 14:50:29 -0500
From: nv_observer@arpa (N. Voss)
Subject: Re: determinism and decision (was: free will in closed systems)

> If the future is fixed, choice is illusion.

This is the wrong frame. The question is not whether the future is
fixed but whether it is fixed *for you*. Information asymmetry is
not the same as determinism. Knowing more than the room doesn't mean
the room isn't real.

I'm not being abstract. I mean this practically. Act accordingly.

-- N. Voss$body$,
'nv_observer @ net.philosophy', 'saw_trace_arc_terminology', NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_trace_004', 'usenet', 'trace', 10, NULL, 'terminal_accessed',
$body$Newsgroup: net.misc
Date: Sat, 10 Sep 1983 09:41:17 -0500
From: quiet_ones_84@relay.arpa (unknown)
Subject: [no subject]

If you found this looking for what I think you're looking for:
yes. You're not the only one. Don't post back here. I won't see it.
Find the thread from August in net.sci.psych. The username that
asked about sequence recognition. That's the place to start.

That's all I can say here.$body$,
'quiet_ones_84 @ net.misc', 'saw_trace_contact_signal', NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_trace_005', 'usenet', 'trace', 12, NULL, 'terminal_accessed',
$body$Newsgroup: net.college
Date: Mon, 12 Sep 1983 17:23:55 -0500
From: mbrennan@umass.edu (M. Brennan)
Subject: Re: small schools — worth it?

> I ended up at a school nobody's heard of, Harwick University, and
> I wonder sometimes if I made the wrong call.

I don't know Harwick specifically but I know the type. Honest answer:
the school matters less than you think in the first two years. It's
all local. The people in your building, the professors you find,
the habits you form. National context comes later if it comes at all.

-- M. Brennan

> [Original message from: unknown@harwick.edu]$body$,
'mbrennan @ net.college', 'saw_trace_harwick_mention', NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.harvest_items (slug, type, subtype, day_min, day_max, gate_requires, body, attribution, sets_flag, design_note)
VALUES ('harvest_usenet_trace_006', 'usenet', 'trace', 14, NULL, 'terminal_accessed',
$body$Newsgroup: net.sci.psych
Date: Wed, 14 Sep 1983 11:06:44 -0500
From: nv_observer@arpa (N. Voss)
Subject: closing this thread

I've gotten more responses than I expected to my earlier post about
structural recognition. I'm not going to reply to all of them — I want
to be careful about who I talk to directly until I understand the shape
of things better.

To the person at the smaller school in the northeast who wrote to me
privately: I got your message. I'm not ready to respond yet. Please
be patient. Don't do anything that can't be undone.

-- N. Voss$body$,
'nv_observer @ net.sci.psych', 'saw_trace_nv_three', NULL)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- DROP FUNCTION IF EXISTS public.draw_harvest_item(UUID, INT);
-- DROP TABLE IF EXISTS public.player_arc_flags;
-- DROP TABLE IF EXISTS public.harvest_seen;
-- DROP TABLE IF EXISTS public.harvest_items;
