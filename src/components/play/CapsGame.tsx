"use client";

import { useEffect, useRef, useState } from "react";

type GamePhase = "loading" | "aiming" | "charging" | "flying" | "between" | "done";
type GameResult = "hit" | "miss";

type Props = { onResult: (result: GameResult) => void };

// ─── Canvas dimensions ──────────────────────────────────────────────────────
const W = 480;
const H = 360;

// ─── Physics ─────────────────────────────────────────────────────────────────
const FRICTION   = 0.97;
const MAX_SPEED  = 14;
const HIT_RADIUS = 26;
const MAX_SHOTS  = 3;

// ─── Scene positions ─────────────────────────────────────────────────────────
const BOTTLE_X    = W / 2;
const BOTTLE_Y    = 100;           // centre of bottle image
const TARGET_X    = BOTTLE_X;     // cap sits on bottle mouth
const TARGET_Y    = BOTTLE_Y - 68; // top of bottle
const SHOOTER_X   = W / 2;
const SHOOTER_Y   = H - 70;       // resting position of shooter cap (above hand)

// ─── Sprite sizes ─────────────────────────────────────────────────────────────
const BOTTLE_W    = 90;
const BOTTLE_H    = 140;
const TARGET_W    = 52;
const TARGET_H    = 36;
const SHOOTER_W   = 46;
const SHOOTER_H   = 38;
const HAND_W      = 180;
const HAND_H      = 120;
const ARROW_W     = 110;
const ARROW_H     = 18;
const POWER_W     = 220;
const POWER_H     = 34;
const RESULT_W    = 260;
const RESULT_H    = 120;

// ─── Asset paths ─────────────────────────────────────────────────────────────
const ASSETS = {
  bottle:       "/minigames/Caps/caps-bottle.jpg",
  target:       "/minigames/Caps/caps-target.jpg",
  shooter:      "/minigames/Caps/caps-shooter.jpg",
  shooterFly:   "/minigames/Caps/caps-shooter-flying.jpg",
  hand:         "/minigames/Caps/caps-hand.jpg",
  aimArrow:     "/minigames/Caps/caps-aim-arrow.jpg",
  powerBg:      "/minigames/Caps/caps-power-bar-bg.jpg",
  powerFill:    "/minigames/Caps/caps-power-bar-fill.jpg",
  resultHit:    "/minigames/Caps/caps-result-hit.jpg",
  resultMiss:   "/minigames/Caps/caps-result-miss.jpg",
} as const;

type AssetKey = keyof typeof ASSETS;

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

/** Draw an image centred on (cx, cy) using multiply blend (removes white bg). */
function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number, cy: number,
  w: number, h: number,
  rotate = 0,
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotate) ctx.rotate(rotate);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Draw the rotated aim arrow pointing from origin toward (aimX, aimY). */
function drawAimArrow(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  aimX: number, aimY: number,
) {
  const dx = aimX - SHOOTER_X;
  const dy = aimY - SHOOTER_Y;
  if (Math.sqrt(dx * dx + dy * dy) < 10) return;
  const angle = Math.atan2(dy, dx);
  const startDist = 28;  // gap between shooter cap centre and arrow start
  const ox = SHOOTER_X + Math.cos(angle) * (startDist + ARROW_W / 2);
  const oy = SHOOTER_Y + Math.sin(angle) * (startDist + ARROW_W / 2);
  drawSprite(ctx, img, ox, oy, ARROW_W, ARROW_H, angle);
}

/** Draw the power bar at the bottom-left using two clipped images. */
function drawPowerBar(
  ctx: CanvasRenderingContext2D,
  bgImg: HTMLImageElement,
  fillImg: HTMLImageElement,
  power: number,
) {
  const bx = 20;
  const by = H - POWER_H - 12;

  // Background
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(bgImg, bx, by, POWER_W, POWER_H);
  ctx.restore();

  // Fill — clipped to current power width
  if (power > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx + 6, by + 4, (POWER_W - 12) * power, POWER_H - 8);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(fillImg, bx, by, POWER_W, POWER_H);
    ctx.restore();
  }

  // "POWER" label
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "bold 9px monospace";
  ctx.fillText("POWER", bx + 8, by - 4);
  ctx.restore();
}

/** Draw a centred result splash image. */
function drawResult(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(
    img,
    (W - RESULT_W) / 2, (H - RESULT_H) / 2,
    RESULT_W, RESULT_H,
  );
  ctx.restore();
}

