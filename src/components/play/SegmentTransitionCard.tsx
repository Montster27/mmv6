"use client";

import { Button } from "@/components/ui/button";

type Segment = 'morning' | 'afternoon' | 'evening' | 'night';

const NEXT_SEGMENT: Record<Segment, Segment> = {
  morning: 'afternoon',
  afternoon: 'evening',
  evening: 'night',
  night: 'night',
};

const SEGMENT_FLAVOR: Record<Segment, { heading: string; body: string }> = {
  afternoon: {
    heading: 'The morning is behind you.',
    body: 'The afternoon opens up. A stretch of hours without anything fixed on the schedule.',
  },
  evening: {
    heading: 'The afternoon fades.',
    body: 'The light shifts. The campus starts to feel quieter in some ways, louder in others. Evening has its own texture.',
  },
  night: {
    heading: 'The evening is done.',
    body: 'The hall gets quieter. Whoever is still up is awake because they chose to be. The night part of the day begins.',
  },
  morning: {
    heading: 'A new segment.',
    body: '',
  },
};

type Props = {
  currentSegment: Segment;
  hoursRemaining: number;
  onAdvance: () => void;
};

// Explicit-click design — no auto-advance timer. Aligns with the
// 00edffc refactor that removed the page-level auto-advance timer for
// the same reason (stale-closure window during data refetch / re-render
// would fire onAdvance unreliably or skip through multiple segments).
// ad97554's P1.5 reintroduced a 300ms in-card timer with firedRef as
// safety; that pattern broke under parent re-renders within the 300ms
// window (cleanup clears the timer, firedRef short-circuits scheduling
// a new one — observed at day 2 evening with empty segment causing
// "The evening is done." to hang permanently). This component has no
// timing assumptions: the player clicks Continue to advance.
//
// Concurrent-click safety is at the parent: handleAdvanceSegment
// guards on advanceInFlightRef so a double-click can't fire two
// /api/time/advance calls.
export function SegmentTransitionCard({ currentSegment, hoursRemaining, onAdvance }: Props) {
  const nextSegment = NEXT_SEGMENT[currentSegment];
  const flavor = SEGMENT_FLAVOR[nextSegment];

  return (
    <div className="rounded border-2 border-primary/10 bg-card px-6 py-6 shadow-warm-lg space-y-4 narrative-enter">
      <p className="prep-label segment-text-enter">
        {currentSegment} — done
      </p>
      <h3
        className="font-heading text-2xl font-bold text-foreground leading-snug segment-text-enter"
        style={{ animationDelay: '0.15s' }}
      >
        {flavor.heading}
      </h3>
      {flavor.body && (
        <p
          className="font-body text-base text-foreground/70 leading-relaxed max-w-[36rem] segment-text-enter"
          style={{ animationDelay: '0.3s' }}
        >
          {flavor.body}
        </p>
      )}
      <div
        className="flex items-center justify-between pt-2 segment-text-enter"
        style={{ animationDelay: '0.45s' }}
      >
        <span className="font-stat text-xs text-muted-foreground tabular-nums">
          {hoursRemaining}h remaining
        </span>
        <Button onClick={onAdvance} size="default">
          Continue to {nextSegment}
        </Button>
      </div>
    </div>
  );
}
