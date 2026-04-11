"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import type { SkillDefinition, PlayerSkill } from "@/types/skills";

interface SkillQueueState {
  definitions: SkillDefinition[];
  playerSkills: PlayerSkill[];
  justCompleted: string[];
  loading: boolean;
  error: string | null;
}

export function useSkillQueue() {
  const session = useSession();
  const [state, setState] = useState<SkillQueueState>({
    definitions: [],
    playerSkills: [],
    justCompleted: [],
    loading: true,
    error: null,
  });

  const token = session.access_token;

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/skill-queue", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState((s) => ({ ...s, loading: false, error: body.error ?? "Failed to load" }));
        return;
      }
      const data = await res.json();
      setState({
        definitions: data.definitions ?? [],
        playerSkills: data.playerSkills ?? [],
        justCompleted: data.justCompleted ?? [],
        loading: false,
        error: null,
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Network error" }));
    }
  }, [token]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const trainSkill = useCallback(
    async (skillId: string) => {
      setState((s) => ({ ...s, error: null }));
      const res = await fetch("/api/skill-queue/train", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState((s) => ({ ...s, error: data.error ?? "Failed to train" }));
        return false;
      }
      // Refresh full state
      await fetchState();
      return true;
    },
    [token, fetchState]
  );

  const cancelQueued = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    const res = await fetch("/api/skill-queue/cancel", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setState((s) => ({ ...s, error: data.error ?? "Failed to cancel" }));
      return false;
    }
    await fetchState();
    return true;
  }, [token, fetchState]);

  // Derived helpers
  const active = state.playerSkills.find((s) => s.status === "active") ?? null;
  const queued = state.playerSkills.find((s) => s.status === "queued") ?? null;
  const trained = state.playerSkills.filter((s) => s.status === "trained");
  const availableToTrain = state.definitions.filter(
    (d) => !state.playerSkills.some((ps) => ps.skill_id === d.skill_id)
  );

  return {
    ...state,
    active,
    queued,
    trained,
    availableToTrain,
    trainSkill,
    cancelQueued,
    refresh: fetchState,
  };
}
