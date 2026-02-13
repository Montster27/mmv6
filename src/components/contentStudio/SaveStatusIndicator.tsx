"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { SaveState } from "@/hooks/contentStudio";

type Props = {
  saveState: SaveState;
  lastSavedAt: Date | null;
  isDirty: boolean;
  error: string | null;
  onSave: () => void;
  disabled?: boolean;
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 5) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

export function SaveStatusIndicator({
  saveState,
  lastSavedAt,
  isDirty,
  error,
  onSave,
  disabled,
}: Props) {
  const statusText = useMemo(() => {
    if (error) return null; // Show error separately
    if (saveState === "saving") return "Saving...";
    if (saveState === "saved" && lastSavedAt) {
      return `Saved ${formatRelativeTime(lastSavedAt)}`;
    }
    if (isDirty) return "Unsaved changes";
    if (lastSavedAt) return `Saved ${formatRelativeTime(lastSavedAt)}`;
    return null;
  }, [saveState, lastSavedAt, isDirty, error]);

  const statusColor = useMemo(() => {
    if (error || saveState === "error") return "text-red-600";
    if (saveState === "saving") return "text-amber-600";
    if (saveState === "saved") return "text-green-600";
    if (isDirty) return "text-amber-600";
    return "text-slate-500";
  }, [error, saveState, isDirty]);

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {saveState === "saving" && (
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        )}
        {saveState === "saved" && !isDirty && (
          <div className="h-2 w-2 rounded-full bg-green-500" />
        )}
        {(saveState === "error" || error) && (
          <div className="h-2 w-2 rounded-full bg-red-500" />
        )}
        {isDirty && saveState !== "saving" && (
          <div className="h-2 w-2 rounded-full bg-amber-500" />
        )}

        {statusText && (
          <span className={`text-xs ${statusColor}`}>{statusText}</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-600 max-w-[200px] truncate" title={error}>
          {error}
        </span>
      )}

      {/* Manual save button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={disabled || saveState === "saving" || !isDirty}
        className="text-xs"
      >
        {saveState === "saving" ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
