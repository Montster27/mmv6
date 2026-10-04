import { buildInitialTrackProgress, selectTrackStorylets } from '@/core/tracks/selectTrackStorylets';
import { collectChoiceResourceDeltas, checkResourceGate } from '@/core/resources/applyResourcesServer';
import { applyResourceDeltaToSnapshot, computeMorale, type ResourceSnapshot } from '@/core/resources/resourceDelta';
import { resolveEndOfDay } from '@/core/sim/endOfDay';
import { applyRelationshipEvents, mapLegacyNpcKnowledge, mapLegacyRelationalEffects, type RelationshipState, type RelationshipEvent } from '@/lib/relationships';
import { resolveEventsEmitted } from '@/lib/eventsEmitted';
import type { StoryletChoice } from '@/types/storylets';
import { CHAPTER_ONE_TRACK_KEYS, type Track, type TrackProgress, type TrackStoryletRow } from '@/types/tracks';
import type { StudioManifest, StudioRecord, StudioTestResult } from '@/types/studio';

export type RehearsalExpectation = {
  offered?: string[]; forbidden?: string[]; flags?: string[]; absent_flags?: string[];
  resources?: Partial<ResourceSnapshot>; relationships?: Record<string, Partial<RelationshipState>>;
  practiced?: string[]; day?: number; segment?: string; hours?: number;
};
export type RehearsalStep = { action: 'choose' | 'advance' | 'check'; storylet_id?: string; choice_id?: string; expect?: RehearsalExpectation };
export type RehearsalState = {
  day: number; segment: string; hours: number; resources: ResourceSnapshot;
  flags: string[]; precluded: string[]; trained: string[]; practiced: string[];
  relationships: Record<string, RelationshipState>;
  next_keys: Record<string, string | null>; track_states: Record<string, string | null>;
  resolved: Record<string, string[]>; choices: Record<string, string[]>;
};
export type RehearsalScenario = StudioRecord & {
  id: string; title: string; mode: 'rehearsal';
  initial: Partial<Omit<RehearsalState, 'resources' | 'practiced'>> & { resources?: Partial<ResourceSnapshot>; started_days?: Record<string, number> };
  steps: RehearsalStep[];
};
export type RehearsalTrace = {
  step: number; action: string; storylet_id?: string; choice_id?: string;
  before: RehearsalState; after: RehearsalState; offered: string[]; failures: string[]; notes: string[];
};
const segments = ['morning','afternoon','evening','night'];
const idOf = (row: StudioRecord) => String(row.id ?? row.key ?? '');
const defaults: ResourceSnapshot = { energy: 70, stress: 20, knowledge: 0, cashOnHand: 0, socialLeverage: 0, physicalResilience: 50, morale: 100 };
const knownRequirements = new Set(['requires_storylets','requires_any_storylets','excludes_storylets','requires_choice','requires_flag','requires_skill']);
const supportedChoiceFields = new Set(['id','label','reaction_text','reaction_with_skill','reaction_text_conditions','next_key','outcome','costs','rewards','energy_cost','requires_resource','costs_resource','sets_track_state','requires_skill','skill_modifier','practices_skills','precludes','sets_flag','events_emitted','relational_effects','set_npc_memory','time_cost','identity_tags']);
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function stringList(value: unknown, label: string): string[] {
  assert(Array.isArray(value) && value.every(x => typeof x === 'string'), `${label} must be a list of names.`); return value;
}
function checkExpected(expectation: RehearsalExpectation, state: RehearsalState, offered: string[], scenes: StudioRecord[]): string[] {
  const failures: string[] = [];
  const fail = (text: string) => failures.push(text);
  const keys = new Set(['offered','forbidden','flags','absent_flags','resources','relationships','practiced','day','segment','hours']);
  for (const key of Object.keys(expectation)) if (!keys.has(key)) fail(`Unsupported expectation ${key}.`);
  for (const key of ['offered','forbidden'] as const) for (const id of stringList(expectation[key] ?? [], key)) {
    const scene = scenes.find(s => idOf(s) === id);
    if (!scene) fail(`Missing scene ${id}.`);
    else if ((key === 'offered') !== offered.includes(id)) fail(`${scene.title}: expected ${key === 'offered' ? 'an offer' : 'no offer'}; actual ${offered.includes(id) ? 'offered' : 'not offered'} at day ${state.day}, ${state.segment}.`);
  }
  for (const flag of stringList(expectation.flags ?? [], 'flags')) if (!state.flags.includes(flag)) fail(`Flag ${flag}: expected present; actual absent.`);
  for (const flag of stringList(expectation.absent_flags ?? [], 'absent_flags')) if (state.flags.includes(flag)) fail(`Flag ${flag}: expected absent; actual present.`);
  for (const skill of stringList(expectation.practiced ?? [], 'practiced')) if (!state.practiced.includes(skill)) fail(`Skill ${skill}: expected practice event; actual none.`);
  for (const [key, value] of Object.entries(expectation.resources ?? {})) if (state.resources[key as keyof ResourceSnapshot] !== value) fail(`${key}: expected ${value}; actual ${state.resources[key as keyof ResourceSnapshot]}.`);
  for (const [npc, values] of Object.entries(expectation.relationships ?? {})) for (const [key, value] of Object.entries(values)) if (state.relationships[npc]?.[key as keyof RelationshipState] !== value) fail(`${npc}.${key}: expected ${value}; actual ${String(state.relationships[npc]?.[key as keyof RelationshipState])}.`);
  for (const key of ['day','segment','hours'] as const) if (expectation[key] !== undefined && expectation[key] !== state[key]) fail(`${key}: expected ${expectation[key]}; actual ${state[key]}.`);
  return failures;
}
/** Offline, bounded track rehearsal. No writes, wall-clock training, routine weeks, allocations or tensions. */
export function runRehearsal(manifest: StudioManifest, raw: StudioRecord): StudioTestResult {
  const scenario = raw as RehearsalScenario;
  const trace: RehearsalTrace[] = [];
  let offered: string[] = [];
  const failures: string[] = [];
  try {
    assert(scenario.initial && typeof scenario.initial === 'object', 'Set an initial rehearsal state.');
    assert(Array.isArray(scenario.steps) && scenario.steps.length > 0 && scenario.steps.length <= 64, 'A rehearsal needs 1–64 steps.');
    assert(scenario.steps.some(s => s.expect && Object.values(s.expect).some(v => Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' ? Object.keys(v).length > 0 : v !== undefined)), 'Add at least one state or offer expectation.');
    const initial = scenario.initial;
    const initialFields = new Set(['day','segment','hours','resources','flags','precluded','trained','relationships','resolved','choices','started_days','next_keys','track_states']);
    for (const key of Object.keys(initial)) assert(initialFields.has(key), `Initial ${key} is outside the track rehearsal model; it cannot be silently ignored.`);
    for (const key of ['resources','relationships','resolved','choices','started_days','next_keys','track_states'] as const) assert(initial[key] === undefined || (initial[key] !== null && typeof initial[key] === 'object' && !Array.isArray(initial[key])), `Initial ${key} must be an object.`);

    const state: RehearsalState = structuredClone({ day: initial.day ?? 0, segment: initial.segment ?? 'morning', hours: initial.hours ?? 16, resources: { ...defaults, ...initial.resources }, flags: initial.flags ?? [], precluded: initial.precluded ?? [], trained: initial.trained ?? [], practiced: [], relationships: initial.relationships ?? {}, next_keys: initial.next_keys ?? {}, track_states: initial.track_states ?? {}, resolved: initial.resolved ?? {}, choices: initial.choices ?? {} });
    assert(Number.isInteger(state.day) && state.day >= 0 && segments.includes(state.segment) && Number.isFinite(state.hours) && state.hours >= 0 && state.hours <= 16, 'Invalid initial day, segment or hours.');
    for (const [key,value] of Object.entries(state.resources)) assert(key in defaults && Number.isFinite(value), `Invalid initial resource ${key}.`);
    for (const key of ['energy','stress','physicalResilience'] as const) assert(state.resources[key] >= 0 && state.resources[key] <= 100, `${key} must be between 0 and 100.`);
    state.resources.morale = computeMorale(state.resources.energy, state.resources.stress);
    for (const key of ['flags','precluded','trained'] as const) stringList(state[key],key);
    const tracks = manifest.tracks.filter(row => CHAPTER_ONE_TRACK_KEYS.some(key => key === row.key)) as unknown as Track[];
    const scenes = manifest.storylets.filter(row => row.track_id && row.storylet_key) as unknown as TrackStoryletRow[];
    const progress: TrackProgress[] = tracks.map(track => ({ id: `rehearsal:${track.id}`, user_id: 'rehearsal', track_id: track.id, state: 'ACTIVE', current_storylet_key: '', storylet_due_day: 0, track_state: state.track_states[track.id] ?? null, started_day: initial.started_days?.[track.id] ?? 0, defer_count: 0, updated_day: state.day, resolved_storylet_keys: state.resolved[track.id] ?? [], next_key_override: state.next_keys[track.id] !== undefined ? state.next_keys[track.id] : (state.resolved[track.id]?.length ? null : buildInitialTrackProgress("rehearsal",[track],scenes,0)[0]?.next_key_override ?? null) }));
    for (const p of progress) {state.next_keys[p.track_id]=p.next_key_override;state.track_states[p.track_id]=p.track_state; if(p.next_key_override) assert(scenes.some(s=>s.track_id===p.track_id&&s.storylet_key===p.next_key_override),`Missing next scene ${p.next_key_override}.`);}
    for (const p of progress) assert(Number.isInteger(p.started_day) && p.started_day >= 0 && p.started_day <= state.day, `Invalid start day for ${p.track_id}.`);
    for (const [track,history] of Object.entries(state.resolved)) {
      assert(tracks.some(t => t.id === track), `Missing history track ${track}.`);
      for (const key of stringList(history, 'History')) assert(scenes.some(s => s.track_id === track && s.storylet_key === key), `Missing history ${key} on ${track}.`);
    }
    for (const [track,choices] of Object.entries(state.choices)) {
      assert(tracks.some(t => t.id === track), `Missing choice track ${track}.`);
      for (const key of stringList(choices,'Choices')) assert(scenes.some(s => s.track_id === track && s.choices.some(c => c.id === key)), `Missing choice ${key} on ${track}.`);
    }
    for (const key of state.precluded) assert(scenes.some(s => s.storylet_key === key), `Missing precluded scene ${key}.`);
    const offers = () => selectTrackStorylets({ dayIndex: state.day, currentSegment: state.segment, hoursRemaining: state.hours, tracks, storylets: scenes, progress, globalFlags: new Set(state.flags), precludedKeys: new Set(state.precluded), trainedSkillIds: new Set(state.trained), resolvedChoicesByTrack: new Map(Object.entries(state.choices).map(([k,v]) => [k,new Set(v)])) }).map(o => o.storylet.id);
    for (let index = 0; index < scenario.steps.length; index++) {
      const step = scenario.steps[index];
      const before = structuredClone(state);
      const notes: string[] = [];
      const stepFailures: string[] = [];
      try {
        assert(['choose','advance','check'].includes(step.action), 'Unknown rehearsal action.');
        for (const key of Object.keys(step)) assert(['action','storylet_id','choice_id','expect'].includes(key), `Unsupported step field ${key}.`);
        // Unknown selectors can create false-positive paths, including competing scenes.
        for (const scene of scenes.filter(s => s.is_active && !state.precluded.includes(s.storylet_key))) for (const key of Object.keys(scene.requirements ?? {})) assert(knownRequirements.has(key), `${scene.title}: unsupported requirement ${key}; add rehearsal support before relying on this path.`);
        offered = offers();
        if (step.action === 'advance') {
          if (state.segment === 'night' || state.hours <= 0) {
            const recovered = resolveEndOfDay({ energy: state.resources.energy, stress: state.resources.stress });
            state.resources.energy = recovered.nextEnergy; state.resources.stress = recovered.nextStress;
            state.resources.morale = computeMorale(recovered.nextEnergy,recovered.nextStress);
            state.day++; state.segment = 'morning'; state.hours = 16;
            notes.push('Default sleep recovery; no allocations or unresolved tensions are modeled. Real-time skill training is not advanced.');
          } else { state.segment = segments[segments.indexOf(state.segment)+1]; state.hours = Math.max(0,state.hours-4); }
        } else if (step.action === 'choose') {
          const scene = scenes.find(s => s.id === step.storylet_id);
          assert(scene, `Missing scene ${step.storylet_id}.`);
          assert(offered.includes(scene.id), `${scene.title} is not offered at day ${state.day}, ${state.segment}. Actual offers: ${offered.map(id => scenes.find(s => s.id === id)?.title).join(', ') || 'none'}. Check history, flags, expiry, preclusion and competing offers.`);
          assert(!scene.nodes?.length, `${scene.title}: conversation walks need a dialogue rehearsal adapter; terminal choices cannot be skipped to.`);
          const choice = scene.choices.find(c => c.id === step.choice_id) as (StoryletChoice & StudioRecord) | undefined;
          assert(choice, `${scene.title}: missing choice ${step.choice_id}.`);
          for (const [key,value] of Object.entries(choice)) assert(supportedChoiceFields.has(key) || value === null || value === undefined, `${scene.title}: choice effect ${key} is not supported by this rehearsal.`);
          assert(!choice.outcome?.deltas?.vectors, `${scene.title}: vector effects need a rehearsal adapter.`);
          for (const field of ['costs','rewards'] as const) for (const key of Object.keys(choice[field] ?? {})) assert(key === 'resources', `${scene.title}: ${field}.${key} is not supported by this rehearsal.`);
          if (choice.requires_skill?.skill_id) assert(state.trained.includes(choice.requires_skill.skill_id), `Choice requires trained skill ${choice.requires_skill.skill_id}. Practice alone does not train it.`);
          const gate = checkResourceGate(state.resources,choice);
          assert(gate.passed, `${gate.failedKey}: choice requires ${gate.required}; actual ${gate.current}.`);
          if (Array.isArray(choice.events_emitted)) for (const emission of choice.events_emitted) {
            if ('condition' in emission) for (const condition of Object.keys(emission.condition ?? {})) assert(['flag','all_flags','else'].includes(condition), `Unsupported NPC event condition ${condition}.`);
          }
          const events = [ ...(scene.introduces_npc ?? []).filter(npc => !state.relationships[npc]?.met).map(npc_id => ({npc_id, type: 'INTRODUCED_SELF' as const})), ...resolveEventsEmitted(choice.events_emitted,new Set()), ...mapLegacyRelationalEffects(choice.relational_effects), ...mapLegacyNpcKnowledge(choice.set_npc_memory) ];
          const supportedEvents = new Set(["WOKE_IN_SAME_ROOM","INTRODUCED_SELF","OVERHEARD_NAME","SHARED_MEAL","SMALL_KINDNESS","AWKWARD_MOMENT","DISRESPECT","CONFLICT_LOW","CONFLICT_HIGH","REPAIR_ATTEMPT","NOTICED_FACE","SHOWED_UP","WENT_MISSING","CONFIDED_IN","DISMISSED","DEFERRED_TENSION"]);
          for (const event of events) { assert(supportedEvents.has(event.type), `Unsupported NPC event ${event.type}.`); assert(typeof event.npc_id === "string" && (!('magnitude' in event) || event.magnitude === undefined || Number.isFinite(event.magnitude)), "Invalid NPC event recipient or magnitude."); }
          state.relationships = applyRelationshipEvents(state.relationships,events as RelationshipEvent[],{storylet_slug: scene.storylet_key,choice_id: choice.id}).next;
          // Timestamps are bookkeeping, not narrative state; make repeated runs byte-stable.
          for (const relationship of Object.values(state.relationships)) relationship.updated_at = 'rehearsal';
          state.resources = applyResourceDeltaToSnapshot(state.resources,{ resources: collectChoiceResourceDeltas(choice) }).next;
          state.flags = [...new Set([...state.flags,...stringList(choice.sets_flag ?? [],'Choice flags')])];
          state.precluded = [...new Set([...state.precluded,...(choice.precludes ?? [])])];
          state.practiced = [...new Set([...state.practiced,...(choice.practices_skills ?? [])])];
          if (choice.identity_tags?.length) notes.push(`Kind of choice (${choice.identity_tags.join(', ')}) is recorded in play; its effect on pressure counters is not simulated here.`);
          if (choice.practices_skills?.length) notes.push(`Practice requested: ${choice.practices_skills.join(', ')}. Only active training receives time credit in play; this does not grant a trained skill.`);
          const p = progress.find(p => p.track_id === scene.track_id)!;
          p.resolved_storylet_keys = [...p.resolved_storylet_keys,scene.storylet_key];
          state.resolved[scene.track_id] = p.resolved_storylet_keys;
          state.choices[scene.track_id] = [...(state.choices[scene.track_id] ?? []), choice.id];
          p.track_state = choice.sets_track_state?.state ?? p.track_state;
          const nextKey = choice.next_key ?? scene.default_next_key;
          const next = scenes.find(s => s.track_id === scene.track_id && s.storylet_key === nextKey);
          p.next_key_override = next?.storylet_key ?? (p.next_key_override === scene.storylet_key ? null : p.next_key_override);
          if (!next && !scenes.some(s => s.track_id === scene.track_id && s.is_active && !p.resolved_storylet_keys.includes(s.storylet_key) && s.due_offset_days+s.expires_after_days >= state.day-p.started_day)) p.state = 'COMPLETED';
          state.next_keys[p.track_id] = p.next_key_override; state.track_states[p.track_id] = p.track_state;
          if (choice.time_cost || scene.time_cost_hours) notes.push('Authored duration is not deducted by the track-choice runtime. Hours remain unchanged until time advances.');
        }
        offered = offers();
        if (step.expect) assert(typeof step.expect === "object" && !Array.isArray(step.expect), "Step expectations must be an object.");
        if (step.expect) stepFailures.push(...checkExpected(step.expect,state,offered,manifest.storylets));
      } catch (error) { stepFailures.push(error instanceof Error ? error.message : 'Invalid rehearsal step.'); }
      trace.push({ step: index+1, action: step.action, storylet_id: step.storylet_id, choice_id: step.choice_id, before, after: structuredClone(state), offered: [...offered], failures: stepFailures, notes });
      failures.push(...stepFailures.map(f => `Step ${index+1}: ${f}`));
      if (stepFailures.length) break; // Never derive later successes from a failed transition.
    }
  } catch (error) { failures.push(error instanceof Error ? error.message : 'Invalid rehearsal.'); }
  return { id: scenario.id, title: scenario.title, passed: failures.length === 0, offered, failures, trace };
}
