"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSkillQueue } from "@/hooks/useSkillQueue";
import { formatCountdown, trainingProgress } from "@/core/skills/formatTime";
import type { SkillDefinition } from "@/types/skills";

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(fraction * 100);
  return (
    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Domain badge color
// ---------------------------------------------------------------------------

const domainColor: Record<string, string> = {
  Academic: "bg-blue-100 text-blue-800",
  Social: "bg-amber-100 text-amber-800",
  Physical: "bg-green-100 text-green-800",
  Creative: "bg-purple-100 text-purple-800",
  Technical: "bg-slate-200 text-slate-800",
  Practical: "bg-orange-100 text-orange-800",
};

function DomainBadge({ domain }: { domain: string }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${domainColor[domain] ?? "bg-slate-100 text-slate-700"}`}
    >
      {domain}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skill Picker
// ---------------------------------------------------------------------------

function SkillPicker({
  skills,
  onSelect,
  busy,
}: {
  skills: SkillDefinition[];
  onSelect: (id: string) => void;
  busy: boolean;
}) {
  // Group by domain
  const byDomain = skills.reduce<Record<string, SkillDefinition[]>>((acc, s) => {
    (acc[s.domain] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(byDomain).map(([domain, items]) => (
        <div key={domain}>
          <DomainBadge domain={domain} />
          <div className="mt-1 flex flex-wrap gap-2">
            {items.map((s) => (
              <Button
                key={s.skill_id}
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => onSelect(s.skill_id)}
              >
                {s.display_name}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SkillQueueCheck({
  onClose,
}: {
  onClose?: () => void;
}) {
  const {
    loading,
    error,
    active,
    queued,
    trained,
    justCompleted,
    availableToTrain,
    definitions,
    trainSkill,
    cancelQueued,
  } = useSkillQueue();

  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Tick the countdown every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSelect = async (skillId: string) => {
    setBusy(true);
    await trainSkill(skillId);
    setBusy(false);
  };

  const handleCancel = async () => {
    setBusy(true);
    await cancelQueued();
    setBusy(false);
  };

  if (loading) {
    return (
      <Card variant="highlight" className="max-w-md mx-auto mt-8">
        <CardContent>
          <p className="text-sm text-muted-foreground animate-pulse">Loading skill queue...</p>
        </CardContent>
      </Card>
    );
  }

  const activeDef = active
    ? definitions.find((d) => d.skill_id === active.skill_id)
    : null;
  const queuedDef = queued
    ? definitions.find((d) => d.skill_id === queued.skill_id)
    : null;
  const completedDefs = justCompleted
    .map((id) => definitions.find((d) => d.skill_id === id))
    .filter(Boolean);

  return (
    <Card variant="highlight" className="max-w-md mx-auto mt-8">
      <CardHeader>
        <h2 className="text-lg font-semibold text-primary">Skill Training</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Celebration: just-completed skills */}
        {completedDefs.length > 0 && (
          <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2">
            {completedDefs.map((d) => (
              <p key={d!.skill_id} className="text-sm font-medium text-emerald-800">
                {d!.display_name} training complete!
              </p>
            ))}
          </div>
        )}

        {/* Active skill */}
        {active && activeDef && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{activeDef.display_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatCountdown(active.completes_at, now)}
              </span>
            </div>
            <ProgressBar
              fraction={trainingProgress(active.started_at, active.completes_at, now)}
            />
            <DomainBadge domain={activeDef.domain} />
          </div>
        )}

        {/* Queued skill */}
        {queued && queuedDef && (
          <div className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
            <div>
              <span className="text-sm">Up next: {queuedDef.display_name}</span>
              <DomainBadge domain={queuedDef.domain} />
            </div>
            <Button variant="ghost" size="sm" disabled={busy} onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Picker — show when no active, or when active but no queued */}
        {availableToTrain.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {!active
                ? "Choose a skill to start training:"
                : !queued
                  ? "Queue your next skill:"
                  : null}
            </p>
            {(!active || !queued) && (
              <SkillPicker
                skills={availableToTrain}
                onSelect={handleSelect}
                busy={busy}
              />
            )}
          </div>
        )}

        {/* Trained summary */}
        {trained.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-1">
              Trained ({trained.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {trained.map((ps) => {
                const d = definitions.find((dd) => dd.skill_id === ps.skill_id);
                return (
                  <span
                    key={ps.skill_id}
                    className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {d?.display_name ?? ps.skill_id}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
