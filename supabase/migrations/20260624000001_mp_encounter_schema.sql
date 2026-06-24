-- MP-06: location-game schema + Merchant Row encounter (reframe-to-legitimize)
-- Idempotent (IF NOT EXISTS throughout; seed uses ON CONFLICT DO NOTHING).
--
-- Binary skill tiers (Arc One): player_skills.status = 'trained' = has skill.
-- No numeric level in Arc One. See docs/DECISIONS.md § MP-06 encounter.
--
-- Skill mapping for Merchant Row (deliberate — see DECISIONS.md):
--   insight_skill_id:  close_reading  (reading subtext behind stated objection)
--   turnout reframe:   active_listening (foot-traffic angle; split from insight
--                       so active_listening doesn't do double duty)
--   cultural reframe:  critical_analysis
--   prestige reframe:  creative_writing
--   trap option:       small_talk (own_the_fun — confirms the "too niche" fear)
--
-- Pressure math: trap → -base_con_pressure; other → base_pro + skill_amplifier
-- when trained. Low-skill players still get base_pro (skill amplifies, not gates).
--
-- Private-until-resolve: encounter pressure only applies at resolveRound.
-- The running player sees their resolve text immediately; no live pressure
-- leakage to other players during the active round. See DECISIONS.md § MP-06.

-- ─── mp_location_games ────────────────────────────────────────────────────────
-- One encounter definition per (event, location, kind). Options payload follows
-- the storylets.choices JSONB precedent: authored content in a single jsonb column.

CREATE TABLE IF NOT EXISTS public.mp_location_games (
  id               uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id         uuid NOT NULL REFERENCES public.mp_events(id)          ON DELETE CASCADE,
  location_id      uuid NOT NULL REFERENCES public.mp_event_locations(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('reframe_legitimize')),
  objection_text   text NOT NULL,
  insight_skill_id text REFERENCES public.skill_definitions(skill_id),
  insight_text     text,
  options          jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, location_id, kind)
);

ALTER TABLE public.mp_location_games ENABLE ROW LEVEL SECURITY;

-- Encounter definitions are publicly readable (no auth needed to see the game def).
CREATE POLICY mp_location_games_select
  ON public.mp_location_games FOR SELECT
  USING (true);

-- ─── mp_encounter_runs ────────────────────────────────────────────────────────
-- One row per (player, location, round). The UNIQUE constraint enforces the
-- one-run-per-player-per-round guard server-side (code also checks before insert).
-- pressure_contribution is signed: positive = pro, negative = con.

CREATE TABLE IF NOT EXISTS public.mp_encounter_runs (
  id                    uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id              uuid NOT NULL REFERENCES public.mp_events(id)          ON DELETE CASCADE,
  location_id           uuid NOT NULL REFERENCES public.mp_event_locations(id) ON DELETE CASCADE,
  player_id             uuid NOT NULL REFERENCES auth.users(id)               ON DELETE CASCADE,
  round_number          int  NOT NULL,
  option_id             text NOT NULL,
  pressure_contribution int  NOT NULL,
  resolved_text         text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, location_id, player_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_mp_encounter_runs_event_location_round
  ON public.mp_encounter_runs (event_id, location_id, round_number);

ALTER TABLE public.mp_encounter_runs ENABLE ROW LEVEL SECURITY;

-- Players see only their own runs (private-until-resolve design).
CREATE POLICY mp_encounter_runs_select_own
  ON public.mp_encounter_runs FOR SELECT
  USING (auth.uid() = player_id);

-- Direct insert is allowed for own rows; server uses service role for reliability.
CREATE POLICY mp_encounter_runs_insert_own
  ON public.mp_encounter_runs FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- ─── Seed: First Renfaire — Merchant Row ──────────────────────────────────────
-- event_id:    e0000000-0000-4000-a000-000000000001  (First Renfaire)
-- location_id: 1c000000-0000-4000-a000-000000000002  (Merchant Row)

INSERT INTO public.mp_location_games
  (event_id, location_id, kind, objection_text, insight_skill_id, insight_text, options)
VALUES (
  'e0000000-0000-4000-a000-000000000001'::uuid,
  '1c000000-0000-4000-a000-000000000002'::uuid,
  'reframe_legitimize',
  $obj$Who's going to show up to *that*? We're not closing early for a costume party that draws twenty people.$obj$,
  'close_reading',
  $ins$Behind the bluster you catch it — this isn't really about your event. Three booths down, the record store runs a midnight sale every semester and it barely breaks even. They're already bleeding foot traffic. You're a convenient target for a fear that was there before you walked in.$ins$,
  $opts$[
    {
      "id": "own_the_fun",
      "label": "Own the nerd pride",
      "body": "Tell them it's going to be a blast — knights, chain mail, people who take this stuff seriously. This is exactly the kind of niche you want if you're trying to be the cool local option.",
      "skill_key": "small_talk",
      "base_pro_pressure": 0,
      "base_con_pressure": 2,
      "is_trap": true,
      "skill_amplifier": 0,
      "resolve_base": "They smile, but it's the polite kind. *That's exactly what I mean*, one of them says, not unkindly. *It's not our crowd.* You've confirmed every concern they had.",
      "resolve_with_skill": "Your delivery lands — you're likable, and they can tell. But the content is the problem. They like you. They still won't budge."
    },
    {
      "id": "cultural_angle",
      "label": "Frame it as living history",
      "body": "The SCA doesn't just play dress-up — it's active scholarship. Medieval combat, period crafts, historical recreation. Harwick's humanities faculty have called it 'applied history.' That's not costume party energy. That's educational programming.",
      "skill_key": "critical_analysis",
      "base_pro_pressure": 2,
      "base_con_pressure": 0,
      "is_trap": false,
      "skill_amplifier": 1,
      "resolve_base": "They consider it. *Educational.* One merchant repeats it like she's testing the weight. You've given them a frame they can repeat to their own customers. You haven't converted them, but you've moved them.",
      "resolve_with_skill": "The specifics land. You mention the Arms and Armor vendor who tripled his weekend take at a comparable fair. Data beats story. You can see them doing the math."
    },
    {
      "id": "turnout_angle",
      "label": "Talk turnout, not theme",
      "body": "You're not asking them to love medieval recreation. You're asking them to be open at 10 AM on a Saturday when three hundred people will be on this street who weren't here last week. The theme is irrelevant. The foot traffic isn't.",
      "skill_key": "active_listening",
      "base_pro_pressure": 2,
      "base_con_pressure": 0,
      "is_trap": false,
      "skill_amplifier": 1,
      "resolve_base": "Basic and direct, but it works. One of them pulls out a calendar. You've been heard.",
      "resolve_with_skill": "You'd been listening — you knew the foot-traffic argument was the one they'd been waiting for someone to make. You make it, and the room shifts."
    },
    {
      "id": "prestige_angle",
      "label": "Name-drop the coverage angle",
      "body": "The Herald is doing a feature on the fair. Yearbook photos. The university puts events like this in alumni materials. Your booth in the background of the official Harwick Renfaire photos is not nothing.",
      "skill_key": "creative_writing",
      "base_pro_pressure": 1,
      "base_con_pressure": 0,
      "is_trap": false,
      "skill_amplifier": 1,
      "resolve_base": "It's a pitch. They've heard pitches. But *the Herald* gives it some weight — one of them jots something down. You've planted a seed.",
      "resolve_with_skill": "You make it concrete — not just 'coverage' but which angle the Herald will likely take, what kinds of images make alumni materials. They're nodding before you finish."
    }
  ]$opts$::jsonb
)
ON CONFLICT (event_id, location_id, kind) DO NOTHING;
