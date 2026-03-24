"use client";

import type { Storylet } from "@/types/storylets";

interface ArcPanelProps {
  storylet: Storylet;
  /** Available arc definitions for the dropdown */
  arcOptions: { id: string; key: string; title: string }[];
  stepKeyOptions?: { value: string; label?: string }[];
  onChange: (updates: Partial<Storylet>) => void;
}

/**
 * Track membership panel — shown as a tab in the StoryletEditor.
 * Lets you attach any storylet to a track (making it a track storylet)
 * or detach it (making it standalone).
 */
export function ArcPanel({ storylet, arcOptions, stepKeyOptions = [], onChange }: ArcPanelProps) {
  const isTrackStorylet = Boolean(storylet.track_id);

  return (
    <div className="space-y-5">
      {/* Arc membership toggle */}
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={isTrackStorylet}
            onChange={(e) => {
              if (!e.target.checked) {
                onChange({
                  track_id: null,
                  storylet_key: null,
                  order_index: null,
                  due_offset_days: null,
                  expires_after_days: null,
                  default_next_key: null,
                });
              }
            }}
          />
          <span className="font-medium">This storylet belongs to a track</span>
        </label>
        <p className="mt-1 text-xs text-slate-500 pl-5">
          Arc steps are scheduled with due/expiry windows and advance an arc instance FSM.
          Standalone storylets are selected daily by the weighted pool.
        </p>
      </div>

      {isTrackStorylet && (
        <div className="space-y-4">
          {/* Track selector */}
          <label className="block text-xs text-slate-600">
            Track
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              value={storylet.track_id ?? ""}
              onChange={(e) => onChange({ track_id: e.target.value || null })}
            >
              <option value="">— select track —</option>
              {arcOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.key})
                </option>
              ))}
            </select>
          </label>

          {/* Step key + order */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Storylet key{" "}
              <span className="text-slate-400">(unique within track)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={storylet.storylet_key ?? ""}
                placeholder="e.g. roommate_intro"
                onChange={(e) => onChange({ storylet_key: e.target.value || null })}
              />
            </label>
            <label className="text-xs text-slate-600">
              Order index
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={storylet.order_index ?? ""}
                placeholder="0"
                onChange={(e) =>
                  onChange({
                    order_index: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
          </div>

          {/* Scheduling */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Due offset (days after arc start)
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={storylet.due_offset_days ?? ""}
                placeholder="0"
                onChange={(e) =>
                  onChange({
                    due_offset_days: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label className="text-xs text-slate-600">
              Expires after (days)
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={storylet.expires_after_days ?? ""}
                placeholder="3"
                onChange={(e) =>
                  onChange({
                    expires_after_days: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
          </div>

          {/* Default next storylet */}
          <label className="block text-xs text-slate-600">
            Default next storylet key{" "}
            <span className="text-slate-400">
              (advance to this if no choice specifies next_key)
            </span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
              list="arc-panel-step-keys"
              value={storylet.default_next_key ?? ""}
              placeholder="e.g. roommate_follow_up"
              onChange={(e) => onChange({ default_next_key: e.target.value || null })}
            />
            {stepKeyOptions.length > 0 && (
              <datalist id="arc-panel-step-keys">
                {stepKeyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label ?? opt.value}
                  </option>
                ))}
              </datalist>
            )}
          </label>

          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <strong>Cross-arc linking:</strong> Any choice can set{" "}
            <code className="bg-blue-100 rounded px-1">targetStoryletId</code> to jump
            to a storylet in a different arc. The arc instance for the target arc will
            be started or advanced automatically.
          </div>
        </div>
      )}
    </div>
  );
}
