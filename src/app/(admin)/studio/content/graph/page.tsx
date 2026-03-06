"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import type { Storylet } from "@/types/storylets";
import type { Session } from "@supabase/supabase-js";

const GraphView = dynamic(
  () => import("@/components/contentStudio/GraphView").then((m) => m.GraphView),
  { ssr: false }
);

export default function GraphPage() {
  const router = useRouter();
  const { loadStorylets, saveStorylet } = useStoryletsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [selected, setSelected] = useState<Storylet | null>(null);

  useEffect(() => {
    loadStorylets().then(setStorylets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRetarget(choiceId: string, targetId: string, session: Session) {
    // Find and persist the updated storylet before triggering re-render
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

  return (
    <AuthGate>
      {(session) => (
        <div className="h-full overflow-auto p-4">
          <GraphView
            storylets={storylets}
            selectedStorylet={selected}
            onSelectStorylet={setSelected}
            onRetargetChoice={(choiceId, targetId) =>
              handleRetarget(choiceId, targetId, session)
            }
            onJumpToEditor={(storylet) =>
              router.push(`/studio/content/storylets?id=${storylet.id}`)
            }
          />
        </div>
      )}
    </AuthGate>
  );
}
