"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/browser";
import { useSession } from "@/contexts/SessionContext";

type GameStatus = "loading" | "no_game" | "has_game";

type DailyStateRow = {
  day_index: number;
  start_date: string | null;
  last_day_completed: string | null;
  energy: number;
  stress: number;
};

export default function WelcomePage() {
  const session = useSession();
  const router = useRouter();
  const userId = session.user.id;

  const [status, setStatus] = useState<GameStatus>("loading");
  const [dailyState, setDailyState] = useState<DailyStateRow | null>(null);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkGameState() {
      const { data } = await supabase
        .from("daily_states")
        .select("day_index,start_date,last_day_completed,energy,stress")
        .eq("user_id", userId)
        .maybeSingle();

      if (!data || !data.start_date) {
        setStatus("no_game");
        return;
      }

      // Check for meaningful progress: day > 1 or has storylet runs
      if (data.day_index > 1) {
        setDailyState(data);
        setStatus("has_game");
        return;
      }

      // Day 1 — check if any storylets have been played (via either path)
      const [{ count: runCount }, { count: logCount }] = await Promise.all([
        supabase
          .from("storylet_runs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("choice_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      if ((runCount ?? 0) > 0 || (logCount ?? 0) > 0) {
        setDailyState(data);
        setStatus("has_game");
      } else {
        setStatus("no_game");
      }
    }

    checkGameState();
  }, [userId]);

  async function handleNewGame() {
    setResetting(true);
    setError(null);
    try {
      const token = session.access_token;
      const res = await fetch("/api/run/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Reset failed");
      router.push("/play");
    } catch {
      setError("Something went wrong. Please try again.");
      setResetting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="prep-label">Loading…</p>
      </div>
    );
  }

  if (status === "no_game") {
    return (
      <div className="mx-auto max-w-[620px] px-5 pt-16 pb-24 text-center narrative-enter">
        <p className="prep-label mb-3">Fall 1983 · Harwick University</p>
        <h1 className="font-heading font-bold leading-[1.15] tracking-tight text-foreground text-[clamp(2rem,2vw+1.4rem,2.75rem)] mb-6">
          Many More Versions
        </h1>
        <p className="font-body text-foreground/85 text-base leading-[1.75] text-left mb-8 mx-auto max-w-[42rem]">
          You are nineteen. The posters in your dorm are still curling at the edges. Somewhere, in a
          future you can almost remember, you are older — and someone is dialing a payphone. Not yet.
          First: get through the week. Pick your major. Figure out what it costs to be anyone in particular.
        </p>
        <Button size="lg" onClick={handleNewGame} disabled={resetting}>
          {resetting ? "Starting…" : "Begin, September 4th →"}
        </Button>
        {error && <p className="mt-4 text-sm text-destructive font-body">{error}</p>}
      </div>
    );
  }

  // has_game
  if (confirmNewGame) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-16 pb-24 text-center narrative-enter">
        <p className="prep-label mb-3">Start over</p>
        <h2 className="font-heading font-bold text-2xl text-foreground mb-4">
          Erase this life?
        </h2>
        <p className="font-body text-foreground/80 text-[15px] leading-relaxed mb-8">
          You&apos;re on Day {dailyState?.day_index ?? 1}. Starting a new game wipes this run — every
          choice, every conversation, everyone you&apos;ve met. Nothing carries over.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => setConfirmNewGame(false)}
            disabled={resetting}
          >
            Keep this life
          </Button>
          <Button
            variant="destructive"
            onClick={handleNewGame}
            disabled={resetting}
          >
            {resetting ? "Resetting…" : "Yes, start over"}
          </Button>
        </div>
        {error && <p className="mt-4 text-sm text-destructive font-body">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-16 pb-24 text-center narrative-enter">
      <p className="prep-label mb-3">Fall 1983 · Harwick University</p>
      <h1 className="font-heading font-bold leading-[1.15] tracking-tight text-foreground text-[clamp(2rem,2vw+1.4rem,2.75rem)] mb-4">
        Welcome back
      </h1>
      <p className="font-body text-foreground/80 text-base leading-relaxed mb-8">
        You&apos;re on <span className="font-stat text-foreground">Day {dailyState?.day_index ?? 1}</span>. The
        week keeps going whether you&apos;re ready or not.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
        <Button size="lg" onClick={() => router.push("/play")}>
          Continue →
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmNewGame(true)}
        >
          Start a new life
        </Button>
      </div>
    </div>
  );
}
