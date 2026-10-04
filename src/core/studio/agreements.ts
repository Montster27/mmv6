import type { StudioIssue, StudioManifest, StudioRecord } from "@/types/studio";

export type FactSchema = { type: "boolean" | "number" | "enum"; values?: string[]; default_known: boolean; default_value?: unknown };
export type FactUse = { definition_id: string; mode: "requires" | "establishes"; value: unknown };
export type Reservation = {
  segment?: string; track_id: string; day: number; start_hour: number; end_hour: number;
  location_id: string; npc_ids: string[]; conditions: FactUse[];
};
const idOf = (row: StudioRecord) => String(row.id ?? row.key ?? "");
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function matchesFact(schema: FactSchema, value: unknown): boolean {
  if (schema.type === "boolean") return typeof value === "boolean";
  if (schema.type === "number") return typeof value === "number" && Number.isFinite(value);
  return schema.type === "enum" && typeof value === "string" && Boolean(schema.values?.includes(value));
}
/** References explicitly authored through fact-use and calendar forms participate in impact review. */
export function agreementReferences(row: StudioRecord): string[] {
  const reservation = object(row.reservation);
  const uses = [...(Array.isArray(row.fact_uses) ? row.fact_uses : []), ...(Array.isArray(reservation?.conditions) ? reservation.conditions : [])];
  return [...uses.flatMap((use) => typeof use?.definition_id === "string" ? [use.definition_id] : []),
    ...(typeof reservation?.location_id === "string" ? [reservation.location_id] : []),
    ...(Array.isArray(reservation?.npc_ids) ? reservation.npc_ids.filter((id): id is string => typeof id === "string") : []),
    ...uses.flatMap((use) => typeof use?.storylet_id === "string" ? [use.storylet_id] : []),
    ...(Array.isArray(row.storylet_ids) ? row.storylet_ids.filter((id): id is string => typeof id === "string") : []),
    ...(typeof reservation?.track_id === "string" ? [reservation.track_id] : [])];
}
export function validateAgreements(manifest: StudioManifest): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const issue = (severity: StudioIssue["severity"], row: StudioRecord, message: string) => issues.push({ severity, objectId: idOf(row), message });
  const definitions = new Map(manifest.definitions.map((row) => [idOf(row), row]));
  const schemas = new Map<string, FactSchema>();
  for (const row of manifest.definitions) {
    if (row.fact_schema === undefined) continue;
    const schema = object(row.fact_schema) as FactSchema | null;
    if (row.kind !== "fact" || !schema || !["boolean", "number", "enum"].includes(schema.type) || typeof schema.default_known !== "boolean") {
      issue("error", row, "Invalid typed fact definition."); continue;
    }
    if (schema.type === "enum" && (!Array.isArray(schema.values) || !schema.values.length || schema.values.some((v) => typeof v !== "string" || !v.trim()) || new Set(schema.values).size !== schema.values.length)) {
      issue("error", row, "A named-value fact needs distinct, nonempty allowed values."); continue;
    }
    if (schema.default_known && !matchesFact(schema, schema.default_value)) issue("error", row, "Known default does not match the fact’s value type.");
    schemas.set(idOf(row), schema);
  }
  function checkUses(row: StudioRecord, raw: unknown): FactUse[] {
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) { issue("error", row, "Fact agreements must be a list."); return []; }
    const uses: FactUse[] = [];
    const required = new Map<string, unknown>();
    for (const value of raw) {
      const use = object(value) as FactUse | null;
      const fact = use && definitions.get(use.definition_id);
      const schema = use && schemas.get(use.definition_id);
      if (!use || !["requires", "establishes"].includes(use.mode) || !fact || !schema) { issue("error", row, "Fact agreement references a missing or untyped fact."); continue; }
      if (!matchesFact(schema, use.value)) { issue("error", row, `Value for ${fact.title ?? use.definition_id} does not match its definition.`); continue; }
      if (use.mode === "requires" && required.has(use.definition_id) && required.get(use.definition_id) !== use.value) issue("error", row, `Entry assumptions require incompatible values for ${fact.title ?? use.definition_id}.`);
      if (use.mode === "requires") required.set(use.definition_id, use.value);
      uses.push(use);
    }
    return uses;
  }
  const reservations: { row: StudioRecord; value: Reservation }[] = [];
  for (const row of [...manifest.plans, ...manifest.definitions]) {
    checkUses(row, row.fact_uses);
    if (row.reservation === undefined) continue;
    const res = object(row.reservation) as Reservation | null;
    if (!res || row.kind !== "calendar" || !Number.isInteger(res.day) || res.day < 0 || !Number.isFinite(res.start_hour) || !Number.isFinite(res.end_hour) || res.start_hour < 0 || res.end_hour > 24 || res.start_hour >= res.end_hour) {
      issue("error", row, "Calendar reservation needs a nonnegative track day and a valid time window within 0–24 hours."); continue;
    }
    if (!manifest.tracks.some((track) => idOf(track) === res.track_id)) issue("error", row, "Calendar reservation needs an existing track clock.");
    if (definitions.get(res.location_id)?.kind !== "location") issue("error", row, "Calendar reservation needs a defined location.");
    if (!Array.isArray(res.npc_ids) || res.npc_ids.some((id) => definitions.get(id)?.kind !== "npc")) { issue("error", row, "Calendar participants must reference defined NPCs."); continue; }
    const conditions = checkUses(row, res.conditions);
    if (conditions.some((condition) => condition.mode !== "requires")) issue("error", row, "Calendar conditions must be entry assumptions, not outputs.");
    reservations.push({ row, value: { ...res, conditions } });
  }
  for (let i = 0; i < reservations.length; i++) for (let j = i + 1; j < reservations.length; j++) {
    const a = reservations[i], b = reservations[j];
    const shared = a.value.npc_ids.filter((id) => b.value.npc_ids.includes(id));
    if (!shared.length || a.value.location_id === b.value.location_id) continue;
    if (a.value.conditions.some((x) => b.value.conditions.some((y) => x.definition_id === y.definition_id && x.value !== y.value))) continue;
    if (a.value.track_id !== b.value.track_id) {
      issue("warning", b.row, `Check shared NPC availability with ${a.row.title}: different track clocks prevent a proven overlap check.`); continue;
    }
    if (a.value.day !== b.value.day || a.value.start_hour >= b.value.end_hour || b.value.start_hour >= a.value.end_hour) continue;
    const names = shared.map((id) => definitions.get(id)?.title ?? id).join(", ");
    const conditional = a.value.conditions.length > 0 || b.value.conditions.length > 0;
    issue(conditional ? "warning" : "error", b.row, `${names} ${conditional ? "may be" : "is"} booked at different locations at overlapping times with ${a.row.title}.`);
  }
  return issues;
}
