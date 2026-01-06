import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getExperimentConfig } from "@/lib/experiments";

export default function Home() {
  const experiments = getExperimentConfig();

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900">MMV Phase One</h1>
        <nav className="space-y-2 text-slate-700">
          <Link className="block underline underline-offset-4" href="/login">
            Login
          </Link>
          <Link className="block underline underline-offset-4" href="/play">
            Play
          </Link>
          <Link className="block underline underline-offset-4" href="/admin">
            Admin
          </Link>
        </nav>
        <pre className="text-xs text-slate-600 bg-slate-100 rounded p-3">
          {JSON.stringify(experiments, null, 2)}
        </pre>
      </div>
    </main>
  );
}
