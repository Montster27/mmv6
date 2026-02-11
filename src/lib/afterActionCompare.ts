import { supabase } from "@/lib/supabase/browser";

export type CompareOption = {
  choice_id: string;
  count: number;
  percent: number;
};

export type CompareSnapshot = {
  options: CompareOption[];
  rationale: { text: string; handle: string } | null;
};

type PublicProfile = { user_id: string; display_name: string | null };

type StoryletRunRow = { user_id: string; choice_id: string };

type RationaleRow = {
  user_id: string;
  body: string;
  created_at: string;
};

function toHandle(userId: string, profileMap: Map<string, string | null>) {
  const raw = profileMap.get(userId);
  if (raw) {
    const trimmed = raw.trim();
    if (trimmed.length > 0 && !/\s/.test(trimmed)) return trimmed;
  }
  return `Handle ${userId.slice(0, 4)}`;
}

export async function fetchCompareSnapshot(params: {
  cohortId: string;
  storyletId: string;
  choiceIds: string[];
}): Promise<CompareSnapshot> {
  const { cohortId, storyletId, choiceIds } = params;

  const { data: members, error: memberError } = await supabase
    .from("cohort_members")
    .select("user_id")
    .eq("cohort_id", cohortId);

  if (memberError) {
    console.error("Failed to load cohort members", memberError);
    return { options: [], rationale: null };
  }

  const memberIds = (members ?? []).map((row) => row.user_id);
  if (memberIds.length === 0) return { options: [], rationale: null };

  const { data: runs, error: runError } = await supabase
    .from("storylet_runs")
    .select("user_id,choice_id")
    .eq("storylet_id", storyletId)
    .in("user_id", memberIds);

  if (runError) {
    console.error("Failed to load storylet runs", runError);
  }

  const total = (runs ?? []).length;
  const counts = (runs ?? []).reduce<Record<string, number>>((acc, row) => {
    if (!row.choice_id) return acc;
    acc[row.choice_id] = (acc[row.choice_id] ?? 0) + 1;
    return acc;
  }, {});

  const options = choiceIds.map((choiceId) => {
    const count = counts[choiceId] ?? 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { choice_id: choiceId, count, percent };
  });

  const { data: rationaleRows, error: rationaleError } = await supabase
    .from("storylet_rationales")
    .select("user_id,body,created_at")
    .eq("storylet_id", storyletId)
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (rationaleError) {
    console.error("Failed to load rationale", rationaleError);
  }

  const rationale = (rationaleRows ?? [])[0] as RationaleRow | undefined;
  if (!rationale) {
    return { options, rationale: null };
  }

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("user_id,display_name")
    .in("user_id", [rationale.user_id]);

  const profileMap = new Map(
    (profiles ?? []).map((row: PublicProfile) => [row.user_id, row.display_name])
  );

  return {
    options,
    rationale: {
      text: rationale.body,
      handle: toHandle(rationale.user_id, profileMap),
    },
  };
}

export async function submitRationale(params: {
  cohortId: string;
  userId: string;
  storyletId: string;
  choiceId: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const trimmed = params.body.trim().replace(/\s+/g, " ").slice(0, 160);
  if (!trimmed) return { ok: false, error: "Add a short note first." };

  const { data: latest } = await supabase
    .from("storylet_rationales")
    .select("created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.created_at) {
    const lastTime = new Date(latest.created_at).getTime();
    if (Date.now() - lastTime < 5 * 60 * 1000) {
      return { ok: false, error: "Try again in a few minutes." };
    }
  }

  const { error } = await supabase.from("storylet_rationales").insert({
    cohort_id: params.cohortId,
    user_id: params.userId,
    storylet_id: params.storyletId,
    choice_id: params.choiceId,
    body: trimmed,
  });

  if (error) {
    console.error("Failed to save rationale", error);
    return { ok: false, error: "Could not save note." };
  }

  return { ok: true };
}
