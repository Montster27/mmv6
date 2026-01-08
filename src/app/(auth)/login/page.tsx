"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/browser";

const devQuickEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEV_SWITCH === "1" ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_SWITCH === "true";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

async function lookupEmailByUsername(usernameLower: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_email_by_username", {
    u: usernameLower,
  });
  if (error) {
    console.error("Username lookup failed", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

async function upsertProfile(params: {
  userId: string;
  email: string;
  username: string;
}) {
  const usernameLower = normalizeUsername(params.username);
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: params.userId,
        email: params.email,
        username: params.username,
        username_lower: usernameLower,
      },
      { onConflict: "id" }
    );
  if (profileError) throw profileError;

  const { error: publicProfileError } = await supabase
    .from("public_profiles")
    .upsert(
      { user_id: params.userId, display_name: params.username },
      { onConflict: "user_id" }
    );
  if (publicProfileError) throw publicProfileError;
}

export default function LoginPage() {
  const router = useRouter();
  const buildStamp =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 7) ??
    "dev";

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const [emailLoginEmail, setEmailLoginEmail] = useState("");
  const [emailLoginPassword, setEmailLoginPassword] = useState("");
  const [emailLoginError, setEmailLoginError] = useState<string | null>(null);
  const [emailLoginLoading, setEmailLoginLoading] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  const handleUsernameLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const usernameLower = normalizeUsername(loginUsername);
      if (!usernameLower || !loginPassword) {
        setLoginError("Invalid username or password.");
        return;
      }

      const email = await lookupEmailByUsername(usernameLower);
      if (!email) {
        setLoginError("Invalid username or password.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) {
        setLoginError("Invalid username or password.");
        return;
      }

      router.push("/play");
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setLoginError(fallback);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupError(null);
    setSignupMessage(null);
    setSignupLoading(true);

    try {
      const username = signupUsername.trim();
      const usernameLower = normalizeUsername(username);
      const email = signupEmail.trim();
      if (!username || !email || !signupPassword) {
        setSignupError("All fields are required.");
        return;
      }

      const existing = await lookupEmailByUsername(usernameLower);
      if (existing) {
        setSignupError("Username is already taken.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/play`,
        },
      });

      if (error) {
        setSignupError(error.message);
        return;
      }

      if (data.session?.user) {
        await upsertProfile({
          userId: data.session.user.id,
          email,
          username,
        });
        router.push("/play");
      } else {
        setSignupMessage(
          "Check your email to confirm your account, then sign in."
        );
      }
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setSignupError(fallback);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailLoginError(null);
    setEmailLoginLoading(true);

    try {
      const email = emailLoginEmail.trim();
      if (!email || !emailLoginPassword) {
        setEmailLoginError("Invalid email or password.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: emailLoginPassword,
      });

      if (error) {
        setEmailLoginError("Invalid email or password.");
        return;
      }

      router.push("/play");
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setEmailLoginError(fallback);
    } finally {
      setEmailLoginLoading(false);
    }
  };

  const handleMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMagicMessage(null);
    setMagicLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/play`,
        },
      });

      if (error) {
        setMagicMessage(error.message);
        return;
      }

      setMagicMessage("Check your email for a magic link to sign in.");
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setMagicMessage(fallback);
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-md">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Login</h1>
        <span className="text-xs text-slate-400">build {buildStamp}</span>
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Sign in with username</h2>
        <form className="space-y-3" onSubmit={handleUsernameLogin}>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Username</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="text"
              autoComplete="username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Password</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={loginLoading}>
            {loginLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        {loginError && (
          <p className="text-sm text-slate-600" role="status">
            {loginError}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Create account</h2>
        <form className="space-y-3" onSubmit={handleSignup}>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Username</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="text"
              autoComplete="username"
              value={signupUsername}
              onChange={(e) => setSignupUsername(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Email</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="email"
              autoComplete="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Password</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="password"
              autoComplete="new-password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={signupLoading}>
            {signupLoading ? "Creating..." : "Sign up"}
          </Button>
        </form>
        {signupError && (
          <p className="text-sm text-slate-600" role="status">
            {signupError}
          </p>
        )}
        {signupMessage && (
          <p className="text-sm text-slate-600" role="status">
            {signupMessage}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Sign in with email</h2>
        <form className="space-y-3" onSubmit={handleEmailLogin}>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Email</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="email"
              autoComplete="email"
              value={emailLoginEmail}
              onChange={(e) => setEmailLoginEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Password</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="password"
              autoComplete="current-password"
              value={emailLoginPassword}
              onChange={(e) => setEmailLoginPassword(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={emailLoginLoading}>
            {emailLoginLoading ? "Signing in..." : "Sign in with email"}
          </Button>
        </form>
        {emailLoginError && (
          <p className="text-sm text-slate-600" role="status">
            {emailLoginError}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Magic link (legacy)</h2>
        <form className="space-y-3" onSubmit={handleMagicLink}>
          <label className="block space-y-1 text-sm text-slate-700">
            <span>Email</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              type="email"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={magicLoading}>
            {magicLoading ? "Sending..." : "Send magic link"}
          </Button>
        </form>
        {magicMessage && (
          <p className="text-sm text-slate-600" role="status">
            {magicMessage}
          </p>
        )}
      </div>

      {devQuickEnabled && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Dev email sign-in (no link)</h2>
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setDevMessage(null);
              setDevLoading(true);
              try {
                const email = devEmail.trim();
                if (!email) {
                  setDevMessage("Enter an email to sign in.");
                  setDevLoading(false);
                  return;
                }

                await supabase.auth.signOut();

                const { data, error } = await supabase.auth.signInAnonymously();
                if (error || !data?.user) {
                  throw error ?? new Error("Anonymous sign-in failed.");
                }
                const user = data.user;
                const displayName = email || `Player-${user.id.slice(0, 6)}`;

                const { error: profileError } = await supabase
                  .from("profiles")
                  .upsert({ id: user.id, email }, { onConflict: "id" });
                if (profileError) {
                  throw profileError;
                }
                const { error: publicProfileError } = await supabase
                  .from("public_profiles")
                  .upsert(
                    { user_id: user.id, display_name: displayName },
                    { onConflict: "user_id" }
                  );
                if (publicProfileError) {
                  throw publicProfileError;
                }

                setDevMessage(
                  `Signed in as ${displayName} (${user.id.slice(0, 6)}...)`
                );
                router.push("/play");
              } catch (err) {
                const fallback =
                  err instanceof Error ? err.message : "Dev sign-in failed.";
                setDevMessage(fallback);
              } finally {
                setDevLoading(false);
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
            <Button type="submit" disabled={devLoading}>
              {devLoading ? "Signing in..." : "Dev sign-in"}
            </Button>
          </form>
          {devMessage && (
            <p className="text-sm text-slate-600" role="status">
              {devMessage}
            </p>
          )}
          <p className="text-xs text-slate-500">
            Dev-only helper for local testing.
          </p>
        </div>
      )}
    </div>
  );
}
