import { useCallback, useState } from "react";

import { apiRequest } from "@/lib/contentStudio/apiClient";
import type { DelayedConsequenceRule } from "@/types/consequences";

export function useConsequencesAPI() {
  const [rules, setRules] = useState<DelayedConsequenceRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async (): Promise<DelayedConsequenceRule[]> => {
    setLoading(true);
    setError(null);

    const result = await apiRequest<{ rules: DelayedConsequenceRule[] }>(
      "/api/admin/consequences"
    );

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? null);
      return [];
    }

    const rows = result.data?.rules ?? [];
    setRules(rows);
    return rows;
  }, []);

  const saveRule = useCallback(
    async (
      rule: DelayedConsequenceRule,
      isNew: boolean
    ): Promise<{ ok: boolean; error?: string }> => {
      const url = isNew
        ? "/api/admin/consequences"
        : `/api/admin/consequences/${rule.key}`;

      const result = await apiRequest(url, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(rule),
      });

      return { ok: result.ok, error: result.error };
    },
    []
  );

  const deleteRule = useCallback(
    async (key: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest(`/api/admin/consequences/${key}`, {
        method: "DELETE",
      });
      return { ok: result.ok, error: result.error };
    },
    []
  );

  return { rules, setRules, loading, error, loadRules, saveRule, deleteRule };
}
