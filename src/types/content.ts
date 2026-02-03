export type ContentArc = {
  key: string;
  title: string;
  description: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
};

export type ContentArcStepChoice = {
  key: string;
  label: string;
  flags?: Record<string, boolean>;
  costs?: Partial<{
    money: number;
    energy: number;
    stress: number;
    study_progress: number;
    social_capital: number;
    health: number;
  }>;
  rewards?: Partial<{
    money: number;
    energy: number;
    stress: number;
    study_progress: number;
    social_capital: number;
    health: number;
  }>;
};

export type ContentArcStep = {
  arc_key: string;
  step_index: number;
  title: string;
  body: string;
  choices: ContentArcStepChoice[];
  created_at: string;
};

export type ContentInitiative = {
  key: string;
  title: string;
  description: string;
  goal: number;
  duration_days: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
};
