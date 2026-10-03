export type DelayedConsequenceRule = {
  _studio_revision?: number;
  key: string;
  trigger: Record<string, unknown>;
  resolve: Record<string, unknown>;
  timing: Record<string, unknown>;
  payload: Record<string, unknown>;
  updated_at?: string;
  updated_by?: string | null;
};
