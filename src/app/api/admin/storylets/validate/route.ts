import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/adminAuthServer";
import {
  coerceStoryletRow,
  validateStoryletIssues,
  validateArcDefinitions,
} from "@/core/validation/storyletValidation";

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
  if (!user) return null;
  const ok = await isUserAdmin(user);
  return ok ? user : null;
}

export async function GET(request: Request) {
  const admin = await ensureAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data: rows, error } = await supabaseServer
    .from("storylets")
    .select("id,slug,title,body,choices,is_active,created_at,tags,requirements,weight")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch storylets", error);
    return NextResponse.json({ error: "Failed to fetch storylets" }, { status: 500 });
  }

  const errors = [];
  const warnings = [];
  const storylets = (rows ?? []).map((row) => coerceStoryletRow(row));

  storylets.forEach((storylet) => {
    const res = validateStoryletIssues(storylet);
    if (res.errors.length) errors.push(...res.errors);
    if (res.warnings.length) warnings.push(...res.warnings);
  });

  const arcWarnings = validateArcDefinitions(storylets);
  if (arcWarnings.length) warnings.push(...arcWarnings);

  return NextResponse.json({
    errors,
    warnings,
    counts: {
      storylets: storylets.length,
      errors: errors.length,
      warnings: warnings.length,
    },
  });
}
