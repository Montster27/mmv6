"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FeatureFlags } from "@/lib/featureFlags";
import { getFeatureFlags } from "@/lib/featureFlags";
import { getResourceTrace, isResourceTraceEnabled } from "@/core/resources/resourceTrace";
import { supabase } from "@/lib/supabase/browser";
import { ALL_YEAR_ONE_NPCS } from "@/lib/relationships";
import type { RelationshipState } from "@/lib/relationships";

const NPC_LABELS: Record<string, string> = {
  npc_roommate_dana: "Dana",
  npc_floor_miguel: "Miguel",
  npc_prof_marsh: "Prof. Marsh",
  npc_studious_priya: "Priya",
  npc_floor_cal: "Cal",
  npc_ambiguous_jordan: "Jordan",
  npc_ra_sandra: "Sandra (RA)",
  npc_parent_voice: "Parent",
};

type DevCharacter = {
  user_id: string;
  email: string | null;
  username: string | null;
  is_admin: boolean;
  day_index: number | null;
  created_at: string;
};

type Props = {
  isAdmin: boolean;
  currentUserId: string | null;
  devSettings: { test_mode: boolean };
  devSettingsLoading: boolean;
  devSettingsSaving: boolean;
  runResetting?: boolean;
  devLoading: boolean;
  devError: string | null;
  devCharacters: DevCharacter[];
  advancingUserId: string | null;
  resettingUserId: string | null;
  togglingAdminId: string | null;
  onToggleTestMode: () => void;
  onFastForward: () => void;
  onAdvanceSegment?: () => void;
  currentSegment?: 'morning' | 'afternoon' | 'evening' | 'night' | 'sleeping';
  hoursRemaining?: number;
  onResetRun?: () => void;
  onClose: () => void;
  onAdvanceDay: (userId: string) => void;
  onResetAccount: (userId: string) => void;
  onToggleAdmin: (userId: string, next: boolean) => void;
  onFlagsChanged?: () => void;
  relationshipDebugEnabled?: boolean;
  relDebugEvents?: Array<{
    id?: string;
    created_at?: string;
    event_type: string;
    delta?: Record<string, unknown> | null;
    meta?: Record<string, unknown> | null;
  }>;
  npcMemory?: Record<string, unknown> | null;
  relationships?: Record<string, RelationshipState> | null;
};

function readOverrides(): Partial<FeatureFlags> {
  try {
    const retain = window.localStorage.getItem("mmv_feature_overrides_retain");
    if (retain === "1") {
      const userKey = window.localStorage.getItem("mmv_feature_overrides_user");
      if (userKey) {
        const rawUser = window.localStorage.getItem(userKey);
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser) as Partial<FeatureFlags>;
          return parsedUser && typeof parsedUser === "object" ? parsedUser : {};
        }
      }
    }
  } catch {
    return {};
  }
  try {
    const raw = window.localStorage.getItem("mmv_feature_overrides");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Partial<FeatureFlags>, userId?: string | null) {
  window.localStorage.setItem("mmv_feature_overrides", JSON.stringify(overrides));
  const retain = window.localStorage.getItem("mmv_feature_overrides_retain");
  if (retain === "1" && userId) {
    const userKey = `mmv_feature_overrides:${userId}`;
    window.localStorage.setItem("mmv_feature_overrides_user", userKey);
    window.localStorage.setItem(userKey, JSON.stringify(overrides));
  }
}

const FLAG_LABELS: Array<[keyof FeatureFlags, string]> = [
  ["beatBufferEnabled", "Beat Buffer"],
  ["relationshipDebugEnabled", "Relationship Debug"],
  ["resources", "Resources"],
  ["skills", "Skills"],
  ["alignment", "Alignment/Directives"],
  ["funPulse", "Fun pulse"],
  ["contentStudioLiteEnabled", "Content Studio"],
  ["rookieCircleEnabled", "Rookie Circle"],
  ["askOfferBoardEnabled", "Ask/Offer Board"],
  ["buddySystemEnabled", "Buddy System"],
  ["afterActionCompareEnabled", "After-Action Compare"],
];

