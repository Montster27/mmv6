import type { Storylet, StoryletChoice } from "@/types/storylets";
import type { ResourceKey } from "@/core/resources/resourceKeys";

/** Represents a change in player resources, used by arc engine helpers. */
export type ResourceDelta = {
  resources?: Partial<Record<ResourceKey, number>>;
  skill_points?: number;
};

export type OfferState = "ACTIVE" | "ACCEPTED" | "EXPIRED" | "DISMISSED";
export type ArcInstanceState = "ACTIVE" | "COMPLETED" | "FAILED" | "ABANDONED";
export type LogEventType =
  | "OFFER_SHOWN"
  | "ARC_STARTED"
  | "STEP_DEFERRED"
  | "STEP_RESOLVED"
  | "STEP_EXPIRED"
  | "ARC_ABANDONED"
  | "ARC_FAILED"
  | "ARC_COMPLETED"
  | "OFFER_EXPIRED";

/** @deprecated Use StoryletChoice instead — all choice fields are now unified. */
export type ArcStepOption = StoryletChoice & {
  /** Arc-style option key — same as StoryletChoice.id in unified model. */
  option_key: string;
};

export type ArcDefinition = {
  id: string;
  key: string;
  title: string;
  description: string;
  tags: string[];
  is_enabled: boolean;
};

/**
 * An arc step is now just a Storylet with arc membership fields set.
 * arc_id, step_key, order_index, due_offset_days, expires_after_days are required.
 */
export type ArcStep = Storylet & {
  arc_id: string;
  step_key: string;
  order_index: number;
  due_offset_days: number;
  expires_after_days: number;
  /** Choices on an arc step — same type as any storylet. */
  choices: StoryletChoice[];
};

export type ArcOffer = {
  id: string;
  user_id: string;
  arc_id: string;
  offer_key: string;
  state: OfferState;
  times_shown: number;
  tone_level: number;
  first_seen_day: number;
  last_seen_day: number;
  expires_on_day: number;
};

export type ArcInstance = {
  id: string;
  user_id: string;
  arc_id: string;
  state: ArcInstanceState;
  current_step_key: string;
  step_due_day: number;
  step_defer_count: number;
  started_day: number;
  updated_day: number;
  completed_day?: number | null;
  failure_reason?: string | null;
  branch_key?: string | null;
};

export type DueStep = {
  instance: ArcInstance;
  step: ArcStep;
  arc: ArcDefinition;
  expires_on_day: number;
};

export type ChoiceLogEntry = {
  id: string;
  user_id: string;
  day: number;
  event_type: LogEventType;
  arc_id?: string | null;
  arc_instance_id?: string | null;
  step_key?: string | null;
  offer_id?: string | null;
  option_key?: string | null;
  delta?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

export type TodayArcState = {
  dueSteps: DueStep[];
  offers: Array<ArcOffer & { arc: ArcDefinition }>;
  activeArcs: Array<ArcInstance & { arc: ArcDefinition }>;
  progressionSlotsTotal: number;
  progressionSlotsUsed: number;
};
