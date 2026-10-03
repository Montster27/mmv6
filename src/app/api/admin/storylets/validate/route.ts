import { NextResponse } from "next/server";
import { contentRead, failure } from "@/lib/contentStudio/server";
import { validateStoryletIssues } from "@/core/validation/storyletValidation";
export async function GET(request: Request) {
  try {
    const rows = await contentRead(request, "storylets");
    const results = rows.map(validateStoryletIssues);
    const errors = results.flatMap((result) => result.errors);
    return NextResponse.json({ ok: errors.length === 0, errors, warnings: results.flatMap((result) => result.warnings), total: rows.length });
  } catch (error) { return failure(error); }
}
