export type PersonalRecap = {
  seasonIndex: number;
  daysPlayed: number;
  completionRate: number | null;
  anomaliesFound: number;
  hypothesesWritten: number;
  boostsSent: number;
  topVector?: string | null;
};

export type WorldDriftRecap = {
  driftTags: string[];
  supportingStats: {
    completionRate?: number | null;
    boostsPerActive?: number | null;
    anomaliesPerActive?: number | null;
    avgSessionDurationMs?: number | null;
  };
};
