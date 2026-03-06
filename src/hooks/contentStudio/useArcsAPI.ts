import { useCallback, useState } from "react";

import { apiRequest } from "@/lib/contentStudio/apiClient";

export type ArcDefinitionRow = {
  id: string;
  key: string;
  title: string;
  description: string;
  tags: string[];
  is_enabled: boolean;
  created_at?: string;
};

export type ArcStepRow = {
  id: string;
  arc_id: string;
  step_key: string;
  order_index: number;
  title: string;
  body: string;
  options: unknown[];
  due_offset_days: number;
  expires_after_days: number;
};

export function useArcsAPI() {
  const [arcDefinitions, setArcDefinitions] = useState<ArcDefinitionRow[]>([]);
  const [arcDefinitionSteps, setArcDefinitionSteps] = useState<ArcStepRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArcDefinitions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [defsResult, stepsResult] = await Promise.all([
      apiRequest<{ arcs: ArcDefinitionRow[] }>("/api/admin/arc-definitions"),
      apiRequest<{ steps: ArcStepRow[] }>("/api/admin/arc-steps"),
    ]);

    setLoading(false);

    if (!defsResult.ok) {
      setError(defsResult.error ?? null);
      return;
    }
    if (!stepsResult.ok) {
      setError(stepsResult.error ?? null);
      return;
    }

    setArcDefinitions(defsResult.data?.arcs ?? []);
    setArcDefinitionSteps(stepsResult.data?.steps ?? []);
  }, []);

  const saveArcDefinition = useCallback(
    async (arc: ArcDefinitionRow): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(
        `/api/admin/arc-definitions/${arc.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: arc.title,
            description: arc.description,
            tags: arc.tags ?? [],
            is_enabled: arc.is_enabled,
          }),
        }
      );
      return { ok: result.ok, error: result.error };
    },
    []
  );

  const deleteArcStep = useCallback(
    async (stepId: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(`/api/admin/arc-steps/${stepId}`, {
        method: "DELETE",
      });
      return { ok: result.ok, error: result.error };
    },
    []
  );

  return {
    arcDefinitions,
    arcDefinitionSteps,
    loading,
    error,
    loadArcDefinitions,
    saveArcDefinition,
    deleteArcStep,
  };
}
