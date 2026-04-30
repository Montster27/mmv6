import { Fragment } from "react";
import { NPC_REGISTRY } from "@/domain/npcs/registry";
import { tokenizeWithNpcNames } from "@/lib/npcNameMatcher";

export function NpcColoredText({ text }: { text: string }) {
  const tokens = tokenizeWithNpcNames(text, NPC_REGISTRY);
  return (
    <>
      {tokens.map((tok, i) =>
        tok.kind === "name" ? (
          <span key={i} style={{ color: tok.color }}>
            {tok.value}
          </span>
        ) : (
          <Fragment key={i}>{tok.value}</Fragment>
        )
      )}
    </>
  );
}