// ─── Full scene ───────────────────────────────────────────────────────────────
function drawScene(
  ctx: CanvasRenderingContext2D,
  imgs: Record<AssetKey, HTMLImageElement>,
  state: {
    capX: number; capY: number;
    aimX: number; aimY: number;
    phase: GamePhase;
    power: number;
    shotsLeft: number;
    targetKnocked: boolean;
    result: GameResult | null;
  },
) {
  const { capX, capY, aimX, aimY, phase, power, shotsLeft, targetKnocked, result } = state;

  // ── Carpet background ──────────────────────────────────────────────────────
  ctx.fillStyle = "#c8b89a";
  ctx.fillRect(0, 0, W, H);

  // Fine dot texture on carpet
  ctx.fillStyle = "#b8a88a";
  for (let x = 10; x < W; x += 18) {
    for (let y = 10; y < H; y += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Baseboard at top
  ctx.fillStyle = "#e8dcc8";
  ctx.fillRect(0, 0, W, 20);
  ctx.fillStyle = "#c4b49a";
  ctx.fillRect(0, 19, W, 2);

  // ── Bottle ─────────────────────────────────────────────────────────────────
  drawSprite(ctx, imgs.bottle, BOTTLE_X, BOTTLE_Y, BOTTLE_W, BOTTLE_H);

  // ── Target cap (on bottle mouth) ───────────────────────────────────────────
  if (!targetKnocked) {
    drawSprite(ctx, imgs.target, TARGET_X, TARGET_Y, TARGET_W, TARGET_H);
  }

  // ── Aim arrow ──────────────────────────────────────────────────────────────
  if (phase === "aiming") {
    drawAimArrow(ctx, imgs.aimArrow, aimX, aimY);
  }

  // ── Shooter cap ────────────────────────────────────────────────────────────
  if (phase === "aiming" || phase === "charging") {
    // Static at rest position
    drawSprite(ctx, imgs.shooter, SHOOTER_X, SHOOTER_Y, SHOOTER_W, SHOOTER_H);
  } else if (phase === "flying") {
    // In-flight — spin angle based on travel progress
    const dx = capX - SHOOTER_X;
    const dy = capY - SHOOTER_Y;
    const angle = Math.atan2(dy, dx) + Math.PI / 6;
    drawSprite(ctx, imgs.shooterFly, capX, capY, SHOOTER_W + 4, SHOOTER_H + 4, angle);
  }

  // ── Hand at bottom ─────────────────────────────────────────────────────────
  // Draw partially cropped at bottom edge to look embedded in the scene
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(
    imgs.hand,
    W / 2 - HAND_W / 2, H - HAND_H + 20,
    HAND_W, HAND_H,
  );
  ctx.restore();

  // ── Power bar ──────────────────────────────────────────────────────────────
  if (phase === "charging") {
    drawPowerBar(ctx, imgs.powerBg, imgs.powerFill, power);
  }

  // ── Shot counter (top-right, above baseboard) ──────────────────────────────
  ctx.save();
  ctx.fillStyle = "rgba(80,50,30,0.7)";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "right";
  const shot = MAX_SHOTS - shotsLeft + 1;
  ctx.fillText(`Shot ${Math.min(shot, MAX_SHOTS)} / ${MAX_SHOTS}`, W - 14, 15);
  ctx.textAlign = "left";
  ctx.restore();

  // ── Instruction (aiming only) ──────────────────────────────────────────────
  if (phase === "aiming") {
    ctx.save();
    ctx.fillStyle = "rgba(80,50,30,0.55)";
    ctx.font = "10px monospace";
    ctx.fillText("aim  ·  hold to charge  ·  release", 14, H - 10);
    ctx.restore();
  }

  // ── Result splash ──────────────────────────────────────────────────────────
  if (result === "hit") drawResult(ctx, imgs.resultHit);
  if (result === "miss") drawResult(ctx, imgs.resultMiss);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CapsGame({ onResult }: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const imgsRef          = useRef<Partial<Record<AssetKey, HTMLImageElement>>>({});
  const [imgsReady, setImgsReady] = useState(false);

  // Physics / game state as refs so they don't cause re-renders mid-game
  const phaseRef         = useRef<GamePhase>("loading");
  const capPosRef        = useRef({ x: SHOOTER_X, y: SHOOTER_Y });
  const capVelRef        = useRef({ x: 0, y: 0 });
  const aimPosRef        = useRef({ x: SHOOTER_X, y: SHOOTER_Y - 60 });
  const powerRef         = useRef(0);
  const chargeStartRef   = useRef(0);
  const shotsLeftRef     = useRef(MAX_SHOTS);
  const targetKnockedRef = useRef(false);
  const resultRef        = useRef<GameResult | null>(null);
  const rafRef           = useRef<number | null>(null);

  const [statusText, setStatusText] = useState<string | null>(null);

  // ── Preload all assets ─────────────────────────────────────────────────────
  useEffect(() => {
    const keys = Object.keys(ASSETS) as AssetKey[];
    let loaded = 0;
    keys.forEach((key) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === keys.length) {
          phaseRef.current = "aiming";
          setImgsReady(true);
        }
      };
      img.onerror = () => {
        // Still count on error so the game doesn't hang
        loaded++;
        if (loaded === keys.length) {
          phaseRef.current = "aiming";
          setImgsReady(true);
        }
      };
      img.src = ASSETS[key];
      imgsRef.current[key] = img;
    });
  }, []);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgs = imgsRef.current as Record<AssetKey, HTMLImageElement>;
    drawScene(ctx, imgs, {
      capX: capPosRef.current.x,
      capY: capPosRef.current.y,
      aimX: aimPosRef.current.x,
      aimY: aimPosRef.current.y,
      phase: phaseRef.current,
      power: powerRef.current,
      shotsLeft: shotsLeftRef.current,
      targetKnocked: targetKnockedRef.current,
      result: resultRef.current,
    });
  };

  // Draw once images are ready
  useEffect(() => {
    if (imgsReady) draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgsReady]);

  // ── Physics tick ──────────────────────────────────────────────────────────
  const tick = () => {
    const pos = capPosRef.current;
    const vel = capVelRef.current;
    pos.x += vel.x;
    pos.y += vel.y;
    vel.x *= FRICTION;
    vel.y *= FRICTION;
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2);

    // Hit check
    if (dist(pos.x, pos.y, TARGET_X, TARGET_Y) < HIT_RADIUS) {
      targetKnockedRef.current = true;
      endGame("hit");
      return;
    }

    // Off-canvas or stopped
    if (pos.x < -30 || pos.x > W + 30 || pos.y < -30 || pos.y > H + 30 || speed < 0.4) {
      draw();
      nextShot();
      return;
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  };

  const endGame = (result: GameResult) => {
    phaseRef.current = "done";
    resultRef.current = result;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    draw(); // show result splash
    setTimeout(() => onResult(result), 1200);
  };

  const nextShot = () => {
    shotsLeftRef.current -= 1;
    if (shotsLeftRef.current <= 0) { endGame("miss"); return; }
    phaseRef.current = "between";
    setStatusText("Miss — again...");
    setTimeout(() => {
      capPosRef.current = { x: SHOOTER_X, y: SHOOTER_Y };
      capVelRef.current = { x: 0, y: 0 };
      powerRef.current  = 0;
      phaseRef.current  = "aiming";
      setStatusText(null);
      draw();
    }, 900);
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top)  * (H / rect.height),
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "aiming") return;
    aimPosRef.current = getCanvasPos(e.clientX, e.clientY);
    draw();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "aiming") return;
    e.preventDefault();
    phaseRef.current = "charging";
    chargeStartRef.current = Date.now();
    const chargeLoop = () => {
      if (phaseRef.current !== "charging") return;
      powerRef.current = Math.min((Date.now() - chargeStartRef.current) / 1200, 1);
      draw();
      requestAnimationFrame(chargeLoop);
    };
    chargeLoop();
  };

  const handleMouseUp = () => {
    if (phaseRef.current !== "charging") return;
    const dx   = aimPosRef.current.x - SHOOTER_X;
    const dy   = aimPosRef.current.y - SHOOTER_Y;
    const len  = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd  = powerRef.current * MAX_SPEED;
    const drift = (Math.random() - 0.5) * 1.4;
    capVelRef.current  = { x: (dx / len) * spd + drift, y: (dy / len) * spd + drift };
    capPosRef.current  = { x: SHOOTER_X, y: SHOOTER_Y };
    powerRef.current   = 0;
    phaseRef.current   = "flying";
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    aimPosRef.current = getCanvasPos(t.clientX, t.clientY);
    if (phaseRef.current !== "aiming") return;
    phaseRef.current = "charging";
    chargeStartRef.current = Date.now();
    const chargeLoop = () => {
      if (phaseRef.current !== "charging") return;
      powerRef.current = Math.min((Date.now() - chargeStartRef.current) / 1200, 1);
      draw();
      requestAnimationFrame(chargeLoop);
    };
    chargeLoop();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (phaseRef.current !== "charging") return;
    const t = e.touches[0];
    aimPosRef.current = getCanvasPos(t.clientX, t.clientY);
  };

  const handleTouchEnd = () => handleMouseUp();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-2">
      {!imgsReady && (
        <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
      )}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-[480px] rounded border border-border touch-none"
        style={{ cursor: imgsReady ? "crosshair" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {statusText && (
        <p className="font-mono text-sm text-muted-foreground">{statusText}</p>
      )}
    </div>
  );
}
