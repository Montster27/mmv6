export type Anomaly = {
  id: string;
  title: string;
  description: string;
  severity?: number;
  created_at?: string;
};

export type UserAnomaly = {
  anomaly_id: string;
  day_index: number;
  discovered_at: string;
  source?: string | null;
};
