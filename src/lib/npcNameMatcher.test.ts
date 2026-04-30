import { describe, it, expect } from "vitest";
import type { NpcEntry } from "@/domain/npcs/registry";
import { tokenizeWithNpcNames, type NpcNameToken } from "./npcNameMatcher";

const NPCS: NpcEntry[] = [
  { id: "npc_floor_doug", name: "Doug", short_intro: "", display_color: "#d4742a" },
  { id: "npc_floor_mike", name: "Mike", short_intro: "", display_color: "#3a8a6e" },
  { id: "npc_floor_keith", name: "Keith", short_intro: "", display_color: "#b85a3c" },
  { id: "npc_roommate_scott", name: "Scott", short_intro: "", display_color: "#2e7dd1" },
  { id: "npc_no_color", name: "Anon", short_intro: "" },
  { id: "npc_ambiguous_will", name: "Will", short_intro: "", display_color: "#888", is_ambiguous: true },
];

function names(tokens: NpcNameToken[]): string[] {
  return tokens.filter((t) => t.kind === "name").map((t) => t.value);
}

describe("tokenizeWithNpcNames", () => {
  it("wraps a single matched name with its color", () => {
    const tokens = tokenizeWithNpcNames("Doug walks in.", NPCS);
    expect(tokens).toEqual([
      { kind: "name", value: "Doug", color: "#d4742a", npcId: "npc_floor_doug" },
      { kind: "text", value: " walks in." },
    ]);
  });

  it("handles multiple names interleaved with prose", () => {
    const tokens = tokenizeWithNpcNames("Doug, Mike, and Keith argue.", NPCS);
    expect(names(tokens)).toEqual(["Doug", "Mike", "Keith"]);
    expect(tokens.find((t) => t.kind === "name" && t.value === "Mike"))
      .toMatchObject({ color: "#3a8a6e" });
  });

  it("includes possessive 's in the matched span", () => {
    const tokens = tokenizeWithNpcNames("Doug's hand goes up.", NPCS);
    const dougTok = tokens.find((t) => t.kind === "name");
    expect(dougTok).toMatchObject({ value: "Doug's", color: "#d4742a" });
  });

  it("does not match names embedded in larger words", () => {
    const tokens = tokenizeWithNpcNames("The doughy bread; he miked up.", NPCS);
    expect(names(tokens)).toEqual([]);
  });

  it("excludes is_ambiguous NPCs even when name appears", () => {
    const tokens = tokenizeWithNpcNames("He will see you now.", NPCS);
    expect(names(tokens)).toEqual([]);
  });

  it("excludes NPCs without display_color", () => {
    const tokens = tokenizeWithNpcNames("Anon stands by the door.", NPCS);
    expect(names(tokens)).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(tokenizeWithNpcNames("", NPCS)).toEqual([]);
  });

  it("returns one text token when no names match", () => {
    const tokens = tokenizeWithNpcNames("The afternoon opens up.", NPCS);
    expect(tokens).toEqual([{ kind: "text", value: "The afternoon opens up." }]);
  });

  it("matches names appearing inside italicized speaker-tagged blocks (raw text path)", () => {
    const tokens = tokenizeWithNpcNames("Mike sets his fork down. Doug grins.", NPCS);
    expect(names(tokens)).toEqual(["Mike", "Doug"]);
  });

  it("colors every occurrence, not just the first", () => {
    const tokens = tokenizeWithNpcNames("Doug looks at Doug. Doug laughs.", NPCS);
    expect(names(tokens)).toEqual(["Doug", "Doug", "Doug"]);
  });
});
