/**
 * Skill Web Registry — Arc One active skills and composites.
 *
 * This is the source of truth for skill metadata.
 * The DB stores only player state (level + progress).
 */

import type { BaseSkillDef, CompositeSkillDef, SkillDomain } from "@/types/skillWeb";

// ─── Growth thresholds ──────────────────────────────────────────────
// Choices required to reach levels 1, 2, 3
const STANDARD: [number, number, number] = [3, 7, 15];

// ─── Domain display names ───────────────────────────────────────────
export const DOMAIN_LABELS: Record<SkillDomain, string> = {
  intellectual: "Intellectual",
  social: "Social",
  financial: "Financial",
  domestic: "Domestic",
  emotional: "Emotional",
  physical: "Physical",
  trades: "Trades",
  creative: "Creative",
  technology: "Technology",
  professional: "Professional",
  caregiving: "Caregiving",
};

// ─── Arc One active domains (Professional & Caregiving dormant) ─────
export const ARC_ONE_DOMAINS: SkillDomain[] = [
  "intellectual",
  "social",
  "financial",
  "domestic",
  "emotional",
  "physical",
  "trades",
  "creative",
  "technology",
];

// ─── Base Skill Definitions ─────────────────────────────────────────

export const BASE_SKILLS: BaseSkillDef[] = [
  // ── Intellectual (7 of 12) ──
  {
    id: "intellectual.focused_study",
    domain: "intellectual",
    name: "Focused Study",
    description: "Sustained concentration. Foundation for everything.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "intellectual.academic_writing",
    domain: "intellectual",
    name: "Academic Writing",
    description: "Structured argumentation, evidence, citation.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "intellectual.critical_analysis",
    domain: "intellectual",
    name: "Critical Analysis",
    description: "Evaluating arguments, detecting flaws.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "intellectual.test_taking",
    domain: "intellectual",
    name: "Test-Taking",
    description: "Performance under timed pressure.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "intellectual.research_methods",
    domain: "intellectual",
    name: "Research Methods",
    description: "Finding, evaluating, synthesizing sources.",
    era: "college",
    prerequisites: [{ skill: "intellectual.focused_study", minLevel: 1 }],
    growthThresholds: STANDARD,
  },
  {
    id: "intellectual.public_speaking",
    domain: "intellectual",
    name: "Public Speaking",
    description: "Delivering ideas to a group.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "intellectual.academic_time_management",
    domain: "intellectual",
    name: "Academic Time Management",
    description: "Juggling deadlines across concurrent courses.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },

  // ── Social (5 of 10) ──
  {
    id: "social.small_talk",
    domain: "social",
    name: "Small Talk",
    description: "Opening conversations, putting strangers at ease.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "social.reading_a_room",
    domain: "social",
    name: "Reading a Room",
    description: "Sensing group dynamics, power structures.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "social.active_listening",
    domain: "social",
    name: "Active Listening",
    description: "Hearing what people mean, not what they say.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "social.group_facilitation",
    domain: "social",
    name: "Group Facilitation",
    description: "Running a meeting so it produces something.",
    era: "college",
    prerequisites: [
      { skill: "social.reading_a_room", minLevel: 1 },
      { skill: "social.active_listening", minLevel: 1 },
    ],
    growthThresholds: STANDARD,
  },
  {
    id: "social.persuasion",
    domain: "social",
    name: "Persuasion",
    description: "Genuine influence through reasoning and rapport.",
    era: "college",
    prerequisites: [{ skill: "social.small_talk", minLevel: 1 }],
    growthThresholds: STANDARD,
  },

  // ── Financial (2 of 11) ──
  {
    id: "financial.basic_budgeting",
    domain: "financial",
    name: "Basic Budgeting",
    description: "Tracking income vs spending. Checkbook balancing.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "financial.frugality",
    domain: "financial",
    name: "Frugality",
    description: "Making things stretch. A class marker.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },

  // ── Domestic (3 of 10) ──
  {
    id: "domestic.basic_cooking",
    domain: "domestic",
    name: "Basic Cooking",
    description: "Feeding yourself. Saves money, improves energy.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "domestic.cleaning",
    domain: "domestic",
    name: "Cleaning",
    description: "Keeping a space functional. Roommate conflict trigger.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "domestic.navigation",
    domain: "domestic",
    name: "Navigation",
    description: "Paper maps in 1983. Getting around campus and town.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },

  // ── Emotional (3 of 10) ──
  {
    id: "emotional.self_regulation",
    domain: "emotional",
    name: "Self-Regulation",
    description: "Managing impulses, anger, anxiety. Channeling, not suppressing.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "emotional.empathy",
    domain: "emotional",
    name: "Empathy",
    description: "Feeling what others feel without drowning in it.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "emotional.boundary_setting",
    domain: "emotional",
    name: "Boundary-Setting",
    description: "Saying no. Protecting time, energy, emotional space.",
    era: "college",
    prerequisites: [{ skill: "emotional.self_regulation", minLevel: 1 }],
    growthThresholds: STANDARD,
  },

  // ── Physical (4 of 9) ──
  {
    id: "physical.stamina",
    domain: "physical",
    name: "Stamina",
    description: "Cardiovascular endurance, strength. Makes everything possible.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "physical.sleep_discipline",
    domain: "physical",
    name: "Sleep Discipline",
    description: "Going to bed on time. Directly modifies next-day energy.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "physical.manual_dexterity",
    domain: "physical",
    name: "Manual Dexterity",
    description: "Fine motor control. Writing, instruments, tools.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "physical.spatial_awareness",
    domain: "physical",
    name: "Spatial Awareness",
    description: "Coordination, body in space. Sports, dance, driving.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },

  // ── Trades (1–3 of 12, conditional) ──
  {
    id: "trades.tool_proficiency",
    domain: "trades",
    name: "Tool Proficiency",
    description: "Which tool, how to use it safely. Gates everything else.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "trades.electrical_fundamentals",
    domain: "trades",
    name: "Electrical Fundamentals",
    description: "Circuits, wiring, fuses, outlets.",
    era: "college",
    prerequisites: [{ skill: "trades.tool_proficiency", minLevel: 1 }],
    growthThresholds: STANDARD,
  },
  {
    id: "trades.carpentry",
    domain: "trades",
    name: "Carpentry",
    description: "Measuring, cutting, joining. Dorm loft bed and beyond.",
    era: "college",
    prerequisites: [{ skill: "trades.tool_proficiency", minLevel: 1 }],
    growthThresholds: STANDARD,
  },

  // ── Creative (1–4 of 8, conditional) ──
  {
    id: "creative.musical_ability",
    domain: "creative",
    name: "Musical Ability",
    description: "Playing, ear training. In 1983: single most powerful social skill.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "creative.creative_writing",
    domain: "creative",
    name: "Creative Writing",
    description: "Fiction, poetry, journalism. The Herald is the gateway.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "creative.performance",
    domain: "creative",
    name: "Performance",
    description: "Comfort being watched. Delivery, timing.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "creative.visual_art",
    domain: "creative",
    name: "Visual Art",
    description: "Sketching, composition, visual thinking.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },

  // ── Technology (2 of 12) ──
  {
    id: "technology.typing",
    domain: "technology",
    name: "Typing",
    description: "Typewriter to word processor. Gateway physical skill.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
  {
    id: "technology.analog_media",
    domain: "technology",
    name: "Analog Media",
    description: "Cassette decks, VCRs, film cameras, slide projectors.",
    era: "college",
    prerequisites: [],
    growthThresholds: STANDARD,
  },
];

// Index for fast lookup
export const SKILL_BY_ID: Record<string, BaseSkillDef> = Object.fromEntries(
  BASE_SKILLS.map((s) => [s.id, s])
);

// Skills grouped by domain
export const SKILLS_BY_DOMAIN: Record<SkillDomain, BaseSkillDef[]> =
  BASE_SKILLS.reduce(
    (acc, skill) => {
      if (!acc[skill.domain]) acc[skill.domain] = [];
      acc[skill.domain].push(skill);
      return acc;
    },
    {} as Record<SkillDomain, BaseSkillDef[]>
  );

// ─── Composite Skill Definitions (Arc One reachable) ────────────────

export const COMPOSITE_SKILLS: CompositeSkillDef[] = [
  {
    id: "troubleshooting",
    name: "Troubleshooting",
    description: "Systematic diagnosis — circuits or arguments.",
    requirements: [
      {
        domain: "trades",
        skills: ["trades.electrical_fundamentals"],
        minEach: 1,
      },
      {
        domain: "intellectual",
        skills: ["intellectual.critical_analysis"],
        minEach: 1,
      },
    ],
    maxLevel: 3,
  },
  {
    id: "field_craft",
    name: "Field Craft",
    description: "Sustained hands-on work under physical strain.",
    requirements: [
      { domain: "trades", skills: ["trades.tool_proficiency"], minEach: 1 },
      { domain: "physical", skills: ["physical.stamina"], minEach: 1 },
    ],
    maxLevel: 3,
  },
  {
    id: "leadership",
    name: "Leadership",
    description: "Trust-based influence, not charisma.",
    requirements: [
      {
        domain: "social",
        skills: ["social.group_facilitation", "social.reading_a_room"],
        minEach: 1,
      },
      {
        domain: "emotional",
        skills: ["emotional.self_regulation"],
        minEach: 1,
      },
    ],
    maxLevel: 3,
  },
  {
    id: "improvisation",
    name: "Improvisation",
    description: "Thinking on your feet — never caught flat-footed.",
    requirements: [
      { domain: "creative", skills: ["creative.performance"], minEach: 1 },
      { domain: "social", skills: ["social.small_talk"], minEach: 1 },
      {
        domain: "physical",
        skills: ["physical.spatial_awareness"],
        minEach: 1,
      },
    ],
    maxLevel: 3,
  },
  {
    id: "crisis_management",
    name: "Crisis Management",
    description: "Triage and composure when everything breaks.",
    requirements: [
      {
        domain: "emotional",
        skills: ["emotional.self_regulation"],
        minEach: 2,
      },
      {
        domain: "financial",
        skills: ["financial.basic_budgeting"],
        minEach: 1,
      },
    ],
    maxLevel: 3,
  },
];

export const COMPOSITE_BY_ID: Record<string, CompositeSkillDef> =
  Object.fromEntries(COMPOSITE_SKILLS.map((c) => [c.id, c]));
