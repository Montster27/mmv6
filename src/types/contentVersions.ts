export type ContentVersionState = "draft" | "published" | "archived";

export type ContentSnapshot = {
  storylets: unknown[];
  consequences: unknown[];
  remnantRules: unknown[];
};

export type ContentVersion = {
  version_id: string;
  state: ContentVersionState;
  snapshot: ContentSnapshot;
  note: string;
  author: string | null;
  created_at: string;
};
