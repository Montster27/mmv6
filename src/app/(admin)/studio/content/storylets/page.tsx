"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import { useArcsAPI, type ArcDefinitionRow } from "@/hooks/contentStudio/useArcsAPI";
import { StoryletEditor } from "@/components/contentStudio/StoryletEditor";
import { validateStorylet } from "@/core/validation/storyletValidation";
import type { Storylet } from "@/types/storylets";
import type { Session } from "@supabase/supabase-js";

const PAGE_SIZE = 25;

const PHASE_OPTIONS = [
  { value: "", label: "All phases" },
  { value: "intro_hook", label: "Intro hook" },
  { value: "guided_core_loop", label: "Guided core loop" },
  { value: "reflection_arc", label: "Reflection arc" },
  { value: "community_purpose", label: "Community purpose" },
];

function getPhaseTag(storylet: Storylet) {
  return (storylet.tags ?? []).find((t) =>
    ["intro_hook", "guided_core_loop", "reflection_arc", "community_purpose"].includes(t)
  ) ?? "";
}

function matchesSearch(storylet: Storylet, search: string): boolean {
  const q = search.toLowerCase();
  return (
    storylet.title.toLowerCase().includes(q) ||
    storylet.slug.toLowerCase().includes(q) ||
    storylet.id.toLowerCase().includes(q) ||
    (storylet.tags ?? []).some((t) => t.toLowerCase().includes(q))
  );
}

function makeNewStorylet(): Omit<Storylet, "id"> {
  return {
    slug: `draft_${Date.now()}`,
    title: "New storylet",
    body: "",
    choices: [],
    is_active: false,
    tags: [],
    requirements: {},
    weight: 1,
  };
}

function StoryletsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { storylets, loading, error, loadStorylets, saveStorylet, createStorylet, cloneStorylet, deleteStorylet } =
    useStoryletsAPI();

  const { arcDefinitions, loadArcDefinitions } = useArcsAPI();
  const arcOptions = arcDefinitions.map((a: ArcDefinitionRow) => ({
    id: a.id,
    key: a.key,
    title: a.title,
  }));

  // Filters
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);

  // Selected storylet
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("id")
  );
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dirty state tracking from editor
  const editorDirtyRef = useRef(false);

  useEffect(() => {
    loadStorylets({ active: activeFilter !== "all" ? activeFilter : undefined });
    loadArcDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, phaseFilter, activeFilter]);

  // Derived filtered list
  const filtered = useMemo(() => {
    let rows = storylets;
    if (search.trim()) rows = rows.filter((s) => matchesSearch(s, search.trim()));
    if (phaseFilter) rows = rows.filter((s) => getPhaseTag(s) === phaseFilter);
    return rows;
  }, [storylets, search, phaseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selected = isNew
    ? null
    : storylets.find((s) => s.id === selectedId) ?? null;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    storylets.forEach((s) => (s.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [storylets]);

  const storyletOptions = useMemo(
    () => storylets.map((s) => ({ value: s.id, label: s.title })),
    [storylets]
  );

  // Step key options for autocomplete — filtered to the selected storylet's arc
  const stepKeyOptions = useMemo(() => {
    if (!selected?.arc_id) return [];
    return storylets
      .filter((s) => s.step_key && s.arc_id === selected.arc_id)
      .map((s) => ({ value: s.step_key!, label: `${s.step_key} (${s.title})` }));
  }, [storylets, selected]);

  // Validation summary counts for list
  function getIssueCount(storylet: Storylet) {
    const result = validateStorylet(storylet);
    return result.ok ? 0 : result.errors.length;
  }

  function handleSelect(id: string) {
    if (editorDirtyRef.current && !confirm("You have unsaved changes. Discard?")) return;
    setSelectedId(id);
    setIsNew(false);
    router.replace(`/studio/content/storylets?id=${id}`, { scroll: false });
  }

  function handleNewStorylet() {
    if (editorDirtyRef.current && !confirm("You have unsaved changes. Discard?")) return;
    setSelectedId(null);
    setIsNew(true);
  }

  async function handleSave(updated: Storylet, session: Session) {
    setSaving(true);
    setSaveError(null);
    if (isNew) {
      const result = await createStorylet(updated, session.user.email ?? null);
      if (result.ok) {
        setIsNew(false);
        setSelectedId(result.id);
        await loadStorylets({ active: activeFilter !== "all" ? activeFilter : undefined });
      } else {
        setSaveError(result.error ?? "Create failed");
      }
    } else {
      const result = await saveStorylet(updated, session.user.email ?? null);
      if (!result.ok) {
        setSaveError(result.error ?? "Save failed");
      }
      await loadStorylets({ active: activeFilter !== "all" ? activeFilter : undefined });
    }
    setSaving(false);
  }

  async function handleDelete(storylet: Storylet) {
    const result = await deleteStorylet(storylet.id);
    if (result.ok) {
      setSelectedId(null);
      await loadStorylets({ active: activeFilter !== "all" ? activeFilter : undefined });
    } else {
      setSaveError(result.error ?? "Delete failed");
    }
  }

  async function handleClone(storylet: Storylet, session: Session) {
    const result = await cloneStorylet(storylet, session.user.email ?? null);
    if (result.ok) {
      await loadStorylets({ active: activeFilter !== "all" ? activeFilter : undefined });
      handleSelect(result.id);
    }
  }

  return (
    <AuthGate>
      {(session) => (
        <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr] overflow-hidden">
          {/* Left panel — list */}
          <div className="flex flex-col border-r border-slate-200 overflow-hidden">
            {/* Search + filters */}
            <div className="p-3 space-y-2 border-b border-slate-200 bg-white shrink-0">
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                placeholder="Search by title, slug, tag\u2026"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value)}
                >
                  {PHASE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  value={activeFilter}
                  onChange={(e) =>
                    setActiveFilter(e.target.value as "all" | "true" | "false")
                  }
                >
                  <option value="all">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {filtered.length} storylet{filtered.length !== 1 ? "s" : ""}
                </span>
                <Button onClick={handleNewStorylet}>+ New</Button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-3 text-sm text-slate-600">Loading\u2026</p>
              ) : error ? (
                <p className="p-3 text-sm text-red-600">{error}</p>
              ) : paginated.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No storylets found.</p>
              ) : (
                paginated.map((s) => {
                  const errorCount = getIssueCount(s);
                  const isSelected = selectedId === s.id && !isNew;
                  return (
                    <div
                      key={s.id}
                      className={`group flex items-start gap-2 border-b border-slate-100 px-3 py-2 cursor-pointer transition-colors ${
                        isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => handleSelect(s.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {s.title}
                          </span>
                          {!s.is_active && (
                            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-1.5">
                              inactive
                            </span>
                          )}
                          {errorCount > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 rounded-full px-1.5">
                              {errorCount} err
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{s.slug}</div>
                        {getPhaseTag(s) && (
                          <div className="text-xs text-indigo-500">{getPhaseTag(s)}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-indigo-600 shrink-0 mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClone(s, session);
                        }}
                        title="Clone this storylet"
                      >
                        Clone
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-white shrink-0">
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  \u2190 Prev
                </button>
                <span className="text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next \u2192
                </button>
              </div>
            )}
          </div>

          {/* Right panel — editor */}
          <div className="overflow-hidden">
            {isNew ? (
              <StoryletEditor
                key="new"
                storylet={
                  { ...makeNewStorylet(), id: `draft_${Date.now()}` } as Storylet
                }
                isNew
                allTags={allTags}
                storyletOptions={storyletOptions}
                stepKeyOptions={[]}
                arcOptions={arcOptions}
                saving={saving}
                saveError={saveError}
                onSave={(updated) => handleSave(updated, session)}
                onCancel={() => setIsNew(false)}
                onDirtyChange={(dirty) => { editorDirtyRef.current = dirty; }}
              />
            ) : selected ? (
              <StoryletEditor
                key={selected.id}
                storylet={selected}
                allTags={allTags}
                storyletOptions={storyletOptions}
                stepKeyOptions={stepKeyOptions}
                arcOptions={arcOptions}
                saving={saving}
                saveError={saveError}
                onSave={(updated) => handleSave(updated, session)}
                onDelete={() => handleDelete(selected)}
                onDirtyChange={(dirty) => { editorDirtyRef.current = dirty; }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Select a storylet or create a new one.
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGate>
  );
}

export default function StoryletsPage() {
  return (
    <Suspense>
      <StoryletsContent />
    </Suspense>
  );
}
