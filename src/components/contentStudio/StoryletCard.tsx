"use client";

import { trackStyle, type TrackKey } from "@/lib/trackPalette";
import type { Storylet } from "@/types/storylets";

interface StoryletCardProps {
  storylet: Storylet;
  trackKey: TrackKey | null;
  selected?: boolean;
  onClick: () => void;
  dense?: boolean;
}

export function StoryletCard({
  storylet: sl,
  trackKey,
  selected,
  onClick,
  dense,
}: StoryletCardProps) {
  const isDraft = !sl.is_active;
  // stubs until follow-up tickets T-1778831000007 / T-1778831000009 / T-1778831000010 land
  const isCrystal = false;
  const isFriction = false;
  const hasMiss = false;

  const displayKey = sl.storylet_key ?? String(sl.id);

  const cls = [
    "sl-card",
    isDraft ? "draft" : "",
    isCrystal ? "crystallizer" : "",
    selected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={trackStyle(trackKey)}
      onClick={onClick}
      title={`${sl.title} · ${displayKey}`}
    >
      <div className="title">{sl.title}</div>
      {!dense && (
        <div className="meta">
          <span className="badge mono">{displayKey}</span>
          {sl.default_next_key != null && <span>chain</span>}
        </div>
      )}
      <div className="indicators">
        {isCrystal && <span className="ind crystal" title="Crystallizer" />}
        {isFriction && <span className="ind friction" title="Period friction" />}
        {hasMiss && <span className="ind miss" title="Miss path" />}
      </div>
    </div>
  );
}
