import { supabase } from "@/lib/supabase/browser";
import { appendGroupFeedEvent } from "@/lib/groups/feed";
import type { Anomaly, UserAnomaly } from "@/types/anomalies";

export async function fetchAnomaliesByIds(ids: string[]): Promise<Anomaly[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("anomalies")
    .select("id,title,description,severity,created_at")
    .in("id", ids);

  if (error) {
    console.error("Failed to fetch anomalies", error);
    return [];
  }

  return data ?? [];
}

export async function fetchUserAnomalies(userId: string): Promise<UserAnomaly[]> {
  const { data, error } = await supabase
    .from("user_anomalies")
    .select("anomaly_id,day_index,discovered_at,source")
    .eq("user_id", userId)
    .order("discovered_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user anomalies", error);
    return [];
  }

  return data ?? [];
}

export async function awardAnomalies(payload: {
  userId: string;
  anomalyIds: string[];
  dayIndex: number;
  source?: string | null;
}): Promise<void> {
  if (!payload.anomalyIds.length) return;

  for (const anomalyId of payload.anomalyIds) {
    try {
      const { error } = await supabase.from("user_anomalies").upsert(
        {
          user_id: payload.userId,
          anomaly_id: anomalyId,
          day_index: payload.dayIndex,
          source: payload.source ?? null,
        },
        { onConflict: "user_id,anomaly_id", ignoreDuplicates: true }
      );
      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to award anomaly", error);
        }
      } else {
        appendGroupFeedEvent(payload.userId, "anomaly_found", {
          anomaly_id: anomalyId,
          source: payload.source ?? null,
        }).catch(() => {});
        import("@/lib/groups/objective")
          .then((mod) => mod.incrementGroupObjective(2, "anomaly_found"))
          .catch(() => {});
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to award anomaly", err);
      }
    }
  }
}
