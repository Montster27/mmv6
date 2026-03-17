"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useConsequencesAPI } from "@/hooks/contentStudio/useConsequencesAPI";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import { StudioDatalist } from "@/components/contentStudio/StudioDatalist";
import type { DelayedConsequenceRule } from "@/types/consequences";

type RuleDraft = DelayedConsequenceRule & {
  triggerText: string;
  resolveText: string;
  timingText: string;
  payloadText: string;
};

function ruleToDraft(rule: DelayedConsequenceRule): RuleDraft {
  return {
    ...rule,
    triggerText: JSON.stringify(rule.trigger ?? {}, null, 2),
    resolveText: JSON.stringify(rule.resolve ?? {}, null, 2),
    timingText: JSON.stringify(rule.timing ?? {}, null, 2),
    payloadText: JSON.stringify(rule.payload ?? {}, null, 2),
  };
}

function draftToRule(draft: RuleDraft): DelayedConsequenceRule {
  const parseOrEmpty = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return {};
    }
  };
  return {
    ...draft,
    trigger: parseOrEmpty(draft.triggerText),
    resolve: parseOrEmpty(draft.resolveText),
    timing: parseOrEmpty(draft.timingText),
    payload: parseOrEmpty(draft.payloadText),
  };
}

function makeNewRule(): RuleDraft {
  const empty = {
    key: `rule_${Date.now()}`,
    trigger: {},
    resolve: {},
    timing: {},
    payload: {},
  } as DelayedConsequenceRule;
  return ruleToDraft(empty);
}

/** Helper to safely read a string field from a Record<string, unknown> */
function getStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

/** Helper to safely read a number field from a Record<string, unknown> */
function getNum(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  return typeof v === "number" ? v : null;
}

/** Structured trigger fields editor — syncs back to triggerText JSON */
function TriggerFields({
  draft,
  storyletOptions,
  onChange,
}: {
  draft: RuleDraft;
  storyletOptions: { value: string; label?: string }[];
  onChange: (updates: Partial<RuleDraft>) => void;
}) {
  const trigger = draft.trigger as Record<string, unknown>;
  const eventType = getStr(trigger, "event_type");
  const storyletSlug = getStr(trigger, "storylet_slug");
  const choiceId = getStr(trigger, "choice_id");

  function patchTrigger(updates: Record<string, unknown>) {
    const next = { ...trigger, ...updates };
    // Remove empty string fields to keep JSON clean
    for (const k of Object.keys(updates)) {
      if (next[k] === "") delete next[k];
    }
    onChange({
      trigger: next,
      triggerText: JSON.stringify(next, null, 2),
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-slate-600">
          Event type
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={eventType}
            placeholder="e.g. choice_made"
            onChange={(e) => patchTrigger({ event_type: e.target.value })}
          />
        </label>
        <label className="block text-xs text-slate-600">
          Storylet slug
          <StudioDatalist
            id="rule-trigger-slug"
            options={storyletOptions}
            value={storyletSlug}
            placeholder="e.g. roommate_intro"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            onChange={(v) => patchTrigger({ storylet_slug: v })}
          />
        </label>
        <label className="block text-xs text-slate-600">
          Choice ID
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={choiceId}
            placeholder="e.g. choice_accept"
            onChange={(e) => patchTrigger({ choice_id: e.target.value })}
          />
        </label>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-slate-400 hover:text-slate-600">
          Raw trigger JSON
        </summary>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
          rows={4}
          value={draft.triggerText}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ trigger: parsed, triggerText: e.target.value });
            } catch {
              onChange({ triggerText: e.target.value });
            }
          }}
        />
      </details>
    </div>
  );
}

/** Structured timing fields editor — syncs back to timingText JSON */
function TimingFields({
  draft,
  onChange,
}: {
  draft: RuleDraft;
  onChange: (updates: Partial<RuleDraft>) => void;
}) {
  const timing = draft.timing as Record<string, unknown>;
  const delayDays = getNum(timing, "delay_days");

  function patchTiming(updates: Record<string, unknown>) {
    const next = { ...timing, ...updates };
    // Remove null fields
    for (const k of Object.keys(updates)) {
      if (next[k] === null || next[k] === undefined) delete next[k];
    }
    onChange({
      timing: next,
      timingText: JSON.stringify(next, null, 2),
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-slate-600">
          Delay (days)
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={delayDays ?? ""}
            placeholder="0"
            onChange={(e) =>
              patchTiming({
                delay_days: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-slate-400 hover:text-slate-600">
          Raw timing JSON
        </summary>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
          rows={4}
          value={draft.timingText}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ timing: parsed, timingText: e.target.value });
            } catch {
              onChange({ timingText: e.target.value });
            }
          }}
        />
      </details>
    </div>
  );
}

