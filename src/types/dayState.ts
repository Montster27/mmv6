export type PlayerDayState = {
  user_id: string;
  day_index: number;
  energy: number;
  stress: number;
  cashOnHand: number;
  knowledge: number;
  socialLeverage: number;
  physicalResilience: number;
  morale?: number;
  total_study: number;
  total_work: number;
  total_social: number;
  total_health: number;
  total_fun: number;
  allocation_hash?: string | null;
  pre_allocation_energy?: number | null;
  pre_allocation_stress?: number | null;
  pre_allocation_cashOnHand?: number | null;
  pre_allocation_knowledge?: number | null;
  pre_allocation_socialLeverage?: number | null;
  pre_allocation_physicalResilience?: number | null;
  resolved_at?: string | null;
  end_energy?: number | null;
  end_stress?: number | null;
  next_energy?: number | null;
  next_stress?: number | null;
  // ── Segment / time-budget system ─────────────────────────────────────────
  /** Active day segment: morning | afternoon | evening | night | sleeping */
  current_segment?: 'morning' | 'afternoon' | 'evening' | 'night' | 'sleeping';
  /** Free hours remaining today (starts at 16; 8h sleep pre-deducted) */
  hours_remaining?: number;
  /** Hours locked for work + class (deducted at day start) */
  hours_committed?: number;
  // ─────────────────────────────────────────────────────────────────────────
  created_at: string;
  updated_at: string;
};
