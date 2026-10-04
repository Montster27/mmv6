import type { Storylet } from "./storylets";
import type { Track } from "./tracks";

export type StudioKind = "storylets" | "tracks" | "consequences" | "plans" | "definitions" | "scenarios";
export const STUDIO_KINDS: StudioKind[] = ["storylets", "tracks", "consequences", "plans", "definitions", "scenarios"];
export type StudioRecord = Record<string, unknown> & { id?: string; key?: string; title?: string };
export type StudioManifest = Record<StudioKind, StudioRecord[]>;
export type StudioRole = "writer" | "lead" | "reviewer" | "publisher";
export type StudioWorkspace = {
  id: string; title: string; owner_id: string; reviewer_id: string | null;
  collaborator_ids: string[]; base_release_id: string; revision: number;
  status: "draft" | "review" | "approved" | "published";
  brief: string; plan_id: string | null; blocked_reason: string;
  approved_by: string | null; approved_revision: number | null;
  updated_at: string; created_at: string;
};
export type StudioChange = { kind: StudioKind; object_id: string; payload: StudioRecord | null };
export type StudioIssue = { severity: "error" | "warning"; objectId: string; message: string };
export type StudioRelease = { id: string; title: string; created_at: string; source_workspace_id: string | null; runtime_version: string; self_reviewed?: boolean };
export type StudioScenario = StudioRecord & {
  id: string; title: string; day: number; segment: string;
  resolved: Record<string, string[]>; choices: Record<string, string[]>;
  flags: string[]; precluded: string[]; skills: string[];
  expected: string[]; forbidden: string[];
};
export type StudioTestResult = { id: string; title: string; passed: boolean; offered: string[]; failures: string[]; trace?: import("@/core/studio/rehearsal").RehearsalTrace[] };
export type StudioActor = { id: string; email: string | null; role: StudioRole; admin: boolean };
export type RuntimeManifest = { storylets: Storylet[]; tracks: Track[] };
export const STUDIO_RUNTIME_VERSION = "narrative-offers-v1";
