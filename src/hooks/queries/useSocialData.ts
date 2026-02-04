import { useQuery } from "@tanstack/react-query";
import {
  fetchPublicProfiles,
  fetchTodayReceivedBoosts,
  hasSentBoostToday,
} from "@/lib/social";

type PublicProfile = {
  user_id: string;
  display_name: string;
};

type ReceivedBoost = {
  from_user_id: string;
  [key: string]: unknown;
};

type SocialData = {
  publicProfiles: PublicProfile[];
  boostsReceived: ReceivedBoost[];
  hasSentBoost: boolean;
};

export function useSocialData(userId: string, dayIndex: number) {
  return useQuery<SocialData>({
    queryKey: ["social", userId, dayIndex],
    queryFn: async () => {
      const [publicProfiles, boostsReceived, hasSent] = await Promise.all([
        fetchPublicProfiles(userId),
        fetchTodayReceivedBoosts(userId, dayIndex),
        hasSentBoostToday(userId, dayIndex),
      ]);
      return {
        publicProfiles: publicProfiles as PublicProfile[],
        boostsReceived: boostsReceived as ReceivedBoost[],
        hasSentBoost: hasSent,
      };
    },
    enabled: !!userId && dayIndex > 0,
  });
}
