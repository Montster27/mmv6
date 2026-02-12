import { NextResponse } from "next/server";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { isUserAdmin } from "@/lib/adminAuthServer";
import { supabaseServer } from "@/lib/supabase/server";
import type { ContentVersion } from "@/types/contentVersions";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
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
  if (!user) {
    return null;
  }
  const ok = await isUserAdmin(user);
  if (!ok) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("content_versions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to list content versions", error);
    return NextResponse.json(
      { error: "Failed to list content versions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ versions: (data ?? []) as ContentVersion[] });
}

export async function POST(request: Request) {
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const note = typeof payload?.note === "string" ? payload.note.trim() : "";
  if (!note) {
    return NextResponse.json({ error: "Missing note" }, { status: 400 });
  }

  const admin = getAdminClient();
  const storyletsRes = await admin.from("storylets").select("*");
  if (storyletsRes.error) {
    console.error("Failed to load storylets", storyletsRes.error);
    return NextResponse.json({ error: "Failed to snapshot storylets" }, { status: 500 });
  }
  const consequencesRes = await admin.from("delayed_consequence_rules").select("*");
  if (consequencesRes.error) {
    console.error("Failed to load consequences", consequencesRes.error);
    return NextResponse.json(
      { error: "Failed to snapshot consequences" },
      { status: 500 }
    );
  }
  const remnantRes = await admin.from("remnant_rules").select("*");
  if (remnantRes.error) {
    console.error("Failed to load remnant rules", remnantRes.error);
    return NextResponse.json(
      { error: "Failed to snapshot remnant rules" },
      { status: 500 }
    );
  }

  const snapshot = {
    storylets: storyletsRes.data ?? [],
    consequences: consequencesRes.data ?? [],
    remnantRules: remnantRes.data ?? [],
  };

  const { data, error } = await admin
    .from("content_versions")
    .insert({
      state: "published",
      snapshot,
      note,
      author: user.email ?? null,
    })
    .select("version_id")
    .maybeSingle();

  if (error) {
    console.error("Failed to publish content", error);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }

  return NextResponse.json({ version_id: data?.version_id });
}
