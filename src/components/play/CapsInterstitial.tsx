"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CapsGame } from "@/components/play/CapsGame";
import type { DailyRun } from "@/types/dailyRun";

type DayState = NonNullable<DailyRun["dayState"]>;

type Screen = "intro" | "playing" | "result";
type CapsOutcome = "hit" | "miss" | "watch";

type Props = {
  dayState: DayState | null;
  setDayState: (s: DayState) => void;
  onComplete: () => void;
};

const RESULT_TEXT: Record<CapsOutcome, string> = {
  hit: "The cap spins off and hits the baseboard. Someone says there it is. Cal nods once.",
  miss: "The cap skims wide. Three shots, nothing. 'Good form though,' Cal says, which means nothing and also everything.",
  watch:
    "You lean in the doorway long enough that you're part of it without being in it. That's something.",
};

export function CapsInterstitial({ dayState, setDayState, onComplete }: Props) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [outcome, setOutcome] = useState<CapsOutcome | null>(null);
  const [showContinue, setShowContinue] = useState(false);

  const applyDeltas = (result: CapsOutcome) => {
    if (!dayState) return;
    if (result === "hit") {
      setDayState({
        ...dayState,
        stress: Math.max(0, Math.min(100, dayState.stress - 1)),
        socialLeverage: dayState.socialLeverage + 1,
      });
    } else if (result === "miss") {
      setDayState({
        ...dayState,
        stress: Math.min(100, dayState.stress + 1),
      });
    }
    // watch → no change
  };

  const handleGameResult = (result: "hit" | "miss") => {
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

  const handlePlay = () => {
    setScreen("playing");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-lg border-2 border-primary/20 bg-card shadow-sm">
      <div className="h-1 bg-border/40" />

      <div className="space-y-5 px-5 py-5">
        {screen === "intro" && (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Later that evening
              </p>
              <h3 className="font-heading text-xl font-bold leading-snug text-primary">
                The Floor
              </h3>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
                {`Door 214 is open. Cal has set something up on the carpet — a beer bottle, a cap balanced upside-down on the neck. Three people sitting in a loose circle around it. Someone has a bottle of their own.\n\n"You know caps?"`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePlay} className="flex-1">
                Play
              </Button>
              <Button variant="outline" onClick={handleWatch} className="flex-1">
                Watch from the door
              </Button>
            </div>
          </>
        )}

        {screen === "playing" && (
          <>
            <div>
              <h3 className="font-heading text-lg font-bold leading-snug text-primary mb-1">
                Caps
              </h3>
              <p className="text-xs text-muted-foreground">
                Aim · click &amp; hold to charge · release to shoot
              </p>
            </div>
            <CapsGame onResult={handleGameResult} />
          </>
        )}

        {screen === "result" && outcome && (
          <>
            <p className="text-[15px] leading-relaxed text-foreground/85 italic">
              {RESULT_TEXT[outcome]}
            </p>
            {outcome === "hit" && (
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                Social leverage +1 · Stress −1
              </p>
            )}
            {outcome === "miss" && (
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
