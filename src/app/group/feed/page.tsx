"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { fetchAnomaliesByIds } from "@/lib/anomalies";
import { supabase } from "@/lib/supabase/browser";
import { fetchGroup, fetchGroupFeed, fetchMyGroupMembership } from "@/lib/groups";
import type { Anomaly } from "@/types/anomalies";
import type { Group, GroupFeedItem } from "@/types/groups";

type ProfileRow = { id: string; display_name: string | null };

function formatWhen(ts: string) {
  const date = new Date(ts);
  return date.toLocaleString();
}

function GroupFeed({ session }: { session: Session }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [feed, setFeed] = useState<GroupFeedItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [anomalies, setAnomalies] = useState<Record<string, Anomaly>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const membership = await fetchMyGroupMembership(session.user.id);
        if (!membership) {
          router.replace("/group");
          return;
        }
        const [groupRow, feedRows] = await Promise.all([
          fetchGroup(membership.group_id),
          fetchGroupFeed(membership.group_id),
        ]);
        setGroup(groupRow);
        setFeed(feedRows);

        const actorIds = Array.from(
          new Set(feedRows.map((row) => row.actor_user_id).filter(Boolean))
        ) as string[];
        if (actorIds.length) {
          const { data } = await supabase
            .from("profiles")
            .select("id,display_name")
            .in("id", actorIds);
          const map = (data ?? []).reduce<Record<string, ProfileRow>>((acc, row) => {
            acc[row.id] = row;
            return acc;
          }, {});
          setProfiles(map);
        }

        const anomalyIds = Array.from(
          new Set(
            feedRows
              .map((row) => row.payload?.anomaly_id)
              .filter((id): id is string => typeof id === "string")
          )
        );
        if (anomalyIds.length) {
          const list = await fetchAnomaliesByIds(anomalyIds);
          const map = list.reduce<Record<string, Anomaly>>((acc, item) => {
            acc[item.id] = item;
            return acc;
          }, {});
          setAnomalies(map);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load group feed.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session.user.id, router]);

  const handleLeave = async () => {
    setLeaving(true);
    setError(null);
    try {
      const res = await fetch("/api/groups/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to leave group.");
      }
      router.replace("/group");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to leave group.");
    } finally {
      setLeaving(false);
    }
  };

  const rows = useMemo(() => {
    return feed.map((row) => {
      const actor =
        row.actor_user_id && profiles[row.actor_user_id]?.display_name
          ? profiles[row.actor_user_id]?.display_name
          : row.actor_user_id
            ? "A group member"
            : "Someone";
      if (row.event_type === "boost_sent") {
        return `${actor} sent a boost.`;
      }
      if (row.event_type === "anomaly_found") {
        const anomalyId = row.payload?.anomaly_id;
        const anomaly =
          typeof anomalyId === "string" ? anomalies[anomalyId]?.title : null;
        return `${actor} discovered ${anomaly ?? "an anomaly"}.`;
      }
      if (row.event_type === "arc_step") {
        return `${actor} reached an arc milestone.`;
      }
      return `${actor} updated the group.`;
    });
  }, [feed, profiles, anomalies]);

  if (loading) {
    return <p className="p-6 text-slate-700">Loading…</p>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{group?.name ?? "Group"}</h1>
          <p className="text-sm text-slate-600">
            Share this code:{" "}
            <span className="font-semibold text-slate-900">
              {group?.join_code ?? "—"}
            </span>
          </p>
        </div>
        <Button variant="ghost" onClick={handleLeave} disabled={leaving}>
          {leaving ? "Leaving..." : "Leave group"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {feed.length === 0 ? (
        <p className="text-slate-700">No activity yet.</p>
      ) : (
        <div className="space-y-3">
          {feed.map((row, idx) => (
            <div
              key={row.id}
              className="rounded-md border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-sm text-slate-800">{rows[idx]}</p>
              <p className="text-xs text-slate-500 mt-1">
                {row.ts ? formatWhen(row.ts) : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroupFeedPage() {
  return <AuthGate>{(session) => <GroupFeed session={session} />}</AuthGate>;
}
