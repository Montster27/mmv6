"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/contentStudio/apiClient";
import { recordId } from "@/core/studio/manifest";
import type { StudioActor, StudioChange, StudioIssue, StudioKind, StudioManifest, StudioRecord, StudioRelease, StudioScenario, StudioTestResult, StudioWorkspace } from "@/types/studio";

type Mode = "work" | "narrative" | "library" | "review" | "releases";
type Member = { user_id: string; display_name: string; role: string };
type StudioEvent = { id: number; actor_id: string; action: string; revision: number; created_at: string; detail: Record<string, unknown> };
type Data = {
  actor: StudioActor; workspaces: StudioWorkspace[]; members: Member[]; releases: StudioRelease[];
  conflicts: { id: string; draft: StudioRecord | null; released: StudioRecord | null }[];
  activeReleaseId: string; manifest: StudioManifest; workspace: StudioWorkspace | null;
  base: StudioManifest | null; changes: StudioChange[]; events: StudioEvent[]; issues: StudioIssue[]; tests: StudioTestResult[];
};
const inputClass = "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm";
const buttonClass = "rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40";
const primaryClass = "rounded bg-indigo-700 px-3 py-2 text-sm text-white hover:bg-indigo-800 disabled:opacity-40";
const panelClass = "rounded-lg border border-slate-200 bg-white p-5 space-y-4";
const titles: Record<Mode, string> = { work: "My work", narrative: "Narrative map", library: "Shared library", review: "Review & playtests", releases: "Releases" };
function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="block text-xs font-medium text-slate-600">{label}{multiline ? <textarea rows={3} className={`${inputClass} mt-1`} value={value} onChange={(event) => onChange(event.target.value)} /> : <input className={`${inputClass} mt-1`} value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

export function CollaborationStudio({ mode }: { mode: Mode }) {
  const [data, setData] = useState<Data | null>(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBrief, setNewBrief] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newReviewer, setNewReviewer] = useState("");
  const [comment, setComment] = useState("");
  const [commentTarget, setCommentTarget] = useState("");
  const [editing, setEditing] = useState<StudioRecord | null>(null);
  const [editRevision, setEditRevision] = useState(0);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("writer");
  const [meta, setMeta] = useState<StudioWorkspace | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [scenarioError, setScenarioError] = useState("");
  const [scenario, setScenario] = useState<StudioScenario | null>(null);

  const load = useCallback(async (id: string) => {
    const result = await apiRequest<Data>(`/api/admin/studio${id ? `?workspace=${encodeURIComponent(id)}` : ""}`);
    if (!result.ok || !result.data) { setError(result.error ?? "Unable to load Studio"); return; }
    setData(result.data); setResolutions({});
  }, []);
  useEffect(() => {
    const id = sessionStorage.getItem("studio.workspace") ?? "";
    setWorkspaceId(id);
    void load(id);
  }, [load]);

  async function selectWorkspace(id: string) {
    if ((editing || meta || scenario) && !window.confirm("Leave this unsaved form?")) return;
    if (id) sessionStorage.setItem("studio.workspace", id); else sessionStorage.removeItem("studio.workspace");
    sessionStorage.removeItem("studio.revision");
    setWorkspaceId(id); setEditing(null); setMeta(null); setScenario(null); setError(""); setNotice("");
    window.dispatchEvent(new Event("studio-workspace-change"));
    await load(id);
  }
  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (!data) return false;
    setBusy(true); setError(""); setNotice("");
    const result = await apiRequest<{ id?: string; revision?: number }>("/api/admin/studio", {
      method: "POST", body: JSON.stringify({ workspace_id: workspaceId, revision: data.workspace?.revision, ...payload, action }),
    });
    setBusy(false);
    if (!result.ok) { setError(result.error ?? "Request failed. Your edits are still here."); return false; }
    if (action === "create" && result.data?.id) await selectWorkspace(result.data.id);
    else await load(workspaceId);
    setNotice(action === "save" ? "Saved to this draft. Player content is unchanged." : "Saved.");
    return true;
  }
  if (!data) return <div className="p-6 text-sm">{error || "Loading collaborative Studio…"}</div>;
  const { actor, workspace, manifest } = data;
  const members = data.members.some((member) => member.user_id === actor.id) ? data.members : [...data.members, { user_id: actor.id, display_name: actor.email ?? "You", role: actor.role }];
  const name = (id: string | null) => members.find((member) => member.user_id === id)?.display_name || (id === actor.id ? "You" : id?.slice(0, 8) ?? "Unassigned");
  const canEdit = Boolean(workspace && workspace.status === "draft" && (actor.admin || workspace.owner_id === actor.id || workspace.collaborator_ids.includes(actor.id)));
  const canReview = Boolean(workspace && (actor.admin || workspace.reviewer_id === actor.id));
  const canPublish = actor.admin || actor.role === "publisher";
  const stale = workspace && workspace.base_release_id !== data.activeReleaseId;
  const kind: StudioKind = mode === "library" ? "definitions" : "plans";
  const records = manifest[kind];
  const issueErrors = data.issues.filter((issue) => issue.severity === "error");
  const titleOf = (id: string) => Object.values(manifest).flat().find((row) => recordId(row) === id)?.title ?? id;
  const myWork = data.workspaces.filter((item) => item.owner_id === actor.id || item.reviewer_id === actor.id || item.collaborator_ids.includes(actor.id));
  function depth(row: StudioRecord): number {
    const seen = new Set<string>(); let next = row.parent_id; let count = 0;
    while (typeof next === "string" && next && !seen.has(next)) { seen.add(next); count++; next = manifest.plans.find((plan) => recordId(plan) === next)?.parent_id; }
    return Math.min(count, 5);
  }
  const edit = (row: StudioRecord) => { setEditing({ ...row }); setEditRevision(workspace?.revision ?? 0); };
  const patch = (key: string, value: unknown) => setEditing((row) => row ? { ...row, [key]: value } : null);
  const memberOptions = members.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name || member.user_id.slice(0, 8)} · {member.role}</option>);

  return <div className="h-full overflow-auto bg-slate-50 p-5 space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs uppercase tracking-widest text-indigo-700">Narrative production</p><h1 className="text-2xl font-semibold text-slate-900">{titles[mode]}</h1></div>
      <label className="text-xs text-slate-600">Working context<select className={`${inputClass} mt-1`} value={workspaceId} onChange={(event) => void selectWorkspace(event.target.value)}><option value="">Current release · read only</option>{data.workspaces.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select></label>
    </header>
    {error && <div role="alert" className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}<button className={`${buttonClass} ml-3`} onClick={() => void load(workspaceId)}>Reload latest context</button></div>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    {workspace && <div className="rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
      <strong>{workspace.title}</strong> · revision {workspace.revision} · {workspace.status} · owner {name(workspace.owner_id)} · reviewer {name(workspace.reviewer_id)}
      {stale && <p className="mt-2 text-amber-900">A newer release is active. Compare and rebase this workspace before publication; approval will need to be renewed. <button disabled={busy} className={buttonClass} onClick={() => void act("rebase", { release_id: data.activeReleaseId, resolutions })}>Rebase reviewed changes</button></p>}
    </div>}

    {workspace && (editing || scenario) && editRevision !== workspace.revision && <section className={panelClass}><h2 className="font-semibold">This form started at revision {editRevision}</h2><p className="text-sm">Your text is preserved. Compare the latest saved object below, incorporate any changes into your form, then acknowledge the current revision before saving.</p><details><summary className="text-sm">Latest saved object</summary><pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify((editing ? manifest[kind] : manifest.scenarios).find((row) => recordId(row) === recordId(editing ?? scenario!)) ?? null,null,2)}</pre></details><button className={buttonClass} onClick={() => setEditRevision(workspace.revision)}>I compared the latest version; keep my edited form</button></section>}

    {stale && data.conflicts.length > 0 && <section className={panelClass}><h2 className="font-semibold">Resolve overlapping edits</h2><p className="text-sm text-slate-600">Compare both versions. Keeping a draft replaces the released object in your workspace; keeping the release drops your change. Rebase applies these decisions and requires a new review.</p>{data.conflicts.map((conflict) => <div className="space-y-2 rounded border p-3" key={conflict.id}><strong className="text-sm">{conflict.draft?.title ?? conflict.released?.title ?? conflict.id}</strong><div className="grid gap-3 lg:grid-cols-2">{([['draft','Your draft',conflict.draft],['released','Current release',conflict.released]] as const).map(([choice,label,value]) => <div key={choice}><label className="flex gap-2 text-sm"><input type="radio" name={conflict.id} checked={resolutions[conflict.id] === choice} onChange={() => setResolutions({ ...resolutions, [conflict.id]: choice })}/>Keep {label.toLowerCase()}</label><details><summary className="text-xs">Compare {label.toLowerCase()}</summary><pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(value,null,2)}</pre></details></div>)}</div></div>)}</section>}

    {mode === "work" && <>
      <section className={panelClass}><h2 className="font-semibold">Your assignments</h2>
        {myWork.length === 0 && <p className="text-sm text-slate-500">No assignments yet. Create a workspace below or ask a lead to add you.</p>}
        {myWork.map((item) => <button key={item.id} className="block w-full rounded border p-3 text-left hover:border-indigo-400" onClick={() => void selectWorkspace(item.id)}><strong>{item.title}</strong><span className="ml-2 text-xs text-slate-500">{item.status} · {item.owner_id === actor.id ? "Writing" : item.reviewer_id === actor.id ? "Reviewing" : "Contributing"}</span><p className="text-sm text-slate-600">{item.blocked_reason || item.brief || "Add a brief to define the work."}</p></button>)}
      </section>
      <section className={panelClass}><h2 className="font-semibold">Create an assignment</h2><Field label="Workspace title" value={newTitle} onChange={setNewTitle}/><Field label="Brief: experience, constraints, open questions, and acceptance paths" value={newBrief} onChange={setNewBrief} multiline/>
        <div className="grid gap-3 md:grid-cols-2"><label className="text-xs">Owner<select className={inputClass} value={newOwner || actor.id} onChange={(event) => setNewOwner(event.target.value)}>{memberOptions}</select></label><label className="text-xs">Reviewer<select className={inputClass} value={newReviewer} onChange={(event) => setNewReviewer(event.target.value)}><option value="">Assign later</option>{memberOptions}</select></label></div>
        <button className={primaryClass} disabled={busy || !newTitle.trim()} onClick={async () => { if (await act("create", { title: newTitle, brief: newBrief, owner_id: newOwner || actor.id, reviewer_id: newReviewer })) { setNewTitle(""); setNewBrief(""); } }}>Create draft workspace</button>
      </section>
      {workspace && <section className={panelClass}><h2 className="font-semibold">Assignment brief</h2><p className="whitespace-pre-wrap text-sm">{workspace.brief || "No brief yet."}</p>
        <div className="flex flex-wrap gap-2"><Link className={primaryClass} href="/studio/content/storylets">Write storylets</Link><Link className={buttonClass} href="/studio/content/narrative">Open narrative map</Link><Link className={buttonClass} href="/studio/content/review">Review & test</Link><button disabled={!canEdit} className={buttonClass} onClick={() => setMeta({ ...workspace })}>Edit assignment</button></div>
        {meta && <div className="space-y-3 border-t pt-4"><Field label="Title" value={meta.title} onChange={(title) => setMeta({ ...meta, title })}/><Field label="Brief" value={meta.brief} onChange={(brief) => setMeta({ ...meta, brief })} multiline/><Field label="Blocked because (blank when ready)" value={meta.blocked_reason} onChange={(blocked_reason) => setMeta({ ...meta, blocked_reason })}/>
          <label className="block text-xs">Reviewer<select className={inputClass} value={meta.reviewer_id ?? ""} onChange={(event) => setMeta({ ...meta, reviewer_id: event.target.value || null })}><option value="">Unassigned</option>{memberOptions}</select></label>
          <label className="block text-xs">Parent plan<select className={inputClass} value={meta.plan_id ?? ""} onChange={(event) => setMeta({ ...meta, plan_id: event.target.value || null })}><option value="">No parent plan</option>{manifest.plans.map((plan) => <option key={recordId(plan)} value={recordId(plan)}>{plan.title}</option>)}</select></label>
          <p className="text-xs font-medium">Contributors</p>{members.filter((member) => member.user_id !== meta.owner_id).map((member) => <label className="mr-4 inline-flex gap-2 text-sm" key={member.user_id}><input type="checkbox" checked={meta.collaborator_ids.includes(member.user_id)} onChange={(event) => setMeta({ ...meta, collaborator_ids: event.target.checked ? [...meta.collaborator_ids, member.user_id] : meta.collaborator_ids.filter((id) => id !== member.user_id) })}/>{member.display_name || member.user_id.slice(0, 8)}</label>)}
          <div className="flex gap-2"><button className={primaryClass} disabled={busy} onClick={async () => { if (await act("meta", { ...meta, workspace_id: meta.id, revision: meta.revision })) setMeta(null); }}>Save assignment</button><button className={buttonClass} onClick={() => setMeta(null)}>Cancel</button></div>
        </div>}
      </section>}
      {actor.admin && <section className={panelClass}><h2 className="font-semibold">Content team</h2><p className="text-sm text-slate-500">Add an existing game account. Tester access alone does not grant authoring rights.</p><div className="flex flex-wrap gap-2"><input aria-label="Member email" className={inputClass} type="email" placeholder="Account email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)}/><select aria-label="Studio role" className={inputClass} value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>{["writer","lead","reviewer","publisher"].map((role) => <option key={role}>{role}</option>)}</select><button className={buttonClass} disabled={busy || !memberEmail.trim()} onClick={() => void act("member", { email: memberEmail, role: memberRole })}>Add or update member</button></div><ul className="text-sm">{members.map((member) => <li key={member.user_id}>{member.display_name} · {member.role}</li>)}</ul></section>}
    </>}

    {(mode === "narrative" || mode === "library") && <div className="grid gap-5 xl:grid-cols-[minmax(240px,1fr)_2fr]">
      <section className={panelClass}><h2 className="font-semibold">{mode === "narrative" ? "Direction → plots → strands → arcs" : "Facts, people, and world agreements"}</h2><p className="text-xs text-slate-500">{mode === "narrative" ? "This outline organizes responsibility. It does not force a player route." : "Shared guidance is distinct from implemented game state. New mechanics need an engine integration."}</p>
        <button className={buttonClass} disabled={!canEdit} onClick={() => edit({ id: crypto.randomUUID(), title: "", kind: mode === "narrative" ? "arc" : "fact", dependencies: [], storylet_ids: [] })}>+ {mode === "narrative" ? "Plan" : "Definition"}</button>
        {records.length === 0 && <p className="text-sm text-slate-500">Create a draft workspace, then add the first brief.</p>}
        {records.map((row) => <button key={recordId(row)} className="block w-full rounded border px-3 py-2 text-left hover:border-indigo-400" style={{ paddingLeft: 12 + depth(row)*16 }} onClick={() => edit(row)}><span className="text-xs uppercase text-slate-400">{String(row.kind ?? "")}</span><p className="text-sm font-medium">{row.title || "Untitled"}</p></button>)}
      </section>
      <section className={panelClass}>{editing ? <>
        <Field label="Title" value={String(editing.title ?? "")} onChange={(value) => patch("title", value)}/>
        <div className="grid gap-3 md:grid-cols-2"><label className="text-xs">Type<select className={inputClass} value={String(editing.kind)} onChange={(event) => patch("kind", event.target.value)}>{(mode === "narrative" ? ["direction","plot","strand","arc"] : ["fact","npc","location","calendar","skill","resource","rule"]).map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs">Parent plan<select className={inputClass} value={String(editing.parent_id ?? "")} onChange={(event) => patch("parent_id", event.target.value || null)}><option value="">None</option>{manifest.plans.filter((row) => recordId(row) !== recordId(editing)).map((row) => <option key={recordId(row)} value={recordId(row)}>{row.title}</option>)}</select></label></div>
        {(mode === "narrative" ? [["experience","Player experience"],["question","Dramatic question"],["constraints","Required constraints"],["suggestions","Creative suggestions"],["open_questions","Open questions"],["entrances","Entrances and assumptions"],["outcomes","Possible conclusions"],["miss_path","Miss, decline, late-entry, and repair paths"],["timing","Timing and costs"],["acceptance","Acceptance paths to play"]] : [["meaning","Meaning / biography / agreement"],["scope","Scope and who may know"],["constraints","Constraints and allowed changes"],["guidance","Voice or implementation guidance"]]).map(([key,label]) => <Field key={key} label={label} value={String(editing[key] ?? "")} onChange={(value) => patch(key, value)} multiline/>)}
        <label className="block text-xs">Depends on<select multiple className={`${inputClass} h-28`} value={Array.isArray(editing.dependencies) ? editing.dependencies as string[] : []} onChange={(event) => patch("dependencies", Array.from(event.target.selectedOptions, (option) => option.value))}>{[...manifest.plans,...manifest.definitions].filter((row) => recordId(row) !== recordId(editing)).map((row) => <option key={recordId(row)} value={recordId(row)}>{row.title}</option>)}</select></label>
        {mode === "narrative" && <label className="block text-xs">Storylets in this arc<select multiple className={`${inputClass} h-28`} value={Array.isArray(editing.storylet_ids) ? editing.storylet_ids as string[] : []} onChange={(event) => patch("storylet_ids", Array.from(event.target.selectedOptions, (option) => option.value))}>{manifest.storylets.map((row) => <option key={recordId(row)} value={recordId(row)}>{row.title}</option>)}</select></label>}
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={editing.runtime_required === true} onChange={(event) => patch("runtime_required", event.target.checked)}/>Requires an engine capability that is not implemented yet</label>
        <div className="flex gap-2"><button className={primaryClass} disabled={!canEdit || busy || !String(editing.title ?? "").trim()} onClick={async () => { if (await act("save", { kind, object_id: recordId(editing), payload: editing, revision: editRevision })) setEditing(null); }}>Save draft</button><button className={buttonClass} onClick={() => setEditing(null)}>Close</button></div>
      </> : <p className="text-sm text-slate-500">Select a plan or definition to see its brief and connections.</p>}</section>
    </div>}

    {mode === "review" && <>
      {!workspace && <p className="text-sm">Select a workspace to compare its revisions and review it.</p>}
      {workspace && <section className={panelClass}><h2 className="font-semibold">Review revision {workspace.revision}</h2><p className="text-sm whitespace-pre-wrap">{workspace.brief}</p><div className="flex flex-wrap gap-2">
        <button className={buttonClass} disabled={busy || !canEdit} onClick={() => void act("submit")}>Request review</button>
        <button className={buttonClass} disabled={busy || !canReview || workspace.status !== "review"} onClick={() => void act("changes")}>Request changes</button>
        <button className={primaryClass} disabled={busy || !canReview || workspace.status !== "review" || issueErrors.length > 0} onClick={() => void act("approve")}>Approve this revision</button>
        <button className={buttonClass} disabled={busy || workspace.status === "published"} onClick={() => void act("withdraw")}>Return to draft</button>
      </div><p className="text-xs text-slate-500">The owner or a contributor cannot approve their own work. Editing an approved package requires a new review.</p></section>}
      <section className={panelClass}><h2 className="font-semibold">Changed content · {data.changes.length}</h2>{data.changes.map((change) => {
        const before = data.base?.[change.kind].find((row) => recordId(row) === change.object_id);
        const affected = [...manifest.plans,...manifest.definitions].filter((row) => (Array.isArray(row.dependencies) && row.dependencies.includes(change.object_id)) || (Array.isArray(row.storylet_ids) && row.storylet_ids.includes(change.object_id)) || row.parent_id === change.object_id);
        return <details key={`${change.kind}:${change.object_id}`} className="rounded border p-3"><summary className="cursor-pointer text-sm font-medium">{change.payload?.title || before?.title || change.object_id} · {change.kind} · {change.payload ? before ? "changed" : "new" : "removed"}</summary><div className="grid gap-3 pt-3 lg:grid-cols-2"><div><p className="text-xs font-semibold">Approved baseline</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(before ?? null,null,2)}</pre></div><div><p className="text-xs font-semibold">Proposed revision</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(change.payload,null,2)}</pre></div></div>{affected.length > 0 && <p className="mt-2 text-xs text-amber-800">Dependent work: {affected.map((row) => row.title).join(", ")}</p>}</details>;
      })}</section>
      <section className={panelClass}><h2 className="font-semibold">Checks · {issueErrors.length} must fix</h2><p className="text-xs text-slate-500">Warnings need editorial judgment. These checks do not prove every possible playthrough.</p>{data.issues.slice(0,150).map((issue,index) => <p key={index} className={`text-sm ${issue.severity === "error" ? "text-red-800" : "text-amber-800"}`}><strong>{issue.severity === "error" ? "Must fix" : "Review"}: {titleOf(issue.objectId)}</strong> — {issue.message}</p>)}</section>
      <section className={panelClass}><h2 className="font-semibold">Saved offer scenarios</h2><p className="text-xs text-slate-500">Tests the actual offer selector across tracks for this exact manifest. Covers a declared day, history, choices, flags, and skills; it does not simulate prose meaning, resource outcomes, or full conversation walks.</p>
        {data.tests.map((test) => <div className="rounded border p-3 text-sm" key={test.id}><strong className={test.passed ? "text-green-800" : "text-red-800"}>{test.passed ? "Pass" : "Fail"}: {test.title}</strong><p>Offered: {test.offered.join(", ") || "none"}</p>{test.failures.map((failure) => <p key={failure}>{failure}</p>)}<button className={`${buttonClass} mt-2`} onClick={() => { setScenarioError(""); setScenario(manifest.scenarios.find((row) => row.id === test.id) as StudioScenario); setEditRevision(workspace?.revision ?? 0); }}>Inspect scenario</button></div>)}
        <button className={buttonClass} disabled={!canEdit} onClick={() => { setScenarioError(""); setScenario({ id: crypto.randomUUID(), title: "", day: 0, segment: "morning", resolved: {}, choices: {}, flags: [], precluded: [], skills: [], expected: [], forbidden: [] }); setEditRevision(workspace?.revision ?? 0); }}>+ Offer scenario</button>
        {scenario && <div className="space-y-3 border-t pt-3"><Field label="Test name" value={scenario.title} onChange={(title) => setScenario({ ...scenario, title })}/><div className="flex gap-3"><label className="text-xs">Track day<input aria-label="Test day" type="number" min={0} className={inputClass} value={scenario.day} onChange={(event) => setScenario({ ...scenario, day: Number(event.target.value) })}/></label><label className="text-xs">Segment<select className={inputClass} value={scenario.segment} onChange={(event) => setScenario({ ...scenario, segment: event.target.value })}>{["morning","afternoon","evening","night"].map((segment) => <option key={segment}>{segment}</option>)}</select></label></div>
          <label className="block text-xs">Scenes that already happened<select multiple className={`${inputClass} h-32`} value={manifest.storylets.filter((row) => (scenario.resolved[String(row.track_id)] ?? []).includes(String(row.storylet_key))).map(recordId)} onChange={(event) => { const resolved: Record<string,string[]> = {}; for (const option of Array.from(event.target.selectedOptions)) { const row = manifest.storylets.find((item) => recordId(item) === option.value)!; (resolved[String(row.track_id)] ??= []).push(String(row.storylet_key)); } setScenario({ ...scenario, resolved }); }}>{manifest.storylets.filter((row) => row.track_id).map((row) => <option key={recordId(row)} value={recordId(row)}>{row.title}</option>)}</select></label>
          {([['expected','Must be offered'],['forbidden','Must not be offered']] as const).map(([key,label]) => <label key={key} className="block text-xs">{label}<select multiple className={`${inputClass} h-24`} value={scenario[key]} onChange={(event) => setScenario({ ...scenario, [key]: Array.from(event.target.selectedOptions,(option) => option.value) })}>{manifest.storylets.filter((row) => row.track_id).map((row) => <option key={recordId(row)} value={String(row.storylet_key)}>{row.title}</option>)}</select></label>)}
          <Field label="Flags (comma-separated)" value={scenario.flags.join(", ")} onChange={(value) => setScenario({ ...scenario, flags: value.split(",").map((flag) => flag.trim()).filter(Boolean) })}/><details><summary className="text-xs">Advanced scenario state</summary><textarea className={`${inputClass} mt-2 font-mono`} rows={8} defaultValue={JSON.stringify({ choices: scenario.choices, skills: scenario.skills, precluded: scenario.precluded },null,2)} key={scenario.id} aria-label="Advanced scenario state" onChange={(event) => { try { const state = JSON.parse(event.target.value); if (!state || typeof state !== "object" || Array.isArray(state) || (state.choices && (typeof state.choices !== "object" || Array.isArray(state.choices))) || (state.skills && !Array.isArray(state.skills)) || (state.precluded && !Array.isArray(state.precluded))) throw new Error("Invalid state"); setScenarioError(""); setScenario({ ...scenario, choices: state.choices ?? {}, skills: state.skills ?? [], precluded: state.precluded ?? [] }); } catch { setScenarioError("Invalid scenario state JSON. Correct it before saving."); } }}/></details>
          {scenarioError && <p role="alert" className="text-sm text-red-800">{scenarioError}</p>}<div className="flex gap-2"><button className={primaryClass} disabled={busy || !canEdit || Boolean(scenarioError) || !scenario.title.trim()} onClick={async () => { if (await act("save", { kind: "scenarios", object_id: scenario.id, payload: scenario, revision: editRevision })) setScenario(null); }}>Save and run scenario</button><button className={buttonClass} onClick={() => setScenario(null)}>Close</button></div></div>}
      </section>
      {workspace && <section className={panelClass}><h2 className="font-semibold">Discussion & revision history</h2><label className="block text-xs">Comment on<select className={inputClass} value={commentTarget} onChange={(event) => setCommentTarget(event.target.value)}><option value="">Whole assignment</option>{data.changes.map((change) => <option key={`${change.kind}:${change.object_id}`} value={change.object_id}>{titleOf(change.object_id)}</option>)}</select></label><Field label="Review note" value={comment} onChange={setComment} multiline/><button className={buttonClass} disabled={busy || !comment.trim()} onClick={async () => { if (await act("comment", { text: comment, object_id: commentTarget })) setComment(""); }}>Add review note</button><div className="space-y-2">{data.events.map((event) => <div key={event.id} className="border-t pt-2 text-xs"><strong>{name(event.actor_id)}</strong> · {event.action} · revision {event.revision} · {new Date(event.created_at).toLocaleString()}{event.detail.text ? <p className="mt-1 whitespace-pre-wrap text-sm">{String(event.detail.text)}</p> : null}</div>)}</div></section>}
    </>}

    {mode === "releases" && <section className={panelClass}><h2 className="font-semibold">Release complete, approved work</h2><p className="text-sm text-slate-600">New playthroughs use the active release. Existing playthroughs remain on their pinned release, including after rollback.</p>{workspace && <button className={primaryClass} disabled={busy || !canPublish || workspace.status !== "approved" || Boolean(stale)} onClick={() => void act("publish")}>Publish {workspace.title}</button>}{data.releases.map((release) => <div key={release.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"><div><strong>{release.title}</strong>{release.id === data.activeReleaseId && <span className="ml-2 rounded bg-green-100 px-2 text-xs text-green-800">Active for new runs</span>}<p className="text-xs text-slate-500">{new Date(release.created_at).toLocaleString()} · {release.runtime_version}</p></div><button className={buttonClass} disabled={busy || !canPublish || release.id === data.activeReleaseId} onClick={() => { if (window.confirm(`Use “${release.title}” for new playthroughs? Existing runs keep their release.`)) void act("activate", { release_id: release.id }); }}>Activate this release</button></div>)}</section>}
  </div>;
}
