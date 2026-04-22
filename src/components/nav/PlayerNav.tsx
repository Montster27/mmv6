"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth";

const navItems = [
  { href: "/play", label: "Play" },
  { href: "/skills", label: "Skills" },
  { href: "/journal", label: "Journal" },
  { href: "/theory", label: "Theory" },
  { href: "/group", label: "Group" },
];

export function PlayerNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-collegiate flex items-center justify-between px-5 py-2.5">
      <div className="flex items-center gap-1">
        <span className="font-heading text-base font-bold tracking-tight text-primary-foreground mr-4">
          Many More Versions
        </span>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? "nav-link--active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <button
        onClick={signOut}
        className="nav-link text-primary-foreground/40 hover:text-primary-foreground/70"
      >
        Sign out
      </button>
    </nav>
  );
}
