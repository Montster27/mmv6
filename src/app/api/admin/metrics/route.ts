import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { isEmailAllowed } from "@/lib/adminAuth";
import { fetchMetrics } from "@/server/metrics";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function ensureAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user || !isEmailAllowed(user.email)) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get("days") ?? "14");
  const days = Number.isFinite(daysParam) ? Math.max(1, Math.min(daysParam, 60)) : 14;

  try {
    const metrics = await fetchMetrics(days);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load metrics", error);
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
