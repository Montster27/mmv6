"use client";

import { useState, useCallback } from "react";
import type { DialogueNode, MicroChoice, StoryletChoice } from "@/types/storylets";
import { getNpcEntry } from "@/domain/npcs/registry";

type DialogueNodeViewProps = {
  preamble: string;
  nodes: DialogueNode[];
  choices: StoryletChoice[];
  onChoice: (choiceId: string) => void;
  onMicroEffects?: (effects: {
    set_npc_memory?: Record<string, Record<string, boolean>>;
    relational_effect?: Record<string, Record<string, number>>;
    identity_tags?: string[];
  }) => void;
  relationships?: Record<string, Record<string, unknown>> | null;
  disabled?: boolean;
};

function evaluateNodeCondition(
  condition: DialogueNode["condition"],
  flags: Set<string>,
  relationships?: Record<string, Record<string, unknown>> | null
): boolean {
  if (!condition) return true;
  if (condition.flag && !flags.has(condition.flag)) return false;
  if (condition.npc_memory) {
    const dotIdx = condition.npc_memory.indexOf(".");
    if (dotIdx > 0) {
      const npcId = condition.npc_memory.slice(0, dotIdx);
      const key = condition.npc_memory.slice(dotIdx + 1);
      if (!relationships?.[npcId]?.[key]) return false;
    }
  }
  return true;
}

function findInitialNode(
  nodes: DialogueNode[],
  relationships?: Record<string, Record<string, unknown>> | null
): string | null {
  const emptyFlags = new Set<string>();
  for (const node of nodes) {
    if (evaluateNodeCondition(node.condition, emptyFlags, relationships)) {
      return node.id;
    }
    if (node.next) {
      const target = nodes.find((n) => n.id === node.next);
      if (target && evaluateNodeCondition(target.condition, emptyFlags, relationships)) {
        return target.id;
      }
    }
  }
  return nodes[0]?.id ?? null;
}

function NodeText({
  node,
  className,
}: {
  node: DialogueNode;
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
          &ldquo;{node.text}&rdquo;
        </p>
        <p className="mt-1 font-stat text-xs text-muted-foreground/60 tracking-wide">
          &mdash; {displayName}
        </p>
      </div>
    );
  }
  return (
    <p className={`whitespace-pre-line font-body text-[15px] leading-relaxed text-foreground/85 ${className ?? ""}`}>
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
  relationships,
  disabled,
}: DialogueNodeViewProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(() =>
    findInitialNode(nodes, relationships)
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
        setCompletedNodeIds((prev) =>
          currentNodeId ? [...prev, currentNodeId] : prev
        );
        setShowChoices(true);
        setCurrentNodeId(null);
        return;
      }

      if (!evaluateNodeCondition(nextNode.condition, newFlags, relationships)) {
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
        return (
          <div key={id} className="opacity-40 border-l-2 border-border/30 pl-4">
            <NodeText node={node} className="text-sm" />
          </div>
        );
      })}

      {/* Current active node */}
      {currentNode && (
        <div className="narrative-enter">
          <NodeText node={currentNode} />
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
                  {micro.label}
                </button>
              ))
            ) : (
              <button
                disabled={disabled}
                onClick={handleContinue}
                className="rounded border border-border/40 px-3 py-1.5 text-xs font-stat text-muted-foreground transition hover:border-primary/30 hover:text-foreground/70 disabled:opacity-50"
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
                onClick={() => onChoice(choice.id)}
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
