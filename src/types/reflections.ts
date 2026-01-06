export type ReflectionResponse = "yes" | "mostly" | "no";

export type Reflection = {
  id?: string;
  user_id: string;
  day_index: number;
  prompt_id: string;
  response?: ReflectionResponse | null;
  skipped: boolean;
  created_at?: string;
  updated_at?: string;
};
