"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const devQuickEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEV_SWITCH === "1" ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_SWITCH === "true";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/play`,
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Check your email for a magic link to sign in.");
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setMessage(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-md">
      <h1 className="text-2xl font-semibold">Login</h1>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm text-slate-700">
          <span>Email</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send magic link"}
        </Button>
      </form>
      {message && (
        <p className="text-sm text-slate-600" role="status">
        {message}
      </p>
    )}

    {devQuickEnabled && (
      <div className="mt-8 space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Dev email sign-in (no link)</h2>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setDevMessage(null);
            setIsLoading(true);
            try {
              const email = devEmail.trim();
              if (!email) {
                setDevMessage("Enter an email to sign in.");
                setIsLoading(false);
                return;
              }

              await supabase.auth.signOut();

              const { data, error } = await supabase.auth.signInAnonymously();
              if (error || !data?.user) {
                throw error ?? new Error("Anonymous sign-in failed.");
              }
              const user = data.user;

              const displayName = email || `Player-${user.id.slice(0, 6)}`;

              await supabase
                .from("profiles")
                .upsert({ id: user.id, email }, { onConflict: "id" });
              await supabase
                .from("public_profiles")
                .upsert(
                  { user_id: user.id, display_name: displayName },
                  { onConflict: "user_id" }
                );

              setDevMessage(
                `Signed in as ${displayName} (${user.id.slice(0, 6)}…)`
              );
              router.push("/play");
            } catch (err) {
              const fallback =
                err instanceof Error ? err.message : "Dev sign-in failed.";
              setDevMessage(fallback);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Email</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="email"
              placeholder="dev@example.com"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Dev sign-in"}
          </Button>
        </form>
        {devMessage && (
          <p className="text-sm text-slate-600" role="status">
            {devMessage}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Dev-only helper: creates an anonymous Supabase session labeled with the email you enter. Use for local testing only.
        </p>
      </div>
    )}
    </div>
  );
}
