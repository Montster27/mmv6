"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import { useArcsAPI } from "@/hooks/contentStudio/useArcsAPI";
import type { Storylet } from "@/types/storylets";
import type { Session } from "@supabase/supabase-js";

const GraphView = dynamic(
  () => import("@/components/contentStudio/GraphView").then((m) => m.GraphView),
  { ssr: false }
);

const ArcFlowView = dynamic(
  () => import("@/components/contentStudio/ArcFlowView").then((m) => m.ArcFlowView),
  { ssr: false }
);

type ViewMode = "storylets" | "arcs";

export default function GraphPage() {
  const router = useRouter();
  const { loadStorylets, saveStorylet, setGameEntry } = useStoryletsAPI();
  const { loadArcDefinitions, arcDefinitions, arcDefinitionSteps } = useArcsAPI();

  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [selected, setSelected] = useState<Storylet | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("storylets");

  useEffect(() => {
    loadStorylets().then(setStorylets);
    loadArcDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entryNodeIds = useMemo(
    () => storylets.filter((s) => s.tags?.includes("game_entry")).map((s) => s.id),
    [storylets]
  );

  function handleRetarget(choiceId: string, targetId: string, session: Session) {
    const affected = storylets.find((s) => s.choices.some((c) => c.id === choiceId));
    if (affected) {
      const updatedStorylet = {
        ...affected,
        choices: affected.choices.map((c) =>
          c.id === choiceId ? ({ ...c, targetStoryletId: targetId } as typeof c) : c
        ),
      };
      saveStorylet(updatedStorylet, session.user.email ?? null);
    }
    setStorylets((prev) =>
      prev.map((s) => ({
        ...s,
        choices: s.choices.map((c) =>
          c.id === choiceId
            ? ({ ...c, targetStoryletId: targetId } as typeof c)
            : c
        ),
      }))
    );
  }

  async function handleSetStartNode(storyletId: string) {
    await setGameEntry(storyletId);
    // Optimistic update: move game_entry tag to the target
    setStorylets((prev) =>
      prev.map((s) => ({
        ...s,
        tags:
          s.id === storyletId
            ? [...(s.tags ?? []).filter((t) => t !== "game_entry"), "game_entry"]
            : (s.tags ?? []).filter((t) => t !== "game_entry"),
      }))
    );
  }

  function handleConnectChoice(sourceId: string, choiceId: string, targetId: string, session: Session) {
    handleRetarget(choiceId, targetId, session);
  }

  return (
    <AuthGate>
      {(session) => (
        <div className="h-full overflow-auto p-4 space-y-4">
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 w-fit">
            <button
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "storylets"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setViewMode("storylets")}
            >
              Storylet Flow
            </button>
            <button
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "arcs"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setViewMode("arcs")}
            >
              Track Sequences
              {arcDefinitions.length > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700">
                  {arcDefinitions.length} tracks · {arcDefinitionSteps.length} storylets
                </span>
              )}
            </button>
          </div>

          {viewMode === "storylets" ? (
            <GraphView
              storylets={storylets}
              arcDefinitions={arcDefinitions}
              selectedStorylet={selected}
              onSelectStorylet={setSelected}
              onRetargetChoice={(choiceId, targetId) =>
                handleRetarget(choiceId, targetId, session)
              }
              entryNodeIds={entryNodeIds}
              onSetStartNode={handleSetStartNode}
              onConnectChoice={(sourceId, choiceId, targetId) =>
                handleConnectChoice(sourceId, choiceId, targetId, session)
              }
              onJumpToEditor={(storylet) =>
                router.push(`/studio/content/storylets?id=${storylet.id}`)
              }
            />
          ) : (
            <ArcFlowView
              arcDefinitions={arcDefinitions}
              arcSteps={arcDefinitionSteps}
            />
          )}
        </div>
      )}
    </AuthGate>
  );
}
