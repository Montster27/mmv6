"use client";

import type { ReactNode } from "react";
import { TERMS, type TermId } from "@/lib/contentStudio/terms";

/**
 * Wraps a word with a dotted underline and a hover/focus tip drawn from the shared glossary.
 * The tip is plain text in `title` so it works with keyboard focus and screen readers.
 */
export function Term({ id, children }: { id: TermId; children?: ReactNode }) {
  const entry = TERMS[id];
  return (
    <abbr
      title={`${entry.label}: ${entry.short}`}
      tabIndex={0}
      className="cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2"
    >
      {children ?? entry.label}
    </abbr>
  );
}
