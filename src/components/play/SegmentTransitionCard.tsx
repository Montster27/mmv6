"use client";

import { Button } from "@/components/ui/button";

type Segment = 'morning' | 'afternoon' | 'evening' | 'night';

const NEXT_SEGMENT: Record<Segment, Segment> = {
  morning: 'afternoon',
  afternoon: 'evening',
  evening: 'night',
  night: 'night', // handled by SleepCard, should not reach here
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

/**
 * Shown when all arc beats for the current segment are resolved and it
 * is not yet night. Gives the player a narrative moment before the next
 * segment begins, rather than jumping straight to "Daily complete".
 */
export function SegmentTransitionCard({ currentSegment, hoursRemaining, onAdvance }: Props) {
  const nextSegment = NEXT_SEGMENT[currentSegment];
  const flavor = SEGMENT_FLAVOR[nextSegment];

  return (
    <div className="rounded border-2 border-primary/15 bg-card px-5 py-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {currentSegment} — done
      </p>
      <p className="font-heading text-lg font-semibold text-foreground">
        {flavor.heading}
      </p>
      {flavor.body && (
        <p className="text-sm text-foreground/70 leading-relaxed">{flavor.body}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground tabular-nums">
          {hoursRemaining}h remaining · {nextSegment} next
        </span>
        <Button onClick={onAdvance} size="sm">
          Continue to {nextSegment} →
        </Button>
      </div>
    </div>
  );
}
