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

      // Day 1 — check if any storylets have been played
      const { count } = await supabase
        .from("storylet_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((count ?? 0) > 0) {
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
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (status === "no_game") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-muted-foreground">Ready to begin?</p>
        </div>
        <Button size="lg" onClick={handleNewGame} disabled={resetting}>
          {resetting ? "Starting..." : "Start New Game"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // has_game
  if (confirmNewGame) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-center space-y-2 max-w-sm">
          <h2 className="text-xl font-semibold">Start over?</h2>
          <p className="text-muted-foreground text-sm">
            This will erase all your progress — Day {dailyState?.day_index ?? 1} and everything you&apos;ve done so far. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirmNewGame(false)}
            disabled={resetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleNewGame}
            disabled={resetting}
          >
            {resetting ? "Resetting..." : "Yes, start over"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground">
          You&apos;re on Day {dailyState?.day_index ?? 1}.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" onClick={() => router.push("/play")}>
          Continue
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setConfirmNewGame(true)}
        >
          Start New Game
        </Button>
      </div>
    </div>
  );
}
