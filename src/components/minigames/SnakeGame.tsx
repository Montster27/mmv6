"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type GameState = "waiting" | "coin" | "playing" | "dying" | "won" | "lost";

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
  /** Max game duration in seconds (default 120). */
  maxSeconds?: number;
  /** Called when the game ends. */
  onComplete?: (result: { won: boolean; score: number }) => void;
  /** Adaptive difficulty level 0-1. Affects speed and win threshold. */
  difficulty?: number;
  /** Number of attempts the player gets (default 3). */
  maxAttempts?: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHOSPHOR_GREEN = "#33ff33";
const PHOSPHOR_DIM = "#0a3a0a";
const PHOSPHOR_BG = "#0a0a0a";

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

// Asset paths
const ASSET = "/assets";
const HEAD_SPRITES: Record<Direction, string> = {
  UP: `${ASSET}/snake_head_up.png`,
  DOWN: `${ASSET}/snake_head_down.png`,
  LEFT: `${ASSET}/snake_head_left.png`,
  RIGHT: `${ASSET}/snake_head_right.png`,
};

// Sprite sheet layout
const FOOD_FRAMES = 4;
const FOOD_FRAME_W = 16;
const DEATH_FRAMES = 6;
const DEATH_FRAME_W = 16;
const COIN_FRAMES = 6;
const COIN_FRAME_W = 32;
const COIN_FRAME_H = 32;

