import type { DailyPosture, DailyTension } from "@/types/dailyInteraction";

export type StoryletContext = {
  posture: DailyPosture["posture"] | null;
  unresolvedTensionKeys: string[];
  directiveTags?: string[];
};

export function buildStoryletContext(params: {
  posture: DailyPosture | null;
  tensions: DailyTension[];
  directiveTags?: string[];
}): StoryletContext {
  const unresolvedTensionKeys = params.tensions
    .filter((tension) => !tension.resolved_at)
    .map((tension) => tension.key);
  return {
    posture: params.posture?.posture ?? null,
    unresolvedTensionKeys,
    directiveTags: params.directiveTags,
  };
}
