"use client";

import { useState, useCallback, useEffect } from "react";
import type { DialogueNode, MicroChoice, StoryletChoice } from "@/types/storylets";
import { getNpcEntry } from "@/domain/npcs/registry";
import {
  evaluateNodeCondition,
  resolveNodeText,
  resolveMicroLabel,
  type PlayerContext,
} from "@/lib/nodeConditions";
import { logState } from "@/lib/stateLog";

type DialogueNodeViewProps = {
  preamble: string;
  nodes: DialogueNode[];
  choices: StoryletChoice[];
  /**
   * Called when the player picks a terminal choice. Receives the set of
   * walk-local flags that were active at the moment of selection — call sites
   * use this to evaluate conditional `events_emitted` groups and variant
   * selection for downstream prose / relationship fallout.
   */
  onChoice: (choiceId: string, activeFlags: Set<string>) => void;
  onMicroEffects?: (effects: {
    set_npc_memory?: Record<string, Record<string, boolean>>;
    relational_effect?: Record<string, Record<string, number>>;
    identity_tags?: string[];
    period_stance?: "challenged" | "deflected" | "absorbed";
  }) => void;
  relationships?: Record<string, Record<string, unknown>> | null;
  /** Player identity + period-stance state for node gates and variant selection. */
  playerContext?: PlayerContext;
  disabled?: boolean;
  /**
   * Stable identifier for the storylet, used to persist the in-progress walk
   * across navigations away from /play (e.g. to /skills) — see T-1777320000003.
   * When omitted, walk state lives only in-memory.
   */
  storyletKey?: string;
};

const WALK_STATE_STORAGE_PREFIX = "mmv:dialogueWalk:";

interface PersistedWalkState {
  currentNodeId: string | null;
  activeFlags: string[];
  completedNodeIds: string[];
  showChoices: boolean;
}

function loadPersistedWalk(storyletKey: string | undefined): PersistedWalkState | null {
  if (!storyletKey || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(WALK_STATE_STORAGE_PREFIX + storyletKey);
    if (!raw) {
      logState({
        surface: "walk-state",
        action: "walkState.read",
        details: { storyletKey, found: false },
      });
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedWalkState>;
    const result = {
      currentNodeId: parsed.currentNodeId ?? null,
      activeFlags: Array.isArray(parsed.activeFlags) ? parsed.activeFlags : [],
      completedNodeIds: Array.isArray(parsed.completedNodeIds) ? parsed.completedNodeIds : [],
      showChoices: Boolean(parsed.showChoices),
    };
    logState({
      surface: "walk-state",
      action: "walkState.read",
      details: {
        storyletKey,
        found: true,
        currentNodeId: result.currentNodeId,
        activeFlagsCount: result.activeFlags.length,
        completedCount: result.completedNodeIds.length,
        showChoices: result.showChoices,
      },
    });
    return result;
  } catch (err) {
    logState({
      surface: "walk-state",
      action: "walkState.read.error",
      details: { storyletKey, error: (err as Error)?.message ?? String(err) },
    });
    return null;
  }
}

function clearPersistedWalk(storyletKey: string | undefined, reason: "terminalChoice" | "explicit" = "explicit") {
  if (!storyletKey || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(WALK_STATE_STORAGE_PREFIX + storyletKey);
    logState({
      surface: "walk-state",
      action: "walkState.clear",
      details: { storyletKey, reason },
    });
  } catch {
    // ignore — storage may be full or disabled
  }
}

function findInitialNode(
  nodes: DialogueNode[],
  relationships?: Record<string, Record<string, unknown>> | null,
  playerContext?: PlayerContext
): string | null {
  const emptyFlags = new Set<string>();
  for (const node of nodes) {
    if (evaluateNodeCondition(node.condition, emptyFlags, relationships, playerContext)) {
      return node.id;
    }
    if (node.next) {
      const target = nodes.find((n) => n.id === node.next);
      if (
        target &&
        evaluateNodeCondition(target.condition, emptyFlags, relationships, playerContext)
      ) {
        return target.id;
      }
    }
  }
  return nodes[0]?.id ?? null;
}

function NodeText({
  node,
  text,
  className,
}: {
  node: DialogueNode;
  text: string;
  className?: string;
}) {
  if (node.speaker && node.speaker !== "narrator") {
    const entry = getNpcEntry(node.speaker);
    const fallbackName = node.speaker.split("_").pop();
    const displayName =
      entry?.name ??
      (fallbackName ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1) : node.speaker);
    return (
      <div className={className}>
        <p className="whitespace-pre-line font-body text-[15px] italic leading-relaxed text-foreground/85">
          &ldquo;{text}&rdquo;
        </p>
        <p className="mt-1 font-stat text-xs text-muted-foreground/60 tracking-wide">
          &mdash; {displayName}
        </p>
      </div>
    );
  }
  return (
    <p className={`whitespace-pre-line font-body text-[15px] leading-relaxed text-foreground/85 ${className ?? ""}`}>
      {text}
    </p>
  );
}

