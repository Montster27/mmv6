"use client";

import type { Storylet } from "@/types/storylets";
import { PreviewSimulator } from "./PreviewSimulator";

interface PreviewModeProps {
  draft: Storylet;
  allStorylets: Storylet[];
  arcDefinitions?: { id: string; key: string; title: string }[];
}

export function PreviewMode({ draft, allStorylets, arcDefinitions }: PreviewModeProps) {
  return (
    <div style={{ padding: 16, height: "100%", overflow: "auto" }}>
      <PreviewSimulator
        storylets={allStorylets}
        defaultStorylet={draft}
        arcDefinitions={arcDefinitions}
      />
    </div>
  );
}
