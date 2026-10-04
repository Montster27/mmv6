"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChipPicker } from './ChipPicker';
import { describeRehearsalStep } from '@/core/studio/rehearsalText';
import type { RehearsalScenario, RehearsalStep } from '@/core/studio/rehearsal';
import type { StudioManifest, StudioRecord, StudioTestResult } from '@/types/studio';
const input = 'mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded border px-3 py-2 text-sm disabled:opacity-40';
export function RehearsalPanel({manifest,tests,revision,canEdit,busy,save,onEditingChange}: {manifest:StudioManifest;tests:StudioTestResult[];revision:number;canEdit:boolean;busy:boolean;save:(record:StudioRecord,revision:number)=>Promise<boolean>;onEditingChange:(editing:boolean)=>void}) {
  const [draft,setDraft] = useState<RehearsalScenario|null>(null);
  const [capturedRevision,setCapturedRevision] = useState(0);
  const [error,setError] = useState('');
  const [advancedText,setAdvancedText] = useState<string|null>(null);
  const editing = draft !== null;
  useEffect(()=>{onEditingChange(editing);},[editing,onEditingChange]);
  function edit(record:RehearsalScenario) {setDraft(structuredClone(record));setCapturedRevision(revision);setError('');setAdvancedText(null);}
  function patchStep(index:number,patch:Partial<RehearsalStep>) {if(draft)setDraft({...draft,steps:draft.steps.map((step,i)=>i===index?{...step,...patch}:step)});}
  const title = (id:string)=>manifest.storylets.find(s=>s.id===id)?.title ?? id;
  return <section className="space-y-4 rounded-lg border bg-white p-5">
    <h2 className="font-semibold">Multi-scene rehearsals</h2>
    <p className="text-sm text-slate-600">Follow choices through the actual track selector, resource rules and NPC reactions. Rehearsals stop at the first failure. Sleep uses default recovery; allocations, tensions, routine weeks, dialogue walks and real-time training are outside this test.</p>
    {tests.filter(test=>test.trace).map(test=><div className="space-y-2 rounded border p-3" key={test.id}>
      <strong className={test.passed?'text-green-800':'text-red-800'}>{test.passed?'Pass':'Fail'}: {test.title}</strong>
      {test.failures.map((f,i)=><p className="text-sm text-red-800" key={i}>{f}</p>)}
      {test.trace?.map(row=><details className="rounded border p-2 text-sm" key={row.step}><summary>Step {row.step} · {row.storylet_id?title(row.storylet_id):row.action} · {row.after.day}/{row.after.segment} · energy {row.after.resources.energy}, stress {row.after.resources.stress} {row.failures.length?'· failed':''}</summary>
        {row.storylet_id&&<Link className="text-indigo-700 underline" href={`/studio/content/storylets?id=${encodeURIComponent(row.storylet_id)}`}>Open scene and choice {row.choice_id}</Link>}
        <p>Offered next: {row.offered.map(title).join(', ')||'none'}</p>{row.notes.map((note,i)=><p key={i} className="text-amber-800">{note}</p>)}
        {(()=>{const lines=describeRehearsalStep(row.before,row.after,title);return lines.length?<ul className="list-disc pl-5">{lines.map((l,i)=><li key={i}>{l}</li>)}</ul>:<p className="text-slate-500">Nothing changed in this step.</p>;})()}
        <details className="text-xs"><summary>Technical details (full state before and after)</summary><div className="grid gap-3 md:grid-cols-2"><div><p>Before</p><pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(row.before,null,2)}</pre></div><div><p>After</p><pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(row.after,null,2)}</pre></div></div></details>
      </details>)}
      <button className={button} onClick={()=>edit(manifest.scenarios.find(s=>s.id===test.id) as RehearsalScenario)}>Inspect rehearsal</button>
    </div>)}
    <button className={button} disabled={!canEdit} onClick={()=>edit({id:crypto.randomUUID(),title:'',mode:'rehearsal',initial:{day:0,segment:'morning',hours:16},steps:[{action:'check',expect:{offered:[]}}]})}>+ Rehearsal</button>
    {draft&&<fieldset disabled={!canEdit||busy} className="space-y-4 border-t pt-4">
      <label className="block text-xs">Rehearsal name<input className={input} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <fieldset disabled={advancedText!==null} className="space-y-4"><div className="grid gap-3 sm:grid-cols-3">{(['day','hours'] as const).map(key=><label className="text-xs" key={key}>Initial {key}<input type="number" min={0} max={key==='hours'?16:undefined} className={input} value={draft.initial[key]??0} onChange={e=>setDraft({...draft,initial:{...draft.initial,[key]:Number(e.target.value)}})}/></label>)}<label className="text-xs">Initial segment<select className={input} value={draft.initial.segment??'morning'} onChange={e=>setDraft({...draft,initial:{...draft.initial,segment:e.target.value}})}>{['morning','afternoon','evening','night'].map(s=><option key={s}>{s}</option>)}</select></label></div>
      <div className="grid gap-3 sm:grid-cols-2">{(['energy','stress'] as const).map(key=><label key={key} className="text-xs">Initial {key}<input type="number" min={0} max={100} className={input} value={draft.initial.resources?.[key]??(key==='energy'?70:20)} onChange={e=>setDraft({...draft,initial:{...draft.initial,resources:{...draft.initial.resources,[key]:Number(e.target.value)}}})}/></label>)}</div>
      {draft.steps.map((step,index)=><div key={index} className="space-y-3 rounded border p-3">
        <h3 className="text-sm font-semibold">Step {index+1}</h3>
        <label className="block text-xs">Action<select className={input} value={step.action} onChange={e=>patchStep(index,{action:e.target.value as RehearsalStep['action'],storylet_id:undefined,choice_id:undefined})}><option value="check">Check opportunities and state</option><option value="choose">Choose a scene outcome</option><option value="advance">Move to next segment / sleep</option></select></label>
        {step.action==='choose'&&<><label className="block text-xs">Scene<select className={input} value={step.storylet_id??''} onChange={e=>patchStep(index,{storylet_id:e.target.value,choice_id:undefined})}><option value="">Choose a scene</option>{manifest.storylets.filter(s=>s.track_id).map(s=><option key={String(s.id)} value={String(s.id)}>{s.title}</option>)}</select></label><label className="block text-xs">Choice<select className={input} value={step.choice_id??''} onChange={e=>patchStep(index,{choice_id:e.target.value})}><option value="">Choose an outcome</option>{((manifest.storylets.find(s=>s.id===step.storylet_id)?.choices??[]) as StudioRecord[]).map(c=><option key={String(c.id)} value={String(c.id)}>{String(c.label)}</option>)}</select></label></>}
        {(['offered','forbidden'] as const).map(key=><ChipPicker key={key} label={key==='offered'?'Must be offered afterward':'Must not be offered afterward'} emptyText={key==='offered'?'No scene is required to appear.':'No scene is required to be absent.'} placeholder="Search scenes…" options={manifest.storylets.filter(s=>s.track_id).map(s=>({value:String(s.id),label:String(s.title||'Untitled scene'),hint:String(s.storylet_key??'')}))} value={step.expect?.[key]??[]} onChange={next=>patchStep(index,{expect:{...step.expect,[key]:next}})}/>)}
        <div className="grid gap-3 sm:grid-cols-2">{(['energy','stress'] as const).map(key=><label key={key} className="text-xs">Expected {key} (optional)<input type="number" min={0} max={100} className={input} value={step.expect?.resources?.[key]??''} onChange={e=>patchStep(index,{expect:{...step.expect,resources:{...step.expect?.resources,[key]:e.target.value===''?undefined:Number(e.target.value)}}})}/></label>)}</div>
        <button className={button} onClick={()=>setDraft({...draft,steps:draft.steps.filter((_,i)=>i!==index)})}>Remove step {index+1}</button>
      </div>)}
      <button className={button} disabled={draft.steps.length>=64} onClick={()=>setDraft({...draft,steps:[...draft.steps,{action:'check',expect:{}}]})}>+ Step</button>
      </fieldset>
      {advancedText===null ? <button type="button" className={button} onClick={()=>setAdvancedText(JSON.stringify({initial:draft.initial,steps:draft.steps},null,2))}>Edit advanced state and expectations</button> : <div className="space-y-2 rounded border p-3"><p className="text-xs">History, flags, trained skills, NPC expectations and track start days. Apply or discard these changes before saving.</p><textarea aria-label="Advanced rehearsal JSON" className={`${input} font-mono`} rows={12} value={advancedText} onChange={e=>setAdvancedText(e.target.value)}/><button type="button" className={button} onClick={()=>{try{const value=JSON.parse(advancedText);if(!value.initial||typeof value.initial!=='object'||Array.isArray(value.initial)||!Array.isArray(value.steps)||!value.steps.every((step:unknown)=>step && typeof step==='object' && ['check','choose','advance'].includes(String((step as RehearsalStep).action))))throw Error();setDraft({...draft,initial:value.initial,steps:value.steps});setError('');setAdvancedText(null);}catch{setError('Invalid rehearsal JSON. Correct it before saving.');}}}>Apply advanced changes</button><button type="button" className={button} onClick={()=>{setAdvancedText(null);setError('');}}>Discard advanced changes</button></div>}
      {error&&<p role="alert" className="text-red-800">{error}</p>}
      <button className={button} disabled={advancedText!==null||!!error||!draft.title.trim()||!draft.steps.length} onClick={async()=>{if(await save(draft,capturedRevision))setDraft(null);}}>Save and run rehearsal</button>
    </fieldset>}
    {draft&&<button className={button} onClick={()=>{setDraft(null);setAdvancedText(null);setError('');}}>Close rehearsal</button>}
  </section>;
}
