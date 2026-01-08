import type { WorldDriftRecap } from "@/types/recap";

type DriftStats = {
  completionRate?: number | null;
  boostsPerActive?: number | null;
  anomaliesPerActive?: number | null;
  avgSessionDurationMs?: number | null;
};

export function buildWorldDrift(stats: DriftStats): WorldDriftRecap {
  const tags: string[] = [];
  const completionRate = stats.completionRate ?? null;
  const boostsPerActive = stats.boostsPerActive ?? null;
  const anomaliesPerActive = stats.anomaliesPerActive ?? null;
  const avgSessionDurationMs = stats.avgSessionDurationMs ?? null;

  if (boostsPerActive !== null) {
    if (boostsPerActive >= 1) {
      tags.push("Community is leaning cooperative");
    } else if (boostsPerActive < 0.3) {
      tags.push("Connections feel sparse");
    }
  }

  if (completionRate !== null) {
    if (completionRate < 40) {
      tags.push("Timeline feels unstable and fragmented");
    } else if (completionRate > 70) {
      tags.push("Days are finishing cleanly");
    }
  }

  if (anomaliesPerActive !== null) {
    if (anomaliesPerActive >= 1) {
      tags.push("Reality is fraying at the edges");
    } else if (anomaliesPerActive < 0.3) {
      tags.push("The signal is quiet this season");
    }
  }

  if (avgSessionDurationMs !== null) {
    if (avgSessionDurationMs >= 12 * 60 * 1000) {
      tags.push("Players are lingering in the day");
    } else if (avgSessionDurationMs < 5 * 60 * 1000) {
      tags.push("Days are passing quickly");
    }
  }

  if (tags.length === 0) {
    tags.push("Season drift is subtle");
  }

  return {
    driftTags: tags.slice(0, 5),
    supportingStats: {
      completionRate,
      boostsPerActive,
      anomaliesPerActive,
      avgSessionDurationMs,
    },
  };
}
