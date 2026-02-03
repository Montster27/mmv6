"use client";

import type { UXMessage } from "@/types/messages";

type Props = {
  message: UXMessage;
  variant?: "inline" | "panel";
};

const toneClasses: Record<string, string> = {
  neutral: "border-slate-200 bg-white text-slate-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function MessageCard({ message, variant = "inline" }: Props) {
  const tone = message.tone ?? "neutral";
  const baseStyle =
    message.kind === "tester"
      ? "border-dashed border-slate-300 bg-slate-50 text-slate-700"
      : toneClasses[tone];
  const padding = variant === "panel" ? "px-4 py-3" : "px-3 py-2";

  return (
    <div className={`rounded-md border ${baseStyle} ${padding}`}>
      <div className="flex items-center justify-between">
        {message.title ? (
          <h4 className="text-sm font-semibold">{message.title}</h4>
        ) : (
          <span className="text-xs uppercase tracking-wide text-slate-500">
            {message.kind === "tester" ? "Tester" : "Signal"}
          </span>
        )}
        {message.kind === "tester" ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            TEST
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm">{message.body}</p>
      {message.details ? (
        <p className="mt-1 text-xs text-slate-500">{message.details}</p>
      ) : null}
    </div>
  );
}
