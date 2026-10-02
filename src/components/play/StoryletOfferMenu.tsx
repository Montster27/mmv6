"use client";

import type { TrackStorylet, TrackKey } from "@/types/tracks";
import { TRACK_LABELS } from "@/types/tracks";
import { Button } from "@/components/ui/button";

type Props = {
  offers: TrackStorylet[];
  dayIndex: number;
  onChoose: (storyletKey: string) => void;
  onLeave: () => void;
};

/** A choice of where to spend attention, before entering a storylet. */
export function StoryletOfferMenu({ offers, dayIndex, onChoose, onLeave }: Props) {
  return (
    <div className="space-y-3" aria-label="Available moments">
      <p className="text-sm text-muted-foreground">
        {offers.length === 1
          ? "Something is happening. Choose whether to take part, or let the moment pass."
          : "Several things are happening. Choose where to take part, or let the moment pass."}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {offers.map((offer) => (
          <Button
            key={`${offer.track_key}:${offer.storylet_key}`}
            type="button"
            variant="outline"
            className="h-auto min-h-20 flex-col items-start whitespace-normal p-4 text-left"
            onClick={() => onChoose(offer.storylet_key)}
          >
            <span className="text-xs text-muted-foreground">
              {TRACK_LABELS[offer.track_key as TrackKey] ?? offer.track_key}
            </span>
            <span className="mt-1 font-heading text-base">{offer.title}</span>
            {offer.expires_on_day <= dayIndex && (
              <span className="mt-1 text-xs text-muted-foreground">Today may be your chance</span>
            )}
          </Button>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={onLeave}>
        Leave these for now
      </Button>
    </div>
  );
}
