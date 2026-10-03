import { NextResponse } from "next/server";
import { contentRead, contentWrite, failure } from "@/lib/contentStudio/server";

export async function GET(request: Request) {
  try {
    let rows = await contentRead(request, "consequences");
    const params = new URL(request.url).searchParams;
    const active = params.get("active");
    if (active === "true" || active === "false") rows = rows.filter((row) => Boolean(row.is_active) === (active === "true"));
    const search = params.get("search")?.toLowerCase();
    if (search) rows = rows.filter((row) => `${row.title} ${row.slug}`.toLowerCase().includes(search));
    return NextResponse.json({ rules: rows });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return NextResponse.json(await contentWrite(request, "consequences")); }
  catch (error) { return failure(error); }
}
