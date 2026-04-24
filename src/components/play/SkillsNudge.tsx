"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSAL_KEY = "mmv_skills_nudge_dismissed_v1";

type Props = {
  /** True when the nudge should be eligible to show (Day 1 late, at least one
   * beat resolved, no skill training in progress). The parent decides the
   * eligibility — this component only owns dismissal state. */
  eligible: boolean;
};

export function SkillsNudge({ eligible }: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  // Read localStorage on mount (null = unknown, prevents flash before hydration)
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISSAL_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!eligible || dismissed !== false) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISSAL_KEY, "1");
    } catch {
      // storage unavailable; session-only dismissal is fine
    }
    setDismissed(true);
  };

  return (
    <aside
      className="rounded border border-accent-foreground/20 bg-accent/40 px-5 py-4 shadow-warm-lg narrative-enter"
      role="note"
    >
      <p className="prep-label mb-1">A thought</p>
      <p className="font-body text-[15px] leading-relaxed text-foreground/85 max-w-[42rem]">
        Somewhere between the lectures and the dining-hall noise, you notice
        it: the habits you practise now will compound. You could set aside a
        little time to train something — listening more carefully, reading
        faster, sitting longer with a problem.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Link
          href="/skills"
          className="rounded bg-primary px-3 py-1.5 text-sm font-heading text-primary-foreground hover:bg-primary/90"
          onClick={handleDismiss}
        >
          Look at skills
        </Link>
        <button
          onClick={handleDismiss}
          className="text-sm font-body text-foreground/60 hover:text-foreground/80"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
