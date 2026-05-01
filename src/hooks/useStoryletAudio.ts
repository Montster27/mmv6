"use client";

import { useEffect, useRef } from "react";

const FADE_IN_MS = 2000;
const TARGET_VOLUME = 0.25; // Clock-radio-quiet
const FADE_STEPS = 20;

// Browsers block audio.play() until the user has interacted with the page.
// On first Room 214 visit the engine mounts the audio before any click or
// keypress, so we gate every play call on a single global interaction flag
// instead of relying on play() rejection — Chrome doesn't always reject loudly
// and the prior listener-on-failure path missed the first-visit window.
let userInteracted = false;
const interactionWaiters: Array<() => void> = [];

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const onGesture = () => {
    if (userInteracted) return;
    userInteracted = true;
    document.removeEventListener("click", onGesture, true);
    document.removeEventListener("keydown", onGesture, true);
    document.removeEventListener("touchstart", onGesture, true);
    document.removeEventListener("pointerdown", onGesture, true);
    while (interactionWaiters.length > 0) {
      const cb = interactionWaiters.shift();
      try { cb?.(); } catch {}
    }
  };
  document.addEventListener("click", onGesture, { capture: true });
  document.addEventListener("keydown", onGesture, { capture: true });
  document.addEventListener("touchstart", onGesture, { capture: true });
  document.addEventListener("pointerdown", onGesture, { capture: true });
}

function whenInteracted(cb: () => void): () => void {
  if (userInteracted) {
    cb();
    return () => {};
  }
  interactionWaiters.push(cb);
  return () => {
    const idx = interactionWaiters.indexOf(cb);
    if (idx >= 0) interactionWaiters.splice(idx, 1);
  };
}

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
 * Defers the first play() until the player has interacted with the page —
 * required by every modern browser's autoplay policy. Subsequent plays in the
 * same tab fire immediately because the global flag stays set.
 */
export function useStoryletAudio(
  src: string | null | undefined,
  shouldPlay: boolean,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelWaitRef = useRef<(() => void) | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!shouldPlay || !src) {
      if (fadeRef.current) clearInterval(fadeRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (cancelWaitRef.current) {
        cancelWaitRef.current();
        cancelWaitRef.current = null;
      }
      if (!shouldPlay) playedRef.current = false;
      return;
    }

    if (playedRef.current) return;
    playedRef.current = true;

    let cancelled = false;

    cancelWaitRef.current = whenInteracted(() => {
      if (cancelled) return;
      const audio = new Audio(src);
      audio.loop = false;
      audio.volume = 0;
      audioRef.current = audio;
      audio.play().then(() => {
        if (!cancelled) fadeIn(audio, fadeRef);
      }).catch(() => {
        // play() can still reject (e.g., decoding error) — fail silent.
      });
    });

    return () => {
      cancelled = true;
      if (fadeRef.current) clearInterval(fadeRef.current);
      if (cancelWaitRef.current) {
        cancelWaitRef.current();
        cancelWaitRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src, shouldPlay]);
}
