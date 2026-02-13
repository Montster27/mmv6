import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/featureFlags";

const DEFAULT_COHORT_CAP = 30;
const ROOKIE_COHORT_CAP = 5;

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function ensureAuthed(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  return getUserFromToken(token);
}

export async function POST(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const userId = user.id;
  const featureFlags = getFeatureFlags();
  const useRookieCap =
    featureFlags.rookieCircleEnabled || featureFlags.verticalSlice30Enabled;
  const cohortCap = useRookieCap ? ROOKIE_COHORT_CAP : DEFAULT_COHORT_CAP;

  // Check if user already has a cohort (using service role bypasses RLS)
  const { data: existing, error: existingError } = await supabaseServer
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check existing cohort membership", existingError);
    return NextResponse.json(
      { error: "Failed to check cohort membership" },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json({ cohortId: existing.cohort_id });
  }

  // Find an active cohort with capacity
  let cohortId: string | null = null;

  const { data: candidate, error: candidateError } = await supabaseServer
    .from("cohorts")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (candidateError) {
    console.error("Failed to find cohort", candidateError);
  }

  if (candidate?.id) {
    // Count members in this cohort (service role can count all)
    const { count, error: countError } = await supabaseServer
      .from("cohort_members")
      .select("cohort_id", { count: "exact", head: true })
      .eq("cohort_id", candidate.id);

    if (countError) {
      console.error("Failed to count cohort members", countError);
    }

    if (count !== null && count < cohortCap) {
      cohortId = candidate.id;
    }
  }

  // Create new cohort if needed
  if (!cohortId) {
    const { data: created, error: createError } = await supabaseServer
      .from("cohorts")
      .insert({})
      .select("id")
      .limit(1)
      .maybeSingle();

    if (createError) {
      console.error("Failed to create cohort", createError);
      return NextResponse.json(
        { error: "Failed to create cohort" },
        { status: 500 }
      );
    }

    cohortId = created?.id ?? null;
  }

  if (!cohortId) {
    return NextResponse.json(
      { error: "Unable to assign cohort" },
      { status: 500 }
    );
  }

  // Insert user into cohort (use upsert to handle race conditions)
  const { error: insertError } = await supabaseServer
    .from("cohort_members")
    .upsert(
      { cohort_id: cohortId, user_id: userId },
      { onConflict: "cohort_id,user_id", ignoreDuplicates: true }
    );

  if (insertError) {
    // If it's a duplicate key error (409), the user is already in a cohort
    // Re-fetch their actual cohort
    if (insertError.code === "23505") {
      const { data: refetch } = await supabaseServer
        .from("cohort_members")
        .select("cohort_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (refetch) {
        return NextResponse.json({ cohortId: refetch.cohort_id });
      }
    }

    console.error("Failed to join cohort", insertError);
    return NextResponse.json(
      { error: "Failed to join cohort" },
      { status: 500 }
    );
  }

  return NextResponse.json({ cohortId });
}
