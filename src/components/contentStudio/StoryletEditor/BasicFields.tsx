"use client";

import type { Storylet } from "@/types/storylets";
import { TagEditor } from "../TagEditor";

const PHASE_OPTIONS = [
  "intro_hook",
  "guided_core_loop",
  "reflection_arc",
  "community_purpose",
] as const;

type PhaseOption = (typeof PHASE_OPTIONS)[number];

function getPhase(tags?: string[]): string {
  if (!tags) return "";
  return PHASE_OPTIONS.find((p) => tags.includes(p)) ?? "";
}

function setPhase(tags: string[], phase: string): string[] {
  const without = tags.filter((t) => !(PHASE_OPTIONS as readonly string[]).includes(t));
  return phase ? [...without, phase as PhaseOption] : without;
}

function getNonPhaseTags(tags?: string[]): string[] {
  return (tags ?? []).filter(
    (t) => !(PHASE_OPTIONS as readonly string[]).includes(t)
  );
}

function FieldHint({ text }: { text: string }) {
  return (
    <span className="ml-1 text-slate-400 cursor-help" title={text}>
      [?]
    </span>
  );
}

const NPC_ID_SUGGESTIONS = [
  "npc_roommate_dana",
  "npc_floor_miguel",
  "npc_floor_cal",
  "npc_prof_marsh",
  "npc_studious_priya",
  "npc_ambiguous_jordan",
  "npc_ra_scott",
  "npc_parent_voice",
];

interface BasicFieldsProps {
  storylet: Storylet;
  isNew: boolean;
  allTags: string[];
  onChange: (updates: Partial<Storylet>) => void;
}

export function BasicFields({
  storylet,
  isNew,
  allTags,
  onChange,
}: BasicFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          ID{" "}
          {!isNew && (
            <span className="ml-1 text-slate-400">(read-only)</span>
          )}
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
            value={storylet.id}
            readOnly={!isNew}
            onChange={(e) => onChange({ id: e.target.value })}
          />
        </label>
        <label className="text-xs text-slate-600">
          Slug
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
            value={storylet.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
          />
        </label>
      </div>

      <label className="block text-xs text-slate-600">
        Title
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={storylet.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>

      <label className="block text-xs text-slate-600">
        Body
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          rows={6}
          value={storylet.body}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      </label>

      {/* Introduces NPC — NEW */}
      <div>
        <p className="text-xs text-slate-600 mb-1">
          Introduces NPC
          <FieldHint text="NPC IDs whose short_intro is prepended to body text if not yet met. After any choice, these NPCs are auto-marked met." />
        </p>
        <TagEditor
          tags={storylet.introduces_npc ?? []}
          onChange={(npcs) => onChange({ introduces_npc: npcs.length ? npcs : undefined })}
          suggestions={NPC_ID_SUGGESTIONS}
          placeholder="Add NPC ID…"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-600">
          Weight
          <FieldHint text="Higher weight = more likely selected from the daily pool. Default 100. Set to 0 to effectively disable." />
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={storylet.weight ?? 100}
            onChange={(e) => onChange({ weight: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs text-slate-600">
          Phase
          <FieldHint text="Controls storylet availability by game phase. Storylets tagged with a phase only appear during that phase. Blank = all phases." />
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={getPhase(storylet.tags)}
            onChange={(e) =>
              onChange({ tags: setPhase(storylet.tags ?? [], e.target.value) })
            }
          >
            <option value="">All phases</option>
            {PHASE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Phase is stored as a tag ({getPhase(storylet.tags) || "none"}) and controls when this storylet can appear.
          </p>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600 pt-4">
          <input
            type="checkbox"
            checked={storylet.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
          />
          Active
        </label>
      </div>

      <div>
        <p className="text-xs text-slate-600 mb-1">Tags</p>
        <TagEditor
          tags={getNonPhaseTags(storylet.tags)}
          onChange={(next) => {
            const phaseTags = (storylet.tags ?? []).filter((t) =>
              (PHASE_OPTIONS as readonly string[]).includes(t)
            );
            onChange({ tags: [...phaseTags, ...next] });
          }}
          suggestions={allTags.filter(
            (t) => !(PHASE_OPTIONS as readonly string[]).includes(t)
          )}
          placeholder="Add tag…"
        />
      </div>
    </div>
  );
}
