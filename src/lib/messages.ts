import type { UXMessage, MessageTone } from "@/types/messages";

let counter = 0;

function nextId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export function gameMessage(
  body: string,
  options?: { title?: string; tone?: MessageTone; details?: string }
): UXMessage {
  return {
    id: nextId("game"),
    kind: "game",
    tone: options?.tone ?? "neutral",
    title: options?.title,
    body,
    details: options?.details,
    createdAt: new Date().toISOString(),
  };
}

export function testerMessage(
  body: string,
  options?: { title?: string; tone?: MessageTone; details?: string }
): UXMessage {
  return {
    id: nextId("tester"),
    kind: "tester",
    tone: options?.tone ?? "neutral",
    title: options?.title,
    body,
    details: options?.details,
    createdAt: new Date().toISOString(),
  };
}
