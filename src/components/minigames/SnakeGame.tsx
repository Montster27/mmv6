"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

type GameState = "waiting" | "playing" | "won" | "lost";

type SnakeGameProps = {
  /** Grid cells wide (default 20) */
  gridWidth?: number;
  /** Grid cells tall (default 20) */
  gridHeight?: number;
  /** Pixels per grid cell (default 16) */
  cellSize?: number;
  /** Starting speed in ms per tick (default 150). Lower = faster. */
  baseSpeed?: number;
  /** Score needed to win. Default 15 food eaten. */
  winScore?: number;
  /** Max game duration in seconds (default 120 — 2 minutes). */
  maxSeconds?: number;
  /** Called when the game ends. */
  onComplete?: (result: { won: boolean; score: number }) => void;
  /** Adaptive difficulty level 0-1. Affects speed and win threshold. */
  difficulty?: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHOSPHOR_GREEN = "#33ff33";
const PHOSPHOR_DIM = "#0a3a0a";
const PHOSPHOR_BG = "#0a0a0a";
const FOOD_COLOR = "#66ff66";
const SCANLINE_ALPHA = 0.08;

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomFood(
  gridW: number,
  gridH: number,
  snake: Point[]
): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  let p: Point;
  do {
    p = {
      x: Math.floor(Math.random() * gridW),
      y: Math.floor(Math.random() * gridH),
    };
  } while (occupied.has(`${p.x},${p.y}`));
  return p;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SnakeGame({
  gridWidth = 20,
  gridHeight = 20,
  cellSize = 16,
  baseSpeed = 150,
  winScore = 15,
  maxSeconds = 120,
  onComplete,
  difficulty = 0.5,
}: SnakeGameProps) {
  // Adjust difficulty
  const adjustedSpeed = Math.round(baseSpeed * (1 - difficulty * 0.4));
  const adjustedWin = Math.round(winScore * (0.7 + difficulty * 0.6));

  const canvasW = gridWidth * cellSize;
  const canvasH = gridHeight * cellSize;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const dirQueueRef = useRef<Direction[]>([]);

  const [gameState, setGameState] = useState<GameState>("waiting");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(maxSeconds);
  const [highScore, setHighScore] = useState(0);

  // Game state refs (avoid stale closures in rAF loop)
  const snakeRef = useRef<Point[]>([]);
  const dirRef = useRef<Direction>("RIGHT");
  const foodRef = useRef<Point>({ x: 10, y: 10 });
  const scoreRef = useRef(0);
  const stateRef = useRef<GameState>("waiting");
  const startTimeRef = useRef(0);
  const speedRef = useRef(adjustedSpeed);

  // Sync state ref
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = PHOSPHOR_BG;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid lines (very subtle)
    ctx.strokeStyle = PHOSPHOR_DIM;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvasH);
      ctx.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvasW, y * cellSize);
      ctx.stroke();
    }

    // Food
    const f = foodRef.current;
    ctx.fillStyle = FOOD_COLOR;
    ctx.shadowColor = FOOD_COLOR;
    ctx.shadowBlur = 8;
    ctx.fillRect(
      f.x * cellSize + 2,
      f.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );
    ctx.shadowBlur = 0;

    // Snake
    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      const brightness = 1 - (i / snake.length) * 0.5;
      const g = Math.round(255 * brightness);
      ctx.fillStyle = `rgb(0, ${g}, 0)`;
      ctx.shadowColor = PHOSPHOR_GREEN;
      ctx.shadowBlur = i === 0 ? 6 : 2;
      ctx.fillRect(
        seg.x * cellSize + 1,
        seg.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });
    ctx.shadowBlur = 0;

    // Scanlines
    ctx.fillStyle = `rgba(0, 0, 0, ${SCANLINE_ALPHA})`;
    for (let y = 0; y < canvasH; y += 3) {
      ctx.fillRect(0, y, canvasW, 1);
    }

    // CRT vignette
    const gradient = ctx.createRadialGradient(
      canvasW / 2,
      canvasH / 2,
      canvasW * 0.3,
      canvasW / 2,
      canvasH / 2,
      canvasW * 0.7
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }, [canvasW, canvasH, cellSize, gridWidth, gridHeight]);

  // ------------------------------------------------------------------
  // Game tick
  // ------------------------------------------------------------------

  const tick = useCallback(() => {
    // Process direction queue
    while (dirQueueRef.current.length > 0) {
      const next = dirQueueRef.current.shift()!;
      if (next !== OPPOSITE[dirRef.current]) {
        dirRef.current = next;
        break;
      }
    }

    const snake = snakeRef.current;
    const head = snake[0];
    const dir = dirRef.current;

    // Move head
    let nx = head.x;
    let ny = head.y;
    if (dir === "UP") ny--;
    if (dir === "DOWN") ny++;
    if (dir === "LEFT") nx--;
    if (dir === "RIGHT") nx++;

    // Wall collision
    if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) {
      endGame(false);
      return;
    }

    // Self collision
    if (snake.some((s) => s.x === nx && s.y === ny)) {
      endGame(false);
      return;
    }

    const newHead = { x: nx, y: ny };
    const newSnake = [newHead, ...snake];

    // Food check
    if (nx === foodRef.current.x && ny === foodRef.current.y) {
      scoreRef.current++;
      setScore(scoreRef.current);

      // Speed up slightly with each food
      speedRef.current = Math.max(60, speedRef.current - 3);

      if (scoreRef.current >= adjustedWin) {
        snakeRef.current = newSnake;
        endGame(true);
        return;
      }

      foodRef.current = randomFood(gridWidth, gridHeight, newSnake);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;

    // Time check
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const remaining = Math.max(0, maxSeconds - Math.floor(elapsed));
    setTimeLeft(remaining);
    if (remaining <= 0) {
      endGame(false);
    }
  }, [gridWidth, gridHeight, adjustedWin, maxSeconds]);

  // ------------------------------------------------------------------
  // Game loop
  // ------------------------------------------------------------------

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (stateRef.current !== "playing") return;

      if (timestamp - lastTickRef.current >= speedRef.current) {
        tick();
        lastTickRef.current = timestamp;
      }

      draw();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [tick, draw]
  );

  // ------------------------------------------------------------------
  // Start / End
  // ------------------------------------------------------------------

  const startGame = useCallback(() => {
    const midX = Math.floor(gridWidth / 2);
    const midY = Math.floor(gridHeight / 2);
    snakeRef.current = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    dirRef.current = "RIGHT";
    dirQueueRef.current = [];
    foodRef.current = randomFood(gridWidth, gridHeight, snakeRef.current);
    scoreRef.current = 0;
    speedRef.current = adjustedSpeed;
    startTimeRef.current = performance.now();
    setScore(0);
    setTimeLeft(maxSeconds);
    setGameState("playing");

    lastTickRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gridWidth, gridHeight, adjustedSpeed, maxSeconds, gameLoop]);

  const endGame = useCallback(
    (won: boolean) => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      const finalState = won ? "won" : "lost";
      setGameState(finalState);
      stateRef.current = finalState;
      if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      draw();
      onComplete?.({ won, score: scoreRef.current });
    },
    [draw, onComplete, highScore]
  );

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (stateRef.current === "waiting" && e.key === " ") {
        e.preventDefault();
        startGame();
        return;
      }

      if (stateRef.current !== "playing") return;

      let dir: Direction | null = null;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dir = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dir = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dir = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dir = "RIGHT";
          break;
      }

      if (dir) {
        e.preventDefault();
        dirQueueRef.current.push(dir);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  // Initial draw
  useEffect(() => {
    if (gameState === "waiting") {
      const midX = Math.floor(gridWidth / 2);
      const midY = Math.floor(gridHeight / 2);
      snakeRef.current = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY },
      ];
      foodRef.current = randomFood(gridWidth, gridHeight, snakeRef.current);
      draw();
    }
  }, [gameState, gridWidth, gridHeight, draw]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Cabinet bezel */}
      <div
        className="relative rounded-lg border-4 p-3"
        style={{
          borderColor: "#2a2a2a",
          backgroundColor: "#1a1a1a",
          boxShadow:
            "inset 0 0 30px rgba(0,255,0,0.05), 0 0 20px rgba(0,0,0,0.5)",
        }}
      >
        {/* Title strip */}
        <div
          className="mb-2 text-center font-mono text-xs tracking-widest"
          style={{ color: PHOSPHOR_GREEN }}
        >
          S N A K E
        </div>

        {/* HUD */}
        <div
          className="mb-1 flex justify-between font-mono text-xs"
          style={{ color: PHOSPHOR_GREEN, width: canvasW }}
        >
          <span>SCORE: {String(score).padStart(3, "0")}</span>
          <span>
            {gameState === "playing"
              ? `TIME: ${String(timeLeft).padStart(3, "0")}`
              : gameState === "won"
                ? "HIGH SCORE!"
                : gameState === "lost"
                  ? "GAME OVER"
                  : "INSERT QUARTER"}
          </span>
          <span>HI: {String(Math.max(score, highScore)).padStart(3, "0")}</span>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          className="block rounded"
          style={{
            imageRendering: "pixelated",
            border: `1px solid ${PHOSPHOR_DIM}`,
          }}
        />

        {/* Overlay messages */}
        {gameState === "waiting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startGame}
              className="animate-pulse rounded px-4 py-2 font-mono text-sm"
              style={{
                color: PHOSPHOR_GREEN,
                border: `1px solid ${PHOSPHOR_GREEN}`,
                backgroundColor: "rgba(0,0,0,0.8)",
              }}
            >
              PRESS SPACE OR CLICK TO START
            </button>
          </div>
        )}

        {(gameState === "won" || gameState === "lost") && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded px-6 py-4 text-center font-mono"
              style={{
                color: PHOSPHOR_GREEN,
                backgroundColor: "rgba(0,0,0,0.85)",
                border: `1px solid ${PHOSPHOR_GREEN}`,
              }}
            >
              <div className="text-lg">
                {gameState === "won" ? "HIGH SCORE!" : "GAME OVER"}
              </div>
              <div className="mt-1 text-sm">
                SCORE: {score} / {adjustedWin}
              </div>
              <button
                onClick={startGame}
                className="mt-3 rounded px-3 py-1 text-xs"
                style={{
                  border: `1px solid ${PHOSPHOR_GREEN}`,
                  color: PHOSPHOR_GREEN,
                  backgroundColor: "transparent",
                }}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div
        className="font-mono text-xs"
        style={{ color: "rgba(51, 255, 51, 0.5)" }}
      >
        ARROW KEYS OR WASD TO MOVE
      </div>
    </div>
  );
}
