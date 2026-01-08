import type {
  Season as StoredSeason,
  UserSeason as StoredUserSeason,
} from "./seasons";

export type Season = Pick<StoredSeason, "season_index" | "starts_at" | "ends_at">;
export type UserSeason = StoredUserSeason;

export type SeasonContext = {
  currentSeason: Season;
  daysRemaining: number;
  userSeason: UserSeason;
};
