import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { isEmailAllowed } from "@/lib/adminAuth";
import { validateStorylet, coerceStoryletRow } from "@/core/validation/storyletValidation";
import type { Storylet } from "@/types/storylets";

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
  const search = searchParams.get("search") || "";
  const active = searchParams.get("active");

  const admin = getAdminClient();
  let query = admin
    .from("storylets")
    .select("id,slug,title,is_active,tags,weight,updated_at,choices,body");

  if (active === "true") {
    query = query.eq("is_active", true);
  } else if (active === "false") {
    query = query.eq("is_active", false);
  }

  if (search) {
    query = query.ilike("slug", `%${search}%`).or(`title.ilike.%${search}%`);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) {
    console.error("Failed to list storylets", error);
    return NextResponse.json({ error: "Failed to list storylets" }, { status: 500 });
  }

  const safe = (data ?? []).map((row) => coerceStoryletRow(row));
  return NextResponse.json({ storylets: safe });
}

export async function POST(request: Request) {
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const draft: Storylet = {
    id: payload.id || "",
    slug: payload.slug ?? "",
    title: payload.title ?? "",
    body: payload.body ?? "",
    is_active: Boolean(payload.is_active),
    tags: payload.tags ?? [],
    weight: payload.weight ?? 100,
    requirements: payload.requirements ?? {},
    choices: payload.choices ?? [],
    created_at: payload.created_at,
  };

  const validation = validateStorylet(draft);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("storylets")
    .insert({
      slug: draft.slug,
      title: draft.title,
      body: draft.body,
      choices: draft.choices,
      is_active: draft.is_active,
      tags: draft.tags ?? [],
      weight: draft.weight ?? 100,
      requirements: draft.requirements ?? {},
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to create storylet", error);
    return NextResponse.json({ error: "Failed to create storylet" }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id });
}
