"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Storylet } from "@/types/storylets";
import { BasicFields } from "./BasicFields";
import { RequirementsPanel } from "./RequirementsPanel";
import { ChoiceList } from "./ChoiceList";
import { ArcPanel } from "./ArcPanel";
import { ValidationPanel } from "../ValidationPanel";

type Tab = "basic" | "requirements" | "choices" | "arc" | "raw";

interface StoryletEditorProps {
  storylet: Storylet;
  isNew?: boolean;
  allTags?: string[];
  storyletOptions?: { value: string; label?: string }[];
  stepKeyOptions?: { value: string; label?: string }[];
  /** Available arc definitions for the Arc tab dropdown. */
  arcOptions?: { id: string; key: string; title: string }[];
  onSave: (updated: Storylet) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Called when user wants to create a new storylet linked by next_step_key. */
  onCreateLinkedStorylet?: (stepKey: string) => void;
  saving?: boolean;
  saveError?: string | null;
}

export function StoryletEditor({
  storylet: initial,
  isNew = false,
  allTags = [],
  storyletOptions = [],
  stepKeyOptions = [],
  arcOptions = [],
  onSave,
  onDelete,
  onCancel,
  onDirtyChange,
  onCreateLinkedStorylet,
  saving = false,
  saveError = null,
}: StoryletEditorProps) {
  const [tab, setTab] = useState<Tab>("basic");
  const [draft, setDraft] = useState<Storylet>(initial);
  const [rawError, setRawError] = useState<string | null>(null);

  const initialRef = useRef(JSON.stringify(initial));
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== initialRef.current,
    [draft]
  );

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function patch(updates: Partial<Storylet>) {
    setDraft((prev) => ({ ...prev, ...updates }));
  }

  const handleSave = useCallback(async () => {
    if (saving || rawError) return;
    await onSave(draft);
    // Reset the dirty baseline immediately so the guard doesn't fire
    // on subsequent navigation even if the parent hasn't reloaded yet.
    initialRef.current = JSON.stringify(draft);
  }, [draft, onSave, saving, rawError]);

  // Cmd+S / Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSave]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "Basic" },
    { id: "requirements", label: "Requirements" },
    { id: "choices", label: `Choices (${draft.choices?.length ?? 0})` },
    { id: "arc", label: draft.track_id ? "Track \u25cf" : "Track" },
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
        {/* Dirty indicator in tab bar */}
        {isDirty && !isNew && (
          <span className="ml-auto flex items-center text-xs text-amber-600 px-3">
            Unsaved changes
          </span>
        )}
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
            stepKeyOptions={stepKeyOptions}
            onChange={(choices) => patch({ choices })}
            onCreateLinkedStorylet={onCreateLinkedStorylet}
          />
        )}

        {tab === "arc" && (
          <ArcPanel
            storylet={draft}
            arcOptions={arcOptions}
            stepKeyOptions={stepKeyOptions}
            onChange={patch}
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
                  setRawError("Invalid JSON \u2014 fix before saving.");
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
        <div className="flex items-center justify-between gap-3">
          <div>
            {onDelete && !isNew && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete "${draft.title}"? This cannot be undone.`)) {
                    onDelete();
                  }
                }}
                disabled={saving}
                className="rounded-md border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !!rawError}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving\u2026" : isNew ? "Create storylet" : "Save changes"}
            </button>
            <span className="text-xs text-slate-400">\u2318S</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
