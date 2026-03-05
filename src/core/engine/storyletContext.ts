import type { DailyPosture, DailyTension } from "@/types/dailyInteraction";
import type { ResourceSnapshot } from "@/core/resources/resourceDelta";

export type StoryletContext = {
  posture: DailyPosture["posture"] | null;
  unresolvedTensionKeys: string[];
  directiveTags?: string[];
  /** Current resource levels — used for storylet scoring bonuses. */
  resourceSnapshot?: ResourceSnapshot | null;
};

export function buildStoryletContext(params: {
  posture: DailyPosture | null;
  tensions: DailyTension[];
  directiveTags?: string[];
  resourceSnapshot?: ResourceSnapshot | null;
}): StoryletContext {
  const unresolvedTensionKeys = params.tensions
    .filter((tension) => !tension.resolved_at)
    .map((tension) => tension.key);
  return {
    posture: params.posture?.posture ?? null,
    unresolvedTensionKeys,
    directiveTags: params.directiveTags,
    resourceSnapshot: params.resourceSnapshot ?? null,
  };
}
