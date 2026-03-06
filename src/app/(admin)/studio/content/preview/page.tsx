"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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

export default function PreviewPage() {
  const { loadStorylets } = useStoryletsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);

  useEffect(() => {
    loadStorylets({ active: "true" }).then(setStorylets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4">
          <PreviewSimulator storylets={storylets} defaultStorylet={null} />
        </div>
      )}
    </AuthGate>
  );
}
