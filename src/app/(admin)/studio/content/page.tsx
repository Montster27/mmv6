"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/adminAuth";
import { trackEvent } from "@/lib/events";
import { getFeatureFlags } from "@/lib/featureFlags";
import { getAppMode } from "@/lib/mode";
import { fetchDevSettings } from "@/lib/devSettings";
import { supabase } from "@/lib/supabase/browser";
import { validateStorylet } from "@/core/validation/storyletValidation";
import { buildAuditMeta } from "@/lib/contentStudio/audit";
import { RESOURCE_KEYS } from "@/core/resources/resourceKeys";
import { StudioDatalist } from "@/components/contentStudio/StudioDatalist";
import type { Storylet, StoryletChoice } from "@/types/storylets";
import type { ContentArc, ContentArcStep } from "@/types/content";
import type { DelayedConsequenceRule } from "@/types/consequences";
import type { RemnantRule } from "@/types/remnants";
import type { ContentVersion, ContentSnapshot } from "@/types/contentVersions";

import { SaveStatusIndicator } from "@/components/contentStudio/SaveStatusIndicator";

const REMNANT_KEYS = [
  "memory_fragment",
  "relationship_echo",
  "composure_scar",
  "anomaly_thread",
] as const;

const GraphView = dynamic(
  () => import("@/components/contentStudio/GraphView").then((mod) => mod.GraphView),
  { ssr: false }
);
const PreviewSimulator = dynamic(
  () =>
    import("@/components/contentStudio/PreviewSimulator").then(
      (mod) => mod.PreviewSimulator
    ),
  { ssr: false }
);

const TABS = [
  { key: "list", label: "Storylets" },
  { key: "arcs", label: "Arcs" },
  { key: "graph", label: "Graph" },
  { key: "preview", label: "Preview" },
  { key: "rules", label: "Rules" },
  { key: "history", label: "History" },
] as const;

const PHASE_OPTIONS = [
  "intro_hook",
  "guided_core_loop",
  "reflection_arc",
  "community_purpose",
  "remnant_reveal",
  "cliffhanger",
] as const;

const TYPE_OPTIONS = ["core", "social", "context", "anomaly"] as const;
const SHOCK_ARC_KEYS = [
  "shock_academic",
  "shock_social",
  "shock_romantic",
] as const;
const IDENTITY_TAG_OPTIONS = [
  "risk",
  "safety",
  "people",
  "achievement",
  "confront",
  "avoid",
] as const;
const NPC_ID_OPTIONS = ["npc_roommate_dana", "npc_connector_miguel"];

type TabKey = (typeof TABS)[number]["key"];

type FilterState = {
  search: string;
  phase: string;
  type: string;
  active: "all" | "true" | "false";
  hasErrors: "all" | "true" | "false";
};

