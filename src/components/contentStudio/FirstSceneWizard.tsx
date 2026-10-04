"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { guidedIssues, applyAllFixes } from "@/core/validation/explainIssues";
import { newSceneRecord, SCENE_TEMPLATES, TRACK_BLURBS, type SceneTemplate } from "@/core/studio/sceneTemplates";
import { recordId } from "@/core/studio/manifest";
import { CHAPTER_ONE_TRACK_KEYS, type TrackKey } from "@/types/tracks";
import type { Storylet } from "@/types/storylets";
import type { StudioActor, StudioManifest } from "@/types/studio";
import { apiRequest } from "@/lib/contentStudio/apiClient";
import { ScriptMode } from "./ScriptMode";
import { ScenePlayer } from "./ScenePlayer";

type StudioSnapshot = {
  actor: StudioActor;
  manifest: StudioManifest;
  workspace: { id: string; title: string; status: string } | null;
  soloMode?: boolean;
  members: unknown[];
};

const STEPS = ["Pick a starting point", "Write it", "Check and play it", "Save your draft"] as const;
const PARTS = ["morning", "afternoon", "evening"] as const;

const blankScene = (template: SceneTemplate): Storylet =>
  ({
    id: "wizard-draft", slug: "wizard-draft", title: template.title, body: template.body,
    choices: structuredClone(template.choices), tags: [], requirements: {}, weight: 1, is_active: true,
  }) as unknown as Storylet;

const card = (on: boolean) =>
  `block w-full rounded-lg border p-3 text-left ${on ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"}`;

