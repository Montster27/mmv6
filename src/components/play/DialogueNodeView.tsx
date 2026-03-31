"use client";

import { useState, useCallback } from "react";
import type { DialogueNode, MicroChoice, StoryletChoice } from "@/types/storylets";

type DialogueNodeViewProps = {
  /** Preamble text (body + any NPC intro blurb prepended). Shown persistently at top. */
  preamble: string;
  nodes: DialogueNode[];
  choices: StoryletChoice[];
  onChoice: (choiceId: string) => void;
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
export function DialogueNodeView({
  preamble,
  nodes,
  choices,
  onChoice,
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
      advance(micro.next, micro.sets_flag);
    },
    [advance]
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
        const req = (c as StoryletChoice & { requires_flag?: string })
          .requires_flag;
        const excl = (c as StoryletChoice & { excludes_flag?: string })
          .excludes_flag;
        if (req && !activeFlags.has(req)) return false;
        if (excl && activeFlags.has(excl)) return false;
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
          <p
            key={id}
            className="whitespace-pre-line text-sm leading-relaxed text-foreground/50"
          >
            {node.text}
          </p>
        );
      })}

      {/* Current active node */}
      {currentNode && (
        <div className="animate-in fade-in duration-150">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
            {currentNode.text}
          </p>
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
