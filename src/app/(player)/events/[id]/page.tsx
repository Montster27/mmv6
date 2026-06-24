"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { useSession } from "@/contexts/SessionContext";
import {
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
import {
  computeRemainingSeconds,
  fetchEventDetailFull,
  moveMember,
  phaseLabel,
  resolveRound,
  startRound,
} from "@/lib/mpRounds";
import type { EventDetailFull, MpTransitState } from "@/types/mpRounds";
import type { PresentPlayer } from "@/types/mpAssignments";
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

// Seconds until a transit player arrives (client clock, display-only).
function transitEta(t: MpTransitState): number {
  return Math.max(0, Math.ceil((new Date(t.arrives_at).getTime() - Date.now()) / 1000));
}

function EventHeatmapContent({ eventId }: { eventId: string }) {
  const session = useSession();
  const token = session.access_token;

  const [detail, setDetail] = useState<EventDetailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Drives re-render for the live countdown and transit ETAs.
  const [, setTick] = useState(0);

  // Guards the lazy-expiry auto-resolve so only one call fires per round.
  const resolveTriggeredRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchEventDetailFull(token, eventId);
      setDetail(data);
      // Reset the expiry guard when the phase changes (new round).
      resolveTriggeredRef.current = false;
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

  // ─── Realtime subscription ────────────────────────────────────────
  // Subscribes to mp_event_locations and mp_event_rounds for this event.
  // Any INSERT/UPDATE/DELETE on either table triggers a full re-fetch so
  // all participants see board-state and phase changes without a manual
  // refresh. The supabaseBrowser anon client is authenticated via
  // setAuth so the server delivers postgres_changes events under RLS.
  useEffect(() => {
    supabaseBrowser.realtime.setAuth(token);

    const channel = supabaseBrowser
      .channel(`event-board-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mp_event_locations",
          filter: `event_id=eq.${eventId}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mp_event_rounds",
          filter: `event_id=eq.${eventId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [eventId, token, load]);

  // ─── Countdown tick ───────────────────────────────────────────────
  // Fires every second while the round is active. Drives the countdown
  // display and transit ETAs. The server owns actual expiry — this is
  // display-only.
  useEffect(() => {
    if (detail?.phase !== "active") return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [detail?.phase]);

  // ─── Lazy-expiry trigger ──────────────────────────────────────────
  // When the server-authoritative clock expires, any active client fires
  // POST .../round/resolve exactly once (the server's conditional UPDATE
  // guards against concurrent calls). Documented limitation: if no client
  // is active, the round only resolves when a client next connects.
  useEffect(() => {
    if (!detail?.is_expired || detail.phase !== "active") return;
    if (resolveTriggeredRef.current) return;
    resolveTriggeredRef.current = true;
    resolveRound(token, eventId).then(() => load()).catch((e) => {
      // 409 = already resolved by another client — not an error.
      if (!(e instanceof Error && e.message.includes("409"))) {
        console.error("[board] lazy-expiry resolve failed", e);
      }
    });
  }, [detail?.is_expired, detail?.phase, token, eventId, load]);

  // Countdown computed fresh on every render tick.
  const countdown =
    detail?.phase === "active"
      ? computeRemainingSeconds(
          detail.active_started_at,
          detail.round_duration_seconds
        )
      : null;

  // Run a mutation then refresh.
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

  // ─── Derived lookups ──────────────────────────────────────────────
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

  // Transit players by destination location.
  const transitByDest = useMemo(() => {
    const map = new Map<string, MpTransitState[]>();
    if (detail) {
      for (const t of detail.transit) {
        const list = map.get(t.to_location_id) ?? [];
        list.push(t);
        map.set(t.to_location_id, list);
      }
    }
    return map;
  }, [detail]);

  // Transit lookup by player (for roster panel).
  const transitByPlayer = useMemo(() => {
    const map = new Map<string, MpTransitState>();
    if (detail) {
      for (const t of detail.transit) map.set(t.player_id, t);
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

  // ─── Action handlers ─────────────────────────────────────────────

  const handleAssign = (locationId: string) => {
    if (!selectedMemberId) return;
    const playerId = selectedMemberId;
    setSelectedMemberId(null);
    if (detail.phase === "active") {
      // Active phase: coordinator move triggers transit lag.
      run(() =>
        moveMember(token, eventId, { player_id: playerId, to_location_id: locationId })
      );
    } else {
      // Planning (or other): immediate assignment.
      run(() =>
        assignMember(token, eventId, { location_id: locationId, player_id: playerId })
      );
    }
  };

  const handleUnassign = (playerId: string) =>
    run(() => unassignMember(token, eventId, { player_id: playerId }));
  const handleSelfSelect = (locationId: string) =>
    run(() => selfSelectLocation(token, eventId, { location_id: locationId }));
  const handleLeave = () => run(() => leaveLocation(token, eventId));
  const handleStartRound = () => run(() => startRound(token, eventId));
  const handleEndRound = () => run(() => resolveRound(token, eventId).then(() => ({})));

  // ─── Phase banner ─────────────────────────────────────────────────
  const escalationLoc =
    detail.phase === "planning" && detail.ai_last_escalation_location_id
      ? locationNameById.get(detail.ai_last_escalation_location_id) ?? null
      : null;

  const countdownDisplay =
    countdown !== null
      ? countdown > 0
        ? `${countdown}s remaining`
        : "Resolving…"
      : null;

  const phaseBanner = (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <span className="font-semibold">
        {phaseLabel(detail.phase)} · Round {detail.round_number}
      </span>
      {countdownDisplay ? (
        <span
          className={
            countdown !== null && countdown <= 10
              ? "font-mono text-red-600 font-bold"
              : "font-mono text-slate-600"
          }
        >
          {countdownDisplay}
        </span>
      ) : null}
      {detail.phase === "resolving" ? (
        <span className="text-slate-500 italic">Applying round results…</span>
      ) : null}
      {escalationLoc ? (
        <span className="text-red-700 italic">
          {escalationLoc} secured by opposition last round.
        </span>
      ) : null}
    </div>
  );

  // ─── Phase controls (above the grid) ─────────────────────────────
  const phaseControls = (() => {
    if (detail.phase === "planning") {
      if (isCoord) {
        return (
          <Button
            variant="default"
            size="sm"
            disabled={busy}
            onClick={handleStartRound}
          >
            Start round {detail.round_number}
          </Button>
        );
      }
      return (
        <p className="text-sm text-slate-500 italic">
          Waiting for coordinator to start round {detail.round_number}.
        </p>
      );
    }
    if (detail.phase === "active" && isCoord) {
      return (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={handleEndRound}
        >
          End round early
        </Button>
      );
    }
    return null;
  })();

  // ─── Self-select control on non-coordinator cards ─────────────────
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
    const incoming = transitByDest.get(loc.id) ?? [];

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
        {incoming.length > 0 ? (
          <ul className="space-y-0.5 text-xs text-amber-700 border-t border-amber-200 pt-1 mt-1">
            {incoming.map((t) => (
              <li key={t.player_id} className="flex items-center gap-1">
                <span className="font-mono">→</span>
                <span className="truncate">
                  {nameOf(t.display_name)} arriving in {transitEta(t)}s
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );

    // Coordinator mid-placement: every card is an assign/move target.
    if (isCoord && selectedMemberId) {
      const actionLabel =
        detail.phase === "active" ? "Move here (transit)" : "Place here";
      return (
        <button
          key={loc.id}
          type="button"
          disabled={busy}
          onClick={() => handleAssign(loc.id)}
          title={actionLabel}
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

  // ─── Coordinator roster side panel ───────────────────────────────
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
            const transit = transitByPlayer.get(m.player_id) ?? null;
            const current = m.current;
            const here = current
              ? locationNameById.get(current.location_id) ?? "a location"
              : null;
            const destName = transit
              ? locationNameById.get(transit.to_location_id) ?? "a location"
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
                      {transit
                        ? `→ ${destName} (${transitEta(transit)}s)`
                        : current
                        ? `${here} · ${assignmentSourceLabel(current.source)}`
                        : "Unassigned"}
                    </p>
                  </button>
                  {current && !transit ? (
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

      {phaseBanner}

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
            {phaseControls}
            {selectedMember ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <span>
                  {detail.phase === "active" ? "Moving" : "Placing"}{" "}
                  <strong>{nameOf(selectedMember.display_name)}</strong> — click
                  a location.
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
        <div className="space-y-4">
          {phaseControls}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detail.locations.map(renderCard)}
          </div>
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
