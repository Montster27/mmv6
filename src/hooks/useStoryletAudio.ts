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

function fadeIn(audio: HTMLAudioElement, fadeRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (fadeRef.current) clearInterval(fadeRef.current);
  let step = 0;
  fadeRef.current = setInterval(() => {
    step++;
    audio.volume = Math.min(TARGET_VOLUME, (step / FADE_STEPS) * TARGET_VOLUME);
    if (step >= FADE_STEPS && fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, FADE_IN_MS / FADE_STEPS);
}

/**
 * Plays ambient audio when a storylet with a registered audio mapping is active.
 * Fades in gently and cleans up on storylet change or unmount.
 *
 * Safari blocks autoplay even after prior interactions, so if play() fails
 * we attach a one-time click/touchstart listener to retry on the next gesture.
 */
export function useStoryletAudio(slug: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSlugRef = useRef<string | null>(null);
  const gestureCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const src = slug ? STORYLET_AUDIO[slug] : undefined;

    // If same audio is already playing, do nothing
    if (slug === activeSlugRef.current) return;

    // Clean up previous audio + gesture listener
    if (fadeRef.current) clearInterval(fadeRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (gestureCleanupRef.current) {
      gestureCleanupRef.current();
      gestureCleanupRef.current = null;
    }
    activeSlugRef.current = null;

    if (!src) return;

    const audio = new Audio(src);
    audio.loop = false;
    audio.volume = 0;
    audioRef.current = audio;
    activeSlugRef.current = slug ?? null;

    // Try autoplay — works in Chrome after prior interaction
    audio.play().then(() => {
      fadeIn(audio, fadeRef);
    }).catch(() => {
      // Autoplay blocked (Safari) — wait for next user gesture to start
      const startOnGesture = () => {
        if (audioRef.current === audio) {
          audio.play().then(() => fadeIn(audio, fadeRef)).catch(() => {});
        }
        cleanup();
      };
      const cleanup = () => {
        document.removeEventListener("click", startOnGesture, true);
        document.removeEventListener("touchstart", startOnGesture, true);
        if (gestureCleanupRef.current === cleanup) gestureCleanupRef.current = null;
      };
      document.addEventListener("click", startOnGesture, { capture: true, once: true });
      document.addEventListener("touchstart", startOnGesture, { capture: true, once: true });
      gestureCleanupRef.current = cleanup;
    });

    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      if (gestureCleanupRef.current) {
        gestureCleanupRef.current();
        gestureCleanupRef.current = null;
      }
      audio.pause();
      audioRef.current = null;
      activeSlugRef.current = null;
    };
  }, [slug]);
}
