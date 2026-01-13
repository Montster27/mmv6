"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/browser";

type AssignmentMap = Record<string, string>;

async function fetchAssignments(token: string): Promise<AssignmentMap> {
  const res = await fetch("/api/experiments/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return {};
  const json = await res.json();
  return json.assignments ?? {};
}

async function ensureAssignment(token: string, experimentId: string) {
  const res = await fetch("/api/experiments/ensure", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ experiment_id: experimentId }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.variant as string | null;
}

export function useExperiments(
  required: string[] = [],
  initialAssignments?: AssignmentMap
) {
  const requiredKey = required.join("|");
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setReady(false);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (alive) setReady(true);
        return;
      }
      let nextAssignments = initialAssignments ?? {};
      if (!Object.keys(nextAssignments).length) {
        nextAssignments = await fetchAssignments(token);
      }
      for (const expId of required) {
        if (!nextAssignments[expId]) {
          const variant = await ensureAssignment(token, expId);
          if (variant) {
            nextAssignments = { ...nextAssignments, [expId]: variant };
          }
        }
      }
      if (alive) {
        setAssignments(nextAssignments);
        setReady(true);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [requiredKey, initialAssignments]);

  const getVariant = (id: string, fallback = "A") =>
    assignments[id] ?? fallback;

  return { assignments, ready, getVariant };
}
