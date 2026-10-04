import { describe, expect, it } from 'vitest';
import { emptyManifest, runStudioScenarios, validateManifest } from './manifest';
import { studyGroupPilot } from './studyGroupPilot';
import { runRehearsal, type RehearsalScenario } from './rehearsal';
import { validateRuntimeBindings } from './bindings';
import type { StudioManifest, StudioRecord } from '@/types/studio';
function fixture():StudioManifest {
  const base = {...emptyManifest(),tracks:[{id:'academic',key:'academic',is_enabled:true},{id:'belonging',key:'belonging',is_enabled:true}]};
  return {...studyGroupPilot(base),tracks:base.tracks};
}
function first(manifest:StudioManifest) {return manifest.scenarios[0] as RehearsalScenario;}
describe('multi-scene author rehearsals',()=>{
  it('passes every pilot path without mutating the draft and gives deterministic traces',()=>{
    const manifest=fixture(),before=structuredClone(manifest);
    const results=runStudioScenarios(manifest);
    expect(results.map(r=>({title:r.title,failures:r.failures}))).toEqual(results.map(r=>({title:r.title,failures:[]})));
    expect(results).toHaveLength(7);
    expect(runStudioScenarios(manifest)).toEqual(results);
    expect(manifest).toEqual(before);
    expect(validateManifest(manifest).filter(i=>i.severity==='error')).toEqual([]);
  });
  it('reports the failing step and resource mismatch and stops dependent steps',()=>{
    const m=fixture(),s=first(m);s.steps[2].expect={resources:{energy:99}};
    const result=runRehearsal(m,s);
    expect(result.failures).toContain('Step 3: energy: expected 99; actual 64.');
    expect(result.trace).toHaveLength(3);
    expect(result.trace?.[2].storylet_id).toBe(m.storylets[1].id);
  });
  it('does not let practice bypass a trained-skill requirement',()=>{
    const m=fixture(); (m.storylets[1].choices as StudioRecord[])[0].requires_skill={skill_id:'close_reading'};
    expect(runRehearsal(m,first(m)).failures.join()).toMatch(/requires trained skill/);
    first(m).initial.trained=['close_reading'];
    expect(runRehearsal(m,first(m)).passed).toBe(true);
  });
  it('enforces resource gates without applying a failed choice',()=>{
    const m=fixture();(m.storylets[1].choices as StudioRecord[])[0].requires_resource={key:'energy',min:80};
    const result=runRehearsal(m,first(m));
    expect(result.failures.join()).toMatch(/requires 80; actual 70/);
    expect(result.trace?.at(-1)?.after.resources.energy).toBe(70);
  });
  it('fails closed on unsupported dialogue or probabilistic effects',()=>{
    const m=fixture();m.storylets[0].nodes=[{id:'start',text:'Hello'}];
    expect(runRehearsal(m,first(m)).failures.join()).toMatch(/conversation walks/);
    m.storylets[0].nodes=null;(m.storylets[0].choices as StudioRecord[])[0].check={skill:'close_reading'};
    expect(runRehearsal(m,first(m)).failures.join()).toMatch(/choice effect check/);
  });
  it('bounds malformed tests and refuses vacuous assertions',()=>{
    const m=fixture();first(m).steps=[{action:'check',expect:{offered:[]}}];
    expect(runRehearsal(m,first(m)).passed).toBe(false);
    first(m).steps=Array.from({length:65},()=>({action:'check',expect:{energy:10}} as never));
    expect(runRehearsal(m,first(m)).failures.join()).toMatch(/1–64/);
  });
  it('rejects unmodeled initial conditions instead of silently passing',()=>{
    const m=fixture();(first(m).initial as Record<string,unknown>).tensions=['unpaid'];
    expect(runRehearsal(m,first(m)).failures.join()).toMatch(/cannot be silently ignored/);
  });
  it('exposes the current runtime duration gap instead of inventing a clock deduction',()=>{
    const m=fixture();m.storylets[0].time_cost_hours=2;
    first(m).steps=[{...first(m).steps[0],expect:{hours:16}}];
    const result=runRehearsal(m,first(m));
    expect(result.passed).toBe(true);
    expect(result.trace?.[0].notes.join()).toMatch(/not deducted/);
  });
  it('uses actual sleep recovery with the stated empty allocation/tension scope',()=>{
    const m=fixture();first(m).initial={day:0,segment:'night',hours:4,resources:{energy:60,stress:40}};
    first(m).steps=[{action:'advance',expect:{day:1,segment:'morning',resources:{energy:67,stress:34}}}];
    expect(runRehearsal(m,first(m)).passed).toBe(true);
  });
});
describe('playable agreement bindings',()=>{
  it('detects a changed producer, missing consumer and calendar drift',()=>{
    const m=fixture();expect(validateRuntimeBindings(m).filter(i=>i.severity==='error')).toEqual([]);
    (m.storylets[0].choices as StudioRecord[])[0].sets_flag=['wrong'];
    expect(validateRuntimeBindings(m).some(i=>/does not set/.test(i.message))).toBe(true);
    m.storylets[1].requirements={};m.storylets[1].due_offset_days=1;
    expect(validateRuntimeBindings(m).some(i=>/does not require/.test(i.message))).toBe(true);
    expect(validateRuntimeBindings(m).some(i=>/exact track day/.test(i.message))).toBe(true);
  });
  it('does not claim that precise appointments or unknown flag defaults are enforced',()=>{
    const m=fixture();(m.definitions.find(d=>d.reservation)!.reservation as {start_hour:number}).start_hour=14;
    expect(validateRuntimeBindings(m).some(i=>/planning-only/.test(i.message))).toBe(true);
    m.definitions[0].fact_schema={type:'boolean',default_known:false};
    expect(validateRuntimeBindings(m).some(i=>/known false initial/.test(i.message))).toBe(true);
  });
});
