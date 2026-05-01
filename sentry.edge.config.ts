import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled:
    process.env.NODE_ENV !== "development" ||
    process.env.SENTRY_DEV_ENABLE === "true",
  environment:
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release:
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    "dev",
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
});
