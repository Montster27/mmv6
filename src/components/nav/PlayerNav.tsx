"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

const navItems = [
  { href: "/play", label: "Play" },
  { href: "/journal", label: "Journal" },
  { href: "/theory", label: "Theoryboard" },
  { href: "/group", label: "Group" },
];

export function PlayerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex items-center gap-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "text-sm font-semibold text-slate-900"
                  : "text-sm text-slate-600 hover:text-slate-900 hover:underline"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" onClick={signOut}>
        Sign out
      </Button>
    </nav>
  );
}
