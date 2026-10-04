"use client";

import { useId, useMemo, useRef, useState } from "react";

export type ChipOption = { value: string; label: string; hint?: string };

/**
 * A searchable multi-picker. Selected items show as removable chips; typing filters the
 * list. Replaces Ctrl/Cmd-click multi-selects, which beginners rarely discover.
 * Keyboard: type to filter, ↑/↓ to move, Enter to add, Backspace on empty input removes the last chip.
 */
export function ChipPicker({
  label,
  options,
  value,
  onChange,
  placeholder = "Type to search…",
  emptyText = "Nothing selected.",
  disabled = false,
}: {
  label: string;
  options: ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelOf = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !value.includes(o.value) && (!q || `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q))).slice(0, 50);
  }, [options, value, query]);

  const add = (v: string) => {
    onChange([...value, v]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  return (
    <div className="block text-xs">
      <span id={`${listId}-label`}>{label}</span>
      <div className="mt-1 rounded border border-slate-300 bg-white p-2">
        {value.length === 0 ? <p className="mb-1 text-slate-500">{emptyText}</p> : null}
        <ul className="mb-1 flex flex-wrap gap-1" aria-label={`${label}: selected`}>
          {value.map((v) => (
            <li key={v} className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-900">
              {labelOf.get(v) ?? v}
              <button type="button" disabled={disabled} aria-label={`Remove ${labelOf.get(v) ?? v}`} className="text-indigo-700 hover:text-red-700 disabled:opacity-40" onClick={() => onChange(value.filter((x) => x !== v))}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="relative">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-labelledby={`${listId}-label`}
            aria-autocomplete="list"
            disabled={disabled}
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, matches.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && open && matches[active]) { e.preventDefault(); add(matches[active].value); }
              else if (e.key === "Escape") setOpen(false);
              else if (e.key === "Backspace" && !query && value.length) onChange(value.slice(0, -1));
            }}
          />
          {open && !disabled ? (
            <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-300 bg-white shadow">
              {matches.length === 0 ? <li className="px-2 py-1 text-slate-500">No matches.</li> : null}
              {matches.map((o, i) => (
                <li key={o.value} role="option" aria-selected={i === active}
                  className={`cursor-pointer px-2 py-1 ${i === active ? "bg-indigo-50" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); add(o.value); }}
                  onMouseEnter={() => setActive(i)}>
                  {o.label}
                  {o.hint ? <span className="ml-2 text-slate-400">{o.hint}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
