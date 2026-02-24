import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import {
  computeOfferTone,
  computeArcExpireDay,
  shouldOfferExpire,
} from "@/domain/arcs/engine";
import type {
  ArcDefinition,
  ArcInstance,
  ArcOffer,
  ArcStep,
  ChoiceLogEntry,
  DueStep,
  TodayArcState,
} from "@/domain/arcs/types";
import { applyResourceDelta } from "@/services/resources/resourceService";
import { getFeatureFlags } from "@/lib/featureFlags";
import { ARC_ONE_LAST_DAY } from "@/core/arcOne/constants";
import { mapArcTagsToOpportunity } from "@/core/arcOne/mapping";
import { appendExpired, fetchArcOneState, updateArcOneState } from "@/services/arcOne/state";
import type { ExpiredOpportunity } from "@/core/arcOne/types";

const DEFAULT_PROGRESS_SLOTS = 2;
const MAX_OFFERS_PER_DAY = 3;

function mergeExpired(
  current: ExpiredOpportunity[],
  additions: ExpiredOpportunity[]
) {
  const seen = new Set(current.map((item) => `${item.type}:${item.day_index}`));
  const filtered = additions.filter((item) => {
    const key = `${item.type}:${item.day_index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return appendExpired(current, filtered);
}

async function logChoice(entry: Omit<ChoiceLogEntry, "id">) {
  const { error } = await supabaseServer.from("choice_log").insert(entry);
  if (error) {
    console.error("Failed to write choice log", error);
  }
}

async function incrementDisposition(userId: string, tag: string, delta: number) {
  const { data, error } = await supabaseServer
    .from("player_dispositions")
    .select("id,hesitation")
    .eq("user_id", userId)
    .eq("tag", tag)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to load disposition", error);
    return;
  }
  if (!data) {
    const { error: insertError } = await supabaseServer.from("player_dispositions").insert({
      user_id: userId,
      tag,
      hesitation: Math.max(0, delta),
    });
    if (insertError) {
      console.error("Failed to insert disposition", insertError);
    }
    return;
  }
  const { error: updateError } = await supabaseServer
    .from("player_dispositions")
    .update({ hesitation: Math.max(0, data.hesitation + delta) })
    .eq("id", data.id);
  if (updateError) {
    console.error("Failed to update disposition", updateError);
  }
}

export async function getTodayArcState(params: {
  userId: string;
  currentDay: number;
  progressionSlotsTotal?: number;
}): Promise<TodayArcState> {
  const { userId, currentDay } = params;
  const featureFlags = getFeatureFlags();
  const arcOneMode =
    featureFlags.arcOneScarcityEnabled &&
    featureFlags.arcFirstEnabled &&
    currentDay <= ARC_ONE_LAST_DAY;
  const progressionSlotsTotal =
    params.progressionSlotsTotal ??
    (arcOneMode ? 3 : DEFAULT_PROGRESS_SLOTS);

  const { data: definitions, error: defError } = await supabaseServer
    .from("arc_definitions")
    .select("id,key,title,description,tags,is_enabled")
    .eq("is_enabled", true);
  if (defError) {
    console.error("Failed to load arc definitions", defError);
    throw new Error("Failed to load arcs.");
  }

  const arcDefs = (definitions ?? []) as ArcDefinition[];
  const defById = new Map(arcDefs.map((arc) => [arc.id, arc]));

  const { data: instances, error: instError } = await supabaseServer
    .from("arc_instances")
    .select(
      "id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason,branch_key"
    )
    .eq("user_id", userId)
    .eq("state", "ACTIVE");
  if (instError) {
    console.error("Failed to load arc instances", instError);
    throw new Error("Failed to load arc instances.");
  }

  const activeArcs = (instances ?? []) as ArcInstance[];
  const arcIds = Array.from(new Set(activeArcs.map((arc) => arc.arc_id)));
  const { data: steps, error: stepError } = await supabaseServer
    .from("arc_steps")
    .select(
      "id,arc_id,step_key,order_index,title,body,options,default_next_step_key,due_offset_days,expires_after_days"
    )
    .in("arc_id", arcIds.length ? arcIds : ["00000000-0000-0000-0000-000000000000"]);
  if (stepError) {
    console.error("Failed to load arc steps", stepError);
    throw new Error("Failed to load arc steps.");
  }

  const stepMap = new Map<string, ArcStep>();
  (steps ?? []).forEach((step) => {
    stepMap.set(`${step.arc_id}:${step.step_key}`, step as ArcStep);
  });

  const dueSteps: DueStep[] = [];

  for (const instance of activeArcs) {
    const step = stepMap.get(`${instance.arc_id}:${instance.current_step_key}`);
    if (!step) continue;
    const expiresOn = computeArcExpireDay(instance.step_due_day, step);
    if (currentDay > expiresOn) {
      await supabaseServer
        .from("arc_instances")
        .update({
          state: "ABANDONED",
          updated_day: currentDay,
          completed_day: currentDay,
          failure_reason: "expired",
        })
        .eq("id", instance.id)
        .eq("user_id", userId);

      await applyResourceDelta(
        userId,
        currentDay,
        { resources: { stress: 1 } },
        {
          source: "arc_expired_penalty",
          arcId: instance.arc_id,
          arcInstanceId: instance.id,
          stepKey: instance.current_step_key,
        }
      );

      await logChoice({
        user_id: userId,
        day: currentDay,
        event_type: "STEP_EXPIRED",
        arc_id: instance.arc_id,
        arc_instance_id: instance.id,
        step_key: instance.current_step_key,
        meta: { reason: "expired" },
      });

      await logChoice({
        user_id: userId,
        day: currentDay,
        event_type: "ARC_ABANDONED",
        arc_id: instance.arc_id,
        arc_instance_id: instance.id,
        step_key: instance.current_step_key,
        meta: {
          reason: "expired",
          branch_key: instance.branch_key ?? null,
          defer_count: instance.step_defer_count,
        },
      });

      const tags = defById.get(instance.arc_id)?.tags ?? [];
      for (const tag of tags) {
        await incrementDisposition(userId, tag, 1);
      }
      continue;
    }
    if (instance.step_due_day <= currentDay) {
      const arc = defById.get(instance.arc_id);
      if (arc) {
        dueSteps.push({ instance, step, arc, expires_on_day: expiresOn });
      }
    }
  }

  const { data: offers, error: offerError } = await supabaseServer
    .from("arc_offers")
    .select(
      "id,user_id,arc_id,offer_key,state,times_shown,tone_level,first_seen_day,last_seen_day,expires_on_day"
    )
    .eq("user_id", userId)
    .in("state", ["ACTIVE", "ACCEPTED", "DISMISSED", "EXPIRED"]);
  if (offerError) {
    console.error("Failed to load arc offers", offerError);
    throw new Error("Failed to load arc offers.");
  }

  const offerRows = (offers ?? []) as ArcOffer[];
  const offersByArc = new Map<string, ArcOffer[]>();
  offerRows.forEach((offer) => {
    if (!offersByArc.has(offer.arc_id)) offersByArc.set(offer.arc_id, []);
    offersByArc.get(offer.arc_id)?.push(offer);
  });

  const activeArcIds = new Set(activeArcs.map((arc) => arc.arc_id));

  for (const arc of arcDefs) {
    if (activeArcIds.has(arc.id)) continue;
    const existing = offersByArc.get(arc.id) ?? [];
    const hasActive = existing.some((offer) => offer.state === "ACTIVE");
    if (!hasActive) {
      const expiresOn = currentDay + 2;
      const { data: inserted, error: insertError } = await supabaseServer
        .from("arc_offers")
        .insert({
          user_id: userId,
          arc_id: arc.id,
          offer_key: "default",
          state: "ACTIVE",
          times_shown: 0,
          tone_level: 0,
          first_seen_day: currentDay,
          last_seen_day: currentDay,
          expires_on_day: expiresOn,
          updated_at: new Date().toISOString(),
        })
        .select(
          "id,user_id,arc_id,offer_key,state,times_shown,tone_level,first_seen_day,last_seen_day,expires_on_day"
        )
        .maybeSingle();
      if (insertError) {
        console.error("Failed to insert arc offer", insertError);
      } else if (inserted) {
        offerRows.push(inserted as ArcOffer);
        offersByArc.set(arc.id, [inserted as ArcOffer]);
      }
    }
  }

  const activeOffers = offerRows.filter((offer) => offer.state === "ACTIVE");
  let replay: Record<string, boolean> = {};
  if (arcOneMode) {
    const { data: replayRow } = await supabaseServer
      .from("daily_states")
      .select("replay_intention")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    replay = (replayRow?.replay_intention ?? {}) as Record<string, boolean>;
  }

  const toShow = activeOffers
    .map((offer) => {
      const arc = defById.get(offer.arc_id);
      const tags = arc?.tags ?? [];
      const lower = tags.map((tag) => tag.toLowerCase());
      let biasScore = 0;
      // TODO(arc-one): tune bias weights for replay intention.
      if (replay.risk_bias && lower.some((tag) => tag.includes("courage"))) {
        biasScore += 1;
      }
      if (
        replay.people_bias &&
        lower.some((tag) => tag.includes("belonging") || tag.includes("love"))
      ) {
        biasScore += 1;
      }
      if (
        replay.confront_bias &&
        lower.some((tag) => tag.includes("agency") || tag.includes("assert"))
      ) {
        biasScore += 1;
      }
      if (
        replay.achievement_bias &&
        lower.some((tag) => tag.includes("craft") || tag.includes("achievement"))
      ) {
        biasScore += 1;
      }
      return { offer, biasScore };
    })
    .sort((a, b) => {
      if (b.biasScore !== a.biasScore) return b.biasScore - a.biasScore;
      return a.offer.last_seen_day - b.offer.last_seen_day;
    })
    .slice(0, MAX_OFFERS_PER_DAY)
    .map((entry) => entry.offer);

  for (const offer of activeOffers) {
    if (shouldOfferExpire(currentDay, offer)) {
      await supabaseServer
        .from("arc_offers")
        .update({ state: "EXPIRED", updated_at: new Date().toISOString() })
        .eq("id", offer.id);
      await logChoice({
        user_id: userId,
        day: currentDay,
        event_type: "OFFER_EXPIRED",
        arc_id: offer.arc_id,
        offer_id: offer.id,
        meta: { tone_level: offer.tone_level },
      });
      continue;
    }

    const shouldShow = toShow.some((entry) => entry.id === offer.id);
    if (!shouldShow) continue;
    if (offer.last_seen_day === currentDay) continue;
    const nextTimes = offer.times_shown + 1;
    const nextTone = computeOfferTone(nextTimes);
    await supabaseServer
      .from("arc_offers")
      .update({
        times_shown: nextTimes,
        tone_level: nextTone,
        last_seen_day: currentDay,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer.id);
    await logChoice({
      user_id: userId,
      day: currentDay,
      event_type: "OFFER_SHOWN",
      arc_id: offer.arc_id,
      offer_id: offer.id,
      meta: { tone_level: nextTone },
    });
    offer.times_shown = nextTimes;
    offer.tone_level = nextTone;
    offer.last_seen_day = currentDay;
  }

  const { data: logRows, error: logError } = await supabaseServer
    .from("choice_log")
    .select("meta")
    .eq("user_id", userId)
    .eq("day", currentDay)
    .eq("event_type", "STEP_RESOLVED");
  if (logError) {
    console.error("Failed to load progression count", logError);
  }
  const progressionSlotsUsed = (logRows ?? []).reduce((sum, row) => {
    const meta = row?.meta as Record<string, unknown> | null;
    const cost = typeof meta?.time_cost === "number" ? meta.time_cost : 1;
    return sum + cost;
  }, 0);

  if (arcOneMode && progressionSlotsUsed >= progressionSlotsTotal) {
    const arcOneState = await fetchArcOneState(userId);
    if (arcOneState) {
      const expiredFromDue = dueSteps.map<ExpiredOpportunity>((due) => ({
        type: mapArcTagsToOpportunity(due.arc.tags ?? []),
        day_index: currentDay,
      }));
      const expiredFromOffers = activeOffers.map<ExpiredOpportunity>((offer) => ({
        type: mapArcTagsToOpportunity(defById.get(offer.arc_id)?.tags ?? []),
        day_index: currentDay,
      }));
      const merged = mergeExpired(
        arcOneState.expiredOpportunities,
        [...expiredFromDue, ...expiredFromOffers]
      );
      await updateArcOneState(userId, { expiredOpportunities: merged });
    }
  }

  const offersWithArc = toShow
    .map((offer) => {
      const arc = defById.get(offer.arc_id);
      if (!arc) return null;
      return { ...offer, arc };
    })
    .filter((offer): offer is ArcOffer & { arc: ArcDefinition } => Boolean(offer));

  const activeArcViews = activeArcs
    .map((instance) => {
      const arc = defById.get(instance.arc_id);
      if (!arc) return null;
      return { ...instance, arc };
    })
    .filter(
      (instance): instance is ArcInstance & { arc: ArcDefinition } =>
        Boolean(instance)
    );

  return {
    dueSteps,
    offers: offersWithArc,
    activeArcs: activeArcViews,
    progressionSlotsTotal,
    progressionSlotsUsed,
  };
}
