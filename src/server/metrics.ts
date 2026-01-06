import "server-only";

import { getAdminClient } from "@/lib/supabaseAdmin";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type EventRow = {
  user_id: string;
  event_type: string;
  stage: string | null;
  ts: string;
  payload: Record<string, unknown> | null;
};

export type DailyMetric = {
  date: string;
  dau: number;
  sessions: number;
  completions: number;
  completion_rate: number | null;
};

export type StageAverage = {
  stage: string;
  avg_duration_ms: number | null;
  count: number;
};

export type MetricsSummary = {
  dau_today: number;
  completion_rate_today: number | null;
  avg_session_duration_ms: number | null;
  reflection_skip_rate: number | null;
  social_skip_rate: number | null;
  retention: {
    d1: number | null;
    d3: number | null;
    d7: number | null;
  };
};

export type MetricsResponse = {
  range: { start: string; end: string; days: number };
  summary: MetricsSummary;
  daily: DailyMetric[];
  stage_averages: StageAverage[];
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function buildDateRange(days: number) {
  const today = startOfUtcDay(new Date());
  const end = new Date(today.getTime() + MS_PER_DAY);
  const start = new Date(end.getTime() - days * MS_PER_DAY);
  return { start, end };
}

function listDateKeys(start: Date, days: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start.getTime() + i * MS_PER_DAY);
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
}

function avg(total: number, count: number): number | null {
  if (count <= 0) return null;
  return total / count;
}

function computeRetention(
  dayKeys: string[],
  sessionsByDay: Map<string, Set<string>>,
  offsetDays: number
): number | null {
  let baseTotal = 0;
  let retained = 0;
  for (let i = 0; i + offsetDays < dayKeys.length; i += 1) {
    const baseKey = dayKeys[i];
    const nextKey = dayKeys[i + offsetDays];
    const base = sessionsByDay.get(baseKey);
    if (!base || base.size === 0) continue;
    const next = sessionsByDay.get(nextKey) ?? new Set<string>();
    baseTotal += base.size;
    for (const userId of base) {
      if (next.has(userId)) retained += 1;
    }
  }
  if (baseTotal === 0) return null;
  return (retained / baseTotal) * 100;
}

export async function fetchMetrics(days = 14): Promise<MetricsResponse> {
  const rangeDays = Math.max(1, Math.min(days, 60));
  const { start, end } = buildDateRange(rangeDays);
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("events")
    .select("user_id,event_type,stage,ts,payload")
    .gte("ts", start.toISOString())
    .lt("ts", end.toISOString());

  if (error) {
    console.error("Failed to load events for metrics", error);
    throw error;
  }

  const events: EventRow[] = data ?? [];
  const dayKeys = listDateKeys(start, rangeDays);

  const sessionsByDay = new Map<string, Set<string>>();
  const completionsByDay = new Map<string, Set<string>>();
  const reflectionSkipsByDay = new Map<string, Set<string>>();
  const socialSkipsByDay = new Map<string, Set<string>>();
  const sessionTimes = new Map<string, { start?: number; end?: number }>();
  const stageDurations = new Map<string, { total: number; count: number }>();

  for (const event of events) {
    const dayKey = toDateKey(event.ts);

    if (event.event_type === "session_start") {
      const set = sessionsByDay.get(dayKey) ?? new Set<string>();
      set.add(event.user_id);
      sessionsByDay.set(dayKey, set);

      const key = `${dayKey}:${event.user_id}`;
      const current = sessionTimes.get(key) ?? {};
      const ts = Date.parse(event.ts);
      if (!Number.isNaN(ts)) {
        current.start = current.start ? Math.min(current.start, ts) : ts;
        sessionTimes.set(key, current);
      }
    }

    if (event.event_type === "session_end") {
      const key = `${dayKey}:${event.user_id}`;
      const current = sessionTimes.get(key) ?? {};
      const ts = Date.parse(event.ts);
      if (!Number.isNaN(ts)) {
        current.end = current.end ? Math.max(current.end, ts) : ts;
        sessionTimes.set(key, current);
      }
    }

    if (event.event_type === "stage_complete" && event.stage === "complete") {
      const set = completionsByDay.get(dayKey) ?? new Set<string>();
      set.add(event.user_id);
      completionsByDay.set(dayKey, set);
    }

    if (event.event_type === "stage_complete") {
      const payload = event.payload ?? {};
      const duration = payload.duration_ms;
      if (typeof duration === "number" && Number.isFinite(duration)) {
        const stageKey = event.stage ?? "unknown";
        const current = stageDurations.get(stageKey) ?? { total: 0, count: 0 };
        current.total += duration;
        current.count += 1;
        stageDurations.set(stageKey, current);
      }
    }

    if (event.event_type === "reflection_skip") {
      const set = reflectionSkipsByDay.get(dayKey) ?? new Set<string>();
      set.add(event.user_id);
      reflectionSkipsByDay.set(dayKey, set);
    }

    if (event.event_type === "social_skip") {
      const set = socialSkipsByDay.get(dayKey) ?? new Set<string>();
      set.add(event.user_id);
      socialSkipsByDay.set(dayKey, set);
    }
  }

  const daily: DailyMetric[] = dayKeys.map((day) => {
    const sessions = sessionsByDay.get(day)?.size ?? 0;
    const completions = completionsByDay.get(day)?.size ?? 0;
    const completion_rate = sessions > 0 ? (completions / sessions) * 100 : null;
    return {
      date: day,
      dau: sessions,
      sessions,
      completions,
      completion_rate,
    };
  });

  let totalSessionDuration = 0;
  let sessionDurationCount = 0;
  for (const entry of sessionTimes.values()) {
    if (entry.start && entry.end && entry.end >= entry.start) {
      totalSessionDuration += entry.end - entry.start;
      sessionDurationCount += 1;
    }
  }

  const avgSessionDurationMs = avg(totalSessionDuration, sessionDurationCount);

  const reflectionSkips = Array.from(reflectionSkipsByDay.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );
  const socialSkips = Array.from(socialSkipsByDay.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );
  const totalSessions = Array.from(sessionsByDay.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );

  const stage_averages: StageAverage[] = Array.from(stageDurations.entries())
    .map(([stage, stats]) => ({
      stage,
      avg_duration_ms: avg(stats.total, stats.count),
      count: stats.count,
    }))
    .sort((a, b) => a.stage.localeCompare(b.stage));

  const todayMetrics = daily[daily.length - 1] ?? null;

  return {
    range: {
      start: dayKeys[0],
      end: dayKeys[dayKeys.length - 1],
      days: rangeDays,
    },
    summary: {
      dau_today: todayMetrics?.dau ?? 0,
      completion_rate_today: todayMetrics?.completion_rate ?? null,
      avg_session_duration_ms: avgSessionDurationMs,
      reflection_skip_rate: totalSessions > 0 ? (reflectionSkips / totalSessions) * 100 : null,
      social_skip_rate: totalSessions > 0 ? (socialSkips / totalSessions) * 100 : null,
      retention: {
        d1: computeRetention(dayKeys, sessionsByDay, 1),
        d3: computeRetention(dayKeys, sessionsByDay, 3),
        d7: computeRetention(dayKeys, sessionsByDay, 7),
      },
    },
    daily,
    stage_averages,
  };
}
