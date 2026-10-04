import type { FactUse, Reservation } from './agreements';
import type { StudioManifest, StudioRecord, StudioIssue } from '@/types/studio';

export type RuntimeFactBinding = { kind: 'flag'; key: string };
export type BoundFactUse = FactUse & { storylet_id?: string; choice_id?: string };

const id = (row: StudioRecord) => String(row.id ?? row.key ?? '');
/** Bindings verify existing gameplay data; they never synthesize flags or effects. */
export function validateRuntimeBindings(manifest: StudioManifest): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const add = (row: StudioRecord, message: string, severity: StudioIssue['severity'] = 'error') => issues.push({ objectId: id(row), severity, message });
  for (const fact of manifest.definitions.filter(row => row.runtime_binding !== undefined)) {
    const binding = fact.runtime_binding as RuntimeFactBinding;
    const schema = fact.fact_schema as Record<string, unknown> | undefined;
    if (fact.kind !== 'fact' || binding?.kind !== 'flag' || typeof binding.key !== 'string' || !binding.key.trim() || schema?.type !== 'boolean' || schema.default_known !== true || schema.default_value !== false) {
      add(fact, 'Runtime flags require a boolean fact, a known false initial value, and a nonempty flag name. Unknown, numeric and named-value state need an engine integration.');
    }
  }
  for (const row of [...manifest.plans, ...manifest.definitions]) {
    for (const use of (Array.isArray(row.fact_uses) ? row.fact_uses : []) as BoundFactUse[]) {
      const fact = manifest.definitions.find(f => id(f) === use?.definition_id);
      const binding = fact?.runtime_binding as RuntimeFactBinding | undefined;
      if (!binding || !use.storylet_id) { add(row, `Agreement for ${fact?.title ?? use?.definition_id} is not linked to a playable condition or effect.`, 'warning'); continue; }
      const scene = manifest.storylets.find(s => id(s) === use.storylet_id);
      if (!scene) { add(row, `Agreement references missing scene ${use.storylet_id}.`); continue; }
      if (!scene.is_active) add(row, `Agreement scene ${scene.title} is inactive.`);
      if (use.value !== true) { add(row, 'Persistent flags can currently establish or require true only; false/unknown transitions are not implemented.'); continue; }
      if (use.mode === 'requires') {
        if ((scene.requirements as Record<string, unknown> | undefined)?.requires_flag !== binding.key) add(row, `${scene.title} does not require the agreed flag ${binding.key}.`);
      } else {
        const choice = (Array.isArray(scene.choices) ? scene.choices as StudioRecord[] : []).find(c => c.id === use.choice_id);
        if (!choice || !Array.isArray(choice.sets_flag) || !choice.sets_flag.includes(binding.key)) add(row, `${scene.title}: the linked choice does not set the agreed flag ${binding.key}.`);
      }
    }
    if (!row.reservation) continue;
    const reservation = row.reservation as Reservation;
    const links = Array.isArray(row.storylet_ids) ? row.storylet_ids as string[] : [];
    if (!links.length) { add(row, 'Calendar event has no playable occurrence scene. Link the event itself, not its invitation.', 'warning'); continue; }
    for (const sceneId of links) {
      const scene = manifest.storylets.find(s => id(s) === sceneId);
      if (!scene) { add(row, `Calendar occurrence ${sceneId} is missing.`); continue; }
      if (!scene.is_active || scene.track_id !== reservation.track_id || scene.due_offset_days !== reservation.day || scene.expires_after_days !== 0) add(row, `${scene.title} must be active on the reserved track and exact track day.`);
      if (!reservation.segment || !["morning","afternoon","evening","night"].includes(reservation.segment) || scene.segment !== reservation.segment || scene.is_conflict) add(row, `${scene.title}: choose a runtime segment matching the occurrence scene. Conflict scenes can bypass segment gates and cannot enforce an appointment.`);
      add(row, `${scene.title}: exact hours ${reservation.start_hour}–${reservation.end_hour} remain planning-only. The game enforces day and segment, not a clock-hour reservation.`, "warning");
      for (const condition of reservation.conditions ?? []) {
        const binding = manifest.definitions.find(f => id(f) === condition.definition_id)?.runtime_binding as RuntimeFactBinding | undefined;
        if (!binding || condition.value !== true || (scene.requirements as Record<string, unknown> | undefined)?.requires_flag !== binding.key) add(row, `${scene.title} does not implement the calendar's fact condition.`);
      }
    }
  }
  return issues;
}
