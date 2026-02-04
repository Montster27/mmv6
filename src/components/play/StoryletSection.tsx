"use client";

import { Button } from "@/components/ui/button";
import { ConsequenceMoment } from "@/components/storylets/ConsequenceMoment";
import { OutcomeExplain } from "@/components/play/OutcomeExplain";
import { TesterOnly } from "@/components/ux/TesterOnly";
import type { DailyRunStage } from "@/types/dailyRun";

type DeltaInfo = {
  energy?: number;
  stress?: number;
  vectors?: Record<string, number>;
} | null;

type Storylet = {
  id: string;
  title: string;
  body: string;
  [key: string]: unknown;
};

type Choice = {
  id: string;
  label: string;
};

type StoryletRun = {
  id: string;
  [key: string]: unknown;
};

type StoryletSectionProps = {
  stage: DailyRunStage;
  currentStorylet: Storylet | null;
  storylets: Storylet[];
  runs: StoryletRun[];
  choicesDisabled: boolean;
  outcomeMessage: string | null;
  outcomeDeltas: DeltaInfo;
  consequenceActive: boolean;
  lastCheck: { chance: number; success: boolean; factors: Array<{ label: string; weight: number }> } | null;
  onChoice: (choiceId: string) => void;
  onFinishConsequence: () => void;
  toChoices: (storylet: Storylet) => Choice[];
};

export function StoryletSection({
  stage,
  currentStorylet,
  storylets,
  runs,
  choicesDisabled,
  outcomeMessage,
  outcomeDeltas,
  consequenceActive,
  lastCheck,
  onChoice,
  onFinishConsequence,
  toChoices,
}: StoryletSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Step 2: Storylets</h2>
        <span className="text-sm text-slate-600">
          Progress: {Math.min(runs.length, 2)}/2
        </span>
      </div>

      {!currentStorylet ? (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
          {storylets.length === 0 ? (
            <p className="text-slate-700">No more storylets today.</p>
          ) : (
            <p className="text-slate-700">Daily complete</p>
          )}
          <Button className="mt-3" variant="secondary">
            Back tomorrow
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
          <div>
            <p className="text-sm text-slate-600">
              Storylet {stage === "storylet_2" ? 2 : 1} of 2
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              {currentStorylet.title}
            </h3>
            <p className="text-slate-700">{currentStorylet.body}</p>
          </div>
          <div className="space-y-2">
            {(() => {
              const choices = toChoices(currentStorylet);

              return choices.length > 0 ? (
                choices.map((choice) => (
                  <Button
                    key={choice.id}
                    variant="secondary"
                    disabled={choicesDisabled}
                    onClick={() => onChoice(choice.id)}
                    className="w-full justify-start"
                  >
                    {choice.label}
                  </Button>
                ))
              ) : (
                <p className="text-slate-600 text-sm">
                  No choices available.
                </p>
              );
            })()}
            {(outcomeMessage || outcomeDeltas) && !consequenceActive && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                {outcomeMessage ? <p>{outcomeMessage}</p> : null}
                {outcomeDeltas ? (
                  <ul className="mt-1 space-y-0.5 text-slate-700">
                    {typeof outcomeDeltas.energy === "number" ? (
                      <li>
                        Energy {outcomeDeltas.energy >= 0 ? "+" : ""}
                        {outcomeDeltas.energy}
                      </li>
                    ) : null}
                    {typeof outcomeDeltas.stress === "number" ? (
                      <li>
                        Stress {outcomeDeltas.stress >= 0 ? "+" : ""}
                        {outcomeDeltas.stress}
                      </li>
                    ) : null}
                    {outcomeDeltas.vectors
                      ? Object.entries(outcomeDeltas.vectors).map(
                          ([key, delta]) => (
                            <li key={key}>
                              {key}: {delta >= 0 ? "+" : ""}
                              {delta}
                            </li>
                          )
                        )
                      : null}
                  </ul>
                ) : null}
                {lastCheck ? (
                  <TesterOnly>
                    <OutcomeExplain check={lastCheck} />
                  </TesterOnly>
                ) : null}
              </div>
            )}
            {consequenceActive && (
              <ConsequenceMoment
                message={outcomeMessage}
                deltas={outcomeDeltas}
                onDone={onFinishConsequence}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
