export type ArcStep = {
  step_id: string;
  storylet_slug: string;
  min_day_gap?: number;
};

export type ArcDefinition = {
  arc_id: string;
  title: string;
  start_day_index: number;
  steps: ArcStep[];
  payoff?: {
    deltas?: {
      stress?: number;
      vectors?: Record<string, number>;
    };
  };
};

export const ARC_DEFINITIONS: ArcDefinition[] = [
  {
    arc_id: "roommate_v1",
    title: "Roommate Tensions",
    start_day_index: 2,
    steps: [
      { step_id: "roommate_1", storylet_slug: "roommate-1" },
      { step_id: "roommate_2", storylet_slug: "roommate-2", min_day_gap: 1 },
      { step_id: "roommate_3", storylet_slug: "roommate-3", min_day_gap: 1 },
      { step_id: "roommate_4", storylet_slug: "roommate-4", min_day_gap: 1 },
    ],
    payoff: {
      deltas: {
        vectors: { social: 2 },
      },
    },
  },
];

export const PRIMARY_ARC_ID = ARC_DEFINITIONS[0]?.arc_id ?? "roommate_v1";

export function getArcDefinition(arcId: string): ArcDefinition | undefined {
  return ARC_DEFINITIONS.find((arc) => arc.arc_id === arcId);
}
