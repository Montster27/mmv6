import { supabase } from "@/lib/supabase/browser";

export async function appendGroupFeedEvent(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  try {
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (memberError || !membership?.group_id) {
      return;
    }

    await supabase.from("group_feed").insert({
      group_id: membership.group_id,
      event_type: eventType,
      actor_user_id: userId,
      payload,
    });
  } catch (e) {
    console.warn("Failed to append group feed event", e);
  }
}
