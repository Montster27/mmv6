import { NextResponse } from "next/server";
import { failure, studioActor, command } from "@/lib/contentStudio/server";
export async function POST(request: Request) {
  try {
    const actor = await studioActor(request);
    const payload = await request.json();
    return NextResponse.json(await command(actor, "activate", { release_id: payload.version_id }));
  } catch (error) { return failure(error); }
}
