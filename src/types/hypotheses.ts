export type Hypothesis = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type HypothesisAnomaly = {
  hypothesis_id: string;
  anomaly_id: string;
};
