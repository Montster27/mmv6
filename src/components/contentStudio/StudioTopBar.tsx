"use client";

import { useStudio } from "./StudioContext";

export function StudioTopBar() {
  const { search, setSearch, paletteOpen, setPaletteOpen } = useStudio();

  return (
    <div className="topbar">
      <div className="brand">
        <div className="dot" />
        <span>MMV</span>
        <span className="sub">Content Studio</span>
      </div>

      <div className="crumbs">
        <span>Studio</span>
        <span className="sep">›</span>
        <span>Content</span>
      </div>

      <div className="right">
        <span className="pill live">
          <span className="blip" />
          DB live
        </span>

        <input
          type="text"
          className="search"
          placeholder="Search storylets… (⌘K)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            if (!search) setPaletteOpen(true);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
              e.preventDefault();
              setPaletteOpen(!paletteOpen);
            }
          }}
        />

        <button
          className="pill"
          onClick={() => setPaletteOpen(!paletteOpen)}
          title="Command palette (⌘K)"
        >
          ⌘K
        </button>
      </div>
    </div>
  );
}
