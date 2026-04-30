import type { NpcEntry } from "@/domain/npcs/registry";

export type NpcNameToken =
  | { kind: "text"; value: string }
  | { kind: "name"; value: string; color: string; npcId: string };

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;

function escapeForRegex(s: string): string {
  return s.replace(ESCAPE_REGEX, "\\$&");
}

export function tokenizeWithNpcNames(
  text: string,
  npcs: NpcEntry[]
): NpcNameToken[] {
  if (!text) return [];

  const colorable = npcs.filter(
    (n): n is NpcEntry & { display_color: string } =>
      typeof n.display_color === "string" && n.display_color.length > 0 && !n.is_ambiguous
  );
  if (colorable.length === 0) {
    return [{ kind: "text", value: text }];
  }

  const colorByName = new Map<string, { color: string; npcId: string }>();
  for (const n of colorable) {
    if (!colorByName.has(n.name)) {
      colorByName.set(n.name, { color: n.display_color, npcId: n.id });
    }
  }

  const sortedNames = [...colorByName.keys()].sort((a, b) => b.length - a.length);
  const alternation = sortedNames.map(escapeForRegex).join("|");
  const pattern = new RegExp(`\\b(?:${alternation})(?:'s)?\\b`, "g");

  const tokens: NpcNameToken[] = [];
  let lastIdx = 0;
  for (const match of text.matchAll(pattern)) {
    const fullMatch = match[0];
    const start = match.index ?? 0;
    if (start > lastIdx) {
      tokens.push({ kind: "text", value: text.slice(lastIdx, start) });
    }
    const baseName = fullMatch.endsWith("'s") ? fullMatch.slice(0, -2) : fullMatch;
    const info = colorByName.get(baseName);
    if (info) {
      tokens.push({
        kind: "name",
        value: fullMatch,
        color: info.color,
        npcId: info.npcId,
      });
    } else {
      tokens.push({ kind: "text", value: fullMatch });
    }
    lastIdx = start + fullMatch.length;
  }
  if (lastIdx < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIdx) });
  }
  return tokens;
}
