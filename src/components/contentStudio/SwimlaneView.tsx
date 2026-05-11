"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Storylet } from "@/types/storylets";
import type { ArcDefinitionRow } from "@/hooks/contentStudio/useArcsAPI";
import { TRACK_LABELS, TRACK_PALETTE, trackStyle, type TrackKey } from "@/lib/trackPalette";
import { TRACK_SHAPES, shapeGlyph } from "@/lib/trackShapes";
import { StoryletCard } from "./StoryletCard";
import { useStudio } from "./StudioContext";

// ── constants ─────────────────────────────────────────────────────────────────

const DAY_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

// ── TrackShapeCard ────────────────────────────────────────────────────────────

interface TrackShapeCardProps {
  trackKey: TrackKey;
  label: string;
  beatCount: number;
}

function TrackShapeCard({ trackKey, label, beatCount }: TrackShapeCardProps) {
  const shape = TRACK_SHAPES[trackKey] ?? "unknown";
  const glyph = shapeGlyph(shape);
  const p = TRACK_PALETTE[trackKey];

  return (
    <div
      style={{
        ...trackStyle(trackKey),
        background: "var(--track-soft)",
        border: "1px solid var(--track-line)",
        borderLeft: "3px solid var(--track-chip)",
        borderRadius: 6,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ fontWeight: 600, color: p.ink }}>{label}</div>
        <div style={{ fontSize: 10, color: p.ink, opacity: 0.6 }}>
          {beatCount} beat{beatCount !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 13, color: p.chip, marginTop: 4 }}>
        {glyph}
      </div>
      <div style={{ fontSize: 11, color: p.ink, opacity: 0.8, marginTop: 4 }}>
        {shape}
      </div>
    </div>
  );
}

// ── SwimlaneView ──────────────────────────────────────────────────────────────

interface SwimlaneViewProps {
  storylets: Storylet[];
  arcDefinitions: ArcDefinitionRow[];
  loading: boolean;
}

export function SwimlaneView({
  storylets,
  arcDefinitions,
  loading,
}: SwimlaneViewProps) {
  const router = useRouter();
  const { trackFilter } = useStudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const trackIdToKey = useMemo(
    () => buildTrackIdToKey(arcDefinitions),
    [arcDefinitions]
  );

  const activeStorylets = useMemo(
    () => storylets.filter((s) => s.is_active),
    [storylets]
  );

  const effectiveMaxDay = useMemo(() => {
    let m = 0;
    for (const s of activeStorylets) {
      const d = s.due_offset_days ?? 0;
      if (d > m) m = d;
    }
    return Math.max(m, 7);
  }, [activeStorylets]);

  const days = useMemo(
    () => Array.from({ length: effectiveMaxDay + 1 }, (_, i) => i),
    [effectiveMaxDay]
  );

  // Lanes: filter by sidebar trackFilter if set
  const lanes = trackFilter
    ? TRACK_LABELS.filter((t) => t.key === trackFilter)
    : TRACK_LABELS;

  function handleSelect(sl: Storylet) {
    setSelectedId(sl.id);
    router.push(`/studio/content/storylets?id=${sl.id}`);
  }

  function getCell(trackKey: TrackKey, day: number): Storylet[] {
    return activeStorylets.filter((s) => {
      const k = s.track_id ? (trackIdToKey[s.track_id] ?? null) : null;
      return k === trackKey && (s.due_offset_days ?? 0) === day;
    });
  }

  function beatCount(trackKey: TrackKey): number {
    return activeStorylets.filter((s) => {
      const k = s.track_id ? (trackIdToKey[s.track_id] ?? null) : null;
      return k === trackKey;
    }).length;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Canvas head */}
      <div className="canvas-head">
        <h2>Track Swimlane</h2>
        <span className="sub">
          {lanes.length} track{lanes.length !== 1 ? "s" : ""} · days 0–
          {effectiveMaxDay}
        </span>
        <div className="right">
          <button className="btn" disabled title="Export PNG — coming soon">
            Export ↓
          </button>
        </div>
      </div>

      {/* Scrollable swim area */}
      <div className="swim" style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "var(--ink-4)",
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : (
          <>
            <div
              className="swim-grid"
              style={{
                gridTemplateColumns: `80px repeat(${days.length}, minmax(120px, 1fr))`,
                gridTemplateRows: `40px repeat(${lanes.length}, auto)`,
              }}
            >
              {/* Corner */}
              <div className="corner">Track / Day</div>

              {/* Day headers */}
              {days.map((d) => (
                <div key={`h${d}`} className="day-head">
                  Day {d}
                  <div className="small">{DAY_OF_WEEK[d % 7]}</div>
                </div>
              ))}

              {/* Track lanes */}
              {lanes.map(({ key, label }) => (
                <Fragment key={key}>
                  <div className="lane-label" style={trackStyle(key)}>
                    {label}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 9,
                        color: "var(--track-ink)",
                        opacity: 0.6,
                        textTransform: "none",
                        letterSpacing: 0,
                        fontWeight: 400,
                      }}
                    >
                      {TRACK_SHAPES[key]}
                    </span>
                  </div>

                  {days.map((d) => {
                    const sls = getCell(key, d);
                    return (
                      <div
                        key={`${key}${d}`}
                        className={`lane-cell${d % 7 >= 5 ? " shaded" : ""}`}
                      >
                        {sls.map((sl) => (
                          <StoryletCard
                            key={sl.id}
                            storylet={sl}
                            trackKey={key}
                            selected={sl.id === selectedId}
                            onClick={() => handleSelect(sl)}
                            dense
                          />
                        ))}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>

            {/* TrackShapeCard legend */}
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {TRACK_LABELS.map(({ key, label }) => (
                <TrackShapeCard
                  key={key}
                  trackKey={key}
                  label={label}
                  beatCount={beatCount(key)}
                />
              ))}
            </div>

            <div style={{ height: 16 }} />
          </>
        )}
      </div>
    </div>
  );
}