export function FirstSceneWizard() {
  const [snapshot, setSnapshot] = useState<StudioSnapshot | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(SCENE_TEMPLATES[0].id);
  const [trackKey, setTrackKey] = useState<TrackKey>("roommate");
  const [segment, setSegment] = useState<string>("morning");
  const [day, setDay] = useState(0);
  const [windowDays, setWindowDays] = useState(2);
  const [scene, setScene] = useState<Storylet>(() => blankScene(SCENE_TEMPLATES[0]));
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedTitle, setSavedTitle] = useState("");

  const load = useCallback(async () => {
    const id = sessionStorage.getItem("studio.workspace") ?? "";
    const result = await apiRequest<StudioSnapshot>(`/api/admin/studio${id ? `?workspace=${encodeURIComponent(id)}` : ""}`);
    if (!result.ok || !result.data) {
      setLoadError(result.error ?? "Unable to load Studio");
      return;
    }
    setSnapshot(result.data);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const issues = useMemo(() => guidedIssues(scene), [scene]);
  const blockers = issues.filter((issue) => issue.severity === "error");
  const hasChoice = (scene.choices ?? []).some((choice) => choice.label?.trim());

  function pickTemplate(template: SceneTemplate) {
    setTemplateId(template.id);
    setScene(blankScene(template));
  }

  async function save() {
    if (!snapshot) return;
    setSaving(true);
    setSaveError("");
    try {
      if (!sessionStorage.getItem("studio.workspace")) {
        const created = await apiRequest<{ id: string; revision: number }>("/api/admin/studio", {
          method: "POST",
          body: JSON.stringify({ action: "create", title: "My first scenes", brief: "Scenes written with Start here.", reviewer_id: "", owner_id: snapshot.actor.id }),
        });
        if (!created.ok || !created.data?.id) throw new Error(created.error ?? "Could not create a draft");
        sessionStorage.setItem("studio.workspace", created.data.id);
        window.dispatchEvent(new Event("studio-workspace-change"));
      }
      const track = snapshot.manifest.tracks.find((row) => row.key === trackKey);
      if (!track) throw new Error("This track is not available in the current content.");
      const onTrack = snapshot.manifest.storylets.filter((row) => row.track_id === recordId(track));
      const record = newSceneRecord({
        title: scene.title, body: scene.body ?? "", choices: scene.choices ?? [], trackId: recordId(track), trackKey,
        segment, day, windowDays,
        orderIndex: onTrack.reduce((max, row) => Math.max(max, Number(row.order_index ?? 0)), 0) + 1,
        takenKeys: onTrack.map((row) => String(row.storylet_key)),
        takenSlugs: snapshot.manifest.storylets.map((row) => String(row.slug)),
      });
      const result = await apiRequest("/api/admin/storylets", { method: "POST", body: JSON.stringify(record) });
      if (!result.ok) throw new Error(result.error ?? "Could not save the scene");
      setSavedTitle(scene.title);
      await load();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the scene");
    } finally {
      setSaving(false);
    }
  }

  function writeAnother() {
    setSavedTitle("");
    setStep(0);
    pickTemplate(SCENE_TEMPLATES[0]);
  }

  if (loadError) {
    return (
      <div role="alert" className="m-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {loadError}
      </div>
    );
  }
  if (!snapshot) return <div className="p-6 text-sm">Loading…</div>;

  const solo = snapshot.soloMode === true;
  const alone = snapshot.members.length <= 1;

  return (
    <div className="h-full overflow-auto bg-slate-50 p-5">
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <p className="text-xs uppercase tracking-widest text-indigo-700">Start here</p>
          <h1 className="text-2xl font-semibold text-slate-900">Write your first scene</h1>
          <p className="mt-1 text-sm text-slate-600">
            A scene is one small moment the player can step into: a few lines of text and two or three choices. This takes about ten minutes.
            Nothing you do here changes what players see until you publish.
          </p>
        </header>

        <ol className="flex flex-wrap gap-2 text-xs" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}
              className={`rounded-full border px-3 py-1 ${i === step ? "border-indigo-600 bg-indigo-600 text-white" : i < step ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-500"}`}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {savedTitle ? (
          <section className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-5" role="status">
            <h2 className="font-semibold text-green-900">Saved “{savedTitle}” to your draft</h2>
            <p className="text-sm text-green-900">Players cannot see it yet. It is in your private draft until you publish.</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <button className="rounded bg-indigo-700 px-3 py-2 text-white hover:bg-indigo-800" onClick={writeAnother}>Write another scene</button>
              <Link className="rounded border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50" href="/studio/content/storylets">See all scenes</Link>
              <Link className="rounded border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50" href="/studio/content/review">Review and publish</Link>
            </div>
            {!solo && alone && snapshot.actor.admin ? (
              <p className="text-xs text-green-900">
                You are the only person on the team, so nobody else can review this. Turn on solo mode in{" "}
                <Link className="underline" href="/studio/content/work">My work</Link> to approve your own work.
              </p>
            ) : null}
            {solo ? <p className="text-xs text-green-900">Solo mode is on, so you can approve and publish this yourself in Review.</p> : null}
          </section>
        ) : null}

        {!savedTitle && step === 0 ? (
          <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
            <div>
              <h2 className="font-semibold">What kind of scene?</h2>
              <p className="text-sm text-slate-500">Pick the closest. You will rewrite the words in the next step.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SCENE_TEMPLATES.map((template) => (
                  <button key={template.id} type="button" aria-pressed={template.id === templateId} className={card(template.id === templateId)} onClick={() => pickTemplate(template)}>
                    <span className="font-medium text-slate-900">{template.label}</span>
                    <span className="mt-1 block text-xs text-slate-600">{template.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold">Which storyline does it belong to?</h2>
              <p className="text-sm text-slate-500">The game runs six at once. A scene belongs to exactly one.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {CHAPTER_ONE_TRACK_KEYS.map((key) => (
                  <button key={key} type="button" aria-pressed={key === trackKey} className={card(key === trackKey)} onClick={() => setTrackKey(key)}>
                    <span className="font-medium text-slate-900">{TRACK_BLURBS[key].label}</span>
                    <span className="mt-1 block text-xs text-slate-600">{TRACK_BLURBS[key].blurb}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs">
                When can it first appear? (day)
                <input type="number" min={0} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={day} onChange={(e) => setDay(Math.max(0, Number(e.target.value) || 0))} />
                <span className="mt-1 block text-slate-500">0 is the first day.</span>
              </label>
              <label className="text-xs">
                Part of the day
                <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={segment} onChange={(e) => setSegment(e.target.value)}>
                  {PARTS.map((part) => <option key={part}>{part}</option>)}
                </select>
              </label>
              <label className="text-xs">
                How many extra days can it wait?
                <input type="number" min={0} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={windowDays} onChange={(e) => setWindowDays(Math.max(0, Number(e.target.value) || 0))} />
                <span className="mt-1 block text-slate-500">0 means that day only.</span>
              </label>
            </div>
            <button className="rounded bg-indigo-700 px-4 py-2 text-sm text-white hover:bg-indigo-800" onClick={() => setStep(1)}>Next: write it</button>
          </section>
        ) : null}

        {!savedTitle && step === 1 ? (
          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">
              Write what the player reads, then give them two or three things to do. Keep choice labels short and physical, like “Pick up the phone”.
              Use “the man at the desk” instead of a name until the player could know it.
            </p>
            <div className="rounded border border-slate-200">
              <ScriptMode draft={scene} onChange={(updates) => setScene((prev) => ({ ...prev, ...updates }))} />
            </div>
            <div className="flex gap-2">
              <button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setStep(0)}>Back</button>
              <button className="rounded bg-indigo-700 px-4 py-2 text-sm text-white hover:bg-indigo-800" onClick={() => setStep(2)}>Next: check and play it</button>
            </div>
          </section>
        ) : null}

        {!savedTitle && step === 2 ? (
          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded bg-indigo-700 px-4 py-2 text-sm text-white hover:bg-indigo-800" onClick={() => setPlaying(true)}>▶ Play this scene</button>
              <span className="text-sm text-slate-600">Read it the way a player would. Nothing is saved.</span>
            </div>
            <div>
              <h2 className="font-semibold">Checks</h2>
              {issues.length === 0 ? <p className="text-sm text-green-800">Nothing to fix. This scene follows the project rules.</p> : null}
              {issues.filter((i) => i.fix).length > 1 ? (
                <button className="mt-2 rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50" onClick={() => setScene(applyAllFixes(scene))}>
                  Fix everything that is safe to fix automatically
                </button>
              ) : null}
              <ul className="mt-2 space-y-2">
                {issues.map((issue) => (
                  <li key={issue.id} className={`rounded border p-3 text-sm ${issue.severity === "error" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    <strong>{issue.severity === "error" ? "Must fix" : "Worth fixing"} · {issue.where}:</strong> {issue.title}
                    <p className="text-xs text-slate-600">{issue.why}</p>
                    {issue.fix ? <button className="mt-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50" onClick={() => setScene(issue.fix!.apply(scene))}>{issue.fix.label}</button> : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setStep(1)}>Back to writing</button>
              <button className="rounded bg-indigo-700 px-4 py-2 text-sm text-white hover:bg-indigo-800 disabled:opacity-40" disabled={blockers.length > 0 || !hasChoice} onClick={() => setStep(3)}>
                Next: save it
              </button>
            </div>
            {blockers.length > 0 || !hasChoice ? <p className="text-xs text-slate-500">Fix the “Must fix” items, and give at least one choice a label, to continue.</p> : null}
          </section>
        ) : null}

        {!savedTitle && step === 3 ? (
          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Ready to save “{scene.title}”</h2>
            <p className="text-sm text-slate-600">
              It goes into a private draft. {snapshot.workspace ? `Draft: ${snapshot.workspace.title}.` : "A draft called “My first scenes” is created for you."} Players cannot see it until you publish.
            </p>
            {saveError ? <p role="alert" className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{saveError}</p> : null}
            <div className="flex gap-2">
              <button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setStep(2)}>Back</button>
              <button className="rounded bg-indigo-700 px-4 py-2 text-sm text-white hover:bg-indigo-800 disabled:opacity-40" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save to my draft"}
              </button>
            </div>
          </section>
        ) : null}

        {playing ? <ScenePlayer scene={{ ...scene, due_offset_days: day, segment: segment as Storylet["segment"], expires_after_days: windowDays } as Storylet} onClose={() => setPlaying(false)} /> : null}
      </div>
    </div>
  );
}
