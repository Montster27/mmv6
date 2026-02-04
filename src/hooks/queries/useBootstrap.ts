import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/browser";

type BootstrapData = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  experiments: Record<string, string>;
};

export function useBootstrap() {
  return useQuery<BootstrapData>({
    queryKey: ["bootstrap"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No session");

      const res = await fetch("/api/bootstrap", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Bootstrap failed");
      const json = await res.json();
      return {
        userId: json.userId,
        email: json.email ?? null,
        isAdmin: json.isAdmin ?? false,
        experiments: json.experiments ?? {},
      };
    },
    staleTime: Infinity,
  });
}
