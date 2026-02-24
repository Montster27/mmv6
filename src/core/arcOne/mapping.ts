import type { ExpiredOpportunity, LifePressureState } from "@/core/arcOne/types";

export function mapTagsToIdentity(tags: string[]): string[] {
  const identity: string[] = [];
  const lower = tags.map((tag) => tag.toLowerCase());
  if (lower.some((tag) => ["risk", "courage"].includes(tag))) identity.push("risk");
  if (lower.some((tag) => ["safety", "protect"].includes(tag))) identity.push("safety");
  if (lower.some((tag) => ["belonging", "love", "people", "social"].includes(tag))) {
    identity.push("people");
  }
  if (lower.some((tag) => ["achievement", "craft", "agency", "focus"].includes(tag))) {
    identity.push("achievement");
  }
  if (lower.some((tag) => ["confront", "assert"].includes(tag))) identity.push("confront");
  if (lower.some((tag) => ["avoid"].includes(tag))) identity.push("avoid");
  return identity;
}

export function mapArcTagsToOpportunity(tags: string[]): ExpiredOpportunity["type"] {
  const lower = tags.map((tag) => tag.toLowerCase());
  if (lower.some((tag) => ["belonging", "love", "social"].includes(tag))) {
    return "social";
  }
  if (lower.some((tag) => ["hustle", "money", "financial"].includes(tag))) {
    return "financial";
  }
  return "academic";
}

export function shouldFlagIdentity(tag: string): tag is keyof LifePressureState {
  return ["risk", "safety", "people", "achievement", "confront", "avoid"].includes(tag);
}
