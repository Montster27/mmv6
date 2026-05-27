"use client";

import { useState } from "react";

import { HANDLE_REGEX } from "@/lib/newsnet";
import { Button } from "@/components/ui/button";

import { useNewsNetApi } from "./useNewsNetApi";

interface HandleSetupModalProps {
  onHandleSet: (handle: string) => void;
}

/**
 * Blocks the board view until the player picks a handle. Set-once: there
 * is no "skip" or "change later" option in this build.
 */
export function HandleSetupModal({ onHandleSet }: HandleSetupModalProps) {
  const { setHandle } = useNewsNetApi();
  const [handle, setHandleInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localValid = HANDLE_REGEX.test(handle.trim());

  async function handleSubmit() {
    if (!localValid || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await setHandle(handle.trim());
    setSubmitting(false);
    if ("handle" in result && typeof result.handle === "string") {
      onHandleSet(result.handle);
      return;
    }
    // SetHandleErrorKind shape
    if ("kind" in result) {
      if (result.kind === "already_set" && result.existing) {
        // Edge case: a second tab set it first. Adopt the existing handle silently.
        onHandleSet(result.existing);
        return;
      }
      setError(result.detail);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-6 font-mono text-sm text-stone-100">
      <p className="text-amber-200">NewsNet handle:</p>
      <input
        type="text"
        value={handle}
        onChange={(e) => setHandleInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && localValid) handleSubmit();
        }}
        placeholder="e.g. spider84"
        autoFocus
        maxLength={20}
        className="block w-full rounded border border-amber-900/30 bg-stone-900 px-2 py-2 font-mono text-base text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
      />
      <p className="text-xs text-stone-400">
        2–20 characters · letters, numbers, underscore · set once.
      </p>
      <div className="min-h-[1.25rem] text-xs text-red-300">{error ?? ""}</div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!localValid || submitting}>
          {submitting ? "Setting…" : "Set handle"}
        </Button>
      </div>
    </div>
  );
}
