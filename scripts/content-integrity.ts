import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE credentials.");
  process.exit(1);
}

const client = createClient(url, key);

async function main() {
  const { data: storylets, error } = await client
    .from("storylets")
    .select("id,slug,choices,tags,is_active");
  if (error) {
    console.error("Failed to load storylets", error);
    process.exit(1);
  }

  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const missingTargets: string[] = [];
  const unreachable: string[] = [];
  const referenced = new Set<string>();

  for (const s of storylets ?? []) {
    if (ids.has(s.id)) duplicateIds.push(s.id);
    ids.add(s.id);
  }

  for (const s of storylets ?? []) {
    const choices = Array.isArray(s.choices) ? s.choices : [];
    for (const choice of choices) {
      const target = choice?.targetStoryletId;
      if (target) {
        referenced.add(target);
        if (!ids.has(target)) missingTargets.push(`${s.id} -> ${target}`);
      }
    }
  }

  for (const s of storylets ?? []) {
    if (!referenced.has(s.id)) unreachable.push(s.id);
  }

  const phaseCounts: Record<string, number> = {};
  for (const s of storylets ?? []) {
    const tags = Array.isArray(s.tags) ? s.tags : [];
    const phaseTag = tags.find((t) => t.startsWith("phase:"));
    if (!phaseTag) continue;
    const phase = phaseTag.replace("phase:", "");
    phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
  }

  console.log("Content integrity report:");
  console.log(`- Storylets: ${storylets?.length ?? 0}`);
  console.log(`- Duplicate ids: ${duplicateIds.length}`);
  console.log(`- Missing targets: ${missingTargets.length}`);
  console.log(`- Unreachable nodes: ${unreachable.length}`);
  console.log(`- Phase coverage: ${JSON.stringify(phaseCounts)}`);

  if (duplicateIds.length || missingTargets.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
