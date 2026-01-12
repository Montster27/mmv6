import { supabase } from "@/lib/supabase/browser";
import type { Group, GroupFeedItem, GroupMember } from "@/types/groups";

export async function fetchMyGroupMembership(
  userId: string
): Promise<GroupMember | null> {
  const { data, error } = await supabase
    .from("group_members")
    .select("id,group_id,user_id,role,joined_at")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load group membership", error);
    return null;
  }
  return data ?? null;
}

export async function fetchGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("id,name,join_code,created_by,created_at")
    .eq("id", groupId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load group", error);
    return null;
  }
  return data ?? null;
}

export async function fetchGroupFeed(groupId: string): Promise<GroupFeedItem[]> {
  const { data, error } = await supabase
    .from("group_feed")
    .select("id,group_id,ts,event_type,actor_user_id,payload")
    .eq("group_id", groupId)
    .order("ts", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load group feed", error);
    return [];
  }
  return data ?? [];
}
