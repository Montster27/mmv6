import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Playwright config for MMV integration tests.
 *
 * Credentials are read from environment variables (.env.test.local, never checked in).
 * Base URL defaults to the deployed Vercel production URL; override with BASE_URL to
 * run against a preview deployment or local dev server.
 */

// Load .env.test.local manually (Playwright doesn't pick up Next's env loading).
const envFile = resolve(__dirname, ".env.test.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue; // don't override shell-set values
    const value = rawValue.trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "https://mmv-sigma.vercel.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
