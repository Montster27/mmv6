"use client";

import type { Storylet } from "@/types/storylets";

interface ScriptModeProps {
  draft: Storylet;
  onChange: (updates: Partial<Storylet>) => void;
}

export function ScriptMode({ draft, onChange }: ScriptModeProps) {
  const day = draft.due_offset_days;
  const seg = draft.segment;

  return (
    <div className="script">
      {(day != null || seg) && (
        <div className="scenehead">
          {day != null && <span>D{day}</span>}
          {seg && <span>{seg.toUpperCase()}</span>}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-4)" }}>
            script view — use Structured for choices
          </span>
        </div>
      )}

      <input
        className="script-title-input"
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Storylet title"
      />

      <textarea
        className="script-body-input"
        value={draft.body ?? ""}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="Write the storylet body text…"
        rows={14}
      />

      {(draft.choices ?? []).length > 0 && (
        <div className="terminal">
          <h3>Choices</h3>
          {draft.choices.map((choice, i) => (
            <div key={choice.id ?? i} className="opt">
              <span className="label">{choice.label || "(unlabelled)"}</span>
              {(choice.time_cost != null || choice.energy_cost != null) && (
                <span className="cost">
                  {choice.time_cost != null && `${choice.time_cost}t`}
                  {choice.energy_cost != null && ` ${choice.energy_cost}e`}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {(draft.choices ?? []).length === 0 && (
        <div className="miss">
          <h3>No choices</h3>
          <p>Add choices in the Structured → Choices tab.</p>
        </div>
      )}
    </div>
  );
}
