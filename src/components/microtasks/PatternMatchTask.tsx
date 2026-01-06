"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createPatternMatchRounds } from "@/microtasks/patternMatchV1";

type PatternMatchTaskProps = {
  onComplete: (result: { score: number; duration_ms: number }) => void;
  onSkip: () => void;
};

type Phase = "show" | "choose" | "done";

export function PatternMatchTask({ onComplete, onSkip }: PatternMatchTaskProps) {
  const rounds = useMemo(() => createPatternMatchRounds(3), []);
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("show");
  const [score, setScore] = useState(0);
  const [startTime] = useState(() => Date.now());

  const current = rounds[roundIndex];

  useEffect(() => {
    if (phase !== "show") return;
    const timer = window.setTimeout(() => {
      setPhase("choose");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [phase, roundIndex]);

  const handleChoice = (index: number) => {
    const nextScore = index === current.correctIndex ? score + 1 : score;
    setScore(nextScore);

    if (roundIndex >= rounds.length - 1) {
      setPhase("done");
      onComplete({
        score: nextScore,
        duration_ms: Date.now() - startTime,
      });
      return;
    }

    setRoundIndex((prev) => prev + 1);
    setPhase("show");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Round {roundIndex + 1} of {rounds.length}</span>
        <span>Score: {score}</span>
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center">
        {phase === "show" ? (
          <p className="text-2xl font-semibold tracking-widest">
            {current.sequence}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Choose the matching sequence.
          </p>
        )}
      </div>

      {phase === "choose" ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {current.options.map((option, idx) => (
            <Button
              key={`${option}-${idx}`}
              variant="secondary"
              onClick={() => handleChoice(idx)}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : null}

      <Button variant="ghost" onClick={onSkip} className="px-0 text-sm">
        Skip micro-task
      </Button>
    </div>
  );
}
