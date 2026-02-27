type Requirement =
  | { all: Requirement[] }
  | { any: Requirement[] }
  | { not: Requirement }
  | { path: string; equals: boolean };

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
