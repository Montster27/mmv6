import { useQuery } from "@tanstack/react-query";
import { getOrCreateDailyRun } from "@/core/engine/dailyLoop";

type DailyRunOptions = {
  experiments: Record<string, string>;
  microtaskVariant?: string;
  isAdmin?: boolean;
  enabled?: boolean;
  refreshKey?: number;
};

export function useDailyRun(
  userId: string | null,
  options: DailyRunOptions
) {
  return useQuery({
    queryKey: ["daily-run", userId, options.microtaskVariant, options.refreshKey],
    queryFn: () => {
      if (!userId) throw new Error("No userId");
      return getOrCreateDailyRun(userId, new Date(), {
        experiments: options.experiments,
        microtaskVariant: options.microtaskVariant,
        isAdmin: options.isAdmin,
      });
    },
    enabled: options.enabled ?? !!userId,
    staleTime: Infinity,
  });
}
