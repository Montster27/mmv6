# Phase 1 — log capture instructions for T-1777400000001

> Paste-ready protocol for reproducing the session/restart corruption with the new
> `[STATE]` instrumentation in place. Phase 2 diagnosis depends on these captures.

## What you're capturing

Phase 1 added structured `[STATE]` logging across six state-mutation surfaces. Every entry carries a build SHA so log lines can be correlated to specific commits. Phase 2 reads these captures and pinpoints the exact write/read where state diverges.

## Setup (once)

```bash
git pull
npm install
npm run dev
```

Optional: set `NEXT_PUBLIC_COMMIT_SHA=$(git rev-parse --short HEAD)` in `.env.local` so log entries carry your local SHA. If unset, entries fall back to `"dev"` — fine, but you lose commit-correlation when comparing against deployed builds.

Make a captures directory: `mkdir -p docs/captures` (gitignored — your dumps don't ship to the repo).

## Reproduction protocol

### 1. Reset to clean state

Either start with a fresh user, or hit the in-game reset button. Note the time (you'll grep logs by it).

### 2. Play through Day 1 normally

Walk through whatever Day 1 storylets surface. **Include at least one dining-hall storylet** so the dining-hall symptom (storylets re-appearing after resolve) has a chance to fire. Note the time you reach each segment advance and the time you stop.

### 3. Capture A — pre-exit state

**While the tab is still open**, in the browser devtools console:

```js
copy(JSON.stringify(window.__stateLog, null, 2))
```

Paste into a fresh file:

```
docs/captures/<YYYY-MM-DD-HHMM>-pre-exit.client.json
```

From the terminal running `npm run dev`, copy all `[STATE]` lines since the session started:

```
docs/captures/<YYYY-MM-DD-HHMM>-pre-exit.server.log
```

(`grep '\[STATE\]' your-server-log` works.)

### 4. Exit

Close the tab fully. Wait 30 seconds. Re-open the browser to the play page.

### 5. Capture B — post-restart state, BEFORE any action

> ⚠️ Do not click anything yet. The mount-time logs (session restoration, daily-run fetch, walk-state read) are the most diagnostic frames in the whole capture.

Same protocol as Capture A:

```
docs/captures/<YYYY-MM-DD-HHMM>-post-restart.client.json
docs/captures/<YYYY-MM-DD-HHMM>-post-restart.server.log
```

### 6. Reproduce the symptom

Now interact normally. Let the symptom appear — whichever of these you see:

- Resumes at end of Day 1 instead of where you stopped
- Dining-hall prompts re-appear after resolve + navigate
- Day skip
- Anything else that feels wrong

### 7. Capture C — post-symptom state

Same protocol, suffix `-post-symptom`:

```
docs/captures/<YYYY-MM-DD-HHMM>-post-symptom.client.json
docs/captures/<YYYY-MM-DD-HHMM>-post-symptom.server.log
```

### 8. Hand off to Phase 2

Drop the captures dir as a comment on T-1777400000001 (or attach), with a one-line description of what the symptom looked like and at what step (1–7 above) it appeared.

## Optional extras

- Browser network tab HAR export for the same session: `<timestamp>-network.har`.
- Screenshot at the moment of symptom: `<timestamp>-screenshot.png`.

These help but aren't required — the `[STATE]` logs are the load-bearing evidence.

## What good captures look like

Pre-exit client log includes entries for:

- `surface: "session-restore"` on initial mount (bootstrap, dailyRun, identityStance)
- `surface: "walk-state"` action `walkState.read`/`walkState.write` per micro-choice
- `surface: "micro-choice"` action `microChoice.start` and per-effect completes
- `surface: "track-resolve"` action `resolveTerminalChoice.clientStart`/`clientComplete` per terminal choice
- `surface: "daily-state-mutation"` per `setDailyState` call

Pre-exit server log includes:

- `surface: "time-advance"` per segment advance + day rollover
- `surface: "track-resolve"` per terminal choice (with canonical `dayIndex`)
- `surface: "choice-log"` per insert
- `surface: "reset"` if reset was hit

Post-restart logs (Capture B) should show the same `surface: "session-restore"` mount sequence, but the `dayIndex` / `currentSegment` / etc. should match what the server wrote at the end of the pre-exit session. **Any divergence between B's restored state and A's final state is the bug.**

If any surface is silent in the captures, the instrumentation didn't fire — flag that to Code; it's a Phase 1 gap, not a Phase 2 finding.
