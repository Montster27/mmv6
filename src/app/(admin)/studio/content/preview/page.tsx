"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import type { Storylet } from "@/types/storylets";

const PreviewSimulator = dynamic(
  () =>
    import("@/components/contentStudio/PreviewSimulator").then(
      (m) => m.PreviewSimulator
    ),
  { ssr: false }
);

function PreviewContent() {
  const searchParams = useSearchParams();
  const storyletId = searchParams.get("storylet");

  const { loadStorylets } = useStoryletsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);

  useEffect(() => {
    loadStorylets({ active: "true" }).then(setStorylets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultStorylet = useMemo(
    () => (storyletId ? storylets.find((s) => s.id === storyletId) ?? null : null),
    [storylets, storyletId]
  );

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4">
          <PreviewSimulator storylets={storylets} defaultStorylet={defaultStorylet} />
        </div>
      )}
    </AuthGate>
  );
}

export default function PreviewPage() {
  return (
    <Suspense>
      <PreviewContent />
    </Suspense>
  );
}
