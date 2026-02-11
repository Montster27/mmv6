export type SlicePhaseId =
  | "intro_hook"
  | "guided_core_loop"
  | "reflection_arc"
  | "community_purpose"
  | "remnant_reveal"
  | "cliffhanger";

export type SlicePhase = {
  id: SlicePhaseId;
  label: string;
  window: [number, number];
};

export const SLICE_PHASES: SlicePhase[] = [
  { id: "intro_hook", label: "Intro hook", window: [0, 3] },
  { id: "guided_core_loop", label: "Guided core loop", window: [3, 10] },
  { id: "reflection_arc", label: "Reflection arc", window: [10, 18] },
  { id: "community_purpose", label: "Community purpose", window: [18, 24] },
  { id: "remnant_reveal", label: "Remnant reveal", window: [24, 28] },
  { id: "cliffhanger", label: "Cliffhanger", window: [28, 30] },
];

export function getSlicePhase(params: {
  elapsedMinutes: number;
  allocationSaved: boolean;
  storyletRuns: number;
  socialComplete: boolean;
  reflectionDone: boolean;
}): SlicePhaseId {
  const {
    elapsedMinutes,
    allocationSaved,
    storyletRuns,
    socialComplete,
    reflectionDone,
  } = params;

  const timePhase =
    elapsedMinutes < 3
      ? "intro_hook"
      : elapsedMinutes < 10
        ? "guided_core_loop"
        : elapsedMinutes < 18
          ? "reflection_arc"
          : elapsedMinutes < 24
            ? "community_purpose"
            : elapsedMinutes < 28
              ? "remnant_reveal"
              : "cliffhanger";

  let criteriaPhase: SlicePhaseId = "intro_hook";
  if (allocationSaved) criteriaPhase = "guided_core_loop";
  if (storyletRuns >= 1) criteriaPhase = "reflection_arc";
  if (storyletRuns >= 2 || reflectionDone) criteriaPhase = "community_purpose";
  if (socialComplete) criteriaPhase = "remnant_reveal";
  if (elapsedMinutes >= 28) criteriaPhase = "cliffhanger";

  const order: SlicePhaseId[] = [
    "intro_hook",
    "guided_core_loop",
    "reflection_arc",
    "community_purpose",
    "remnant_reveal",
    "cliffhanger",
  ];
  const timeIndex = order.indexOf(timePhase);
  const criteriaIndex = order.indexOf(criteriaPhase);
  return order[Math.max(timeIndex, criteriaIndex)] ?? "cliffhanger";
}
