"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MiniGameProps } from "@/types/storylets";

// ---------------------------------------------------------------------------
// Caps — Beer-bottle cap flicking game (1983 dorm party)
//
// Two beer bottles sit 10 feet apart. You flick a bottle cap (thumb & middle
// finger) at the far bottle. Hit = point. The player times their flick on a
// power/accuracy meter. 5 rounds, best of 5.
//
// The meter oscillates. Click when the needle is in the "sweet spot" zone.
// Sweet spot shrinks with difficulty. Speed increases with difficulty.
// ---------------------------------------------------------------------------

type GamePhase = "ready" | "aiming" | "flying" | "scored" | "missed" | "done";

const CANVAS_W = 360;
const CANVAS_H = 280;
const ROUNDS = 5;

// Colors
const AMBER = "#d4a030";
const AMBER_DIM = "#3a2a08";
const BG = "#1a1008";
const BOTTLE_GREEN = "#2a5a2a";
const BOTTLE_HIGHLIGHT = "#3a7a3a";

export default function CapsGame({
  onComplete,
  difficulty = 0.5,
  config,
}: MiniGameProps) {
  const winThreshold = (config?.winThreshold as number) ?? 3;

  // Sweet spot as fraction of meter (smaller = harder)
  const sweetSpotSize = 0.25 - difficulty * 0.12; // 0.25 at easy → 0.13 at hard
  // Meter speed in units per frame
  const meterSpeed = 0.012 + difficulty * 0.012; // 0.012 → 0.024

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const meterPosRef = useRef(0);
  const meterDirRef = useRef(1);

  const [phase, setPhase] = useState<GamePhase>("ready");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [capPos, setCapPos] = useState({ x: 0, y: 0 });
  const [targetHit, setTargetHit] = useState(false);

  const phaseRef = useRef<GamePhase>("ready");
  const scoreRef = useRef(0);
  const roundRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { roundRef.current = round; }, [round]);

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Background — dim amber bar/party feel
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Floor line
    ctx.strokeStyle = AMBER_DIM;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 220);
    ctx.lineTo(CANVAS_W, 220);
    ctx.stroke();

    // Left bottle (yours — near)
    drawBottle(ctx, 50, 160);

    // Right bottle (target — far)
    drawBottle(ctx, 300, 160);

    // Score display
    ctx.fillStyle = AMBER;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`ROUND ${Math.min(roundRef.current + 1, ROUNDS)} / ${ROUNDS}`, 10, 20);
    ctx.textAlign = "right";
    ctx.fillText(`HITS: ${scoreRef.current}`, CANVAS_W - 10, 20);

    // Meter (when aiming)
    if (phaseRef.current === "aiming") {
      drawMeter(ctx, meterPosRef.current, sweetSpotSize);
    }

    // Flying cap animation
    if (phaseRef.current === "flying" || phaseRef.current === "scored" || phaseRef.current === "missed") {
      ctx.fillStyle = "#c0c0c0";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(capPos.x, capPos.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Hit/miss flash
    if (phaseRef.current === "scored") {
      ctx.fillStyle = "rgba(51, 255, 51, 0.3)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#33ff33";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PING!", CANVAS_W / 2, 140);
    }
    if (phaseRef.current === "missed") {
      ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#ff5050";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WIDE", CANVAS_W / 2, 140);
    }

    // Scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
    for (let y = 0; y < CANVAS_H; y += 3) {
      ctx.fillRect(0, y, CANVAS_W, 1);
    }
  }, [capPos, sweetSpotSize]);

  // ------------------------------------------------------------------
  // Meter animation loop
  // ------------------------------------------------------------------

  const meterLoop = useCallback(() => {
    if (phaseRef.current !== "aiming") return;

    meterPosRef.current += meterDirRef.current * meterSpeed;
    if (meterPosRef.current >= 1) {
      meterPosRef.current = 1;
      meterDirRef.current = -1;
    }
    if (meterPosRef.current <= 0) {
      meterPosRef.current = 0;
      meterDirRef.current = 1;
    }

    draw();
    animRef.current = requestAnimationFrame(meterLoop);
  }, [draw, meterSpeed]);

  // ------------------------------------------------------------------
  // Game flow
  // ------------------------------------------------------------------

  const startAiming = useCallback(() => {
    meterPosRef.current = 0;
    meterDirRef.current = 1;
    setPhase("aiming");
    animRef.current = requestAnimationFrame(meterLoop);
  }, [meterLoop]);

  const flick = useCallback(() => {
    if (phaseRef.current !== "aiming") return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const pos = meterPosRef.current;
    const sweetCenter = 0.5;
    const halfSweet = sweetSpotSize / 2;
    const hit = Math.abs(pos - sweetCenter) <= halfSweet;

    setTargetHit(hit);

    // Animate cap flying
    setPhase("flying");
    const startX = 70;
    const startY = 175;
    const endX = hit ? 300 : 300 + (Math.random() - 0.5) * 80;
    const endY = hit ? 165 : 150 + Math.random() * 40;

    let t = 0;
    const flyInterval = setInterval(() => {
      t += 0.08;
      const cx = startX + (endX - startX) * t;
      const cy = startY + (endY - startY) * t - Math.sin(t * Math.PI) * 40;
      setCapPos({ x: cx, y: cy });

      if (t >= 1) {
        clearInterval(flyInterval);
        if (hit) {
          const newScore = scoreRef.current + 1;
          setScore(newScore);
          setPhase("scored");
        } else {
          setPhase("missed");
        }

        // Next round after brief pause
        setTimeout(() => {
          const nextRound = roundRef.current + 1;
          if (nextRound >= ROUNDS) {
            setPhase("done");
            const finalScore = hit ? scoreRef.current : scoreRef.current; // already updated
            onComplete({ won: (hit ? scoreRef.current : scoreRef.current) >= winThreshold, score: hit ? scoreRef.current : scoreRef.current });
          } else {
            setRound(nextRound);
            startAiming();
          }
        }, 800);
      }
    }, 30);
  }, [sweetSpotSize, onComplete, winThreshold, startAiming]);

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (phaseRef.current === "ready") {
          startAiming();
        } else if (phaseRef.current === "aiming") {
          flick();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startAiming, flick]);

  // Draw on phase/position changes
  useEffect(() => { draw(); }, [draw, phase, capPos, round, score]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="overflow-hidden rounded border"
        style={{ borderColor: AMBER_DIM, width: CANVAS_W, height: CANVAS_H }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={() => {
            if (phaseRef.current === "ready") startAiming();
            else if (phaseRef.current === "aiming") flick();
          }}
          className="block cursor-pointer"
        />
      </div>

      {/* Controls hint */}
      <div className="font-mono text-xs" style={{ color: "rgba(212, 160, 48, 0.5)" }}>
        {phase === "ready"
          ? "SPACE OR CLICK TO START"
          : phase === "aiming"
            ? "SPACE OR CLICK TO FLICK"
            : phase === "done"
              ? `FINAL: ${score} / ${ROUNDS}`
              : ""}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawBottle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Body
  ctx.fillStyle = BOTTLE_GREEN;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 60);
  ctx.lineTo(x - 10, y);
  ctx.quadraticCurveTo(x - 10, y - 10, x - 5, y - 15);
  ctx.lineTo(x - 4, y - 40);
  ctx.lineTo(x + 4, y - 40);
  ctx.lineTo(x + 5, y - 15);
  ctx.quadraticCurveTo(x + 10, y - 10, x + 10, y);
  ctx.lineTo(x + 10, y + 60);
  ctx.closePath();
  ctx.fill();

  // Highlight
  ctx.fillStyle = BOTTLE_HIGHLIGHT;
  ctx.fillRect(x - 3, y - 38, 2, 30);

  // Label
  ctx.fillStyle = "#ddd";
  ctx.fillRect(x - 8, y + 5, 16, 20);
  ctx.fillStyle = "#333";
  ctx.font = "6px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SCHLITZ", x, y + 18);
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  pos: number,
  sweetSpotSize: number
) {
  const meterX = 30;
  const meterY = 245;
  const meterW = CANVAS_W - 60;
  const meterH = 16;

  // Background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(meterX, meterY, meterW, meterH);
  ctx.strokeStyle = AMBER_DIM;
  ctx.strokeRect(meterX, meterY, meterW, meterH);

  // Sweet spot (green zone in center)
  const sweetCenter = 0.5;
  const halfSweet = sweetSpotSize / 2;
  const sweetLeft = meterX + (sweetCenter - halfSweet) * meterW;
  const sweetWidth = sweetSpotSize * meterW;
  ctx.fillStyle = "rgba(51, 255, 51, 0.3)";
  ctx.fillRect(sweetLeft, meterY + 1, sweetWidth, meterH - 2);

  // Needle
  const needleX = meterX + pos * meterW;
  ctx.fillStyle = AMBER;
  ctx.shadowColor = AMBER;
  ctx.shadowBlur = 4;
  ctx.fillRect(needleX - 1, meterY - 2, 3, meterH + 4);
  ctx.shadowBlur = 0;

  // Label
  ctx.fillStyle = AMBER;
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("▲ FLICK ▲", CANVAS_W / 2, meterY + meterH + 14);
}
