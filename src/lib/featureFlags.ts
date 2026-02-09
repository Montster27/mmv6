export type FeatureFlags = {
  arcs: boolean;
  resources: boolean;
  skills: boolean;
  alignment: boolean;
  funPulse: boolean;
};

function parseFlag(value: string | undefined): boolean | null {
  if (!value) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

function getOverrideFlags(): Partial<FeatureFlags> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("mmv_feature_overrides");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getFeatureFlags(): FeatureFlags {
  const set = process.env.NEXT_PUBLIC_FEATURE_SET;
  const base: FeatureFlags =
    set === "muted"
      ? {
          arcs: true,
          resources: false,
          skills: false,
          alignment: false,
          funPulse: false,
        }
      : {
          arcs: true,
          resources: true,
          skills: true,
          alignment: true,
          funPulse: true,
        };

  const overrides: Partial<FeatureFlags> = {
    arcs: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ARCS) ?? undefined,
    resources: parseFlag(process.env.NEXT_PUBLIC_FEATURE_RESOURCES) ?? undefined,
    skills: parseFlag(process.env.NEXT_PUBLIC_FEATURE_SKILLS) ?? undefined,
    alignment: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ALIGNMENT) ?? undefined,
    funPulse: parseFlag(process.env.NEXT_PUBLIC_FEATURE_FUN_PULSE) ?? undefined,
  };

  const localOverrides = getOverrideFlags();
  return { ...base, ...overrides, ...localOverrides };
}
