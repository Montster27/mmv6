import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/browser";
import type { PersonalRecap, WorldDriftRecap } from "@/types/recap";

type RecapResponse = {
  personal: PersonalRecap;
  world: WorldDriftRecap;
};

export function useSeasonRecap(seasonIndex: number | null) {
  return useQuery<RecapResponse>({
    queryKey: ["season-recap", seasonIndex],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in.");

      const params = seasonIndex ? `?season_index=${seasonIndex}` : "";
      const response = await fetch(`/api/season/recap${params}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load recap.");
      return (await response.json()) as RecapResponse;
    },
    enabled: seasonIndex !== undefined,
  });
}
