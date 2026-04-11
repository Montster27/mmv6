/**
 * Skill queue engine — pure functions (state in, state out).
 *
 * Phase 1 rules enforced here:
 *   - At most 1 active skill per user
 *   - At most 1 queued skill per user
 *   - No cancellation of active skills
 *   - No decay, acceleration, or pay-to-speed
 */

import type { PlayerSkill, TickResult } from "@/types/skills";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findByStatus(
  skills: PlayerSkill[],
  status: PlayerSkill["status"]
): PlayerSkill | undefined {
  return skills.find((s) => s.status === status);
}

function replaceSkill(
  skills: PlayerSkill[],
  skillId: string,
  patch: Partial<PlayerSkill>
): PlayerSkill[] {
  return skills.map((s) =>
    s.skill_id === skillId ? { ...s, ...patch } : s
  );
}

// ---------------------------------------------------------------------------
// startTraining
// ---------------------------------------------------------------------------

export function startTraining(
  playerSkills: PlayerSkill[],
  skillId: string,
  baseTrainSeconds: number,
  now: Date
): { ok: true; newState: PlayerSkill[] } | { ok: false; error: string } {
  if (findByStatus(playerSkills, "active")) {
    return { ok: false, error: "Another skill is already active." };
  }

  const existing = playerSkills.find((s) => s.skill_id === skillId);
  if (existing?.status === "trained") {
    return { ok: false, error: "Skill is already trained." };
  }
  if (existing?.status === "active") {
    return { ok: false, error: "Skill is already active." };
  }

  const completesAt = new Date(now.getTime() + baseTrainSeconds * 1000);
  const nowISO = now.toISOString();
  const completesISO = completesAt.toISOString();

  if (existing) {
    return {
      ok: true,
      newState: replaceSkill(playerSkills, skillId, {
        status: "active",
        started_at: nowISO,
        completes_at: completesISO,
      }),
    };
  }

  // New entry
  return {
    ok: true,
    newState: [
      ...playerSkills,
      {
        user_id: playerSkills[0]?.user_id ?? "",
        skill_id: skillId,
        status: "active" as const,
        started_at: nowISO,
        completes_at: completesISO,
        trained_at: null,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// queueNext
// ---------------------------------------------------------------------------

export function queueNext(
  playerSkills: PlayerSkill[],
  skillId: string
): { ok: true; newState: PlayerSkill[] } | { ok: false; error: string } {
  if (findByStatus(playerSkills, "queued")) {
    return { ok: false, error: "Another skill is already queued." };
  }

  const existing = playerSkills.find((s) => s.skill_id === skillId);
  if (existing?.status === "trained") {
    return { ok: false, error: "Skill is already trained." };
  }
  if (existing?.status === "active") {
    return { ok: false, error: "Skill is already active." };
  }

  if (existing) {
    return {
      ok: true,
      newState: replaceSkill(playerSkills, skillId, {
        status: "queued",
        started_at: null,
        completes_at: null,
      }),
    };
  }

  return {
    ok: true,
    newState: [
      ...playerSkills,
      {
        user_id: playerSkills[0]?.user_id ?? "",
        skill_id: skillId,
        status: "queued" as const,
        started_at: null,
        completes_at: null,
        trained_at: null,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// tick — promote completed active → trained, queued → active
// ---------------------------------------------------------------------------

export function tick(
  playerSkills: PlayerSkill[],
  skillDefinitions: Map<string, { base_train_seconds: number }>,
  now: Date
): TickResult {
  let state = [...playerSkills.map((s) => ({ ...s }))];
  const justCompleted: string[] = [];
  const nowMs = now.getTime();
  const nowISO = now.toISOString();

  // Check if active skill has completed
  const active = state.find((s) => s.status === "active");
  if (active && active.completes_at && new Date(active.completes_at).getTime() <= nowMs) {
    // Mark active as trained
    state = replaceSkill(state, active.skill_id, {
      status: "trained",
      trained_at: nowISO,
    });
    justCompleted.push(active.skill_id);

    // Promote queued to active
    const queued = state.find((s) => s.status === "queued");
    if (queued) {
      const def = skillDefinitions.get(queued.skill_id);
      const trainSecs = def?.base_train_seconds ?? 14400; // fallback 4h
      const completesAt = new Date(nowMs + trainSecs * 1000);
      state = replaceSkill(state, queued.skill_id, {
        status: "active",
        started_at: nowISO,
        completes_at: completesAt.toISOString(),
      });
    }
  }

  return { newState: state, justCompleted };
}

// ---------------------------------------------------------------------------
// cancelQueued — remove the queued entry (active cannot be cancelled)
// ---------------------------------------------------------------------------

export function cancelQueued(
  playerSkills: PlayerSkill[]
): { ok: true; newState: PlayerSkill[] } | { ok: false; error: string } {
  const queued = findByStatus(playerSkills, "queued");
  if (!queued) {
    return { ok: false, error: "No skill is currently queued." };
  }
  return {
    ok: true,
    newState: playerSkills.filter((s) => s.skill_id !== queued.skill_id),
  };
}
