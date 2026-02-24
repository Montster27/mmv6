import { supabase } from "@/lib/supabase/browser";

export async function sendTesterFeedback(params: {
  dayIndex: number;
  context: Record<string, unknown>;
  message: string;
}): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No session found.");

  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to send feedback.");
  }
}
