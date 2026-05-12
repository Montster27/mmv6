import type { CSSProperties } from "react";

export type TrackKey =
  | "roommate"
  | "academic"
  | "money"
  | "belonging"
  | "opportunity"
  | "home";

export interface TrackColor {
  ink: string;
  soft: string;
  line: string;
  chip: string;
  label: string;
}

export const TRACK_PALETTE: Record<TrackKey, TrackColor> = {
  roommate:    { ink: "#8a5a4a", soft: "#f3e6df", line: "#c9a796", chip: "#b07a64", label: "dusty"      },
  academic:    { ink: "#8a6a3a", soft: "#f3ead7", line: "#d2b483", chip: "#b48a4a", label: "clay"       },
  money:       { ink: "#4f7257", soft: "#e6efe5", line: "#a9c2a8", chip: "#6c9270", label: "sage"       },
  belonging:   { ink: "#6a4f7a", soft: "#ece4f1", line: "#bea7c9", chip: "#8a6f9b", label: "plum"       },
  opportunity: { ink: "#9a5430", soft: "#f6e4d3", line: "#dcae87", chip: "#bd6e3e", label: "ember"      },
  home:        { ink: "#536683", soft: "#e3e8f0", line: "#aebbd0", chip: "#6f81a0", label: "slate-blue" },
};

export const TRACK_LABELS: { key: TrackKey; label: string }[] = [
  { key: "roommate",    label: "Roommate"    },
  { key: "academic",   label: "Academic"    },
  { key: "money",      label: "Money"       },
  { key: "belonging",  label: "Belonging"   },
  { key: "opportunity",label: "Opportunity" },
  { key: "home",       label: "Home"        },
];

export function trackStyle(key: TrackKey | null | undefined): CSSProperties {
  if (!key || !(key in TRACK_PALETTE)) return {};
  const p = TRACK_PALETTE[key];
  return {
    "--track-ink":  p.ink,
    "--track-soft": p.soft,
    "--track-line": p.line,
    "--track-chip": p.chip,
  } as CSSProperties;
}
