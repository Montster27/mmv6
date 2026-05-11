// MISSING: track.shape is not in the DB schema — T-1778831000015
// Hardcoded until the migration lands.

export const TRACK_SHAPES: Record<string, string> = {
  roommate:    "accumulative + crystallizer",
  academic:    "gate-structured",
  money:       "gate-structured",
  belonging:   "accumulative",
  opportunity: "mixed",
  home:        "accumulative (sparse)",
};

export function shapeGlyph(shape: string): string {
  if (shape.includes("crystallizer")) return "▰▰▰▰▰▱▱▱◆";
  if (shape.includes("gate"))         return "▰▰┃▰▰┃▰▰┃◆";
  if (shape.includes("accumulative")) return "▰▱▰▱▰▱▰▱▰";
  return "▰▱▰▱◆";
}
