type Requirement =
  | { all: Requirement[] }
  | { any: Requirement[] }
  | { not: Requirement }
  | { path: string; equals: boolean }
  | { requires_npc_known: string[] }
  | { requires_npc_met: string[] };

function getPathValue(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, data);
}

export function matchesRequirement(
  requirement: Record<string, unknown> | null | undefined,
  data: Record<string, unknown>
): boolean {
  if (!requirement || typeof requirement !== "object") return false;
  const req = requirement as Requirement;
  const requiresKnown = Array.isArray((req as any).requires_npc_known)
    ? ((req as any).requires_npc_known as string[])
    : [];
  const requiresMet = Array.isArray((req as any).requires_npc_met)
    ? ((req as any).requires_npc_met as string[])
    : [];
  const hasNpcRequirements = requiresKnown.length > 0 || requiresMet.length > 0;
  const npcKnownOk = requiresKnown.every(
    (npcId) =>
      getPathValue(data, `npc_memory.${npcId}.knows_name`) === true
  );
  const npcMetOk = requiresMet.every(
    (npcId) => getPathValue(data, `npc_memory.${npcId}.met`) === true
  );
  if (hasNpcRequirements && !(npcKnownOk && npcMetOk)) return false;
  const hasOtherRequirements =
    "all" in req ||
    "any" in req ||
    "not" in req ||
    ("path" in req && "equals" in req);
  if (hasNpcRequirements && !hasOtherRequirements) return true;
  if ("all" in req) {
    return req.all.every((child) => matchesRequirement(child as any, data));
  }
  if ("any" in req) {
    return req.any.some((child) => matchesRequirement(child as any, data));
  }
  if ("not" in req) {
    return !matchesRequirement(req.not as any, data);
  }
  if ("path" in req && "equals" in req) {
    return getPathValue(data, req.path) === req.equals;
  }
  return false;
}
