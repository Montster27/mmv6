"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useSession } from "@/contexts/SessionContext";
import {
  applyToClubRequest,
  fetchClubDirectory,
} from "@/lib/clubs";
import type { ClubDirectoryEntry } from "@/types/clubs";
import { Button } from "@/components/ui/button";

function applyState(entry: ClubDirectoryEntry): {
  disabled: boolean;
  label: string;
} {
  if (entry.viewer_is_member) return { disabled: true, label: "Member" };
  if (entry.viewer_has_pending_application)
    return { disabled: true, label: "Pending" };
  if (!entry.is_open_to_applications)
    return { disabled: true, label: "Closed" };
  return { disabled: false, label: "Apply" };
}

function ClubsDirectory() {
  const session = useSession();
  const token = session.access_token;

  const [clubs, setClubs] = useState<ClubDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchClubDirectory(token);
      setClubs(res.clubs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clubs.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApply = async (clubId: string) => {
    setApplyingId(clubId);
    setError(null);
    try {
      await applyToClubRequest(token, clubId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply.");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clubs</h1>
          <p className="text-sm text-slate-600">
            Find a club to call your own, or found one.
          </p>
        </div>
        <Button asChild>
          <Link href="/clubs/new">Found a club</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading clubs…</p>
      ) : clubs.length === 0 ? (
        <p className="text-sm text-slate-500">No clubs yet.</p>
      ) : (
        <ul className="space-y-3">
          {clubs.map((club) => {
            const apply = applyState(club);
            return (
              <li
                key={club.id}
                className="rounded-md border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/clubs/${club.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {club.name}
                      </Link>
                      {club.is_system_seeded ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          Default
                        </span>
                      ) : null}
                    </div>
                    {club.description ? (
                      <p className="text-sm text-slate-600">
                        {club.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {club.member_count}{" "}
                      {club.member_count === 1 ? "member" : "members"}
                      {club.founder_display_name
                        ? ` · founded by ${club.founder_display_name}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={apply.disabled || applyingId === club.id}
                    onClick={() => handleApply(club.id)}
                  >
                    {applyingId === club.id ? "Applying…" : apply.label}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ClubsPage() {
  return <ClubsDirectory />;
}
