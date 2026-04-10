"use client";

import { useEffect, useRef } from "react";

const FADE_IN_MS = 2000;
const TARGET_VOLUME = 0.25; // Clock-radio-quiet
const FADE_STEPS = 20;

function fadeIn(
  audio: HTMLAudioElement,
  fadeRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
) {
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
 * Plays an audio file once when `shouldPlay` becomes true.
 * Fades in gently. Stops on unmount or when shouldPlay becomes false.
 *
 * Safari blocks autoplay, so if play() is rejected we attach a one-time
 * click/touchstart listener to retry on the next user gesture.
 */
export function useStoryletAudio(
  src: string | null | undefined,
  shouldPlay: boolean,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gestureCleanupRef = useRef<(() => void) | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    // Clean up everything when shouldPlay goes false or src changes
    if (!shouldPlay || !src) {
      if (fadeRef.current) clearInterval(fadeRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (gestureCleanupRef.current) {
        gestureCleanupRef.current();
        gestureCleanupRef.current = null;
      }
      // Reset played flag when shouldPlay goes false (new day / new game)
      if (!shouldPlay) playedRef.current = false;
      return;
    }

    // Only play once per activation
    if (playedRef.current) return;
    playedRef.current = true;

    const audio = new Audio(src);
    audio.loop = false;
    audio.volume = 0;
    audioRef.current = audio;

    // Try autoplay — works in Chrome after prior interaction
    audio.play().then(() => {
      fadeIn(audio, fadeRef);
    }).catch(() => {
      // Autoplay blocked (Safari) — wait for next user gesture
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
    };
  }, [src, shouldPlay]);
}
