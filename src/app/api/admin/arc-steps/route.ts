import { NextResponse } from "next/server";
import { contentRead, failure } from "@/lib/contentStudio/server";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("arc_id");
    const rows = (await contentRead(request, "storylets")).filter((row) => row.track_id && (!id || row.track_id === id));
    return NextResponse.json({ steps: rows.map((row) => ({ ...row, arc_id: row.track_id, step_key: row.storylet_key, options: row.choices, default_next_step_key: row.default_next_key })) });
  } catch (error) { return failure(error); }
}
