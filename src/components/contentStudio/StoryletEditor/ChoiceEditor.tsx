"use client";

import { useState } from "react";
import type { StoryletChoice } from "@/types/storylets";
import type { ResourceKey } from "@/core/resources/resourceKeys";
import { ResourcePicker } from "../ResourcePicker";
import { OutcomeBuilder } from "./OutcomeBuilder";
import { TagEditor } from "../TagEditor";

interface ChoiceEditorProps {
  choice: StoryletChoice;
  storyletOptions: { value: string; label?: string }[];
  stepKeyOptions?: { value: string; label?: string }[];
  onChange: (updates: Partial<StoryletChoice>) => void;
  /** Called when the user wants to create a new storylet linked to this next_key. */
  onCreateLinkedStorylet?: (stepKey: string) => void;
}

const IDENTITY_TAG_SUGGESTIONS = [
  "risk", "safety", "people", "achievement", "confront", "avoid",
];

const RELATIONSHIP_EVENT_TYPES = [
  "INTRODUCED_SELF", "SHARED_MEAL", "SMALL_KINDNESS", "SHOWED_UP",
  "CONFIDED_IN", "REPAIR_ATTEMPT", "OVERHEARD_NAME", "NOTICED_FACE",
  "WENT_MISSING", "DEFERRED_TENSION", "AWKWARD_MOMENT", "CONFLICT_LOW",
  "DISMISSED", "DISRESPECT", "CONFLICT_HIGH",
];

function countSet(...values: unknown[]): number {
  return values.filter((v) => v !== undefined && v !== null && v !== "" && v !== 0).length;
}

// ── Tiny sub-editors for complex nested fields ─────────────────────────────