type ValidationSummary = {
  errors: string[];
  warnings: string[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

type ChoiceVectorInput = Record<string, string>;

type ArcDefinitionRow = {
  id: string;
  key: string;
  title: string;
  description: string;
  tags: string[];
  is_enabled: boolean;
  created_at?: string;
};

type ArcStepRow = {
  id: string;
  arc_id: string;
  step_key: string;
  order_index: number;
  title: string;
  body: string;
  options: unknown[];
  due_offset_days: number;
  expires_after_days: number;
};

type EditorState = {
  draft: Storylet | null;
  dirty: boolean;
  validation: ValidationSummary | null;
  vectorInputs: ChoiceVectorInput;
  targetInputs: Record<string, string>;
  conditionInputs: Record<string, string>;
  error: string | null;
  saveState: SaveState;
  lastSavedAt: Date | null;
};

type RuleDraft = {
  key: string;
  triggerText: string;
  resolveText: string;
  timingText: string;
  payloadText: string;
};

const DEFAULT_FILTERS: FilterState = {
  search: "",
  phase: "",
  type: "",
  active: "all",
  hasErrors: "all",
};

function getTagValue(tags: string[] | undefined, prefix: string) {
  if (!tags) return "";
  const match = tags.find((tag) => tag.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

function stripTags(tags: string[], prefix: string) {
  return tags.filter((tag) => !tag.startsWith(prefix));
}

function setTagValue(tags: string[], prefix: string, value: string) {
  const trimmed = value.trim();
  const without = stripTags(tags, prefix);
  if (!trimmed) return without;
  return [...without, `${prefix}${trimmed}`];
}

function getConsequenceKeys(tags: string[] | undefined) {
  if (!tags) return [];
  return tags
    .filter((tag) => tag.startsWith("consequence:"))
    .map((tag) => tag.replace("consequence:", ""))
    .filter(Boolean);
}

function setConsequenceKeys(tags: string[], keys: string[]) {
  const without = stripTags(tags, "consequence:");
  const cleaned = keys.map((key) => key.trim()).filter(Boolean);
  return [...without, ...cleaned.map((key) => `consequence:${key}`)];
}

function formatVectorInput(vectors?: Record<string, number>) {
  if (!vectors || Object.keys(vectors).length === 0) return "";
  return Object.entries(vectors)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

function parseVectorInput(value: string): {
  ok: boolean;
  result: Record<string, number>;
} {
  const result: Record<string, number> = {};
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, result: {} };
  const pairs = trimmed.split(",");
  for (const pair of pairs) {
    const [rawKey, rawValue] = pair.split("=");
    const key = rawKey?.trim();
    const valueStr = rawValue?.trim();
    if (!key || valueStr === undefined) {
      return { ok: false, result: {} };
    }
    const num = Number(valueStr);
    if (!Number.isFinite(num)) {
      return { ok: false, result: {} };
    }
    result[key] = num;
  }
  return { ok: true, result };
}

function createBlankStorylet(tags: string[] = []): Omit<Storylet, "id"> {
  return {
    slug: `draft-${Date.now()}`,
    title: "Untitled storylet",
    body: "Draft body.",
    choices: [{ id: "continue", label: "Continue" }],
    is_active: false,
    tags,
    requirements: {},
    weight: 100,
  };
}

function safeParseJson(value: string) {
  if (!value.trim()) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(value) as Record<string, unknown> };
  } catch {
    return { ok: false, value: null as null };
  }
}

function formatJson(value: Record<string, unknown> | undefined) {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

export default function ContentStudioLitePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("list");
  const defaultTabApplied = useRef(false);
  const flags = useMemo(() => getFeatureFlags(), []);
  const envTesterMode = useMemo(() => getAppMode().testerMode, []);
  const [userTestMode, setUserTestMode] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [contentArcs, setContentArcs] = useState<ContentArc[]>([]);
  const [contentArcSteps, setContentArcSteps] = useState<ContentArcStep[]>([]);
  const [contentArcsLoading, setContentArcsLoading] = useState(false);
  const [contentArcsError, setContentArcsError] = useState<string | null>(null);
  const [selectedArcKey, setSelectedArcKey] = useState<string | null>(null);
  const [arcDraft, setArcDraft] = useState<ContentArc | null>(null);
  const [arcDefinitions, setArcDefinitions] = useState<ArcDefinitionRow[]>([]);
  const [arcDefinitionSteps, setArcDefinitionSteps] = useState<ArcStepRow[]>([]);
  const [arcDefinitionsLoading, setArcDefinitionsLoading] = useState(false);
  const [arcDefinitionsError, setArcDefinitionsError] = useState<string | null>(null);
  const [selectedArcDefinitionId, setSelectedArcDefinitionId] = useState<string | null>(
    null
  );
  const [arcDefinitionDraft, setArcDefinitionDraft] = useState<ArcDefinitionRow | null>(
    null
  );
  const [arcDefinitionDirty, setArcDefinitionDirty] = useState(false);
  const [arcDefinitionSaveState, setArcDefinitionSaveState] = useState<SaveState>("idle");
  const [arcDefinitionLastSavedAt, setArcDefinitionLastSavedAt] =
    useState<Date | null>(null);
  const [arcDefinitionSaveError, setArcDefinitionSaveError] = useState<string | null>(
    null
  );
  const [arcSaveState, setArcSaveState] = useState<SaveState>("idle");
  const [stepDraft, setStepDraft] = useState<ContentArcStep | null>(null);
  const [stepChoicesText, setStepChoicesText] = useState("");
  const [stepSaveState, setStepSaveState] = useState<SaveState>("idle");
  const [arcDirty, setArcDirty] = useState(false);
  const [stepDirty, setStepDirty] = useState(false);
  const [storyletJump, setStoryletJump] = useState("");
  const [arcJump, setArcJump] = useState("");
  const [arcDefinitionJump, setArcDefinitionJump] = useState("");
  const [resourceHelperValue, setResourceHelperValue] = useState("");
  const [entryNodeInput, setEntryNodeInput] = useState("");
  const [shockOnly, setShockOnly] = useState(true);
  const [activeShockKey, setActiveShockKey] = useState<string>(
    SHOCK_ARC_KEYS[0]
  );

  useEffect(() => {
    if (defaultTabApplied.current) return;
    defaultTabApplied.current = true;
    if (flags.contentStudioGraphEnabled) {
      setActiveTab("graph");
    }
  }, [flags.contentStudioGraphEnabled]);
  const [arcViewMode, setArcViewMode] = useState<"editor" | "graph">("editor");
  const arcAutosaveTimerRef = useRef<number | null>(null);
  const stepAutosaveTimerRef = useRef<number | null>(null);
  const [arcLastSavedAt, setArcLastSavedAt] = useState<Date | null>(null);
  const [stepLastSavedAt, setStepLastSavedAt] = useState<Date | null>(null);
  const [arcSaveError, setArcSaveError] = useState<string | null>(null);
  const [stepSaveError, setStepSaveError] = useState<string | null>(null);
  const [validationMap, setValidationMap] = useState<Record<string, ValidationSummary>>(
    {}
  );
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [editor, setEditor] = useState<EditorState>({
    draft: null,
    dirty: false,
    validation: null,
    vectorInputs: {},
    targetInputs: {},
    conditionInputs: {},
    error: null,
    saveState: "idle",
    lastSavedAt: null,
  });
  const [rules, setRules] = useState<DelayedConsequenceRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft | null>(null);
  const [ruleSaveState, setRuleSaveState] = useState<SaveState>("idle");
  const [ruleTestOutput, setRuleTestOutput] = useState<string | null>(null);
  const [remnantRules, setRemnantRules] = useState<RemnantRule[]>([]);
  const [remnantRulesLoading, setRemnantRulesLoading] = useState(false);
  const [remnantRulesError, setRemnantRulesError] = useState<string | null>(null);
  const [remnantRuleDraft, setRemnantRuleDraft] = useState<{
    remnant_key: string;
    discoveryText: string;
    unlockText: string;
    capsText: string;
  } | null>(null);
  const [remnantRuleSaveState, setRemnantRuleSaveState] =
    useState<SaveState>("idle");
  const [remnantRuleTestOutput, setRemnantRuleTestOutput] =
    useState<string | null>(null);
  const [publishNote, setPublishNote] = useState("");
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(
    null
  );
  const [diffSummary, setDiffSummary] = useState<{
    storylets: { added: string[]; removed: string[]; modified: string[] };
    consequences: { added: string[]; removed: string[]; modified: string[] };
    remnantRules: { added: string[]; removed: string[]; modified: string[] };
  } | null>(null);
  const [rollbackState, setRollbackState] = useState<SaveState>("idle");
  const autosaveTimerRef = useRef<number | null>(null);

  // Fetch user's test_mode setting for authorization
  useEffect(() => {
    async function loadUserTestMode() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const settings = await fetchDevSettings(user.id);
      setUserTestMode(settings.test_mode);
    }
    loadUserTestMode();
  }, []);

  // Combined tester mode: env-based OR user's test_mode setting
  const testerMode = envTesterMode || userTestMode;

  useEffect(() => {
    if (!flags.contentStudioLiteEnabled) return;
    trackEvent({ event_type: "studio_opened", payload: { tab: activeTab } });
  }, [flags.contentStudioLiteEnabled]);

  useEffect(() => {
    if (!flags.contentStudioLiteEnabled) return;
    trackEvent({ event_type: "studio_tab_changed", payload: { tab: activeTab } });
  }, [activeTab, flags.contentStudioLiteEnabled]);

  const tabEnabled = (tab: TabKey) => {
    if (!flags.contentStudioLiteEnabled) return false;
    if (tab === "graph") return flags.contentStudioGraphEnabled;
    if (tab === "preview") return flags.contentStudioPreviewEnabled;
    if (tab === "history") return flags.contentStudioHistoryEnabled;
    if (tab === "rules") return flags.contentStudioRemnantRulesEnabled;
    return true;
  };

  const loadContentArcs = useCallback(async () => {
    setContentArcsLoading(true);
    setContentArcsError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("No session found.");
      }
      const res = await fetch("/api/admin/content-arcs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load arcs");
      }
      setContentArcs(json.arcs ?? []);
      setContentArcSteps(json.steps ?? []);
    } catch (err) {
      console.error(err);
      setContentArcsError(err instanceof Error ? err.message : "Failed to load arcs");
    } finally {
      setContentArcsLoading(false);
    }
  }, []);

  const loadArcDefinitions = useCallback(async () => {
    setArcDefinitionsLoading(true);
    setArcDefinitionsError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("No session found.");
      }
      const [defsRes, stepsRes] = await Promise.all([
        fetch("/api/admin/arc-definitions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/arc-steps", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const defsJson = await defsRes.json();
      if (!defsRes.ok) {
        throw new Error(defsJson.error ?? "Failed to load arc definitions");
      }
      const stepsJson = await stepsRes.json();
      if (!stepsRes.ok) {
        throw new Error(stepsJson.error ?? "Failed to load arc steps");
      }
      setArcDefinitions(defsJson.arcs ?? []);
      setArcDefinitionSteps(stepsJson.steps ?? []);
    } catch (err) {
      console.error(err);
      setArcDefinitionsError(
        err instanceof Error ? err.message : "Failed to load arc definitions"
      );
    } finally {
      setArcDefinitionsLoading(false);
    }
  }, []);

  const validateForList = useCallback((items: Storylet[]) => {
    const next: Record<string, ValidationSummary> = {};
    items.forEach((storylet) => {
      const validation = validateStorylet(storylet);
      const extraErrors: string[] = [];
      storylet.choices.forEach((choice) => {
        const target =
          (choice as StoryletChoice & { targetStoryletId?: string })
            .targetStoryletId ?? "";
        if (target && !items.some((s) => s.id === target || s.slug === target)) {
          extraErrors.push(`choices.${choice.id}.targetStoryletId invalid`);
        }
      });
      next[storylet.id] = {
        errors: [
          ...(validation.ok ? [] : validation.errors),
          ...extraErrors,
        ],
        warnings: [],
      };
    });
    setValidationMap(next);
  }, []);

  const loadStorylets = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("No session found.");
      }
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.active !== "all") params.set("active", filters.active);
      const res = await fetch(`/api/admin/storylets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load storylets");
      }
      const rows = (json.storylets ?? []) as Storylet[];
      setStorylets(rows);
      validateForList(rows);
    } catch (err) {
      console.error(err);
      setListError(err instanceof Error ? err.message : "Failed to load storylets");
    } finally {
      setListLoading(false);
    }
  }, [filters.search, filters.active, validateForList]);

  useEffect(() => {
    if (!flags.contentStudioLiteEnabled) return;
    loadStorylets();
  }, [flags.contentStudioLiteEnabled, loadStorylets]);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/admin/consequences", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load rules");
      }
      setRules(json.rules ?? []);
    } catch (err) {
      console.error(err);
      setRulesError(err instanceof Error ? err.message : "Failed to load rules");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!flags.contentStudioLiteEnabled) return;
    if (activeTab !== "rules") return;
    loadRules();
  }, [flags.contentStudioLiteEnabled, activeTab, loadRules]);

  const loadRemnantRules = useCallback(async () => {
    setRemnantRulesLoading(true);
    setRemnantRulesError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/admin/remnant-rules", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load remnant rules");
      }
      setRemnantRules(json.rules ?? []);
    } catch (err) {
      console.error(err);
      setRemnantRulesError(
        err instanceof Error ? err.message : "Failed to load remnant rules"
      );
    } finally {
      setRemnantRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!flags.contentStudioLiteEnabled) return;
    if (activeTab !== "rules") return;
    loadRemnantRules();
  }, [flags.contentStudioLiteEnabled, activeTab, loadRemnantRules]);

  useEffect(() => {
    if (!flags.contentStudioLiteEnabled) return;
    if (activeTab !== "arcs") return;
    loadArcDefinitions();
  }, [flags.contentStudioLiteEnabled, activeTab, loadArcDefinitions]);

  const stepsByArc = useMemo(() => {
    const map = new Map<string, ContentArcStep[]>();
    contentArcSteps.forEach((step) => {
      if (!map.has(step.arc_key)) map.set(step.arc_key, []);
      map.get(step.arc_key)?.push(step);
    });
    map.forEach((steps) => steps.sort((a, b) => a.step_index - b.step_index));
    return map;
  }, [contentArcSteps]);

  const selectedArc = useMemo(() => {
    if (!selectedArcKey) return null;
    return contentArcs.find((arc) => arc.key === selectedArcKey) ?? null;
  }, [contentArcs, selectedArcKey]);

  const arcDefinitionStepsByArcId = useMemo(() => {
    const map = new Map<string, ArcStepRow[]>();
    arcDefinitionSteps.forEach((step) => {
      if (!map.has(step.arc_id)) map.set(step.arc_id, []);
      map.get(step.arc_id)?.push(step);
    });
    map.forEach((steps) => steps.sort((a, b) => a.order_index - b.order_index));
    return map;
  }, [arcDefinitionSteps]);

  const selectedArcDefinition = useMemo(() => {
    if (!selectedArcDefinitionId) return null;
    return arcDefinitions.find((arc) => arc.id === selectedArcDefinitionId) ?? null;
  }, [arcDefinitions, selectedArcDefinitionId]);

  const selectArc = (arc: ContentArc) => {
    setSelectedArcKey(arc.key);
    setArcDraft({ ...arc });
    setArcSaveState("idle");
    setArcDirty(false);
    setArcLastSavedAt(null);
    setArcSaveError(null);
    setStepDraft(null);
    setStepChoicesText("");
    setStepSaveState("idle");
    setStepDirty(false);
    setStepLastSavedAt(null);
    setStepSaveError(null);
  };

  const selectArcDefinition = (arc: ArcDefinitionRow) => {
    setSelectedArcDefinitionId(arc.id);
    setArcDefinitionDraft({ ...arc });
    setArcDefinitionDirty(false);
    setArcDefinitionSaveState("idle");
    setArcDefinitionLastSavedAt(null);
    setArcDefinitionSaveError(null);
    setActiveShockKey(arc.key);
  };

  const saveArcDefinition = async () => {
    if (!arcDefinitionDraft) return;
    setArcDefinitionSaveState("saving");
    setArcDefinitionSaveError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch(`/api/admin/arc-definitions/${arcDefinitionDraft.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: arcDefinitionDraft.title,
          description: arcDefinitionDraft.description,
          tags: arcDefinitionDraft.tags ?? [],
          is_enabled: arcDefinitionDraft.is_enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save arc definition");
      }
      setArcDefinitionSaveState("saved");
      setArcDefinitionDirty(false);
      setArcDefinitionLastSavedAt(new Date());
      await loadArcDefinitions();
    } catch (err) {
      console.error(err);
      setArcDefinitionSaveState("error");
      setArcDefinitionSaveError(
        err instanceof Error ? err.message : "Failed to save arc definition"
      );
    }
  };

  const deleteArcStep = async (stepId: string) => {
    const confirmed = window.confirm("Delete this step? This cannot be undone.");
    if (!confirmed) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch(`/api/admin/arc-steps/${stepId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to delete step");
      }
      await loadArcDefinitions();
    } catch (err) {
      console.error(err);
      setArcDefinitionsError(
        err instanceof Error ? err.message : "Failed to delete step"
      );
    }
  };

  const selectStep = (step: ContentArcStep) => {
    setStepDraft({ ...step });
    setStepChoicesText(JSON.stringify(step.choices ?? [], null, 2));
    setStepSaveState("idle");
    setStepDirty(false);
    setStepLastSavedAt(null);
    setStepSaveError(null);
  };

  const saveArc = async () => {
    if (!arcDraft) return;
    setArcSaveState("saving");
    setArcSaveError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch(`/api/admin/content-arcs/${arcDraft.key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: arcDraft.title,
          description: arcDraft.description,
          tags: arcDraft.tags ?? [],
          is_active: arcDraft.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save arc");
      }
      await loadContentArcs();
      setArcSaveState("saved");
      setArcDirty(false);
      setArcLastSavedAt(new Date());
    } catch (err) {
      console.error(err);
      setArcSaveState("error");
      const message = err instanceof Error ? err.message : "Failed to save arc";
      setArcSaveError(message);
      setContentArcsError(message);
    }
  };

  const createStep = () => {
    if (!selectedArc) return;
    const steps = stepsByArc.get(selectedArc.key) ?? [];
    const nextIndex = steps.length
      ? Math.max(...steps.map((s) => s.step_index)) + 1
      : 0;
    const draft: ContentArcStep = {
      arc_key: selectedArc.key,
      step_index: nextIndex,
      title: "New step",
      body: "Draft body.",
      choices: [],
      created_at: new Date().toISOString(),
    };
    selectStep(draft);
  };

  const saveStep = async () => {
    if (!stepDraft) return;
    let parsedChoices: unknown;
    try {
      parsedChoices = stepChoicesText.trim() ? JSON.parse(stepChoicesText) : [];
    } catch {
      setContentArcsError("Choices JSON is invalid.");
      return;
    }
    setStepSaveState("saving");
    setStepSaveError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/admin/content-arc-steps", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          arc_key: stepDraft.arc_key,
          step_index: stepDraft.step_index,
          title: stepDraft.title,
          body: stepDraft.body,
          choices: parsedChoices,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save step");
      }
      await loadContentArcs();
      setStepSaveState("saved");
      setStepDirty(false);
      setStepLastSavedAt(new Date());
    } catch (err) {
      console.error(err);
      setStepSaveState("error");
      const message = err instanceof Error ? err.message : "Failed to save step";
      setStepSaveError(message);
      setContentArcsError(message);
    }
  };

  useEffect(() => {
    if (!arcDraft || !arcDirty) return;
    if (arcAutosaveTimerRef.current) {
      window.clearTimeout(arcAutosaveTimerRef.current);
    }
    arcAutosaveTimerRef.current = window.setTimeout(() => {
      saveArc();
    }, 900);
    return () => {
      if (arcAutosaveTimerRef.current) {
        window.clearTimeout(arcAutosaveTimerRef.current);
      }
    };
  }, [arcDraft, arcDirty]);

  useEffect(() => {
    if (!stepDraft || !stepDirty) return;
    if (stepAutosaveTimerRef.current) {
      window.clearTimeout(stepAutosaveTimerRef.current);
    }
    stepAutosaveTimerRef.current = window.setTimeout(() => {
      saveStep();
    }, 900);
    return () => {
      if (stepAutosaveTimerRef.current) {
        window.clearTimeout(stepAutosaveTimerRef.current);
      }
    };
  }, [stepDraft, stepDirty]);

  const selectRule = (rule: DelayedConsequenceRule) => {
    setRuleDraft({
      key: rule.key,
      triggerText: formatJson(rule.trigger),
      resolveText: formatJson(rule.resolve),
      timingText: formatJson(rule.timing),
      payloadText: formatJson(rule.payload),
    });
    setRuleSaveState("idle");
    setRuleTestOutput(null);
  };

  const createRule = async () => {
    const key = `rule_${Date.now()}`;
    setRuleDraft({
      key,
      triggerText: "",
      resolveText: "",
      timingText: "",
      payloadText: "",
    });
    setRuleSaveState("idle");
    setRuleTestOutput(null);
  };

  const saveRule = async () => {
    if (!ruleDraft) return;
    const trigger = safeParseJson(ruleDraft.triggerText);
    const resolve = safeParseJson(ruleDraft.resolveText);
    const timing = safeParseJson(ruleDraft.timingText);
    const payload = safeParseJson(ruleDraft.payloadText);
    if (!ruleDraft.key.trim()) {
      setRulesError("Key is required.");
      return;
    }
    if (!trigger.ok || !resolve.ok || !timing.ok || !payload.ok) {
      setRulesError("One or more JSON blocks are invalid.");
      return;
    }
    setRuleSaveState("saving");
    setRulesError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const existing = rules.find((rule) => rule.key === ruleDraft.key);
      const res = await fetch(
        existing
          ? `/api/admin/consequences/${ruleDraft.key}`
          : "/api/admin/consequences",
        {
          method: existing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: ruleDraft.key,
            trigger: trigger.value,
            resolve: resolve.value,
            timing: timing.value,
            payload: payload.value,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save rule");
      }
      await loadRules();
      setRuleSaveState("saved");
      trackEvent({
        event_type: existing ? "consequence_rule_updated" : "consequence_rule_created",
        payload: { key: ruleDraft.key },
      });
    } catch (err) {
      console.error(err);
      setRulesError(err instanceof Error ? err.message : "Failed to save rule");
      setRuleSaveState("error");
    }
  };

  const deleteRule = async (key: string) => {
    setRulesError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch(`/api/admin/consequences/${key}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to delete rule");
      }
      if (ruleDraft?.key === key) setRuleDraft(null);
      await loadRules();
    } catch (err) {
      console.error(err);
      setRulesError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const testRule = () => {
    if (!ruleDraft) return;
    const trigger = safeParseJson(ruleDraft.triggerText);
    const resolve = safeParseJson(ruleDraft.resolveText);
    if (!trigger.ok || !resolve.ok) {
      setRuleTestOutput("Invalid JSON in trigger or resolve.");
      return;
    }
    setRuleTestOutput(
      `Trigger: ${JSON.stringify(trigger.value)} → Resolve: ${JSON.stringify(
        resolve.value
      )}`
    );
    trackEvent({
      event_type: "consequence_rule_tested",
      payload: { key: ruleDraft.key },
    });
  };

  const selectRemnantRule = (rule: RemnantRule) => {
    setRemnantRuleDraft({
      remnant_key: rule.remnant_key,
      discoveryText: formatJson(rule.discovery),
      unlockText: formatJson(rule.unlock),
      capsText: formatJson(rule.caps),
    });
    setRemnantRuleSaveState("idle");
    setRemnantRuleTestOutput(null);
  };

  const createRemnantRule = () => {
    const key = REMNANT_KEYS[0] ?? "";
    setRemnantRuleDraft({
      remnant_key: key,
      discoveryText: "",
      unlockText: "",
      capsText: "",
    });
    setRemnantRuleSaveState("idle");
    setRemnantRuleTestOutput(null);
  };

  const saveRemnantRule = async () => {
    if (!remnantRuleDraft) return;
    const discovery = safeParseJson(remnantRuleDraft.discoveryText);
    const unlock = safeParseJson(remnantRuleDraft.unlockText);
    const caps = safeParseJson(remnantRuleDraft.capsText);
    if (!remnantRuleDraft.remnant_key) {
      setRemnantRulesError("Remnant key is required.");
      return;
    }
    if (!discovery.ok || !unlock.ok || !caps.ok) {
      setRemnantRulesError("One or more JSON blocks are invalid.");
      return;
    }
    setRemnantRuleSaveState("saving");
    setRemnantRulesError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const existing = remnantRules.find(
        (rule) => rule.remnant_key === remnantRuleDraft.remnant_key
      );
      const res = await fetch(
        existing
          ? `/api/admin/remnant-rules/${remnantRuleDraft.remnant_key}`
          : "/api/admin/remnant-rules",
        {
          method: existing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            remnant_key: remnantRuleDraft.remnant_key,
            discovery: discovery.value,
            unlock: unlock.value,
            caps: caps.value,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save remnant rule");
      }
      await loadRemnantRules();
      setRemnantRuleSaveState("saved");
      trackEvent({
        event_type: "remnant_rule_updated",
        payload: { remnant_key: remnantRuleDraft.remnant_key },
      });
    } catch (err) {
      console.error(err);
      setRemnantRulesError(
        err instanceof Error ? err.message : "Failed to save remnant rule"
      );
      setRemnantRuleSaveState("error");
    }
  };

  const testRemnantRule = () => {
    if (!remnantRuleDraft) return;
    const discovery = safeParseJson(remnantRuleDraft.discoveryText);
    const unlock = safeParseJson(remnantRuleDraft.unlockText);
    if (!discovery.ok || !unlock.ok) {
      setRemnantRuleTestOutput("Invalid JSON in discovery or unlock.");
      return;
    }
    setRemnantRuleTestOutput(
      `Discovery: ${JSON.stringify(discovery.value)} · Unlock: ${JSON.stringify(
        unlock.value
      )}`
    );
    trackEvent({
      event_type: "remnant_rule_tested",
      payload: { remnant_key: remnantRuleDraft.remnant_key },
    });
  };

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/admin/content-versions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load versions");
      }
      setVersions(json.versions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!flags.contentStudioLiteEnabled) return;
    if (!flags.contentStudioHistoryEnabled) return;
    if (activeTab !== "history") return;
    loadVersions();
    trackEvent({ event_type: "history_viewed" });
  }, [flags.contentStudioLiteEnabled, flags.contentStudioHistoryEnabled, activeTab, loadVersions]);

  const publishContent = async () => {
    if (!publishNote.trim()) {
      setListError("Publish note required.");
      return;
    }
    setPublishState("saving");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/admin/content-versions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: publishNote }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Publish failed");
      }
      setPublishNote("");
      setPublishState("saved");
      trackEvent({ event_type: "publish_succeeded" });
      loadVersions();
    } catch (err) {
      console.error(err);
      setPublishState("error");
      trackEvent({ event_type: "publish_failed" });
      setListError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      trackEvent({ event_type: "publish_attempted" });
    }
  };

  const buildDiff = (
    snapshot: ContentSnapshot,
    current: {
      storylets: Storylet[];
      consequences: DelayedConsequenceRule[];
      remnantRules: RemnantRule[];
    }
  ) => {
    const diffList = <T extends { id?: string; key?: string; remnant_key?: string }>(
      next: T[],
      prev: T[],
      keySelector: (item: T) => string
    ) => {
      const nextMap = new Map(next.map((item) => [keySelector(item), item]));
      const prevMap = new Map(prev.map((item) => [keySelector(item), item]));
      const added: string[] = [];
      const removed: string[] = [];
      const modified: string[] = [];
      nextMap.forEach((item, key) => {
        if (!prevMap.has(key)) {
          added.push(key);
        } else {
          const prevItem = prevMap.get(key);
          if (JSON.stringify(prevItem) !== JSON.stringify(item)) {
            modified.push(key);
          }
        }
      });
      prevMap.forEach((_item, key) => {
        if (!nextMap.has(key)) removed.push(key);
      });
      return { added, removed, modified };
    };

    return {
      storylets: diffList(
        snapshot.storylets as Storylet[],
        current.storylets,
        (item) => item.id ?? ""
      ),
      consequences: diffList(
        snapshot.consequences as DelayedConsequenceRule[],
        current.consequences,
        (item) => (item as DelayedConsequenceRule).key
      ),
      remnantRules: diffList(
        snapshot.remnantRules as RemnantRule[],
        current.remnantRules,
        (item) => (item as RemnantRule).remnant_key
      ),
    };
  };

  const handleSelectVersion = (version: ContentVersion) => {
    setSelectedVersion(version);
    const diff = buildDiff(version.snapshot, {
      storylets,
      consequences: rules,
      remnantRules,
    });
    setDiffSummary(diff);
    trackEvent({
      event_type: "diff_viewed",
      payload: { version_id: version.version_id },
    });
  };

  const handleRollback = async (version: ContentVersion) => {
    const summary = diffSummary
      ? `Storylets +${diffSummary.storylets.added.length}/-${diffSummary.storylets.removed.length} (~${diffSummary.storylets.modified.length} changed)`
      : "This will replace published content with the selected snapshot.";
    const ok = window.confirm(`Rollback to ${version.version_id}?\n${summary}`);
    if (!ok) return;
    setRollbackState("saving");
    trackEvent({
      event_type: "rollback_attempted",
      payload: { version_id: version.version_id },
    });
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const res = await fetch("/api/admin/content-versions/rollback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ version_id: version.version_id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Rollback failed");
      }
      setRollbackState("saved");
      trackEvent({
        event_type: "rollback_succeeded",
        payload: { version_id: version.version_id },
      });
      loadVersions();
    } catch (err) {
      console.error(err);
      setRollbackState("error");
      trackEvent({
        event_type: "rollback_failed",
        payload: { version_id: version.version_id },
      });
      setListError(err instanceof Error ? err.message : "Rollback failed");
    }
  };

  const entryTagForArc = useCallback(
    (arcKey: string) => `entry:${arcKey}`,
    []
  );

  const shockStorylets = useMemo(
    () =>
      storylets.filter((storylet) =>
        (storylet.tags ?? []).includes(activeShockKey)
      ),
    [storylets, activeShockKey]
  );

  const entryNodeIds = useMemo(
    () =>
      shockStorylets
        .filter((storylet) =>
          (storylet.tags ?? []).includes(entryTagForArc(activeShockKey))
        )
        .map((storylet) => storylet.id),
    [shockStorylets, activeShockKey, entryTagForArc]
  );

  const filteredStorylets = useMemo(() => {
    const base = shockOnly
      ? storylets.filter((storylet) =>
          (storylet.tags ?? []).includes(activeShockKey)
        )
      : storylets;
    return base.filter((storylet) => {
      const tags = storylet.tags ?? [];
      const phase = getTagValue(tags, "phase:");
      const type = getTagValue(tags, "type:");
      if (filters.phase && phase !== filters.phase) return false;
      if (filters.type && type !== filters.type) return false;
      if (filters.hasErrors !== "all") {
        const hasErrors = (validationMap[storylet.id]?.errors.length ?? 0) > 0;
        if (filters.hasErrors === "true" && !hasErrors) return false;
        if (filters.hasErrors === "false" && hasErrors) return false;
      }
      return true;
    });
  }, [
    storylets,
    filters.phase,
    filters.type,
    filters.hasErrors,
    validationMap,
    shockOnly,
    activeShockKey,
  ]);

  const storyletOptions = useMemo(
    () =>
      filteredStorylets.map((storylet) => ({
        value: storylet.id,
        label: storylet.title || storylet.slug || storylet.id,
      })),
    [filteredStorylets]
  );

  const storyletLookup = useMemo(() => {
    const map = new Map<string, Storylet>();
    filteredStorylets.forEach((storylet) => {
      map.set(storylet.id, storylet);
      if (storylet.slug) {
        map.set(`slug:${storylet.slug}`, storylet);
      }
    });
    return map;
  }, [filteredStorylets]);

  const shockArcDefinitions = useMemo(
    () => arcDefinitions.filter((arc) => SHOCK_ARC_KEYS.includes(arc.key as any)),
    [arcDefinitions]
  );

  const shockArcMissing = useMemo(() => {
    const existing = new Set(shockArcDefinitions.map((arc) => arc.key));
    return SHOCK_ARC_KEYS.filter((key) => !existing.has(key));
  }, [shockArcDefinitions]);

  useEffect(() => {
    if (!shockArcDefinitions.length) return;
    if (!shockArcDefinitions.some((arc) => arc.key === activeShockKey)) {
      setActiveShockKey(shockArcDefinitions[0].key);
    }
  }, [shockArcDefinitions, activeShockKey]);

  const arcOptions = useMemo(
    () =>
      shockArcDefinitions.map((arc) => ({
        value: arc.key,
        label: arc.title,
      })),
    [shockArcDefinitions]
  );

  const arcDefinitionOptions = useMemo(
    () =>
      shockArcDefinitions.map((arc) => ({
        value: arc.key,
        label: arc.title,
      })),
    [shockArcDefinitions]
  );

  useEffect(() => {
    if (!shockArcDefinitions.length) return;
    if (
      !selectedArcDefinitionId ||
      !shockArcDefinitions.some((arc) => arc.id === selectedArcDefinitionId)
    ) {
      selectArcDefinition(shockArcDefinitions[0]);
    }
  }, [shockArcDefinitions, selectedArcDefinitionId]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    storylets.forEach((storylet) => {
      (storylet.tags ?? []).forEach((tag) => set.add(tag));
    });
    arcDefinitions.forEach((arc) => {
      (arc.tags ?? []).forEach((tag) => set.add(tag));
    });
    SHOCK_ARC_KEYS.forEach((key) => set.add(key));
    IDENTITY_TAG_OPTIONS.forEach((tag) => set.add(tag));
    PHASE_OPTIONS.forEach((tag) => set.add(`phase:${tag}`));
    TYPE_OPTIONS.forEach((tag) => set.add(`type:${tag}`));
    return Array.from(set)
      .filter(Boolean)
      .sort()
      .map((value) => ({ value }));
  }, [storylets, arcDefinitions]);

  const resourceKeyOptions = useMemo(
    () => RESOURCE_KEYS.map((value) => ({ value })),
    []
  );

  const selectStorylet = useCallback(
    (storylet: Storylet) => {
      const nextVectorInputs: ChoiceVectorInput = {};
      const nextTargetInputs: Record<string, string> = {};
      const nextConditionInputs: Record<string, string> = {};
      storylet.choices.forEach((choice) => {
        nextVectorInputs[choice.id] = formatVectorInput(
          choice.outcome?.deltas?.vectors
        );
        const target = (choice as StoryletChoice & { targetStoryletId?: string })
          .targetStoryletId;
        nextTargetInputs[choice.id] = target ?? "";
        nextConditionInputs[choice.id] = JSON.stringify(
          (choice as any).condition ?? {},
          null,
          2
        );
      });
      const validation = validateStorylet(storylet);
      setEditor({
        draft: storylet,
        dirty: false,
        validation: {
          errors: validation.ok ? [] : validation.errors,
          warnings: [],
        },
        vectorInputs: nextVectorInputs,
        targetInputs: nextTargetInputs,
        conditionInputs: nextConditionInputs,
        error: null,
        saveState: "idle",
        lastSavedAt: null,
      });
    },
    []
  );
  const selectStoryletAndEdit = useCallback(
    (storylet: Storylet) => {
      setActiveTab("list");
      selectStorylet(storylet);
    },
    [selectStorylet]
  );

  const createStorylet = async (baseTags: string[] = []) => {
    setListError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");
      const draft = createBlankStorylet(baseTags);
      const id = `draft_${Date.now()}`;
      const body = draft.body?.trim() ? draft.body : "Draft body.";
      const res = await fetch("/api/admin/storylets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          ...draft,
          body,
          requirements: {
            ...draft.requirements,
            audit: buildAuditMeta(data.session?.user?.email ?? null),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to create storylet");
      }
      if (typeof json.id !== "string") {
        throw new Error("Missing storylet id from server.");
      }
      const persistedId = json.id;
      const newRow: Storylet = { ...draft, id: persistedId, body };
      setStorylets((prev) => [newRow, ...prev.filter((row) => row.id !== id)]);
      selectStorylet(newRow);
      trackEvent({ event_type: "storylet_created", payload: { id: persistedId } });
    } catch (err) {
      console.error(err);
      setListError(err instanceof Error ? err.message : "Failed to create storylet");
    }
  };

  const persistStorylet = async (storylet: Storylet) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("No session found.");
    const res = await fetch(`/api/admin/storylets/${storylet.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...storylet,
        requirements: {
          ...(storylet.requirements ?? {}),
          audit: buildAuditMeta(data.session?.user?.email ?? null),
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Failed to save storylet");
    }
  };

  const setStartNode = async (storyletId: string) => {
    const entryTag = entryTagForArc(activeShockKey);
    const updated: Storylet[] = [];
    const entrySet = new Set(entryNodeIds);
    storylets.forEach((storylet) => {
      if (
        !storylet.tags?.includes(activeShockKey) ||
        (!entrySet.has(storylet.id) && storylet.id !== storyletId)
      ) {
        return;
      }
      const tags = new Set(storylet.tags ?? []);
      tags.delete(entryTag);
      if (storylet.id === storyletId) {
        tags.add(entryTag);
      }
      updated.push({ ...storylet, tags: Array.from(tags) });
    });
    try {
      await Promise.all(updated.map((storylet) => persistStorylet(storylet)));
      setStorylets((prev) =>
        prev.map((row) => updated.find((s) => s.id === row.id) ?? row)
      );
    } catch (err) {
      console.error(err);
      setListError(
        err instanceof Error ? err.message : "Failed to set start node"
      );
    }
  };

  const connectChoice = async (
    sourceId: string,
    choiceId: string,
    targetId: string
  ) => {
    const source = storylets.find((storylet) => storylet.id === sourceId);
    if (!source) return;
    const updatedChoices = source.choices.map((choice) =>
      choice.id === choiceId
        ? { ...choice, targetStoryletId: targetId || undefined }
        : choice
    );
    const updatedStorylet = { ...source, choices: updatedChoices };
    try {
      await persistStorylet(updatedStorylet);
      setStorylets((prev) =>
        prev.map((row) => (row.id === sourceId ? updatedStorylet : row))
      );
      if (editor.draft?.id === sourceId) {
        selectStorylet(updatedStorylet);
      }
    } catch (err) {
      console.error(err);
      setListError(
        err instanceof Error ? err.message : "Failed to connect nodes"
      );
    }
  };

  const addEntryNode = async (storyletId: string) => {
    const entryTag = entryTagForArc(activeShockKey);
    const storylet = storylets.find((row) => row.id === storyletId);
    if (!storylet) return;
    const tags = new Set(storylet.tags ?? []);
    tags.add(activeShockKey);
    tags.add(entryTag);
    const updated = { ...storylet, tags: Array.from(tags) };
    try {
      await persistStorylet(updated);
      setStorylets((prev) =>
        prev.map((row) => (row.id === storyletId ? updated : row))
      );
    } catch (err) {
      console.error(err);
      setListError(
        err instanceof Error ? err.message : "Failed to add entry node"
      );
    }
  };

  const removeEntryNode = async (storyletId: string) => {
    const entryTag = entryTagForArc(activeShockKey);
    const storylet = storylets.find((row) => row.id === storyletId);
    if (!storylet) return;
    const tags = (storylet.tags ?? []).filter((tag) => tag !== entryTag);
    const updated = { ...storylet, tags };
    try {
      await persistStorylet(updated);
      setStorylets((prev) =>
        prev.map((row) => (row.id === storyletId ? updated : row))
      );
    } catch (err) {
      console.error(err);
      setListError(
        err instanceof Error ? err.message : "Failed to remove entry node"
      );
    }
  };

  const updateDraft = (update: Partial<Storylet>) => {
    setEditor((prev) => {
      if (!prev.draft) return prev;
      return {
        ...prev,
        draft: { ...prev.draft, ...update },
        dirty: true,
        saveState: "idle",
      };
    });
  };

  const saveDraft = useCallback(
    async (autosave: boolean) => {
      if (!editor.draft) return;
      const draft = editor.draft;
      const validation = validateStorylet(draft);
      const extraErrors: string[] = [];
      Object.entries(editor.vectorInputs).forEach(([choiceId, value]) => {
        const parsed = parseVectorInput(value);
        if (!parsed.ok) {
          extraErrors.push(`choices.${choiceId}.vectors malformed`);
        }
      });
      draft.choices.forEach((choice) => {
        const target =
          (choice as StoryletChoice & { targetStoryletId?: string })
            .targetStoryletId ?? "";
        if (target && !storylets.some((s) => s.id === target)) {
          extraErrors.push(`choices.${choice.id}.targetStoryletId invalid`);
        }
      });
      const errors = validation.ok ? [] : validation.errors;
      const allErrors = [...errors, ...extraErrors];
      setEditor((prev) => ({
        ...prev,
        validation: { errors: allErrors, warnings: [] },
      }));
      if (allErrors.length > 0) {
        trackEvent({ event_type: "validation_error_detected" });
        if (autosave) {
          setEditor((prev) => ({ ...prev, saveState: "idle" }));
          return;
        }
        setEditor((prev) => ({
          ...prev,
          error: draft.is_active
            ? "Fix validation errors before publishing."
            : "Fix validation errors before saving.",
        }));
        return;
      }
      setEditor((prev) => ({ ...prev, saveState: "saving", error: null }));
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("No session found.");
        const requirements = {
          ...(draft.requirements ?? {}),
          audit: buildAuditMeta(data.session?.user?.email ?? null),
        };
        const safeDraft = allErrors.length > 0 && draft.is_active
          ? { ...draft, is_active: false }
          : draft;
        const res = await fetch(`/api/admin/storylets/${draft.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...safeDraft, requirements }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to save storylet");
        }
        setStorylets((prev) =>
          prev.map((storylet) => (storylet.id === draft.id ? draft : storylet))
        );
        validateForList(
          storylets.map((storylet) =>
            storylet.id === draft.id ? draft : storylet
          )
        );
        setEditor((prev) => ({
          ...prev,
          dirty: false,
          saveState: "saved",
          lastSavedAt: new Date(),
        }));
        trackEvent({ event_type: "storylet_updated", payload: { id: draft.id } });
      } catch (err) {
        console.error(err);
        setEditor((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to save storylet",
          saveState: "error",
        }));
      }
    },
    [editor.draft, editor.vectorInputs, storylets, validateForList]
  );

  useEffect(() => {
    if (!editor.draft || !editor.dirty) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      saveDraft(true);
    }, 900);
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [editor.draft, editor.dirty, saveDraft]);

  const applyChoiceUpdate = (choiceId: string, update: Partial<StoryletChoice>) => {
    if (!editor.draft) return;
    const nextChoices = editor.draft.choices.map((choice) =>
      choice.id === choiceId ? { ...choice, ...update } : choice
    );
    updateDraft({ choices: nextChoices });
  };

  const addChoice = () => {
    if (!editor.draft) return;
    const nextId = `choice_${editor.draft.choices.length + 1}`;
    updateDraft({
      choices: [...editor.draft.choices, { id: nextId, label: "New choice" }],
    });
    setEditor((prev) => ({
      ...prev,
      vectorInputs: { ...prev.vectorInputs, [nextId]: "" },
      targetInputs: { ...prev.targetInputs, [nextId]: "" },
      conditionInputs: {
        ...prev.conditionInputs,
        [nextId]: JSON.stringify({}, null, 2),
      },
    }));
  };

  const removeChoice = (choiceId: string) => {
    if (!editor.draft) return;
    updateDraft({
      choices: editor.draft.choices.filter((choice) => choice.id !== choiceId),
    });
  };

  const moveChoice = (choiceId: string, direction: "up" | "down") => {
    if (!editor.draft) return;
    const idx = editor.draft.choices.findIndex((choice) => choice.id === choiceId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editor.draft.choices.length) return;
    const next = [...editor.draft.choices];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    updateDraft({ choices: next });
  };

  const activeStorylet = editor.draft;
  const activeTags = activeStorylet?.tags ?? [];
  const activePhase = getTagValue(activeTags, "phase:");
  const activeType = getTagValue(activeTags, "type:");
  const activeConsequences = getConsequenceKeys(activeTags).join(", ");
  const extraTags = stripTags(
    stripTags(stripTags(activeTags, "phase:"), "type:"),
    "consequence:"
  ).join(", ");

  const storyletWarnings = useMemo(() => {
    if (!activeStorylet) return [];
    const warnings: string[] = [];
    const validIdentityTags = new Set<string>(IDENTITY_TAG_OPTIONS);
    const validNpcIds = new Set(NPC_ID_OPTIONS);
    activeStorylet.choices.forEach((choice) => {
      const target = (choice as StoryletChoice & { targetStoryletId?: string })
        .targetStoryletId;
      if (!target) {
        warnings.push(`Choice "${choice.id}" is missing a next storylet.`);
        return;
      }
      if (target === activeStorylet.id) {
        warnings.push(`Choice "${choice.id}" targets itself.`);
        return;
      }
      if (!storyletLookup.has(target) && !storyletLookup.has(`slug:${target}`)) {
        warnings.push(`Choice "${choice.id}" targets missing storylet "${target}".`);
      }
      const identityTags = (choice as { identity_tags?: string[] }).identity_tags;
      if (identityTags?.some((tag) => !validIdentityTags.has(tag))) {
        warnings.push(`Choice "${choice.id}" has unknown identity tag.`);
      }
      const relationalEffects = (choice as { relational_effects?: Record<string, unknown> })
        .relational_effects;
      if (
        relationalEffects &&
        Object.keys(relationalEffects).some((key) => !validNpcIds.has(key))
      ) {
        warnings.push(`Choice "${choice.id}" references unknown NPC id.`);
      }
      const timeCost = (choice as { time_cost?: number }).time_cost;
      if (typeof timeCost !== "undefined" && typeof timeCost !== "number") {
        warnings.push(`Choice "${choice.id}" has invalid time_cost.`);
      }
      const energyCost = (choice as { energy_cost?: number }).energy_cost;
      if (typeof energyCost !== "undefined" && typeof energyCost !== "number") {
        warnings.push(`Choice "${choice.id}" has invalid energy_cost.`);
      }
    });
    return warnings;
  }, [activeStorylet, storyletLookup]);

  const stepWarnings = useMemo(() => {
    if (!stepDraft) return [];
    const warnings: string[] = [];
    let parsed: unknown;
    try {
      parsed = stepChoicesText ? JSON.parse(stepChoicesText) : null;
    } catch {
      return warnings;
    }
    if (!Array.isArray(parsed)) return warnings;
    const stepIndices = new Set(
      (stepsByArc.get(stepDraft.arc_key) ?? []).map((step) => step.step_index)
    );
    const validResources = new Set(RESOURCE_KEYS);
    parsed.forEach((choice) => {
      if (!choice || typeof choice !== "object") return;
      const nextIndex = (choice as { next_step_index?: number }).next_step_index;
      if (typeof nextIndex === "number" && !stepIndices.has(nextIndex)) {
        warnings.push(`Choice points to missing step index ${nextIndex}.`);
      }
      const costs = (choice as { costs?: Record<string, unknown> }).costs;
      const rewards = (choice as { rewards?: Record<string, unknown> }).rewards;
      [costs, rewards].forEach((delta) => {
        if (!delta || typeof delta !== "object") return;
        Object.keys(delta).forEach((key) => {
          if (!validResources.has(key as (typeof RESOURCE_KEYS)[number])) {
            warnings.push(`Unknown resource key "${key}" in choices JSON.`);
          }
        });
      });
    });
    return warnings;
  }, [stepDraft, stepChoicesText, stepsByArc]);

  const createFollowOnStorylet = async (choiceId: string) => {
    if (!activeStorylet) return;
    setListError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No session found.");

      const draft = createBlankStorylet();
      const id = `draft_${Date.now()}`;
      const body = draft.body?.trim() ? draft.body : "Draft body.";
      const tags = [
        activePhase ? `phase:${activePhase}` : null,
        activeType ? `type:${activeType}` : null,
        activeShockKey,
      ].filter(Boolean) as string[];

      const res = await fetch("/api/admin/storylets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          ...draft,
          body,
          tags,
          requirements: {
            ...draft.requirements,
            audit: buildAuditMeta(data.session?.user?.email ?? null),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to create storylet");
      }
      if (typeof json.id !== "string") {
        throw new Error("Missing storylet id from server.");
      }

      const persistedId = json.id;
      const newRow: Storylet = { ...draft, id: persistedId, body, tags };

      const updatedChoices = activeStorylet.choices.map((choice) =>
        choice.id === choiceId
          ? { ...choice, targetStoryletId: persistedId }
          : choice
      );
      const updatedStorylet: Storylet = {
        ...activeStorylet,
        choices: updatedChoices,
        requirements: {
          ...(activeStorylet.requirements ?? {}),
          audit: buildAuditMeta(data.session?.user?.email ?? null),
        },
      };

      const updateRes = await fetch(`/api/admin/storylets/${activeStorylet.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedStorylet),
      });
      const updateJson = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateJson.error ?? "Failed to link follow-on storylet");
      }

      setStorylets((prev) => [
        newRow,
        ...prev.map((row) => (row.id === updatedStorylet.id ? updatedStorylet : row)),
      ]);
      setActiveTab("list");
      selectStorylet(newRow);
      trackEvent({
        event_type: "storylet_created",
        payload: { id: persistedId, follow_on_for: activeStorylet.id },
      });
    } catch (err) {
      console.error(err);
      setListError(
        err instanceof Error ? err.message : "Failed to create follow-on storylet"
      );
    }
  };

  return (
    <AuthGate>
      {(session) => {
        const email = session.user.email;
        if (!isEmailAllowed(email) && !testerMode) {
          return (
            <div className="p-6 space-y-3">
              <h1 className="text-2xl font-semibold">Content Studio</h1>
              <p className="text-slate-700">Not authorized.</p>
            </div>
          );
        }

        if (!flags.contentStudioLiteEnabled) {
          return (
            <div className="p-6 space-y-3">
              <h1 className="text-2xl font-semibold">Content Studio</h1>
              <p className="text-slate-700">Feature disabled.</p>
            </div>
          );
        }

        return (
          <div className="min-h-screen bg-slate-50">
            <div className="border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold">Content Studio Lite</h1>
                  <p className="text-sm text-slate-600">
                    Internal editor for the 30-minute slice.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>Env: {process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local"}</span>
                  <span>
                    State: {activeStorylet?.is_active ? "Published" : "Draft"}
                  </span>
                  <Button variant="outline" asChild>
                    <a href="/play">Exit studio</a>
                  </Button>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-44 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      placeholder="Publish note"
                      value={publishNote}
                      onChange={(e) => setPublishNote(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={publishContent}
                      disabled={
                        publishState === "saving" ||
                        !flags.contentStudioPublishEnabled
                      }
                    >
                      {publishState === "saving" ? "Publishing..." : "Publish"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[220px_1fr]">
              <aside className="space-y-2">
                {TABS.map((tab) => {
                  const enabled = tabEnabled(tab.key);
                  return (
                    <Button
                      key={tab.key}
                      variant={activeTab === tab.key ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => enabled && setActiveTab(tab.key)}
                      disabled={!enabled}
                    >
                      {tab.label}
                    </Button>
                  );
                })}
              </aside>

              <main className="rounded-md border border-slate-200 bg-white px-6 py-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  {flags.contentStudioGraphEnabled ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">View</span>
                      <Button
                        size="sm"
                        variant={activeTab === "list" ? "default" : "outline"}
                        onClick={() => setActiveTab("list")}
                      >
                        Editor
                      </Button>
                      <Button
                        size="sm"
                        variant={activeTab === "graph" ? "default" : "outline"}
                        onClick={() => setActiveTab("graph")}
                      >
                        Graph
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-600">Editor</span>
                  )}
                  {activeTab === "list" && activeStorylet ? (
                    <SaveStatusIndicator
                      saveState={editor.saveState}
                      lastSavedAt={editor.lastSavedAt}
                      isDirty={editor.dirty}
                      error={editor.error}
                      onSave={() => saveDraft(false)}
                    />
                  ) : null}
                </div>
                {activeTab === "preview" ? (
                  <PreviewSimulator
                    storylets={storylets}
                    defaultStorylet={activeStorylet}
                  />
                ) : activeTab === "graph" ? (
                  <GraphView
                    storylets={shockStorylets}
                    selectedStorylet={activeStorylet}
                    onSelectStorylet={selectStoryletAndEdit}
                    onRetargetChoice={(choiceId, targetId) => {
                      if (!activeStorylet) return;
                      applyChoiceUpdate(choiceId, {
                        ...(activeStorylet.choices.find((c) => c.id === choiceId) ?? {}),
                        targetStoryletId: targetId,
                      } as StoryletChoice);
                    }}
                    entryNodeIds={entryNodeIds}
                    onCreateNode={() => createStorylet([activeShockKey])}
                    onSetStartNode={setStartNode}
                    onConnectChoice={connectChoice}
                  />
                ) : activeTab === "arcs" ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Shock arcs
                        </h2>
                        <p className="text-sm text-slate-600">
                          Manage the three shock arcs and their entry nodes.
                        </p>
                      </div>
                      <Button variant="outline" onClick={loadArcDefinitions}>
                        Refresh
                      </Button>
                    </div>

                    {shockArcMissing.length ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Missing shock arcs: {shockArcMissing.join(", ")}.
                      </div>
                    ) : null}

                    {arcDefinitionsLoading ? (
                      <p className="text-sm text-slate-600">Loading…</p>
                    ) : shockArcDefinitions.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        No shock arcs found.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                        <div className="space-y-2">
                          <label className="text-xs text-slate-600">
                            Jump to shock arc
                            <StudioDatalist
                              id="arc-definition-jump"
                              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                              value={arcDefinitionJump}
                              onChange={(next) => {
                                setArcDefinitionJump(next);
                                const match = shockArcDefinitions.find(
                                  (arc) => arc.key === next
                                );
                                if (match) selectArcDefinition(match);
                              }}
                              options={arcDefinitionOptions}
                              placeholder="shock arc key"
                            />
                          </label>
                          {shockArcDefinitions.map((arc) => (
                            <button
                              key={arc.id}
                              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                                selectedArcDefinitionId === arc.id
                                  ? "border-slate-900 bg-slate-100"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                              onClick={() => selectArcDefinition(arc)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{arc.title}</span>
                                <span className="text-xs text-slate-500">{arc.key}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="space-y-4">
                          {!selectedArcDefinition || !arcDefinitionDraft ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                              Select a shock arc to edit.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-semibold text-slate-900">
                                    Arc details
                                  </h3>
                                  <SaveStatusIndicator
                                    saveState={arcDefinitionSaveState}
                                    lastSavedAt={arcDefinitionLastSavedAt}
                                    isDirty={arcDefinitionDirty}
                                    error={arcDefinitionSaveError}
                                    onSave={saveArcDefinition}
                                    disabled={arcDefinitionSaveState === "saving"}
                                  />
                                </div>
                                <label className="text-sm text-slate-700">
                                  Title
                                  <input
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                    value={arcDefinitionDraft.title}
                                    onChange={(e) => {
                                      setArcDefinitionDraft({
                                        ...arcDefinitionDraft,
                                        title: e.target.value,
                                      });
                                      setArcDefinitionDirty(true);
                                      setArcDefinitionSaveState("idle");
                                    }}
                                  />
                                </label>
                                <label className="text-sm text-slate-700">
                                  Description
                                  <textarea
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                    rows={3}
                                    value={arcDefinitionDraft.description}
                                    onChange={(e) => {
                                      setArcDefinitionDraft({
                                        ...arcDefinitionDraft,
                                        description: e.target.value,
                                      });
                                      setArcDefinitionDirty(true);
                                      setArcDefinitionSaveState("idle");
                                    }}
                                  />
                                </label>
                                <label className="text-sm text-slate-700">
                                  Tags (comma-separated)
                                  <StudioDatalist
                                    id="arc-definition-tags"
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                    value={(arcDefinitionDraft.tags ?? []).join(", ")}
                                    onChange={(next) => {
                                      setArcDefinitionDraft({
                                        ...arcDefinitionDraft,
                                        tags: next
                                          .split(",")
                                          .map((tag) => tag.trim())
                                          .filter(Boolean),
                                      });
                                      setArcDefinitionDirty(true);
                                      setArcDefinitionSaveState("idle");
                                    }}
                                    options={tagOptions}
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={arcDefinitionDraft.is_enabled}
                                    onChange={(e) => {
                                      setArcDefinitionDraft({
                                        ...arcDefinitionDraft,
                                        is_enabled: e.target.checked,
                                      });
                                      setArcDefinitionDirty(true);
                                      setArcDefinitionSaveState("idle");
                                    }}
                                  />
                                  Enabled
                                </label>
                              </div>
                              <div className="space-y-2 rounded-md border border-slate-200 px-3 py-3">
                                <h4 className="text-sm font-semibold text-slate-900">
                                  Entry nodes
                                </h4>
                                {entryNodeIds.length === 0 ? (
                                  <p className="text-xs text-slate-600">
                                    No entry nodes yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {entryNodeIds.map((id) => {
                                      const node = shockStorylets.find(
                                        (storylet) => storylet.id === id
                                      );
                                      return (
                                        <div
                                          key={id}
                                          className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs"
                                        >
                                          <span>{node?.title ?? node?.slug ?? id}</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeEntryNode(id)}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <StudioDatalist
                                    id="entry-node"
                                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                    value={entryNodeInput}
                                    onChange={setEntryNodeInput}
                                    options={storyletOptions}
                                    placeholder="storylet id"
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      if (entryNodeInput) {
                                        addEntryNode(entryNodeInput);
                                        setEntryNodeInput("");
                                      }
                                    }}
                                  >
                                    Add
                                  </Button>
                                </div>
                                <p className="text-xs text-slate-500">
                                  Use “Set start node” in the graph to set a single
                                  start node.
                                </p>
                              </div>
                              <div className="space-y-2 rounded-md border border-slate-200 px-3 py-3">
                                <h4 className="text-sm font-semibold text-slate-900">
                                  Steps (storylets)
                                </h4>
                                {shockStorylets.length === 0 ? (
                                  <p className="text-xs text-slate-600">
                                    No storylets tagged for this arc.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {shockStorylets.map((storylet) => (
                                      <button
                                        key={storylet.id}
                                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-left text-xs transition hover:border-slate-300"
                                        onClick={() => {
                                          selectStorylet(storylet);
                                          setActiveTab("list");
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">
                                            {storylet.title || storylet.slug}
                                          </span>
                                          <span className="text-slate-500">
                                            {storylet.choices.length} choices
                                          </span>
                                        </div>
                                        <div className="text-slate-500">
                                          {storylet.slug}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {arcDefinitionsError ? (
                      <p className="text-sm text-red-600">{arcDefinitionsError}</p>
                    ) : null}
                  </div>
                ) : activeTab === "rules" ? (

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Delayed consequences
                        </h2>
                        <p className="text-sm text-slate-600">
                          Manage rules that resolve later outcomes.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={loadRules}>
                          Refresh
                        </Button>
                        <Button onClick={createRule}>New rule</Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                      <div className="space-y-2">
                        {rulesLoading ? (
                          <p className="text-sm text-slate-600">Loading…</p>
                        ) : rules.length === 0 ? (
                          <p className="text-sm text-slate-600">
                            No rules yet.
                          </p>
                        ) : (
                          rules.map((rule) => {
                            const usedBy = storylets.filter((storylet) =>
                              storylet.choices.some(
                                (choice) =>
                                  (choice.outcome as any)?.delayed_consequence_key ===
                                  rule.key
                              )
                            );
                            return (
                              <button
                                key={rule.key}
                                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                                  ruleDraft?.key === rule.key
                                    ? "border-slate-900 bg-slate-100"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                                onClick={() => selectRule(rule)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{rule.key}</span>
                                  <span className="text-xs text-slate-500">
                                    {usedBy.length} used
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Updated {rule.updated_at ?? "unknown"}
                                </div>
                              </button>
                            );
                          })
                        )}
                        {rulesError ? (
                          <p className="text-sm text-red-600">{rulesError}</p>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        {!ruleDraft ? (
                          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                            Select a rule to edit.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className="text-sm text-slate-700">
                              Key
                              <input
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                value={ruleDraft.key}
                                onChange={(e) =>
                                  setRuleDraft({ ...ruleDraft, key: e.target.value })
                                }
                              />
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="text-sm text-slate-700">
                                Trigger (JSON)
                                <textarea
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                  rows={4}
                                  value={ruleDraft.triggerText}
                                  onChange={(e) =>
                                    setRuleDraft({
                                      ...ruleDraft,
                                      triggerText: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="text-sm text-slate-700">
                                Resolve (JSON)
                                <textarea
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                  rows={4}
                                  value={ruleDraft.resolveText}
                                  onChange={(e) =>
                                    setRuleDraft({
                                      ...ruleDraft,
                                      resolveText: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="text-sm text-slate-700">
                                Timing (JSON)
                                <textarea
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                  rows={4}
                                  value={ruleDraft.timingText}
                                  onChange={(e) =>
                                    setRuleDraft({
                                      ...ruleDraft,
                                      timingText: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="text-sm text-slate-700">
                                Payload (JSON)
                                <textarea
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                  rows={4}
                                  value={ruleDraft.payloadText}
                                  onChange={(e) =>
                                    setRuleDraft({
                                      ...ruleDraft,
                                      payloadText: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button onClick={saveRule} disabled={ruleSaveState === "saving"}>
                                {ruleSaveState === "saving" ? "Saving..." : "Save rule"}
                              </Button>
                              <Button variant="outline" onClick={testRule}>
                                Dry run
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => deleteRule(ruleDraft.key)}
                              >
                                Delete
                              </Button>
                              {ruleSaveState === "saved" ? (
                                <span className="text-xs text-slate-500">
                                  Saved
                                </span>
                              ) : null}
                            </div>

                            {ruleTestOutput ? (
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                {ruleTestOutput}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">
                            Remnant rules
                          </h2>
                          <p className="text-sm text-slate-600">
                            Discovery and unlock conditions.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={loadRemnantRules}>
                            Refresh
                          </Button>
                          <Button onClick={createRemnantRule}>New rule</Button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                        <div className="space-y-2">
                          {remnantRulesLoading ? (
                            <p className="text-sm text-slate-600">Loading…</p>
                          ) : remnantRules.length === 0 ? (
                            <p className="text-sm text-slate-600">
                              No remnant rules yet.
                            </p>
                          ) : (
                            remnantRules.map((rule) => (
                              <button
                                key={rule.remnant_key}
                                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                                  remnantRuleDraft?.remnant_key === rule.remnant_key
                                    ? "border-slate-900 bg-slate-100"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                                onClick={() => selectRemnantRule(rule)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {rule.remnant_key}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Updated {rule.updated_at ?? "unknown"}
                                </div>
                              </button>
                            ))
                          )}
                          {remnantRulesError ? (
                            <p className="text-sm text-red-600">
                              {remnantRulesError}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          {!remnantRuleDraft ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                              Select a remnant rule to edit.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <label className="text-sm text-slate-700">
                                Remnant key
                                <select
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                  value={remnantRuleDraft.remnant_key}
                                  onChange={(e) =>
                                    setRemnantRuleDraft({
                                      ...remnantRuleDraft,
                                      remnant_key: e.target.value,
                                    })
                                  }
                                >
                                  {REMNANT_KEYS.map((key) => (
                                    <option key={key} value={key}>
                                      {key}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm text-slate-700">
                                  Discovery (JSON)
                                  <textarea
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                    rows={4}
                                    value={remnantRuleDraft.discoveryText}
                                    onChange={(e) =>
                                      setRemnantRuleDraft({
                                        ...remnantRuleDraft,
                                        discoveryText: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label className="text-sm text-slate-700">
                                  Unlock (JSON)
                                  <textarea
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                    rows={4}
                                    value={remnantRuleDraft.unlockText}
                                    onChange={(e) =>
                                      setRemnantRuleDraft({
                                        ...remnantRuleDraft,
                                        unlockText: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label className="text-sm text-slate-700">
                                  Caps (JSON)
                                  <textarea
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                    rows={4}
                                    value={remnantRuleDraft.capsText}
                                    onChange={(e) =>
                                      setRemnantRuleDraft({
                                        ...remnantRuleDraft,
                                        capsText: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  onClick={saveRemnantRule}
                                  disabled={remnantRuleSaveState === "saving"}
                                >
                                  {remnantRuleSaveState === "saving"
                                    ? "Saving..."
                                    : "Save rule"}
                                </Button>
                                <Button variant="outline" onClick={testRemnantRule}>
                                  Test rule
                                </Button>
                                {remnantRuleSaveState === "saved" ? (
                                  <span className="text-xs text-slate-500">
                                    Saved
                                  </span>
                                ) : null}
                              </div>
                              {remnantRuleTestOutput ? (
                                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                  {remnantRuleTestOutput}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === "history" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Versions
                        </h2>
                        <p className="text-sm text-slate-600">
                          Published snapshots with notes.
                        </p>
                      </div>
                      <Button variant="outline" onClick={loadVersions}>
                        Refresh
                      </Button>
                    </div>
                    {versionsLoading ? (
                      <p className="text-sm text-slate-600">Loading…</p>
                    ) : versions.length === 0 ? (
                      <p className="text-sm text-slate-600">No versions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((version) => (
                          <div
                            key={version.version_id}
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                {version.version_id.slice(0, 8)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {version.state}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              {version.note}
                            </p>
                            <p className="text-xs text-slate-500">
                              {version.author ?? "unknown"} · {version.created_at}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleSelectVersion(version)}
                              >
                                View diff
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleRollback(version)}
                                disabled={rollbackState === "saving"}
                              >
                                {rollbackState === "saving"
                                  ? "Rolling back..."
                                  : "Rollback"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedVersion && diffSummary ? (
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <p className="font-semibold">
                          Diff for {selectedVersion.version_id.slice(0, 8)}
                        </p>
                        <p>
                          Storylets: +{diffSummary.storylets.added.length} / -
                          {diffSummary.storylets.removed.length} · ~
                          {diffSummary.storylets.modified.length} changed
                        </p>
                        <p>
                          Consequences: +{diffSummary.consequences.added.length} / -
                          {diffSummary.consequences.removed.length} · ~
                          {diffSummary.consequences.modified.length} changed
                        </p>
                        <p>
                          Remnants: +{diffSummary.remnantRules.added.length} / -
                          {diffSummary.remnantRules.removed.length} · ~
                          {diffSummary.remnantRules.modified.length} changed
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Storylets
                        </h2>
                        <p className="text-sm text-slate-600">
                          Drafts save automatically. Publish later.
                        </p>
                      </div>
                      <Button
                        onClick={() =>
                          createStorylet(shockOnly ? [activeShockKey] : [])
                        }
                      >
                        New storylet
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700">
                            Search
                            <input
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                              value={filters.search}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  search: e.target.value,
                                }))
                              }
                              onBlur={loadStorylets}
                              placeholder="slug or title"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={shockOnly}
                              onChange={(e) => setShockOnly(e.target.checked)}
                            />
                            Only shock storylets
                          </label>
                          <label className="text-sm text-slate-700">
                            Shock arc
                            <StudioDatalist
                              id="shock-arc-select"
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                              value={activeShockKey}
                              onChange={setActiveShockKey}
                              options={SHOCK_ARC_KEYS.map((value) => ({ value }))}
                              placeholder="shock arc key"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Jump to storylet
                            <StudioDatalist
                              id="storylet-jump"
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                              value={storyletJump}
                              onChange={(next) => {
                                setStoryletJump(next);
                                const match = storyletLookup.get(next);
                                if (match) selectStorylet(match);
                              }}
                              options={storyletOptions}
                              placeholder="storylet id"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Phase
                            <select
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                              value={filters.phase}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  phase: e.target.value,
                                }))
                              }
                            >
                              <option value="">All</option>
                              {PHASE_OPTIONS.map((phase) => (
                                <option key={phase} value={phase}>
                                  {phase.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm text-slate-700">
                            Type
                            <select
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                              value={filters.type}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  type: e.target.value,
                                }))
                              }
                            >
                              <option value="">All</option>
                              {TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm text-slate-700">
                            Active
                            <select
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                              value={filters.active}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  active: e.target.value as FilterState["active"],
                                }))
                              }
                            >
                              <option value="all">All</option>
                              <option value="true">Published</option>
                              <option value="false">Draft</option>
                            </select>
                          </label>
                          <label className="text-sm text-slate-700">
                            Has errors
                            <select
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                              value={filters.hasErrors}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  hasErrors: e.target.value as FilterState["hasErrors"],
                                }))
                              }
                            >
                              <option value="all">All</option>
                              <option value="true">Errors only</option>
                              <option value="false">No errors</option>
                            </select>
                          </label>
                          <Button variant="outline" onClick={loadStorylets}>
                            Refresh
                          </Button>
                        </div>
                        {listError ? (
                          <p className="text-sm text-red-600">{listError}</p>
                        ) : null}
                        <div className="space-y-2">
                          {listLoading ? (
                            <p className="text-sm text-slate-600">Loading…</p>
                          ) : filteredStorylets.length === 0 ? (
                            <p className="text-sm text-slate-600">No storylets yet.</p>
                          ) : (
                            filteredStorylets.map((storylet) => {
                              const errors = validationMap[storylet.id]?.errors ?? [];
                              return (
                                <button
                                  key={storylet.id}
                                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                                    activeStorylet?.id === storylet.id
                                      ? "border-slate-900 bg-slate-100"
                                      : "border-slate-200 hover:border-slate-300"
                                  }`}
                                  onClick={() => selectStorylet(storylet)}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      {storylet.title || storylet.slug}
                                    </span>
                                    {errors.length > 0 ? (
                                      <span className="text-xs text-red-600">
                                        {errors.length} errors
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {storylet.slug} · {storylet.id}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {!activeStorylet ? (
                          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                            Select a storylet to edit.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="text-sm text-slate-700">
                                Title
                                <input
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                  value={activeStorylet.title}
                                onChange={(e) =>
                                  updateDraft({ title: e.target.value })
                                }
                                placeholder="Short descriptive title"
                              />
                            </label>
                              <label className="text-sm text-slate-700">
                                Slug
                                <input
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                  value={activeStorylet.slug}
                                  onChange={(e) =>
                                    updateDraft({ slug: e.target.value })
                                  }
                                  placeholder="unique_slug"
                                />
                              </label>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <span>Storylet ID: {activeStorylet.id}</span>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  navigator.clipboard.writeText(activeStorylet.id)
                                }
                              >
                                Copy ID
                              </Button>
                            </div>

                            <label className="text-sm text-slate-700">
                              Body
                              <textarea
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                rows={5}
                                value={activeStorylet.body}
                                onChange={(e) => updateDraft({ body: e.target.value })}
                                onBlur={() => saveDraft(true)}
                                placeholder="Short paragraph. Keep it readable."
                              />
                            </label>

                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="text-sm text-slate-700">
                                Phase
                                <span className="ml-2 text-xs text-slate-500">
                                  (required for slice flow)
                                </span>
                                <select
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                  value={activePhase}
                                  onChange={(e) => {
                                    const nextTags = setTagValue(
                                      activeTags,
                                      "phase:",
                                      e.target.value
                                    );
                                    updateDraft({ tags: nextTags });
                                  }}
                                >
                                  <option value="">None</option>
                                  {PHASE_OPTIONS.map((phase) => (
                                    <option key={phase} value={phase}>
                                      {phase.replace(/_/g, " ")}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-sm text-slate-700">
                                Type
                                <span className="ml-2 text-xs text-slate-500">
                                  (core / social / context / anomaly)
                                </span>
                                <select
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                  value={activeType}
                                  onChange={(e) => {
                                    const nextTags = setTagValue(
                                      activeTags,
                                      "type:",
                                      e.target.value
                                    );
                                    updateDraft({ tags: nextTags });
                                  }}
                                >
                                  <option value="">None</option>
                                  {TYPE_OPTIONS.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={activeStorylet.is_active}
                                  onChange={(e) =>
                                    updateDraft({ is_active: e.target.checked })
                                  }
                                />
                                Published
                              </label>
                            </div>

                            <label className="text-sm text-slate-700">
                              Tags (comma separated)
                              <span className="ml-2 text-xs text-slate-500">
                                (optional)
                              </span>
                              <StudioDatalist
                                id="storylet-tags"
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                value={extraTags}
                                onChange={(next) => {
                                  const updated = next
                                    .split(",")
                                    .map((tag) => tag.trim())
                                    .filter(Boolean);
                                  const phaseTag = activeTags.find((tag) =>
                                    tag.startsWith("phase:")
                                  );
                                  const typeTag = activeTags.find((tag) =>
                                    tag.startsWith("type:")
                                  );
                                  const consequenceTags = activeTags.filter((tag) =>
                                    tag.startsWith("consequence:")
                                  );
                                  updateDraft({
                                    tags: [
                                      ...updated,
                                      ...(phaseTag ? [phaseTag] : []),
                                      ...(typeTag ? [typeTag] : []),
                                      ...consequenceTags,
                                    ],
                                  });
                                }}
                                options={tagOptions}
                              />
                            </label>

                            <label className="text-sm text-slate-700">
                              Delayed consequence keys
                              <span className="ml-2 text-xs text-slate-500">
                                (optional)
                              </span>
                              <input
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                                value={activeConsequences}
                                onChange={(e) => {
                                  const nextTags = setConsequenceKeys(
                                    activeTags,
                                    e.target.value
                                      .split(",")
                                      .map((item) => item.trim())
                                  );
                                  updateDraft({ tags: nextTags });
                                }}
                              />
                            </label>

                            <div className="rounded-md border border-slate-200 px-4 py-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-800">
                                  Choices
                                </h3>
                                <Button variant="outline" onClick={addChoice}>
                                  Add choice
                                </Button>
                              </div>
                              {activeStorylet.choices.map((choice) => {
                                const deltas = choice.outcome?.deltas ?? {};
                                const vectorsInput =
                                  editor.vectorInputs[choice.id] ?? "";
                                const choiceTarget =
                                  (choice as StoryletChoice & {
                                    targetStoryletId?: string;
                                  }).targetStoryletId ?? "";
                                const extendedChoice = choice as StoryletChoice & {
                                  identity_tags?: string[];
                                  relational_effects?: Record<string, Record<string, number>>;
                                };
                                const identityTags = extendedChoice.identity_tags ?? [];
                                const relationalEffects =
                                  extendedChoice.relational_effects ?? {};
                                const relationalEntries = Object.entries(
                                  relationalEffects
                                );
                                return (
                                  <div
                                    key={choice.id}
                                    className="rounded-md border border-slate-200 px-3 py-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <input
                                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                        value={choice.id}
                                        onChange={(e) =>
                                          applyChoiceUpdate(choice.id, {
                                            id: e.target.value,
                                          })
                                        }
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          onClick={() => moveChoice(choice.id, "up")}
                                        >
                                          Up
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => moveChoice(choice.id, "down")}
                                        >
                                          Down
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => removeChoice(choice.id)}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                    <label className="text-xs text-slate-600">
                                      Label
                                      <input
                                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                        value={choice.label}
                                        onChange={(e) =>
                                          applyChoiceUpdate(choice.id, {
                                            label: e.target.value,
                                          })
                                        }
                                        onBlur={() => saveDraft(true)}
                                        placeholder="What the player sees"
                                      />
                                    </label>
                                    <div className="grid gap-2 md:grid-cols-3">
                                      <label className="text-xs text-slate-600">
                                        Time cost
                                        <input
                                          type="number"
                                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                          value={extendedChoice.time_cost ?? 0}
                                          onChange={(e) => {
                                            const next = Number(e.target.value);
                                            applyChoiceUpdate(choice.id, {
                                              time_cost: Number.isFinite(next)
                                                ? next
                                                : 0,
                                            });
                                          }}
                                          onBlur={() => saveDraft(true)}
                                        />
                                      </label>
                                      <label className="text-xs text-slate-600">
                                        Energy cost
                                        <input
                                          type="number"
                                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                          value={extendedChoice.energy_cost ?? 0}
                                          onChange={(e) => {
                                            const next = Number(e.target.value);
                                            applyChoiceUpdate(choice.id, {
                                              energy_cost: Number.isFinite(next)
                                                ? next
                                                : 0,
                                            });
                                          }}
                                          onBlur={() => saveDraft(true)}
                                        />
                                      </label>
                                      <label className="text-xs text-slate-600">
                                        Identity tags
                                        <StudioDatalist
                                          id={`identity-tags-${choice.id}`}
                                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                          value={identityTags.join(", ")}
                                          onChange={(next) => {
                                            applyChoiceUpdate(choice.id, {
                                              identity_tags: next
                                                .split(",")
                                                .map((tag) => tag.trim())
                                                .filter(Boolean),
                                            });
                                          }}
                                          options={IDENTITY_TAG_OPTIONS.map((value) => ({
                                            value,
                                          }))}
                                          placeholder="risk, people"
                                        />
                                      </label>
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-3">
                                      <label className="text-xs text-slate-600">
                                        Energy delta
                                        <input
                                          type="number"
                                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                          value={deltas.energy ?? 0}
                                          onChange={(e) => {
                                            const energy = Number(e.target.value);
                                            applyChoiceUpdate(choice.id, {
                                              outcome: {
                                                ...(choice.outcome ?? {}),
                                                deltas: {
                                                  ...deltas,
                                                  energy: Number.isFinite(energy)
                                                    ? energy
                                                    : 0,
                                                },
                                              },
                                            });
                                          }}
                                          onBlur={() => saveDraft(true)}
                                        />
                                      </label>
                                      <label className="text-xs text-slate-600">
                                        Stress delta
                                        <input
                                          type="number"
                                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                          value={deltas.stress ?? 0}
                                          onChange={(e) => {
                                            const stress = Number(e.target.value);
                                            applyChoiceUpdate(choice.id, {
                                              outcome: {
                                                ...(choice.outcome ?? {}),
                                                deltas: {
                                                  ...deltas,
                                                  stress: Number.isFinite(stress)
                                                    ? stress
                                                    : 0,
                                                },
                                              },
                                            });
                                          }}
                                          onBlur={() => saveDraft(true)}
                                        />
                                      </label>
                                      <label className="text-xs text-slate-600">
                                        Vectors (focus=1,curiosity=-1)
                                        <input
                                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                          value={vectorsInput}
                                          onChange={(e) => {
                                            const next = e.target.value;
                                            setEditor((prev) => ({
                                              ...prev,
                                              vectorInputs: {
                                                ...prev.vectorInputs,
                                                [choice.id]: next,
                                              },
                                              dirty: true,
                                            }));
                                            const parsed = parseVectorInput(next);
                                            if (parsed.ok) {
                                              applyChoiceUpdate(choice.id, {
                                                outcome: {
                                                  ...(choice.outcome ?? {}),
                                                  deltas: {
                                                    ...deltas,
                                                    vectors: parsed.result,
                                                  },
                                                },
                                              });
                                            }
                                          }}
                                          onBlur={() => saveDraft(true)}
                                          placeholder="focus=1, curiosity=-1"
                                        />
                                      </label>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-700">
                                          Relational effects
                                        </p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            applyChoiceUpdate(choice.id, {
                                              relational_effects: {
                                                ...relationalEffects,
                                                [NPC_ID_OPTIONS[0]]: {
                                                  trust: 0,
                                                  reliability: 0,
                                                  emotionalLoad: 0,
                                                },
                                              },
                                            });
                                          }}
                                        >
                                          Add NPC
                                        </Button>
                                      </div>
                                      {relationalEntries.length === 0 ? (
                                        <p className="text-xs text-slate-500">
                                          No NPC effects yet.
                                        </p>
                                      ) : (
                                        relationalEntries.map(([npcId, deltas]) => (
                                          <div
                                            key={npcId}
                                            className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
                                          >
                                            <StudioDatalist
                                              id={`npc-${choice.id}-${npcId}`}
                                              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                              value={npcId}
                                              onChange={(next) => {
                                                const { [npcId]: _, ...rest } =
                                                  relationalEffects;
                                                applyChoiceUpdate(choice.id, {
                                                  relational_effects: {
                                                    ...rest,
                                                    [next]: deltas,
                                                  },
                                                });
                                              }}
                                              options={NPC_ID_OPTIONS.map((value) => ({
                                                value,
                                              }))}
                                              placeholder="npc id"
                                            />
                                            <input
                                              type="number"
                                              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                              value={(deltas as any)?.trust ?? 0}
                                              onChange={(e) => {
                                                const next = Number(e.target.value);
                                                applyChoiceUpdate(choice.id, {
                                                  relational_effects: {
                                                    ...relationalEffects,
                                                    [npcId]: {
                                                      ...(deltas as any),
                                                      trust: Number.isFinite(next)
                                                        ? next
                                                        : 0,
                                                    },
                                                  },
                                                });
                                              }}
                                              placeholder="trust"
                                            />
                                            <input
                                              type="number"
                                              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                              value={(deltas as any)?.reliability ?? 0}
                                              onChange={(e) => {
                                                const next = Number(e.target.value);
                                                applyChoiceUpdate(choice.id, {
                                                  relational_effects: {
                                                    ...relationalEffects,
                                                    [npcId]: {
                                                      ...(deltas as any),
                                                      reliability: Number.isFinite(next)
                                                        ? next
                                                        : 0,
                                                    },
                                                  },
                                                });
                                              }}
                                              placeholder="reliability"
                                            />
                                            <input
                                              type="number"
                                              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                              value={
                                                (deltas as any)?.emotionalLoad ?? 0
                                              }
                                              onChange={(e) => {
                                                const next = Number(e.target.value);
                                                applyChoiceUpdate(choice.id, {
                                                  relational_effects: {
                                                    ...relationalEffects,
                                                    [npcId]: {
                                                      ...(deltas as any),
                                                      emotionalLoad: Number.isFinite(next)
                                                        ? next
                                                        : 0,
                                                    },
                                                  },
                                                });
                                              }}
                                              placeholder="emotional load"
                                            />
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                const { [npcId]: _, ...rest } =
                                                  relationalEffects;
                                                applyChoiceUpdate(choice.id, {
                                                  relational_effects: rest,
                                                });
                                              }}
                                            >
                                              Remove
                                            </Button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                    <label className="text-xs text-slate-600">
                                      Target storylet id (optional)
                                      <StudioDatalist
                                        id={`target-storylet-${choice.id}`}
                                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                        value={editor.targetInputs[choice.id] ?? ""}
                                        onChange={(next) => {
                                          setEditor((prev) => ({
                                            ...prev,
                                            targetInputs: {
                                              ...prev.targetInputs,
                                              [choice.id]: next,
                                            },
                                            dirty: true,
                                          }));
                                          applyChoiceUpdate(choice.id, {
                                            ...(choice as StoryletChoice & {
                                              targetStoryletId?: string;
                                            }),
                                            targetStoryletId: next,
                                          } as StoryletChoice);
                                        }}
                                        options={storyletOptions}
                                        placeholder="target storylet id"
                                      />
                                    </label>
                                    <label className="text-xs text-slate-600">
                                      Condition (JSON)
                                      <textarea
                                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                                        rows={2}
                                        value={editor.conditionInputs[choice.id] ?? ""}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setEditor((prev) => ({
                                            ...prev,
                                            conditionInputs: {
                                              ...prev.conditionInputs,
                                              [choice.id]: next,
                                            },
                                            dirty: true,
                                          }));
                                          const parsed = safeParseJson(next);
                                          if (parsed.ok) {
                                          applyChoiceUpdate(choice.id, {
                                            condition: parsed.value ?? undefined,
                                          });
                                          }
                                        }}
                                        onBlur={() => saveDraft(true)}
                                      />
                                    </label>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs text-slate-500">
                                        Create a follow-on storylet linked to this choice.
                                      </p>
                                      <Button
                                        variant="outline"
                                        disabled={Boolean(choiceTarget)}
                                        onClick={() => createFollowOnStorylet(choice.id)}
                                      >
                                        Create follow-on
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                              <h4 className="text-sm font-semibold text-slate-700">
                                Validation
                              </h4>
                              {editor.validation?.errors.length ? (
                                <ul className="mt-2 text-xs text-red-600 space-y-1">
                                  {editor.validation.errors.map((error) => (
                                    <li key={error}>{error}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-600">
                                  No blocking errors.
                                </p>
                              )}
                              {storyletWarnings.length ? (
                                <ul className="mt-2 text-xs text-amber-700 space-y-1">
                                  {storyletWarnings.map((warning) => (
                                    <li key={warning}>{warning}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        );
      }}
    </AuthGate>
  );
}
