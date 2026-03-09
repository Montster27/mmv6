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

  const saveArcStep = useCallback(
    async (step: ArcStepRow): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(`/api/admin/arc-steps/${step.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: step.title,
          body: step.body,
          step_key: step.step_key,
          order_index: step.order_index,
          due_offset_days: step.due_offset_days,
          expires_after_days: step.expires_after_days,
          options: step.options,
        }),
      });
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

  const createArcDefinition = useCallback(
    async (
      data: Omit<ArcDefinitionRow, "id" | "created_at">
    ): Promise<{ ok: boolean; error?: string; arc?: ArcDefinitionRow }> => {
      const result = await apiRequest<{ arc: ArcDefinitionRow }>(
        "/api/admin/arc-definitions",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      return { ok: result.ok, error: result.error, arc: result.data?.arc };
    },
    []
  );

  const deleteArcDefinition = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(`/api/admin/arc-definitions/${id}`, {
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
    saveArcStep,
    deleteArcStep,
    createArcDefinition,
    deleteArcDefinition,
  };
}
