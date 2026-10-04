"use client";

import type { TrackStorylet, TrackKey } from "@/types/tracks";
import { TRACK_LABELS } from "@/types/tracks";
import { Button } from "@/components/ui/button";
import { offerReturnNote } from "@/core/play/offers";

type Props = {
  offers: TrackStorylet[];
  dayIndex: number;
  onChoose: (storyletKey: string) => void;
  /** Pass on a single offer, leaving the others on the menu. */
  onPass: (storyletKey: string) => void;
  /** Pass on everything currently offered. */
  onLeave: () => void;
};

/** A choice of where to spend attention, before entering a storylet. */
export function StoryletOfferMenu({ offers, dayIndex, onChoose, onPass, onLeave }: Props) {
  const anyFinal = offers.some((offer) => offerReturnNote(offer.expires_on_day, dayIndex).final);
  return (
    <div className="space-y-3" aria-label="Available moments">
      <p className="text-sm text-muted-foreground">
        {offers.length === 1
          ? "Something is happening. Choose whether to take part, or let the moment pass."
          : "Several things are happening. Choose where to take part, or let a moment pass."}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {offers.map((offer) => {
          const note = offerReturnNote(offer.expires_on_day, dayIndex);
          return (
            <li key={`${offer.track_key}:${offer.storylet_key}`} className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-20 flex-col items-start whitespace-normal p-4 text-left"
                onClick={() => onChoose(offer.storylet_key)}
              >
                <span className="text-xs text-muted-foreground">
                  {TRACK_LABELS[offer.track_key as TrackKey] ?? offer.track_key}
                </span>
                <span className="mt-1 font-heading text-base">{offer.title}</span>
              </Button>
              <div className="flex items-center justify-between gap-2 px-1">
                <span className={`text-xs ${note.final ? "text-amber-700" : "text-muted-foreground"}`}>{note.text}</span>
                <Button type="button" variant="ghost" size="sm" aria-label={`Not now: ${offer.title}`} onClick={() => onPass(offer.storylet_key)}>
                  Not now
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {offers.length > 1 ? (
        <Button type="button" variant="ghost" onClick={onLeave}>
          Not now for any of these{anyFinal ? " (some will not come back)" : ""}
        </Button>
      ) : null}
    </div>
  );
}
