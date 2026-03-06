import { useCallback, useState } from "react";

import { apiRequest } from "@/lib/contentStudio/apiClient";
import type { ContentVersion } from "@/types/contentVersions";

export function useContentVersionsAPI() {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async (): Promise<ContentVersion[]> => {
    setLoading(true);
    setError(null);

    const result = await apiRequest<{ versions: ContentVersion[] }>(
      "/api/admin/content-versions"
    );

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? null);
      return [];
    }

    const rows = result.data?.versions ?? [];
    setVersions(rows);
    return rows;
  }, []);

  const publishContent = useCallback(
    async (
      note: string
    ): Promise<{ ok: true; versionId: string } | { ok: false; error?: string }> => {
      const result = await apiRequest<{ version_id: string }>(
        "/api/admin/content-versions",
        {
          method: "POST",
          body: JSON.stringify({ note }),
        }
      );

      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, versionId: result.data?.version_id ?? "" };
    },
    []
  );

  const rollbackVersion = useCallback(
    async (versionId: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await apiRequest("/api/admin/content-versions/rollback", {
        method: "POST",
        body: JSON.stringify({ version_id: versionId }),
      });
      return { ok: result.ok, error: result.error };
    },
    []
  );

  return {
    versions,
    loading,
    error,
    loadVersions,
    publishContent,
    rollbackVersion,
  };
}
