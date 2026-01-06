"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabaseClient";
import type { Storylet } from "@/types/storylets";

type FilterState = {
  search: string;
  active: "all" | "true" | "false";
};

export default function StoryletAdminListPage() {
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [filter, setFilter] = useState<FilterState>({
    search: "",
    active: "all",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStorylets = async (token: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.active !== "all") params.set("active", filter.active);
    try {
      const res = await fetch(`/api/admin/storylets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load storylets");
      }
      setStorylets(json.storylets ?? []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load storylets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGate>
      {(session) => {
        const email = session.user.email;
        if (!isEmailAllowed(email)) {
          return (
            <div className="p-6 space-y-3">
              <h1 className="text-2xl font-semibold">Admin</h1>
              <p className="text-slate-700">Not authorized.</p>
            </div>
          );
        }

        return (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Storylets</h1>
                <p className="text-slate-700 text-sm">
                  Manage and preview storylets.
                </p>
              </div>
              <Link href="/admin/storylets/new">
                <Button>Create storylet</Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col text-sm text-slate-700">
                Search
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={filter.search}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, search: e.target.value }))
                  }
                  onBlur={async () => {
                    const { data } = await supabase.auth.getSession();
                    const token = data.session?.access_token;
                    if (token) loadStorylets(token);
                  }}
                  placeholder="slug or title"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-700">
                Active
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={filter.active}
                  onChange={async (e) => {
                    setFilter((f) => ({ ...f, active: e.target.value as any }));
                    const { data } = await supabase.auth.getSession();
                    const token = data.session?.access_token;
                    if (token)
                      loadStorylets(token);
                  }}
                >
                  <option value="all">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <Button
                variant="secondary"
                onClick={async () => {
                  const { data } = await supabase.auth.getSession();
                  const token = data.session?.access_token;
                  if (token) loadStorylets(token);
                }}
              >
                Refresh
              </Button>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
                {error}
              </div>
            ) : null}

            {loading ? <p>Loading…</p> : null}

            <div className="overflow-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Slug</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2">Tags</th>
                    <th className="px-3 py-2">Weight</th>
                    <th className="px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {storylets.map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2">
                        <Link
                          className="text-slate-800 hover:underline"
                          href={`/admin/storylets/${s.id}`}
                        >
                          {s.slug}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{s.title}</td>
                      <td className="px-3 py-2">
                        {s.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-3 py-2">
                        {(s.tags ?? []).join(", ")}
                      </td>
                      <td className="px-3 py-2">{s.weight ?? 100}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    </AuthGate>
  );
}
