"use client";

import { useState } from "react";
import type { Storylet } from "@/types/storylets";
import { BasicFields } from "./BasicFields";
import { RequirementsPanel } from "./RequirementsPanel";
import { ChoiceList } from "./ChoiceList";
import { ValidationPanel } from "../ValidationPanel";

type Tab = "basic" | "requirements" | "choices" | "raw";

interface StoryletEditorProps {
  storylet: Storylet;
  isNew?: boolean;
  allTags?: string[];
  storyletOptions?: { value: string; label?: string }[];
  onSave: (updated: Storylet) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  saveError?: string | null;
}

export function StoryletEditor({
  storylet: initial,
  isNew = false,
  allTags = [],
  storyletOptions = [],
  onSave,
  onCancel,
  saving = false,
  saveError = null,
}: StoryletEditorProps) {
  const [tab, setTab] = useState<Tab>("basic");
  const [draft, setDraft] = useState<Storylet>(initial);
  const [rawError, setRawError] = useState<string | null>(null);

  function patch(updates: Partial<Storylet>) {
    setDraft((prev) => ({ ...prev, ...updates }));
  }

  async function handleSave() {
    await onSave(draft);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "Basic" },
    { id: "requirements", label: "Requirements" },
    { id: "choices", label: `Choices (${draft.choices?.length ?? 0})` },
    { id: "raw", label: "Raw JSON" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 bg-white shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-indigo-600 text-indigo-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "basic" && (
          <BasicFields
            storylet={draft}
            isNew={isNew}
            allTags={allTags}
            onChange={patch}
          />
        )}

        {tab === "requirements" && (
          <RequirementsPanel
            storylet={draft}
            onChange={patch}
          />
        )}

        {tab === "choices" && (
          <ChoiceList
            choices={draft.choices ?? []}
            storyletOptions={storyletOptions}
            onChange={(choices) => patch({ choices })}
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
                  setDraft(parsed);
                  setRawError(null);
                } catch {
                  setRawError("Invalid JSON — fix before saving.");
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Validation + save */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4 space-y-3">
        <ValidationPanel storylet={draft} />
        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            Save failed: {saveError}
          </p>
        )}
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !!rawError}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Create storylet" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
