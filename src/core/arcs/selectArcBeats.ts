import type {
  ArcInstance,
  ArcStep,
  ArcDefinition,
  DueStep,
} from "@/domain/arcs/types";

type SelectArcBeatsArgs = {
  dayIndex: number;
  instances: ArcInstance[];
  /**
   * Arc steps sourced from the unified storylets table.
   * Each step must have arc_id, step_key, due_offset_days, expires_after_days set.
   */
  steps: ArcStep[];
  arcs: ArcDefinition[];
  /** Maximum number of beats to return per day. Default: 2. */
  maxBeats?: number;
  /** Current day segment — if provided, filters beats by step.segment (null steps always pass). */
  currentSegment?: string;
  /**
   * Free hours remaining today. When < CONFLICT_THRESHOLD (4h), beats with
   * is_conflict=true bypass segment filtering and surface immediately.
   */
  hoursRemaining?: number;
};

/**
 * Return the arc step beats that are due (and not yet expired) for today.
 *
 * A beat is due when:
 *   instance.step_due_day <= dayIndex <= instance.step_due_day + step.expires_after_days
 *
 * Results are sorted most-urgent first (earliest expiry day) so that
 * beats about to expire are surfaced before fresh ones.
 */
/** Hours remaining threshold below which conflict beats bypass segment gating. */
const CONFLICT_THRESHOLD = 4;

export function selectArcBeats({
  dayIndex,
  instances,
  steps,
  arcs,
  maxBeats = 2,
  currentSegment,
  hoursRemaining,
}: SelectArcBeatsArgs): DueStep[] {
  const timeTight = typeof hoursRemaining === 'number' && hoursRemaining < CONFLICT_THRESHOLD;
  const arcMap = new Map(arcs.map((a) => [a.id, a]));

  // Build a lookup keyed by "arc_id:step_key" so we can retrieve the step
  // for whatever current_step_key the instance is pointing to.
  const stepByKey = new Map(
    steps.map((s) => [`${s.arc_id}:${s.step_key}`, s])
  );

  const due: DueStep[] = [];

  for (const instance of instances) {
    if (instance.state !== "ACTIVE") continue;

    const arc = arcMap.get(instance.arc_id);
    if (!arc || !arc.is_enabled) continue;

    const step = stepByKey.get(`${instance.arc_id}:${instance.current_step_key}`);
    if (!step) continue;

    const dueDay = instance.step_due_day;
    const expiresOnDay = dueDay + step.expires_after_days;

    if (dayIndex < dueDay || dayIndex > expiresOnDay) continue;

    // Conflict beats bypass segment gating when time budget is tight.
    const isConflict = Boolean((step as any).is_conflict);
    if (isConflict && timeTight) {
      // Conflict beats surface regardless of segment when time is tight.
    } else if (currentSegment && step.segment) {
      // Segment filter: beats with segment set only appear in their segment.
      // null/undefined segment = always available (backward compat).
      if (step.segment !== currentSegment) continue;
    }

    due.push({ instance, step, arc, expires_on_day: expiresOnDay });
  }

  // Most urgent (soonest to expire) first
  due.sort((a, b) => a.expires_on_day - b.expires_on_day);

  return due.slice(0, maxBeats);
}

/**
 * Build the arc_instances rows to insert when Arc One begins on day 1.
 * One instance per arc definition, all starting at day 1.
 * `step_due_day` = started_day + first_step.due_offset_days.
 */
export function buildInitialArcInstances(
  userId: string,
  arcs: ArcDefinition[],
  steps: ArcStep[],
  startedDay: number
): Array<{
  user_id: string;
  arc_id: string;
  state: "ACTIVE";
  current_step_key: string;
  step_due_day: number;
  step_defer_count: number;
  started_day: number;
  updated_day: number;
}> {
  const result = [];

  for (const arc of arcs) {
    // Find the first step (lowest order_index) for this arc
    const arcSteps = steps
      .filter((s) => s.arc_id === arc.id)
      .sort((a, b) => a.order_index - b.order_index);

    if (arcSteps.length === 0) continue;

    const firstStep = arcSteps[0];
    result.push({
      user_id: userId,
      arc_id: arc.id,
      state: "ACTIVE" as const,
      current_step_key: firstStep.step_key,
      step_due_day: startedDay + firstStep.due_offset_days,
      step_defer_count: 0,
      started_day: startedDay,
      updated_day: startedDay,
    });
  }

  return result;
}
