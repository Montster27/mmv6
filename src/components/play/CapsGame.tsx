"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type GamePhase = "aiming" | "charging" | "flying" | "between" | "done";
type GameResult = "hit" | "miss";

type Props = {
  onResult: (result: GameResult) => void;
};

const CANVAS_W = 480;
const CANVAS_H = 360;
const FRICTION = 0.97;
const MAX_SPEED = 14;
const HIT_RADIUS = 22;
const MAX_SHOTS = 3;

// Fixed positions
const BOTTLE_X = CANVAS_W / 2;
const BOTTLE_Y = 80;
const SHOOTER_X = CANVAS_W / 2;
const SHOOTER_Y = CANVAS_H - 55;

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  capX: number,
  capY: number,
  aimX: number,
  aimY: number,
  phase: GamePhase,
  power: number,
  shotsLeft: number,
  targetKnocked: boolean,
) {
  // Carpet background
  ctx.fillStyle = "#c8b89a";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Carpet dot texture
  ctx.fillStyle = "#b8a88a";
  for (let x = 8; x < CANVAS_W; x += 16) {
    for (let y = 8; y < CANVAS_H; y += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Baseboard at top
  ctx.fillStyle = "#e8dcc8";
  ctx.fillRect(0, 0, CANVAS_W, 18);
  ctx.fillStyle = "#c4b49a";
  ctx.fillRect(0, 17, CANVAS_W, 2);

  // Bottle body
  ctx.fillStyle = "#4a6741";
  ctx.beginPath();
  ctx.ellipse(BOTTLE_X, BOTTLE_Y + 22, 10, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bottle neck
  ctx.fillStyle = "#3d5636";
  ctx.fillRect(BOTTLE_X - 5, BOTTLE_Y - 8, 10, 20);

  // Bottle lip ring
  ctx.strokeStyle = "#2d4026";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(BOTTLE_X, BOTTLE_Y - 8, 5, 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Target cap on bottle (red crimped circle, unless knocked off)
  if (!targetKnocked) {
    ctx.fillStyle = "#cc2222";
    ctx.beginPath();
    ctx.arc(BOTTLE_X, BOTTLE_Y - 10, 9, 0, Math.PI * 2);
    ctx.fill();
    // Cap ridge detail
    ctx.strokeStyle = "#aa1111";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(BOTTLE_X + Math.cos(angle) * 5, BOTTLE_Y - 10 + Math.sin(angle) * 5);
      ctx.lineTo(BOTTLE_X + Math.cos(angle) * 8, BOTTLE_Y - 10 + Math.sin(angle) * 8);
      ctx.stroke();
    }
  }

  // Aim line during aiming phase
  if (phase === "aiming") {
    const dx = aimX - SHOOTER_X;
    const dy = aimY - SHOOTER_Y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const nx = dx / len;
      const ny = dy / len;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(SHOOTER_X, SHOOTER_Y);
      ctx.lineTo(SHOOTER_X + nx * 90, SHOOTER_Y + ny * 90);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Shooter cap (white, slightly flattened)
  ctx.fillStyle = "#f0ece4";
  ctx.beginPath();
  ctx.ellipse(capX, capY, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c8c0b0";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Power bar (bottom-left) during charging
  if (phase === "charging") {
    const barW = 100;
    const barH = 10;
    const bx = 20;
    const by = CANVAS_H - 28;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = "#d4a843";
    ctx.fillRect(bx, by, barW * power, barH);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px monospace";
    ctx.fillText("POWER", bx, by - 4);
  }

  // Shot counter (top-right)
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "12px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`Shot ${MAX_SHOTS - shotsLeft + 1} of ${MAX_SHOTS}`, CANVAS_W - 14, 36);
  ctx.textAlign = "left";

  // Instruction text
  if (phase === "aiming") {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px monospace";
    ctx.fillText("aim → click + hold → release", 14, CANVAS_H - 10);
  }
}

export function CapsGame({ onResult }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<GamePhase>("aiming");
  const capPosRef = useRef({ x: SHOOTER_X, y: SHOOTER_Y });
  const capVelRef = useRef({ x: 0, y: 0 });
  const aimPosRef = useRef({ x: SHOOTER_X, y: SHOOTER_Y - 50 });
  const powerRef = useRef(0);
  const chargeStartRef = useRef(0);
  const shotsLeftRef = useRef(MAX_SHOTS);
  const rafRef = useRef<number | null>(null);
  const targetKnockedRef = useRef(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  // Draw loop
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawScene(
      ctx,
      capPosRef.current.x,
      capPosRef.current.y,
      aimPosRef.current.x,
      aimPosRef.current.y,
      phaseRef.current,
      powerRef.current,
      shotsLeftRef.current,
      targetKnockedRef.current,
    );
  };

  // Physics tick
  const tick = () => {
    const pos = capPosRef.current;
    const vel = capVelRef.current;

    pos.x += vel.x;
    pos.y += vel.y;
    vel.x *= FRICTION;
    vel.y *= FRICTION;

    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2);

    // Hit check
    if (dist(pos.x, pos.y, BOTTLE_X, BOTTLE_Y - 10) < HIT_RADIUS) {
      targetKnockedRef.current = true;
      draw();
      endGame("hit");
      return;
    }

    // Off canvas or stopped
    if (
      pos.x < -20 || pos.x > CANVAS_W + 20 ||
      pos.y < -20 || pos.y > CANVAS_H + 20 ||
      speed < 0.4
    ) {
      draw();
      nextShot();
      return;
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  };

  const endGame = (result: GameResult) => {
    phaseRef.current = "done";
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStatusText(result === "hit" ? "✓ Hit!" : "Three shots — miss.");
    setTimeout(() => onResult(result), 800);
  };

  const nextShot = () => {
    shotsLeftRef.current -= 1;
    if (shotsLeftRef.current <= 0) {
      endGame("miss");
      return;
    }
    phaseRef.current = "between";
    setStatusText("Miss — reload...");
    setTimeout(() => {
      capPosRef.current = { x: SHOOTER_X, y: SHOOTER_Y };
      capVelRef.current = { x: 0, y: 0 };
      phaseRef.current = "aiming";
      setStatusText(null);
      draw();
    }, 900);
  };

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "aiming") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    aimPosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    draw();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "aiming") return;
    e.preventDefault();
    phaseRef.current = "charging";
    chargeStartRef.current = Date.now();

    const chargeLoop = () => {
      if (phaseRef.current !== "charging") return;
      const elapsed = (Date.now() - chargeStartRef.current) / 1200;
      powerRef.current = Math.min(elapsed, 1);
      draw();
      requestAnimationFrame(chargeLoop);
    };
    chargeLoop();
  };

  const handleMouseUp = () => {
    if (phaseRef.current !== "charging") return;

    const dx = aimPosRef.current.x - SHOOTER_X;
    const dy = aimPosRef.current.y - SHOOTER_Y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = powerRef.current * MAX_SPEED;
    const drift = (Math.random() - 0.5) * 1.2;

    capVelRef.current = {
      x: (dx / len) * speed + drift,
      y: (dy / len) * speed + drift,
    };
    capPosRef.current = { x: SHOOTER_X, y: SHOOTER_Y };
    powerRef.current = 0;
    phaseRef.current = "flying";
    rafRef.current = requestAnimationFrame(tick);
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const t = e.touches[0];
    aimPosRef.current = {
      x: (t.clientX - rect.left) * scaleX,
      y: (t.clientY - rect.top) * scaleY,
    };
    handleMouseDown(e as unknown as React.MouseEvent<HTMLCanvasElement>);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (phaseRef.current !== "charging") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const t = e.touches[0];
    aimPosRef.current = {
      x: (t.clientX - rect.left) * scaleX,
      y: (t.clientY - rect.top) * scaleY,
    };
  };

  const handleTouchEnd = () => handleMouseUp();

  useEffect(() => {
    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full max-w-[480px] rounded border border-border cursor-crosshair touch-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
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
