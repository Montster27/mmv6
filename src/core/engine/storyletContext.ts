import type { DailyPosture, DailyTension } from "@/types/dailyInteraction";

export type StoryletContext = {
  posture: DailyPosture["posture"] | null;
  unresolvedTensionKeys: string[];
};

export function buildStoryletContext(params: {
  posture: DailyPosture | null;
  tensions: DailyTension[];
}): StoryletContext {
  const unresolvedTensionKeys = params.tensions
    .filter((tension) => !tension.resolved_at)
    .map((tension) => tension.key);
  return {
    posture: params.posture?.posture ?? null,
    unresolvedTensionKeys,
  };
}
