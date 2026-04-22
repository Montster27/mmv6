/**
 * Playthrough Runner — Test Harness
 *
 * Manages test user lifecycle and invokes engine functions directly.
 * Bypasses HTTP but respects all server-authoritative invariants:
 * conditional updates, track state transitions, pool scan + meetsRequirements.
 */

import { randomUUID } from "node:crypto";
import { db } from "./client";
import { loadTracks, loadStorylets, loadChoiceLog, loadFlagLog } from "./loader";
import {
  selectTrackStorylets,
  buildInitialTrackProgress,
} from "@/core/tracks/selectTrackStorylets";
import {
  collectChoiceResourceDeltas,
  applyResourceDeltas,
  getResourceSnapshot,
} from "@/core/resources/applyResourcesServer";
import { toLegacyResourceUpdates } from "@/core/resources/resourceMap";
import type { Track, TrackStoryletRow, TrackProgress, DueStorylet } from "@/types/tracks";
import type { DialogueNode, MicroChoice } from "@/types/storylets";
import type { FixtureSnapshot } from "./types";

const SEGMENT_ORDER = ["morning", "afternoon", "evening", "night"] as const;

/** In-memory state for a node walk in progress. */
type WalkState = {
  storyletKey: string;
  currentNodeId: string | null;
  flags: Set<string>;
  nodes: DialogueNode[];
  /** Whether the walk has reached "choices" or "exit". */
  terminal: "choices" | "exit" | null;
};

export class PlaythroughHarness {
  userId = "";
  dayIndex = 1;
  currentSegment = "morning";
  hoursRemaining = 16;
  startedDay = 1;

  private tracks: Track[] = [];
  private storylets: TrackStoryletRow[] = [];

