import { supabase } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/events";
import type {
  AskOfferPost,
  AskOfferReply,
  AskOfferReaction,
  AskOfferPostView,
} from "@/types/askOffer";

type PublicProfile = { user_id: string; display_name: string | null };

type CohortBoardResult = {
  posts: AskOfferPostView[];
};

const POST_LIMIT = 20;
const POST_MAX = 160;
const REPLY_MAX = 120;
const COOLDOWN_MINUTES = 5;

function toHandle(userId: string, profileMap: Map<string, string | null>) {
  const raw = profileMap.get(userId);
  if (raw) {
    const trimmed = raw.trim();
    if (trimmed.length > 0 && !/\s/.test(trimmed)) {
      return trimmed;
    }
  }
  return `Handle ${userId.slice(0, 4)}`;
}

function normalizeText(input: string, max: number) {
  return input.trim().replace(/\s+/g, " ").slice(0, max);
}

export async function fetchCohortBoard(
  cohortId: string,
  userId: string
): Promise<CohortBoardResult> {
  const { data: posts, error: postError } = await supabase
    .from("cohort_posts")
    .select("id,cohort_id,user_id,post_type,body,created_at")
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: false })
    .limit(POST_LIMIT);

  if (postError) {
    console.error("Failed to fetch cohort posts", postError);
    return { posts: [] };
  }

  const postRows = (posts ?? []) as AskOfferPost[];
  if (postRows.length === 0) return { posts: [] };

  const postIds = postRows.map((row) => row.id);
  const userIds = new Set(postRows.map((row) => row.user_id));

  const [repliesRes, reactionsRes] = await Promise.all([
    supabase
      .from("cohort_post_replies")
      .select("id,post_id,user_id,template_key,body,created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("cohort_post_reactions")
      .select("id,post_id,user_id,reaction,created_at")
      .in("post_id", postIds)
      .eq("reaction", "helpful"),
  ]);

  if (repliesRes.data) {
    repliesRes.data.forEach((row) => userIds.add(row.user_id));
  }

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("user_id,display_name")
    .in("user_id", Array.from(userIds));

  const profileMap = new Map(
    (profiles ?? []).map((row: PublicProfile) => [row.user_id, row.display_name])
  );

  const replies = (repliesRes.data ?? []) as AskOfferReply[];
  const reactions = (reactionsRes.data ?? []) as AskOfferReaction[];

  const repliesByPost = replies.reduce<Record<string, AskOfferReply[]>>(
    (acc, reply) => {
      acc[reply.post_id] = acc[reply.post_id] ?? [];
      acc[reply.post_id].push(reply);
      return acc;
    },
    {}
  );

  const helpfulCounts = reactions.reduce<Record<string, number>>(
    (acc, reaction) => {
      acc[reaction.post_id] = (acc[reaction.post_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const helpfulGiven = reactions.reduce<Record<string, boolean>>(
    (acc, reaction) => {
      if (reaction.user_id === userId) {
        acc[reaction.post_id] = true;
      }
      return acc;
    },
    {}
  );

  const views: AskOfferPostView[] = postRows.map((post) => {
    const replyViews = (repliesByPost[post.id] ?? []).map((reply) => ({
      id: reply.id,
      template_key: reply.template_key,
      body: reply.body,
      created_at: reply.created_at,
      author_handle: toHandle(reply.user_id, profileMap),
    }));

    return {
      id: post.id,
      post_type: post.post_type,
      body: post.body,
      created_at: post.created_at,
      author_handle: toHandle(post.user_id, profileMap),
      helpful_count: helpfulCounts[post.id] ?? 0,
      helpful_given: helpfulGiven[post.id] ?? false,
      replies: replyViews,
    };
  });

  return { posts: views };
}

export async function createCohortPost(params: {
  cohortId: string;
  userId: string;
  postType: "ask" | "offer";
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const body = normalizeText(params.body, POST_MAX);
  if (!body) return { ok: false, error: "Write a short message." };

  const { data: latest } = await supabase
    .from("cohort_posts")
    .select("created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.created_at) {
    const lastTime = new Date(latest.created_at).getTime();
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
    if (Date.now() - lastTime < cooldownMs) {
      return { ok: false, error: "Try again in a few minutes." };
    }
  }

  const { data, error } = await supabase
    .from("cohort_posts")
    .insert({
      cohort_id: params.cohortId,
      user_id: params.userId,
      post_type: params.postType,
      body,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to create cohort post", error);
    return { ok: false, error: "Could not post right now." };
  }

  trackEvent({
    event_type: "community_post_created",
    payload: { cohort_id: params.cohortId, post_id: data?.id ?? null },
  });

  return { ok: true };
}

export async function sendCohortReply(params: {
  postId: string;
  userId: string;
  templateKey: string;
  body?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const body = params.body ? normalizeText(params.body, REPLY_MAX) : null;

  const { data, error } = await supabase
    .from("cohort_post_replies")
    .insert({
      post_id: params.postId,
      user_id: params.userId,
      template_key: params.templateKey,
      body: body && body.length > 0 ? body : null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to send cohort reply", error);
    return { ok: false, error: "Could not send reply." };
  }

  trackEvent({
    event_type: "community_reply_sent",
    payload: { post_id: params.postId, reply_id: data?.id ?? null },
  });

  return { ok: true };
}

export async function markPostHelpful(params: {
  postId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("cohort_post_reactions").upsert(
    {
      post_id: params.postId,
      user_id: params.userId,
      reaction: "helpful",
    },
    { onConflict: "post_id,user_id,reaction" }
  );

  if (error) {
    console.error("Failed to mark post helpful", error);
    return { ok: false, error: "Could not record reaction." };
  }

  trackEvent({
    event_type: "community_helpful_given",
    payload: { post_id: params.postId },
  });

  return { ok: true };
}
