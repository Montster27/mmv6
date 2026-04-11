"use client";

import { useEffect, useState } from "react";
import { SkillQueueCheck } from "@/components/skills/SkillQueueCheck";
import { SkillsPanel } from "@/components/skills/SkillsPanel";
import { useSkillQueue } from "@/hooks/useSkillQueue";

export default function SkillsPage() {
  const { active, trained, loading } = useSkillQueue();
  const [showQueue, setShowQueue] = useState(false);
  const [autoShown, setAutoShown] = useState(false);

  // Auto-show queue if player has nothing training on first load
  useEffect(() => {
    if (!loading && !active && trained.length === 0 && !autoShown) {
      setShowQueue(true);
      setAutoShown(true);
    }
  }, [loading, active, trained.length, autoShown]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-primary">Character Skills</h1>

      <SkillsPanel onStartTraining={() => setShowQueue(true)} />

      {showQueue && <SkillQueueCheck onClose={() => setShowQueue(false)} />}
    </div>
  );
}