  /** Active node walk (set by chooseNode, cleared by choose or sleep). */
  walkState: WalkState | null = null;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async init(): Promise<void> {
    this.tracks = await loadTracks();
    this.storylets = await loadStorylets();

    const email = `test-runner-${randomUUID()}@test.local`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: "test-runner-password-" + randomUUID(),
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message}`);
    }
    this.userId = data.user.id;

    await this.seedFreshState();
  }

  async initFromFixture(fixture: FixtureSnapshot): Promise<void> {
    this.tracks = await loadTracks();
    this.storylets = await loadStorylets();

    const email = `test-runner-${randomUUID()}@test.local`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: "test-runner-password-" + randomUUID(),
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message}`);
    }
    this.userId = data.user.id;

    await this.loadFixture(fixture);
  }

  async teardown(): Promise<void> {
    if (!this.userId) return;
    // Deleting the auth user cascades to all FK-constrained tables
    await db.auth.admin.deleteUser(this.userId);
    this.userId = "";
  }

  // -------------------------------------------------------------------------
  // Game Operations
  // -------------------------------------------------------------------------

  /**
   * Run selectTrackStorylets with current state.
   * Returns DueStorylet[] — same output as the engine's pool scan.
   */
  async getAvailableStorylets(): Promise<DueStorylet[]> {
    const { data: progress } = await db
      .from("track_progress")
      .select("*")
      .eq("user_id", this.userId);

    const [resolvedChoicesByTrack, flagsByTrack] = await Promise.all([
      loadChoiceLog(this.userId),
      loadFlagLog(this.userId),
    ]);

    const { data: skills } = await db
      .from("player_skills")
      .select("skill_id")
      .eq("user_id", this.userId)
      .eq("status", "trained");
    const trainedSkillIds = new Set((skills ?? []).map((s) => s.skill_id as string));

    const { data: dailyRow } = await db
      .from("daily_states")
      .select("preclusion_gates")
      .eq("user_id", this.userId)
      .maybeSingle();
    const precludedKeys = new Set<string>(
      Array.isArray(dailyRow?.preclusion_gates)
        ? (dailyRow.preclusion_gates as string[])
        : []
    );

    return selectTrackStorylets({
      dayIndex: this.dayIndex,
      progress: (progress ?? []) as TrackProgress[],
      storylets: this.storylets.filter((s) => s.track_id),
      tracks: this.tracks,
      currentSegment: this.currentSegment,
      hoursRemaining: this.hoursRemaining,
      resolvedChoicesByTrack,
      trainedSkillIds,
      flagsByTrack,
      precludedKeys,
    });
  }

  /**
   * Resolve a choice on a storylet. Replicates /api/tracks/resolve logic:
   * resource deltas, track state, track advancement, choice_log.
   */
  async choose(
    storyletKey: string,
    choiceId: string
  ): Promise<{ nextKey: string | null; trackCompleted: boolean }> {
    const storylet = this.storylets.find((s) => s.storylet_key === storyletKey);
    if (!storylet) throw new Error(`Storylet not found: ${storyletKey}`);
    if (!storylet.track_id) throw new Error(`Storylet has no track_id: ${storyletKey}`);

    // Find track_progress row
    const { data: progressRow, error: progressErr } = await db
      .from("track_progress")
      .select("*")
      .eq("user_id", this.userId)
      .eq("track_id", storylet.track_id)
      .single();
    if (progressErr || !progressRow) {
      throw new Error(
        `No track_progress for storylet ${storyletKey} (track ${storylet.track_id}): ${progressErr?.message}`
      );
    }

    // Find the choice
    const choices: Array<Record<string, unknown>> = Array.isArray(storylet.choices)
      ? (storylet.choices as Array<Record<string, unknown>>)
      : [];
    const choice = choices.find(
      (c) => c.id === choiceId || c.option_key === choiceId
    );
    if (!choice) {
      const availableIds = choices.map((c) => c.id).join(", ");
      throw new Error(
        `Choice not found: "${choiceId}" on ${storyletKey}. Available: [${availableIds}]`
      );
    }

    // Deduplication guard
    const currentResolvedKeys: string[] = Array.isArray(
      progressRow.resolved_storylet_keys
    )
      ? (progressRow.resolved_storylet_keys as string[])
      : [];
    if (currentResolvedKeys.includes(storyletKey)) {
      return { nextKey: null, trackCompleted: false };
    }

    // Apply resource deltas
    const rawDeltas = collectChoiceResourceDeltas(choice);
    if (Object.keys(rawDeltas).length > 0) {
      await applyResourceDeltas(
        db as unknown as Parameters<typeof applyResourceDeltas>[0],
        this.userId,
        this.dayIndex,
        rawDeltas
      );
    }

    // Apply track state transition
    const setsTrackState = choice.sets_track_state as
      | { state: string }
      | undefined;
    if (setsTrackState?.state) {
      await db
        .from("track_progress")
        .update({
          track_state: setsTrackState.state,
          branch_key: setsTrackState.state,
          updated_day: this.dayIndex,
        })
        .eq("id", progressRow.id);
    }

    // Compute resolved keys
    const newResolvedKeys = [...currentResolvedKeys, storyletKey];

    // Compute next_key (same logic as /api/tracks/resolve)
    const nextKey: string | null =
      typeof choice.next_key === "string"
        ? choice.next_key
        : typeof storylet.default_next_key === "string"
          ? storylet.default_next_key
          : null;

    // Validate next_key on same track (prevents cross-track chain bugs)
    let validNextKey: string | null = null;
    if (nextKey) {
      const { data: nextStorylet } = await db
        .from("storylets")
        .select("storylet_key,due_offset_days")
        .eq("track_id", storylet.track_id)
        .eq("storylet_key", nextKey)
        .maybeSingle();

      if (nextStorylet) {
        validNextKey = nextKey;
        const nextDueDay =
          progressRow.started_day + (nextStorylet.due_offset_days ?? 1);

        await db
          .from("track_progress")
          .update({
            current_storylet_key: nextKey,
            storylet_due_day: nextDueDay,
            updated_day: this.dayIndex,
            resolved_storylet_keys: newResolvedKeys,
            next_key_override: nextKey,
          })
          .eq("id", progressRow.id);
      } else {
        console.warn(
          `[harness] next_key "${nextKey}" not found on track ${storylet.track_id} — treating as pool mode`
        );
      }
    }

    let trackCompleted = false;
    if (!validNextKey) {
      // Check for future content on this track
      const { data: remainingStorylets } = await db
        .from("storylets")
        .select("storylet_key,due_offset_days")
        .eq("track_id", storylet.track_id)
        .eq("is_active", true);

      const currentDayOffset = this.dayIndex - progressRow.started_day;
      const hasFutureContent = (remainingStorylets ?? []).some(
        (s) =>
          !newResolvedKeys.includes(s.storylet_key as string) &&
          ((s.due_offset_days as number) ?? 0) > currentDayOffset
      );

      if (hasFutureContent) {
        await db
          .from("track_progress")
          .update({
            resolved_storylet_keys: newResolvedKeys,
            next_key_override: null,
            updated_day: this.dayIndex,
          })
          .eq("id", progressRow.id);
      } else {
        await db
          .from("track_progress")
          .update({
            state: "COMPLETED",
            completed_day: this.dayIndex,
            updated_day: this.dayIndex,
            resolved_storylet_keys: newResolvedKeys,
            next_key_override: null,
          })
          .eq("id", progressRow.id);
        trackCompleted = true;
      }
    }

    // Record to choice_log (drives requires_choice pool gating)
    await db.from("choice_log").insert({
      user_id: this.userId,
      day: this.dayIndex,
      event_type: "STORYLET_RESOLVED",
      track_id: storylet.track_id,
      track_progress_id: progressRow.id,
      step_key: storyletKey,
      option_key: choiceId,
      meta: { next_key: validNextKey },
    });

    // Write persistent flags (sets_flag on choice)
    const setsFlag = choice.sets_flag as string[] | undefined;
    if (Array.isArray(setsFlag) && setsFlag.length > 0) {
      const flagInserts = setsFlag.map((flag) => ({
        user_id: this.userId,
        day: this.dayIndex,
        event_type: "FLAG_SET",
        track_id: storylet.track_id,
        track_progress_id: progressRow.id,
        step_key: storyletKey,
        option_key: flag,
        meta: { source_choice: choiceId },
      }));
      await db.from("choice_log").insert(flagInserts);
    }

    // Apply preclusion (permanently lock out named storylets for this run)
    const precludes = choice.precludes as string[] | undefined;
    if (Array.isArray(precludes) && precludes.length > 0) {
      const { data: dailyRow } = await db
        .from("daily_states")
        .select("preclusion_gates")
        .eq("user_id", this.userId)
        .maybeSingle();

      const current = Array.isArray(dailyRow?.preclusion_gates)
        ? (dailyRow.preclusion_gates as string[])
        : [];
      const merged = [...new Set([...current, ...precludes])];

      await db
        .from("daily_states")
        .update({ preclusion_gates: merged })
        .eq("user_id", this.userId);
    }

    return { nextKey: validNextKey, trackCompleted };
  }

  /**
   * Walk a node tree: pick a micro-choice, apply its effects, advance.
   * Call repeatedly until walkState.terminal is set, then switch to choose().
   */
  async chooseNode(
    nodeId: string,
    microChoiceId: string
  ): Promise<{ nextNodeId: string | null; terminal: "choices" | "exit" | null }> {
    // Initialize walk state if needed
    if (!this.walkState) {
      // Caller must ensure the storylet is known — find it from context
      throw new Error(
        `No active node walk. Use chooseNode only after a storylet with nodes is served.`
      );
    }
    const ws = this.walkState;

    if (ws.currentNodeId !== nodeId) {
      throw new Error(
        `Node walk at "${ws.currentNodeId}" but script asserts "${nodeId}"`
      );
    }

    const node = ws.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found in walk`);
    if (!node.micro_choices?.length) {
      throw new Error(`Node "${nodeId}" has no micro_choices`);
    }

    const micro = node.micro_choices.find((m) => m.id === microChoiceId);
    if (!micro) {
      const ids = node.micro_choices.map((m) => m.id).join(", ");
      throw new Error(
        `Micro-choice "${microChoiceId}" not found on node "${nodeId}". Available: [${ids}]`
      );
    }

    // Apply walk-local flag
    if (micro.sets_flag) {
      ws.flags.add(micro.sets_flag);
    }

    // Apply persistent NPC effects
    if (micro.set_npc_memory && Object.keys(micro.set_npc_memory).length > 0) {
      const { data: daily } = await db
        .from("daily_states")
        .select("npc_memory")
        .eq("user_id", this.userId)
        .maybeSingle();
      const current = (daily?.npc_memory as Record<string, Record<string, boolean>>) ?? {};
      const merged = { ...current };
      for (const [npcId, flags] of Object.entries(micro.set_npc_memory)) {
        merged[npcId] = { ...(merged[npcId] ?? {}), ...flags };
      }
      await db
        .from("daily_states")
        .update({ npc_memory: merged, updated_at: new Date().toISOString() })
        .eq("user_id", this.userId);
    }

    // Navigate to next
    const dest = micro.next;
    if (dest === "choices" || dest === "exit") {
      ws.terminal = dest;
      ws.currentNodeId = null;
      return { nextNodeId: null, terminal: dest };
    }

    // Find next node, check condition gate
    const nextNode = ws.nodes.find((n) => n.id === dest);
    if (!nextNode) {
      // Unknown target — fall through to choices
      ws.terminal = "choices";
      ws.currentNodeId = null;
      return { nextNodeId: null, terminal: "choices" };
    }

    // Skip nodes whose condition is not met
    const cond = nextNode.condition;
    const conditionMet =
      !cond ||
      ((!cond.flag || ws.flags.has(cond.flag)) &&
        (!cond.all_flags || cond.all_flags.every((f) => ws.flags.has(f))));
    if (!conditionMet) {
      // Advance past this node via its explicit else_next, else fall through to .next
      ws.currentNodeId = nextNode.else_next ?? nextNode.next ?? null;
      if (!ws.currentNodeId || ws.currentNodeId === "choices") {
        ws.terminal = "choices";
        ws.currentNodeId = null;
        return { nextNodeId: null, terminal: "choices" };
      }
      if (ws.currentNodeId === "exit") {
        ws.terminal = "exit";
        ws.currentNodeId = null;
        return { nextNodeId: null, terminal: "exit" };
      }
      return { nextNodeId: ws.currentNodeId, terminal: null };
    }

    ws.currentNodeId = dest;
    return { nextNodeId: dest, terminal: null };
  }

  /**
   * Begin a node walk for a storylet. Called by the executor before choose_node steps.
   */
  beginNodeWalk(storyletKey: string): void {
    const storylet = this.storylets.find((s) => s.storylet_key === storyletKey);
    if (!storylet) throw new Error(`Storylet not found: ${storyletKey}`);

    const nodes = storylet.nodes as DialogueNode[] | null;
    if (!nodes?.length) {
      throw new Error(`Storylet "${storyletKey}" has no nodes`);
    }

    this.walkState = {
      storyletKey,
      currentNodeId: nodes[0].id,
      flags: new Set(),
      nodes,
      terminal: null,
    };
  }

  /**
   * Get the walk-local flags from the current node walk.
   */
  getWalkFlags(): Set<string> {
    return this.walkState?.flags ?? new Set();
  }

  /**
   * Advance segment: morning → afternoon → evening → night.
   * Same code path as /api/day/advance-segment.
   */
  async advanceSegment(): Promise<void> {
    const idx = SEGMENT_ORDER.indexOf(
      this.currentSegment as (typeof SEGMENT_ORDER)[number]
    );
    if (idx < 0 || idx >= SEGMENT_ORDER.length - 1) {
      throw new Error(`Cannot advance beyond ${this.currentSegment}`);
    }

    const nextSegment = SEGMENT_ORDER[idx + 1];
    const nextHours = Math.max(0, this.hoursRemaining - 4);

    // Conditional UPDATE (concurrency guard — same as route)
    const { data, error } = await db
      .from("player_day_state")
      .update({
        current_segment: nextSegment,
        hours_remaining: nextHours,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", this.userId)
      .eq("day_index", this.dayIndex)
      .eq("current_segment", this.currentSegment)
      .select("current_segment,hours_remaining")
      .maybeSingle();

    if (error) throw new Error(`Failed to advance segment: ${error.message}`);
    if (!data) throw new Error("Segment already advanced (concurrent modification)");

    this.currentSegment = nextSegment;
    this.hoursRemaining = nextHours;
  }

  /**
   * Sleep: finalize current day + create next day state + advance day_index.
   * Same code path as /api/day/advance-day (calls underlying functions directly).
   */
  async sleep(): Promise<void> {
    // Read current resource state for carry-over
    const { data: currentState } = await db
      .from("player_day_state")
      .select("energy,stress,money,study_progress,social_capital,health")
      .eq("user_id", this.userId)
      .eq("day_index", this.dayIndex)
      .maybeSingle();

    const energy = (currentState?.energy as number) ?? 70;
    const stress = (currentState?.stress as number) ?? 10;

    // Mark current day as resolved (simplified finalize — avoids deep import chains)
    await db
      .from("player_day_state")
      .update({
        resolved_at: new Date().toISOString(),
        end_energy: energy,
        end_stress: stress,
        next_energy: Math.min(100, energy + 10),
        next_stress: Math.max(0, stress - 5),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", this.userId)
      .eq("day_index", this.dayIndex)
      .is("resolved_at", null);

    // Create next day state
    const nextDay = this.dayIndex + 1;
    const { error: insertErr } = await db.from("player_day_state").insert({
      user_id: this.userId,
      day_index: nextDay,
      energy: Math.min(100, energy + 10),
      stress: Math.max(0, stress - 5),
      ...toLegacyResourceUpdates({
        cashOnHand: (currentState?.money as number) ?? 0,
        knowledge: (currentState?.study_progress as number) ?? 0,
        socialLeverage: (currentState?.social_capital as number) ?? 0,
        physicalResilience: (currentState?.health as number) ?? 50,
      }),
      current_segment: "morning",
      hours_remaining: 16,
      updated_at: new Date().toISOString(),
    });

    if (insertErr && insertErr.code !== "23505") {
      throw new Error(`Failed to create next day state: ${insertErr.message}`);
    }

    // Conditional UPDATE on daily_states (same as route)
    const { data: updated, error: updateErr } = await db
      .from("daily_states")
      .update({
        day_index: nextDay,
        last_day_completed: null,
        last_day_index_completed: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", this.userId)
      .eq("day_index", this.dayIndex)
      .select("day_index")
      .maybeSingle();

    if (updateErr) throw new Error(`Failed to advance day: ${updateErr.message}`);
    if (!updated) throw new Error("Day already advanced (concurrent modification)");

    this.dayIndex = nextDay;
    this.currentSegment = "morning";
    this.hoursRemaining = 16;
  }

  /**
   * Read a resource value by canonical name (energy, stress, cashOnHand, etc.).
   */
  async getResource(name: string): Promise<number> {
    const snapshot = await getResourceSnapshot(
      db as unknown as Parameters<typeof getResourceSnapshot>[0],
      this.userId,
      this.dayIndex
    );
    return (snapshot as Record<string, number>)[name] ?? 0;
  }

  /**
   * Dump current user state as a fixture snapshot (for `extends` composition).
   */
  async snapshotState(scriptName: string): Promise<FixtureSnapshot> {
    const [dailyStates, playerDayState, trackProgress, choiceLog, playerSkills] =
      await Promise.all([
        db
          .from("daily_states")
          .select("*")
          .eq("user_id", this.userId)
          .maybeSingle(),
        db
          .from("player_day_state")
          .select("*")
          .eq("user_id", this.userId),
        db
          .from("track_progress")
          .select("*")
          .eq("user_id", this.userId),
        db
          .from("choice_log")
          .select("*")
          .eq("user_id", this.userId),
        db
          .from("player_skills")
          .select("*")
          .eq("user_id", this.userId),
      ]);

    // Strip user_id from snapshot rows (will be replaced on load)
    const stripUserId = (row: Record<string, unknown>) => {
      const { user_id: _, ...rest } = row;
      return rest;
    };

    return {
      daily_states: stripUserId((dailyStates.data ?? {}) as Record<string, unknown>),
      player_day_state: (playerDayState.data ?? []).map((r) =>
        stripUserId(r as Record<string, unknown>)
      ),
      track_progress: (trackProgress.data ?? []).map((r) =>
        stripUserId(r as Record<string, unknown>)
      ),
      choice_log: (choiceLog.data ?? []).map((r) =>
        stripUserId(r as Record<string, unknown>)
      ),
      player_skills: (playerSkills.data ?? []).map((r) =>
        stripUserId(r as Record<string, unknown>)
      ),
      _meta: {
        script_name: scriptName,
        created_at: new Date().toISOString(),
        day_index: this.dayIndex,
        segment: this.currentSegment,
      },
    };
  }

  /**
   * Get track_progress for a given track key. Used by executor for context.
   */
  async getTrackProgress(
    trackKey: string
  ): Promise<Record<string, unknown> | null> {
    const track = this.tracks.find((t) => t.key === trackKey);
    if (!track) return null;
    const { data } = await db
      .from("track_progress")
      .select("*")
      .eq("user_id", this.userId)
      .eq("track_id", track.id)
      .maybeSingle();
    return data as Record<string, unknown> | null;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private async seedFreshState(): Promise<void> {
    this.dayIndex = 1;
    this.currentSegment = "morning";
    this.hoursRemaining = 16;
    this.startedDay = 1;

    // Insert daily_states
    await db.from("daily_states").insert({
      user_id: this.userId,
      day_index: 1,
      energy: 100,
      stress: 0,
      vectors: {},
      life_pressure_state: {},
      energy_level: "high",
      money_band: "okay",
      skill_flags: {},
      npc_memory: {},
      relationships: {},
      expired_opportunities: [],
      preclusion_gates: [],
      start_date: new Date().toISOString().slice(0, 10),
    });

    // Insert player_day_state
    await db.from("player_day_state").insert({
      user_id: this.userId,
      day_index: 1,
      energy: 100,
      stress: 0,
      ...toLegacyResourceUpdates({
        cashOnHand: 0,
        knowledge: 0,
        socialLeverage: 0,
        physicalResilience: 50,
      }),
      current_segment: "morning",
      hours_remaining: 16,
      updated_at: new Date().toISOString(),
    });

    // Build and insert track_progress rows
    const activeStorylets = this.storylets.filter(
      (s) => s.track_id && s.is_active
    );
    const progressRows = buildInitialTrackProgress(
      this.userId,
      this.tracks,
      activeStorylets,
      this.startedDay
    );

    if (progressRows.length > 0) {
      await db.from("track_progress").insert(progressRows);
    }

    // Sync user_seasons (prevents season reset from firing)
    await db.from("user_seasons").upsert(
      {
        user_id: this.userId,
        current_season_index: 1,
        last_seen_season_index: 1,
        last_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  private async loadFixture(fixture: FixtureSnapshot): Promise<void> {
    this.dayIndex = fixture._meta.day_index;
    this.currentSegment = fixture._meta.segment;
    this.startedDay = 1;

    // Insert daily_states
    await db
      .from("daily_states")
      .insert({ ...fixture.daily_states, user_id: this.userId });

    // Insert player_day_state rows
    for (const pds of fixture.player_day_state) {
      await db
        .from("player_day_state")
        .insert({ ...pds, user_id: this.userId });
    }

    // Insert track_progress rows (strip old IDs, let DB generate new ones)
    for (const tp of fixture.track_progress) {
      const { id: _, ...rest } = tp as Record<string, unknown>;
      await db.from("track_progress").insert({ ...rest, user_id: this.userId });
    }

    // Insert choice_log rows
    for (const cl of fixture.choice_log) {
      const { id: _, ...rest } = cl as Record<string, unknown>;
      await db.from("choice_log").insert({ ...rest, user_id: this.userId });
    }

    // Insert player_skills rows
    for (const ps of fixture.player_skills) {
      await db
        .from("player_skills")
        .insert({ ...ps, user_id: this.userId });
    }

    // Sync user_seasons
    await db.from("user_seasons").upsert(
      {
        user_id: this.userId,
        current_season_index: 1,
        last_seen_season_index: 1,
        last_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // Sync hours_remaining from latest day state
    const { data: dayState } = await db
      .from("player_day_state")
      .select("hours_remaining")
      .eq("user_id", this.userId)
      .eq("day_index", this.dayIndex)
      .maybeSingle();
    this.hoursRemaining = (dayState?.hours_remaining as number) ?? 16;
  }
}
