"use client";

import type { ReactNode } from "react";
import type { PlanningImpact } from "@/core/studio/planning";
import type {
  StudioActor,
  StudioChange,
  StudioIssue,
  StudioManifest,
  StudioRecord,
  StudioRelease,
  StudioTestResult,
  StudioWorkspace,
} from "@/types/studio";

export type Mode = "work" | "narrative" | "library" | "review" | "releases";
export type Member = { user_id: string; display_name: string; role: string };
export type StudioEvent = {
  id: number;
  actor_id: string;
  action: string;
  revision: number;
  created_at: string;
  detail: Record<string, unknown>;
};
export type Conflict = { id: string; draft: StudioRecord | null; released: StudioRecord | null };
export type StudioData = {
  actor: StudioActor;
  workspaces: StudioWorkspace[];
  members: Member[];
  releases: StudioRelease[];
  activePlans?: StudioRecord[];
  inheritedBriefs?: StudioRecord[];
  impacts?: PlanningImpact[];
  conflicts: Conflict[];
  activeReleaseId: string;
  manifest: StudioManifest;
  workspace: StudioWorkspace | null;
  base: StudioManifest | null;
  changes: StudioChange[];
  events: StudioEvent[];
  issues: StudioIssue[];
  tests: StudioTestResult[];
  soloMode?: boolean;
};

/** Everything a screen needs from the Studio shell. */
export type StudioCtx = {
  data: StudioData;
  workspace: StudioWorkspace | null;
  workspaceId: string;
  actor: StudioActor;
  manifest: StudioManifest;
  members: Member[];
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
  stale: boolean;
  busy: boolean;
  act: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
  selectWorkspace: (id: string) => Promise<void>;
  /** Screens report unsaved forms so the shell can confirm before switching context. */
  markDirty: (source: string, dirty: boolean) => void;
  name: (id: string | null) => string;
  titleOf: (id: string) => string;
};

export const inputClass = "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm";
export const buttonClass =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40";
export const primaryClass =
  "rounded bg-indigo-700 px-3 py-2 text-sm text-white hover:bg-indigo-800 disabled:opacity-40";
export const panelClass = "rounded-lg border border-slate-200 bg-white p-5 space-y-4";

export const SCREEN_TITLES: Record<Mode, string> = {
  work: "My work",
  narrative: "Narrative map",
  library: "Shared library",
  review: "Review & playtests",
  releases: "Releases",
};

export function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          className={`${inputClass} mt-1`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={`${inputClass} mt-1`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export function MemberOptions({ members }: { members: Member[] }): ReactNode {
  return (
    <>
      {members.map((member) => (
        <option key={member.user_id} value={member.user_id}>
          {member.display_name || member.user_id.slice(0, 8)} · {member.role}
        </option>
      ))}
    </>
  );
}
