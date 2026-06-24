"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/contexts/SessionContext";
import {
  CLUB_DESCRIPTION_MAX,
  CLUB_NAME_MAX,
  createClubRequest,
} from "@/lib/clubs";
import { Button } from "@/components/ui/button";

function NewClubForm() {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const { club } = await createClubRequest(session.access_token, {
        name: name.trim(),
        description: description.trim(),
        is_open_to_applications: isOpen,
      });
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      router.replace(`/clubs/${club.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create club.");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Found a club</h1>
        <p className="text-sm text-slate-600">
          You become the founder and first member. You can found a club only if
          you aren&apos;t already in one.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 space-y-4 max-w-xl">
        <label className="block text-sm text-slate-700">
          Club name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            value={name}
            maxLength={CLUB_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Society for Creative Anachronism"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Description
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
            rows={4}
            value={description}
            maxLength={CLUB_DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this club about?"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
          />
          Open to applications
        </label>

        <div className="flex items-center gap-3">
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Founding…" : "Found club"}
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/clubs">Cancel</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function NewClubPage() {
  return <NewClubForm />;
}
