"use client";
import type { BoundFactUse } from "@/core/studio/bindings";
import type { FactSchema, FactUse, Reservation } from "@/core/studio/agreements";
import type { StudioManifest, StudioRecord } from "@/types/studio";
const input = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded border px-3 py-2 text-xs disabled:opacity-40";
function initialValue(schema: FactSchema): unknown { return schema.type === "boolean" ? false : schema.type === "number" ? 0 : schema.values?.[0] ?? ""; }
function FactValue({ schema, value, change, label }: { schema: FactSchema; value: unknown; change: (value: unknown) => void; label: string }) {
  return <label className="block text-xs">{label}{schema.type === "boolean" ? <select className={input} value={String(value ?? false)} onChange={(e) => change(e.target.value === "true")}><option value="false">False</option><option value="true">True</option></select> : schema.type === "number" ? <input type="number" className={input} value={typeof value === "number" ? value : ""} onChange={(e) => change(e.target.value === "" ? null : Number(e.target.value))}/> : <select className={input} value={String(value ?? "")} onChange={(e) => change(e.target.value)}><option value="">Choose a value</option>{schema.values?.map((v,i) => <option key={i} value={v}>{v}</option>)}</select>}</label>;
}
function FactUses({ uses, manifest, change, conditionsOnly = false }: { uses: BoundFactUse[]; manifest: StudioManifest; change: (uses: FactUse[]) => void; conditionsOnly?: boolean }) {
  const facts = manifest.definitions.filter((row) => row.kind === "fact" && row.fact_schema);
  const patch = (index: number, update: Partial<BoundFactUse>) => change(uses.map((use,i) => i === index ? { ...use, ...update } : use));
  return <div className="space-y-3">{uses.map((use,index) => {
    const schema = facts.find((fact) => fact.id === use.definition_id)?.fact_schema as FactSchema | undefined;
    return <div key={index} className="space-y-2 rounded border p-3">
      <label className="block text-xs">Shared fact<select className={input} value={use.definition_id} onChange={(e) => { const fact = facts.find((row) => row.id === e.target.value); patch(index,{ definition_id: e.target.value, value: fact ? initialValue(fact.fact_schema as FactSchema) : null }); }}><option value="">Choose a typed fact</option>{facts.map((fact) => <option key={String(fact.id)} value={String(fact.id)}>{fact.title}</option>)}</select></label>
      {!conditionsOnly && <label className="block text-xs">Use in this plan<select className={input} value={use.mode} onChange={(e) => patch(index,{ mode: e.target.value as FactUse["mode"] })}><option value="requires">Requires on entry</option><option value="establishes">May establish as an outcome</option></select></label>}
      {schema && <FactValue label="Agreed value" schema={schema} value={use.value} change={(value) => patch(index,{value})}/>}
      <label className="block text-xs">Playable scene<select className={input} value={use.storylet_id ?? ""} onChange={(e) => patch(index,{storylet_id:e.target.value,choice_id:undefined})}><option value="">Not linked yet</option>{manifest.storylets.map(scene => <option key={String(scene.id)} value={String(scene.id)}>{scene.title}</option>)}</select></label>
      {use.mode === "establishes" && use.storylet_id && <label className="block text-xs">Producing choice<select className={input} value={use.choice_id ?? ""} onChange={(e) => patch(index,{choice_id:e.target.value})}><option value="">Choose an outcome</option>{((manifest.storylets.find(scene => scene.id === use.storylet_id)?.choices ?? []) as StudioRecord[]).map(choice => <option key={String(choice.id)} value={String(choice.id)}>{String(choice.label)}</option>)}</select></label>}
      {!schema && <p className="text-xs text-amber-800">Choose an existing typed definition before review.</p>}
      <button type="button" className={button} onClick={() => change(uses.filter((_,i) => i !== index))}>Remove fact agreement</button>
    </div>;
  })}<button type="button" className={button} onClick={() => change([...uses,{ definition_id: "", mode: "requires", value: null }])}>+ {conditionsOnly ? "Calendar condition" : "Fact agreement"}</button></div>;
}
export function AgreementEditor({ record, manifest, patch, disabled }: { record: StudioRecord; manifest: StudioManifest; patch: (key: string,value: unknown) => void; disabled: boolean }) {
  const schema = record.fact_schema as FactSchema | undefined;
  const reservation = record.reservation as Reservation | undefined;
  const updateReservation = (update: Partial<Reservation>) => patch("reservation", { ...reservation, ...update });
  return <fieldset disabled={disabled} className="space-y-4 rounded border border-indigo-200 bg-indigo-50 p-4">
    <legend className="px-1 text-sm font-semibold">Declared agreements</legend>
    <p className="text-xs text-slate-600">Link agreements to existing gameplay conditions and choice effects. Checks report missing or inconsistent implementation; declarations do not create gameplay effects.</p>
    {record.kind === "fact" && <div className="space-y-3">
      {!schema ? <button className={button} type="button" onClick={() => patch("fact_schema", { type: "boolean", default_known: false })}>Define fact values</button> : <>
        <label className="block text-xs">Value type<select className={input} value={schema.type} onChange={(e) => patch("fact_schema",{ type: e.target.value, default_known: false, ...(e.target.value === "enum" ? { values: [] } : {}) })}><option value="boolean">True or false</option><option value="number">Number</option><option value="enum">Named values</option></select></label>
        {schema.type === "enum" && <label className="block text-xs">Allowed values (one per line)<textarea className={input} value={(schema.values ?? []).join("\n")} onChange={(e) => patch("fact_schema",{ ...schema, values: e.target.value.split("\n") })}/></label>}
        <label className="block text-xs">Initial knowledge<select className={input} value={schema.default_known ? "known" : "unknown"} onChange={(e) => patch("fact_schema",{ ...schema, default_known: e.target.value === "known", default_value: e.target.value === "known" ? initialValue(schema) : undefined })}><option value="unknown">Unknown</option><option value="known">Known value</option></select></label>
        {schema.default_known && <FactValue label="Initial value" schema={schema} value={schema.default_value} change={(value) => patch("fact_schema",{ ...schema, default_value: value })}/>}
      </>}
    </div>}
    {schema && record.kind === "fact" && <label className="block text-xs">Persistent gameplay flag<input className={input} placeholder="Unlinked" value={String((record.runtime_binding as {key?:string} | undefined)?.key ?? "")} onChange={e => patch("runtime_binding",e.target.value ? {kind:"flag",key:e.target.value} : undefined)}/><span>Supported for boolean facts with a known false initial value. Choices set true; scene requirements read true.</span></label>}
    {schema && <button type="button" className={button} onClick={() => patch("fact_schema",undefined)}>Remove typed fact definition</button>}
    {reservation && record.kind !== "calendar" && <button type="button" className={button} onClick={() => patch("reservation",undefined)}>Remove reservation from this non-calendar definition</button>}
    <div><h3 className="mb-2 text-xs font-semibold">Fact inputs and possible outputs</h3><FactUses uses={Array.isArray(record.fact_uses) ? record.fact_uses as FactUse[] : []} manifest={manifest} change={(uses) => patch("fact_uses",uses)}/></div>
    {record.kind === "calendar" && <div className="space-y-3 border-t border-indigo-200 pt-3">
      {!reservation ? <button type="button" className={button} onClick={() => patch("reservation",{ track_id: "", day: 0, start_hour: 9, end_hour: 10, location_id: "", npc_ids: [], conditions: [] })}>Reserve a calendar window</button> : <>
        <p className="text-xs">An event without conditions is declared to occur. Conditional overlaps need review; mutually exclusive fact values are treated as alternatives. Different track clocks cannot prove a collision.</p>
        <label className="block text-xs">Track clock<select className={input} value={reservation.track_id} onChange={(e) => updateReservation({ track_id: e.target.value })}><option value="">Choose track</option>{manifest.tracks.map((track) => <option key={String(track.id)} value={String(track.id)}>{track.title}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-3">{([['day','Track day'],['start_hour','Start hour'],['end_hour','End hour']] as const).map(([key,label]) => <label key={key} className="text-xs">{label}<input type="number" min={0} max={key === "day" ? undefined : 24} step={key === "day" ? 1 : 0.5} className={input} value={Number.isFinite(reservation[key]) ? reservation[key] : ""} onChange={(e) => updateReservation({ [key]: e.target.value === "" ? NaN : Number(e.target.value) })}/></label>)}</div>
        <label className="block text-xs">Runtime segment<select className={input} value={reservation.segment ?? ""} onChange={e => updateReservation({segment:e.target.value})}><option value="">Not linked yet</option>{['morning','afternoon','evening','night'].map(segment => <option key={segment}>{segment}</option>)}</select><span>The game enforces this segment. Exact start and end hours remain planning guidance.</span></label>
        <label className="block text-xs">Location<select className={input} value={reservation.location_id} onChange={(e) => updateReservation({ location_id: e.target.value })}><option value="">Choose location</option>{manifest.definitions.filter((row) => row.kind === "location").map((row) => <option key={String(row.id)} value={String(row.id)}>{row.title}</option>)}</select></label>
        <label className="block text-xs">Required NPCs<select multiple className={`${input} h-24`} value={reservation.npc_ids} onChange={(e) => updateReservation({ npc_ids: Array.from(e.target.selectedOptions,(option) => option.value) })}>{manifest.definitions.filter((row) => row.kind === "npc").map((row) => <option key={String(row.id)} value={String(row.id)}>{row.title}</option>)}</select></label>
        <label className="block text-xs">Playable event scenes<select multiple className={`${input} h-24`} value={(record.storylet_ids ?? []) as string[]} onChange={e => patch("storylet_ids",Array.from(e.target.selectedOptions,o => o.value))}>{manifest.storylets.map(scene => <option key={String(scene.id)} value={String(scene.id)}>{scene.title}</option>)}</select><span>Link the actual occurrence. The runtime enforces whole segments, not precise hours within them.</span></label>
        <FactUses uses={reservation.conditions ?? []} manifest={manifest} conditionsOnly change={(conditions) => updateReservation({conditions})}/>
        <button type="button" className={button} onClick={() => patch("reservation",undefined)}>Remove reservation</button>
      </>}
    </div>}
  </fieldset>;
}
