"use client";

import { useEffect, useRef } from "react";

type Segment = 'morning' | 'afternoon' | 'evening' | 'night';

const NEXT_SEGMENT: Record<Segment, Segment> = {
  morning: 'afternoon',
  afternoon: 'evening',
  evening: 'night',
  night: 'night',
};

const SEGMENT_FLAVOR: Record<Segment, { heading: string }> = {
  afternoon: { heading: 'The morning is behind you.' },
  evening: { heading: 'The afternoon fades.' },
  night: { heading: 'The evening is done.' },
  morning: { heading: '' },
};

type Props = {
  currentSegment: Segment;
  hoursRemaining: number;
  onAdvance: () => void;
};

const AUTO_ADVANCE_MS = 300;

export function SegmentTransitionCard({ currentSegment, onAdvance }: Props) {
  const nextSegment = NEXT_SEGMENT[currentSegment];
  const flavor = SEGMENT_FLAVOR[nextSegment];
  // Local guard: a StrictMode double-mount or a parent re-render must not
  // fire onAdvance twice. The parent-level advanceInFlightRef also guards
  // against concurrent calls to /api/time/advance, but that guard is
  // stateful and may reset between renders — this local ref is belt-and-
  // braces for the single card instance.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const t = window.setTimeout(() => {
      onAdvance();
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(t);
    };
  }, [onAdvance]);

  return (
    <div
      className="rounded border-2 border-primary/10 bg-card px-6 py-6 shadow-warm-lg narrative-enter"
      role="status"
      aria-live="polite"
    >
      <p className="prep-label">{currentSegment} — done</p>
      {flavor.heading && (
        <h3 className="mt-3 font-heading text-2xl font-bold text-foreground leading-snug">
          {flavor.heading}
        </h3>
      )}
    </div>
  );
}
