"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { AuthGate } from "@/ui/components/AuthGate";
import { fetchMyGroupMembership } from "@/lib/groups";
import { Button } from "@/components/ui/button";

function GroupEntry({ session }: { session: Session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const membership = await fetchMyGroupMembership(session.user.id);
      if (membership) {
        router.replace("/group/feed");
        return;
      }
      setLoading(false);
    };
    load();
  }, [session.user.id, router]);

  const handleCreate = async () => {
    if (!createName.trim()) {
      setError("Enter a group name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: createName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to create group.");
      }
      router.replace("/group/feed");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to create group.");
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError("Enter a join code.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ join_code: joinCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to join group.");
      }
      router.replace("/group/feed");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to join group.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-slate-700">Loading…</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Group</h1>
        <p className="text-sm text-slate-600">
          Create a small alliance or join with a code.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create a group</h2>
        <label className="text-sm text-slate-700">
          Group name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Night Watch"
          />
        </label>
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Creating..." : "Create group"}
        </Button>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">Join a group</h2>
        <label className="text-sm text-slate-700">
          Join code
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="AB12CD3"
          />
        </label>
        <Button variant="secondary" onClick={handleJoin} disabled={saving}>
          {saving ? "Joining..." : "Join group"}
        </Button>
      </section>
    </div>
  );
}

export default function GroupPage() {
  return <AuthGate>{(session) => <GroupEntry session={session} />}</AuthGate>;
}
