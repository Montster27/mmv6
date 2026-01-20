export type ArcInstance = {
  id: string;
  user_id: string;
  arc_key: string;
  status: "active" | "completed" | "abandoned";
  started_day_index: number;
  current_step: number;
  updated_at: string;
  meta: any | null;
};
