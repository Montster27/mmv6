"use client";

import { Button } from "@/components/ui/button";

type Props = {
  text: string;
  onContinue: () => void;
};

/**
 * One-sentence transition card shown when a routine week is interrupted
 * by a calendar beat, gate threshold, or NPC patience event.
 * Clicking "Continue" loads the interruption storylet in daily-slot mode.
 */
export function InterruptionTransitionCard({ text, onContinue }: Props) {
  return (
    <div className="rounded-lg border-2 border-[#c1666b]/30 bg-[#faf3e8] px-5 py-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#c1666b]">
        Interruption
      </p>
      <p className="font-heading text-base text-[#1a2744] leading-relaxed">
        {text}
      </p>
      <div className="flex justify-end pt-1">
        <Button
          onClick={onContinue}
          size="sm"
          className="bg-[#1a2744] hover:bg-[#2a3754] text-white"
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
