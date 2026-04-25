import type {
  DialogueNode,
  MicroChoice,
  NodeCondition,
} from "@/types/storylets";
import type { PlayerIdentity } from "@/types/identity";
import type { PeriodStanceState, PeriodStanceTag } from "@/core/chapter/types";
import { playerHasIdentity } from "@/lib/playerIdentity";
import { periodStanceCount } from "@/core/chapter/state";

/** Runtime context carried into condition evaluation. Callers pre-fetch
 *  identity + period-stance state (sync) and prior stance (async at load). */
export type PlayerContext = {
  identity?: PlayerIdentity | null;
  periodStance?: PeriodStanceState | null;
  /** Most-recent PERIOD_STANCE value from choice_log (if any). */
  priorPeriodStance?: PeriodStanceTag | null;
};

/**
 * Evaluate a NodeCondition against walk-local flags, NPC memory, and the
 * optional player context. Returns true iff every configured predicate
 * passes. Unspecified predicates pass vacuously.
 *
 * Ordering note: predicates are AND-ed. Authors needing OR-style variance
 * should split into multiple variant entries.
 */
export function evaluateNodeCondition(
  condition: NodeCondition | undefined,
  flags: Set<string>,
  relationships?: Record<string, Record<string, unknown>> | null,
  playerContext?: PlayerContext
): boolean {
  if (!condition) return true;

  if (condition.flag && !flags.has(condition.flag)) return false;

  if (condition.all_flags && condition.all_flags.length > 0) {
    for (const f of condition.all_flags) {
      if (!flags.has(f)) return false;
    }
  }

  if (condition.npc_memory) {
    const dotIdx = condition.npc_memory.indexOf(".");
    if (dotIdx > 0) {
      const npcId = condition.npc_memory.slice(0, dotIdx);
      const key = condition.npc_memory.slice(dotIdx + 1);
      if (!relationships?.[npcId]?.[key]) return false;
    }
  }

  if (condition.identity) {
    const { attribute, in: values } = condition.identity;
    if (!playerHasIdentity(playerContext?.identity ?? null, attribute, values)) {
      return false;
    }
  }

  if (condition.period_stance) {
    const state = playerContext?.periodStance;
    if (!state) return false;
    const need = condition.period_stance.min ?? 1;
    if (periodStanceCount(state, condition.period_stance.tag) < need) {
      return false;
    }
  }

  if (condition.prior_period_stance) {
    if (playerContext?.priorPeriodStance !== condition.prior_period_stance) {
      return false;
    }
  }

  return true;
}

/**
 * Resolve a node's rendered body. Walks `text_variants` top-to-bottom and
 * returns the first match's `text`. Falls back to `node.text` if no entry
 * matches — which is the declared default.
 */
export function resolveNodeText(
  node: DialogueNode,
  flags: Set<string>,
  relationships?: Record<string, Record<string, unknown>> | null,
  playerContext?: PlayerContext
): string {
  const variants = node.text_variants;
  if (variants && variants.length > 0) {
    for (const variant of variants) {
      if (evaluateNodeCondition(variant.condition, flags, relationships, playerContext)) {
        return variant.text;
      }
    }
  }
  return node.text;
}

/**
 * Resolve a micro-choice's rendered label. Walks `label_variants` top-to-bottom
 * and returns the first match's `label`. Falls back to `micro.label` if no
 * entry matches.
 */
export function resolveMicroLabel(
  micro: MicroChoice,
  flags: Set<string>,
  relationships?: Record<string, Record<string, unknown>> | null,
  playerContext?: PlayerContext
): string {
  const variants = micro.label_variants;
  if (variants && variants.length > 0) {
    for (const variant of variants) {
      if (evaluateNodeCondition(variant.condition, flags, relationships, playerContext)) {
        return variant.label;
      }
    }
  }
  return micro.label;
}
