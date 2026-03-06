"use client";

import { useState } from "react";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagEditor({
  tags,
  onChange,
  suggestions = [],
  placeholder = "Add tag…",
}: TagEditorProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = input
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
      )
    : [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-slate-400 hover:text-slate-700 leading-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (input.trim()) addTag(input);
            }
            if (e.key === "Escape") setShowSuggestions(false);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-md">
            {filteredSuggestions.slice(0, 10).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                  onMouseDown={() => addTag(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
