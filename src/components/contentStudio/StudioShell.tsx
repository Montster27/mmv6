"use client";

import { type ReactNode, useState, useEffect } from "react";
import { StudioContext } from "./StudioContext";
import { StudioTopBar } from "./StudioTopBar";
import { StudioNav } from "./StudioNav";
import { StudioSidebar } from "./StudioSidebar";
import { CommandPalette } from "./CommandPalette";

interface StudioShellProps {
  children: ReactNode;
}

export function StudioShell({ children }: StudioShellProps) {
  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOn, setSidebarOn] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global ⌘K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <StudioContext.Provider
      value={{
        trackFilter,
        setTrackFilter,
        search,
        setSearch,
        sidebarOn,
        setSidebarOn,
        paletteOpen,
        setPaletteOpen,
      }}
    >
      <div className="studio-root" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <StudioTopBar />
        <StudioNav />

        {/* Workspace: optional sidebar + canvas */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: sidebarOn ? "240px 1fr" : "1fr",
            overflow: "hidden",
          }}
        >
          {sidebarOn && <StudioSidebar />}
          <div className="canvas">{children}</div>
        </div>

        {paletteOpen && (
          <CommandPalette onClose={() => setPaletteOpen(false)} />
        )}
      </div>
    </StudioContext.Provider>
  );
}
