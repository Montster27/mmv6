import { NextResponse } from "next/server";
import { contentRead, contentWrite, failure, StudioError } from "@/lib/contentStudio/server";
import { recordId } from "@/core/studio/manifest";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const row = (await contentRead(request, "tracks")).find((row) => recordId(row) === id);
    if (!row) throw new StudioError("Not found", 404);
    return NextResponse.json({ arc: row });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request, context: Context) {
  try { return NextResponse.json(await contentWrite(request, "tracks", (await context.params).id)); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { return NextResponse.json(await contentWrite(request, "tracks", (await context.params).id, true)); }
  catch (error) { return failure(error); }
}
