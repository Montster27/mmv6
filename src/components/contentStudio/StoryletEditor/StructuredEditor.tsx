"use client";

import { useState } from "react";
import type { Storylet } from "@/types/storylets";
import { BasicFields } from "./BasicFields";
import { RequirementsPanel } from "./RequirementsPanel";
import { ChoiceList } from "./ChoiceList";
import { ArcPanel } from "./ArcPanel";
import { NodesEditor } from "./NodesEditor";

type StructuredTab = "basic" | "requirements" | "choices" | "nodes" | "arc" | "raw";

export interface StructuredEditorProps {
  draft: Storylet;
  isNew: boolean;
  allTags: string[];
  storyletOptions: { value: string; label?: string }[];
  stepKeyOptions: { value: string; label?: string }[];
  arcOptions: { id: string; key: string; title: string }[];
  onChange: (updates: Partial<Storylet>) => void;
  onReplaceAll?: (full: Storylet) => void;
  onCreateLinkedStorylet?: (stepKey: string) => void;
  onRawError?: (hasError: boolean) => void;
}

export function StructuredEditor({
  draft,
  isNew,
  allTags,
  storyletOptions,
  stepKeyOptions,
  arcOptions,
  onChange,
  onReplaceAll,
  onCreateLinkedStorylet,
  onRawError,
}: StructuredEditorProps) {
  const [tab, setTab] = useState<StructuredTab>("basic");
  const [rawError, setRawError] = useState<string | null>(null);

  const nodeCount = Array.isArray(draft.nodes) ? draft.nodes.length : 0;
  const tabs: { id: StructuredTab; label: string }[] = [
    { id: "basic", label: "Basic" },
    { id: "requirements", label: "Requirements" },
    { id: "choices", label: `Choices (${draft.choices?.length ?? 0})` },
    { id: "nodes", label: nodeCount > 0 ? `Nodes (${nodeCount})` : "Nodes" },
    { id: "arc", label: draft.track_id ? "Track ●" : "Track" },
    { id: "raw", label: "Raw JSON" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-200 bg-white shrink-0 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-b-2 border-indigo-600 text-indigo-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "basic" && (
          <BasicFields storylet={draft} isNew={isNew} allTags={allTags} onChange={onChange} />
        )}
        {tab === "requirements" && (
          <RequirementsPanel storylet={draft} onChange={onChange} />
        )}
        {tab === "choices" && (
          <ChoiceList
            choices={draft.choices ?? []}
            storyletOptions={storyletOptions}
            stepKeyOptions={stepKeyOptions}
            onChange={(choices) => onChange({ choices })}
            onCreateLinkedStorylet={onCreateLinkedStorylet}
          />
        )}
        {tab === "nodes" && (
          <NodesEditor nodes={draft.nodes} onChange={(nodes) => onChange({ nodes })} />
        )}
        {tab === "arc" && (
          <ArcPanel
            storylet={draft}
            arcOptions={arcOptions}
            stepKeyOptions={stepKeyOptions}
            onChange={onChange}
          />
        )}
        {tab === "raw" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Edit raw JSON directly. Changes here override form edits on save.
            </p>
            {rawError && (
              <p className="text-xs text-red-600 bg-red-50 rounded p-2">{rawError}</p>
            )}
            <textarea
              className="w-full rounded-md border border-slate-300 font-mono text-xs p-2 leading-relaxed"
              rows={30}
              defaultValue={JSON.stringify(draft, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value) as Storylet;
                  onReplaceAll ? onReplaceAll(parsed) : onChange(parsed as Partial<Storylet>);
                  setRawError(null);
                  onRawError?.(false);
                } catch {
                  setRawError("Invalid JSON — fix before saving.");
                  onRawError?.(true);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
