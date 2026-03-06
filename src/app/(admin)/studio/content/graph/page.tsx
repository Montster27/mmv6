"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import type { Storylet } from "@/types/storylets";

const GraphView = dynamic(
  () => import("@/components/contentStudio/GraphView").then((m) => m.GraphView),
  { ssr: false }
);

export default function GraphPage() {
  const { loadStorylets } = useStoryletsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [selected, setSelected] = useState<Storylet | null>(null);

  useEffect(() => {
    loadStorylets().then(setStorylets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRetarget(choiceId: string, targetId: string) {
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

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4">
          <GraphView
            storylets={storylets}
            selectedStorylet={selected}
            onSelectStorylet={setSelected}
            onRetargetChoice={handleRetarget}
          />
        </div>
      )}
    </AuthGate>
  );
}
