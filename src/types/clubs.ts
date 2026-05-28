// Clubs (MP-01) — see docs/prompts/MP-01-clubs.md and docs/MULTIPLAYER-DESIGN.md.
// A "player" is an authenticated user (auth.users); MMV has no separate
// players table. Row shapes below mirror supabase/migrations/20260528120000_clubs_mvp.sql.

export type ClubApplicationStatus = "pending" | "accepted" | "rejected";

export type Club = {
  id: string;
  name: string;
  description: string;
  founder_player_id: string | null;
  is_open_to_applications: boolean;
  is_system_seeded: boolean;
  created_at: string;
};

export type ClubMember = {
  id: string;
  club_id: string;
  player_id: string;
  joined_at: string;
};

export type ClubApplication = {
  id: string;
  club_id: string;
  applicant_player_id: string;
  status: ClubApplicationStatus;
  applied_at: string;
  resolved_at: string | null;
};

// ─── DTOs returned by the read endpoints ─────────────────────────────

// One row of the /clubs directory. Viewer-relative flags drive the Apply
// button's disabled state without a second round-trip.
export type ClubDirectoryEntry = {
  id: string;
  name: string;
  description: string;
  is_open_to_applications: boolean;
  is_system_seeded: boolean;
  member_count: number;
  founder_display_name: string | null;
  viewer_is_member: boolean;
  viewer_has_pending_application: boolean;
};

export type ClubMemberView = {
  player_id: string;
  display_name: string | null;
  joined_at: string;
  is_founder: boolean;
};

export type ClubApplicationView = {
  id: string;
  applicant_player_id: string;
  applicant_display_name: string | null;
  applied_at: string;
};

export type ClubDetail = {
  id: string;
  name: string;
  description: string;
  is_open_to_applications: boolean;
  is_system_seeded: boolean;
  founder_player_id: string | null;
  founder_display_name: string | null;
  members: ClubMemberView[];
  // Populated only when the viewer is the founder; empty otherwise.
  pending_applications: ClubApplicationView[];
  viewer_is_founder: boolean;
  viewer_is_member: boolean;
  viewer_has_pending_application: boolean;
};

// Compact affiliation shown in the player chrome / bootstrap response.
export type CurrentClub = {
  id: string;
  name: string;
};
