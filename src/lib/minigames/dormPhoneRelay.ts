import type { RelationshipEvent } from "@/lib/relationships";
import type { MiniGameResult } from "@/types/storylets";

export const DORM_PHONE_RELAY_ART_PROMPTS = {
  dormPhone:
    "1980s college dorm hallway wall-mounted rotary phone, beige plastic, slightly worn, fluorescent lighting, realistic, no modern elements",
  callUiBackground:
    "retro 1980s UI panel, muted colors, simple rectangular layout, CRT-style glow, minimalistic interface",
  dormListPanel:
    "college dorm bulletin board aesthetic UI, paper labels, handwritten names, cork texture, 1980s style",
} as const;

export type PhoneRelayDifficultyLevel = 1 | 2 | 3;

export type DormPhoneRelayResident = {
  id: string;
  name: string;
  roomLabel: string;
  relationshipNpcId?: string;
};

export type DormPhoneRelayCall = {
  id: string;
  callerName: string;
  targetResidentId: string;
  targetResidentName: string;
  message: string;
};

export type DormPhoneRelaySelection = {
  callId: string;
  residentId: string | null;
  message: string | null;
};

export type DormPhoneRelayHookRule = {
  chance?: number;
  relationshipEvents?: RelationshipEvent[];
  anomalyIds?: string[];
  storyletHookText?: string;
  anomalyText?: string;
};

export type DormPhoneRelayHooks = {
  onSuccess?: DormPhoneRelayHookRule;
  onFailure?: DormPhoneRelayHookRule;
  onMistake?: DormPhoneRelayHookRule;
};

export type DormPhoneRelayConfig = {
  difficultyLevel?: number;
  residents?: DormPhoneRelayResident[];
  callerPool?: string[];
  messagePool?: string[];
  revealSeconds?: number;
  deliverySeconds?: number;
  hooks?: DormPhoneRelayHooks;
};

export type DormPhoneRelayRound = {
  difficultyLevel: PhoneRelayDifficultyLevel;
  revealSeconds: number;
  deliverySeconds: number;
  interruptions: boolean;
  residents: DormPhoneRelayResident[];
  currentCalls: DormPhoneRelayCall[];
  messageOptions: string[];
};

export type DormPhoneRelaySummary = {
  won: boolean;
  score: number;
  correctDeliveries: number;
  partialMatches: number;
  wrongRecipients: number;
  wrongMessages: number;
  timedOut: boolean;
  relationshipEvents: RelationshipEvent[];
  anomalyIds: string[];
  storyletHookText?: string;
  anomalyText?: string;
};

const DEFAULT_CALLERS = [
  "Mrs. Hines",
  "Eddie",
  "Mara",
  "Professor Bell",
  "Janet",
  "Tommy",
  "Denise",
  "Coach Reed",
  "Rita",
  "Mitch",
];

const DEFAULT_MESSAGES = [
  "Call home after ten.",
  "Your shift starts at six.",
  "Bring quarters to laundry.",
  "Meet in the lounge at nine.",
  "Your lab moved to room 118.",
  "Pick up your notes downstairs.",
  "Tell him the pizza is here.",
  "The study group moved upstairs.",
  "Your mother said try again later.",
  "Someone borrowed your sociology book.",
  "The RA wants a word tonight.",
  "Your ride is outside in ten minutes.",
];

const DEFAULT_RESIDENTS: DormPhoneRelayResident[] = [
  {
    id: "resident_dan",
    name: "Dan",
    roomLabel: "206",
  },
  {
    id: "resident_dana",
    name: "Dana",
    roomLabel: "212",
  },
  {
    id: "npc_roommate_scott",
    name: "Scott",
    roomLabel: "214",
    relationshipNpcId: "npc_roommate_scott",
  },
  {
    id: "npc_floor_doug",
    name: "Doug",
    roomLabel: "208",
    relationshipNpcId: "npc_floor_doug",
  },
  {
    id: "npc_floor_mike",
    name: "Mike",
    roomLabel: "210",
  },
  {
    id: "npc_floor_keith",
    name: "Keith",
    roomLabel: "220",
    relationshipNpcId: "npc_floor_keith",
  },
  {
    id: "npc_floor_peterson",
    name: "Peterson",
    roomLabel: "216",
  },
  {
    id: "npc_floor_spider",
    name: "Spider",
    roomLabel: "Lounge",
    relationshipNpcId: "npc_floor_spider",
  },
];

