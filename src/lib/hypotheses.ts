import { supabase } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/events";
import type { Hypothesis, HypothesisAnomaly } from "@/types/hypotheses";

export async function listHypotheses(userId: string): Promise<Hypothesis[]> {
  const { data, error } = await supabase
    .from("hypotheses")
    .select("id,user_id,title,body,status,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to list hypotheses", error);
    return [];
  }

  return data ?? [];
}

export async function getHypothesis(id: string): Promise<Hypothesis | null> {
  const { data, error } = await supabase
    .from("hypotheses")
    .select("id,user_id,title,body,status,created_at,updated_at")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load hypothesis", error);
    return null;
  }

  return data ?? null;
}

export async function createHypothesis(payload: {
  userId: string;
  title: string;
  body: string;
}): Promise<Hypothesis | null> {
  const { data, error } = await supabase
    .from("hypotheses")
    .insert({
      user_id: payload.userId,
      title: payload.title,
      body: payload.body,
      status: "active",
    })
    .select("id,user_id,title,body,status,created_at,updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to create hypothesis", error);
    return null;
  }

  trackEvent({
    event_type: "hypothesis_created",
    payload: { hypothesis_id: data?.id },
  });

  return data ?? null;
}

export async function updateHypothesis(
  id: string,
  payload: {
    title?: string;
    body?: string;
    status?: "active" | "archived";
  }
): Promise<boolean> {
  const { error } = await supabase
    .from("hypotheses")
    .update({
      title: payload.title,
      body: payload.body,
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update hypothesis", error);
    return false;
  }

  trackEvent({
    event_type: "hypothesis_updated",
    payload: { hypothesis_id: id },
  });

  return true;
}

export async function listHypothesisAnomalies(
  hypothesisId: string
): Promise<HypothesisAnomaly[]> {
  const { data, error } = await supabase
    .from("hypothesis_anomalies")
    .select("hypothesis_id,anomaly_id")
    .eq("hypothesis_id", hypothesisId);

  if (error) {
    console.error("Failed to list hypothesis anomalies", error);
    return [];
  }

  return data ?? [];
}

export async function linkAnomaly(
  hypothesisId: string,
  anomalyId: string
): Promise<boolean> {
  const { error } = await supabase.from("hypothesis_anomalies").insert({
    hypothesis_id: hypothesisId,
    anomaly_id: anomalyId,
  });

  if (error) {
    const { data: existing } = await supabase
      .from("hypothesis_anomalies")
      .select("id")
      .eq("hypothesis_id", hypothesisId)
      .eq("anomaly_id", anomalyId)
      .limit(1)
      .maybeSingle();
    if (existing) return false;
    console.error("Failed to link anomaly", error);
    return false;
  }

  trackEvent({
    event_type: "hypothesis_linked_anomaly",
    payload: { hypothesis_id: hypothesisId, anomaly_id: anomalyId },
  });

  return true;
}

export async function unlinkAnomaly(
  hypothesisId: string,
  anomalyId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("hypothesis_anomalies")
    .delete()
    .eq("hypothesis_id", hypothesisId)
    .eq("anomaly_id", anomalyId);

  if (error) {
    console.error("Failed to unlink anomaly", error);
    return false;
  }

  trackEvent({
    event_type: "hypothesis_unlinked_anomaly",
    payload: { hypothesis_id: hypothesisId, anomaly_id: anomalyId },
  });

  return true;
}
