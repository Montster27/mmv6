import { useQuery } from "@tanstack/react-query";
import { fetchUserAnomalies, fetchAnomaliesByIds } from "@/lib/anomalies";
import type { Anomaly, UserAnomaly } from "@/types/anomalies";

type Clue = {
  id: string;
  from_display_name: string | null;
  anomaly_title: string | null;
  anomaly_description: string | null;
  created_at: string;
};

type JournalData = {
  entries: UserAnomaly[];
  catalog: Record<string, Anomaly>;
  clues: Clue[];
};

export function useJournalData(userId: string, accessToken: string) {
  return useQuery<JournalData>({
    queryKey: ["journal", userId],
    queryFn: async () => {
      const entries = await fetchUserAnomalies(userId);
      const ids = Array.from(new Set(entries.map((row) => row.anomaly_id)));
      const anomalies = await fetchAnomaliesByIds(ids);
      const catalog = anomalies.reduce<Record<string, Anomaly>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});

      const clueRes = await fetch("/api/group/clues/inbox", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      let clues: Clue[] = [];
      if (clueRes.ok) {
        const json = await clueRes.json();
        clues = json.clues ?? [];
      }

      return { entries, catalog, clues };
    },
    enabled: !!userId,
  });
}
