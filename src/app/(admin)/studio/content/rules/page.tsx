"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useConsequencesAPI } from "@/hooks/contentStudio/useConsequencesAPI";
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

export default function RulesPage() {
  const { rules, loading, error, loadRules, saveRule, deleteRule } =
    useConsequencesAPI();
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    loadRules();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                <div className="space-y-3">
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
                  <div className="grid gap-3 md:grid-cols-2">
                    {(
                      [
                        ["triggerText", "Trigger (JSON)"],
                        ["resolveText", "Resolve (JSON)"],
                        ["timingText", "Timing (JSON)"],
                        ["payloadText", "Payload (JSON)"],
                      ] as const
                    ).map(([field, label]) => (
                      <label key={field} className="block text-sm text-slate-700">
                        {label}
                        <textarea
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                          rows={4}
                          value={draft[field]}
                          onChange={(e) =>
                            setDraft({ ...draft, [field]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                  </div>
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
