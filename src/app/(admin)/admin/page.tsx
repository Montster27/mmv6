"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { fetchActiveStorylets, type StoryletListItem } from "@/lib/storylets";
import { AuthGate } from "@/ui/components/AuthGate";

export default function AdminPage() {
  const [storylets, setStorylets] = useState<StoryletListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStorylets = async () => {
    setLoading(true);
    const data = await fetchActiveStorylets();
    setStorylets(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStorylets();
  }, []);

  return (
    <AuthGate>
      {(session) => (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Admin</h1>
            <Button onClick={signOut}>Sign out</Button>
          </div>
          <p className="text-slate-700">
            You&apos;re signed in as {session.user.email ?? "unknown user"}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" asChild>
              <a href="/admin/storylets">Storylets</a>
            </Button>
            <Button variant="secondary" asChild>
              <a href="/admin/metrics">Metrics</a>
            </Button>
            <Button variant="secondary" asChild>
              <a href="/admin/experiments">Experiments</a>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-medium">
              Active storylets: {loading ? "…" : storylets.length}
            </p>
            <Button variant="secondary" onClick={loadStorylets} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <ul className="space-y-2">
            {storylets.map((storylet) => (
              <li
                key={storylet.id}
                className="rounded border border-slate-200 px-3 py-2 bg-white"
              >
                <p className="font-medium text-slate-900">{storylet.title}</p>
                <p className="text-sm text-slate-600">{storylet.slug}</p>
              </li>
            ))}
            {!loading && storylets.length === 0 ? (
              <li className="text-sm text-slate-600">No active storylets found.</li>
            ) : null}
          </ul>
        </div>
      )}
    </AuthGate>
  );
}
