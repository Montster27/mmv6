"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useStudio } from "./StudioContext";

const PRIMARY_TABS = [
  { label: "▦ Calendar",      href: "/studio/content/calendar" },
  { label: "≡ Swimlane",      href: "/studio/content/swimlane" },
  { label: "✦ Constellation", href: "/studio/content/constellation" },
];

const CONTENT_TABS = [
  { label: "NPCs",    href: "/studio/content/npcs" },
  { label: "History", href: "/studio/content/history" },
  { label: "Rules",   href: "/studio/content/rules" },
];

const MORE_TABS = [
  { label: "Storylets",    href: "/studio/content/storylets" },
  { label: "Tracks",       href: "/studio/content/arcs" },
  { label: "Track States", href: "/studio/content/streams" },
  { label: "Graph",        href: "/studio/content/graph" },
  { label: "Economy",      href: "/studio/content/resource-economy" },
  { label: "Preview",      href: "/studio/content/preview" },
];

export function StudioNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { sidebarOn, setSidebarOn } = useStudio();

  const isActive = (href: string) => pathname.startsWith(href);
  const moreActive = MORE_TABS.some((t) => isActive(t.href));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  return (
    <div className="tabbar">
      {PRIMARY_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tab${isActive(tab.href) ? " active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}

      <div className="group-sep" />

      {CONTENT_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tab${isActive(tab.href) ? " active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}

      <div className="group-sep" />

      {/* More ▾ overflow dropdown */}
      <div
        ref={moreRef}
        style={{ position: "relative", display: "flex", alignItems: "stretch" }}
      >
        <button
          className={`tab${moreActive ? " active" : ""}`}
          onClick={() => setMoreOpen((o) => !o)}
        >
          More ▾
        </button>
        {moreOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 20,
              marginTop: "2px",
              width: "160px",
              background: "white",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(15,23,42,.12)",
              padding: "4px 0",
            }}
          >
            {MORE_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: "block",
                  padding: "7px 14px",
                  fontSize: "13px",
                  color: isActive(tab.href) ? "var(--indigo)" : "var(--ink-2)",
                  background: isActive(tab.href) ? "var(--indigo-soft)" : "transparent",
                  textDecoration: "none",
                }}
                onClick={() => setMoreOpen(false)}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="right">
        <button
          onClick={() => setSidebarOn(!sidebarOn)}
          title={sidebarOn ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOn ? "⊟ Sidebar" : "⊞ Sidebar"}
        </button>
      </div>
    </div>
  );
}
