"use client";

import { validateStoryletIssues } from "@/core/validation/storyletValidation";
import type { Storylet } from "@/types/storylets";

interface ValidationPanelProps {
  storylet: Storylet | null;
}

export function ValidationPanel({ storylet }: ValidationPanelProps) {
  if (!storylet) return null;

  const { errors, warnings } = validateStoryletIssues(storylet);

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
        No issues found.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 space-y-2">
      {errors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-700 mb-1">
            Errors ({errors.length})
          </p>
          <ul className="space-y-0.5">
            {errors.map((issue) => (
              <li
                key={`err-${issue.path}-${issue.message}`}
                className="text-xs text-red-600"
              >
                <span className="font-mono text-red-500">{issue.path}</span>:{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-1">
            Warnings ({warnings.length})
          </p>
          <ul className="space-y-0.5">
            {warnings.map((issue) => (
              <li
                key={`warn-${issue.path}-${issue.message}`}
                className="text-xs text-amber-700"
              >
                <span className="font-mono text-amber-600">{issue.path}</span>:{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
