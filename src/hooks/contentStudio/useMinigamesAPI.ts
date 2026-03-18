import { useCallback, useState } from "react";

import { apiRequest } from "@/lib/contentStudio/apiClient";
import type { MinigameNode } from "@/types/minigame";

export function useMinigamesAPI() {
  const [minigameNodes, setMinigameNodes] = useState<MinigameNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMinigameNodes = useCallback(
    async (filters?: { arc_id?: string }) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.arc_id) params.set("arc_id", filters.arc_id);

      const url = `/api/admin/minigame-nodes${params.toString() ? `?${params.toString()}` : ""}`;
      const result = await apiRequest<{ minigameNodes: MinigameNode[] }>(url);

      setLoading(false);

      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }

      setMinigameNodes(result.data?.minigameNodes ?? []);
    },
    []
  );

  const saveMinigameNode = useCallback(
    async (node: MinigameNode): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(
        `/api/admin/minigame-nodes/${node.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: node.title,
            description: node.description,
            game_type: node.game_type,
            arc_id: node.arc_id,
            order_index: node.order_index,
            due_offset_days: node.due_offset_days,
            trigger_condition: node.trigger_condition,
            outcomes: node.outcomes,
            is_active: node.is_active,
          }),
        }
      );
      return { ok: result.ok, error: result.error };
    },
    []
  );

  const createMinigameNode = useCallback(
    async (
      data: Omit<MinigameNode, "id" | "created_at" | "updated_at">
    ): Promise<{ ok: boolean; error?: string; minigameNode?: MinigameNode }> => {
      const result = await apiRequest<{ minigameNode: MinigameNode }>(
        "/api/admin/minigame-nodes",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      return { ok: result.ok, error: result.error, minigameNode: result.data?.minigameNode };
    },
    []
  );

  const deleteMinigameNode = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(`/api/admin/minigame-nodes/${id}`, {
        method: "DELETE",
      });
      return { ok: result.ok, error: result.error };
    },
    []
  );

  return {
    minigameNodes,
    loading,
    error,
    loadMinigameNodes,
    saveMinigameNode,
    createMinigameNode,
    deleteMinigameNode,
  };
}
