"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Storylet } from "@/types/storylets";
import type { ArcDefinitionRow } from "@/hooks/contentStudio/useArcsAPI";
import { TRACK_LABELS, type TrackKey } from "@/lib/trackPalette";
import { StoryletCard } from "./StoryletCard";
import { useStudio } from "./StudioContext";

// ── constants ─────────────────────────────────────────────────────────────────

const SEGMENTS = ["morning", "afternoon", "evening"] as const;
type Segment = (typeof SEGMENTS)[number];

const SEG_SHORT: Record<Segment, string> = {
  morning: "Morn",
  afternoon: "Aftn",
  evening: "Eve",
};

const DAY_SUBLABELS: Record<number, string> = {
  0: "Move-in",
  1: "Orient.",
  2: "Classes",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function buildTrackIdToKey(arcs: ArcDefinitionRow[]): Record<string, TrackKey> {
  const validKeys = TRACK_LABELS.map((t) => t.key);
  const map: Record<string, TrackKey> = {};
  for (const arc of arcs) {
    const match = validKeys.find((k) => k === arc.key || arc.key.includes(k));
    if (match) map[arc.id] = match;
  }
  return map;
}

// ── CollisionLegend ───────────────────────────────────────────────────────────

function CollisionLegend() {
  return (
    <div
      style={{
        margin: "16px 16px 0",
        padding: "10px 12px",
        background: "white",
        border: "1px solid var(--line)",
        borderRadius: 6,
        fontSize: 12,
        color: "var(--ink-3)",
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span
          style={{
            width: 12,
            height: 12,
            background: "linear-gradient(135deg, #fff 0%, #fff7ed 100%)",
            border: "1px solid var(--line)",
            display: "inline-block",
          }}
        />
        collision (≥2 competing)
      </span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--indigo)",
            display: "inline-block",
          }}
        />
        crystallizer
      </span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#f59e0b",
            display: "inline-block",
          }}
        />
        period friction
      </span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span
          style={{
            width: 16,
            height: 8,
            background:
              "repeating-linear-gradient(45deg, #fff 0 4px, #f1f5f9 4px 8px)",
            border: "1px solid var(--line)",
            display: "inline-block",
          }}
        />
        draft / inactive
      </span>
    </div>
  );
}

// ── StanceOverlay stub ────────────────────────────────────────────────────────

function StanceOverlay() {
  return (
    <div
      style={{
        margin: "8px 16px 0",
        padding: "8px 12px",
        background: "var(--soft)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        fontSize: 12,
        color: "var(--ink-4)",
      }}
    >
      Stance overlay — no playthrough data yet
    </div>
  );
}

// ── CalendarHead (shared controls) ───────────────────────────────────────────

interface CalendarHeadProps {
  unit: "day" | "week";
  setUnit: (u: "day" | "week") => void;
  showInactive: boolean;
  setShowInactive: (v: boolean) => void;
  maxDay: number;
  setMaxDay: (v: number) => void;
  count: number;
  effectiveMaxDay: number;
  showStance: boolean;
  setShowStance: (v: boolean) => void;
}

function CalendarHead({
  unit,
  setUnit,
  showInactive,
  setShowInactive,
  maxDay,
  setMaxDay,
  count,
  effectiveMaxDay,
  showStance,
  setShowStance,
}: CalendarHeadProps) {
  return (
    <div className="canvas-head">
      <h2>Collision Calendar</h2>
      <span className="sub">
        {count} storylet{count !== 1 ? "s" : ""} · days 0–{effectiveMaxDay}
      </span>

      <div className="seg">
        <button
          className={unit === "day" ? "active" : ""}
          onClick={() => setUnit("day")}
        >
          Day
        </button>
        <button
          className={unit === "week" ? "active" : ""}
          onClick={() => setUnit("week")}
        >
          Week
        </button>
      </div>

      <div className="right" style={{ gap: 12 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ink-3)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            style={{ width: "auto", padding: 0 }}
          />
          Inactive
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ink-3)",
            fontFamily: "inherit",
          }}
        >
          Days:
          <input
            type="number"
            min={1}
            max={30}
            value={maxDay}
            onChange={(e) => setMaxDay(Number(e.target.value) || 7)}
            style={{
              width: 48,
              padding: "2px 6px",
              fontSize: 12,
              border: "1px solid var(--line)",
              borderRadius: 4,
              background: "white",
              fontFamily: "inherit",
            }}
          />
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ink-3)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <input
            type="checkbox"
            checked={showStance}
            onChange={(e) => setShowStance(e.target.checked)}
            style={{ width: "auto", padding: 0 }}
          />
          Stance
        </label>
      </div>
    </div>
  );
}

// ── WeekCalendar ──────────────────────────────────────────────────────────────

interface WeekCalendarProps {
  days: number[];
  visibleStorylets: Storylet[];
  trackIdToKey: Record<string, TrackKey>;
  selectedId: string | null;
  onSelect: (sl: Storylet) => void;
}

