# Code session brief — Sentry integration

## Why

Phase 1 `[STATE]` instrumentation works (verified 2026-04-29 across multi-day captures). But it requires Monty to actively capture logs at the right moment — which means an intermittent bug like T-1777400000001 may go uncaptured because nobody was looking when it fired.

Sentry solves the inverse problem: when something crashes, errors and their context get shipped automatically whether or not anyone was watching. Combined with the existing `[STATE]` instrumentation as breadcrumbs, every error report comes with the trail of state mutations leading up to it — exactly what diagnosis needs without Monty having to capture by hand.

This brief covers four things, in order:

1. Set up Sentry for the project (`@sentry/nextjs`, same org as Monty's existing project).
2. Wire DSN and auth token through Vercel for preview deployments.
3. Set up source map upload so stack traces are readable.
4. Wire `[STATE]` log entries as Sentry breadcrumbs so error reports carry the state-mutation history.

Ship as one commit on `feature/period-stance-infrastructure` (or a separate branch and merge — your call, but `feature/period-stance-infrastructure` is fine since this is additive infrastructure, not a fix to that branch's content).

## Hard rules

- **Don't touch the existing `[STATE]` instrumentation logic.** Sentry breadcrumbs are an *additional* output of `logState()`, not a replacement. Keep the console + sessionStorage paths intact.
- **No fixes for T-1777400000001 in this work.** Even if Sentry surfaces an obvious bug during setup testing, don't fix it. Sentry setup is the deliverable; bug diagnosis happens in a follow-up session with the breadcrumbs in hand.
- **Preview environment first.** Local development should send to a separate environment tag (or be disabled). Production environment doesn't yet exist in scope; preview is what matters for playtests.

## Step 1 — Create Sentry project

Monty has confirmed this should go in the **same Sentry org** as his other project. The Next.js wizard handles project creation interactively, but if you want to do it manually:

1. Sentry dashboard → Monty's existing org → "Create Project"
2. Platform: Next.js
3. Project name: `mmv6` or `mmv` (whatever matches the repo naming convention there — Monty knows)
4. Alert defaults are fine for now; can tune later

Save the DSN that Sentry generates. You'll need it for env wiring.

## Step 2 — Install `@sentry/nextjs` via wizard

In the repo:

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard will:
- Install `@sentry/nextjs` as a dep
- Create `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Wrap `next.config.ts` with `withSentryConfig`
- Add a `.sentryclirc` (or use env vars — preferred, see Step 4)
- Optionally create a `/sentry-example-page` route for testing — keep it; we'll use it in Step 5

Walk through wizard prompts:
- **Use existing or create new project**: choose the project from Step 1
- **Source maps**: yes
- **CI integration**: skip if it asks (Vercel handles this; we configure manually in Step 4)
- **Performance monitoring**: yes (default sample rate 10% or wizard-suggested rate is fine)
- **Replay**: optional. Skip for now to keep scope tight; can add later if useful.

After wizard finishes, check the generated configs:

- `sentry.client.config.ts` and `sentry.server.config.ts` should reference `process.env.NEXT_PUBLIC_SENTRY_DSN` and `process.env.SENTRY_DSN` respectively (or whatever the wizard chose)
- `next.config.ts` should be wrapped with `withSentryConfig`
- Confirm `tsc --noEmit` is clean after wizard changes

## Step 3 — Environment-specific config

Edit the generated configs to:

1. **Set environment from runtime context.** In `sentry.client.config.ts` and `sentry.server.config.ts`, set:
   ```ts
   environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
   ```
   This gives `production` / `preview` / `development` automatically based on where the code runs. Sentry's UI lets you filter by environment.

2. **Tag releases by build SHA.** Same configs:
   ```ts
   release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "dev"
   ```
   This ties each error to a specific deployed commit. Critical for correlating Sentry reports to the rapid-iteration commits we've been shipping.

3. **Enable client-side console capture (optional but useful).** In `sentry.client.config.ts`:
   ```ts
   integrations: [
     Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] })
   ]
   ```
   This captures console.error and console.warn as Sentry events even if no exception is thrown. Useful catch-net for the kinds of silent failures that cause T-1777400000001-shaped bugs.

4. **Disable for local dev unless explicitly enabled.** Top of both configs:
   ```ts
   enabled: process.env.NODE_ENV !== "development" || process.env.SENTRY_DEV_ENABLE === "true"
   ```
   Local dev rarely benefits from Sentry capture and creates noise in the dashboard. Opt-in for local debugging if needed.

## Step 4 — Vercel env vars

In Vercel dashboard → mmv6 → Settings → Environment Variables, add for **Preview** and **Production** scopes (skip Development unless you want local capture):

- `NEXT_PUBLIC_SENTRY_DSN` — the DSN from Step 1 (Public flag because the client config reads it)
- `SENTRY_DSN` — same DSN value (the server config reads this; some setups want it separate even if same value)
- `SENTRY_AUTH_TOKEN` — for source map upload during build. Generate at Sentry → Settings → Auth Tokens. Scope it to: `project:releases`, `project:write`, `org:read`. **Do not mark this NEXT_PUBLIC_** — it's a build-time secret and must not ship to client.
- `SENTRY_ORG` — your Sentry org slug
- `SENTRY_PROJECT` — `mmv6` or whatever Step 1 named it

Trigger a redeploy after adding env vars. Vercel won't pick up new env vars on existing deployments — they only apply to fresh builds.

## Step 5 — Test with deliberate error

The wizard creates `/sentry-example-page` (or similar). Hit that route on the new preview deployment, click the test button, and confirm:

1. The error appears in Sentry's dashboard within ~30 seconds
2. The stack trace shows real source file names, not minified noise (this validates source map upload worked)
3. The error is tagged with environment `preview` and a release SHA matching the commit
4. Browser breadcrumbs show the navigation that led to the error

If any of those don't work, fix before proceeding. Common issues:
- Source maps not uploading: check `SENTRY_AUTH_TOKEN` scope
- Wrong environment tag: check `VERCEL_ENV` is being read correctly
- DSN missing: check the env var is on the right scope (Preview, not Production)

## Step 6 — Wire `[STATE]` as Sentry breadcrumbs

This is the high-leverage step.

Edit `src/lib/stateLog.ts`. The `logState(entry)` helper currently pushes to console + sessionStorage ring buffer. Add a third output: Sentry breadcrumb.

```ts
import * as Sentry from "@sentry/nextjs";

