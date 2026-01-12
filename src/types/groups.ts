export type Group = {
  id: string;
  name: string;
  join_code: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
};

export type GroupFeedItem = {
  id: string;
  group_id: string;
  ts: string;
  event_type: string;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
};
