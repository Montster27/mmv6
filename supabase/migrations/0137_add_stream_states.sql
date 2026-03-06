-- Migration 0137: Add stream_states column to daily_states and branch_key to arc_instances
-- These support the Arc One six-stream narrative system.

-- Per-stream FSM state for all six Arc One narrative streams.
-- Stored as { roommate: "...", academic: "...", money: "...", belonging: "...", opportunity: "...", home: "..." }
alter table public.daily_states
  add column if not exists stream_states jsonb not null default '{}'::jsonb;

-- branch_key mirrors the active stream state for each arc instance (denormalized for query convenience).
alter table public.arc_instances
  add column if not exists branch_key text null;
