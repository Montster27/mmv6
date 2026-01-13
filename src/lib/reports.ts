import { supabase } from "@/lib/supabase/browser";

const MAX_DETAILS_LENGTH = 500;
const VALID_TARGETS = new Set(["clue", "hypothesis", "group"]);
const VALID_REASONS = new Set(["harassment", "spam", "other"]);

export function validateReportPayload(payload: {
  target_type: string;
  target_id: string;
  reason: string;
  details?: string;
}) {
  if (!VALID_TARGETS.has(payload.target_type)) {
    return "Invalid target type.";
  }
  if (!payload.target_id) {
    return "Missing target id.";
  }
  if (!VALID_REASONS.has(payload.reason)) {
    return "Invalid reason.";
  }
  if (payload.details && payload.details.length > MAX_DETAILS_LENGTH) {
    return "Details are too long.";
  }
  return null;
}

export async function submitReport(payload: {
  target_type: string;
  target_id: string;
  reason: string;
  details?: string;
}) {
  const validation = validateReportPayload(payload);
  if (validation) {
    throw new Error(validation);
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("No session found.");
  }
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to submit report.");
  }
  return true;
}
