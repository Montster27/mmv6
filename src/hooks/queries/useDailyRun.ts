import { useQuery } from "@tanstack/react-query";
import { getOrCreateDailyRun } from "@/core/engine/dailyLoop";

type DailyRunOptions = {
  experiments: Record<string, string>;
};

export function useDailyRun(
  userId: string | null,
  options: DailyRunOptions
) {
  return useQuery({
    queryKey: ["daily-run", userId],
    queryFn: () => {
      if (!userId) throw new Error("No userId");
      return getOrCreateDailyRun(userId, new Date(), options);
    },
    enabled: !!userId,
    staleTime: Infinity,
  });
}
