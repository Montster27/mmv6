"use client";

import { Button } from "@/components/ui/button";
import type { ReflectionResponse } from "@/types/reflections";

type ReflectionSectionProps = {
  saving: boolean;
  onReflection: (response: ReflectionResponse | "skip") => void;
};

export function ReflectionSection({
  saving,
  onReflection,
}: ReflectionSectionProps) {
  return (
    <section className="space-y-3 rounded-md border border-purple-200 bg-stone-50 px-4 py-4">
      <h2 className="text-xl font-semibold">Reflection</h2>
      <p className="text-slate-500 italic">
        Did you know what to do today?
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => onReflection("yes")}
          className="border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          Yes
        </Button>
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => onReflection("mostly")}
          className="border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          Mostly
        </Button>
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => onReflection("no")}
          className="border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          No
        </Button>
      </div>
      <Button
        variant="outline"
        disabled={saving}
        onClick={() => onReflection("skip")}
        className="border-slate-300 text-slate-600 hover:bg-slate-100"
      >
        Skip for today
      </Button>
      <p className="text-sm text-slate-600">
        Thanks — see you tomorrow.
      </p>
    </section>
  );
}
