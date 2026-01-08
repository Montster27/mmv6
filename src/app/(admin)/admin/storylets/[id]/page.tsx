"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase/browser";
import type { Storylet } from "@/types/storylets";
import { validateStorylet } from "@/core/validation/storyletValidation";
import { StoryletCard } from "@/components/storylets/StoryletCard";

type FormState = {
  slug: string;
  title: string;
  body: string;
  is_active: boolean;
  tags: string;
  weight: number;
  requirements: string;
  choices: string;
};

const emptyForm: FormState = {
  slug: "",
  title: "",
  body: "",
  is_active: true,
  tags: "",
  weight: 100,
  requirements: "{}",
  choices: "[]",
};

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseJson(input: string, fallback: any) {
  try {
    const parsed = JSON.parse(input);
    return parsed;
  } catch {
    return fallback;
  }
}

export default function StoryletEditPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const isNew = params.id === "new";

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [storylet, setStorylet] = useState<Storylet | null>(null);

  const previewStorylet = useMemo<Storylet>(() => {
    return {
      id: storylet?.id ?? "preview",
      slug: form.slug,
      title: form.title,
      body: form.body,
      is_active: form.is_active,
      tags: parseTags(form.tags),
      weight: form.weight,
      requirements: parseJson(form.requirements, {}),
      choices: parseJson(form.choices, []),
      created_at: storylet?.created_at,
    };
  }, [form, storylet]);

  useEffect(() => {
    const load = async () => {
      if (isNew) return;
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("No session found.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/admin/storylets/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load storylet");
        }
        const s: Storylet = json.storylet;
        setStorylet(s);
        setForm({
          slug: s.slug,
          title: s.title,
          body: s.body,
          is_active: s.is_active,
          tags: (s.tags ?? []).join(", "),
          weight: s.weight ?? 100,
          requirements: JSON.stringify(s.requirements ?? {}, null, 2),
          choices: JSON.stringify(s.choices ?? [], null, 2),
        });
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to load storylet");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isNew, params.id]);

  const handleSave = async (opts?: { goPreview?: boolean }) => {
    setError(null);
    setValidationErrors([]);
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("No session found.");
      setLoading(false);
      return;
    }

    const draft: Storylet = {
      id: storylet?.id ?? "",
      slug: form.slug,
      title: form.title,
      body: form.body,
      is_active: form.is_active,
      tags: parseTags(form.tags),
      weight: form.weight,
      requirements: parseJson(form.requirements, {}),
      choices: parseJson(form.choices, []),
      created_at: storylet?.created_at,
    };

    const validation = validateStorylet(draft);
    if (!validation.ok) {
      setValidationErrors(validation.errors);
      setLoading(false);
      return;
    }

    try {
      const method = isNew ? "POST" : "PUT";
      const url = isNew
        ? "/api/admin/storylets"
        : `/api/admin/storylets/${storylet?.id}`;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save storylet");
      }
      if (isNew && json.id) {
        router.replace(`/admin/storylets/${json.id}`);
      }
      if (opts?.goPreview) {
        // no-op for now, preview live below
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save storylet");
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
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  {isNew ? "Create Storylet" : "Edit Storylet"}
                </h1>
                <p className="text-slate-700 text-sm">
                  {storylet?.slug ?? "New storylet"}
                </p>
              </div>
              <Link href="/admin/storylets">
                <Button variant="secondary">Back</Button>
              </Link>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {validationErrors.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-semibold">Validation errors:</p>
                <ul className="list-disc list-inside">
                  {validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[3fr,2fr] gap-4">
              <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Slug
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Title
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Body
                  <textarea
                    className="rounded-md border border-slate-300 px-3 py-2"
                    rows={4}
                    value={form.body}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, body: e.target.value }))
                    }
                  />
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </div>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Tags (comma separated)
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tags: e.target.value }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Weight
                  <input
                    type="number"
                    className="rounded-md border border-slate-300 px-3 py-2"
                    value={form.weight}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, weight: Number(e.target.value) }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Requirements (JSON)
                  <textarea
                    className="rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    rows={4}
                    value={form.requirements}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, requirements: e.target.value }))
                    }
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  {"Choices (JSON array of { id, label, outcome? | outcomes? })"}
                  <textarea
                    className="rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    rows={6}
                    value={form.choices}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, choices: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-0 text-xs text-slate-700"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        choices: JSON.stringify(
                          [
                            { id: "A", label: "Option A" },
                            { id: "B", label: "Option B" },
                          ],
                          null,
                          2
                        ),
                      }))
                    }
                  >
                    Insert sample choices
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-0 text-xs text-slate-700"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        choices: JSON.stringify(
                          [
                            {
                              id: "A",
                              label: "Take the risk",
                              outcomes: [
                                {
                                  id: "success",
                                  weight: 70,
                                  text: "It pays off.",
                                  deltas: { energy: 2, vectors: { focus: 1 } },
                                  modifiers: { vector: "focus", per10: 2 },
                                },
                                {
                                  id: "setback",
                                  weight: 30,
                                  text: "It backfires.",
                                  deltas: { stress: 2 },
                                },
                              ],
                            },
                          ],
                          null,
                          2
                        ),
                      }))
                    }
                  >
                    Insert probabilistic template
                  </Button>
                </label>

                <div className="flex gap-2">
                  <Button disabled={loading} onClick={() => handleSave()}>
                    {loading ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    disabled={loading}
                    variant="secondary"
                    onClick={() => handleSave({ goPreview: true })}
                  >
                    {loading ? "Saving..." : "Save & Preview"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/admin/storylets")}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <StoryletCard storylet={previewStorylet} disabled />
                {previewStorylet.choices?.length ? (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <p className="font-medium">Preview choices</p>
                    <ul className="mt-1 space-y-1">
                      {previewStorylet.choices.map((choice) => (
                        <li key={choice.id} className="flex items-center gap-2">
                          <span>{choice.label}</span>
                          {choice.outcomes?.length ? (
                            <span className="text-xs text-slate-500">(chance)</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      }}
    </AuthGate>
  );
}
