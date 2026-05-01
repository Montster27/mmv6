import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_SENTRY_DEV_ENABLE === "true",
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "dev",
  tracesSampleRate: 0.1,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] }),
  ],
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
