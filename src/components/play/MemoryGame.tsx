"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Full image pool (/public/minigames/memory/) ──────────────────────────
   Filenames are case-sensitive — match disk exactly.
   ──────────────────────────────────────────────────────────────────────── */
const IMAGE_POOL = [
  { src: "/minigames/memory/police.jpg",     alt: "The Police poster",      fit: "cover"   },
  { src: "/minigames/memory/walkman.jpg",    alt: "Walkman",                fit: "cover"   },
  { src: "/minigames/memory/notebook.jpg",   alt: "Spiral notebook",        fit: "cover"   },
  { src: "/minigames/memory/socks.jpg",      alt: "Argyle socks",           fit: "cover"   },
  { src: "/minigames/memory/cassette.jpg",   alt: "Cassette tape",          fit: "cover"   },
  { src: "/minigames/memory/Clash.jpg",      alt: "The Clash poster",       fit: "cover"   },
  { src: "/minigames/memory/blondie.jpg",    alt: "Blondie poster",         fit: "cover"   },
  { src: "/minigames/memory/Girl_hair.jpg",  alt: "Portrait",               fit: "cover"   },
  { src: "/minigames/memory/beer.jpg",       alt: "Stubby beer",            fit: "cover"   },
  { src: "/minigames/memory/VHS.jpg",        alt: "VHS tape",               fit: "contain" },
  { src: "/minigames/memory/c64.jpg",        alt: "Commodore 64",           fit: "contain" },
  { src: "/minigames/memory/coffee_mug.jpg", alt: "College mug",            fit: "contain" },
  { src: "/minigames/memory/flyer.jpg",      alt: "Protest flyer",          fit: "cover"   },
  { src: "/minigames/memory/id_card.jpg",    alt: "Student ID",             fit: "contain" },
  { src: "/minigames/memory/lava_lamp.jpg",  alt: "Lava lamp",              fit: "contain" },
  { src: "/minigames/memory/milk_crate.jpg", alt: "Milk-crate bookshelf",   fit: "contain" },
  { src: "/minigames/memory/rock_band.jpg",  alt: "Rock band poster",       fit: "contain" },
];

const PAIRS_PER_GAME = 6;         // 6 pairs = 12 tiles in a 4 × 3 grid
const PREVIEW_SECONDS = 4;
const COLS = 4;

type Card = {
  id: number;
  imageIdx: number;   // index into the per-game selectedImages array
  flipped: boolean;
  matched: boolean;
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

/** Pick N unique items at random from the pool */
function pickRandom<T>(pool: T[], n: number): T[] {
  return shuffle(pool).slice(0, n);
}

function buildDeck(images: typeof IMAGE_POOL): Card[] {
  const pairs = images.flatMap((_, idx) => [
    { id: idx * 2,     imageIdx: idx, flipped: true, matched: false },
    { id: idx * 2 + 1, imageIdx: idx, flipped: true, matched: false },
  ]);
  return shuffle(pairs);
}

type Props = {
  onResult: (result: "won" | "gave_up") => void;
};

export function MemoryGame({ onResult }: Props) {
  // Pick a fresh random set of images once on mount
  const [selectedImages] = useState(() => pickRandom(IMAGE_POOL, PAIRS_PER_GAME));
  const [cards, setCards] = useState<Card[]>(() => buildDeck(selectedImages));
  const [phase, setPhase] = useState<Phase>("preview");
  const [countdown, setCountdown] = useState(PREVIEW_SECONDS);
  const [selected, setSelected] = useState<number[]>([]);   // card array indices
  const [locked, setLocked] = useState(false);
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
          setCards((prev) => prev.map((c) => ({ ...c, flipped: false })));
          setPhase("playing");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  // ── Card click ──────────────────────────────────────────────────────────
  const handleCardClick = useCallback(
    (idx: number) => {
      if (phase !== "playing" || locked) return;
      const card = cards[idx];
      if (card.flipped || card.matched || selected.includes(idx)) return;

      const next = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
      setCards(next);
      const nowSelected = [...selected, idx];

      if (nowSelected.length === 1) {
        setSelected(nowSelected);
        return;
      }

      // Two face-up: check match
      setMoves((m) => m + 1);
      const [a, b] = nowSelected;
      const isMatch = next[a].imageIdx === next[b].imageIdx;

      if (isMatch) {
        const withMatch = next.map((c, i) =>
          i === a || i === b ? { ...c, matched: true } : c
        );
        setCards(withMatch);
        setSelected([]);
        const newCount = matchCount + 1;
        setMatchCount(newCount);
        if (newCount === PAIRS_PER_GAME) {
          setTimeout(() => setPhase("won"), 600);
        }
      } else {
        setLocked(true);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, flipped: false } : c
            )
          );
          setSelected([]);
          setLocked(false);
        }, 900);
      }
    },
    [cards, locked, matchCount, phase, selected]
  );

  // ── Win ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "won") setTimeout(() => onResult("won"), 1800);
  }, [phase, onResult]);

  // ── Card back ───────────────────────────────────────────────────────────
  function CardBack() {
    return (
      <div
        className="absolute inset-0 rounded-md overflow-hidden"
        style={{
          background: "#2d5e6e",
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent, transparent 6px,
            rgba(255,255,255,0.07) 6px, rgba(255,255,255,0.07) 7px
          )`,
        }}
      >
        <div className="absolute inset-[5px] rounded border border-white/20 flex items-center justify-center">
          <span className="text-white/25 text-lg select-none">✦</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="select-none">
      {/* Status */}
      <div className="flex items-center justify-between mb-3 min-h-[20px]">
        {phase === "preview" && (
          <p className="text-sm text-amber-700 font-medium animate-pulse">
            Memorise the tiles… {countdown}s
          </p>
        )}
        {phase === "playing" && (
          <>
            <p className="text-sm text-muted-foreground">
              {matchCount} / {PAIRS_PER_GAME} matched
            </p>
            <p className="text-xs text-muted-foreground">{moves} moves</p>
          </>
        )}
        {phase === "won" && (
          <p className="text-sm text-green-700 font-semibold animate-pulse">
            All matched ✓
          </p>
        )}
      </div>

      {/* Grid — 4 cols × 3 rows */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {cards.map((card, idx) => {
          const isUp = card.flipped || card.matched;
          const img = selectedImages[card.imageIdx];

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(idx)}
              disabled={isUp || locked || phase !== "playing"}
              className="relative focus:outline-none group"
              style={{ aspectRatio: "3/4" }}
              aria-label={isUp ? img.alt : "Hidden tile"}
            >
              <div
                className="absolute inset-0 transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isUp ? "rotateY(0deg)" : "rotateY(180deg)",
                }}
              >
                {/* Front — image */}
                <div
                  className="absolute inset-0 rounded-md overflow-hidden shadow-sm border-2 transition-colors"
                  style={{
                    backfaceVisibility: "hidden",
                    borderColor: card.matched ? "#22c55e" : "rgba(0,0,0,0.1)",
                    background: "#f5f0e8",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full h-full"
                    style={{ objectFit: img.fit as "cover" | "contain" }}
                    draggable={false}
                  />
                  {card.matched && (
                    <div className="absolute inset-0 bg-green-400/10 flex items-end justify-end p-1">
                      <span className="text-green-600 text-[10px] font-bold bg-white/80 rounded px-1">
                        ✓
                      </span>
                    </div>
                  )}
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-md shadow-sm border border-white/10 group-hover:brightness-110 transition-[filter] cursor-pointer"
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
