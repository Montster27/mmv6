"use client";

import type { Storylet } from "@/types/storylets";

interface ArcPanelProps {
  storylet: Storylet;
  /** Available arc definitions for the dropdown */
  arcOptions: { id: string; key: string; title: string }[];
  onChange: (updates: Partial<Storylet>) => void;
}

/**
 * Arc membership panel — shown as a tab in the StoryletEditor.
 * Lets you attach any storylet to an arc (making it an arc step)
 * or detach it (making it standalone).
 */
export function ArcPanel({ storylet, arcOptions, onChange }: ArcPanelProps) {
  const isArcStep = Boolean(storylet.arc_id);

  return (
    <div className="space-y-5">
      {/* Arc membership toggle */}
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={isArcStep}
            onChange={(e) => {
              if (!e.target.checked) {
                onChange({
                  arc_id: null,
                  step_key: null,
                  order_index: null,
                  due_offset_days: null,
                  expires_after_days: null,
                  default_next_step_key: null,
                });
              }
            }}
          />
          <span className="font-medium">This storylet belongs to an arc</span>
        </label>
        <p className="mt-1 text-xs text-slate-500 pl-5">
          Arc steps are scheduled with due/expiry windows and advance an arc instance FSM.
          Standalone storylets are selected daily by the weighted pool.
        </p>
      </div>

      {isArcStep && (
        <div className="space-y-4">
          {/* Arc selector */}
          <label className="block text-xs text-slate-600">
            Arc
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              value={storylet.arc_id ?? ""}
              onChange={(e) => onChange({ arc_id: e.target.value || null })}
            >
              <option value="">— select arc —</option>
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
              Step key{" "}
              <span className="text-slate-400">(unique within arc)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
                value={storylet.step_key ?? ""}
                placeholder="e.g. roommate_intro"
                onChange={(e) => onChange({ step_key: e.target.value || null })}
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

          {/* Default next step */}
          <label className="block text-xs text-slate-600">
            Default next step key{" "}
            <span className="text-slate-400">
              (advance to this step if no choice specifies next_step_key)
            </span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
              value={storylet.default_next_step_key ?? ""}
              placeholder="e.g. roommate_follow_up"
              onChange={(e) =>
                onChange({ default_next_step_key: e.target.value || null })
              }
            />
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
