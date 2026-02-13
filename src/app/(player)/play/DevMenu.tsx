"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FeatureFlags } from "@/lib/featureFlags";
import { getFeatureFlags } from "@/lib/featureFlags";

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
  devLoading: boolean;
  devError: string | null;
  devCharacters: DevCharacter[];
  advancingUserId: string | null;
  resettingUserId: string | null;
  togglingAdminId: string | null;
  onToggleTestMode: () => void;
  onFastForward: () => void;
  onClose: () => void;
  onAdvanceDay: (userId: string) => void;
  onResetAccount: (userId: string) => void;
  onToggleAdmin: (userId: string, next: boolean) => void;
  onFlagsChanged?: () => void;
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
  ["arcs", "Arcs"],
  ["resources", "Resources"],
  ["skills", "Skills"],
  ["alignment", "Alignment/Directives"],
  ["funPulse", "Fun pulse"],
  ["contentStudioLiteEnabled", "Content Studio Lite"],
  ["contentStudioGraphEnabled", "Studio Graph"],
  ["contentStudioPreviewEnabled", "Studio Preview"],
  ["contentStudioHistoryEnabled", "Studio History"],
  ["contentStudioPublishEnabled", "Studio Publish"],
  ["contentStudioRemnantRulesEnabled", "Studio Remnant Rules"],
  ["verticalSlice30Enabled", "Vertical Slice 30"],
  ["rookieCircleEnabled", "Rookie Circle"],
  ["askOfferBoardEnabled", "Ask/Offer Board"],
  ["buddySystemEnabled", "Buddy System"],
  ["afterActionCompareEnabled", "After-Action Compare"],
  ["remnantSystemEnabled", "Remnant System"],
];

export default function DevMenu({
  isAdmin,
  currentUserId,
  devSettings,
  devSettingsLoading,
  devSettingsSaving,
  devLoading,
  devError,
  devCharacters,
  advancingUserId,
  resettingUserId,
  togglingAdminId,
  onToggleTestMode,
  onFastForward,
  onClose,
  onAdvanceDay,
  onResetAccount,
  onToggleAdmin,
  onFlagsChanged,
}: Props) {
  const [flagOverrides, setFlagOverrides] = useState<Partial<FeatureFlags>>({});
  const [retainOverrides, setRetainOverrides] = useState(false);
  const flags = getFeatureFlags();

  useEffect(() => {
    setFlagOverrides(readOverrides());
    const retain = window.localStorage.getItem("mmv_feature_overrides_retain");
    setRetainOverrides(retain === "1");
  }, []);

  const handleToggleFlag = (key: keyof FeatureFlags) => {
    let nextOverrides: Partial<FeatureFlags> = {
      ...flagOverrides,
      [key]: !(flagOverrides[key] ?? flags[key]),
    };
    if (
      key === "verticalSlice30Enabled" &&
      (nextOverrides.verticalSlice30Enabled ?? flags.verticalSlice30Enabled)
    ) {
      nextOverrides = {
        ...nextOverrides,
        rookieCircleEnabled:
          flagOverrides.rookieCircleEnabled ?? flags.rookieCircleEnabled,
        askOfferBoardEnabled:
          flagOverrides.askOfferBoardEnabled ?? flags.askOfferBoardEnabled,
        buddySystemEnabled:
          flagOverrides.buddySystemEnabled ?? flags.buddySystemEnabled,
        afterActionCompareEnabled:
          flagOverrides.afterActionCompareEnabled ?? flags.afterActionCompareEnabled,
        remnantSystemEnabled:
          flagOverrides.remnantSystemEnabled ?? flags.remnantSystemEnabled,
      };
    }
    setFlagOverrides(nextOverrides);
    writeOverrides(nextOverrides, currentUserId);
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
          {isAdmin || devSettings.test_mode ? (
            <Button variant="secondary" asChild>
              <Link href="/studio/content">Content studio</Link>
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
      </div>
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
          {FLAG_LABELS.map(([key, label]) => {
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
