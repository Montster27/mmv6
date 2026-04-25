/**
 * Player identity types for period-friction beat variance.
 *
 * Values mirror the CHECK constraints in
 * supabase/migrations/20260424200000_player_identity_columns.sql.
 *
 * `unspecified` is always a valid, explicit choice — not a missing value.
 * Content treats it as the default 1983-dorm perspective.
 */

export type IdentityRace =
  | "white"
  | "black"
  | "asian"
  | "latino"
  | "south_asian"
  | "mena"
  | "multiracial"
  | "other"
  | "unspecified";

export type IdentityGender = "man" | "woman" | "nonbinary" | "unspecified";

export type IdentitySexuality =
  | "straight"
  | "gay"
  | "bi"
  | "questioning"
  | "unspecified";

export type PlayerIdentity = {
  race: IdentityRace;
  gender: IdentityGender;
  sexuality: IdentitySexuality;
};

export const DEFAULT_PLAYER_IDENTITY: PlayerIdentity = {
  race: "unspecified",
  gender: "unspecified",
  sexuality: "unspecified",
};

export const IDENTITY_RACE_VALUES: IdentityRace[] = [
  "unspecified",
  "white",
  "black",
  "asian",
  "latino",
  "south_asian",
  "mena",
  "multiracial",
  "other",
];

export const IDENTITY_GENDER_VALUES: IdentityGender[] = [
  "unspecified",
  "man",
  "woman",
  "nonbinary",
];

export const IDENTITY_SEXUALITY_VALUES: IdentitySexuality[] = [
  "unspecified",
  "straight",
  "gay",
  "bi",
  "questioning",
];

export const IDENTITY_RACE_LABELS: Record<IdentityRace, string> = {
  unspecified: "Unspecified",
  white: "White",
  black: "Black",
  asian: "Asian (East / Southeast)",
  latino: "Latino / Hispanic",
  south_asian: "South Asian",
  mena: "Middle Eastern / North African",
  multiracial: "Multiracial",
  other: "Other",
};

export const IDENTITY_GENDER_LABELS: Record<IdentityGender, string> = {
  unspecified: "Unspecified",
  man: "Man",
  woman: "Woman",
  nonbinary: "Nonbinary",
};

export const IDENTITY_SEXUALITY_LABELS: Record<IdentitySexuality, string> = {
  unspecified: "Unspecified",
  straight: "Straight",
  gay: "Gay / Lesbian",
  bi: "Bisexual",
  questioning: "Questioning",
};
