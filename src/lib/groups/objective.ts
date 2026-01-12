import { supabase } from "@/lib/supabase/browser";

export async function incrementGroupObjective(delta: number, reason?: string) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/groups/objective/increment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ delta, reason }),
    });
  } catch (e) {
    console.warn("Failed to increment group objective", e);
  }
}
