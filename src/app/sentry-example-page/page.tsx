"use client";

export default function SentryExamplePage() {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h1>Sentry Example Page</h1>
      <p>
        Used to verify Sentry capture in preview deployments. Click the button
        below to throw a client-side error; it should appear in the Sentry
        dashboard within ~30 seconds tagged with the current environment and
        release SHA.
      </p>
      <button
        type="button"
        onClick={() => {
          throw new Error(
            `Sentry test error from /sentry-example-page — ${new Date().toISOString()}`,
          );
        }}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Throw client-side error
      </button>
    </div>
  );
}
