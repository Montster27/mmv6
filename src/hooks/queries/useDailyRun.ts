import { keepPreviousData, useQuery } from "@tanstack/react-query";

type DailyRunOptions = {
  experiments: Record<string, string>;
  isAdmin?: boolean;
  enabled?: boolean;
  refreshKey?: number;
};

export function useDailyRun(
  userId: string | null,
  options: DailyRunOptions
) {
  return useQuery({
    queryKey: ["daily-run", userId, options.refreshKey],
    queryFn: async () => {
      if (!userId) throw new Error("No userId");
      const { getOrCreateDailyRun } = await import("@/core/engine/dailyLoop");
      return getOrCreateDailyRun(userId, new Date(), {
        experiments: options.experiments,
        isAdmin: options.isAdmin,
      });
    },
    enabled: options.enabled ?? !!userId,
    staleTime: Infinity,
    // Keep previous data while a new queryKey (refreshTick change) is loading.
    // Without this, data becomes undefined between refreshes, which triggers the
    // useEffect that clears resolvedTrackStoryletIds — creating a render window
    // where a just-resolved storylet card can flash back with choice buttons.
    placeholderData: keepPreviousData,
  });
}
