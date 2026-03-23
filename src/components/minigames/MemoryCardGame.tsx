"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MiniGameProps } from "@/types/storylets";

// ---------------------------------------------------------------------------
// Memory Card Game — Pair matching on a dorm room floor
//
// Cards laid face-down. Flip two at a time. Match pairs. Timer ticking.
// Fewer turns / faster time = win. Adaptive difficulty controls grid size
// and time limit.
//
// Visual: playing cards on a towel — warm amber palette, not green CRT.
// ---------------------------------------------------------------------------

type Card = {
  id: number;
  symbol: string;
  matched: boolean;
  flipped: boolean;
};

type GamePhase = "waiting" | "playing" | "won" | "lost";

// Card symbols — playing card style (suits + values)
const CARD_SYMBOLS = [
  "A♠", "K♥", "Q♣", "J♦",
  "10♠", "9♥", "8♣", "7♦",
  "6♠", "5♥", "4♣", "3♦",
  "2♠", "A♥", "K♣", "Q♦",
  "J♠", "10♥", "9♣", "8♦",
];

// Colors
const CARD_BG = "#1a150e";
const CARD_FACE = "#f5f0e6";
const CARD_BACK = "#8b0000"; // deep red card back
const CARD_BACK_PATTERN = "#6b0000";
const MATCH_GLOW = "#33ff33";
const AMBER = "#d4a030";
const AMBER_DIM = "#3a2a08";

