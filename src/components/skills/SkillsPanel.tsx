"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSkillQueue } from "@/hooks/useSkillQueue";
import { formatCountdown, trainingProgress } from "@/core/skills/formatTime";

const domainColor: Record<string, string> = {
  Academic: "bg-blue-100 text-blue-800",
  Social: "bg-amber-100 text-amber-800",
  Physical: "bg-green-100 text-green-800",
  Creative: "bg-purple-100 text-purple-800",
  Technical: "bg-slate-200 text-slate-800",
  Practical: "bg-orange-100 text-orange-800",
};

/**
 * Read-only character sheet panel showing trained skills grouped by domain,
 * with a live "In training" row at the top for the active skill.
 */
export function SkillsPanel({
  onStartTraining,
}: {
  onStartTraining?: () => void;
}) {
  const { loading, active, trained, definitions } = useSkillQueue();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (loading) {
    return (
      <Card variant="muted" className="animate-pulse">
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading skills...</p>
        </CardContent>
      </Card>
    );
  }

  const activeDef = active
    ? definitions.find((d) => d.skill_id === active.skill_id)
    : null;

  // Group trained by domain
  const byDomain = trained.reduce<Record<string, string[]>>((acc, ps) => {
    const def = definitions.find((d) => d.skill_id === ps.skill_id);
    const domain = def?.domain ?? "Other";
    (acc[domain] ??= []).push(def?.display_name ?? ps.skill_id);
    return acc;
  }, {});

  const isEmpty = trained.length === 0 && !active;

  return (
    <Card variant="muted">
      <CardHeader>
        <h3 className="text-sm font-semibold text-primary">Skills</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active training row */}
        {active && activeDef && (
          <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                In training: {activeDef.display_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatCountdown(active.completes_at, now)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${Math.round(trainingProgress(active.started_at, active.completes_at, now) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Trained skills grouped by domain */}
        {Object.entries(byDomain).map(([domain, names]) => (
          <div key={domain}>
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium mb-1 ${domainColor[domain] ?? "bg-slate-100 text-slate-700"}`}
            >
              {domain}
            </span>
            <ul className="ml-2 space-y-0.5">
              {names.map((name) => (
                <li key={name} className="text-sm text-foreground">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No skills trained yet.
            </p>
            {onStartTraining && (
              <button
                onClick={onStartTraining}
                className="mt-1 text-sm text-primary underline hover:text-primary/80"
              >
                Start training a skill
              </button>
            )}
          </div>
        )}

        {/* If has trained but nothing active, nudge */}
        {!active && trained.length > 0 && onStartTraining && (
          <button
            onClick={onStartTraining}
            className="text-xs text-primary underline hover:text-primary/80"
          >
            No skill in training — start one
          </button>
        )}
      </CardContent>
    </Card>
  );
}
