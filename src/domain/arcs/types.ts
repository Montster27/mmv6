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

export type ResourceDelta = {
  resources?: Record<string, number>;
  skill_points?: number;
  dispositions?: Record<string, number>;
};

export type ArcDefinition = {
  id: string;
  key: string;
  title: string;
  description: string;
  tags: string[];
  is_enabled: boolean;
};

export type ArcStepOption = {
  option_key: string;
  label: string;
  time_cost?: number;
  energy_cost?: number;
  money_requirement?: "tight" | "okay" | "comfortable";
  money_effect?: "improve" | "worsen";
  skill_requirement?: string;
  skill_modifier?: string;
  identity_tags?: string[];
  relational_effects?: {
    npc_key?: string;
    trust_delta?: number;
    reliability_delta?: number;
    emotionalLoad_delta?: number;
  };
  costs?: ResourceDelta;
  rewards?: ResourceDelta;
  next_step_key?: string | null;
  outcome_type?: "success" | "fail" | "neutral";
};

export type ArcStep = {
  id: string;
  arc_id: string;
  step_key: string;
  order_index: number;
  title: string;
  body: string;
  options: ArcStepOption[];
  default_next_step_key?: string | null;
  due_offset_days: number;
  expires_after_days: number;
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
