"use client";

import { useStudio } from "./StudioContext";
import { TRACK_PALETTE, TRACK_LABELS, trackStyle } from "@/lib/trackPalette";

export function StudioSidebar() {
  const { trackFilter, setTrackFilter } = useStudio();

  return (
    <div className="sidebar">
      <div className="group">
        <h4>Tracks</h4>
        {TRACK_LABELS.map(({ key, label }) => {
          const active = trackFilter === key;
          return (
            <div
              key={key}
              className={`item${active ? " active" : ""}`}
              style={active ? undefined : trackStyle(key)}
              onClick={() => setTrackFilter(active ? null : key)}
            >
              <div
                className="swatch"
                style={{ background: TRACK_PALETTE[key].chip }}
              />
              <span>{label}</span>
            </div>
          );
        })}
        {trackFilter !== null && (
          <div
            className="item"
            onClick={() => setTrackFilter(null)}
            style={{ color: "var(--ink-3)", fontSize: "11px" }}
          >
            × Clear filter
          </div>
        )}
      </div>

      <div className="group">
        <h4>Playthroughs</h4>
        <div
          className="item"
          style={{ color: "var(--ink-4)", fontSize: "12px", cursor: "default" }}
        >
          Coming soon
        </div>
      </div>
    </div>
  );
}