function WeekCalendar({
  days,
  visibleStorylets,
  trackIdToKey,
  selectedId,
  onSelect,
}: WeekCalendarProps) {
  const weekCount = Math.ceil(days.length / 7);
  const weeks = Array.from({ length: weekCount }, (_, i) => i);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      {weeks.map((w) => {
        const wd = days.filter((d) => Math.floor(d / 7) === w);
        return (
          <div
            key={w}
            style={{
              background: "white",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".07em",
                color: "var(--ink-3)",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Week {w + 1} — Days {wd[0]}–{wd[wd.length - 1]}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${wd.length}, 1fr)`,
                gap: 8,
              }}
            >
              {wd.map((d) => {
                const sls = visibleStorylets.filter(
                  (s) => (s.due_offset_days ?? 0) === d
                );
                return (
                  <div
                    key={d}
                    style={{ borderRight: "1px solid var(--line)", paddingRight: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      Day {d}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {sls.map((sl) => (
                        <StoryletCard
                          key={sl.id}
                          storylet={sl}
                          trackKey={
                            sl.track_id ? (trackIdToKey[sl.track_id] ?? null) : null
                          }
                          selected={sl.id === selectedId}
                          onClick={() => onSelect(sl)}
                          dense
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CalendarView (main export) ────────────────────────────────────────────────

interface CalendarViewProps {
  storylets: Storylet[];
  arcDefinitions: ArcDefinitionRow[];
  loading: boolean;
}

export function CalendarView({
  storylets,
  arcDefinitions,
  loading,
}: CalendarViewProps) {
  const router = useRouter();
  const { trackFilter } = useStudio();

  const [unit, setUnit] = useState<"day" | "week">("day");
  const [showInactive, setShowInactive] = useState(false);
  const [maxDay, setMaxDay] = useState(7);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStance, setShowStance] = useState(false);

  const trackIdToKey = useMemo(
    () => buildTrackIdToKey(arcDefinitions),
    [arcDefinitions]
  );

  const visibleStorylets = useMemo(() => {
    let list = showInactive ? storylets : storylets.filter((s) => s.is_active);
    if (trackFilter) {
      list = list.filter((s) => {
        const k = s.track_id ? (trackIdToKey[s.track_id] ?? null) : null;
        return k === trackFilter;
      });
    }
    return list;
  }, [storylets, showInactive, trackFilter, trackIdToKey]);

  const effectiveMaxDay = useMemo(() => {
    let m = 0;
    for (const s of visibleStorylets) {
      const d = s.due_offset_days ?? 0;
      if (d > m) m = d;
    }
    return Math.max(maxDay, m, 3);
  }, [visibleStorylets, maxDay]);

  const days = useMemo(
    () => Array.from({ length: effectiveMaxDay + 1 }, (_, i) => i),
    [effectiveMaxDay]
  );

  function handleSelect(sl: Storylet) {
    setSelectedId(sl.id);
    router.push(`/studio/content/storylets?id=${sl.id}`);
  }

  const headProps = {
    unit,
    setUnit,
    showInactive,
    setShowInactive,
    maxDay,
    setMaxDay,
    count: visibleStorylets.length,
    effectiveMaxDay,
    showStance,
    setShowStance,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <CalendarHead {...headProps} />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-4)",
            fontSize: 13,
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  // ── Week view ──────────────────────────────────────────────────────────────
  if (unit === "week") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <CalendarHead {...headProps} />
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <WeekCalendar
            days={days}
            visibleStorylets={visibleStorylets}
            trackIdToKey={trackIdToKey}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <CollisionLegend />
          {showStance && <StanceOverlay />}
          <div style={{ height: 16 }} />
        </div>
      </div>
    );
  }

  // ── Day view ───────────────────────────────────────────────────────────────
  const colCount = days.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <CalendarHead {...headProps} />

      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <div
          className="calendar-grid"
          style={{
            gridTemplateColumns: `90px repeat(${colCount}, minmax(100px, 1fr))`,
          }}
        >
          {/* Corner */}
          <div
            className="row-head"
            style={{ position: "sticky", left: 0, top: 0, zIndex: 6 }}
          />

          {/* Day column headers */}
          {days.map((d) => (
            <div
              key={`h${d}`}
              className={`col-head${d % 7 >= 5 ? " weekend" : ""}`}
            >
              <div className="day">Day {d}</div>
              {DAY_SUBLABELS[d] && <div>{DAY_SUBLABELS[d]}</div>}
            </div>
          ))}

          {/* Segment rows */}
          {SEGMENTS.map((seg) => (
            <Fragment key={seg}>
              <div className="row-head">{SEG_SHORT[seg]}</div>
              {days.map((d) => {
                const sls = visibleStorylets.filter(
                  (s) =>
                    (s.due_offset_days ?? 0) === d &&
                    (s.segment ?? "morning") === seg
                );
                const collide = sls.length >= 2;

                return (
                  <div
                    key={`${seg}${d}`}
                    className={`cell${collide ? " collide" : ""}`}
                  >
                    {sls.map((sl) => (
                      <StoryletCard
                        key={sl.id}
                        storylet={sl}
                        trackKey={
                          sl.track_id
                            ? (trackIdToKey[sl.track_id] ?? null)
                            : null
                        }
                        selected={sl.id === selectedId}
                        onClick={() => handleSelect(sl)}
                      />
                    ))}
                    {sls.length === 0 && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--ink-4)",
                          fontStyle: "italic",
                        }}
                      >
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>

        <CollisionLegend />
        {showStance && <StanceOverlay />}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