// Bezel layout: canvas sits inside the cabinet bezel
const BEZEL_W = 400;
const BEZEL_H = 500;
const CANVAS_OFFSET_X = 40; // where the transparent hole starts
const CANVAS_OFFSET_Y = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomFood(gridW: number, gridH: number, snake: Point[]): Point {
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
  maxAttempts = 3,
}: SnakeGameProps) {
  const adjustedSpeed = Math.round(baseSpeed * (1 - difficulty * 0.4));
  const adjustedWin = Math.round(winScore * (0.7 + difficulty * 0.6));

  const canvasW = gridWidth * cellSize; // 320
  const canvasH = gridHeight * cellSize; // 320

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const dirQueueRef = useRef<Direction[]>([]);

  const [gameState, setGameState] = useState<GameState>("waiting");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(maxSeconds);
  const [highScore, setHighScore] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Game state refs
  const snakeRef = useRef<Point[]>([]);
  const dirRef = useRef<Direction>("RIGHT");
  const foodRef = useRef<Point>({ x: 10, y: 10 });
  const scoreRef = useRef(0);
  const stateRef = useRef<GameState>("waiting");
  const startTimeRef = useRef(0);
  const speedRef = useRef(adjustedSpeed);

  // Animation refs
  const foodFrameRef = useRef(0);
  const foodTickRef = useRef(0);
  const deathFrameRef = useRef(0);
  const deathPosRef = useRef<Point>({ x: 0, y: 0 });
  const coinFrameRef = useRef(0);

  // Loaded images
  const imagesRef = useRef<{
    heads: Record<Direction, HTMLImageElement>;
    food: HTMLImageElement;
    death: HTMLImageElement;
    coin: HTMLImageElement;
    crt: HTMLImageElement;
  } | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Sync state ref
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  // ------------------------------------------------------------------
  // Load assets
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [headUp, headDown, headLeft, headRight, food, death, coin, crt] =
          await Promise.all([
            loadImage(HEAD_SPRITES.UP),
            loadImage(HEAD_SPRITES.DOWN),
            loadImage(HEAD_SPRITES.LEFT),
            loadImage(HEAD_SPRITES.RIGHT),
            loadImage(`${ASSET}/food_strip.png`),
            loadImage(`${ASSET}/death_strip.png`),
            loadImage(`${ASSET}/coin_strip.png`),
            loadImage(`${ASSET}/crt_overlay.png`),
          ]);
        if (cancelled) return;
        imagesRef.current = {
          heads: { UP: headUp, DOWN: headDown, LEFT: headLeft, RIGHT: headRight },
          food,
          death,
          coin,
          crt,
        };
        setAssetsLoaded(true);
      } catch {
        // Fallback: run without sprites
        console.warn("Snake game: some assets failed to load, using fallback rendering");
        setAssetsLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const imgs = imagesRef.current;

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

    // Food (animated sprite or fallback)
    const f = foodRef.current;
    foodTickRef.current++;
    if (foodTickRef.current % 10 === 0) {
      foodFrameRef.current = (foodFrameRef.current + 1) % FOOD_FRAMES;
    }
    if (imgs?.food) {
      ctx.drawImage(
        imgs.food,
        foodFrameRef.current * FOOD_FRAME_W, 0, FOOD_FRAME_W, 16,
        f.x * cellSize, f.y * cellSize, cellSize, cellSize
      );
    } else {
      ctx.fillStyle = "#66ff66";
      ctx.shadowColor = "#66ff66";
      ctx.shadowBlur = 8;
      ctx.fillRect(f.x * cellSize + 2, f.y * cellSize + 2, cellSize - 4, cellSize - 4);
      ctx.shadowBlur = 0;
    }

    // Snake body (drawn before head so head overlaps)
    const snake = snakeRef.current;
    for (let i = snake.length - 1; i >= 1; i--) {
      const seg = snake[i];
      const brightness = 1 - (i / snake.length) * 0.5;
      const g = Math.round(255 * brightness);
      ctx.fillStyle = `rgb(0, ${g}, 0)`;
      ctx.shadowColor = PHOSPHOR_GREEN;
      ctx.shadowBlur = 2;
      ctx.fillRect(
        seg.x * cellSize + 1,
        seg.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    }
    ctx.shadowBlur = 0;

    // Snake head (sprite or fallback)
    if (snake.length > 0 && stateRef.current !== "dying") {
      const head = snake[0];
      const headImg = imgs?.heads[dirRef.current];
      if (headImg) {
        ctx.drawImage(
          headImg,
          head.x * cellSize,
          head.y * cellSize,
          cellSize,
          cellSize
        );
      } else {
        ctx.fillStyle = PHOSPHOR_GREEN;
        ctx.shadowColor = PHOSPHOR_GREEN;
        ctx.shadowBlur = 6;
        ctx.fillRect(
          head.x * cellSize + 1,
          head.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
        ctx.shadowBlur = 0;
      }
    }

    // Death animation
    if (stateRef.current === "dying" && imgs?.death) {
      const dp = deathPosRef.current;
      ctx.drawImage(
        imgs.death,
        deathFrameRef.current * DEATH_FRAME_W, 0, DEATH_FRAME_W, 16,
        dp.x * cellSize, dp.y * cellSize, cellSize, cellSize
      );
    }

    // Scanlines (drawn on canvas for pixel-perfect look)
    ctx.fillStyle = `rgba(0, 0, 0, 0.06)`;
    for (let y = 0; y < canvasH; y += 3) {
      ctx.fillRect(0, y, canvasW, 1);
    }

    // CRT overlay (glass reflection)
    if (imgs?.crt) {
      ctx.globalAlpha = 0.15;
      ctx.drawImage(imgs.crt, 0, 0, canvasW, canvasH);
      ctx.globalAlpha = 1;
    }
  }, [canvasW, canvasH, cellSize, gridWidth, gridHeight]);

  // ------------------------------------------------------------------
  // Game tick
  // ------------------------------------------------------------------

  const endGame = useCallback(
    (won: boolean) => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (scoreRef.current > highScore) setHighScore(scoreRef.current);
      setBestScore((prev) => Math.max(prev, scoreRef.current));
      draw();

      if (won) {
        // Win — report immediately
        setGameState("won");
        stateRef.current = "won";
        onComplete?.({ won: true, score: scoreRef.current });
      } else {
        setAttempt((prev) => {
          const next = prev + 1;
          if (next >= maxAttempts) {
            // No more tries — final loss
            setGameState("lost");
            stateRef.current = "lost";
            onComplete?.({ won: false, score: scoreRef.current });
          } else {
            // Tries remain — show retry screen
            setGameState("lost");
            stateRef.current = "lost";
          }
          return next;
        });
      }
    },
    [draw, onComplete, highScore, maxAttempts]
  );

  const startDeathAnim = useCallback(() => {
    if (snakeRef.current.length > 0) {
      deathPosRef.current = { ...snakeRef.current[0] };
    }
    deathFrameRef.current = 0;
    setGameState("dying");
    stateRef.current = "dying";

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      deathFrameRef.current = frame;
      draw();
      if (frame >= DEATH_FRAMES - 1) {
        clearInterval(interval);
        endGame(false);
      }
    }, 100);
  }, [draw, endGame]);

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

    let nx = head.x;
    let ny = head.y;
    if (dir === "UP") ny--;
    if (dir === "DOWN") ny++;
    if (dir === "LEFT") nx--;
    if (dir === "RIGHT") nx++;

    // Wall collision
    if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) {
      startDeathAnim();
      return;
    }

    // Self collision
    if (snake.some((s) => s.x === nx && s.y === ny)) {
      startDeathAnim();
      return;
    }

    const newHead = { x: nx, y: ny };
    const newSnake = [newHead, ...snake];

    // Food check
    if (nx === foodRef.current.x && ny === foodRef.current.y) {
      scoreRef.current++;
      setScore(scoreRef.current);
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
      startDeathAnim();
    }
  }, [gridWidth, gridHeight, adjustedWin, maxSeconds, startDeathAnim, endGame]);

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
  // Coin insert animation
  // ------------------------------------------------------------------

  const playCoinAnim = useCallback(() => {
    setGameState("coin");
    stateRef.current = "coin";
    coinFrameRef.current = 0;

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      coinFrameRef.current = frame;
      if (frame >= COIN_FRAMES - 1) {
        clearInterval(interval);
        // Start actual game
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
        stateRef.current = "playing";
        lastTickRef.current = performance.now();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      }
    }, 120);
  }, [gridWidth, gridHeight, adjustedSpeed, maxSeconds, gameLoop]);

  const startGame = useCallback(() => {
    if (imagesRef.current?.coin) {
      playCoinAnim();
    } else {
      // No coin sprite — start directly
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
      stateRef.current = "playing";
      lastTickRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [playCoinAnim, gridWidth, gridHeight, adjustedSpeed, maxSeconds, gameLoop]);

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
      // Allow retry on loss only if attempts remain
      if (stateRef.current === "lost" && attempt < maxAttempts && e.key === " ") {
        e.preventDefault();
        startGame();
        return;
      }

      if (stateRef.current !== "playing") return;

      let dir: Direction | null = null;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": dir = "UP"; break;
        case "ArrowDown": case "s": case "S": dir = "DOWN"; break;
        case "ArrowLeft": case "a": case "A": dir = "LEFT"; break;
        case "ArrowRight": case "d": case "D": dir = "RIGHT"; break;
      }

      if (dir) {
        e.preventDefault();
        dirQueueRef.current.push(dir);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame, attempt, maxAttempts]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  // Initial draw
  useEffect(() => {
    if (assetsLoaded && gameState === "waiting") {
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
  }, [assetsLoaded, gameState, gridWidth, gridHeight, draw]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (!assetsLoaded) {
    return (
      <div className="flex items-center justify-center p-8 font-mono text-sm" style={{ color: PHOSPHOR_GREEN }}>
        LOADING...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Cabinet bezel wrapper */}
      <div
        className="relative"
        style={{ width: BEZEL_W, height: BEZEL_H }}
      >
        {/* Bezel image */}
        <img
          src={`${ASSET}/cabinet_bezel.png`}
          alt=""
          className="pointer-events-none absolute inset-0"
          style={{
            width: BEZEL_W,
            height: BEZEL_H,
            imageRendering: "pixelated",
            zIndex: 2,
          }}
        />

        {/* Game area positioned inside the bezel */}
        <div
          className="absolute"
          style={{
            left: CANVAS_OFFSET_X,
            top: CANVAS_OFFSET_Y,
            width: canvasW,
            height: canvasH,
          }}
        >
          {/* HUD */}
          <div
            className="mb-1 flex justify-between font-mono"
            style={{
              color: PHOSPHOR_GREEN,
              fontSize: "10px",
              width: canvasW,
              position: "absolute",
              top: -14,
              zIndex: 3,
            }}
          >
            <span>SCORE:{String(score).padStart(3, "0")}</span>
            <span>
              {gameState === "playing"
                ? `TIME:${String(timeLeft).padStart(3, "0")}`
                : gameState === "won"
                  ? "HIGH SCORE!"
                  : gameState === "lost"
                    ? "GAME OVER"
                    : gameState === "coin"
                      ? "INSERT COIN..."
                      : "READY?"}
            </span>
            <span>LIFE:{maxAttempts - attempt}/{maxAttempts}</span>
          </div>

          {/* Game canvas */}
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="block"
            style={{ imageRendering: "pixelated" }}
          />

          {/* Coin insert animation overlay */}
          {gameState === "coin" && imagesRef.current?.coin && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 3 }}
            >
              <canvas
                ref={(el) => {
                  if (!el || !imagesRef.current?.coin) return;
                  const c = el.getContext("2d");
                  if (!c) return;
                  c.clearRect(0, 0, 64, 64);
                  c.drawImage(
                    imagesRef.current.coin,
                    coinFrameRef.current * COIN_FRAME_W, 0, COIN_FRAME_W, COIN_FRAME_H,
                    0, 0, 64, 64
                  );
                }}
                width={64}
                height={64}
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          )}

          {/* Start/end overlays */}
          {gameState === "waiting" && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3 }}>
              <div
                className="rounded px-5 py-4 text-center font-mono"
                style={{
                  color: PHOSPHOR_GREEN,
                  backgroundColor: "rgba(0,0,0,0.9)",
                  border: `1px solid ${PHOSPHOR_GREEN}`,
                  maxWidth: canvasW - 32,
                }}
              >
                <div className="text-sm tracking-wider mb-3">🐍 SERPENT 🐍</div>
                <div className="text-[10px] leading-relaxed text-left space-y-1" style={{ color: "rgba(51,255,51,0.75)" }}>
                  <p>▸ ARROW KEYS or WASD to steer</p>
                  <p>▸ Eat the blinking food to grow</p>
                  <p>▸ Don&apos;t hit the walls or yourself</p>
                  <p>▸ Reach {adjustedWin} points to win</p>
                  <p className="pt-1" style={{ color: "rgba(51,255,51,0.5)" }}>
                    You have {maxAttempts} {maxAttempts === 1 ? "try" : "tries"}. Good luck.
                  </p>
                </div>
                <button
                  onClick={startGame}
                  className="mt-3 animate-pulse rounded px-4 py-1.5 text-xs tracking-wider"
                  style={{
                    color: PHOSPHOR_GREEN,
                    border: `1px solid ${PHOSPHOR_GREEN}`,
                    backgroundColor: "transparent",
                  }}
                >
                  INSERT QUARTER
                </button>
              </div>
            </div>
          )}

          {(gameState === "won" || gameState === "lost") && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3 }}>
              <div
                className="rounded px-6 py-4 text-center font-mono"
                style={{
                  color: gameState === "won" ? PHOSPHOR_GREEN : "#ff4444",
                  backgroundColor: "rgba(0,0,0,0.9)",
                  border: `1px solid ${gameState === "won" ? PHOSPHOR_GREEN : "#ff4444"}`,
                }}
              >
                <div className="text-lg">
                  {gameState === "won" ? "YOU WIN!" : "GAME OVER"}
                </div>
                <div className="mt-1 text-sm" style={{ color: PHOSPHOR_GREEN }}>
                  SCORE: {score} / {adjustedWin}
                </div>
                {gameState === "lost" && attempt < maxAttempts && (
                  <>
                    <div
                      className="mt-2 text-[10px]"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {maxAttempts - attempt} {maxAttempts - attempt === 1 ? "TRY" : "TRIES"} REMAINING
                    </div>
                    <button
                      onClick={startGame}
                      className="mt-2 animate-pulse rounded px-3 py-1 text-xs"
                      style={{
                        border: `1px solid ${PHOSPHOR_GREEN}`,
                        color: PHOSPHOR_GREEN,
                        backgroundColor: "transparent",
                      }}
                    >
                      TRY AGAIN
                    </button>
                  </>
                )}
                {gameState === "lost" && attempt >= maxAttempts && (
                  <div
                    className="mt-2 text-[10px]"
                    style={{ color: "rgba(255,68,68,0.7)" }}
                  >
                    NO QUARTERS LEFT
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls hint */}
      <div className="font-mono text-xs text-center space-y-0.5" style={{ color: "rgba(51, 255, 51, 0.5)" }}>
        <div>ARROW KEYS OR WASD TO MOVE · SPACE TO START</div>
      </div>
    </div>
  );
}