export function logState(entry: StateLogEntry): void {
  // ... existing console.log + sessionStorage logic stays exactly as is ...

  // NEW: also emit as Sentry breadcrumb
  Sentry.addBreadcrumb({
    category: `state.${entry.surface}`,
    message: entry.action,
    level: "info",
    data: {
      userId: entry.userId,
      sha: entry.sha,
      ...entry.details,
    },
    timestamp: Date.parse(entry.ts) / 1000, // Sentry wants Unix seconds
  });
}
```

Sentry holds the last ~100 breadcrumbs per scope by default. When an error fires anywhere in the app, the breadcrumb trail attaches automatically. That means: for T-1777400000001's intermittent bug, the next time it happens *and throws an error*, the report will come with the entire trail of state mutations leading up to it.

Caveat: if the bug is silent (state corrupts but nothing throws), breadcrumbs won't fire. To catch silent corruption, we'd need explicit `Sentry.captureMessage()` calls at suspect detection points. **Don't add those in this work.** Phase 2 diagnosis can decide where they belong once we have at least one breadcrumb-enriched error report to look at.

### Important: import path

`@sentry/nextjs` exports differently in client vs server contexts. The above import works in both, but verify by:

```bash
npx tsc --noEmit
```

If TypeScript complains about `Sentry.addBreadcrumb` being unavailable on one side, use the conditional import pattern from `@sentry/nextjs` docs.

## Step 7 — User context (optional, recommended)

If a user is logged in, attaching their userId to Sentry's scope makes errors filterable by user. In `src/app/(player)/play/page.tsx` or wherever userId becomes known after auth:

```ts
import * as Sentry from "@sentry/nextjs";

// when userId is known:
Sentry.setUser({ id: userId });
```

For T-1777400000001 specifically, this means we can filter Sentry to "errors for the test user during the playtest" instead of fishing through a broader dashboard.

## Verification

End of session, the following should be true:

- [ ] Sentry project created in Monty's existing org.
- [ ] `@sentry/nextjs` installed and configured.
- [ ] `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` exist and reference correct env vars.
- [ ] `next.config.ts` wrapped with `withSentryConfig`.
- [ ] Vercel env vars set for Preview scope: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- [ ] Source map upload working (verify via test error showing real source file names).
- [ ] Test error from `/sentry-example-page` shows up in Sentry dashboard with: correct environment, correct release SHA, full breadcrumb trail.
- [ ] `logState()` emits Sentry breadcrumbs in addition to console + sessionStorage.
- [ ] `tsc --noEmit` clean.
- [ ] `vitest run` parity: 246 passed / 1 skipped.
- [ ] `playthrough:all` parity: 13/7.
- [ ] Branch pushed; new Vercel deployment built; deployment URL surfaced to Monty.

## What Monty does next (after this commit lands)

1. Open the new deployment in browser.
2. Trigger the test error from `/sentry-example-page` to confirm Sentry capture works in his environment.
3. Resume normal playtest activity. The next time the T-1777400000001 bug fires (or any other error), Sentry captures it automatically with breadcrumbs attached.
4. Send Sentry issue links to claude.ai for Phase 2 diagnosis.

## Out of scope

- **No fixes for T-1777400000001.** Sentry is an observability layer; the fix happens in a separate Phase 2 session once we have an error report with breadcrumbs.
- **No Sentry replay integration.** Could be added later for visual session replay; not needed for state diagnosis.
- **No alert routing setup.** Default alert behavior is fine for now. Tune later if noise is a problem.
- **No production environment setup.** Production doesn't exist in deploy scope yet; preview is what matters.
- **No deletion or replacement of the `[STATE]` instrumentation.** It stays exactly as it is. Sentry is additive.

## Time budget

3-4 hours, mostly setup-and-verify rather than write. The wizard does most of the SDK installation; the env wiring and breadcrumb integration are short.

If anything takes more than expected (source map upload not working, breadcrumb integration causes a TypeScript issue, etc.), surface to Monty rather than drilling deep. Sentry setup pitfalls are usually configuration issues, not algorithmic ones.

## Begin.
