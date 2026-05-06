# Prework Notes — 2026-05-06 Audit

## Environment confirmed
- Production URL: https://mmv-sigma.vercel.app (alias of latest main deployment mmv-cpncv9d6m-...)
- Vercel env (production):
  - NEXT_PUBLIC_SKILL_TIME_SCALE=0.01 (matches spec)
  - PRACTICE_CREDIT_SECONDS=900 (matches spec)
- Tester account: 15try@mmvstudios.com / userId f208bd3e-f410-4b29-a145-a5fe1c75e7dc
- HEAD SHA on local main: 16b36d59205335c61897ae6637e6d9072d3180c0 (16b36d5)
- Latest production deployment age: 17h (created 2026-05-05 14:51:58 EDT)

## Pre-walk findings (carried into REPORT.md)
1. §3 missing: no Reflection Engine (grep yielded zero ReflectionScene/computeReflection/endOfArc matches; closest is /season-recap which is a stats dashboard, not the second-person past-tense reflection from Bible §8)
2. §2 invisible: build SHA not surfaced in header (spec says it should be); probed __NEXT_DATA__ runtimeConfig.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA — null
3. §2 invisible: tab title is "Move My Value", in-page branding is "Many More Versions" — bookmark/screen-reader divergence
4. §4 broken candidate: first /welcome navigation rendered completely blank; reload fixed it (1/2 reproduce so far)
5. Marketing site at / (MMV Studios) has no link to /welcome — cold landing has no obvious path into the game (backlog ticket candidate)
6. Audit-quality risk: Chrome MCP read_console_messages and read_network_requests returned empty across both navigations even after first call (will fall back to in-page JS probes for diagnostics)
7. GAP-ANALYSIS.md is from 2026-04-17 and predates Days 2-3 content + Beat 2A wiring + entire T-1776329282001 ship — backlog ticket candidate to regen

## Routine-mode start day to detect during walk
- HANDOFF Phase 4 spec says day_index >= 7
- 2026-04-23 entry mentions ROUTINE_MODE_START_DAY = 3
- Plan: capture observed activation day in §1 of REPORT.md

## Build SHA verification (workaround)
Direct runtime probe failed: no 40-char hex hashes in __NEXT_DATA__ source, no SHA in metas, no SHA in script srcs (chunks have build-id hashes only). NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA NOT exposed at runtime.

External verification by timestamp inference:
- HEAD on local main: 16b36d5 (committed 2026-05-05 14:51:47 EDT)
- Production deployment mmv-cpncv9d6m-... created 2026-05-05 14:51:58 EDT (11 seconds later)
- No commits to main between 14:51:47 and now (vs 17h-ago window showing 14 prior commits)
- Inference: deployment IS at HEAD 16b36d5

Confidence: high. Recording invisibility (no in-page SHA badge) as §2 finding "build SHA invisible to player and audit tools" but proceeding with high confidence the running code matches local HEAD.

## Reset endpoint check
- POST /api/run/reset returned 401 "Not authorized" via in-page fetch (no cookie credentials carried by fetch from welcome flow)
- Welcome page rendered as the entry route (not redirected to /play) → suggests no active run state for 15try@mmvstudios.com
- Decision: skip explicit reset, observe via Begin click whether welcome reset flow fires

## Screenshot persistence trade-off
Chrome MCP `save_to_disk: true` did not surface a discoverable file path. Screenshots remain inline in the audit transcript (visible to user in real time). Per-day `notes.md` will instead capture full page innerText via `javascript_tool` for a grep-able record, plus key visual quotes. REPORT.md §1/§4 will reference inline-transcript screenshots by ID where needed.
