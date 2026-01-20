import type { DailyRunStage } from "@/types/dailyRun";

type StageCopy = {
  title: string;
  body: string;
};

const COPY: Record<DailyRunStage, StageCopy> = {
  setup: {
    title: "Before you plan your day",
    body: "Allocate skill points, choose posture, address pressures.",
  },
  allocation: {
    title: "Set your focus for today",
    body: "Balance your time across the day ahead.",
  },
  storylet_1: {
    title: "First event of the day",
    body: "Choose how you respond.",
  },
  storylet_2: {
    title: "Second event of the day",
    body: "Another choice, another ripple.",
  },
  microtask: {
    title: "Optional micro-task",
    body: "A short pattern to sharpen the edges.",
  },
  social: {
    title: "One small social action",
    body: "Send a boost to someone else.",
  },
  reflection: {
    title: "A quick reflection",
    body: "Leave a trace of how today felt.",
  },
  fun_pulse: {
    title: "Optional: a quick warmup",
    body: "How fun was today, really?",
  },
  complete: {
    title: "You're done for today",
    body: "Come back tomorrow.",
  },
};

export function getDailyStageCopy(stage: DailyRunStage): StageCopy {
  return COPY[stage];
}
