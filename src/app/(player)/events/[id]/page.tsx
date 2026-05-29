"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useSession } from "@/contexts/SessionContext";
import {
  fetchEventDetail,
  locationStateClasses,
  locationStateLabel,
  locationTypeLabel,
} from "@/lib/mpEvents";
import {
  assignMember,
  assignmentSourceLabel,
  leaveLocation,
  presenceCountLabel,
  selfSelectLocation,
  summarizePresence,
  unassignMember,
} from "@/lib/mpAssignments";
import type {
  EventDetailWithPresence,
  PresentPlayer,
} from "@/types/mpAssignments";
import type { MpEventLocation, MpEventStatus } from "@/types/mpEvents";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<MpEventStatus, "info" | "success" | "default"> = {
  upcoming: "info",
  active: "success",
  resolved: "default",
};

function nameOf(displayName: string | null): string {
  return displayName && displayName.length > 0 ? displayName : "Unnamed player";
}

function EventHeatmapContent({ eventId }: { eventId: string }) {
  const session = useSession();
  const token = session.access_token;

  const [detail, setDetail] = useState<EventDetailWithPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchEventDetail(token, eventId);
      setDetail(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load event.";
      if (message === "Event not found") setNotFound(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  // Run a mutation then refresh. Centralizes busy + error handling so the
  // individual handlers stay one-liners.
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const presenceByLoc = useMemo(() => {
    const map = new Map<string, PresentPlayer[]>();
    if (detail) {
      for (const lp of detail.presence) map.set(lp.location_id, lp.players);
    }
    return map;
  }, [detail]);

  const locationNameById = useMemo(() => {
    const map = new Map<string, string>();
    if (detail) {
      for (const loc of detail.locations) map.set(loc.id, loc.name);
    }
    return map;
  }, [detail]);

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading event…</p>;
  }
  if (notFound || !detail) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-slate-600">Event not found.</p>
        <Link href="/events" className="text-sm text-primary hover:underline">
          Back to events
        </Link>
      </div>
    );
  }

  const isCoord = detail.viewer_is_coordinator;
  const viewerLoc = detail.viewer_assignment?.location_id ?? null;
  const viewerSource = detail.viewer_assignment?.source ?? null;
  const selectedMember = isCoord
    ? detail.roster.find((m) => m.player_id === selectedMemberId) ?? null
    : null;

  const handleAssign = (locationId: string) => {
    if (!selectedMemberId) return;
    const playerId = selectedMemberId;
    setSelectedMemberId(null);
    run(() =>
      assignMember(token, eventId, {
        location_id: locationId,
        player_id: playerId,
      })
    );
  };
  const handleUnassign = (playerId: string) =>
    run(() => unassignMember(token, eventId, { player_id: playerId }));
  const handleSelfSelect = (locationId: string) =>
    run(() => selfSelectLocation(token, eventId, { location_id: locationId }));
  const handleLeave = () => run(() => leaveLocation(token, eventId));

  // The viewer-facing self-select control on a non-coordinator card. A
  // coordinator-placed viewer is locked everywhere (the coordinator owns the
  // placement); a self-selected viewer can stay/leave here and move elsewhere.
  const renderSelfSelect = (loc: MpEventLocation, isViewerHere: boolean) => {
    if (viewerSource === "coordinator") {
      return (
        <Button variant="secondary" size="sm" className="w-full" disabled>
          {isViewerHere ? "Coordinator placed you here" : "Coordinator placed you"}
        </Button>
      );
    }
    if (isViewerHere) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="success" size="label">
            You&rsquo;re here
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleLeave}
          >
            Leave
          </Button>
        </div>
      );
    }
    return (
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={busy}
        onClick={() => handleSelfSelect(loc.id)}
      >
        {viewerLoc ? "Move here" : "Show up here"}
      </Button>
    );
  };

  const renderCard = (loc: MpEventLocation) => {
    const players = presenceByLoc.get(loc.id) ?? [];
    const summary = summarizePresence(players);
    const isViewerHere = loc.id === viewerLoc;

    const inner = (
      <>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{loc.name}</h2>
          <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wider opacity-80">
            {locationTypeLabel(loc.location_type)}
          </span>
        </div>
        <p className="text-sm font-medium">{locationStateLabel(loc.state)}</p>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {presenceCountLabel(summary)}
        </p>
        {players.length > 0 ? (
          <ul className="space-y-0.5 text-xs">
            {players.map((p) => (
              <li
                key={p.player_id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{nameOf(p.display_name)}</span>
                <span className="shrink-0 opacity-70">
                  {assignmentSourceLabel(p.source)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );

    // Coordinator mid-placement: every card is an assign target.
    if (isCoord && selectedMemberId) {
      return (
        <button
          key={loc.id}
          type="button"
          disabled={busy}
          onClick={() => handleAssign(loc.id)}
          className={`${locationStateClasses(
            loc.state
          )} space-y-2 rounded border-2 px-5 py-5 text-left ring-2 ring-primary ring-offset-2 transition hover:brightness-105 disabled:opacity-60`}
        >
          {inner}
        </button>
      );
    }

    return (
      <Card
        key={loc.id}
        padding="lg"
        className={`${locationStateClasses(loc.state)} space-y-2 ${
          isViewerHere ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
      >
        {inner}
        {!isCoord ? renderSelfSelect(loc, isViewerHere) : null}
      </Card>
    );
  };

  const rosterAside = (
    <aside className="w-full shrink-0 space-y-3 lg:w-72">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Sponsoring club roster
      </h2>
      {detail.roster.length === 0 ? (
        <p className="text-sm text-slate-500">No club members yet.</p>
      ) : (
        <ul className="space-y-2">
          {detail.roster.map((m) => {
            const selected = m.player_id === selectedMemberId;
            const current = m.current;
            const here = current
              ? locationNameById.get(current.location_id) ?? "a location"
              : null;
            return (
              <li key={m.player_id}>
                <Card
                  padding="sm"
                  variant={selected ? "highlight" : "default"}
                  className="space-y-1"
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setSelectedMemberId(selected ? null : m.player_id)
                    }
                    className="w-full text-left disabled:opacity-60"
                  >
                    <p className="text-sm font-medium">
                      {nameOf(m.display_name)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {current
                        ? `${here} · ${assignmentSourceLabel(current.source)}`
                        : "Unassigned"}
                    </p>
                  </button>
                  {current ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleUnassign(m.player_id)}
                      className="h-7 w-full justify-start px-2 text-xs text-red-700 hover:bg-red-50"
                    >
                      Unassign
                    </Button>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link href="/events" className="text-sm text-slate-500 hover:underline">
          ← Events
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{detail.name}</h1>
          <Badge variant={STATUS_BADGE[detail.status]} size="label">
            {detail.status}
          </Badge>
          {isCoord ? (
            <Badge variant="navy" size="label">
              Coordinator
            </Badge>
          ) : null}
        </div>
        {detail.description ? (
          <p className="mt-1 text-sm text-slate-600">{detail.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          Sponsored by {detail.sponsoring_club_name ?? "Unknown club"}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {detail.locations.length === 0 ? (
        <p className="text-sm text-slate-500">No locations yet.</p>
      ) : isCoord ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          {rosterAside}
          <div className="flex-1 space-y-4">
            {selectedMember ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <span>
                  Placing <strong>{nameOf(selectedMember.display_name)}</strong>{" "}
                  — click a location.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setSelectedMemberId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {detail.locations.map(renderCard)}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {detail.locations.map(renderCard)}
        </div>
      )}
    </div>
  );
}

export default function EventHeatmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EventHeatmapContent eventId={id} />;
}
