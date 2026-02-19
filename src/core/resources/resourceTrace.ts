import type { ResourceSnapshot } from "@/core/resources/resourceDelta";

export type ResourceTraceEvent = {
  timestamp: string;
  dayIndex: number;
  source: string;
  delta: Record<string, number>;
  before: ResourceSnapshot;
  after: ResourceSnapshot;
  meta?: Record<string, unknown>;
};

const TRACE_LIMIT = 200;

function getTraceBuffer(): ResourceTraceEvent[] {
  const globalAny = globalThis as typeof globalThis & {
    __mmvResourceTrace?: ResourceTraceEvent[];
  };
  if (!globalAny.__mmvResourceTrace) {
    globalAny.__mmvResourceTrace = [];
  }
  return globalAny.__mmvResourceTrace;
}

export function isResourceTraceEnabled() {
  return (
    process.env.NEXT_PUBLIC_DEV_RESOURCE_TRACE === "1" ||
    process.env.DEV_RESOURCE_TRACE === "1"
  );
}

export function recordResourceTrace(event: ResourceTraceEvent) {
  if (!isResourceTraceEnabled()) return;
  const buffer = getTraceBuffer();
  buffer.push(event);
  if (buffer.length > TRACE_LIMIT) {
    buffer.splice(0, buffer.length - TRACE_LIMIT);
  }
}

export function getResourceTrace() {
  return [...getTraceBuffer()];
}
