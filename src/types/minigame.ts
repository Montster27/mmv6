export type MinigameOutcomeDeltas = {
  energy?: number;
  stress?: number;
  vectors?: Record<string, number>;
  resources?: Record<string, number>;
};

export type MinigameOutcomeBranch = {
  deltas: MinigameOutcomeDeltas;
  next_step_key: string | null;
  reaction_text: string;
};

export type MinigameOutcomes = {
  win: MinigameOutcomeBranch;
  lose: MinigameOutcomeBranch;
  skip: MinigameOutcomeBranch;
};

export type MinigameType = "caps";

export type MinigameNode = {
  id: string;
  key: string;
  title: string;
  description: string;
  game_type: MinigameType | string;
  arc_id: string | null;
  order_index: number;
  due_offset_days: number;
  trigger_condition: Record<string, unknown> | null;
  outcomes: MinigameOutcomes;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};
