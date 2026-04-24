"use client";

import { useEffect, useState } from "react";

const DISMISSAL_KEY = "mmv_early_build_banner_dismissed_v1";

export function EarlyBuildBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISSAL_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed !== false) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISSAL_KEY, "1");
    } catch {
      // storage unavailable — session-only dismissal is fine
    }
    setDismissed(true);
  };

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-accent-foreground/20 bg-accent/50 px-4 py-2 text-xs sm:text-sm"
      role="status"
      aria-live="polite"
    >
      <p className="font-body text-foreground/80">
        <span className="prep-label mr-2">Early build</span>
        Content is partial and placeholder text still surfaces in places. If
        something looks wrong, it probably is — please note the day and segment.
      </p>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded px-2 py-1 text-xs font-heading text-foreground/70 hover:bg-accent/70 hover:text-foreground"
        aria-label="Dismiss early-build notice"
      >
        Got it
      </button>
    </div>
  );
}
