"use client";

import { useMemo, useState } from "react";
import type { Storylet } from "@/types/storylets";
import { validateStoryletIssues } from "@/core/validation/storyletValidation";
import { getScriptModeGaps } from "./StoryletEditor/getScriptModeGaps";
import type { TrackKey } from "@/lib/trackPalette";
import { TRACK_LABELS, trackStyle } from "@/lib/trackPalette";

type PanelId = "props" | "validation" | "npcs" | "collision" | "flags" | "history";

interface StudioSidePanelProps {
  draft: Storylet;
  allStorylets: Storylet[];
  arcOptions: { id: string; key: string; title: string }[];
  trackKey: TrackKey | null;
}

const PANELS: { id: PanelId; label: string }[] = [
  { id: "props", label: "Properties" },
  { id: "validation", label: "Validation" },
  { id: "npcs", label: "NPCs" },
  { id: "collision", label: "Collision" },
  { id: "flags", label: "Flags & Doors" },
  { id: "history", label: "History" },
];

// ── sub-panels ────────────────────────────────────────────────────────────────

function PropsPanel({
  draft,
  arcOptions,
  trackKey,
}: {
  draft: Storylet;
  arcOptions: { id: string; key: string; title: string }[];
  trackKey: TrackKey | null;
}) {
  const arc = arcOptions.find((a) => a.id === draft.track_id);
  const trackLabel = trackKey ? (TRACK_LABELS.find((t) => t.key === trackKey)?.label ?? trackKey) : null;
  const gaps = getScriptModeGaps(draft);

  return (
    <div>
      <div className="sp-row">
        <span className="sp-label">Day</span>
        <span className="sp-value">{draft.due_offset_days ?? "—"}</span>
      </div>
      <div className="sp-row">
        <span className="sp-label">Segment</span>
        <span className="sp-value">{draft.segment ?? "—"}</span>
      </div>
      <div className="sp-row">
        <span className="sp-label">Track</span>
        <span className="sp-value">
          {trackLabel ? (
            <span className="track-chip" style={trackStyle(trackKey)}>
              <span className="dot" />
              {trackLabel}
            </span>
          ) : arc?.title ?? "—"}
        </span>
      </div>
      <div className="sp-row">
        <span className="sp-label">Key</span>
        <span className="sp-value mono" style={{ fontSize: 11 }}>
          {draft.storylet_key ?? "—"}
        </span>
      </div>
      <div className="sp-row">
        <span className="sp-label">Status</span>
        <span
          className="sp-value"
          style={{
            padding: "1px 6px", borderRadius: 4,
            background: draft.is_active ? "#dcfce7" : "#f1f5f9",
            color: draft.is_active ? "#15803d" : "var(--ink-4)",
            fontSize: 11,
          }}
        >
          {draft.is_active ? "active" : "draft"}
        </span>
      </div>
      <div className="sp-row">
        <span className="sp-label">Mode</span>
        <span className="sp-value" style={{ fontSize: 11 }}>
          {gaps.length === 0 ? "script-ready" : `structured (${gaps.length} gap${gaps.length !== 1 ? "s" : ""})`}
        </span>
      </div>
      <div className="sp-row">
        <span className="sp-label">Crystallizer</span>
        <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
          stub — T-1778831000007
        </span>
      </div>
    </div>
  );
}

