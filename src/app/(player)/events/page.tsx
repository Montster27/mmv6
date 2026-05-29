"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useSession } from "@/contexts/SessionContext";
import { fetchEvents } from "@/lib/mpEvents";
import type { MpEventListEntry, MpEventStatus } from "@/types/mpEvents";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE: Record<MpEventStatus, "info" | "success" | "default"> = {
  upcoming: "info",
  active: "success",
  resolved: "default",
};

export default function EventsIndexPage() {
  const session = useSession();
  const token = session.access_token;

  const [events, setEvents] = useState<MpEventListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchEvents(token);
      setEvents(res.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Events</h1>
        <p className="text-sm text-slate-600">
          Coordinated events happening on campus.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-500">No events yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((ev) => (
            <Link key={ev.id} href={`/events/${ev.id}`} className="block">
              <Card
                padding="lg"
                className="space-y-2 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{ev.name}</h2>
                  <Badge variant={STATUS_BADGE[ev.status]} size="label">
                    {ev.status}
                  </Badge>
                </div>
                {ev.description ? (
                  <p className="text-sm text-slate-600">{ev.description}</p>
                ) : null}
                <p className="text-xs text-slate-500">
                  Sponsored by {ev.sponsoring_club_name ?? "Unknown club"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
