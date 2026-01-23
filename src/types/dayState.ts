export type PlayerDayState = {
  user_id: string;
  day_index: number;
  energy: number;
  stress: number;
  money: number;
  study_progress: number;
  social_capital: number;
  health: number;
  allocation_hash?: string | null;
  pre_allocation_energy?: number | null;
  pre_allocation_stress?: number | null;
  created_at: string;
  updated_at: string;
};
