"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Storylets", href: "/studio/content/storylets" },
  { label: "Tracks", href: "/studio/content/arcs" },
  { label: "Calendar", href: "/studio/content/calendar" },
  { label: "Graph", href: "/studio/content/graph" },
  { label: "Track States", href: "/studio/content/streams" },
  { label: "NPCs", href: "/studio/content/npcs" },
  { label: "Preview", href: "/studio/content/preview" },
  { label: "Rules", href: "/studio/content/rules" },
  { label: "History", href: "/studio/content/history" },
  { label: "Economy", href: "/studio/content/resource-economy" },
];

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-slate-200 bg-white px-4 shrink-0 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? "border-b-2 border-indigo-600 text-indigo-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
