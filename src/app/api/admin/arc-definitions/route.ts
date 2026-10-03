import { NextResponse } from "next/server";
import { contentRead, contentWrite, failure } from "@/lib/contentStudio/server";

export async function GET(request: Request) {
  try {
    let rows = await contentRead(request, "tracks");
    const params = new URL(request.url).searchParams;
    const active = params.get("active");
    if (active === "true" || active === "false") rows = rows.filter((row) => Boolean(row.is_enabled) === (active === "true"));
    const search = params.get("search")?.toLowerCase();
    if (search) rows = rows.filter((row) => `${row.title} ${row.key}`.toLowerCase().includes(search));
    return NextResponse.json({ arcs: rows });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { const result = await contentWrite(request, "tracks"); return NextResponse.json({ ...result, arc: result.record }); }
  catch (error) { return failure(error); }
}
