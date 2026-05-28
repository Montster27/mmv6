"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/contexts/SessionContext";
import {
  acceptApplicationRequest,
  fetchClubDetail,
  leaveClubRequest,
  rejectApplicationRequest,
} from "@/lib/clubs";
import type { ClubDetail } from "@/types/clubs";
import { Button } from "@/components/ui/button";

function ClubDetailContent({ clubId }: { clubId: string }) {
  const session = useSession();
  const token = session.access_token;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [detail, setDetail] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchClubDetail(token, clubId);
      setDetail(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load club.";
      if (message === "Club not found") setNotFound(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, clubId]);

  useEffect(() => {
    load();
  }, [load]);

  // Run a mutation, then refresh both this page and the cached bootstrap
  // (which drives the current-club indicator in the nav).
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    setError(null);
    try {
      await leaveClubRequest(token);
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      router.replace("/clubs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave club.");
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading club…</p>;
  }
  if (notFound || !detail) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-slate-600">Club not found.</p>
        <Link href="/clubs" className="text-sm text-primary hover:underline">
          Back to clubs
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link
          href="/clubs"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Clubs
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{detail.name}</h1>
        {detail.description ? (
          <p className="mt-1 text-sm text-slate-600">{detail.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          {detail.founder_display_name
            ? `Founded by ${detail.founder_display_name}`
            : "No founder yet"}
          {detail.is_open_to_applications ? "" : " · not accepting applications"}
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">
          Members ({detail.members.length})
        </h2>
        <ul className="space-y-1">
          {detail.members.map((m) => (
            <li
              key={m.player_id}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <span>{m.display_name ?? "Unknown player"}</span>
              {m.is_founder ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  Founder
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {detail.viewer_is_member ? (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={handleLeave}
          >
            {busy ? "Working…" : "Leave club"}
          </Button>
        ) : null}
      </section>

      {detail.viewer_is_founder ? (
        <section className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold">
            Pending applications ({detail.pending_applications.length})
          </h2>
          {detail.pending_applications.length === 0 ? (
            <p className="text-sm text-slate-500">No pending applications.</p>
          ) : (
            <ul className="space-y-2">
              {detail.pending_applications.map((app) => (
                <li
                  key={app.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-slate-700">
                    {app.applicant_display_name ?? "Unknown player"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        run(() => acceptApplicationRequest(token, app.id))
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(() => rejectApplicationRequest(token, app.id))
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClubDetailContent clubId={id} />;
}
