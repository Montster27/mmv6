import { supabase } from "@/lib/supabase/browser";

type TrackEventPayload = Record<string, unknown>;

type TrackEventParams = {
  event_type: string;
  day_index?: number;
  stage?: string;
  payload?: TrackEventPayload;
};

export async function trackEvent({
  event_type,
  day_index,
  stage,
  payload,
}: TrackEventParams): Promise<void> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Event tracking skipped: no user session.", userError);
      }
      return;
    }

    const { error } = await supabase.from("events").insert({
      user_id: user.id,
      day_index: day_index ?? null,
      event_type,
      stage: stage ?? null,
      payload: payload ?? {},
    });

    if (error && process.env.NODE_ENV !== "production") {
      console.warn("Failed to track event", error);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to track event", err);
    }
  }
}
