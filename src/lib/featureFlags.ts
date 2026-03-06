export type FeatureFlags = {
  arcOneScarcityEnabled: boolean;
  arcs: boolean;
  resources: boolean;
  skills: boolean;
  alignment: boolean;
  funPulse: boolean;
  rookieCircleEnabled: boolean;
  askOfferBoardEnabled: boolean;
  buddySystemEnabled: boolean;
  afterActionCompareEnabled: boolean;
  contentStudioLiteEnabled: boolean;
  contentStudioGraphEnabled: boolean;
  contentStudioPreviewEnabled: boolean;
  contentStudioHistoryEnabled: boolean;
  contentStudioPublishEnabled: boolean;
  beatBufferEnabled: boolean;
  relationshipDebugEnabled: boolean;
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
          arcOneScarcityEnabled: true,
          arcs: true,
          resources: true,
          skills: true,
          alignment: false,
          funPulse: false,
          // muted preset disables social/community features
          rookieCircleEnabled: false,
          askOfferBoardEnabled: false,
          buddySystemEnabled: false,
          afterActionCompareEnabled: false,
          contentStudioLiteEnabled: true,
          contentStudioGraphEnabled: true,
          contentStudioPreviewEnabled: true,
          contentStudioHistoryEnabled: true,
          contentStudioPublishEnabled: false,
          beatBufferEnabled: true,
          relationshipDebugEnabled: true,
        }
      : {
          arcOneScarcityEnabled: true,
          arcs: true,
          resources: true,
          skills: true,
          alignment: false,
          funPulse: false,
          rookieCircleEnabled: true,
          askOfferBoardEnabled: true,
          buddySystemEnabled: true,
          afterActionCompareEnabled: true,
          contentStudioLiteEnabled: true,
          contentStudioGraphEnabled: true,
          contentStudioPreviewEnabled: true,
          contentStudioHistoryEnabled: true,
          contentStudioPublishEnabled: true,
          beatBufferEnabled: true,
          relationshipDebugEnabled: true,
        };

  const studioFlag =
    parseFlag(process.env.NEXT_PUBLIC_CONTENT_STUDIO_LITE) ?? true;
  const studioDefaults = studioFlag
    ? {
        contentStudioLiteEnabled: true,
        contentStudioGraphEnabled: true,
        contentStudioPreviewEnabled: true,
        contentStudioHistoryEnabled: true,
        contentStudioPublishEnabled: true,
      }
    : {
        contentStudioLiteEnabled: false,
        contentStudioGraphEnabled: false,
        contentStudioPreviewEnabled: false,
        contentStudioHistoryEnabled: false,
        contentStudioPublishEnabled: false,
      };

  const overrides: Partial<FeatureFlags> = {
    arcOneScarcityEnabled:
      parseFlag(process.env.NEXT_PUBLIC_FEATURE_ARC_ONE_SCARCITY) ?? undefined,
    arcs: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ARCS) ?? undefined,
    resources: parseFlag(process.env.NEXT_PUBLIC_FEATURE_RESOURCES) ?? undefined,
    skills: parseFlag(process.env.NEXT_PUBLIC_FEATURE_SKILLS) ?? undefined,
    alignment: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ALIGNMENT) ?? undefined,
    funPulse: parseFlag(process.env.NEXT_PUBLIC_FEATURE_FUN_PULSE) ?? undefined,
    rookieCircleEnabled:
      parseFlag(process.env.NEXT_PUBLIC_ROOKIE_CIRCLE) ?? undefined,
    askOfferBoardEnabled:
      parseFlag(process.env.NEXT_PUBLIC_ASK_OFFER_BOARD) ?? undefined,
    buddySystemEnabled:
      parseFlag(process.env.NEXT_PUBLIC_BUDDY_SYSTEM) ?? undefined,
    afterActionCompareEnabled:
      parseFlag(process.env.NEXT_PUBLIC_AFTER_ACTION_COMPARE) ?? undefined,
    contentStudioLiteEnabled:
      parseFlag(process.env.NEXT_PUBLIC_CONTENT_STUDIO_LITE) ?? undefined,
    contentStudioGraphEnabled:
      parseFlag(process.env.NEXT_PUBLIC_CONTENT_STUDIO_GRAPH) ?? undefined,
    contentStudioPreviewEnabled:
      parseFlag(process.env.NEXT_PUBLIC_CONTENT_STUDIO_PREVIEW) ?? undefined,
    contentStudioHistoryEnabled:
      parseFlag(process.env.NEXT_PUBLIC_CONTENT_STUDIO_HISTORY) ?? undefined,
    contentStudioPublishEnabled:
      parseFlag(process.env.NEXT_PUBLIC_CONTENT_STUDIO_PUBLISH) ?? undefined,
    beatBufferEnabled:
      parseFlag(process.env.NEXT_PUBLIC_BEAT_BUFFER) ?? undefined,
    relationshipDebugEnabled:
      parseFlag(process.env.NEXT_PUBLIC_REL_DEBUG) ?? undefined,
  };

  // Strip undefined values so unset env vars don't shadow base defaults.
  const cleanOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined)
  ) as Partial<FeatureFlags>;

  const localOverrides = getOverrideFlags();
  return { ...base, ...studioDefaults, ...cleanOverrides, ...localOverrides };
}
