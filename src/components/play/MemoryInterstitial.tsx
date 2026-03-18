"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemoryGame } from "@/components/play/MemoryGame";
import type { DailyRun } from "@/types/dailyRun";

type DayState = NonNullable<DailyRun["dayState"]>;

type Screen = "intro" | "playing" | "result";
type MemoryOutcome = "won" | "gave_up" | "watch";

const RESULT_TEXT: Record<MemoryOutcome, string> = {
  won:
    "You get them all. The order, the images, all of it. Miguel says nice. Someone else says it doesn't count because you had four seconds and that's way more than four seconds. You say nothing. You know what four seconds felt like.",
  gave_up:
    "You get most of them — enough. Not all. The cassette and the socks trip you up at the end. That's the problem with five things. There's always one that slides.",
  watch:
    "You watch from the doorway. They get competitive about it eventually, which is the whole point.",
};

type Props = {
  dayState: DayState | null;
  setDayState: (s: DayState) => void;
  onComplete: () => void;
};

export function MemoryInterstitial({ dayState, setDayState, onComplete }: Props) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [outcome, setOutcome] = useState<MemoryOutcome | null>(null);
  const [showContinue, setShowContinue] = useState(false);

  const applyDeltas = (result: MemoryOutcome) => {
    if (!dayState) return;
    if (result === "won") {
      setDayState({
        ...dayState,
        stress: Math.max(0, Math.min(100, dayState.stress - 1)),
        knowledge: (dayState.knowledge ?? 0) + 2,
      });
    } else if (result === "gave_up") {
      setDayState({
        ...dayState,
        stress: Math.min(100, dayState.stress + 1),
      });
    }
    // watch → no change
  };

  const handleGameResult = (result: "won" | "gave_up") => {
    setOutcome(result);
    applyDeltas(result);
    setScreen("result");
    setTimeout(() => setShowContinue(true), 1500);
  };

  const handleWatch = () => {
    setOutcome("watch");
    applyDeltas("watch");
    setScreen("result");
    setTimeout(() => setShowContinue(true), 1500);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-lg border-2 border-primary/20 bg-card shadow-sm">
      <div className="h-1 bg-border/40" />

      <div className="space-y-5 px-5 py-5">
        {screen === "intro" && (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                That afternoon
              </p>
              <h3 className="font-heading text-xl font-bold leading-snug text-primary">
                The Wall
              </h3>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
                {`Someone on the floor has a thing. They cover the wall — posters, objects, whatever's up there — and give you four seconds to look at it. Then they cover it again and ask you what was there.\n\nMiguel says he's never lost. He says it like a fact, not a challenge.`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setScreen("playing")} className="flex-1">
                Look at the wall
              </Button>
              <Button variant="outline" onClick={handleWatch} className="flex-1">
                Watch this round
              </Button>
            </div>
          </>
        )}

        {screen === "playing" && (
          <>
            <div>
              <h3 className="font-heading text-lg font-bold leading-snug text-primary mb-1">
                The Wall
              </h3>
              <p className="text-xs text-muted-foreground">
                Memorise the tiles — then find the pairs
              </p>
            </div>
            <MemoryGame onResult={handleGameResult} />
            <button
              onClick={() => handleGameResult("gave_up")}
              className="text-xs text-muted-foreground underline underline-offset-2 mt-1"
            >
              Give up
            </button>
          </>
        )}

        {screen === "result" && outcome && (
          <>
            <p className="text-[15px] leading-relaxed text-foreground/85 italic">
              {RESULT_TEXT[outcome]}
            </p>
            {outcome === "won" && (
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                Knowledge +2 · Stress −1
              </p>
            )}
            {outcome === "gave_up" && (
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                Stress +1
              </p>
            )}
            {showContinue && (
              <Button variant="secondary" onClick={onComplete} className="mt-1">
                Continue
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
