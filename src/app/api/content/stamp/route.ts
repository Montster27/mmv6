import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: auth, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await supabaseServer.rpc("runtime_release_id", { p_user_id: auth.user.id });
  if (error) return NextResponse.json({ error: "Release unavailable" }, { status: 500 });
  return NextResponse.json({ stamp: data }, { headers: { "Cache-Control": "private, no-store" } });
}
