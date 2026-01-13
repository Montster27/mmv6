import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("storylets")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load content stamp", error);
    return NextResponse.json({ error: "Failed to load stamp" }, { status: 500 });
  }

  return NextResponse.json({
    stamp: data?.updated_at ?? null,
  });
}
