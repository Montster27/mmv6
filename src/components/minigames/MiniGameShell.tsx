"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MiniGameType, MiniGameResult } from "@/types/storylets";

// ---------------------------------------------------------------------------
// Lazy-load each game (heavy canvas components — no SSR)
// ---------------------------------------------------------------------------

const SnakeGame = dynamic(() => import("./SnakeGame"), { ssr: false });
const CapsGame = dynamic(() => import("./CapsGame"), { ssr: false });
const MemoryCardGame = dynamic(() => import("./MemoryCardGame"), { ssr: false });

// ---------------------------------------------------------------------------
// Difficulty tracker — session-level adaptive difficulty
// ---------------------------------------------------------------------------

type DifficultyRecord = { wins: number; losses: number };

const difficultyStore: Record<string, DifficultyRecord> = {};

function getAdaptiveDifficulty(gameType: MiniGameType): number {
  const record = difficultyStore[gameType] ?? { wins: 0, losses: 0 };
  const total = record.wins + record.losses;
  if (total === 0) return 0.5; // start at medium
  // Win ratio shifts difficulty: more wins → harder, more losses → easier
  const winRate = record.wins / total;
  // Clamp to 0.2–0.9 range (never trivial, never impossible)
  return Math.max(0.2, Math.min(0.9, winRate));
}

function recordDifficultyResult(gameType: MiniGameType, won: boolean) {
  if (!difficultyStore[gameType]) {
    difficultyStore[gameType] = { wins: 0, losses: 0 };
  }
  if (won) {
    difficultyStore[gameType].wins++;
  } else {
    difficultyStore[gameType].losses++;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type MiniGameShellProps = {
  /** Which game to render. */
  gameType: MiniGameType;
  /** Optional config overrides from the storylet choice. */
  config?: Record<string, unknown>;
  /** Called when the game finishes. Parent uses result to resolve outcome. */
  onComplete: (result: MiniGameResult) => void;
  /** Called when the player cancels / backs out (if allowed). */
  onCancel?: () => void;
  /** Narrative framing text shown above the game. */
  flavorText?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MiniGameShell({
  gameType,
  config,
  onComplete,
  onCancel,
  flavorText,
}: MiniGameShellProps) {
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<MiniGameResult | null>(null);

  const difficulty = getAdaptiveDifficulty(gameType);

  const hasCalledComplete = useRef(false);

  const handleComplete = useCallback(
    (gameResult: MiniGameResult) => {
      // Guard: only call onComplete once per game instance.
      // CapsGame's held-key issue can fire onComplete multiple times;
      // this ref prevents duplicate API calls.
      if (hasCalledComplete.current) return;
      hasCalledComplete.current = true;

      recordDifficultyResult(gameType, gameResult.won);
      setResult(gameResult);
      setFinished(true);
      // Call onComplete immediately — the parent overlay (activeMiniGame) keeps
      // the result visible until the API response arrives. No delay needed here;
      // a 1500ms window created a race condition where the stale closure captured
      // in this setTimeout could call onComplete after activeMiniGame was cleared.
      onComplete(gameResult);
    },
    [gameType, onComplete]
  );

  const gameLabels: Record<MiniGameType, string> = {
    snake: "ARCADE — SERPENT",
    caps: "CAPS",
    memory: "MEMORY MATCH",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Title bar */}
      <div className="flex w-full items-center justify-between">
        <h2
          className="font-mono text-sm tracking-widest"
          style={{ color: "#33ff33" }}
        >
          {gameLabels[gameType]}
        </h2>
        {onCancel && !finished && (
          <button
            onClick={onCancel}
            className="font-mono text-xs text-gray-500 hover:text-gray-300"
          >
            [SKIP]
          </button>
        )}
      </div>

      {/* Flavor text */}
      {flavorText && !finished && (
        <p className="max-w-md text-center font-serif text-sm italic text-gray-400">
          {flavorText}
        </p>
      )}

      {/* Game area */}
      <div className="relative">
        {gameType === "snake" && (
          <SnakeGame
            onComplete={handleComplete}
            difficulty={difficulty}
            {...(config as Record<string, unknown>)}
          />
        )}
        {gameType === "caps" && (
          <CapsGame
            onComplete={handleComplete}
            difficulty={difficulty}
            config={config}
          />
        )}
        {gameType === "memory" && (
          <MemoryCardGame
            onComplete={handleComplete}
            difficulty={difficulty}
            config={config}
          />
        )}
      </div>

      {/* Result overlay */}
      {finished && result && (
        <div
          className="font-mono text-sm"
          style={{ color: result.won ? "#33ff33" : "#ff3333" }}
        >
          {result.won ? "YOU WIN" : "YOU LOSE"} — SCORE: {result.score}
        </div>
      )}
    </div>
  );
}
