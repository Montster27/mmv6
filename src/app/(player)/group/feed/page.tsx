"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { fetchAnomaliesByIds } from "@/lib/anomalies";
import { supabase } from "@/lib/supabase/browser";
import { fetchGroup, fetchGroupFeed, fetchMyGroupMembership } from "@/lib/groups";
import { fetchUserAnomalies } from "@/lib/anomalies";
import { submitReport } from "@/lib/reports";
import type { Anomaly } from "@/types/anomalies";
import type { Group, GroupFeedItem } from "@/types/groups";
import { GroupSkeleton } from "@/components/skeletons/GroupSkeleton";

type ProfileRow = { id: string; display_name: string | null };
type ObjectiveRow = {
  week_key: string;
  objective_type: string;
  target: number;
  progress: number;
  completed: boolean;
};

function objectiveTitle(type?: string | null) {
  if (type === "stabilize_v1") return "Stabilize the Timeline";
  return "Group Objective";
}

function formatWhen(ts: string) {
  const date = new Date(ts);
  return date.toLocaleString();
}

function GroupFeed() {
  const session = useSession();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [feed, setFeed] = useState<GroupFeedItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [anomalies, setAnomalies] = useState<Record<string, Anomaly>>({});
  const [clues, setClues] = useState<
    Array<{
      id: string;
      from_display_name: string | null;
      anomaly_title: string | null;
      anomaly_description: string | null;
      created_at: string;
    }>
  >([]);
  const [objective, setObjective] = useState<ObjectiveRow | null>(null);
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [myAnomalies, setMyAnomalies] = useState<Anomaly[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [selectedAnomaly, setSelectedAnomaly] = useState("");
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentToday, setSentToday] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
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

        const objectiveRes = await fetch("/api/groups/objective/current", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (objectiveRes.ok) {
          const json = await objectiveRes.json();
          setObjective(json.objective ?? null);
        }

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

        const { data: memberRows } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", membership.group_id);
        const memberIds = (memberRows ?? []).map((row) => row.user_id);
        if (memberIds.length) {
          const { data: memberProfiles } = await supabase
            .from("profiles")
            .select("id,display_name")
            .in("id", memberIds);
          const list = (memberProfiles ?? []).filter((row) => row.id !== session.user.id);
          setMembers(list);
          if (!selectedRecipient && list[0]) {
            setSelectedRecipient(list[0].id);
          }
        }

        const myAnomalyRows = await fetchUserAnomalies(session.user.id);
        const myIds = Array.from(new Set(myAnomalyRows.map((row) => row.anomaly_id)));
        if (myIds.length) {
          const list = await fetchAnomaliesByIds(myIds);
          setMyAnomalies(list);
          if (!selectedAnomaly && list[0]) {
            setSelectedAnomaly(list[0].id);
          }
        }

        const clueRes = await fetch("/api/group/clues/inbox", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (clueRes.ok) {
          const json = await clueRes.json();
          setClues(json.clues ?? []);
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

  useEffect(() => {
    if (reportMessage !== "Report submitted.") return;
    const timer = window.setTimeout(() => setReportMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [reportMessage]);

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

  const handleSend = async () => {
    if (!selectedRecipient || !selectedAnomaly) {
      setSendError("Choose a recipient and anomaly.");
      return;
    }
    setSending(true);
    setSendError(null);
    setSendMessage(null);
    try {
      const res = await fetch("/api/group/clues/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to_user_id: selectedRecipient,
          anomaly_id: selectedAnomaly,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setSentToday(true);
          throw new Error("You already sent a clue today.");
        }
        throw new Error(json.error ?? "Failed to send clue.");
      }
      setSentToday(true);
      setSendMessage("Clue sent.");
    } catch (e) {
      console.error(e);
      setSendError(e instanceof Error ? e.message : "Failed to send clue.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6"><GroupSkeleton /></div>;
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

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-3">
        <h2 className="text-lg font-semibold">Send a clue</h2>
        <p className="text-sm text-slate-600">
          Share one anomaly per day with a group member.
        </p>
        {sendError ? (
          sendError.toLowerCase().includes("already sent a clue") ? (
            <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              <span aria-hidden="true">ℹ️</span>
              <span>{sendError}</span>
            </div>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {sendError}
            </div>
          )
        ) : null}
        {sendMessage ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <span aria-hidden="true">✉️</span>
            <span>{sendMessage}</span>
          </div>
        ) : null}
        {members.length === 0 || myAnomalies.length === 0 ? (
          <p className="text-sm text-slate-600">
            {members.length === 0
              ? "No other members yet."
              : "No anomalies discovered yet."}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Recipient
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                disabled={sending || sentToday}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name ?? "Group member"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Anomaly
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                value={selectedAnomaly}
                onChange={(e) => setSelectedAnomaly(e.target.value)}
                disabled={sending || sentToday}
              >
                {myAnomalies.map((anomaly) => (
                  <option key={anomaly.id} value={anomaly.id}>
                    {anomaly.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <Button onClick={handleSend} disabled={sending || sentToday}>
          {sentToday ? "Clue sent today" : sending ? "Sending..." : "Send clue"}
        </Button>
      </div>

      {objective ? (
        <div
          className={`rounded-md border px-4 py-3 space-y-2 ${
            objective.completed
              ? "border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {objectiveTitle(objective.objective_type)}
            </h2>
            {objective.completed ? (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                Complete
              </span>
            ) : null}
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={objective.completed ? "h-full bg-teal-600" : "h-full bg-slate-900"}
              style={{
                width: `${Math.min(
                  100,
                  Math.round((objective.progress / objective.target) * 100)
                )}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-600">
            {objective.progress}/{objective.target} · Week {objective.week_key}
          </p>
        </div>
      ) : null}

      {clues.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Clues received</h2>
          <div className="space-y-3">
            {clues.map((clue) => (
              <div
                key={clue.id}
                className="rounded-md border border-emerald-200 border-l-4 border-l-emerald-300 bg-emerald-50/40 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <span aria-hidden="true">✉️</span>
                    <span>{clue.anomaly_title ?? "Anomaly clue"}</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    {clue.created_at
                      ? new Date(clue.created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  {clue.anomaly_description ?? "A clue arrived from your group."}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  From {clue.from_display_name ?? "a group member"}
                </p>
                <Button
                  variant="ghost"
                  className="px-0 text-xs text-slate-700"
                  onClick={() => {
                    setReportTarget(clue.id);
                    setReportMessage(null);
                  }}
                >
                  Report
                </Button>
              </div>
            ))}
          </div>
          {reportTarget ? (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Report clue</h3>
              <label className="text-sm text-slate-700">
                Reason
                <select
                  className="ml-2 rounded border border-slate-300 px-2 py-1 text-slate-900"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm text-slate-700">
                Details (optional)
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
              </label>
              {reportMessage ? (
                reportMessage === "Report submitted." ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {reportMessage}
                  </span>
                ) : (
                  <p className="text-xs text-red-600">{reportMessage}</p>
                )
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    setReportSaving(true);
                    try {
                      await submitReport({
                        target_type: "clue",
                        target_id: reportTarget,
                        reason: reportReason,
                        details: reportDetails.trim() || undefined,
                      });
                      setReportMessage("Report submitted.");
                      setReportTarget(null);
                      setReportDetails("");
                    } catch (e) {
                      setReportMessage(
                        e instanceof Error ? e.message : "Failed to submit report."
                      );
                    } finally {
                      setReportSaving(false);
                    }
                  }}
                  disabled={reportSaving}
                >
                  {reportSaving ? "Submitting..." : "Submit report"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReportTarget(null);
                    setReportDetails("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
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
  return <GroupFeed />;
}
