"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/contentStudio/apiClient";
import type { Storylet } from "@/types/storylets";
import { TRACK_LABELS, trackStyle, type TrackKey } from "@/lib/trackPalette";
import { ScriptMode } from "../ScriptMode";
import { NodeGraphMode } from "../NodeGraphMode";
import { PreviewMode } from "../PreviewMode";
import { StudioSidePanel } from "../StudioSidePanel";
import { StructuredEditor } from "./StructuredEditor";
import { getScriptModeGaps, defaultEditorTab } from "./getScriptModeGaps";

type OuterTab = "script" | "nodegraph" | "preview" | "structured";

const TRACK_ORDER: TrackKey[] = [
  "roommate", "academic", "money", "belonging", "opportunity", "home",
];

function resolveTrackKey(arcKey: string): TrackKey | null {
  return TRACK_ORDER.find((k) => k === arcKey || arcKey.includes(k)) ?? null;
}

export interface StoryletEditorProps {
  storylet: Storylet;
  isNew?: boolean;
  allTags?: string[];
  storyletOptions?: { value: string; label?: string }[];
  stepKeyOptions?: { value: string; label?: string }[];
  arcOptions?: { id: string; key: string; title: string }[];
  allStorylets?: Storylet[];
  onSave: (updated: Storylet) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  allStorylets = [],
  onSave,
  onDelete,
  onCancel,
  onDirtyChange,
  onCreateLinkedStorylet,
  saving = false,
  saveError = null,
}: StoryletEditorProps) {
  const [tab, setTab] = useState<OuterTab>(() =>
    defaultEditorTab(initial) === "script" ? "script" : "structured"
  );
  const [draft, setDraft] = useState<Storylet>(initial);
  const [rawError, setRawError] = useState(false);

  const [savedText, setSavedText] = useState(() => JSON.stringify(initial));
  const [latest, setLatest] = useState<Storylet | null>(null);
  const [compareError, setCompareError] = useState("");
  const isDirty = JSON.stringify(draft) !== savedText;

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function patch(updates: Partial<Storylet>) {
    setDraft((prev) => ({ ...prev, ...updates }));
  }

  const handleSave = useCallback(async () => {
    if (saving || rawError) return;
    try {
      await onSave(draft);
      setSavedText(JSON.stringify(draft));
      setLatest(null);
    } catch {
      // Keep unsaved edits and let the parent display the save/conflict error.
    }
  }, [draft, onSave, saving, rawError]);

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

  // Derive track info for chip display
  const arc = arcOptions.find((a) => a.id === draft.track_id);
  const trackKey = arc ? resolveTrackKey(arc.key) : null;
  const trackLabel = trackKey
    ? (TRACK_LABELS.find((t) => t.key === trackKey)?.label ?? trackKey)
    : null;

  const gaps = useMemo(() => getScriptModeGaps(draft), [draft]);

  const outerTabs: { id: OuterTab; label: string }[] = [
    { id: "script", label: "Script" },
    { id: "nodegraph", label: "Node Graph" },
    { id: "preview", label: "Preview" },
    { id: "structured", label: gaps.length > 0 ? `Structured (${gaps.length})` : "Structured" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Canvas head */}
      <div className="canvas-head">
        {onCancel && (
          <button className="btn ghost" onClick={onCancel} title="Back to list"
            style={{ fontSize: 16, padding: "2px 8px" }}>
            ←
          </button>
        )}
        <h2>
          {draft.title || "Untitled"}
          {isDirty && (
            <span style={{ color: "var(--warn)", marginLeft: 5, fontSize: 12, fontWeight: 400 }}>
              unsaved
            </span>
          )}
        </h2>
        {trackLabel && (
          <span className="track-chip" style={trackStyle(trackKey)}>
            <span className="dot" />
            {trackLabel}
          </span>
        )}
        {draft.storylet_key && (
          <span className="sub mono">{draft.storylet_key}</span>
        )}
        {draft.due_offset_days != null && (
          <span className="sub">
            D{draft.due_offset_days}
            {draft.segment ? `/${draft.segment.slice(0, 3)}` : ""}
          </span>
        )}
        {!isNew && (
          <span
            style={{
              fontSize: 10, padding: "2px 6px", borderRadius: 4,
              background: draft.is_active ? "#dcfce7" : "#f1f5f9",
              color: draft.is_active ? "#15803d" : "var(--ink-4)",
            }}
          >
            {draft.is_active ? "active" : "draft"}
          </span>
        )}

        <div className="right">
          {onDelete && !isNew && (
            <button
              className="btn"
              style={{ color: "var(--bad)", borderColor: "#fca5a5" }}
              onClick={() => {
                if (confirm(`Delete "${draft.title}"? This cannot be undone.`)) onDelete();
              }}
              disabled={saving}
            >
              Delete
            </button>
          )}
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={saving || rawError}
          >
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </button>
          <span className="kbd">⌘S</span>
        </div>
      </div>

      {!isNew && saveError && /revision|changed|reload/i.test(saveError) && <div className="space-y-2 border-b border-amber-200 bg-amber-50 p-3 text-sm">
        <p>Your draft is preserved. Compare the current saved version before retrying.</p>
        <button className="btn" onClick={async () => {
          const result = await apiRequest<{ storylet: Storylet }>(`/api/admin/storylets/${draft.id}`);
          if (result.data) { setLatest(result.data.storylet); setCompareError(""); }
          else setCompareError(result.error ?? "Could not load current version");
        }}>Load version to compare</button>
        {compareError && <p role="alert">{compareError}</p>}
        {latest && <><div className="grid gap-3 md:grid-cols-2"><details><summary>Current saved version</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(latest,null,2)}</pre></details><details><summary>Your unsaved version</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(draft,null,2)}</pre></details></div><button className="btn" onClick={() => { setDraft({ ...draft, _studio_revision: latest._studio_revision }); setLatest(null); }}>I compared both; keep my draft for the next save</button></>}
      </div>}

      {/* Outer tab bar */}
      <div className="tabbar">
        {outerTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor shell: main pane + side panel */}
      <div className="editor-shell">
        <div className="editor-pane">
          {tab === "script" && (
            <ScriptMode draft={draft} onChange={patch} />
          )}
          {tab === "nodegraph" && (
            <NodeGraphMode draft={draft} allStorylets={allStorylets} />
          )}
          {tab === "preview" && (
            <PreviewMode
              draft={draft}
              allStorylets={allStorylets}
              arcDefinitions={arcOptions}
            />
          )}
          {tab === "structured" && (
            <StructuredEditor
              draft={draft}
              isNew={isNew}
              allTags={allTags}
              storyletOptions={storyletOptions}
              stepKeyOptions={allStorylets.length ? allStorylets.filter((s) => s.track_id === draft.track_id && s.storylet_key).map((s) => ({ value: s.storylet_key!, label: s.title })) : stepKeyOptions}
              arcOptions={arcOptions}
              onChange={patch}
              onReplaceAll={(full) => setDraft(full)}
              onCreateLinkedStorylet={onCreateLinkedStorylet}
              onRawError={setRawError}
            />
          )}
        </div>

        <div className="editor-side">
          <StudioSidePanel
            draft={draft}
            allStorylets={allStorylets}
            arcOptions={arcOptions}
            trackKey={trackKey}
          />
        </div>
      </div>

      {saveError && (
        <div
          style={{
            padding: "8px 16px", flexShrink: 0,
            background: "#fff5f5", borderTop: "1px solid #fca5a5",
            color: "var(--bad)", fontSize: 12,
          }}
        >
          Save failed: {saveError}
        </div>
      )}
    </div>
  );
}
