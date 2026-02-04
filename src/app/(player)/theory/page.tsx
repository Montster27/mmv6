"use client";

import { useState } from "react";
import Link from "next/link";

import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { createHypothesis } from "@/lib/hypotheses";
import { TheorySkeleton } from "@/components/skeletons/TheorySkeleton";
import { useTheoryData } from "@/hooks/queries/useTheoryData";

function TheoryContent() {
  const session = useSession();
  const { data, isLoading, isError, refetch } = useTheoryData(session.user.id);
  const hypotheses = data?.hypotheses ?? [];
  const counts = data?.counts ?? {};
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Theoryboard</h1>
          <p className="text-sm text-slate-600">
            Capture hypotheses and link them to anomalies.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">New hypothesis</h2>
        <label className="block text-sm text-slate-700">
          Title
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm text-slate-700">
          Notes
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            rows={3}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
        </label>
        <Button
          onClick={async () => {
            if (!newTitle.trim()) {
              setError("Title is required.");
              return;
            }
            setCreating(true);
            try {
              await createHypothesis({
                userId: session.user.id,
                title: newTitle.trim(),
                body: newBody.trim(),
              });
              setNewTitle("");
              setNewBody("");
              await refetch();
            } catch (e) {
              console.error(e);
              setError(
                e instanceof Error ? e.message : "Failed to create hypothesis."
              );
            }
            setCreating(false);
          }}
          disabled={creating}
        >
          {creating ? "Saving..." : "Create"}
        </Button>
      </div>

      {error || isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? "Failed to load hypotheses."}
        </div>
      ) : null}

      {isLoading ? <TheorySkeleton /> : null}

      {hypotheses.length === 0 && !isLoading ? (
        <p className="text-slate-700">No hypotheses yet.</p>
      ) : (
        <div className="space-y-3">
          {hypotheses.map((hypothesis) => (
            <Link
              key={hypothesis.id}
              href={`/theory/${hypothesis.id}`}
              className="block rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {hypothesis.title}
                </h3>
                <span className="text-xs text-slate-500">
                  {counts[hypothesis.id] ?? 0} anomalies
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Updated {new Date(hypothesis.updated_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TheoryPage() {
  return <TheoryContent />;
}
