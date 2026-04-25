import { supabase } from "@/lib/supabase/browser";
import {
  DEFAULT_PLAYER_IDENTITY,
  type IdentityGender,
  type IdentityRace,
  type IdentitySexuality,
  type PlayerIdentity,
} from "@/types/identity";

type CharacterIdentityRow = {
  identity_race: string | null;
  identity_gender: string | null;
  identity_sexuality: string | null;
};

function normalizeRace(raw: unknown): IdentityRace {
  const v = typeof raw === "string" ? raw : "unspecified";
  return (
    [
      "white",
      "black",
      "asian",
      "latino",
      "south_asian",
      "mena",
      "multiracial",
      "other",
      "unspecified",
    ] as IdentityRace[]
  ).includes(v as IdentityRace)
    ? (v as IdentityRace)
    : "unspecified";
}

function normalizeGender(raw: unknown): IdentityGender {
  const v = typeof raw === "string" ? raw : "unspecified";
  return (["man", "woman", "nonbinary", "unspecified"] as IdentityGender[]).includes(
    v as IdentityGender
  )
    ? (v as IdentityGender)
    : "unspecified";
}

function normalizeSexuality(raw: unknown): IdentitySexuality {
  const v = typeof raw === "string" ? raw : "unspecified";
  return (
    [
      "straight",
      "gay",
      "bi",
      "questioning",
      "unspecified",
    ] as IdentitySexuality[]
  ).includes(v as IdentitySexuality)
    ? (v as IdentitySexuality)
    : "unspecified";
}

export function rowToPlayerIdentity(row: CharacterIdentityRow | null): PlayerIdentity {
  if (!row) return { ...DEFAULT_PLAYER_IDENTITY };
  return {
    race: normalizeRace(row.identity_race),
    gender: normalizeGender(row.identity_gender),
    sexuality: normalizeSexuality(row.identity_sexuality),
  };
}

export async function fetchPlayerIdentity(userId: string): Promise<PlayerIdentity> {
  const { data } = await supabase
    .from("characters")
    .select("identity_race,identity_gender,identity_sexuality")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return rowToPlayerIdentity(data as CharacterIdentityRow | null);
}

export async function saveCharacterIdentity(
  userId: string,
  identity: PlayerIdentity
): Promise<void> {
  const { error } = await supabase
    .from("characters")
    .update({
      identity_race: identity.race,
      identity_gender: identity.gender,
      identity_sexuality: identity.sexuality,
    })
    .eq("user_id", userId);
  if (error) {
    throw error;
  }
}

/**
 * Predicate helper: does the player's identity match any value in the list for
 * the given attribute? Used by storylet/node conditions (`condition.identity`).
 */
export function playerHasIdentity(
  identity: PlayerIdentity | null | undefined,
  attribute: "race" | "gender" | "sexuality",
  values: string[] | string
): boolean {
  if (!identity) return false;
  const candidates = Array.isArray(values) ? values : [values];
  const current =
    attribute === "race"
      ? identity.race
      : attribute === "gender"
        ? identity.gender
        : identity.sexuality;
  return candidates.includes(current);
}