export default function RulesPage() {
  const { rules, loading, error, loadRules, saveRule, deleteRule } =
    useConsequencesAPI();
  const { storylets, loadStorylets } = useStoryletsAPI();
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    loadRules();
    loadStorylets({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storyletSlugOptions = useMemo(
    () => storylets.map((s) => ({ value: s.slug, label: `${s.slug} (${s.title})` })),
    [storylets]
  );

  function patchDraft(updates: Partial<RuleDraft>) {
    if (!draft) return;
    setDraft({ ...draft, ...updates });
  }

  async function handleSave() {
    if (!draft) return;
    setSaveState("saving");
    const isNew = !rules.some((r) => r.key === draft.key);
    const result = await saveRule(draftToRule(draft), isNew);
    if (result.ok) {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
      await loadRules();
    } else {
      setSaveState("idle");
    }
  }

  async function handleDelete() {
    if (!draft) return;
    if (!confirm(`Delete rule "${draft.key}"?`)) return;
    await deleteRule(draft.key);
    setDraft(null);
    await loadRules();
  }

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-4">
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
              <Button onClick={() => setDraft(makeNewRule())}>New rule</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
            {/* List */}
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-600">Loading…</p>
              ) : rules.length === 0 ? (
                <p className="text-sm text-slate-600">No rules yet.</p>
              ) : (
                rules.map((rule) => (
                  <button
                    key={rule.key}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      draft?.key === rule.key
                        ? "border-slate-900 bg-slate-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setDraft(ruleToDraft(rule))}
                  >
                    <div className="font-medium">{rule.key}</div>
                    <div className="text-xs text-slate-500">
                      {rule.updated_at ?? "no date"}
                    </div>
                  </button>
                ))
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* Editor */}
            <div>
              {!draft ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Select a rule to edit, or create a new one.
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-sm text-slate-700">
                    Key
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      value={draft.key}
                      onChange={(e) =>
                        setDraft({ ...draft, key: e.target.value })
                      }
                    />
                  </label>

                  {/* Trigger — structured fields + raw JSON fallback */}
                  <fieldset className="rounded-md border border-slate-200 p-3 space-y-2">
                    <legend className="text-sm font-medium text-slate-700 px-1">
                      Trigger
                    </legend>
                    <TriggerFields
                      draft={draft}
                      storyletOptions={storyletSlugOptions}
                      onChange={patchDraft}
                    />
                  </fieldset>

                  {/* Timing — structured fields + raw JSON fallback */}
                  <fieldset className="rounded-md border border-slate-200 p-3 space-y-2">
                    <legend className="text-sm font-medium text-slate-700 px-1">
                      Timing
                    </legend>
                    <TimingFields draft={draft} onChange={patchDraft} />
                  </fieldset>

                  {/* Resolve — raw JSON only */}
                  <fieldset className="rounded-md border border-slate-200 p-3 space-y-2">
                    <legend className="text-sm font-medium text-slate-700 px-1">
                      Resolve
                    </legend>
                    <textarea
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      rows={4}
                      value={draft.resolveText}
                      onChange={(e) =>
                        setDraft({ ...draft, resolveText: e.target.value })
                      }
                    />
                  </fieldset>

                  {/* Payload — raw JSON only */}
                  <fieldset className="rounded-md border border-slate-200 p-3 space-y-2">
                    <legend className="text-sm font-medium text-slate-700 px-1">
                      Payload
                    </legend>
                    <textarea
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      rows={4}
                      value={draft.payloadText}
                      onChange={(e) =>
                        setDraft({ ...draft, payloadText: e.target.value })
                      }
                    />
                  </fieldset>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={saveState === "saving"}
                    >
                      {saveState === "saving"
                        ? "Saving…"
                        : saveState === "saved"
                          ? "Saved ✓"
                          : "Save rule"}
                    </Button>
                    <Button variant="outline" onClick={handleDelete}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
