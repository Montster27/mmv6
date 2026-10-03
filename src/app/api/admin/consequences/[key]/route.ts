import { NextResponse } from "next/server";
import { contentRead, contentWrite, failure, StudioError } from "@/lib/contentStudio/server";
import { recordId } from "@/core/studio/manifest";
type Context = { params: Promise<{ key: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { key } = await context.params;
    const row = (await contentRead(request, "consequences")).find((row) => recordId(row) === key);
    if (!row) throw new StudioError("Not found", 404);
    return NextResponse.json({ rule: row });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request, context: Context) {
  try { return NextResponse.json(await contentWrite(request, "consequences", (await context.params).key)); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { return NextResponse.json(await contentWrite(request, "consequences", (await context.params).key, true)); }
  catch (error) { return failure(error); }
}
