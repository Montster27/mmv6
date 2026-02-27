import type { DailyState } from "@/types/daily";
import type {
  ArcOneState,
  EnergyLevel,
  ExpiredOpportunity,
  LifePressureState,
  MoneyBand,
  NpcMemory,
  SkillFlags,
} from "@/core/arcOne/types";

const DEFAULT_LIFE_PRESSURE: LifePressureState = {
  risk: 0,
  safety: 0,
  people: 0,
  achievement: 0,
  confront: 0,
  avoid: 0,
};

const DEFAULT_SKILL_FLAGS: SkillFlags = {
  studyDiscipline: 0,
  socialEase: 0,
  assertiveness: 0,
  practicalHustle: 0,
};

export function normalizeEnergyLevel(value: unknown): EnergyLevel {
  if (value === "moderate" || value === "low") return value;
  return "high";
}

export function deriveEnergyLevel(energy: number): EnergyLevel {
  // TODO(arc-one): tune energy regeneration and thresholds.
  if (energy >= 70) return "high";
  if (energy >= 40) return "moderate";
  return "low";
}

export function normalizeMoneyBand(value: unknown): MoneyBand {
  if (value === "tight" || value === "comfortable") return value;
  return "okay";
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLifePressure(raw: unknown): LifePressureState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_LIFE_PRESSURE };
  }
  const record = raw as Record<string, unknown>;
  return {
    risk: normalizeNumber(record.risk),
    safety: normalizeNumber(record.safety),
    people: normalizeNumber(record.people),
    achievement: normalizeNumber(record.achievement),
    confront: normalizeNumber(record.confront),
    avoid: normalizeNumber(record.avoid),
  };
}

function normalizeSkillFlags(raw: unknown): SkillFlags {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_SKILL_FLAGS };
  }
  const record = raw as Record<string, unknown>;
  return {
    studyDiscipline: normalizeNumber(record.studyDiscipline),
    socialEase: normalizeNumber(record.socialEase),
    assertiveness: normalizeNumber(record.assertiveness),
    practicalHustle: normalizeNumber(record.practicalHustle),
  };
}

function normalizeNpcMemory(raw: unknown): NpcMemory {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const next: NpcMemory = {};
  Object.entries(record).forEach(([key, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const entry = value as Record<string, unknown>;
    next[key] = {
      trust: normalizeNumber(entry.trust),
      reliability: normalizeNumber(entry.reliability),
      emotionalLoad: normalizeNumber(entry.emotionalLoad),
      met: entry.met === true,
      knows_name: entry.knows_name === true,
    };
  });
  return next;
}

function normalizeExpired(raw: unknown): ExpiredOpportunity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const type = record.type;
      if (type !== "academic" && type !== "social" && type !== "financial") {
        return null;
      }
      return {
        type,
        day_index: normalizeNumber(record.day_index),
      } as ExpiredOpportunity;
    })
    .filter((item): item is ExpiredOpportunity => Boolean(item));
}

function normalizeReplayIntention(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  return {
    risk_bias: record.risk_bias === true,
    people_bias: record.people_bias === true,
    confront_bias: record.confront_bias === true,
    achievement_bias: record.achievement_bias === true,
  };
}

export function getArcOneState(dailyState: DailyState | null): ArcOneState {
  const energy = typeof dailyState?.energy === "number" ? dailyState.energy : 100;
  return {
    lifePressureState: normalizeLifePressure(dailyState?.life_pressure_state),
    energyLevel: normalizeEnergyLevel(
      dailyState?.energy_level ?? deriveEnergyLevel(energy)
    ),
    moneyBand: normalizeMoneyBand(dailyState?.money_band),
    skillFlags: normalizeSkillFlags(dailyState?.skill_flags),
    npcMemory: normalizeNpcMemory(dailyState?.npc_memory),
    expiredOpportunities: normalizeExpired(dailyState?.expired_opportunities),
    replayIntention: normalizeReplayIntention(dailyState?.replay_intention),
    reflectionDone: Boolean(dailyState?.arc_one_reflection_done),
  };
}

export function bumpLifePressure(
  current: LifePressureState,
  tags: string[]
): LifePressureState {
  const next = { ...current };
  tags.forEach((tag) => {
    if (tag in next) {
      const key = tag as keyof LifePressureState;
      next[key] = (next[key] ?? 0) + 1;
    }
  });
  return next;
}

export function updateNpcMemory(
  current: NpcMemory,
  npcKey: string,
  deltas: { trust?: number; reliability?: number; emotionalLoad?: number }
): NpcMemory {
  const existing = current[npcKey] ?? { trust: 0, reliability: 0, emotionalLoad: 0 };
  return {
    ...current,
    [npcKey]: {
      trust: existing.trust + (deltas.trust ?? 0),
      reliability: existing.reliability + (deltas.reliability ?? 0),
      emotionalLoad: existing.emotionalLoad + (deltas.emotionalLoad ?? 0),
    },
  };
}

export function clampSkill(value: number): number {
  return Math.max(0, Math.min(3, value));
}

export function updateSkillFlag(flags: SkillFlags, key: keyof SkillFlags): SkillFlags {
  // TODO(arc-one): tune skill growth rate.
  return { ...flags, [key]: clampSkill((flags[key] ?? 0) + 1) };
}

export function shiftMoneyBand(band: MoneyBand, effect: "improve" | "worsen"): MoneyBand {
  if (effect === "improve") {
    if (band === "tight") return "okay";
    if (band === "okay") return "comfortable";
    return "comfortable";
  }
  if (band === "comfortable") return "okay";
  if (band === "okay") return "tight";
  return "tight";
}

export function withExpiredOpportunity(
  current: ExpiredOpportunity[],
  next: ExpiredOpportunity
): ExpiredOpportunity[] {
  return [...current, next];
}
