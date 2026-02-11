import { REQUIRED_TELEMETRY_EVENTS } from "../src/types/telemetry";

const unique = new Set(REQUIRED_TELEMETRY_EVENTS);
if (unique.size !== REQUIRED_TELEMETRY_EVENTS.length) {
  console.error("Duplicate telemetry events detected.");
  process.exit(1);
}

console.log("Required telemetry events:");
for (const event of REQUIRED_TELEMETRY_EVENTS) {
  console.log(`- ${event}`);
}
