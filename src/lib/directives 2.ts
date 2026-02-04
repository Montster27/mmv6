import { supabase } from "@/lib/supabase/browser";
import { FACTION_KEYS } from "@/lib/factions";
import { computeWeekWindow, getOrComputeWorldWeeklyInfluence } from "@/lib/worldState";
import type { FactionDirective, FactionKey } from "@/types/factions";

type DirectiveTemplate = {
  title: string;
  description: string;
  target_type: "initiative";
  target_key: string;
};

export const DIRECTIVE_TEMPLATES: Record<FactionKey, DirectiveTemplate[]> = {
  neo_assyrian: [
    {
      title: "Quiet Accumulation",
      description: "This week, focus on collecting small signals. Your cohort’s discipline creates leverage.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Balance the Ledger",
      description: "Track every inconsistency. The cleanest advantage is the one that looks like accounting.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Pressure Without Noise",
      description: "Operate quietly and consistently. Power grows when attention fails to notice.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Convert Panic to Position",
      description: "Crises move assets. Record what shifts and who benefits.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Stability Under Stress",
      description: "Keep the ledger steady. The market respects the hand that doesn’t shake.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Controlled Disclosure",
      description: "Share only the signals that strengthen your position. Silence is an instrument.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
  ],
  dynastic_consortium: [
    {
      title: "Scholars in the Margins",
      description: "Gather small signals and annotate them. The archive grows by quiet effort.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Thread the Lattice",
      description: "Record inconsistencies and link them. Networks remember what regimes forget.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Measured Exchange",
      description: "Trade notes with care. Knowledge spreads best when it moves with obligation.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Quiet Patronage",
      description: "Support the record-keepers. The archive is a relay, not a broadcast.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Inheritance of Proof",
      description: "Catalog small divergences. Inheritance is built from evidence.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Long Memory",
      description: "Add one durable signal each day. Time rewards the meticulous.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
  ],
  templar_remnant: [
    {
      title: "Steel the Routine",
      description: "Repeat the watch until it becomes ritual. Discipline is the first shield.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Hold the Line",
      description: "Keep your signals consistent. Stability comes from shared resolve.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Measured Vigil",
      description: "Observe without drift. A clean record is a sign of clear purpose.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Doctrine of Care",
      description: "Protect the watch with steady participation. Duty is built in small acts.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Unbroken Chain",
      description: "Do not skip the signal. Each day is another link.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Order in the Margins",
      description: "Record what falters. The ritual clarifies what must be kept.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
  ],
  bormann_network: [
    {
      title: "Seal the Gaps",
      description: "Record the weak points and close them. Quiet containment prevents contagion.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Blackout Discipline",
      description: "Share only what is necessary. Silence is the safest perimeter.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Purge the Noise",
      description: "Filter the signals. Keep only what helps you identify the leak.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Containment First",
      description: "Small signals reveal weak seams. Map them and lock them down.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Unseen Enforcement",
      description: "Track the inconsistency without exposing yourself. The shadow keeps order.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
    {
      title: "Remove the Soft Link",
      description: "Record the fragile points. Strength follows excision.",
      target_type: "initiative",
      target_key: "campus_signal_watch",
    },
  ],
};

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function computeWeekStart(dayIndex: number) {
  return dayIndex - (dayIndex % 7);
}

export function computeWeekEnd(weekStartDayIndex: number) {
  return weekStartDayIndex + 6;
}

export function selectDirectiveTemplate(
  cohortId: string,
  weekStartDayIndex: number,
  factionKey: FactionKey
): DirectiveTemplate {
  const templates = DIRECTIVE_TEMPLATES[factionKey];
  const templateIndex =
    (hashString(cohortId) + weekStartDayIndex) % templates.length;
  return templates[templateIndex];
}

function topFactionFromInfluence(influence: Record<string, number>): FactionKey {
  let bestFaction: FactionKey = FACTION_KEYS[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  FACTION_KEYS.forEach((key) => {
    const score = influence[key] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestFaction = key;
    }
  });
  return bestFaction;
}

export function selectFactionWithBias(
  cohortId: string,
  weekStartDayIndex: number,
  worldInfluence: Record<string, number>
): FactionKey {
  const rotationFaction = FACTION_KEYS[weekStartDayIndex % FACTION_KEYS.length];
  const topFaction = topFactionFromInfluence(worldInfluence);
  const biasRoll = hashString(`${cohortId}${weekStartDayIndex}`) % 4;
  return biasRoll === 0 ? topFaction : rotationFaction;
}

async function pickDirectiveFaction(
  cohortId: string,
  weekStartDayIndex: number
): Promise<FactionKey> {
  const prevWeekStart = Math.max(0, weekStartDayIndex - 7);
  const { weekEnd } = computeWeekWindow(prevWeekStart);
  const influence = await getOrComputeWorldWeeklyInfluence(prevWeekStart, weekEnd).catch(
    () => ({})
  );
  return selectFactionWithBias(cohortId, weekStartDayIndex, influence);
}

export async function getOrCreateWeeklyDirective(
  cohortId: string,
  dayIndex: number,
  unlockedInitiativeKeys: string[] = []
): Promise<FactionDirective> {
  const weekStartDayIndex = computeWeekStart(dayIndex);
  const weekEndDayIndex = computeWeekEnd(weekStartDayIndex);
  const { data: existing, error: existingError } = await supabase
    .from("faction_directives")
    .select(
      "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
    )
    .eq("cohort_id", cohortId)
    .eq("week_start_day_index", weekStartDayIndex)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to fetch faction directive", existingError);
    throw new Error("Failed to fetch faction directive.");
  }

  if (existing) return existing;

  const factionKey = await pickDirectiveFaction(cohortId, weekStartDayIndex);
  const template = selectDirectiveTemplate(cohortId, weekStartDayIndex, factionKey);
  const availableKeys =
    unlockedInitiativeKeys.length > 0 ? unlockedInitiativeKeys : [template.target_key];
  const keyIndex =
    (hashString(`${cohortId}${factionKey}`) + weekStartDayIndex) %
    availableKeys.length;
  const targetKey = availableKeys[keyIndex];

  const { data: created, error: createError } = await supabase
    .from("faction_directives")
    .insert({
      cohort_id: cohortId,
      faction_key: factionKey,
      week_start_day_index: weekStartDayIndex,
      week_end_day_index: weekEndDayIndex,
      title: template.title,
      description: template.description,
      target_type: template.target_type,
      target_key: targetKey,
      status: "active",
    })
    .select(
      "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
    )
    .limit(1)
    .maybeSingle();

  if (createError) {
    if (createError.code === "23505") {
      const { data: retry } = await supabase
        .from("faction_directives")
        .select(
          "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
        )
        .eq("cohort_id", cohortId)
        .eq("week_start_day_index", weekStartDayIndex)
        .limit(1)
        .maybeSingle();
      if (retry) return retry;
    }
    const { data: retry } = await supabase
      .from("faction_directives")
      .select(
        "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
      )
      .eq("cohort_id", cohortId)
      .eq("week_start_day_index", weekStartDayIndex)
      .limit(1)
      .maybeSingle();
    if (retry) return retry;
    console.error("Failed to create faction directive", createError);
    throw new Error("Failed to create faction directive.");
  }

  if (!created) {
    throw new Error("Failed to create faction directive.");
  }

  return created;
}

export async function fetchStaleDirectiveForCohort(
  cohortId: string,
  dayIndex: number
): Promise<FactionDirective | null> {
  const { data, error } = await supabase
    .from("faction_directives")
    .select(
      "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
    )
    .eq("cohort_id", cohortId)
    .eq("status", "active")
    .lt("week_end_day_index", dayIndex)
    .order("week_end_day_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch stale directive", error);
    throw new Error("Failed to fetch stale directive.");
  }

  return data ?? null;
}

export async function updateDirectiveStatus(
  directiveId: string,
  status: "active" | "expired" | "completed"
): Promise<void> {
  const { data, error } = await supabase
    .from("faction_directives")
    .update({ status })
    .eq("id", directiveId)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to update directive", error);
    throw new Error("Failed to update directive.");
  }
  if (!data) {
    throw new Error("Failed to update directive.");
  }
}

export async function fetchActiveDirectiveForCohort(
  cohortId: string,
  dayIndex: number
): Promise<FactionDirective | null> {
  const { data, error } = await supabase
    .from("faction_directives")
    .select(
      "id,cohort_id,faction_key,week_start_day_index,week_end_day_index,title,description,target_type,target_key,status,created_at"
    )
    .eq("cohort_id", cohortId)
    .eq("status", "active")
    .lte("week_start_day_index", dayIndex)
    .gte("week_end_day_index", dayIndex)
    .order("week_start_day_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active directive", error);
    throw new Error("Failed to fetch active directive.");
  }

  return data ?? null;
}
