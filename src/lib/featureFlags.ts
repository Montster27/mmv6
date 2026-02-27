export type FeatureFlags = {
  arcFirstEnabled: boolean;
  arcOneScarcityEnabled: boolean;
  arcs: boolean;
  resources: boolean;
  skills: boolean;
  alignment: boolean;
  funPulse: boolean;
  verticalSlice30Enabled: boolean;
  rookieCircleEnabled: boolean;
  askOfferBoardEnabled: boolean;
  buddySystemEnabled: boolean;
  afterActionCompareEnabled: boolean;
  remnantSystemEnabled: boolean;
  contentStudioLiteEnabled: boolean;
  contentStudioGraphEnabled: boolean;
  contentStudioPreviewEnabled: boolean;
  contentStudioHistoryEnabled: boolean;
  contentStudioPublishEnabled: boolean;
  contentStudioRemnantRulesEnabled: boolean;
  beatBufferEnabled: boolean;
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
  const verticalSliceFlag =
    parseFlag(process.env.NEXT_PUBLIC_VERTICAL_SLICE_30) ?? true;
  const sliceDefaults = verticalSliceFlag
    ? {
        rookieCircleEnabled: true,
        askOfferBoardEnabled: true,
        buddySystemEnabled: true,
        afterActionCompareEnabled: true,
        remnantSystemEnabled: true,
      }
    : {
        rookieCircleEnabled: false,
        askOfferBoardEnabled: false,
        buddySystemEnabled: false,
        afterActionCompareEnabled: false,
        remnantSystemEnabled: false,
      };

  const base: FeatureFlags =
    set === "muted"
      ? {
          arcFirstEnabled: true,
          arcOneScarcityEnabled: true,
          arcs: true,
          resources: false,
          skills: true,
          alignment: false,
          funPulse: false,
          verticalSlice30Enabled: verticalSliceFlag,
          ...sliceDefaults,
          contentStudioLiteEnabled: true,
          contentStudioGraphEnabled: true,
          contentStudioPreviewEnabled: true,
          contentStudioHistoryEnabled: true,
          contentStudioPublishEnabled: false,
          contentStudioRemnantRulesEnabled: false,
          beatBufferEnabled: true,
        }
      : {
          arcFirstEnabled: true,
          arcOneScarcityEnabled: true,
          arcs: true,
          resources: false,
          skills: true,
          alignment: false,
          funPulse: false,
          verticalSlice30Enabled: verticalSliceFlag,
          ...sliceDefaults,
          contentStudioLiteEnabled: true,
          contentStudioGraphEnabled: true,
          contentStudioPreviewEnabled: true,
          contentStudioHistoryEnabled: true,
          contentStudioPublishEnabled: false,
          contentStudioRemnantRulesEnabled: false,
          beatBufferEnabled: true,
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
        contentStudioRemnantRulesEnabled: true,
      }
    : {
        contentStudioLiteEnabled: false,
        contentStudioGraphEnabled: false,
        contentStudioPreviewEnabled: false,
        contentStudioHistoryEnabled: false,
        contentStudioPublishEnabled: false,
        contentStudioRemnantRulesEnabled: false,
      };

  const overrides: Partial<FeatureFlags> = {
    arcFirstEnabled:
      parseFlag(process.env.NEXT_PUBLIC_FEATURE_ARC_FIRST) ?? undefined,
    arcOneScarcityEnabled:
      parseFlag(process.env.NEXT_PUBLIC_FEATURE_ARC_ONE_SCARCITY) ?? undefined,
    arcs: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ARCS) ?? undefined,
    resources: parseFlag(process.env.NEXT_PUBLIC_FEATURE_RESOURCES) ?? undefined,
    skills: parseFlag(process.env.NEXT_PUBLIC_FEATURE_SKILLS) ?? undefined,
    alignment: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ALIGNMENT) ?? undefined,
    funPulse: parseFlag(process.env.NEXT_PUBLIC_FEATURE_FUN_PULSE) ?? undefined,
    verticalSlice30Enabled:
      parseFlag(process.env.NEXT_PUBLIC_VERTICAL_SLICE_30) ?? undefined,
    rookieCircleEnabled:
      parseFlag(process.env.NEXT_PUBLIC_ROOKIE_CIRCLE) ?? undefined,
    askOfferBoardEnabled:
      parseFlag(process.env.NEXT_PUBLIC_ASK_OFFER_BOARD) ?? undefined,
    buddySystemEnabled:
      parseFlag(process.env.NEXT_PUBLIC_BUDDY_SYSTEM) ?? undefined,
    afterActionCompareEnabled:
      parseFlag(process.env.NEXT_PUBLIC_AFTER_ACTION_COMPARE) ?? undefined,
    remnantSystemEnabled:
      parseFlag(process.env.NEXT_PUBLIC_REMNANT_SYSTEM) ?? undefined,
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
    contentStudioRemnantRulesEnabled:
      parseFlag(process.env.NEXT_PUBLIC_CONTENT_STUDIO_REMNANT_RULES) ??
      undefined,
    beatBufferEnabled:
      parseFlag(process.env.NEXT_PUBLIC_BEAT_BUFFER) ?? undefined,
  };

  const localOverrides = getOverrideFlags();
  return { ...base, ...studioDefaults, ...overrides, ...localOverrides };
}
