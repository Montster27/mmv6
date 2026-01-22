import type { AlignmentEvent, Faction, FactionKey } from "@/types/factions";

type DirectiveSummary = {
  faction_key: string;
  title: string;
  description: string;
  target_type: "initiative" | "arc_unlock" | "signal";
  target_key: string | null;
  week_end_day_index: number;
  status: "active" | "expired" | "completed";
};

type Props = {
  factions: Faction[];
  alignment?: Record<string, number>;
  directive?: DirectiveSummary | null;
  recentEvents?: AlignmentEvent[];
  dayIndex: number;
};

export function FactionStatusPanel({
  factions,
  alignment,
  directive,
  recentEvents,
  dayIndex,
}: Props) {
  const directiveFaction = directive
    ? factions.find((faction) => faction.key === directive.faction_key)
    : null;
  const daysRemaining = directive
    ? Math.max(directive.week_end_day_index - dayIndex + 1, 0)
    : 0;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Factions</h3>
        <p className="text-xs text-slate-500">
          Leadership remains unknown; ideology becomes clearer.
        </p>
      </div>

      {directive ? (
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold text-slate-600">Faction directive</p>
          <p className="text-sm text-slate-800">
            {directiveFaction?.name ?? directive.faction_key}
          </p>
          <p className="text-xs text-slate-600">{directive.title}</p>
          <p className="text-xs text-slate-600">{directive.description}</p>
          <p className="text-xs text-slate-500">{daysRemaining} days remaining</p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">No directive this week.</p>
      )}

      <div className="space-y-2">
        {factions.map((faction) => {
          const score = alignment?.[faction.key] ?? 0;
          const width = Math.min(Math.abs(score), 10) * 10;
          const barClass = score >= 0 ? "bg-slate-800" : "bg-rose-500";
          return (
            <div key={faction.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700">{faction.name}</span>
                <span className="text-xs text-slate-500">{score}</span>
              </div>
              <div className="h-1 w-full rounded bg-slate-100">
                <div
                  className={`h-1 rounded ${barClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {recentEvents && recentEvents.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-600">Recent signals</p>
          <ul className="space-y-1">
            {recentEvents.slice(0, 5).map((event) => {
              const faction = factions.find((item) => item.key === event.faction_key);
              const label = faction?.name ?? event.faction_key;
              const deltaLabel = `${event.delta >= 0 ? "+" : ""}${event.delta}`;
              return (
                <li key={event.id} className="text-xs text-slate-600">
                  {label} {deltaLabel} · {event.source}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
