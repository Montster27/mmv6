import type { JsonObject } from "./vectors";

export type BoostPayload = JsonObject & {
  day_index?: number | string;
};

export type PublicProfile = {
  user_id: string;
  display_name: string;
  created_at?: string;
};

export type ReceivedBoost = {
  from_user_id: string;
  created_at: string;
};

export type SocialAction = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  action_type: string;
  payload: BoostPayload;
  created_at?: string;
};
