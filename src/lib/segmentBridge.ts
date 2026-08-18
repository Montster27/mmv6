export type Segment = 'morning' | 'afternoon' | 'evening' | 'night';

const BRIDGES: Record<Segment, string[]> = {
  morning: [
    "The morning moves quickly when there's nothing fixed to hold onto.",
    "You get through the morning. The campus routine starts to feel less foreign.",
  ],
  afternoon: [
    "The afternoon opens up. A few free hours before the evening.",
    "After lunch, the campus quiets down a little. Your time is your own.",
  ],
  evening: [
    "Evening comes fast in September. The temperature drops and the lights come on in the halls.",
    "The day's weight settles. Evening has a different quality than afternoon — more personal.",
  ],
  night: [
    "The floor gets quieter. Somewhere a door closes. The night part of the day begins.",
    "The campus contracts to lit windows and low voices. Night has begun.",
  ],
};

export function getBridgeText(toSegment: Segment): string {
  const options = BRIDGES[toSegment];
  return options[Math.floor(Math.random() * options.length)];
}
