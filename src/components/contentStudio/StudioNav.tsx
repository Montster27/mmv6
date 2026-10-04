"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useStudio } from "./StudioContext";

type Tab = { label: string; href: string; hint: string };

// The tabs a new writer needs, in the order they are needed.
const PRIMARY_TABS: Tab[] = [
  { label: "Start here", href: "/studio/content/start", hint: "Write your first scene in a few guided steps" },
  { label: "Scenes", href: "/studio/content/storylets", hint: "Write, edit and play-test scenes" },
  { label: "My work", href: "/studio/content/work", hint: "Your drafts, assignments and team" },
  { label: "Narrative map", href: "/studio/content/narrative", hint: "Plan arcs and see how scenes connect" },
  { label: "Library", href: "/studio/content/library", hint: "Shared facts, people and places" },
  { label: "Review", href: "/studio/content/review", hint: "Check, test and approve a draft" },
  { label: "Releases", href: "/studio/content/releases", hint: "Publish approved work to players" },
];
const CONTENT_TABS: Tab[] = [];
// Power tools. Useful once the catalog is large; not needed to write a first scene.
const MORE_TABS: Tab[] = [
  { label: "Glossary", href: "/studio/content/glossary", hint: "What Studio's words mean" },
  { label: "Calendar", href: "/studio/content/calendar", hint: "Scenes laid out by day" },
  { label: "Swimlane", href: "/studio/content/swimlane", hint: "Scenes by track" },
  { label: "Constellation", href: "/studio/content/constellation", hint: "Relationships between scenes" },
  { label: "NPCs", href: "/studio/content/npcs", hint: "People in the game" },
  { label: "Tracks", href: "/studio/content/arcs", hint: "The six storylines" },
  { label: "Streams", href: "/studio/content/streams", hint: "Track pressure over time" },
  { label: "Graph", href: "/studio/content/graph", hint: "Scene graph" },
  { label: "Economy", href: "/studio/content/resource-economy", hint: "Time, energy and money" },
  { label: "Preview", href: "/studio/content/preview", hint: "Play through the content" },
  { label: "Consequence rules", href: "/studio/content/rules", hint: "Delayed consequences" },
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
          title={tab.hint}
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
          title="Power tools and the glossary"
        >
          Advanced ▾
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
                title={tab.hint}
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