export function DialogueNodeView({
  preamble,
  nodes,
  choices,
  onChoice,
  onMicroEffects,
  relationships,
  playerContext,
  disabled,
  storyletKey,
}: DialogueNodeViewProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(() => {
    const persisted = loadPersistedWalk(storyletKey);
    if (persisted) {
      // Only honour the persisted node if it still exists in the current node set.
      if (persisted.currentNodeId === null || nodes.some((n) => n.id === persisted.currentNodeId)) {
        return persisted.currentNodeId;
      }
    }
    return findInitialNode(nodes, relationships, playerContext);
  });
  const [activeFlags, setActiveFlags] = useState<Set<string>>(() => {
    const persisted = loadPersistedWalk(storyletKey);
    return persisted ? new Set(persisted.activeFlags) : new Set();
  });
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>(() => {
    const persisted = loadPersistedWalk(storyletKey);
    return persisted ? persisted.completedNodeIds : [];
  });
  const [showChoices, setShowChoices] = useState(() => {
    const persisted = loadPersistedWalk(storyletKey);
    if (persisted) return persisted.showChoices;
    return nodes.length === 0;
  });

  // Persist walk state on every change so /play unmounts (e.g. nav to /skills)
  // don't lose the player's progress through a multi-node storylet.
  useEffect(() => {
    if (!storyletKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        WALK_STATE_STORAGE_PREFIX + storyletKey,
        JSON.stringify({
          currentNodeId,
          activeFlags: Array.from(activeFlags),
          completedNodeIds,
          showChoices,
        }),
      );
      logState({
        surface: "walk-state",
        action: "walkState.write",
        details: {
          storyletKey,
          currentNodeId,
          activeFlagsCount: activeFlags.size,
          completedCount: completedNodeIds.length,
          showChoices,
        },
      });
    } catch (err) {
      logState({
        surface: "walk-state",
        action: "walkState.write.error",
        details: { storyletKey, error: (err as Error)?.message ?? String(err) },
      });
    }
  }, [storyletKey, currentNodeId, activeFlags, completedNodeIds, showChoices]);

  const advance = useCallback(
    (nextId: string | undefined | null, flagToSet?: string) => {
      const newFlags = flagToSet
        ? new Set([...activeFlags, flagToSet])
        : activeFlags;
      if (flagToSet) setActiveFlags(newFlags);

      const dest = nextId ?? "choices";

      if (dest === "choices" || dest === "exit") {
        setCompletedNodeIds((prev) =>
          currentNodeId ? [...prev, currentNodeId] : prev
        );
        setShowChoices(true);
        setCurrentNodeId(null);
        return;
      }

      const nextNode = nodes.find((n) => n.id === dest);
      if (!nextNode) {
        setCompletedNodeIds((prev) =>
          currentNodeId ? [...prev, currentNodeId] : prev
        );
        setShowChoices(true);
        setCurrentNodeId(null);
        return;
      }

      if (
        !evaluateNodeCondition(nextNode.condition, newFlags, relationships, playerContext)
      ) {
        advance(nextNode.else_next ?? nextNode.next, undefined);
        return;
      }

      setCompletedNodeIds((prev) =>
        currentNodeId ? [...prev, currentNodeId] : prev
      );
      setCurrentNodeId(dest);
    },
    [activeFlags, currentNodeId, nodes, relationships, playerContext]
  );

  const handleMicroChoice = useCallback(
    (micro: MicroChoice) => {
      if (
        onMicroEffects &&
        (micro.set_npc_memory ||
          micro.relational_effect ||
          micro.identity_tags?.length ||
          micro.period_stance)
      ) {
        onMicroEffects({
          set_npc_memory: micro.set_npc_memory,
          relational_effect: micro.relational_effect,
          identity_tags: micro.identity_tags,
          period_stance: micro.period_stance,
        });
      }
      advance(micro.next, micro.sets_flag);
    },
    [advance, onMicroEffects]
  );

  const handleContinue = useCallback(() => {
    const currentNode = nodes.find((n) => n.id === currentNodeId);
    advance(currentNode?.next);
  }, [advance, currentNodeId, nodes]);

  const currentNode = currentNodeId
    ? nodes.find((n) => n.id === currentNodeId)
    : null;

  const visibleChoices = showChoices
    ? choices.filter((c) => {
        if (c.requires_flag && !activeFlags.has(c.requires_flag)) return false;
        if (c.excludes_flag && activeFlags.has(c.excludes_flag)) return false;
        return true;
      })
    : [];

  const shownChoices = visibleChoices.length > 0 ? visibleChoices : showChoices ? choices : [];

  return (
    <div className="space-y-4">
      {/* Preamble */}
      <p className="whitespace-pre-line font-body text-base leading-relaxed text-foreground/85 max-w-[42rem]">
        {preamble}
      </p>

      {/* Completed nodes — faded narrative scroll */}
      {completedNodeIds.map((id) => {
        const node = nodes.find((n) => n.id === id);
        if (!node) return null;
        const text = resolveNodeText(node, activeFlags, relationships, playerContext);
        return (
          <div key={id} className="opacity-40 border-l-2 border-border/30 pl-4">
            <NodeText node={node} text={text} className="text-sm" />
          </div>
        );
      })}

      {/* Current active node */}
      {currentNode && (
        <div className="narrative-enter">
          <NodeText
            node={currentNode}
            text={resolveNodeText(currentNode, activeFlags, relationships, playerContext)}
          />
          <div className="mt-3 space-y-2">
            {currentNode.micro_choices && currentNode.micro_choices.length > 0 ? (
              currentNode.micro_choices.map((micro, i) => (
                <button
                  key={micro.id}
                  disabled={disabled}
                  onClick={() => handleMicroChoice(micro)}
                  className="micro-choice-btn choice-enter"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {resolveMicroLabel(micro, activeFlags, relationships, playerContext)}
                </button>
              ))
            ) : (
              <button
                disabled={disabled}
                onClick={handleContinue}
                className="micro-choice-btn choice-enter"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terminal choices */}
      {shownChoices.length > 0 && (
        <div className="space-y-3 narrative-enter">
          {shownChoices.map((choice, i) => (
            <div key={choice.id}>
              {i > 0 && <div className="prep-divider" />}
              <button
                disabled={disabled}
                onClick={() => {
                  clearPersistedWalk(storyletKey, "terminalChoice");
                  onChoice(choice.id, new Set(activeFlags));
                }}
                className="choice-btn choice-enter"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {choice.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
