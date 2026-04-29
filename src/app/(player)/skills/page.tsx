"use client";

import { useEffect, useState } from "react";
import { SkillQueueCheck } from "@/components/skills/SkillQueueCheck";
import { SkillsPanel } from "@/components/skills/SkillsPanel";
import { useSkillQueue } from "@/hooks/useSkillQueue";

export default function SkillsPage() {
  const { active, queued, availableToTrain, loading } = useSkillQueue();
  const [showQueue, setShowQueue] = useState(false);
  const [autoShown, setAutoShown] = useState(false);

  // Auto-show queue whenever the player has an empty slot they could fill.
  // Covers first load (no active), after returning mid-training (active set
  // but queued empty — T-1777320000001), and after a completion frees a slot.
  useEffect(() => {
    if (loading || autoShown) return;
    const hasOpenSlot = !active || !queued;
    if (hasOpenSlot && availableToTrain.length > 0) {
      setShowQueue(true);
      setAutoShown(true);
    }
  }, [loading, active, queued, availableToTrain.length, autoShown]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-primary">Character Skills</h1>

      <SkillsPanel onStartTraining={() => setShowQueue(true)} />

      {showQueue && <SkillQueueCheck onClose={() => setShowQueue(false)} />}
    </div>
  );
}
