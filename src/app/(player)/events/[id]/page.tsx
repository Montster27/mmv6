"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { useSession } from "@/contexts/SessionContext";
import { EXPOSURE_TIERS, exposureTier } from "@/lib/mpEvents";
import {
  assignMember,
  assignmentSourceLabel,
  leaveLocation,
  selfSelectLocation,
  summarizePresence,
  unassignMember,
} from "@/lib/mpAssignments";
import {
  computeRemainingSeconds,
  fetchEventDetailFull,
  moveMember,
  resolveRound,
  startRound,
} from "@/lib/mpRounds";
import {
  MERCHANT_ROW_LOCATION_ID,
  fetchEncounter,
  runEncounter,
} from "@/lib/mpEncounters";
import type { EventDetailFull, MpTransitState } from "@/types/mpRounds";
import type { PresentPlayer } from "@/types/mpAssignments";
import type { MpEventLocation, MpEventLocationState } from "@/types/mpEvents";
import type { EncounterResult, EncounterView } from "@/types/mpEncounters";

import s from "./mp.module.css";

// ─── State color/tone mapping (Signal 2 — contention) ────────────────
const STATE_META: Record<
  MpEventLocationState,
  { color: string; tone: string; label: string }
> = {
  won:         { color: "hsl(145 52% 30%)",  tone: "#dcebdd", label: "With you"  },
  leaning_yes: { color: "hsl(145 38% 46%)",  tone: "#e6efe5", label: "Warming"   },
  contested:   { color: "hsl(43 70% 48%)",   tone: "#f3ead7", label: "Contested" },
  leaning_no:  { color: "hsl(14 60% 52%)",   tone: "#f6e0d6", label: "Cooling"   },
  lost:        { color: "hsl(14 73% 46%)",   tone: "#f6dad3", label: "Against"   },
};

function shortCode(name: string): string {
  const words = name.replace(/^The\s+/i, "").split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0]! + words[1]![0]!).toUpperCase();
}

function avatarColor(id: string): string {
  const palette = ["#6b7a99", "#a8763e", "#4f7257", "#8a6f9b", "#9a5430", "#536683", "#b07a64"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return palette[Math.abs(h) % palette.length]!;
}

function nameOf(displayName: string | null): string {
  return displayName && displayName.length > 0 ? displayName : "Unnamed player";
}

function transitEta(t: MpTransitState): number {
  return Math.max(0, Math.ceil((new Date(t.arrives_at).getTime() - Date.now()) / 1000));
}

// ─── Drift glyph ──────────────────────────────────────────────────────
function Drift({ d, roster = false }: { d: number; roster?: boolean }) {
  const base = roster ? s.rosterDrift : s.drift;
  if (d > 0) return <span className={`${base} ${s.driftUp}`}>▲</span>;
  if (d < 0) return <span className={`${base} ${s.driftDown}`}>▼</span>;
  return <span className={`${base} ${s.driftFlat}`}>—</span>;
}

// ─── Round dots ──────────────────────────────────────────────────────
function RoundDots({ current, total = 5 }: { current: number; total?: number }) {
  return (
    <span className={s.rounddots}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const cls = n < current ? "done" : n === current ? "now" : "";
        return <i key={n} className={cls} />;
      })}
    </span>
  );
}

