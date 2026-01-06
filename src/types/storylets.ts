export type StoryletChoice = {
  id: string;
  label: string;
  outcome?: {
    text?: string;
    deltas?: {
      energy?: number;
      stress?: number;
      vectors?: Record<string, number>;
    };
  };
};

export type Storylet = {
  id: string;
  slug: string;
  title: string;
  body: string;
  choices: StoryletChoice[];
  is_active: boolean;
  created_at?: string;
  tags?: string[];
  requirements?: Record<string, unknown>;
  weight?: number;
};

export type StoryletRun = {
  id: string;
  user_id: string;
  storylet_id: string;
  day_index: number;
  choice_id?: string | null;
  created_at?: string;
};
