"use client";

import { useEffect, useRef } from "react";

/**
 * Maps storylet slugs (or titles as fallback) to ambient audio files.
 * Audio fades in softly to simulate diegetic sound (e.g., a clock radio).
 */
const STORYLET_AUDIO: Record<string, string> = {
  s_d1_room_214: "/assets/audio/paradise.wav",
  "Room 214": "/assets/audio/paradise.wav",
};

const FADE_IN_MS = 2000;
const TARGET_VOLUME = 0.25; // Clock-radio-quiet
const FADE_STEPS = 20;

/**
 * Plays ambient audio when a storylet with a registered audio mapping is active.
 * Fades in gently and cleans up on storylet change or unmount.
 *
 * @param slug  - storylet slug (preferred) or title
 */
export function useStoryletAudio(slug: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSlugRef = useRef<string | null>(null);

  useEffect(() => {
    const src = slug ? STORYLET_AUDIO[slug] : undefined;

    // If same audio is already playing, do nothing
    if (slug === activeSlugRef.current) return;

    // Clean up previous audio
    if (fadeRef.current) clearInterval(fadeRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    activeSlugRef.current = null;

    if (!src) return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    activeSlugRef.current = slug ?? null;

    // Start playback then fade in
    audio.play().then(() => {
      let step = 0;
      fadeRef.current = setInterval(() => {
        step++;
        audio.volume = Math.min(TARGET_VOLUME, (step / FADE_STEPS) * TARGET_VOLUME);
        if (step >= FADE_STEPS && fadeRef.current) {
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }, FADE_IN_MS / FADE_STEPS);
    }).catch(() => {
      // Browser may block autoplay — silently ignore
    });

    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      audio.pause();
      audioRef.current = null;
      activeSlugRef.current = null;
    };
  }, [slug]);
}
