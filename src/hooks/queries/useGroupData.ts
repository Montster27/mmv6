import { useQuery } from "@tanstack/react-query";
import {
  fetchGroup,
  fetchGroupFeed,
  fetchMyGroupMembership,
} from "@/lib/groups";
import { fetchUserAnomalies, fetchAnomaliesByIds } from "@/lib/anomalies";
import type { Anomaly } from "@/types/anomalies";
import type { Group, GroupFeedItem } from "@/types/groups";

type ProfileRow = { id: string; display_name: string | null };
type ObjectiveRow = {
  week_key: string;
  objective_type: string;
  target: number;
  progress: number;
  completed: boolean;
};

type GroupData = {
  group: Group | null;
  feed: GroupFeedItem[];
  members: ProfileRow[];
  objectives: ObjectiveRow[];
  userAnomalyIds: string[];
  anomalyCatalog: Record<string, Anomaly>;
  joinCode: string;
};

export function useGroupFeedData(userId: string, accessToken: string) {
  return useQuery<GroupData | null>({
    queryKey: ["group-feed", userId],
    queryFn: async () => {
      const membership = await fetchMyGroupMembership(userId);
      if (!membership) return null;

      const [group, feed] = await Promise.all([
        fetchGroup(membership.group_id),
        fetchGroupFeed(membership.group_id),
      ]);

      const memberRes = await fetch(
        `/api/groups/members?group_id=${membership.group_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const memberJson = memberRes.ok ? await memberRes.json() : { members: [] };

      const objRes = await fetch(
        `/api/groups/objectives?group_id=${membership.group_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const objJson = objRes.ok ? await objRes.json() : { objectives: [] };

      const userAnomalies = await fetchUserAnomalies(userId);
      const userAnomalyIds = userAnomalies.map((a) => a.anomaly_id);
      const anomalies = await fetchAnomaliesByIds(userAnomalyIds);
      const anomalyCatalog = anomalies.reduce<Record<string, Anomaly>>(
        (acc, item) => {
          acc[item.id] = item;
          return acc;
        },
        {}
      );

      return {
        group,
        feed,
        members: memberJson.members ?? [],
        objectives: objJson.objectives ?? [],
        userAnomalyIds,
        anomalyCatalog,
        joinCode: group?.join_code ?? "",
      };
    },
    enabled: !!userId,
  });
}
