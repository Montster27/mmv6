export type Arc = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  created_at?: string;
  is_active: boolean;
  meta?: Record<string, unknown> | null;
};

export type ArcInstance = {
  id: string;
  user_id: string;
  arc_id: string;
  status: "active" | "completed" | "abandoned";
  started_day_index: number;
  current_step: number;
  updated_at?: string;
  meta?: Record<string, unknown> | null;
};