export default function DevMenu({
  isAdmin,
  currentUserId,
  devSettings,
  devSettingsLoading,
  devSettingsSaving,
  runResetting = false,
  devLoading,
  devError,
  devCharacters,
  advancingUserId,
  resettingUserId,
  togglingAdminId,
  onToggleTestMode,
  onFastForward,
  onAdvanceSegment,
  currentSegment = 'morning',
  hoursRemaining,
  onResetRun,
  onClose,
  onAdvanceDay,
  onResetAccount,
  onToggleAdmin,
  onFlagsChanged,
  relationshipDebugEnabled = false,
  relDebugEvents = [],
  npcMemory = null,
  relationships = null,
}: Props) {
  const [flagOverrides, setFlagOverrides] = useState<Partial<FeatureFlags>>({});
  const [retainOverrides, setRetainOverrides] = useState(false);
  const flags = getFeatureFlags();
  const contentStudioEnabled =
    flagOverrides.contentStudioLiteEnabled ?? flags.contentStudioLiteEnabled;
  const [serverTrace, setServerTrace] = useState<
    ReturnType<typeof getResourceTrace>
  >([]);
  const [traceLoading, setTraceLoading] = useState(false);
  const [relFilter, setRelFilter] = useState<"all" | "relational" | "flags">(
    "all"
  );

  useEffect(() => {
    setFlagOverrides(readOverrides());
    const retain = window.localStorage.getItem("mmv_feature_overrides_retain");
    if (retain === null) {
      window.localStorage.setItem("mmv_feature_overrides_retain", "1");
      setRetainOverrides(true);
      return;
    }
    setRetainOverrides(retain === "1");
  }, []);

  const loadServerTrace = async () => {
    if (!isResourceTraceEnabled()) return;
    setTraceLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/admin/dev/resource-trace", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load trace");
      }
      setServerTrace(json.trace ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setTraceLoading(false);
    }
  };

  const filteredRelEvents = relDebugEvents.filter((event) => {
    if (relFilter === "all") return true;
    const kind = (event.meta as any)?.kind;
    if (relFilter === "relational") return kind === "relational";
    return kind === "npc_memory";
  });

  useEffect(() => {
    loadServerTrace();
  }, []);

  const handleToggleFlag = (key: keyof FeatureFlags) => {
    if (
      key === "contentStudioGraphEnabled" ||
      key === "contentStudioPreviewEnabled" ||
      key === "contentStudioHistoryEnabled" ||
      key === "contentStudioPublishEnabled"
    ) {
      return;
    }
    let nextOverrides: Partial<FeatureFlags> = {
      ...flagOverrides,
      [key]: !(flagOverrides[key] ?? flags[key]),
    };
    setFlagOverrides(nextOverrides);
    writeOverrides(nextOverrides, currentUserId);
    if (key === "contentStudioLiteEnabled") {
      nextOverrides = {
        ...nextOverrides,
        contentStudioGraphEnabled: true,
        contentStudioPreviewEnabled: true,
        contentStudioHistoryEnabled: true,
        contentStudioPublishEnabled: true,
      };
    }
    onFlagsChanged?.();
  };

  const handleResetFlags = () => {
    setFlagOverrides({});
    writeOverrides({}, currentUserId);
    onFlagsChanged?.();
  };

  const handleToggleRetain = () => {
    const next = !retainOverrides;
    setRetainOverrides(next);
    window.localStorage.setItem(
      "mmv_feature_overrides_retain",
      next ? "1" : "0"
    );
    if (next && currentUserId) {
      writeOverrides(flagOverrides, currentUserId);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dev menu</h2>
        <div className="flex items-center gap-2">
          {contentStudioEnabled && (isAdmin || devSettings.test_mode) ? (
            <Button variant="secondary" asChild>
              <a href="/studio/content" target="_blank" rel="noreferrer">
                Open Content Studio
              </a>
            </Button>
          ) : null}
          <Button variant="secondary" asChild>
            <Link href="/admin/storylets/validate">Validate storylets</Link>
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        Reset accounts or advance the day for testing.
      </p>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span>Test mode (your account).</span>
          <Button
            variant="secondary"
            onClick={onToggleTestMode}
            disabled={devSettingsLoading || devSettingsSaving}
          >
            {devSettings.test_mode ? "Disable" : "Enable"}
          </Button>
        </div>
        {devSettings.test_mode ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-amber-300 bg-amber-100/80 px-2 py-2 text-amber-900">
            <span>Fast-forward your day (TEST MODE).</span>
            <Button
              variant="outline"
              onClick={onFastForward}
              className="border-amber-400 text-amber-900 hover:bg-amber-200/70"
            >
              ⏩ Fast Forward: Next Day (TEST MODE)
            </Button>
          </div>
        ) : null}
        {onAdvanceSegment ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50/60 px-2 py-2 text-teal-900">
            <span>
              Advance segment:{" "}
              <span className="font-semibold capitalize">{currentSegment}</span>
              {typeof hoursRemaining === "number"
                ? ` · ${hoursRemaining}h left`
                : null}
            </span>
            <Button
              variant="outline"
              onClick={onAdvanceSegment}
              className="border-teal-400 text-teal-900 hover:bg-teal-100"
            >
              ▶ Next Segment
            </Button>
          </div>
        ) : null}
        {onResetRun ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-slate-700">
            <span>Reset run (current user).</span>
            <Button
              variant="secondary"
              onClick={onResetRun}
              disabled={runResetting}
            >
              {runResetting ? "Resetting..." : "Reset run"}
            </Button>
          </div>
        ) : null}
      </div>
      {relationshipDebugEnabled ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">Relationship debug</span>
            <div className="flex items-center gap-1">
              {(["all", "relational", "flags"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={relFilter === filter ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRelFilter(filter)}
                >
                  {filter === "all"
                    ? "All"
                    : filter === "relational"
                    ? "Relationship"
                    : "Flags"}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">People</p>
              {(() => {
                  // Build full NPC list: canonical + any extras discovered in relationships/npcMemory
                  const canonicalSet = new Set<string>(ALL_YEAR_ONE_NPCS);
                  const extraNpcIds: string[] = [];
                  const relKeys = relationships ? Object.keys(relationships) : [];
                  const memKeys = npcMemory ? Object.keys(npcMemory) : [];
                  const allSeenIds = [...new Set([...relKeys, ...memKeys])];
                  allSeenIds.forEach((id) => {
                    if (!canonicalSet.has(id)) extraNpcIds.push(id);
                  });
                  const allNpcIds = [...ALL_YEAR_ONE_NPCS, ...extraNpcIds];

                  // Resolve state for a given NPC id
                  const resolveNpc = (npcId: string) => {
                    const rel = (relationships as any)?.[npcId] as RelationshipState | undefined;
                    const legacy = (npcMemory as any)?.[npcId] ?? {};
                    return {
                      met:           rel ? rel.met            : legacy.met === true,
                      knowsName:     rel ? rel.knows_name     : legacy.knows_name === true,
                      knowsFace:     rel ? rel.knows_face     : legacy.knows_face === true,
                      relScore:      rel ? rel.relationship   : typeof legacy.trust === "number" ? legacy.trust : null,
                      trust:         rel?.trust ?? 0,
                      reliability:   rel?.reliability ?? 0,
                      emotionalLoad: rel?.emotionalLoad ?? 0,
                      roleTag:       rel?.role_tag ?? null,
                      isNew:         !canonicalSet.has(npcId),
                    };
                  };

                  // Sort: met first, then unmet; within each group preserve original order
                  const sorted = [...allNpcIds].sort((a, b) => {
                    const aMet = resolveNpc(a).met ? 0 : 1;
                    const bMet = resolveNpc(b).met ? 0 : 1;
                    return aMet - bMet;
                  });

                  return (
                    <div className="mt-2 space-y-2">
                      {sorted.map((npcId) => {
                        const { met, knowsName, knowsFace, relScore, roleTag, isNew, trust, reliability, emotionalLoad } = resolveNpc(npcId);
                        const label = NPC_LABELS[npcId] ?? npcId;
                        const metIcon   = met       ? "✅" : "❌";
                        const nameIcon  = knowsName ? "🏷" : "";
                        const faceIcon  = knowsFace && !knowsName ? "👁" : "";
                        const trustColor = trust > 0 ? "text-green-600" : trust < 0 ? "text-red-600" : "text-slate-400";
                        const relColor = reliability > 0 ? "text-green-600" : reliability < 0 ? "text-red-600" : "text-slate-400";
                        return (
                          <div
                            key={npcId}
                            className={`rounded border px-2 py-1 ${
                              met
                                ? isNew
                                  ? "border-amber-200 bg-amber-50"
                                  : "border-slate-200 bg-slate-50"
                                : "border-slate-100 bg-white opacity-40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-700">
                                {label}{nameIcon ? ` ${nameIcon}` : ""}{faceIcon ? ` ${faceIcon}` : ""}
                                {isNew ? <span className="ml-1 text-[9px] text-amber-600 font-normal">new</span> : null}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                met {metIcon}{relScore != null ? ` · ${relScore}/10` : ""}
                              </span>
                            </div>
                            {met ? (
                              <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                                {roleTag ? <span className="text-slate-500">role: {roleTag}</span> : null}
                                <span className={trustColor}>trust {trust > 0 ? "+" : ""}{trust}</span>
                                <span className={relColor}>rel {reliability > 0 ? "+" : ""}{reliability}</span>
                                {emotionalLoad > 0 ? <span className="text-amber-600">emo {emotionalLoad}</span> : null}
                                {knowsName && !knowsFace ? <span className="text-slate-500">· name only</span> : null}
                                {knowsFace && !knowsName ? <span className="text-slate-500">· face only</span> : null}
                              </div>
                            ) : roleTag ? (
                              <div className="mt-0.5 text-[10px] text-slate-500">role: {roleTag}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Recent deltas</p>
              <div className="mt-2 max-h-48 space-y-2 overflow-auto">
                {filteredRelEvents.length === 0 ? (
                  <p className="text-slate-500">No deltas yet.</p>
                ) : (
                  filteredRelEvents.map((event, idx) => {
                    const meta = (event.meta ?? {}) as Record<string, any>;
                    const npcId = meta.npc_id ?? "unknown";
                    const npcLabel = NPC_LABELS[npcId] ?? npcId;
                    const deltaEntries = Object.entries(event.delta ?? {})
                      .map(([key, value]) => {
                        if (typeof value === "number") {
                          const prefix = value > 0 ? "+" : "";
                          return `${key}:${prefix}${value}`;
                        }
                        return `${key}:${String(value)}`;
                      })
                      .join(", ");
                    // Show trust/reliability/emotionalLoad changes from before→after
                    const before = meta.before as RelationshipState | undefined;
                    const after = meta.after as RelationshipState | undefined;
                    const memoryDeltas: string[] = [];
                    if (before && after) {
                      const tD = (after.trust ?? 0) - (before.trust ?? 0);
                      const rD = (after.reliability ?? 0) - (before.reliability ?? 0);
                      const eD = (after.emotionalLoad ?? 0) - (before.emotionalLoad ?? 0);
                      if (tD !== 0) memoryDeltas.push(`trust:${tD > 0 ? "+" : ""}${tD}`);
                      if (rD !== 0) memoryDeltas.push(`rel:${rD > 0 ? "+" : ""}${rD}`);
                      if (eD !== 0) memoryDeltas.push(`emo:${eD > 0 ? "+" : ""}${eD}`);
                    }
                    return (
                      <div
                        key={`${event.created_at ?? "event"}-${idx}`}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">
                            {npcLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {event.created_at
                              ? new Date(event.created_at).toLocaleTimeString()
                              : ""}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {meta.storylet_slug ?? "storylet"} ·{" "}
                          {meta.choice_id ?? "choice"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-700">
                          {deltaEntries || "{}"}
                        </div>
                        {memoryDeltas.length > 0 && (
                          <div className="text-[10px] text-slate-500">
                            {memoryDeltas.join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isResourceTraceEnabled() ? (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Resource trace</h3>
              <p className="text-xs text-slate-500">
                Recent resource deltas (client + server).
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadServerTrace}>
              {traceLoading ? "Loading…" : "Refresh"}
            </Button>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            {getResourceTrace().length === 0 && serverTrace.length === 0 ? (
              <p>No resource events yet.</p>
            ) : null}
            {getResourceTrace().map((event, index) => (
              <div key={`local-${index}`} className="rounded border border-slate-200 px-2 py-1">
                <div className="font-medium">
                  Local · Day {event.dayIndex} · {event.source}
                </div>
                <div className="text-[11px] text-slate-500">
                  {event.timestamp}
                </div>
                <pre className="text-[11px] whitespace-pre-wrap">
                  {JSON.stringify(event.delta, null, 2)}
                </pre>
              </div>
            ))}
            {serverTrace.map((event, index) => (
              <div key={`server-${index}`} className="rounded border border-slate-200 px-2 py-1">
                <div className="font-medium">
                  Server · Day {event.dayIndex} · {event.source}
                </div>
                <div className="text-[11px] text-slate-500">
                  {event.timestamp}
                </div>
                <pre className="text-[11px] whitespace-pre-wrap">
                  {JSON.stringify(event.delta, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Feature toggles</span>
          <Button variant="ghost" onClick={handleResetFlags}>
            Reset
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Overrides are local to this browser and apply immediately.
        </p>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={retainOverrides}
            onChange={handleToggleRetain}
          />
          Retain toggles for this account
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FLAG_LABELS.filter(([key]) => {
            if (
              key === "contentStudioGraphEnabled" ||
              key === "contentStudioPreviewEnabled" ||
              key === "contentStudioHistoryEnabled" ||
              key === "contentStudioPublishEnabled"
            ) {
              return false;
            }
            return true;
          }).map(([key, label]) => {
            const active = flagOverrides[key] ?? flags[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-2"
              >
                <span>{label}</span>
                <Button
                  variant={active ? "secondary" : "outline"}
                  onClick={() => handleToggleFlag(key)}
                >
                  {active ? "On" : "Off"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      {devError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {devError}
        </div>
      ) : null}
      {devLoading ? (
        <p className="text-sm text-slate-700">Loading…</p>
      ) : devCharacters.length === 0 ? (
        <p className="text-sm text-slate-700">No characters found.</p>
      ) : (
        <div className="space-y-2">
          {devCharacters.map((row) => (
            <div
              key={row.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {row.username ?? "Unknown"}
                  {row.is_admin ? (
                    <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                      admin
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {row.email ?? "no-email"} · Day {row.day_index ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={advancingUserId === row.user_id}
                  onClick={() => onAdvanceDay(row.user_id)}
                >
                  {advancingUserId === row.user_id ? "Advancing..." : "Next day"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={resettingUserId === row.user_id}
                  onClick={() => onResetAccount(row.user_id)}
                >
                  {resettingUserId === row.user_id
                    ? "Resetting..."
                    : "Reset to day one"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={togglingAdminId === row.user_id}
                  onClick={() => onToggleAdmin(row.user_id, !row.is_admin)}
                >
                  {togglingAdminId === row.user_id
                    ? "Updating..."
                    : row.is_admin
                      ? "Revoke admin"
                      : "Make admin"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