// ─── Encounter panel ──────────────────────────────────────────────────
function EncounterPanel({
  token,
  eventId,
  roundNumber,
}: {
  token: string;
  eventId: string;
  roundNumber: number;
}) {
  const [view, setView] = useState<EncounterView | null>(null);
  const [runResult, setRunResult] = useState<EncounterResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setRunResult(null);
    setErr(null);
    fetchEncounter(token, eventId, MERCHANT_ROW_LOCATION_ID)
      .then(setView)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load encounter."));
  }, [token, eventId, roundNumber]);

  const handleRun = async (optionId: string) => {
    setBusy(true);
    setErr(null);
    try {
      const result = await runEncounter(token, eventId, MERCHANT_ROW_LOCATION_ID, {
        option_id: optionId,
      });
      setRunResult(result);
      setView((v) => (v ? { ...v, already_run_this_round: true } : v));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!view && !err) {
    return (
      <p className="mt-2 text-xs italic" style={{ color: "hsl(var(--muted-foreground))" }}>
        Loading encounter…
      </p>
    );
  }

  const displayRun =
    runResult ?? (view?.my_run ?? null);

  // Gauge position: against=10%, holds=50%, toward=85%
  const gaugePos =
    displayRun === null
      ? null
      : displayRun.pressure_contribution > 0
      ? "85%"
      : displayRun.pressure_contribution < 0
      ? "10%"
      : "50%";

  const gaugeBg =
    gaugePos === "85%"
      ? "hsl(145 52% 30%)"
      : gaugePos === "10%"
      ? "hsl(14 73% 46%)"
      : "hsl(43 70% 48%)";

  return (
    <div className={`${s.encWrap} ${s.fadeIn}`}>
      <div className={s.encCard}>
        {view ? (
          <>
            <div className={s.secLabel}>
              <span className={s.secLabelText}>Constituency encounter</span>
              <span className={s.secLabelLn}></span>
            </div>

            <blockquote className={s.objection}>
              {view.game.objection_text}
            </blockquote>

            {view.insight_unlocked && view.game.insight_text ? (
              <div className={s.insight}>
                <div className={s.insightMarker}>Skill insight</div>
                <p>{view.game.insight_text}</p>
              </div>
            ) : null}

            {displayRun ? (
              <>
                <div
                  className={`${s.resolveBox} ${
                    displayRun.pressure_contribution > 0 ? s.resolvePos : s.resolveNeg
                  }`}
                >
                  <p>{displayRun.resolved_text}</p>
                </div>
                <div className={s.felt}>
                  <div className={s.feltCap}>How it landed</div>
                  <div className={s.gauge}>
                    <div className={s.gaugeRail}></div>
                    <div className={s.gaugeTicks}>
                      <span>against</span>
                      <span>holds</span>
                      <span>toward</span>
                    </div>
                    <div
                      className={s.gaugeDot}
                      style={{ left: gaugePos ?? "50%", background: gaugeBg }}
                    />
                  </div>
                  <p className={s.feltRead}>
                    {displayRun.pressure_contribution > 0
                      ? "They shifted. Something you said opened a door."
                      : displayRun.pressure_contribution < 0
                      ? "It landed wrong. You confirmed the concern they already had."
                      : "No movement. They heard you out. Nothing changed."}
                  </p>
                </div>
              </>
            ) : (
              <div className={s.options}>
                {view.options_with_skill.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={view.already_run_this_round || busy}
                    onClick={() => handleRun(opt.id)}
                    className={s.option}
                  >
                    <span>{opt.label}</span>
                    {opt.body ? (
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          marginTop: 4,
                          opacity: 0.75,
                        }}
                      >
                        {opt.body}
                      </span>
                    ) : null}
                    {opt.skill_key ? (
                      <span className={s.optionKnack}>
                        {opt.has_skill ? "✓ " : ""}
                        {opt.skill_key.replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : null}

        {err ? <p className={s.errorBanner}>{err}</p> : null}
      </div>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────
function EventHeatmapContent({ eventId }: { eventId: string }) {
  const session = useSession();
  const token = session.access_token;

  const [detail, setDetail] = useState<EventDetailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [, setTick] = useState(0);
  const resolveTriggeredRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchEventDetailFull(token, eventId);
      setDetail(data);
      resolveTriggeredRef.current = false;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load event.";
      if (message === "Event not found") setNotFound(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    supabaseBrowser.realtime.setAuth(token);
    const channel = supabaseBrowser
      .channel(`event-board-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mp_event_locations", filter: `event_id=eq.${eventId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "mp_event_rounds",    filter: `event_id=eq.${eventId}` }, () => load())
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [eventId, token, load]);

  // Countdown tick
  useEffect(() => {
    if (detail?.phase !== "active") return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [detail?.phase]);

  // Lazy-expiry trigger
  useEffect(() => {
    if (!detail?.is_expired || detail.phase !== "active") return;
    if (resolveTriggeredRef.current) return;
    resolveTriggeredRef.current = true;
    resolveRound(token, eventId)
      .then(() => load())
      .catch((e) => {
        if (!(e instanceof Error && e.message.includes("409"))) {
          console.error("[board] lazy-expiry resolve failed", e);
        }
      });
  }, [detail?.is_expired, detail?.phase, token, eventId, load]);

  const countdown =
    detail?.phase === "active"
      ? computeRemainingSeconds(detail.active_started_at, detail.round_duration_seconds)
      : null;

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

  // Derived lookups
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

  const transitByPlayer = useMemo(() => {
    const map = new Map<string, MpTransitState>();
    if (detail) {
      for (const t of detail.transit) map.set(t.player_id, t);
    }
    return map;
  }, [detail]);

  // Tally for standing bar
  const tally = useMemo(() => {
    if (!detail) return { ours: 0, theirs: 0, neutral: 0, total: 0 };
    const locs = detail.locations;
    return {
      ours:    locs.filter((l) => l.state === "won" || l.state === "leaning_yes").length,
      theirs:  locs.filter((l) => l.state === "lost" || l.state === "leaning_no").length,
      neutral: locs.filter((l) => l.state === "contested").length,
      total:   locs.length,
    };
  }, [detail]);

  if (loading) {
    return (
      <div className={s.root}>
        <p style={{ padding: "24px", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
          Loading event…
        </p>
      </div>
    );
  }
  if (notFound || !detail) {
    return (
      <div className={s.root} style={{ padding: 24 }}>
        <p style={{ fontSize: 13 }}>Event not found.</p>
        <Link href="/events" style={{ fontSize: 13, textDecoration: "underline" }}>
          ← Back to events
        </Link>
      </div>
    );
  }

  const isCoord       = detail.viewer_is_coordinator;
  const viewerLoc     = detail.viewer_assignment?.location_id ?? null;
  const viewerSource  = detail.viewer_assignment?.source ?? null;
  const selectedLoc   = selectedLocId
    ? detail.locations.find((l) => l.id === selectedLocId) ?? null
    : null;
  const selectedMember = isCoord
    ? detail.roster.find((m) => m.player_id === selectedMemberId) ?? null
    : null;

  // Exposure
  const exposure    = detail.viewer_exposure ?? 0;
  const tier        = exposureTier(exposure);

  // Countdown display
  const countdownDisplay =
    countdown !== null
      ? countdown > 0
        ? `${countdown}s`
        : "Resolving…"
      : null;

  // Escalation location name
  const escalationLoc =
    detail.phase === "planning" && detail.ai_last_escalation_location_id
      ? locationNameById.get(detail.ai_last_escalation_location_id) ?? null
      : null;

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleSpotClick = (locId: string) => {
    if (isCoord && selectedMemberId) {
      // Assign mode — click a spot to place the selected member
      const playerId = selectedMemberId;
      setSelectedMemberId(null);
      setSelectedLocId(null);
      if (detail.phase === "active") {
        run(() => moveMember(token, eventId, { player_id: playerId, to_location_id: locId }));
      } else {
        run(() => assignMember(token, eventId, { location_id: locId, player_id: playerId }));
      }
    } else {
      setSelectedLocId((prev) => (prev === locId ? null : locId));
    }
  };

  const handleSelfSelect = (locationId: string) =>
    run(() => selfSelectLocation(token, eventId, { location_id: locationId }));
  const handleLeave       = () => run(() => leaveLocation(token, eventId));
  const handleUnassign    = (playerId: string) =>
    run(() => unassignMember(token, eventId, { player_id: playerId }));
  const handleStartRound  = () => run(() => startRound(token, eventId));
  const handleEndRound    = () => run(() => resolveRound(token, eventId).then(() => ({})));

  // ─── Render ───────────────────────────────────────────────────────────
  const showEncounter =
    viewerLoc === MERCHANT_ROW_LOCATION_ID &&
    detail.phase === "active";

  return (
    <div className={s.root}>
      {/* ── GAMEBAR ─────────────────────────────────────────────── */}
      <div className={s.gamebar}>
        <div className={s.logo}>
          <span className={s.crest}></span>
          {detail.name}
        </div>

        <div className={s.spacer}></div>

        {/* Clock + round */}
        <div className={s.clock}>
          <span className={s.clockRound}>Round {detail.round_number}</span>
          <span className={s.pip}></span>
          <RoundDots current={detail.round_number} />
          {countdownDisplay ? (
            <span
              style={
                countdown !== null && countdown <= 10
                  ? { color: "hsl(14 73% 75%)", fontWeight: 700 }
                  : undefined
              }
            >
              {countdownDisplay}
            </span>
          ) : null}
        </div>

        {/* Signal 1 — exposure meter */}
        <div className={s.exposure}>
          <span className={s.exposureLbl}>Exposure</span>
          <div className={s.meter}>
            <span style={{ width: `${exposure}%`, background: tier.glow }} />
          </div>
          <span className={s.tierLabel} style={{ color: tier.glow }}>
            {tier.label}
          </span>
          <span className={s.emberDot} style={{ background: tier.glow }} />
        </div>

        {/* Phase controls */}
        {detail.phase === "planning" && isCoord ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleStartRound}
            className={s.phasePrimary}
          >
            Start round {detail.round_number}
          </button>
        ) : detail.phase === "active" && isCoord ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleEndRound}
            className={s.phaseOutline}
          >
            End round early
          </button>
        ) : detail.phase === "planning" ? (
          <span
            style={{
              fontSize: 11,
              color: "hsl(42 47% 96% / .55)",
              fontStyle: "italic",
              fontFamily: "var(--font-space-mono, monospace)",
            }}
          >
            Waiting for coordinator…
          </span>
        ) : null}
      </div>

      {/* ── STAGE ───────────────────────────────────────────────── */}
      <div className={s.stage}>
        {error ? <div className={s.errorBanner}>{error}</div> : null}
        {escalationLoc ? (
          <p className={`${s.escalationNote} ${s.fadeIn}`} style={{ marginBottom: 12 }}>
            {escalationLoc} secured by opposition last round.
          </p>
        ) : null}

        <div className={s.boardGrid}>
          {/* ── LEFT: MAP ─────────────────────────────────────── */}
          <div className={s.mapWrap}>
            <div className={s.map}>
              <div className={s.mapTitle}>
                <div className={s.mapTitleName}>Harwick University</div>
                <div className={s.mapTitleSub}>
                  Constituency map · {detail.phase === "active" ? "Round active" : "Planning"}
                </div>
              </div>

              <div className={s.quadShape}></div>

              {detail.locations.map((loc) => {
                if (loc.map_x === null || loc.map_y === null) return null;
                const players     = presenceByLoc.get(loc.id) ?? [];
                const meta        = STATE_META[loc.state];
                const isViewerHere = loc.id === viewerLoc;
                const drift        = loc.split - loc.prev_split;
                const knife        = Math.abs(loc.split - 50) <= 6 && drift <= 0;
                const incoming     = transitByDest.get(loc.id) ?? [];
                const isSelected   = loc.id === selectedLocId;
                const isAssignTarget = isCoord && !!selectedMemberId;

                const spotCls = [
                  s.spot,
                  loc.lane === "risk"   ? s.spotRisk     : "",
                  knife                 ? s.spotKnife    : "",
                  isSelected            ? s.spotSelected : "",
                  isAssignTarget        ? s.spotRisk     : "", // ring hint when assigning
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={loc.id}
                    className={spotCls}
                    style={{
                      left: `${loc.map_x}%`,
                      top: `${loc.map_y}%`,
                      "--spot-color": meta.color,
                      "--spot-tone": meta.tone,
                    } as React.CSSProperties}
                    onClick={() => handleSpotClick(loc.id)}
                    title={isAssignTarget ? `Place here (${loc.name})` : loc.name}
                  >
                    {/* Flag label above */}
                    <div className={s.flag}>
                      {loc.name}
                      <span className={s.flagSt}>{meta.label}</span>
                      <div className={s.contend}>
                        <span className={s.tugmini}>
                          <span
                            className={s.tugOurs}
                            style={{ width: `${loc.split}%` }}
                          />
                        </span>
                        <Drift d={drift} />
                      </div>
                    </div>

                    {/* Pin */}
                    <div className={s.pin}>{shortCode(loc.name)}</div>

                    {/* Risk heat badge */}
                    {loc.lane === "risk" ? (
                      <div className={s.heat} title="Risk lane — exposure cost">!</div>
                    ) : null}

                    {/* You-are-here */}
                    {isViewerHere ? <div className={s.youHere}>★</div> : null}

                    {/* Clubmate avatars */}
                    {players.length > 0 ? (
                      <div className={s.who}>
                        {players.slice(0, 3).map((p) => (
                          <div
                            key={p.player_id}
                            className={s.ava}
                            style={{ background: avatarColor(p.player_id) }}
                            title={nameOf(p.display_name)}
                          >
                            {nameOf(p.display_name)[0]?.toUpperCase() ?? "?"}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Transit incoming */}
                    {incoming.length > 0 ? (
                      <div className={s.transitList} style={{ position: "absolute", top: "110%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                        {incoming.map((t) => (
                          <span key={t.player_id}>→{nameOf(t.display_name)[0]} {transitEta(t)}s</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Legend */}
              <div className={s.mapLegend}>
                <span className={s.lgItem}>
                  <span className={s.lgSwatch} style={{ background: "hsl(145 52% 30%)" }} />
                  with you
                </span>
                <span className={s.lgItem}>
                  <span className={s.lgSwatch} style={{ background: "hsl(43 70% 48%)" }} />
                  contested
                </span>
                <span className={s.lgItem}>
                  <span className={s.lgSwatch} style={{ background: "hsl(14 73% 46%)" }} />
                  against
                </span>
              </div>
            </div>

            {/* ── Placement banner ───────────────────────────── */}
            {isCoord && selectedMember ? (
              <div className={s.placeBanner}>
                <span>
                  {detail.phase === "active" ? "Moving" : "Placing"}{" "}
                  <strong>{nameOf(selectedMember.display_name)}</strong> — click a pin.
                </span>
                <button
                  type="button"
                  className={s.placeBannerCancel}
                  onClick={() => setSelectedMemberId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {/* ── Self-select action for selected spot ────────── */}
            {selectedLoc && !isCoord ? (
              <div className={s.placeBanner} style={{ marginTop: 8 }}>
                <span>
                  <strong>{selectedLoc.name}</strong>
                  {selectedLoc.blurb ? ` — ${selectedLoc.blurb}` : ""}
                </span>
                {viewerSource === "coordinator" ? (
                  <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
                    Coordinator placed you
                  </span>
                ) : selectedLoc.id === viewerLoc ? (
                  <button
                    type="button"
                    className={s.placeBannerCancel}
                    disabled={busy}
                    onClick={handleLeave}
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    type="button"
                    className={s.phasePrimary}
                    style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                    disabled={busy}
                    onClick={() => handleSelfSelect(selectedLoc.id)}
                  >
                    {viewerLoc ? "Move here" : "Show up here"}
                  </button>
                )}
              </div>
            ) : null}

            {/* ── Encounter panel ─────────────────────────────── */}
            {showEncounter ? (
              <EncounterPanel
                token={token}
                eventId={eventId}
                roundNumber={detail.round_number}
              />
            ) : null}
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────── */}
          <div>
            {/* Standing */}
            <div className={s.panel}>
              <div className={s.panelH}>
                <span
                  style={{
                    fontFamily: "var(--font-playfair, Georgia, serif)",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  Standing
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-space-mono, monospace)",
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {tally.ours}/{tally.total}
                </span>
              </div>
              <div className={s.standing}>
                <div className={s.standingRow}>
                  <span style={{ fontSize: 12, color: "hsl(145 52% 30%)" }}>With you</span>
                  <span style={{ fontSize: 12, color: "hsl(14 73% 46%)" }}>Against</span>
                </div>
                <div className={s.tug}>
                  <div className={s.tugOursBar}   style={{ width: `${(tally.ours    / tally.total) * 100}%` }} />
                  <div className={s.tugNeutral}    style={{ width: `${(tally.neutral / tally.total) * 100}%` }} />
                  <div className={s.tugTheirsBar}  style={{ width: `${(tally.theirs  / tally.total) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Constituency list */}
            <div className={s.panel}>
              <div className={s.panelH}>
                <span
                  style={{
                    fontFamily: "var(--font-space-mono, monospace)",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  Constituencies
                </span>
              </div>
              <div className={s.clist}>
                {detail.locations.map((loc) => {
                  const meta  = STATE_META[loc.state];
                  const drift = loc.split - loc.prev_split;
                  const isSel = loc.id === selectedLocId;

                  return (
                    <div
                      key={loc.id}
                      className={`${s.crow} ${isSel ? s.crowSel : ""}`}
                      onClick={() =>
                        setSelectedLocId((prev) => (prev === loc.id ? null : loc.id))
                      }
                    >
                      <span className={s.crowDot} style={{ background: meta.color }} />
                      <span className={s.crowNm}>
                        {loc.name}
                        {loc.kind ? (
                          <span className={s.crowKind} style={{ display: "block" }}>
                            {loc.kind}
                          </span>
                        ) : null}
                      </span>
                      {loc.lane === "risk" ? (
                        <span className={s.riskTag}>risk</span>
                      ) : null}
                      <span className={s.tugcell}>
                        <div className={`${s.tugcell} rosterTugmini`} style={{ height: 5, borderRadius: 999, overflow: "hidden", display: "flex", background: "hsl(14 60% 82%)" }}>
                          <span style={{ background: "hsl(145 52% 36%)", height: "100%", display: "block", width: `${loc.split}%` }} />
                        </div>
                      </span>
                      <Drift d={drift} roster />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coordinator roster panel */}
            {isCoord ? (
              <div className={s.panel}>
                <div className={s.panelH}>
                  <span
                    style={{
                      fontFamily: "var(--font-space-mono, monospace)",
                      fontSize: 10,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Club roster
                  </span>
                </div>
                <div className={s.rosterAside}>
                  {detail.roster.map((m) => {
                    const selected  = m.player_id === selectedMemberId;
                    const transit   = transitByPlayer.get(m.player_id) ?? null;
                    const current   = m.current;
                    const here      = current
                      ? locationNameById.get(current.location_id) ?? "a location"
                      : null;
                    const destName  = transit
                      ? locationNameById.get(transit.to_location_id) ?? "a location"
                      : null;

                    return (
                      <div
                        key={m.player_id}
                        className={`${s.rosterRow} ${selected ? s.rosterRowSel : ""}`}
                        onClick={() =>
                          setSelectedMemberId(selected ? null : m.player_id)
                        }
                      >
                        <div
                          className={s.ava}
                          style={{ background: avatarColor(m.player_id), flexShrink: 0 }}
                        >
                          {nameOf(m.display_name)[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className={s.rosterRowName}>{nameOf(m.display_name)}</div>
                          <div className={s.rosterRowMeta}>
                            {transit
                              ? `→ ${destName} (${transitEta(transit)}s)`
                              : current
                              ? `${here} · ${assignmentSourceLabel(current.source)}`
                              : "Unassigned"}
                          </div>
                        </div>
                        {current && !transit ? (
                          <button
                            type="button"
                            className={s.rosterUnassign}
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnassign(m.player_id);
                            }}
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
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
