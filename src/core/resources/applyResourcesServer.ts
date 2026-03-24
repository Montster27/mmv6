/**
 * Server-side resource helpers for applying resource deltas.
 * Works with any Supabase client (browser or server).
 *
 * This is the canonical place for:
 *  - Reading current resource snapshot from player_day_state
 *  - Collecting all resource deltas from a choice (costs, rewards, outcome, costs_resource, energy_cost)
 *  - Validating requires_resource gates server-side
 *  - Applying deltas with proper clamping via applyResourceDeltaToSnapshot
 *  - Persisting to player_day_state (the single source of truth for resources)
 *  - Syncing energy/stress to daily_states for backward compat
 */

import {
  applyResourceDeltaToSnapshot,
  computeMorale,
  type ResourceSnapshot,
} from "@/core/resources/resourceDelta";
import { toLegacyResourceUpdates } from "@/core/resources/resourceMap";
import type { StoryletChoice } from "@/types/storylets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supabase client interface — works with both browser and server clients */
type SupabaseClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        eq: (...args: unknown[]) => {
          limit: (...args: unknown[]) => {
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
          };
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
        };
      };
    };
    update: (payload: Record<string, unknown>) => {
      eq: (...args: unknown[]) => {
        eq: (...args: unknown[]) => Promise<{ error: unknown }>;
      };
    };
  };
};

export type ResourceGateResult = {
  passed: boolean;
  /** If failed, which resource was insufficient */
  failedKey?: string;
  /** Current value of the insufficient resource */
  current?: number;
  /** Required minimum */
  required?: number;
};

export type ResourceApplicationResult = {
  before: ResourceSnapshot;
  after: ResourceSnapshot;
  deltas: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Read current snapshot from player_day_state
// ---------------------------------------------------------------------------

export async function getResourceSnapshot(
  db: SupabaseClient,
  userId: string,
  dayIndex: number
): Promise<ResourceSnapshot> {
  const { data, error } = await (db as any)
    .from("player_day_state")
    .select("energy,stress,money,study_progress,social_capital,health")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Fallback defaults if no row exists yet
    return {
      energy: 70,
      stress: 20,
      knowledge: 0,
      cashOnHand: 0,
      socialLeverage: 0,
      physicalResilience: 50,
      morale: computeMorale(70, 20),
    };
  }

  const energy = typeof data.energy === "number" ? data.energy : 70;
  const stress = typeof data.stress === "number" ? data.stress : 20;

  return {
    energy,
    stress,
    knowledge: typeof data.study_progress === "number" ? data.study_progress : 0,
    cashOnHand: typeof data.money === "number" ? data.money : 0,
    socialLeverage: typeof data.social_capital === "number" ? data.social_capital : 0,
    physicalResilience: typeof data.health === "number" ? data.health : 50,
    morale: computeMorale(energy, stress),
  };
}

// ---------------------------------------------------------------------------
// Validate requires_resource gate
// ---------------------------------------------------------------------------

export function checkResourceGate(
  snapshot: ResourceSnapshot,
  choice: Record<string, unknown>
): ResourceGateResult {
  const requiresResource = choice.requires_resource as
    | { key: string; min: number }
    | undefined;

  if (!requiresResource?.key || typeof requiresResource.min !== "number") {
    return { passed: true };
  }

  const key = requiresResource.key;
  const required = requiresResource.min;
  const current = (snapshot as unknown as Record<string, number>)[key] ?? 0;

  if (current < required) {
    return { passed: false, failedKey: key, current, required };
  }
  return { passed: true };
}

// ---------------------------------------------------------------------------
// Collect all resource deltas from a choice
// ---------------------------------------------------------------------------

export function collectChoiceResourceDeltas(
  choice: Record<string, unknown>
): Record<string, number> {
  const deltas: Record<string, number> = {};

  // 1. costs.resources (structured costs)
  const costs = choice.costs as { resources?: Record<string, number> } | undefined;
  if (costs?.resources) {
    for (const [k, v] of Object.entries(costs.resources)) {
      if (typeof v === "number") deltas[k] = (deltas[k] ?? 0) - v;
    }
  }

  // 2. rewards.resources (structured rewards)
  const rewards = choice.rewards as { resources?: Record<string, number> } | undefined;
  if (rewards?.resources) {
    for (const [k, v] of Object.entries(rewards.resources)) {
      if (typeof v === "number") deltas[k] = (deltas[k] ?? 0) + v;
    }
  }

  // 3. energy_cost (legacy shorthand)
  const energyCost = typeof choice.energy_cost === "number" ? choice.energy_cost : 0;
  if (energyCost > 0) {
    deltas["energy"] = (deltas["energy"] ?? 0) - energyCost;
  }

  // 4. outcome.deltas (energy, stress, resources)
  const outcome = choice.outcome as
    | { deltas?: { energy?: number; stress?: number; resources?: Record<string, number> } }
    | undefined;
  if (outcome?.deltas) {
    const d = outcome.deltas;
    if (typeof d.energy === "number" && d.energy !== 0) {
      deltas["energy"] = (deltas["energy"] ?? 0) + d.energy;
    }
    if (typeof d.stress === "number" && d.stress !== 0) {
      deltas["stress"] = (deltas["stress"] ?? 0) + d.stress;
    }
    if (d.resources) {
      for (const [k, v] of Object.entries(d.resources)) {
        if (typeof v === "number" && v !== 0) {
          deltas[k] = (deltas[k] ?? 0) + v;
        }
      }
    }
  }

  // 5. costs_resource (single-key deduction — was missing from tracks/resolve!)
  const costsResource = choice.costs_resource as { key: string; amount: number } | undefined;
  if (costsResource?.key && typeof costsResource.amount === "number") {
    deltas[costsResource.key] = (deltas[costsResource.key] ?? 0) - costsResource.amount;
  }

  return deltas;
}

// ---------------------------------------------------------------------------
// Apply collected deltas to player_day_state with clamping + sync
// ---------------------------------------------------------------------------

export async function applyResourceDeltas(
  db: SupabaseClient,
  userId: string,
  dayIndex: number,
  rawDeltas: Record<string, number>
): Promise<ResourceApplicationResult> {
  const before = await getResourceSnapshot(db, userId, dayIndex);

  // Use the shared clamping logic
  const { next, applied } = applyResourceDeltaToSnapshot(before, {
    resources: rawDeltas,
  });

  // Persist to player_day_state (canonical resource table)
  const updatePayload: Record<string, unknown> = {
    energy: next.energy,
    stress: next.stress,
    ...toLegacyResourceUpdates({
      knowledge: next.knowledge,
      cashOnHand: next.cashOnHand,
      socialLeverage: next.socialLeverage,
      physicalResilience: next.physicalResilience,
    }),
    updated_at: new Date().toISOString(),
  };

  await (db as any)
    .from("player_day_state")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  // Sync energy + stress to daily_states for backward compatibility
  await (db as any)
    .from("daily_states")
    .update({ energy: next.energy, stress: next.stress })
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  return { before, after: next, deltas: applied as unknown as Record<string, number> };
}
