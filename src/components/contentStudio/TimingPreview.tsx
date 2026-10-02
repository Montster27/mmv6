"use client";

import { useMemo, useState } from "react";
import { selectTrackStorylets } from "@/core/tracks/selectTrackStorylets";
import type { Storylet, StoryletChoice } from "@/types/storylets";
import type { Track, TrackProgress, TrackStoryletRow } from "@/types/tracks";

const SEGMENTS = ["morning", "afternoon", "evening", "night"] as const;

type Props = {
  storylets: Storylet[];
  defaultStorylet: Storylet | null;
  arcDefinitions: { id: string; key: string; title: string }[];
};

function isTrackStorylet(storylet: Storylet): storylet is TrackStoryletRow {
  return Boolean(storylet.track_id && storylet.storylet_key &&
    storylet.due_offset_days != null && storylet.expires_after_days != null);
}

export function TimingPreview({ storylets, defaultStorylet, arcDefinitions }: Props) {
  const trackStorylets = useMemo(() => storylets.filter(isTrackStorylet), [storylets]);
  const trackIds = useMemo(() => [...new Set(trackStorylets.map((s) => s.track_id))], [trackStorylets]);
  const [selectedTrackId, setSelectedTrackId] = useState(defaultStorylet?.track_id ?? "");
  const trackId = trackIds.includes(selectedTrackId) ? selectedTrackId : trackIds[0];
  const [day, setDay] = useState(0);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [resolved, setResolved] = useState<string[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [precluded, setPrecluded] = useState<string[]>([]);
  const [override, setOverride] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function reset() {
    setDay(0);
    setSegmentIndex(0);
    setResolved([]);
    setChoices([]);
    setFlags([]);
    setPrecluded([]);
    setOverride(null);
    setLog([]);
  }

  const track: Track = {
    id: trackId, key: arcDefinitions.find((a) => a.id === trackId)?.key ?? trackId,
    title: arcDefinitions.find((a) => a.id === trackId)?.title ?? "Track",
    description: "", category: "life", chapter: "chapter_one", is_enabled: true, tags: [],
  };
  const progress: TrackProgress = {
    id: "preview", user_id: "preview", track_id: trackId, state: "ACTIVE",
    current_storylet_key: override ?? "", storylet_due_day: 0, track_state: null,
    started_day: 0, defer_count: 0, updated_day: day,
    resolved_storylet_keys: resolved, next_key_override: override,
  };
  const offer = trackId ? selectTrackStorylets({
    dayIndex: day, currentSegment: SEGMENTS[segmentIndex],
    progress: [progress], tracks: [track],
    storylets: trackStorylets.filter((s) => s.track_id === trackId), maxStorylets: 1,
    resolvedChoicesByTrack: new Map([[trackId, new Set(choices)]]),
    flagsByTrack: new Map([[trackId, new Set(flags)]]),
    precludedKeys: new Set(precluded),
  })[0] : undefined;

  function advance() {
    if (segmentIndex === SEGMENTS.length - 1) {
      setDay((value) => value + 1);
      setSegmentIndex(0);
    } else {
      setSegmentIndex((value) => value + 1);
    }
  }

  function take(choice: StoryletChoice) {
    if (!offer) return;
    const key = offer.storylet.storylet_key;
    const authored = choice as StoryletChoice & { option_key?: string; sets_flag?: string[] };
    setResolved((value) => [...value, key]);
    setChoices((value) => [...value, authored.option_key ?? choice.id]);
    if (authored.sets_flag?.length) setFlags((value) => [...value, ...authored.sets_flag!]);
    if (choice.precludes?.length) setPrecluded((value) => [...value, ...choice.precludes!]);
    setOverride(choice.next_key ?? offer.storylet.default_next_key ?? null);
    setLog((value) => [`D${day}/${SEGMENTS[segmentIndex]}: took ${key} — ${choice.label}`, ...value]);
  }

  return (
    <section className="rounded-md border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-indigo-900">Timing and missed-scene preview</h3>
          <p className="text-xs text-indigo-700">Uses the game’s track offer selector. Track day 0 is the start of this track. Player data is untouched.</p>
        </div>
        <button type="button" className="rounded border bg-white px-2 py-1 text-xs" onClick={reset}>Reset preview</button>
      </div>
      <label className="block text-xs text-slate-700">Track
        <select className="ml-2 rounded border bg-white px-2 py-1" value={trackId ?? ""}
          onChange={(event) => { setSelectedTrackId(event.target.value); reset(); }}>
          {trackIds.map((id) => <option key={id} value={id}>{arcDefinitions.find((a) => a.id === id)?.title ?? id}</option>)}
        </select>
      </label>
      {trackIds.length === 0 && <p className="text-sm text-slate-600">No scheduled track storylets are available to preview.</p>}
      <p className="text-sm font-medium">Day {day} · {SEGMENTS[segmentIndex]}</p>
      {offer ? (
        <div className="rounded border bg-white p-3 space-y-2">
          <p className="text-sm font-semibold">{offer.storylet.title}</p>
          <p className="text-xs text-slate-600">{offer.storylet.storylet_key} · expires day {offer.expires_on_day}</p>
          <div className="flex flex-wrap gap-2">
            {offer.storylet.choices.map((choice) => (
              <button key={choice.id} type="button" className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs" onClick={() => take(choice)}>
                Take: {choice.label}
              </button>
            ))}
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => {
              setLog((value) => [`D${day}/${SEGMENTS[segmentIndex]}: passed ${offer.storylet.storylet_key}`, ...value]);
              advance();
            }}>Let it pass → next segment</button>
          </div>
        </div>
      ) : <p className="text-sm text-slate-600">No eligible track scene in this segment.</p>}
      <button type="button" className="rounded border bg-white px-2 py-1 text-xs" onClick={advance}>Advance to next segment →</button>
      {log.length > 0 && <ol className="list-disc pl-5 text-xs text-slate-600">{log.map((entry, index) => <li key={`${index}:${entry}`}>{entry}</li>)}</ol>}
      <p className="text-xs text-slate-500">This preview checks timing, resolved-scene, choice, flag, and preclusion gates. Skill and resource state are not simulated.</p>
    </section>
  );
}
