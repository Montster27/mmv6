"use client";

import type { Storylet } from "@/types/storylets";

interface Link {
  via: string;
  target: string;
  kind: "chain" | "preclude";
}

interface NodeGraphModeProps {
  draft: Storylet;
  allStorylets: Storylet[];
}

function resolveTitle(key: string, all: Storylet[]): string {
  return all.find((s) => s.storylet_key === key)?.title ?? key;
}

export function NodeGraphMode({ draft, allStorylets }: NodeGraphModeProps) {
  const links: Link[] = [];

  if (draft.default_next_key) {
    links.push({
      via: "(default)",
      target: resolveTitle(draft.default_next_key, allStorylets),
      kind: "chain",
    });
  }

  for (const choice of draft.choices ?? []) {
    if (choice.next_key) {
      links.push({
        via: choice.label || "(choice)",
        target: resolveTitle(choice.next_key, allStorylets),
        kind: "chain",
      });
    }
    for (const p of choice.precludes ?? []) {
      links.push({
        via: choice.label || "(choice)",
        target: resolveTitle(p, allStorylets),
        kind: "preclude",
      });
    }
  }

  const chains = links.filter((l) => l.kind === "chain");
  const precludes = links.filter((l) => l.kind === "preclude");

  return (
    <div className="ng-view">
      <div className="ng-center-node">{draft.title || "Untitled"}</div>

      {links.length === 0 ? (
        <p className="ng-empty">No links defined. Add choices in Structured → Choices tab.</p>
      ) : (
        <>
          {chains.length > 0 && (
            <>
              <div className="ng-section-head">Chains to</div>
              <div className="ng-flow">
                {chains.map((l, i) => (
                  <div key={i} className="ng-link-row">
                    <span className="ng-via">{l.via}</span>
                    <span className="ng-arr">→</span>
                    <span className="ng-target">{l.target}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {precludes.length > 0 && (
            <>
              <div className="ng-section-head">Precludes</div>
              <div className="ng-flow">
                {precludes.map((l, i) => (
                  <div key={i} className="ng-link-row preclude">
                    <span className="ng-via">{l.via}</span>
                    <span className="ng-arr">✕</span>
                    <span className="ng-target">{l.target}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
