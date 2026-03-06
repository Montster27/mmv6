import { useQuery } from "@tanstack/react-query";

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
  });
}
