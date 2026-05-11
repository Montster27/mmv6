"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import { useArcsAPI } from "@/hooks/contentStudio/useArcsAPI";
import type { Storylet } from "@/types/storylets";
import { SwimlaneView } from "@/components/contentStudio/SwimlaneView";

export default function SwimlanePage() {
  const { loadStorylets } = useStoryletsAPI();
  const { arcDefinitions, loadArcDefinitions } = useArcsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadStorylets().then(setStorylets),
      loadArcDefinitions(),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthGate>
      {() => (
        <SwimlaneView
          storylets={storylets}
          arcDefinitions={arcDefinitions}
          loading={loading}
        />
      )}
    </AuthGate>
  );
}
