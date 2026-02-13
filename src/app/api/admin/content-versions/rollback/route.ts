import { NextResponse } from "next/server";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { canAccessContentStudio } from "@/lib/adminAuthServer";
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

async function ensureContentStudioAccess(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) {
    return null;
  }
  const ok = await canAccessContentStudio(user);
  if (!ok) {
    return null;
  }
  return user;
}

export async function POST(request: Request) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const versionId =
    typeof payload?.version_id === "string" ? payload.version_id : "";
  if (!versionId) {
    return NextResponse.json({ error: "Missing version_id" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("content_versions")
    .select("*")
    .eq("version_id", versionId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const version = data as ContentVersion;
  const { error: insertError } = await admin
    .from("content_versions")
    .insert({
      state: "published",
      snapshot: version.snapshot,
      note: `Rollback to ${version.version_id}`,
      author: user.email ?? null,
    });
  if (insertError) {
    console.error("Failed to rollback version", insertError);
    return NextResponse.json({ error: "Rollback failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