type DifficultySpec = {
  callCount: number;
  revealSeconds: number;
  deliverySeconds: number;
  interruptions: boolean;
  distractorCount: number;
};

const DIFFICULTY_SPECS: Record<PhoneRelayDifficultyLevel, DifficultySpec> = {
  1: {
    callCount: 1,
    revealSeconds: 5,
    deliverySeconds: 35,
    interruptions: false,
    distractorCount: 1,
  },
  2: {
    callCount: 2,
    revealSeconds: 4,
    deliverySeconds: 55,
    interruptions: false,
    distractorCount: 2,
  },
  3: {
    callCount: 3,
    revealSeconds: 3,
    deliverySeconds: 75,
    interruptions: true,
    distractorCount: 3,
  },
};

function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function clampChance(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function pickDifficultySpec(
  adaptiveDifficulty: number,
  configuredLevel?: number
): {
  level: PhoneRelayDifficultyLevel;
  spec: DifficultySpec;
} {
  const levelFromConfig =
    typeof configuredLevel === "number"
      ? Math.max(1, Math.min(3, Math.round(configuredLevel)))
      : null;

  if (levelFromConfig === 1 || levelFromConfig === 2 || levelFromConfig === 3) {
    return { level: levelFromConfig, spec: DIFFICULTY_SPECS[levelFromConfig] };
  }

  const level: PhoneRelayDifficultyLevel =
    adaptiveDifficulty < 0.4 ? 1 : adaptiveDifficulty < 0.75 ? 2 : 3;

  return { level, spec: DIFFICULTY_SPECS[level] };
}

function buildResidents(
  configuredResidents: DormPhoneRelayResident[] | undefined,
  requiredCount: number
) {
  const source =
    configuredResidents && configuredResidents.length >= requiredCount
      ? configuredResidents
      : DEFAULT_RESIDENTS;

  return source.map((resident) => ({
    ...resident,
    relationshipNpcId:
      resident.relationshipNpcId ??
      (resident.id.startsWith("npc_") ? resident.id : undefined),
  }));
}

function pickTargets(
  residents: DormPhoneRelayResident[],
  callCount: number,
  level: PhoneRelayDifficultyLevel,
  rng: () => number
) {
  const similarNames = residents.filter((resident) =>
    resident.name === "Dan" || resident.name === "Dana"
  );
  const shuffledResidents = shuffle(residents, rng);

  if (level >= 2 && similarNames.length >= 2) {
    const chosen = [...similarNames];
    for (const resident of shuffledResidents) {
      if (chosen.some((entry) => entry.id === resident.id)) continue;
      chosen.push(resident);
      if (chosen.length >= callCount) break;
    }
    return chosen.slice(0, callCount);
  }

  return shuffledResidents.slice(0, callCount);
}

function applyHookRule(
  rule: DormPhoneRelayHookRule | undefined,
  rng: () => number,
  aggregate: {
    relationshipEvents: RelationshipEvent[];
    anomalyIds: string[];
    storyletHookText?: string;
    anomalyText?: string;
  }
) {
  if (!rule) return;
  if (rng() > clampChance(rule.chance)) return;

  if (rule.relationshipEvents?.length) {
    aggregate.relationshipEvents.push(...rule.relationshipEvents);
  }
  if (rule.anomalyIds?.length) {
    aggregate.anomalyIds.push(...rule.anomalyIds);
  }
  if (rule.storyletHookText && !aggregate.storyletHookText) {
    aggregate.storyletHookText = rule.storyletHookText;
  }
  if (rule.anomalyText && !aggregate.anomalyText) {
    aggregate.anomalyText = rule.anomalyText;
  }
}

export function buildDormPhoneRelayRound(
  adaptiveDifficulty: number,
  config?: DormPhoneRelayConfig,
  rng: () => number = Math.random
): DormPhoneRelayRound {
  const { level, spec } = pickDifficultySpec(
    adaptiveDifficulty,
    config?.difficultyLevel
  );
  const residents = buildResidents(config?.residents, spec.callCount);
  const targets = pickTargets(residents, spec.callCount, level, rng);
  const callerPool = config?.callerPool?.length ? config.callerPool : DEFAULT_CALLERS;
  const messagePool = config?.messagePool?.length
    ? config.messagePool
    : DEFAULT_MESSAGES;

  const callers = shuffle(callerPool, rng).slice(0, spec.callCount);
  const messages = shuffle(messagePool, rng).slice(0, spec.callCount);
  const currentCalls = targets.map((resident, index) => ({
    id: `call_${index + 1}`,
    callerName: callers[index] ?? `Caller ${index + 1}`,
    targetResidentId: resident.id,
    targetResidentName: resident.name,
    message: messages[index] ?? "Please call back.",
  }));

  const distractors = shuffle(
    messagePool.filter((message) => !messages.includes(message)),
    rng
  ).slice(0, spec.distractorCount);

  return {
    difficultyLevel: level,
    revealSeconds: config?.revealSeconds ?? spec.revealSeconds,
    deliverySeconds: config?.deliverySeconds ?? spec.deliverySeconds,
    interruptions: spec.interruptions,
    residents,
    currentCalls,
    messageOptions: shuffle([...messages, ...distractors], rng),
  };
}

export function scoreDormPhoneRelayRound(
  round: DormPhoneRelayRound,
  selections: DormPhoneRelaySelection[],
  options?: {
    timedOut?: boolean;
    hooks?: DormPhoneRelayHooks;
    rng?: () => number;
  }
): DormPhoneRelaySummary {
  const selectionByCallId = new Map(
    selections.map((selection) => [selection.callId, selection])
  );

  let correctDeliveries = 0;
  let partialMatches = 0;
  let wrongRecipients = 0;
  let wrongMessages = 0;

  const relationshipEvents: RelationshipEvent[] = [];

  for (const call of round.currentCalls) {
    const selection = selectionByCallId.get(call.id);
    const residentCorrect = selection?.residentId === call.targetResidentId;
    const messageCorrect = selection?.message === call.message;

    if (residentCorrect && messageCorrect) {
      correctDeliveries += 1;
      const resident = round.residents.find(
        (entry) => entry.id === call.targetResidentId
      );
      if (resident?.relationshipNpcId) {
        relationshipEvents.push({
          npc_id: resident.relationshipNpcId,
          type: "SMALL_KINDNESS",
        });
      }
      continue;
    }

    if (residentCorrect || messageCorrect) {
      partialMatches += 1;
    }
    if (!residentCorrect) {
      wrongRecipients += 1;
    }
    if (!messageCorrect) {
      wrongMessages += 1;
    }
  }

  const timedOut = options?.timedOut === true;
  const requiredCorrect =
    round.currentCalls.length === 1 ? 1 : Math.ceil(round.currentCalls.length * 0.67);
  const won = !timedOut && correctDeliveries >= requiredCorrect;
  const score = Math.max(
    0,
    correctDeliveries * 100 +
      partialMatches * 35 -
      wrongRecipients * 10 -
      wrongMessages * 10 -
      (timedOut ? 20 : 0)
  );

  const aggregate = {
    relationshipEvents: [...relationshipEvents],
    anomalyIds: [] as string[],
    storyletHookText: undefined as string | undefined,
    anomalyText: undefined as string | undefined,
  };
  const rng = options?.rng ?? Math.random;

  applyHookRule(won ? options?.hooks?.onSuccess : options?.hooks?.onFailure, rng, aggregate);
  if (wrongRecipients > 0 || wrongMessages > 0) {
    applyHookRule(options?.hooks?.onMistake, rng, aggregate);
  }

  return {
    won,
    score,
    correctDeliveries,
    partialMatches,
    wrongRecipients,
    wrongMessages,
    timedOut,
    relationshipEvents: aggregate.relationshipEvents,
    anomalyIds: aggregate.anomalyIds,
    storyletHookText: aggregate.storyletHookText,
    anomalyText: aggregate.anomalyText,
  };
}

export function toDormPhoneRelayMiniGameResult(
  round: DormPhoneRelayRound,
  summary: DormPhoneRelaySummary,
  selections: DormPhoneRelaySelection[]
): MiniGameResult {
  return {
    won: summary.won,
    score: summary.score,
    meta: {
      forcedOutcomeId: summary.won ? "success" : "failure",
      difficultyLevel: round.difficultyLevel,
      callCount: round.currentCalls.length,
      correctDeliveries: summary.correctDeliveries,
      partialMatches: summary.partialMatches,
      wrongRecipients: summary.wrongRecipients,
      wrongMessages: summary.wrongMessages,
      timedOut: summary.timedOut,
      selections,
      relationshipEvents: summary.relationshipEvents,
      anomalyIds: summary.anomalyIds,
      storyletHookText: summary.storyletHookText,
      anomalyText: summary.anomalyText,
    },
  };
}
