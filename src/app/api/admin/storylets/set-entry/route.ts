import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Edit game_entry tags inside a draft workspace and submit the complete change for review." }, { status: 409 });
}
