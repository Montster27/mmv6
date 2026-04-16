"use client";

import { useState, useCallback } from "react";
import type { DialogueNode, MicroChoice, StoryletChoice } from "@/types/storylets";
import { getNpcEntry } from "@/domain/npcs/registry";

type DialogueNodeViewProps = {
  /** Preamble text (body + any NPC intro blurb prepended). Shown persistently at top. */
  preamble: string;
  nodes: DialogueNode[];
  choices: StoryletChoice[];
  onChoice: (choiceId: string) => void;
  /** Called when a micro-choice applies persistent NPC effects (memory / relational). */
  onMicroEffects?: (effects: {
    set_npc_memory?: Record<string, Record<string, boolean>>;
    relational_effect?: Record<string, Record<string, number>>;
    identity_tags?: string[];
  }) => void;
  disabled?: boolean;
};

/**
 * Walks a conversational node tree before presenting terminal choices.
 *
 * Flow:
 *   preamble → node[0] → micro-choices → next node → … → terminal choices
 *
 * Flags set by micro-choices are local to this walk and used to gate
 * terminal choices via requires_flag / excludes_flag on StoryletChoice.
 *
 * Completed nodes fade into the background as the player advances.
 */
/** Render a single node's text with speaker formatting. */
function NodeText({
  node,
  className,
}: {
  node: DialogueNode;
  className?: string;
}) {
  if (node.speaker && node.speaker !== "narrator") {
    const entry = getNpcEntry(node.speaker);
    // Fallback: extract last segment of NPC ID and capitalize (e.g. "npc_roommate_scott" → "Scott")
    const fallbackName = node.speaker.split("_").pop();
    const displayName =
      entry?.name ??
      (fallbackName ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1) : node.speaker);
    return (
      <div className={className}>
        <p className="whitespace-pre-line text-[15px] italic leading-relaxed text-foreground/85">
          &ldquo;{node.text}&rdquo;
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          &mdash; {displayName}
        </p>
      </div>
    );
  }
  return (
    <p className={`whitespace-pre-line text-[15px] leading-relaxed text-foreground/85 ${className ?? ""}`}>
      {node.text}
    </p>
  );
}

export function DialogueNodeView({
  preamble,
  nodes,
  choices,
  onChoice,
  onMicroEffects,
  disabled,
}: DialogueNodeViewProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(
    nodes[0]?.id ?? null
  );
  const [activeFlags, setActiveFlags] = useState<Set<string>>(new Set());
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [showChoices, setShowChoices] = useState(nodes.length === 0);

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
        // Unknown target — fall through to choices
        setCompletedNodeIds((prev) =>
          currentNodeId ? [...prev, currentNodeId] : prev
        );
        setShowChoices(true);
        setCurrentNodeId(null);
        return;
      }

      // Check condition gate on the target node
      if (nextNode.condition?.flag && !newFlags.has(nextNode.condition.flag)) {
        // Condition not met — skip this node, advance to its next
        advance(nextNode.next, undefined);
        return;
      }

      setCompletedNodeIds((prev) =>
        currentNodeId ? [...prev, currentNodeId] : prev
      );
      setCurrentNodeId(dest);
    },
    [activeFlags, currentNodeId, nodes]
  );

  const handleMicroChoice = useCallback(
    (micro: MicroChoice) => {
      // Apply persistent effects (NPC memory, relational, identity tags)
      if (
        onMicroEffects &&
        (micro.set_npc_memory || micro.relational_effect || micro.identity_tags?.length)
      ) {
        onMicroEffects({
          set_npc_memory: micro.set_npc_memory,
          relational_effect: micro.relational_effect,
          identity_tags: micro.identity_tags,
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

  // Filter terminal choices by flag gates
  const visibleChoices = showChoices
    ? choices.filter((c) => {
        if (c.requires_flag && !activeFlags.has(c.requires_flag)) return false;
        if (c.excludes_flag && activeFlags.has(c.excludes_flag)) return false;
        return true;
      })
    : [];

  // Fall back to all choices if flag-gating would leave nothing
  const shownChoices = visibleChoices.length > 0 ? visibleChoices : showChoices ? choices : [];

  return (
    <div className="space-y-4">
      {/* Preamble — always visible */}
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
        {preamble}
      </p>

      {/* Completed nodes — de-emphasised narrative scroll */}
      {completedNodeIds.map((id) => {
        const node = nodes.find((n) => n.id === id);
        if (!node) return null;
        return (
          <div key={id} className="opacity-50">
            <NodeText node={node} className="text-sm" />
          </div>
        );
      })}

      {/* Current active node */}
      {currentNode && (
        <div className="animate-in fade-in duration-150">
          <NodeText node={currentNode} />
          <div className="mt-3 space-y-2">
            {currentNode.micro_choices && currentNode.micro_choices.length > 0 ? (
              currentNode.micro_choices.map((micro) => (
                <button
                  key={micro.id}
                  disabled={disabled}
                  onClick={() => handleMicroChoice(micro)}
                  className="w-full rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5 text-left text-sm text-foreground/80 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {micro.label}
                </button>
              ))
            ) : (
              <button
                disabled={disabled}
                onClick={handleContinue}
                className="rounded border border-border/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground/70 disabled:opacity-50"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terminal choices */}
      {shownChoices.length > 0 && (
        <div className="animate-in fade-in duration-150 space-y-2">
          {shownChoices.map((choice) => (
            <button
              key={choice.id}
              disabled={disabled}
              onClick={() => onChoice(choice.id)}
              className="w-full rounded-lg border-2 border-primary/25 bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
