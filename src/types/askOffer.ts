export type AskOfferPost = {
  id: string;
  cohort_id: string;
  user_id: string;
  post_type: "ask" | "offer";
  body: string;
  created_at: string;
};

export type AskOfferReply = {
  id: string;
  post_id: string;
  user_id: string;
  template_key: string;
  body: string | null;
  created_at: string;
};

export type AskOfferReaction = {
  id: string;
  post_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
};

export type AskOfferReplyView = {
  id: string;
  template_key: string;
  body: string | null;
  created_at: string;
  author_handle: string;
};

export type AskOfferPostView = {
  id: string;
  post_type: "ask" | "offer";
  body: string;
  created_at: string;
  author_handle: string;
  helpful_count: number;
  helpful_given: boolean;
  replies: AskOfferReplyView[];
};