function ValidationPanel({ draft }: { draft: Storylet }) {
  const { errors, warnings } = useMemo(() => validateStoryletIssues(draft), [draft]);
  const gaps = useMemo(() => getScriptModeGaps(draft), [draft]);

  if (errors.length === 0 && warnings.length === 0 && gaps.length === 0) {
    return (
      <div style={{ padding: "12px 0", color: "var(--good)", fontSize: 12, fontWeight: 500 }}>
        ✓ No issues found
      </div>
    );
  }

  return (
    <div>
      {errors.map((issue, i) => (
        <div key={i} className="val-row bad">
          <div className="icon" />
          <div>
            <div className="rule">{issue.path}</div>
            <div>{issue.message}</div>
          </div>
        </div>
      ))}
      {warnings.map((issue, i) => (
        <div key={i} className="val-row warn">
          <div className="icon" />
          <div>
            <div className="rule">{issue.path}</div>
            <div>{issue.message}</div>
          </div>
        </div>
      ))}
      {gaps.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)", marginBottom: 6 }}>
            Script-mode gaps
          </div>
          {gaps.map((gap) => (
            <div key={gap} className="val-row warn">
              <div className="icon" />
              <div>
                <div className="rule">{gap}</div>
                <div>Not editable in Script view — use Structured</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NpcsPanel() {
  return (
    <div className="sp-grey">
      NPC field not in schema yet<br />
      <span style={{ fontSize: 10 }}>T-1778831000013</span>
    </div>
  );
}

function CollisionPanel({
  draft,
  allStorylets,
}: {
  draft: Storylet;
  allStorylets: Storylet[];
}) {
  const competing = useMemo(() => {
    if (draft.due_offset_days == null) return [];
    return allStorylets.filter(
      (s) =>
        s.id !== draft.id &&
        s.is_active &&
        s.due_offset_days === draft.due_offset_days &&
        (draft.segment == null || s.segment == null || s.segment === draft.segment)
    );
  }, [draft, allStorylets]);

  if (draft.due_offset_days == null) {
    return <div className="sp-grey">Set a day to see collisions</div>;
  }
  if (competing.length === 0) {
    return (
      <div style={{ padding: "12px 0", color: "var(--good)", fontSize: 12 }}>
        ✓ No competing storylets on D{draft.due_offset_days}
        {draft.segment ? `/${draft.segment}` : ""}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--warn)", marginBottom: 8 }}>
        {competing.length} storylet{competing.length !== 1 ? "s" : ""} compete for
        D{draft.due_offset_days}{draft.segment ? `/${draft.segment}` : ""}
      </div>
      {competing.map((s) => (
        <div
          key={s.id}
          style={{
            padding: "6px 8px", marginBottom: 4, borderRadius: 4,
            background: "var(--panel)", border: "1px solid var(--line)",
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 500 }}>{s.title}</div>
          {s.storylet_key && (
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {s.storylet_key}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FlagsPanel({ draft }: { draft: Storylet }) {
  const precludes: string[] = useMemo(() => {
    const all: string[] = [];
    for (const choice of draft.choices ?? []) {
      for (const p of choice.precludes ?? []) {
        if (!all.includes(p)) all.push(p);
      }
    }
    return all;
  }, [draft]);

  return (
    <div>
      {precludes.length > 0 ? (
        <>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)", marginBottom: 6 }}>
            Precludes
          </div>
          {precludes.map((p) => (
            <div
              key={p}
              style={{
                padding: "4px 8px", marginBottom: 4, borderRadius: 4, fontSize: 11,
                background: "#fff5f5", border: "1px solid #fca5a5", color: "#b91c1c",
              }}
              className="mono"
            >
              ✕ {p}
            </div>
          ))}
        </>
      ) : (
        <div style={{ padding: "8px 0", color: "var(--ink-4)", fontSize: 12 }}>
          No preclusions set
        </div>
      )}
      <div className="sp-grey" style={{ marginTop: 12 }}>
        flags_set · flags_required · doors<br />
        <span style={{ fontSize: 10 }}>coming soon — T-1778831000014</span>
      </div>
    </div>
  );
}

function HistoryPanel() {
  return (
    <div className="sp-grey">
      Edit history coming soon<br />
      <span style={{ fontSize: 10 }}>T-1778831000016</span>
    </div>
  );
}

// ── StudioSidePanel ───────────────────────────────────────────────────────────

export function StudioSidePanel({
  draft,
  allStorylets,
  arcOptions,
  trackKey,
}: StudioSidePanelProps) {
  const [active, setActive] = useState<PanelId>("props");

  const validationCount = useMemo(() => {
    const { errors, warnings } = validateStoryletIssues(draft);
    return errors.length + warnings.length;
  }, [draft]);

  const collisionCount = useMemo(() => {
    if (draft.due_offset_days == null) return 0;
    return allStorylets.filter(
      (s) =>
        s.id !== draft.id &&
        s.is_active &&
        s.due_offset_days === draft.due_offset_days &&
        (draft.segment == null || s.segment == null || s.segment === draft.segment)
    ).length;
  }, [draft, allStorylets]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="sp-nav">
        {PANELS.map(({ id, label }) => {
          const badge =
            id === "validation" && validationCount > 0
              ? String(validationCount)
              : id === "collision" && collisionCount > 0
              ? String(collisionCount)
              : null;
          return (
            <button
              key={id}
              type="button"
              className={`sp-tab${active === id ? " active" : ""}`}
              onClick={() => setActive(id)}
            >
              {label}
              {badge && <span className="sp-badge">{badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="sp-content">
        {active === "props" && (
          <PropsPanel draft={draft} arcOptions={arcOptions} trackKey={trackKey} />
        )}
        {active === "validation" && <ValidationPanel draft={draft} />}
        {active === "npcs" && <NpcsPanel />}
        {active === "collision" && (
          <CollisionPanel draft={draft} allStorylets={allStorylets} />
        )}
        {active === "flags" && <FlagsPanel draft={draft} />}
        {active === "history" && <HistoryPanel />}
      </div>
    </div>
  );
}
