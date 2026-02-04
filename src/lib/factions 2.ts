import { supabase } from "@/lib/supabase/browser";
import type { Faction, FactionKey } from "@/types/factions";

export const FACTION_KEYS: FactionKey[] = [
  "neo_assyrian",
  "dynastic_consortium",
  "templar_remnant",
  "bormann_network",
];

export async function listFactions(): Promise<Faction[]> {
  const { data, error } = await supabase
    .from("factions")
    .select("key,name,ideology,aesthetic,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load factions", error);
    throw new Error("Failed to load factions.");
  }

  return data ?? [];
}
