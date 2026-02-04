"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/events";
import type { PersonalRecap, WorldDriftRecap } from "@/types/recap";
import { SeasonRecapSkeleton } from "@/components/skeletons/SeasonRecapSkeleton";

type RecapResponse = {
  personal: PersonalRecap;
  world: WorldDriftRecap;
};

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(0)}%`;
}

function formatDuration(value: number | null | undefined) {
  if (!value) return "—";
  const minutes = Math.round(value / 60000);
  return `${minutes}m`;
}

function RecapContent({ seasonIndex }: { seasonIndex: number | null }) {
  const router = useRouter();
  const [recap, setRecap] = useState<RecapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setError("Not signed in.");
          return;
        }

        const params = seasonIndex ? `?season_index=${seasonIndex}` : "";
        const response = await fetch(`/api/season/recap${params}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Failed to load recap.");
        }
        const payload = (await response.json()) as RecapResponse;
        setRecap(payload);

        trackEvent({
          event_type: "season_recap_viewed",
          payload: { season_index: payload.personal.seasonIndex },
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load recap.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [seasonIndex]);

  return (
    <div className="p-6 space-y-6 max-w-2xl min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-100/50">
      <div>
        <h1 className="text-2xl font-semibold">Season Recap</h1>
        <p className="text-sm text-slate-600">
          A brief summary before the next season begins.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && !recap ? <SeasonRecapSkeleton /> : null}

      {recap ? (
        <>
          <section className="rounded-md border border-slate-300/60 bg-transparent px-4 py-4 space-y-2">
            <h2 className="text-lg font-semibold">Last season: You</h2>
            <p className="text-sm text-slate-700">
              Season <span className="text-cyan-700">{recap.personal.seasonIndex}</span>
            </p>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>
                Days played:{" "}
                <span className="text-cyan-700">{recap.personal.daysPlayed}</span>
              </li>
              <li>
                Completion rate:{" "}
                <span className="text-cyan-700">
                  {formatPercent(recap.personal.completionRate)}
                </span>
              </li>
              <li>
                Anomalies found:{" "}
                <span className="text-cyan-700">{recap.personal.anomaliesFound}</span>
              </li>
              <li>
                Hypotheses written:{" "}
                <span className="text-cyan-700">
                  {recap.personal.hypothesesWritten}
                </span>
              </li>
              <li>
                Boosts sent:{" "}
                <span className="text-cyan-700">{recap.personal.boostsSent}</span>
              </li>
            </ul>
          </section>

          <section className="rounded-md border border-slate-300/60 bg-transparent px-4 py-4 space-y-3">
            <h2 className="text-lg font-semibold">World drift</h2>
            <div className="flex flex-wrap gap-2">
              {recap.world.driftTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-300/60 px-3 py-1 text-xs text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-xs text-slate-500">
              Completion rate:{" "}
              {formatPercent(
                recap.world.supportingStats.completionRate ?? null
              )}{" "}
              ·
              Boosts per active:{" "}
              {recap.world.supportingStats.boostsPerActive?.toFixed(2) ?? "—"} ·
              Anomalies per active:{" "}
              {recap.world.supportingStats.anomaliesPerActive?.toFixed(2) ?? "—"} ·
              Avg session: {formatDuration(recap.world.supportingStats.avgSessionDurationMs)}
            </div>
          </section>
        </>
      ) : null}

      <Button
        variant="outline"
        onClick={() => router.push("/play")}
        className="border-slate-300 text-slate-700 hover:bg-slate-100"
      >
        Begin Season
      </Button>
    </div>
  );
}

function SeasonRecapWithParams() {
  const params = useSearchParams();
  const seasonParam = params.get("season");
  const seasonIndex = seasonParam ? Number(seasonParam) : null;

  return <RecapContent seasonIndex={seasonIndex} />;
}

export default function SeasonRecapPage() {
  return (
    <Suspense fallback={<div className="p-6"><SeasonRecapSkeleton /></div>}>
      <SeasonRecapWithParams />
    </Suspense>
  );
}
