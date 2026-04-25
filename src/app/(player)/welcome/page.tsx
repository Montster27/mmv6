"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/browser";
import { useSession } from "@/contexts/SessionContext";
import { fetchPlayerIdentity, saveCharacterIdentity } from "@/lib/playerIdentity";
import {
  DEFAULT_PLAYER_IDENTITY,
  IDENTITY_GENDER_LABELS,
  IDENTITY_GENDER_VALUES,
  IDENTITY_RACE_LABELS,
  IDENTITY_RACE_VALUES,
  IDENTITY_SEXUALITY_LABELS,
  IDENTITY_SEXUALITY_VALUES,
  type IdentityGender,
  type IdentityRace,
  type IdentitySexuality,
  type PlayerIdentity,
} from "@/types/identity";

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
  const [showFriction, setShowFriction] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [identity, setIdentity] = useState<PlayerIdentity>(DEFAULT_PLAYER_IDENTITY);

  useEffect(() => {
    async function checkGameState() {
      const [{ data }, existingIdentity] = await Promise.all([
        supabase
          .from("daily_states")
          .select("day_index,start_date,last_day_completed,energy,stress")
          .eq("user_id", userId)
          .maybeSingle(),
        fetchPlayerIdentity(userId),
      ]);
      setIdentity(existingIdentity);

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
      await saveCharacterIdentity(userId, identity);
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

  if (showIdentity) {
    return (
      <div className="mx-auto max-w-[620px] px-5 pt-16 pb-24 narrative-enter">
        <p className="prep-label mb-6 text-center">Who you are</p>
        <div className="font-body text-foreground/85 text-[15px] leading-[1.85] space-y-4 mb-8">
          <p>
            This is fall 1983. Some details about who you are will shape how the world sees you
            and how you experience it. You can leave anything unspecified — the game will treat
            that as the default 1983 dorm experience.
          </p>
          <p className="text-foreground/60 text-[13px]">
            These choices are locked once you begin. They will not change the shape of the story,
            only how specific moments land.
          </p>
        </div>
        <div className="space-y-5 mb-10">
          <label className="block">
            <span className="prep-label mb-2 block">Race</span>
            <select
              className="w-full rounded border border-foreground/20 bg-background px-3 py-2 font-body text-[15px] text-foreground focus:border-foreground/50 focus:outline-none"
              value={identity.race}
              onChange={(e) =>
                setIdentity((prev) => ({
                  ...prev,
                  race: e.target.value as IdentityRace,
                }))
              }
            >
              {IDENTITY_RACE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {IDENTITY_RACE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="prep-label mb-2 block">Gender</span>
            <select
              className="w-full rounded border border-foreground/20 bg-background px-3 py-2 font-body text-[15px] text-foreground focus:border-foreground/50 focus:outline-none"
              value={identity.gender}
              onChange={(e) =>
                setIdentity((prev) => ({
                  ...prev,
                  gender: e.target.value as IdentityGender,
                }))
              }
            >
              {IDENTITY_GENDER_VALUES.map((value) => (
                <option key={value} value={value}>
                  {IDENTITY_GENDER_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="prep-label mb-2 block">Sexuality</span>
            <select
              className="w-full rounded border border-foreground/20 bg-background px-3 py-2 font-body text-[15px] text-foreground focus:border-foreground/50 focus:outline-none"
              value={identity.sexuality}
              onChange={(e) =>
                setIdentity((prev) => ({
                  ...prev,
                  sexuality: e.target.value as IdentitySexuality,
                }))
              }
            >
              {IDENTITY_SEXUALITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {IDENTITY_SEXUALITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-center">
          <Button size="lg" onClick={handleNewGame} disabled={resetting}>
            {resetting ? "Starting…" : "Begin"}
          </Button>
        </div>
        {error && (
          <p className="mt-4 text-sm text-destructive font-body text-center">{error}</p>
        )}
      </div>
    );
  }

  if (status === "no_game") {
    if (showFriction) {
      return (
        <div className="mx-auto max-w-[640px] px-5 pt-16 pb-24 narrative-enter">
          <p className="prep-label mb-6 text-center">Before you begin</p>
          <div className="font-body text-foreground/85 text-[15px] leading-[1.85] space-y-5 mb-10">
            <p>
              This game is set in 1983. The people in it talk the way people talked in 1983.
            </p>
            <p>
              Some of what they say was common then and is understood as harmful now. Casual slurs,
              unexamined assumptions about women, about race, about who belongs and who doesn&apos;t —
              these were the water we swam in. Most of us didn&apos;t think about it. Some of us were
              hurt by it. Some of us did the hurting without knowing. Many of us were both.
            </p>
            <p>
              The game does not look away from this. You will hear these things said by people who
              are not villains — people who are generous, funny, and kind in other ways. You will
              have choices about how to respond. Those choices will matter, in ways that unfold over
              time.
            </p>
            <p>
              Right now, you experience the game from a specific perspective. As the story moves
              forward through the decades and the system grows, you will be able to shape who you
              are — your identity, your background, your starting point. The friction will feel
              different depending on who you choose to be.
            </p>
            <p>
              Nothing in this game is an endorsement. Everything in it is an invitation to notice
              what you notice, and to sit with what that means.
            </p>
          </div>
          <div className="flex justify-center">
            <Button size="lg" onClick={() => setShowIdentity(true)} disabled={resetting}>
              Continue →
            </Button>
          </div>
        </div>
      );
    }

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
        <Button size="lg" onClick={() => setShowFriction(true)} disabled={resetting}>
          Begin, September 4th →
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
            onClick={() => {
              setConfirmNewGame(false);
              setShowIdentity(true);
            }}
            disabled={resetting}
          >
            Yes, start over
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
