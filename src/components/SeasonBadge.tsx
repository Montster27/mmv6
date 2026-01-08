"use client";

type SeasonBadgeProps = {
  seasonIndex: number;
  daysRemaining: number;
};

export function SeasonBadge({ seasonIndex, daysRemaining }: SeasonBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
      <span className="font-medium text-slate-700">Season {seasonIndex}</span>
      <span>•</span>
      <span>{daysRemaining} days left</span>
    </div>
  );
}
