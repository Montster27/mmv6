"use client";

import type { Storylet } from "@/types/storylets";
import { TagEditor } from "../TagEditor";
import { NPC_REGISTRY } from "@/domain/npcs/registry";

const PHASE_OPTIONS = [
  "intro_hook",
  "guided_core_loop",
  "reflection_arc",
  "community_purpose",
] as const;

const RESOURCE_GATE_KEYS = [
  { key: "requires_cash_min", label: "Cash min" },
  { key: "requires_knowledge_min", label: "Knowledge min" },
  { key: "requires_social_leverage_min", label: "Social leverage min" },
  { key: "requires_physical_resilience_min", label: "Physical resilience min" },
] as const;

interface RequirementsPanelProps {
  storylet: Storylet;
  onChange: (updates: Partial<Storylet>) => void;
}

function getReq(storylet: Storylet, key: string): unknown {
  return (storylet.requirements ?? {})[key];
}

function setReq(
  storylet: Storylet,
  key: string,
  value: unknown
): Partial<Storylet> {
  const req = { ...(storylet.requirements ?? {}) };
  if (value === "" || value === undefined || value === null) {
    delete req[key];
  } else {
    req[key] = value;
  }
  return { requirements: req };
}

export function RequirementsPanel({ storylet, onChange }: RequirementsPanelProps) {
  const req = storylet.requirements ?? {};

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          Min day index
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={(req.min_day_index as number | undefined) ?? ""}
            onChange={(e) =>
              onChange(
                setReq(
                  storylet,
                  "min_day_index",
                  e.target.value ? Number(e.target.value) : undefined
                )
              )
            }
          />
        </label>
        <label className="text-xs text-slate-600">
          Max day index
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={(req.max_day_index as number | undefined) ?? ""}
            onChange={(e) =>
              onChange(
                setReq(
                  storylet,
                  "max_day_index",
                  e.target.value ? Number(e.target.value) : undefined
                )
              )
            }
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          Min season index
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={(req.min_season_index as number | undefined) ?? ""}
            onChange={(e) =>
              onChange(
                setReq(
                  storylet,
                  "min_season_index",
                  e.target.value ? Number(e.target.value) : undefined
                )
              )
            }
          />
        </label>
        <label className="text-xs text-slate-600">
          Max season index
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={(req.max_season_index as number | undefined) ?? ""}
            onChange={(e) =>
              onChange(
                setReq(
                  storylet,
                  "max_season_index",
                  e.target.value ? Number(e.target.value) : undefined
                )
              )
            }
          />
        </label>
      </div>

      <label className="block text-xs text-slate-600">
        Trigger phase
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={(req.trigger_phase as string | undefined) ?? ""}
          onChange={(e) =>
            onChange(setReq(storylet, "trigger_phase", e.target.value || undefined))
          }
        >
          <option value="">Any phase</option>
          {PHASE_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-slate-600">
        Max total runs
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={(req.max_total_runs as number | undefined) ?? ""}
          onChange={(e) =>
            onChange(
              setReq(
                storylet,
                "max_total_runs",
                e.target.value ? Number(e.target.value) : undefined
              )
            )
          }
        />
      </label>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">
          Resource gates (minimum values required)
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {RESOURCE_GATE_KEYS.map(({ key, label }) => (
            <label key={key} className="text-xs text-slate-600">
              {label}
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={(req[key] as number | undefined) ?? ""}
                onChange={(e) =>
                  onChange(
                    setReq(
                      storylet,
                      key,
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  )
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-600 mb-1">Requires NPC met</p>
          <TagEditor
            tags={Array.isArray(req.requires_npc_met) ? (req.requires_npc_met as string[]) : []}
            onChange={(next) =>
              onChange(setReq(storylet, "requires_npc_met", next.length ? next : undefined))
            }
            suggestions={NPC_REGISTRY.map((n) => n.id)}
            placeholder="Add NPC requirement..."
          />
        </div>
        <div>
          <p className="text-xs text-slate-600 mb-1">Requires NPC NOT met</p>
          <TagEditor
            tags={Array.isArray(req.requires_npc_not_met) ? (req.requires_npc_not_met as string[]) : []}
            onChange={(next) =>
              onChange(setReq(storylet, "requires_npc_not_met", next.length ? next : undefined))
            }
            suggestions={NPC_REGISTRY.map((n) => n.id)}
            placeholder="Add NPC exclusion..."
          />
        </div>
      </div>

      <label className="block text-xs text-slate-600">
        Requires NOT precluded (slug)
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono text-xs"
          value={(req.requires_not_precluded as string | undefined) ?? ""}
          onChange={(e) =>
            onChange(
              setReq(storylet, "requires_not_precluded", e.target.value || undefined)
            )
          }
          placeholder="e.g. s5_opportunity_expired"
        />
        <span className="text-slate-400 text-xs">
          Hides this storylet permanently if the named slug is in the player&rsquo;s preclusion gates.
        </span>
      </label>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">
          Requires money band{" "}
          <span className="ml-1 text-slate-400 cursor-help font-normal" title="Player's financial tier: 'tight' = struggling, 'okay' = managing, 'comfortable' = stable. Leave all unchecked to show at any money band.">[?]</span>
        </p>
        <div className="flex gap-3">
          {(["tight", "okay", "comfortable"] as const).map((band) => {
            const current = Array.isArray(req.requires_money_band)
              ? (req.requires_money_band as string[])
              : [];
            const checked = current.includes(band);
            return (
              <label key={band} className="flex items-center gap-1 text-xs text-slate-600 capitalize">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? current.filter((b) => b !== band)
                      : [...current, band];
                    onChange(
                      setReq(storylet, "requires_money_band", next.length ? next : undefined)
                    );
                  }}
                />
                {band}
              </label>
            );
          })}
        </div>
        <span className="text-slate-400 text-xs">
          Leave all unchecked to show at any money band.
        </span>
      </div>

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-700">
          Raw requirements JSON
        </summary>
        <pre className="mt-2 rounded-md bg-slate-100 p-2 text-xs overflow-auto max-h-40">
          {JSON.stringify(req, null, 2)}
        </pre>
      </details>
    </div>
  );
}
