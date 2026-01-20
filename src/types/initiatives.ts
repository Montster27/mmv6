export type Cohort = {
  id: string;
  created_at?: string;
  name?: string | null;
  is_active: boolean;
};

export type CohortMember = {
  cohort_id: string;
  user_id: string;
  joined_at?: string;
  role?: string | null;
};

export type Initiative = {
  id: string;
  cohort_id: string;
  key: string;
  title: string;
  description: string | null;
  created_at?: string;
  starts_day_index: number;
  ends_day_index: number;
  status: "open" | "closed";
  goal: number;
  meta?: Record<string, unknown> | null;
};

export type InitiativeContribution = {
  initiative_id: string;
  user_id: string;
  day_index: number;
  amount: number;
  created_at?: string;
};