export default function MemoryCardGame({
  onComplete,
  difficulty = 0.5,
  config,
}: MiniGameProps) {
  // Difficulty scales: grid size and time limit
  // Easy (0.2): 4x3 = 6 pairs, 90s
  // Medium (0.5): 4x4 = 8 pairs, 75s
  // Hard (0.8): 5x4 = 10 pairs, 60s
  const cols = difficulty < 0.4 ? 4 : difficulty < 0.7 ? 4 : 5;
  const rows = difficulty < 0.4 ? 3 : 4;
  const pairCount = (cols * rows) / 2;
  const maxSeconds = Math.round(90 - difficulty * 40); // 90 → 50
  const maxMisses = (config?.maxMisses as number) ?? Math.round(pairCount * 2.5);

  const [cards, setCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(maxSeconds);
  const [locked, setLocked] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchesRef = useRef(0);
  const missesRef = useRef(0);

  // ------------------------------------------------------------------
  // Initialize board
  // ------------------------------------------------------------------

  const initBoard = useCallback(() => {
    const symbols = CARD_SYMBOLS.slice(0, pairCount);
    const deck = [...symbols, ...symbols].map((symbol, i) => ({
      id: i,
      symbol,
      matched: false,
      flipped: false,
    }));
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setCards(deck);
    setFlippedIds([]);
    setMatches(0);
    setMisses(0);
    setTimeLeft(maxSeconds);
    setLocked(false);
    matchesRef.current = 0;
    missesRef.current = 0;
  }, [pairCount, maxSeconds]);

  // ------------------------------------------------------------------
  // Start game
  // ------------------------------------------------------------------

  const startGame = useCallback(() => {
    initBoard();
    setPhase("playing");
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("lost");
          onComplete({ won: false, score: matchesRef.current });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initBoard, onComplete]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ------------------------------------------------------------------
  // Card flip logic
  // ------------------------------------------------------------------

  const handleCardClick = useCallback(
    (cardId: number) => {
      if (phase !== "playing" || locked) return;

      const card = cards.find((c) => c.id === cardId);
      if (!card || card.matched || card.flipped) return;

      const newFlipped = [...flippedIds, cardId];

      // Flip the card
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, flipped: true } : c))
      );
      setFlippedIds(newFlipped);

      if (newFlipped.length === 2) {
        setLocked(true);
        const [firstId, secondId] = newFlipped;
        const first = cards.find((c) => c.id === firstId)!;
        const second = cards.find((c) => c.id === secondId)!;

        if (first.symbol === second.symbol) {
          // Match!
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === firstId || c.id === secondId
                  ? { ...c, matched: true }
                  : c
              )
            );
            const newMatches = matchesRef.current + 1;
            matchesRef.current = newMatches;
            setMatches(newMatches);
            setFlippedIds([]);
            setLocked(false);

            // Check win
            if (newMatches >= pairCount) {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase("won");
              onComplete({ won: true, score: newMatches });
            }
          }, 400);
        } else {
          // No match — flip back after brief reveal
          const newMisses = missesRef.current + 1;
          missesRef.current = newMisses;
          setMisses(newMisses);

          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === firstId || c.id === secondId
                  ? { ...c, flipped: false }
                  : c
              )
            );
            setFlippedIds([]);
            setLocked(false);

            // Check miss limit
            if (newMisses >= maxMisses) {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase("lost");
              onComplete({ won: false, score: matchesRef.current });
            }
          }, 700);
        }
      }
    },
    [cards, flippedIds, phase, locked, pairCount, maxMisses, onComplete]
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const cardW = 56;
  const cardH = 72;
  const gap = 8;
  const boardW = cols * (cardW + gap) - gap;
  const boardH = rows * (cardH + gap) - gap;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* HUD */}
      <div
        className="flex w-full justify-between font-mono text-xs"
        style={{ color: AMBER, maxWidth: boardW }}
      >
        <span>PAIRS: {matches}/{pairCount}</span>
        <span>MISSES: {misses}/{maxMisses}</span>
        <span>TIME: {timeLeft}s</span>
      </div>

      {/* Board */}
      <div
        className="relative rounded-lg p-4"
        style={{
          backgroundColor: "#2a2218",
          border: `1px solid ${AMBER_DIM}`,
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.01) 10px, rgba(255,255,255,0.01) 20px)",
        }}
      >
        {phase === "waiting" ? (
          <div
            className="flex items-center justify-center"
            style={{ width: boardW, height: boardH }}
          >
            <button
              onClick={startGame}
              className="animate-pulse rounded px-6 py-3 font-mono text-sm"
              style={{
                color: AMBER,
                border: `1px solid ${AMBER}`,
                backgroundColor: "rgba(0,0,0,0.6)",
              }}
            >
              DEAL CARDS
            </button>
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${cardW}px)`,
              gap: `${gap}px`,
            }}
          >
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.matched || card.flipped || locked || phase !== "playing"}
                className="relative transition-transform duration-150"
                style={{
                  width: cardW,
                  height: cardH,
                  perspective: "200px",
                  transform: card.flipped || card.matched ? "rotateY(0)" : "",
                }}
              >
                {/* Card face */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-md font-mono text-sm font-bold"
                  style={{
                    backgroundColor:
                      card.matched
                        ? "rgba(51, 255, 51, 0.15)"
                        : card.flipped
                          ? CARD_FACE
                          : CARD_BACK,
                    color: card.matched
                      ? MATCH_GLOW
                      : card.flipped
                        ? card.symbol.includes("♥") || card.symbol.includes("♦")
                          ? "#cc0000"
                          : "#111"
                        : CARD_BACK_PATTERN,
                    border: card.matched
                      ? `1px solid ${MATCH_GLOW}`
                      : `1px solid ${AMBER_DIM}`,
                    boxShadow: card.matched
                      ? `0 0 8px ${MATCH_GLOW}`
                      : "none",
                    cursor:
                      card.matched || card.flipped || locked
                        ? "default"
                        : "pointer",
                    fontSize: card.flipped || card.matched ? "16px" : "20px",
                  }}
                >
                  {card.flipped || card.matched ? (
                    card.symbol
                  ) : (
                    <span style={{ opacity: 0.5 }}>✦</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result overlay */}
      {(phase === "won" || phase === "lost") && (
        <div
          className="font-mono text-sm"
          style={{ color: phase === "won" ? "#33ff33" : "#ff5050" }}
        >
          {phase === "won"
            ? `ALL PAIRS FOUND — ${misses} misses`
            : timeLeft <= 0
              ? "TIME'S UP"
              : `TOO MANY MISSES (${misses}/${maxMisses})`}
        </div>
      )}

      {/* Controls hint */}
      <div className="font-mono text-xs" style={{ color: "rgba(212, 160, 48, 0.4)" }}>
        {phase === "playing" ? "CLICK CARDS TO FLIP" : ""}
      </div>
    </div>
  );
}
