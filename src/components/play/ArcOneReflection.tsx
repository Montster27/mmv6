"use client";

import { Button } from "@/components/ui/button";

const OPTIONS = [
  { key: "risk_bias", label: "Take more visible risks." },
  { key: "achievement_bias", label: "Protect my focus." },
  { key: "confront_bias", label: "Address tension early." },
  { key: "people_bias", label: "Lean into connection." },
];

type Props = {
  summaryLines: string[];
  prompt: string;
  submitting?: boolean;
  onSelect: (key: string) => void;
};

export function ArcOneReflection({ summaryLines, prompt, submitting, onSelect }: Props) {
  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-4 space-y-3">
      <h2 className="text-xl font-semibold">Reflection</h2>
      <div className="space-y-2 text-sm text-slate-700">
        {summaryLines.length > 0 ? (
          summaryLines.map((line, index) => <p key={index}>{line}</p>)
        ) : (
          <p>You noticed the tradeoffs in how you moved through the week.</p>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-700">{prompt}</p>
        <div className="flex flex-col gap-2">
          {OPTIONS.map((option) => (
            <Button
              key={option.key}
              variant="outline"
              disabled={submitting}
              onClick={() => onSelect(option.key)}
              className="justify-start"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
