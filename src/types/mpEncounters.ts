// MP-06: location-game types for the reframe-to-legitimize encounter.
// Row shapes mirror supabase/migrations/20260624000001_mp_encounter_schema.sql.

export type ReframeOption = {
  id: string;
  label: string;
  body: string;
  skill_key: string | null;
  base_pro_pressure: number;
  base_con_pressure: number;
  is_trap: boolean;
  skill_amplifier: number;
  resolve_base: string;
  resolve_with_skill: string;
};

export type LocationGameDef = {
  id: string;
  event_id: string;
  location_id: string;
  kind: "reframe_legitimize";
  objection_text: string;
  insight_skill_id: string | null;
  insight_text: string | null;
  options: ReframeOption[];
};

// Encounter definition tailored to the caller's skills.
// Returned by GET /api/events/[id]/location/[locationId]/encounter.
export type EncounterView = {
  game: LocationGameDef;
  insight_unlocked: boolean;
  options_with_skill: Array<ReframeOption & { has_skill: boolean }>;
  already_run_this_round: boolean;
  my_run: EncounterRun | null;
};

// One player's completed run for a location-game in a round.
export type EncounterRun = {
  option_id: string;
  pressure_contribution: number;
  resolved_text: string;
  round_number: number;
};

// Returned by POST /api/events/[id]/location/[locationId]/encounter.
export type EncounterResult = {
  pressure_contribution: number;
  resolved_text: string;
};
