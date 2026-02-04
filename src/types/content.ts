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
  vector_deltas?: Partial<{
    reflection: number;
    focus: number;
    ambition: number;
    social: number;
    stability: number;
    curiosity: number;
    agency: number;
  }>;
  costs?: Partial<{
    cashOnHand: number;
    energy: number;
    stress: number;
    knowledge: number;
    socialLeverage: number;
    physicalResilience: number;
  }>;
  rewards?: Partial<{
    cashOnHand: number;
    energy: number;
    stress: number;
    knowledge: number;
    socialLeverage: number;
    physicalResilience: number;
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
