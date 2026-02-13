import { useQuery } from "@tanstack/react-query";
import { listHypotheses, listHypothesisAnomalies } from "@/lib/hypotheses";
import type { Hypothesis } from "@/types/hypotheses";

type TheoryData = {
  hypotheses: Hypothesis[];
  counts: Record<string, number>;
};

export function useTheoryData(userId: string) {
  return useQuery<TheoryData>({
    queryKey: ["theory", userId],
    queryFn: async () => {
      const hypotheses = await listHypotheses(userId);
      const counts: Record<string, number> = {};
      await Promise.all(
        hypotheses.map(async (item) => {
          const links = await listHypothesisAnomalies(item.id);
          counts[item.id] = links.length;
        })
      );
      return { hypotheses, counts };
    },
    enabled: !!userId,
  });
}
