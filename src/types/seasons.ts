import type { JsonObject } from "./vectors";

export type Season = {
  id?: string;
  season_index: number;
  starts_at: string;
  ends_at: string;
};

export type SeasonRecap = {
  lastSeasonIndex: number;
  anomaliesFoundCount: number;
  hypothesesCount: number;
  topVector?: string | null;
};

export type UserSeason = {
  id: string;
  user_id: string;
  current_season_index: number;
  last_seen_season_index: number;
  last_reset_at?: string | null;
  last_recap?: SeasonRecap | JsonObject | null;
  created_at: string;
  updated_at: string;
};