function RelationalEffectsEditor({
  effects,
  onChange,
}: {
  effects: Record<string, Record<string, number>>;
  onChange: (effects: Record<string, Record<string, number>> | undefined) => void;
}) {
  const entries = Object.entries(effects);
  const [newNpcId, setNewNpcId] = useState("");

  function setDimension(npcId: string, dim: string, value: number | undefined) {
    const npcState = { ...effects[npcId] };
    if (value === undefined) {
      delete npcState[dim];
    } else {
      npcState[dim] = value;
    }
    const next = { ...effects, [npcId]: npcState };
    // Clean up empty entries
    if (Object.keys(npcState).length === 0) {
      delete next[npcId];
    }
    onChange(Object.keys(next).length ? next : undefined);
  }

  function removeNpc(npcId: string) {
    const next = { ...effects };
    delete next[npcId];
    onChange(Object.keys(next).length ? next : undefined);
  }

  function addNpc() {
    if (!newNpcId.trim()) return;
    onChange({ ...effects, [newNpcId.trim()]: { relationship: 1 } });
    setNewNpcId("");
  }

  return (
    <div className="space-y-2">
      {entries.map(([npcId, dims]) => (
        <div key={npcId} className="rounded border border-slate-200 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-600">{npcId}</span>
            <button
              type="button"
              className="text-xs text-red-400 hover:text-red-600"
              onClick={() => removeNpc(npcId)}
            >✕</button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {["relationship", "trust", "reliability", "emotionalLoad"].map((dim) => (
              <label key={dim} className="text-xs text-slate-500">
                {dim.slice(0, 5)}
                <input
                  type="number"
                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
                  value={dims[dim] ?? ""}
                  onChange={(e) =>
                    setDimension(npcId, dim, e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs font-mono"
          placeholder="npc_id (e.g. npc_floor_miguel)"
          value={newNpcId}
          onChange={(e) => setNewNpcId(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNpc(); } }}
        />
        <button
          type="button"
          className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
          onClick={addNpc}
        >+ NPC</button>
      </div>
    </div>
  );
}

function NpcMemoryEditor({
  memory,
  onChange,
}: {
  memory: Record<string, Record<string, boolean>>;
  onChange: (memory: Record<string, Record<string, boolean>> | undefined) => void;
}) {
  const entries = Object.entries(memory);
  const [newNpcId, setNewNpcId] = useState("");

  function setFlag(npcId: string, flag: string, value: boolean | undefined) {
    const npcState = { ...memory[npcId] };
    if (value === undefined) {
      delete npcState[flag];
    } else {
      npcState[flag] = value;
    }
    const next = { ...memory, [npcId]: npcState };
    if (Object.keys(npcState).length === 0) delete next[npcId];
    onChange(Object.keys(next).length ? next : undefined);
  }

  function removeNpc(npcId: string) {
    const next = { ...memory };
    delete next[npcId];
    onChange(Object.keys(next).length ? next : undefined);
  }

  function addNpc() {
    if (!newNpcId.trim()) return;
    onChange({ ...memory, [newNpcId.trim()]: {} });
    setNewNpcId("");
  }

  function addFlag(npcId: string) {
    const flag = prompt("Flag name (e.g. knows_hometown):");
    if (!flag?.trim()) return;
    setFlag(npcId, flag.trim(), true);
  }

  return (
    <div className="space-y-2">
      {entries.map(([npcId, flags]) => (
        <div key={npcId} className="rounded border border-slate-200 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-600">{npcId}</span>
            <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => removeNpc(npcId)}>✕</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(flags).map(([flag, val]) => (
              <span key={flag} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${val ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {flag}: {val ? "true" : "false"}
                <button type="button" className="text-slate-400 hover:text-slate-700 leading-none" onClick={() => setFlag(npcId, flag, undefined)}>×</button>
              </span>
            ))}
            <button type="button" className="text-xs text-indigo-500 hover:text-indigo-700" onClick={() => addFlag(npcId)}>+ flag</button>
          </div>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs font-mono"
          placeholder="npc_id"
          value={newNpcId}
          onChange={(e) => setNewNpcId(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNpc(); } }}
        />
        <button type="button" className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200" onClick={addNpc}>+ NPC</button>
      </div>
    </div>
  );
}

function EventsEmittedEditor({
  events,
  onChange,
}: {
  events: Array<{ npc_id: string; type: string; magnitude?: number }>;
  onChange: (events: Array<{ npc_id: string; type: string; magnitude?: number }> | undefined) => void;
}) {
  function updateEvent(index: number, updates: Partial<{ npc_id: string; type: string; magnitude?: number }>) {
    const next = events.map((e, i) => (i === index ? { ...e, ...updates } : e));
    onChange(next.length ? next : undefined);
  }

  function removeEvent(index: number) {
    const next = events.filter((_, i) => i !== index);
    onChange(next.length ? next : undefined);
  }

  function addEvent() {
    onChange([...events, { npc_id: "", type: "INTRODUCED_SELF", magnitude: 1 }]);
  }

  return (
    <div className="space-y-2">
      {events.map((event, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_60px_24px] gap-1 items-end">
          <label className="text-xs text-slate-500">
            NPC
            <input
              className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs font-mono"
              value={event.npc_id}
              placeholder="npc_floor_miguel"
              onChange={(e) => updateEvent(i, { npc_id: e.target.value })}
            />
          </label>
          <label className="text-xs text-slate-500">
            Type
            <select
              className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
              value={event.type}
              onChange={(e) => updateEvent(i, { type: e.target.value })}
            >
              {RELATIONSHIP_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Mag
            <input
              type="number"
              className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
              value={event.magnitude ?? 1}
              onChange={(e) => updateEvent(i, { magnitude: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
          <button type="button" className="text-xs text-red-400 hover:text-red-600 pb-0.5" onClick={() => removeEvent(i)}>✕</button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-indigo-500 hover:text-indigo-700"
        onClick={addEvent}
      >+ Add event</button>
    </div>
  );
}

function ReactionTextConditionsEditor({
  conditions,
  onChange,
}: {
  conditions: StoryletChoice["reaction_text_conditions"];
  onChange: (conditions: StoryletChoice["reaction_text_conditions"]) => void;
}) {
  const items = conditions ?? [];

  function updateCondition(index: number, updates: Partial<NonNullable<StoryletChoice["reaction_text_conditions"]>[number]>) {
    const next = items.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange(next.length ? next : undefined);
  }

  function removeCondition(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length ? next : undefined);
  }

  function addCondition() {
    onChange([...items, { if: {}, text: "" }]);
  }

  return (
    <div className="space-y-3">
      {items.map((cond, i) => (
        <div key={i} className="rounded border border-amber-200 bg-amber-50/50 p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Condition {i + 1}</span>
            <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => removeCondition(i)}>✕</button>
          </div>
          <label className="block text-xs text-slate-600">
            If (JSON condition)
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
              value={JSON.stringify(cond.if)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateCondition(i, { if: parsed });
                } catch { /* let user keep typing */ }
              }}
              placeholder='{"money_band": "tight"}'
            />
          </label>
          <label className="block text-xs text-slate-600">
            Text
            <textarea
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
              rows={3}
              value={cond.text}
              onChange={(e) => updateCondition(i, { text: e.target.value })}
            />
          </label>
        </div>
      ))}
      <button type="button" className="text-xs text-amber-600 hover:text-amber-800" onClick={addCondition}>+ Add conditional variant</button>
    </div>
  );
}

// ── Main ChoiceEditor ─────────────────────────────────────────────────────

export function ChoiceEditor({
  choice,
  storyletOptions,
  stepKeyOptions = [],
  onChange,
  onCreateLinkedStorylet,
}: ChoiceEditorProps) {
  const dataListId = `storylet-opts-${choice.id}`;
  const stepKeyListId = `step-key-opts-${choice.id}`;

  const costsCount = countSet(
    choice.time_cost,
    choice.energy_cost,
    choice.requires_resource?.key,
    choice.costs_resource?.key
  );

  const navCount = countSet(
    (choice as unknown as Record<string, unknown>).targetStoryletId,
    choice.next_key,
    choice.sets_track_state?.state,
    choice.money_effect,
    choice.outcome_type
  );

  const outcomeCount = countSet(
    choice.reaction_text,
    (choice.outcome as unknown as Record<string, unknown>)?.text,
    choice.outcomes?.length ? true : undefined
  );

  const npcCount = countSet(
    choice.relational_effects && Object.keys(choice.relational_effects).length ? true : undefined,
    choice.set_npc_memory && Object.keys(choice.set_npc_memory).length ? true : undefined,
    choice.events_emitted?.length ? true : undefined
  );

  const narrativeCount = countSet(
    choice.identity_tags?.length ? true : undefined,
    choice.precludes?.length ? true : undefined,
    choice.skill_modifier,
    choice.skill_requirement,
    choice.sets_expired_opportunity,
    choice.reaction_text_conditions?.length ? true : undefined
  );

  return (
    <div className="space-y-3">
      {/* Identity — always visible */}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          Choice ID
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
            value={choice.id}
            onChange={(e) => onChange({ id: e.target.value })}
          />
        </label>
        <label className="text-xs text-slate-600">
          Label
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={choice.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
      </div>

      {/* Costs & Gates */}
      <details open={costsCount > 0} className="rounded-md border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 select-none">
          Costs &amp; Gates{costsCount > 0 && (
            <span className="ml-2 font-normal text-slate-400">({costsCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Time cost
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.time_cost ?? ""}
                onChange={(e) =>
                  onChange({ time_cost: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </label>
            <label className="text-xs text-slate-600">
              Energy cost
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.energy_cost ?? ""}
                onChange={(e) =>
                  onChange({ energy_cost: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Money requirement (gate)
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.money_requirement ?? ""}
                onChange={(e) =>
                  onChange({ money_requirement: (e.target.value as "tight" | "okay" | "comfortable") || undefined })
                }
              >
                <option value="">None</option>
                <option value="tight">Tight</option>
                <option value="okay">Okay</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </label>
            <label className="text-xs text-slate-600">
              Skill requirement
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
                value={choice.skill_requirement ?? ""}
                placeholder="e.g. assertiveness"
                onChange={(e) => onChange({ skill_requirement: e.target.value || undefined })}
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Requires resource (gate — player must have this to see choice)
            </p>
            <ResourcePicker
              resourceKey={choice.requires_resource?.key}
              amount={choice.requires_resource?.min}
              onChangeKey={(key) =>
                onChange({
                  requires_resource: key
                    ? { key: key as ResourceKey, min: choice.requires_resource?.min ?? 1 }
                    : undefined,
                })
              }
              onChangeAmount={(amount) =>
                onChange({
                  requires_resource: choice.requires_resource?.key
                    ? { key: choice.requires_resource.key, min: amount }
                    : undefined,
                })
              }
              label="Resource key"
              amountLabel="Min"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Costs resource (deducted when choice is selected)
            </p>
            <ResourcePicker
              resourceKey={choice.costs_resource?.key}
              amount={choice.costs_resource?.amount}
              onChangeKey={(key) =>
                onChange({
                  costs_resource: key
                    ? { key: key as ResourceKey, amount: choice.costs_resource?.amount ?? 1 }
                    : undefined,
                })
              }
              onChangeAmount={(amount) =>
                onChange({
                  costs_resource: choice.costs_resource?.key
                    ? { key: choice.costs_resource.key, amount }
                    : undefined,
                })
              }
              label="Resource key"
              amountLabel="Cost"
            />
          </div>
        </div>
      </details>

      {/* Identity Tags & Narrative Effects — NEW */}
      <details open={narrativeCount > 0} className="rounded-md border border-indigo-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 select-none">
          Identity &amp; Narrative{narrativeCount > 0 && (
            <span className="ml-2 font-normal text-indigo-400">({narrativeCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Identity tags (pillar tracking: risk, safety, people, achievement, confront, avoid)
            </p>
            <TagEditor
              tags={choice.identity_tags ?? []}
              onChange={(tags) => onChange({ identity_tags: tags.length ? tags : undefined })}
              suggestions={IDENTITY_TAG_SUGGESTIONS}
              placeholder="Add identity tag…"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Precludes (storylet slugs or states this choice blocks)
            </p>
            <TagEditor
              tags={choice.precludes ?? []}
              onChange={(tags) => onChange({ precludes: tags.length ? tags : undefined })}
              placeholder="Add precluded slug…"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Skill modifier (boosted by this choice)
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
                value={choice.skill_modifier ?? ""}
                placeholder="e.g. practicalHustle"
                onChange={(e) => onChange({ skill_modifier: e.target.value || undefined })}
              />
            </label>
            <label className="text-xs text-slate-600">
              Sets expired opportunity
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.sets_expired_opportunity ?? ""}
                onChange={(e) =>
                  onChange({
                    sets_expired_opportunity: (e.target.value as "academic" | "social" | "financial") || undefined,
                  })
                }
              >
                <option value="">None</option>
                <option value="academic">Academic</option>
                <option value="social">Social</option>
                <option value="financial">Financial</option>
              </select>
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Conditional reaction text (vary prose by player state)
            </p>
            <ReactionTextConditionsEditor
              conditions={choice.reaction_text_conditions}
              onChange={(conditions) => onChange({ reaction_text_conditions: conditions })}
            />
          </div>
        </div>
      </details>

      {/* NPC Effects — NEW */}
      <details open={npcCount > 0} className="rounded-md border border-purple-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-purple-700 hover:text-purple-900 select-none">
          NPC Effects{npcCount > 0 && (
            <span className="ml-2 font-normal text-purple-400">({npcCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Events emitted <span className="text-slate-400">(preferred — triggers relationship engine)</span>
            </p>
            <EventsEmittedEditor
              events={choice.events_emitted ?? []}
              onChange={(events) => onChange({ events_emitted: events })}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Relational effects <span className="text-slate-400">(legacy — direct dimension deltas)</span>
            </p>
            <RelationalEffectsEditor
              effects={choice.relational_effects ?? {}}
              onChange={(effects) => onChange({ relational_effects: effects })}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              Set NPC memory <span className="text-slate-400">(boolean knowledge flags)</span>
            </p>
            <NpcMemoryEditor
              memory={choice.set_npc_memory ?? {}}
              onChange={(memory) => onChange({ set_npc_memory: memory })}
            />
          </div>
        </div>
      </details>

      {/* Navigation & State */}
      <details open={navCount > 0} className="rounded-md border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 select-none">
          Navigation &amp; State{navCount > 0 && (
            <span className="ml-2 font-normal text-slate-400">({navCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Target storylet ID{" "}
              <span className="text-slate-400">(cross-arc jump)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
                list={dataListId}
                value={(choice as unknown as Record<string, unknown>).targetStoryletId as string ?? ""}
                onChange={(e) =>
                  onChange({
                    targetStoryletId: e.target.value || undefined,
                  } as unknown as Partial<StoryletChoice>)
                }
                placeholder="storylet id or slug"
              />
              <datalist id={dataListId}>
                {storyletOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label ?? opt.value}
                  </option>
                ))}
              </datalist>
            </label>
            <div>
              <label className="block text-xs text-slate-600">
                Next storylet key{" "}
                <span className="text-slate-400">(within same track)</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
                  list={stepKeyListId}
                  value={choice.next_key ?? choice.next_key ?? ""}
                  placeholder="e.g. roommate_follow_up"
                  onChange={(e) => {
                    const val = e.target.value || null;
                    onChange({ next_key: val });
                  }}
                />
                {stepKeyOptions.length > 0 && (
                  <datalist id={stepKeyListId}>
                    {stepKeyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label ?? opt.value}
                      </option>
                    ))}
                  </datalist>
                )}
              </label>
              {onCreateLinkedStorylet &&
                (choice.next_key ?? choice.next_key) &&
                !stepKeyOptions.some((o) => o.value === (choice.next_key ?? choice.next_key)) && (
                  <button
                    type="button"
                    className="mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                    onClick={() => onCreateLinkedStorylet((choice.next_key ?? choice.next_key)!)}
                  >
                    ↳ Create &ldquo;{choice.next_key ?? choice.next_key}&rdquo; storylet in this track
                  </button>
                )}
            </div>
          </div>

          <label className="block text-xs text-slate-600">
            Sets track state{" "}
            <span className="text-slate-400">(narrative FSM state for this track)</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
              value={choice.sets_track_state?.state ?? ""}
              placeholder="e.g. genuine_connection"
              onChange={(e) => {
                const state = e.target.value;
                onChange({
                  sets_track_state: state ? { state } : undefined,
                });
              }}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Money effect
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.money_effect ?? ""}
                onChange={(e) =>
                  onChange({
                    money_effect: (e.target.value as "improve" | "worsen") || undefined,
                  })
                }
              >
                <option value="">None</option>
                <option value="improve">Improve</option>
                <option value="worsen">Worsen</option>
              </select>
            </label>
            <label className="block text-xs text-slate-600">
              Outcome type
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.outcome_type ?? ""}
                onChange={(e) =>
                  onChange({
                    outcome_type: (e.target.value as "success" | "fail" | "neutral") || undefined,
                  })
                }
              >
                <option value="">None</option>
                <option value="success">Success</option>
                <option value="neutral">Neutral</option>
                <option value="fail">Fail</option>
              </select>
            </label>
          </div>
        </div>
      </details>

      {/* Outcomes */}
      <details open={outcomeCount > 0} className="rounded-md border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 select-none">
          Outcomes{outcomeCount > 0 && (
            <span className="ml-2 font-normal text-slate-400">({outcomeCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <label className="block text-xs text-slate-600">
            Reaction text (shown after choice)
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              rows={4}
              value={choice.reaction_text ?? ""}
              onChange={(e) =>
                onChange({ reaction_text: e.target.value || null })
              }
            />
          </label>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              Deterministic outcome
            </p>
            <label className="block text-xs text-slate-600">
              Text
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                rows={2}
                value={
                  (choice.outcome as unknown as Record<string, unknown>)?.text as string ?? ""
                }
                onChange={(e) =>
                  onChange({
                    outcome: { ...(choice.outcome ?? {}), text: e.target.value },
                  })
                }
              />
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["energy", "stress"] as const).map((k) => (
                <label key={k} className="text-xs text-slate-600">
                  {k} delta
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                    value={(choice.outcome?.deltas?.[k] as number | undefined) ?? ""}
                    onChange={(e) =>
                      onChange({
                        outcome: {
                          ...(choice.outcome ?? {}),
                          deltas: {
                            ...(choice.outcome?.deltas ?? {}),
                            [k]: e.target.value ? Number(e.target.value) : undefined,
                          },
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <OutcomeBuilder
            outcomes={choice.outcomes ?? []}
            onChange={(outcomes) =>
              onChange({ outcomes: outcomes.length ? outcomes : undefined })
            }
          />
        </div>
      </details>
    </div>
  );
}
