import { describe, expect, it } from "vitest";

import {
  applyDispositionCost,
  canProgressToday,
  computeArcExpireDay,
  computeNextDueDay,
  computeOfferTone,
  shouldOfferExpire,
} from "@/domain/arcs/engine";
import type { ArcOffer, ArcStep } from "@/domain/arcs/types";

describe("arc engine helpers", () => {
  it("computes offer tone from times shown", () => {
    expect(computeOfferTone(0)).toBe(0);
    expect(computeOfferTone(1)).toBe(1);
    expect(computeOfferTone(2)).toBe(2);
    expect(computeOfferTone(4)).toBe(3);
  });

  it("expires offers after the expiry day", () => {
    const offer: ArcOffer = {
      id: "1",
      user_id: "u",
      arc_id: "a",
      offer_key: "invite",
      state: "ACTIVE",
      times_shown: 1,
      tone_level: 1,
      first_seen_day: 2,
      last_seen_day: 2,
      expires_on_day: 4,
    };
    expect(shouldOfferExpire(4, offer)).toBe(false);
    expect(shouldOfferExpire(5, offer)).toBe(true);
  });

  it("applies hesitation strain to costs", () => {
    const base = { resources: { energy: 1 } };
    const next = applyDispositionCost("Belonging", base, 3);
    expect(next.resources?.energy).toBe(1);
    expect(next.resources?.stress).toBe(1);
  });

  it("checks progression slots", () => {
    expect(canProgressToday(0, 2)).toBe(true);
    expect(canProgressToday(2, 2)).toBe(false);
    expect(canProgressToday(1, 2, 1)).toBe(true);
    expect(canProgressToday(1, 2, 2)).toBe(false);
  });

  it("computes due and expire days", () => {
    const step: ArcStep = {
      id: "s",
      arc_id: "a",
      step_key: "step1",
      order_index: 0,
      title: "Title",
      body: "Body",
      options: [],
      default_next_step_key: null,
      due_offset_days: 2,
      expires_after_days: 3,
    };
    expect(computeNextDueDay(5, step)).toBe(7);
    expect(computeArcExpireDay(7, step)).toBe(10);
  });
});
