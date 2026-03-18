"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Images ───────────────────────────────────────────────────────────────
   Drop these five files into /public/minigames/memory/ :
     police.jpg   walkman.jpg   notebook.jpg   socks.jpg   cassette.jpg
   ──────────────────────────────────────────────────────────────────────── */
const IMAGES = [
  { src: "/minigames/memory/police.jpg",   alt: "The Police poster" },
  { src: "/minigames/memory/walkman.jpg",  alt: "Walkman" },
  { src: "/minigames/memory/notebook.jpg", alt: "Spiral notebook" },
  { src: "/minigames/memory/socks.jpg",    alt: "Argyle socks" },
  { src: "/minigames/memory/cassette.jpg", alt: "Cassette tape" },
];

const PREVIEW_SECONDS = 4; // how long tiles stay face-up at the start

type Card = {
  id: number;        // unique per tile (0–9)
  imageIdx: number;  // 0–4, which image this tile shows
  flipped: boolean;  // face-up?
  matched: boolean;  // permanently revealed?
};

type Phase = "preview" | "playing" | "won";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): Card[] {
  const pairs = [...IMAGES, ...IMAGES].map((_, idx) => ({
    id: idx,
    imageIdx: idx % IMAGES.length,
    flipped: true,   // start face-up for preview
    matched: false,
  }));
  return shuffle(pairs);
}

type Props = {
  onResult: (result: "won" | "gave_up") => void;
};

export function MemoryGame({ onResult }: Props) {
  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [phase, setPhase] = useState<Phase>("preview");
  const [countdown, setCountdown] = useState(PREVIEW_SECONDS);
  const [selected, setSelected] = useState<number[]>([]); // indices of flipped-but-not-matched cards
  const [locked, setLocked] = useState(false);            // block clicks during mismatch delay
  const [moves, setMoves] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Preview countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "preview") return;
    timerRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timerRef.current!);
          // Flip all cards face-down to start the game
          setCards((prev) => prev.map((c) => ({ ...c, flipped: false })));
          setPhase("playing");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  // ── Click handler ───────────────────────────────────────────────────────
  const handleCardClick = useCallback(
    (idx: number) => {
      if (phase !== "playing") return;
      if (locked) return;
      const card = cards[idx];
      if (card.flipped || card.matched) return;
      if (selected.includes(idx)) return;

      const newCards = cards.map((c, i) =>
        i === idx ? { ...c, flipped: true } : c
      );
      setCards(newCards);

      const newSelected = [...selected, idx];

      if (newSelected.length === 1) {
        setSelected(newSelected);
        return;
      }

      // Two cards are now face-up — check for a match
      setMoves((m) => m + 1);
      const [first, second] = newSelected;
      const isMatch = newCards[first].imageIdx === newCards[second].imageIdx;

      if (isMatch) {
        const matched = newCards.map((c, i) =>
          i === first || i === second ? { ...c, matched: true } : c
        );
        setCards(matched);
        setSelected([]);
        const newMatchCount = matchCount + 1;
        setMatchCount(newMatchCount);
        if (newMatchCount === IMAGES.length) {
          // All pairs found
          setTimeout(() => setPhase("won"), 600);
        }
      } else {
        // Mismatch — flip both back after a short delay
        setLocked(true);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === first || i === second ? { ...c, flipped: false } : c
            )
          );
          setSelected([]);
          setLocked(false);
        }, 900);
      }
    },
    [cards, locked, matchCount, phase, selected]
  );

  // ── Win effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "won") {
      setTimeout(() => onResult("won"), 1800);
    }
  }, [phase, onResult]);

  // ── Card back — retro diagonal stripe pattern ───────────────────────────
  const CardBack = () => (
    <div
      className="absolute inset-0 rounded-md overflow-hidden"
      style={{
        background: "#2d5e6e",
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 6px,
          rgba(255,255,255,0.07) 6px,
          rgba(255,255,255,0.07) 7px
        )`,
      }}
    >
      <div className="absolute inset-[6px] rounded border border-white/20 flex items-center justify-center">
        <div className="text-white/30 text-xl font-bold tracking-widest select-none">
          ✦
        </div>
      </div>
    </div>
  );

  // ── Layout ──────────────────────────────────────────────────────────────
  return (
    <div className="select-none">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-3">
        {phase === "preview" && (
          <p className="text-sm text-amber-700 font-medium animate-pulse">
            Memorise the tiles… {countdown}s
          </p>
        )}
        {phase === "playing" && (
          <>
            <p className="text-sm text-muted-foreground">
              {matchCount} / {IMAGES.length} matched
            </p>
            <p className="text-xs text-muted-foreground">{moves} moves</p>
          </>
        )}
        {phase === "won" && (
          <p className="text-sm text-green-700 font-semibold animate-pulse">
            All matched! ✓
          </p>
        )}
      </div>

      {/* 5 × 2 grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
      >
        {cards.map((card, idx) => {
          const isUp = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(idx)}
              disabled={isUp || locked || phase !== "playing"}
              className="relative focus:outline-none"
              style={{ aspectRatio: "3/4" }}
              aria-label={isUp ? IMAGES[card.imageIdx].alt : "Hidden tile"}
            >
              {/* Flip container */}
              <div
                className="absolute inset-0 transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isUp ? "rotateY(0deg)" : "rotateY(180deg)",
                }}
              >
                {/* Front — image */}
                <div
                  className="absolute inset-0 rounded-md overflow-hidden shadow-sm border-2"
                  style={{
                    backfaceVisibility: "hidden",
                    borderColor: card.matched
                      ? "#22c55e"
                      : "rgba(0,0,0,0.12)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={IMAGES[card.imageIdx].src}
                    alt={IMAGES[card.imageIdx].alt}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {card.matched && (
                    <div className="absolute inset-0 bg-green-500/10 flex items-end justify-end p-1">
                      <span className="text-green-600 text-xs font-bold bg-white/80 rounded px-1">
                        ✓
                      </span>
                    </div>
                  )}
                </div>

                {/* Back — pattern */}
                <div
                  className="absolute inset-0 rounded-md shadow-sm border border-white/10 cursor-pointer hover:brightness-110 transition-[filter]"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <CardBack />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
