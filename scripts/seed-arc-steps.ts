#!/usr/bin/env node
/**
 * scripts/seed-arc-steps.ts
 *
 * One-time script to seed arc_steps for arc_one streams.
 * Uses the arc_definition IDs already in the DB.
 *
 * Usage: npx tsx scripts/seed-arc-steps.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  console.error("Run with: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-arc-steps.ts");
  console.error("Or source your .env.local first: source .env.local && npx tsx scripts/seed-arc-steps.ts");
  process.exit(1);
}

const ARC_IDS: Record<string, string> = {
  arc_roommate:    "0bf1fcb3-54ab-48f3-ac24-0e18cc3dd1d6",
  arc_academic:    "5902096f-a6c0-4e93-924e-95f8cb5a560c",
  arc_money:       "e4d46129-6657-4b91-ae2d-770578dc02c1",
  arc_belonging:   "1dd7f592-693f-4392-b380-49836be198ca",
  arc_opportunity: "732ac50c-9ba7-4c8f-9fa2-be5e24c4ff64",
  arc_home:        "47d48a9b-7366-48f8-a0c9-91d4b5997498",
};

type ArcStep = {
  arc_id: string;
  step_key: string;
  order_index: number;
  title: string;
  body: string;
  options: unknown;
  default_next_step_key: string | null;
  due_offset_days: number;
  expires_after_days: number;
};

const steps: ArcStep[] = [
  // ── ROOMMATE ──────────────────────────────────────────────────────────
  {
    arc_id: ARC_IDS.arc_roommate,
    step_key: "roommate_s1_first_conversation",
    order_index: 1,
    title: "First Real Conversation",
    body: "He's there when you wake up. Small talk is inevitable — where are you from, what's your major, did you bring a fan. You could be anyone here. But you also don't want to say something you'll regret for a year.",
    options: [
      { option_key: "volunteer_real", label: "Volunteer something real about yourself", energy_cost: 1, sets_stream_state: { stream: "roommate", state: "genuine_connection" } },
      { option_key: "keep_surface", label: "Ask him questions — keep it surface for now", energy_cost: 0 },
      { option_key: "brief_nod", label: "Nod, get settled, find an excuse to leave", energy_cost: 0 },
    ],
    default_next_step_key: "roommate_s2_first_friction",
    due_offset_days: 0,
    expires_after_days: 1,
  },
  {
    arc_id: ARC_IDS.arc_roommate,
    step_key: "roommate_s2_first_friction",
    order_index: 2,
    title: "The First Friction",
    body: "Something small. He plays music when you're trying to sleep. You left wet towels on his chair. He had a friend over without warning. Not a fight. Just the first moment where you realize this requires negotiation.",
    options: [
      { option_key: "address_directly", label: "Address it directly — name the thing", energy_cost: 2, sets_stream_state: { stream: "roommate", state: "genuine_connection" } },
      { option_key: "let_it_go", label: "Let it go — not worth a confrontation", energy_cost: 0 },
      { option_key: "passive_adjust", label: "Make a passive adjustment and hope he notices", energy_cost: 0, sets_stream_state: { stream: "roommate", state: "surface_tension" } },
    ],
    default_next_step_key: "roommate_s3_revealing_moment",
    due_offset_days: 1,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_roommate,
    step_key: "roommate_s3_revealing_moment",
    order_index: 3,
    title: "The Revealing Moment",
    body: "He gets a letter from home and his whole posture changes. Or he offers to show you something on campus he clearly knows well. Something happens that shows you who he actually is — or who you actually are in relation to him.",
    options: [
      { option_key: "engage_openly", label: "Ask what happened — genuinely", energy_cost: 1, sets_stream_state: { stream: "roommate", state: "genuine_connection" } },
      { option_key: "acknowledge_quietly", label: "Acknowledge it without pressing — give him room", energy_cost: 0 },
      { option_key: "pretend_not_noticed", label: "Pretend you didn't notice — stay out of it", energy_cost: 0, sets_stream_state: { stream: "roommate", state: "avoidance_pattern" } },
    ],
    default_next_step_key: "roommate_s4_fork",
    due_offset_days: 3,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_roommate,
    step_key: "roommate_s4_fork",
    order_index: 4,
    title: "The Shape of Things",
    body: "By end of the first week, the roommate relationship has taken a shape. You're not the same kind of person, but something has been established. What is it?",
    options: [
      { option_key: "name_the_good", label: "Tell him you've been glad to share the room", energy_cost: 1, sets_stream_state: { stream: "roommate", state: "genuine_connection" } },
      { option_key: "keep_the_peace", label: "Keep the peace, keep the distance — it's working", energy_cost: 0 },
      { option_key: "name_the_tension", label: "Finally name the thing that's been bothering you", energy_cost: 2, sets_stream_state: { stream: "roommate", state: "open_conflict" } },
    ],
    default_next_step_key: null,
    due_offset_days: 5,
    expires_after_days: 1,
  },

  // ── ACADEMIC ──────────────────────────────────────────────────────────
  {
    arc_id: ARC_IDS.arc_academic,
    step_key: "academic_s1_syllabus",
    order_index: 1,
    title: "The Syllabus",
    body: "First class. The professor distributes the course outline. The reading list is long. The paper due dates are real. There's a midterm worth 40%. Nobody around you looks panicked — you're not sure if that means they're fine or also hiding it.",
    options: [
      { option_key: "ask_classmate", label: "Ask the person next to you if this seems normal", energy_cost: 1, sets_stream_state: { stream: "academic", state: "active_engagement" } },
      { option_key: "process_alone", label: "Say nothing and process it alone", energy_cost: 0 },
      { option_key: "approach_professor", label: "Approach the professor after class", energy_cost: 2, sets_stream_state: { stream: "academic", state: "active_engagement" } },
    ],
    default_next_step_key: "academic_s2_first_gap",
    due_offset_days: 1,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_academic,
    step_key: "academic_s2_first_gap",
    order_index: 2,
    title: "The First Gap",
    body: "A concept in lecture doesn't connect. Or you do the first reading and it's harder than expected. Or you get back a short diagnostic quiz with a mark that surprises you. This is not failure. But it's the first signal.",
    options: [
      { option_key: "office_hours", label: "Go to office hours — find the sheet, show up", energy_cost: 2, sets_stream_state: { stream: "academic", state: "active_engagement" } },
      { option_key: "study_group", label: "Form or join a study group", energy_cost: 1, sets_stream_state: { stream: "academic", state: "active_engagement" } },
      { option_key: "push_through", label: "Push through alone — you'll figure it out", energy_cost: 1 },
      { option_key: "minimize", label: "\"It's just the first week\" — move on", energy_cost: 0, sets_stream_state: { stream: "academic", state: "avoidance_spiral" } },
    ],
    default_next_step_key: "academic_s3_identity_collision",
    due_offset_days: 2,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_academic,
    step_key: "academic_s3_identity_collision",
    order_index: 3,
    title: "The Identity Collision",
    body: "You meet someone who seems effortlessly prepared. Or someone who admits openly they have no idea what they're doing and laughs about it. A professor singles out a student's answer — and it's better than what you were thinking.",
    options: [
      { option_key: "reach_toward", label: "Introduce yourself — ask how they're preparing", energy_cost: 1, sets_stream_state: { stream: "academic", state: "active_engagement" } },
      { option_key: "observe_quietly", label: "Note it, say nothing, recalibrate privately", energy_cost: 0, sets_stream_state: { stream: "academic", state: "quiet_doubt" } },
      { option_key: "double_down", label: "Go straight to the library — work harder", energy_cost: 2, sets_stream_state: { stream: "academic", state: "active_engagement" } },
    ],
    default_next_step_key: "academic_s4_fork",
    due_offset_days: 3,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_academic,
    step_key: "academic_s4_fork",
    order_index: 4,
    title: "First Week, Academic",
    body: "The academic stream has set its initial trajectory. Something is pulling you — or it isn't. You know what the shape of this is going to be.",
    options: [
      { option_key: "found_a_thread", label: "One subject has genuinely caught you — lean into it", energy_cost: 1, sets_stream_state: { stream: "academic", state: "found_a_thread" } },
      { option_key: "functional", label: "You're keeping up. That's enough for now.", energy_cost: 0 },
      { option_key: "acknowledge_warning", label: "You're already behind on something. You know it.", energy_cost: 0, sets_stream_state: { stream: "academic", state: "avoidance_spiral" } },
    ],
    default_next_step_key: null,
    due_offset_days: 5,
    expires_after_days: 1,
  },

  // ── MONEY ──────────────────────────────────────────────────────────
  {
    arc_id: ARC_IDS.arc_money,
    step_key: "money_s1_bookstore",
    order_index: 1,
    title: "The Bookstore",
    body: "The line is long. The books are expensive. You knew this abstractly. Holding the list and doing the math is different. This is one week's worth of summer job savings. For one class.",
    options: [
      { option_key: "buy_everything", label: "Buy everything required — don't fall behind day one", energy_cost: 0, money_effect: "worsen" },
      { option_key: "buy_essentials", label: "Buy only what seems immediately necessary", energy_cost: 0 },
      { option_key: "used_copies", label: "Hunt for used copies — accept the delay", energy_cost: 1 },
      { option_key: "share_classmate", label: "Ask someone in class if you can share", energy_cost: 1, sets_stream_state: { stream: "money", state: "not_yet_felt" } },
    ],
    default_next_step_key: "money_s2_dining_hall",
    due_offset_days: 0,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_money,
    step_key: "money_s2_dining_hall",
    order_index: 2,
    title: "The Dining Hall Calculation",
    body: "Someone on your floor suggests going out for pizza. It's $3. This is not about pizza. You don't want money to be the reason you miss things. But you also can't pretend it isn't real.",
    options: [
      { option_key: "go_and_spend", label: "Go — spend the money", energy_cost: 0, money_effect: "worsen" },
      { option_key: "go_minimize", label: "Go but nurse one drink — minimize the cost", energy_cost: 1 },
      { option_key: "make_excuse", label: "Make an excuse — skip it this time", energy_cost: 0, sets_stream_state: { stream: "money", state: "stress_background" } },
      { option_key: "suggest_cheaper", label: "Suggest somewhere cheaper without explaining why", energy_cost: 1 },
    ],
    default_next_step_key: "money_s3_friction_event",
    due_offset_days: 1,
    expires_after_days: 3,
  },
  {
    arc_id: ARC_IDS.arc_money,
    step_key: "money_s3_friction_event",
    order_index: 3,
    title: "The Friction Event",
    body: "A required lab fee nobody mentioned in orientation. A social invitation that assumes disposable income. You see someone buy something without thinking about it — and you realize you thought about it. Money stops being abstract.",
    options: [
      { option_key: "problem_solve", label: "Problem-solve quietly — figure it out yourself", energy_cost: 2 },
      { option_key: "tell_someone", label: "Mention it to someone — be honest", energy_cost: 1, sets_stream_state: { stream: "money", state: "stress_background" } },
      { option_key: "check_job_board", label: "Check the campus job board", energy_cost: 1, sets_stream_state: { stream: "money", state: "managed_tightly" } },
      { option_key: "absorb_stress", label: "Absorb the stress and say nothing", energy_cost: 0, sets_stream_state: { stream: "money", state: "stress_background" } },
    ],
    default_next_step_key: "money_s4_fork",
    due_offset_days: 2,
    expires_after_days: 3,
  },
  {
    arc_id: ARC_IDS.arc_money,
    step_key: "money_s4_fork",
    order_index: 4,
    title: "First Week, Financial",
    body: "The financial stream has established its pressure level. You're okay — or you're not. Either way, you know more now about what money means here than you did six days ago.",
    options: [
      { option_key: "functional_tension", label: "You're okay but aware — money is a background presence", energy_cost: 0, sets_stream_state: { stream: "money", state: "managed_tightly" } },
      { option_key: "job_decision", label: "You've decided to look for campus work seriously", energy_cost: 1, sets_stream_state: { stream: "money", state: "managed_tightly" } },
      { option_key: "called_home", label: "You asked a parent for help — it resolved the immediate problem", energy_cost: 1, sets_stream_state: { stream: "money", state: "not_yet_felt" }, money_effect: "improve" },
    ],
    default_next_step_key: null,
    due_offset_days: 5,
    expires_after_days: 1,
  },

  // ── BELONGING ──────────────────────────────────────────────────────────
  {
    arc_id: ARC_IDS.arc_belonging,
    step_key: "belonging_s1_orientation_fair",
    order_index: 1,
    title: "The Orientation Fair",
    body: "Too many options. Folding tables with hand-lettered signs. Pre-med study group. Debate team. Campus newspaper. A religious group with free donuts. Everyone is performing confidence. If you sign up for this, are you saying something about who you are? Or just signing up for a thing?",
    options: [
      { option_key: "practical_signup", label: "Sign up for something practical — study group or newspaper", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "open_scanning" } },
      { option_key: "interesting_signup", label: "Sign up for whatever actually seems interesting", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "open_scanning" } },
      { option_key: "people_like_you", label: "Find the table where people who look like you are gathering", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "first_anchor" } },
      { option_key: "sign_up_nothing", label: "Walk through it all and sign up for nothing", energy_cost: 0 },
    ],
    default_next_step_key: "belonging_s2_floor_social",
    due_offset_days: 0,
    expires_after_days: 1,
  },
  {
    arc_id: ARC_IDS.arc_belonging,
    step_key: "belonging_s2_floor_social",
    order_index: 2,
    title: "The Floor Social",
    body: "Your RA organized a floor meeting that became an awkward social in the common room. Someone brought chips. There's a two-liter of soda. This is everyone on your floor in a room together with nowhere to go. Some people are already paired up.",
    options: [
      { option_key: "one_person_deep", label: "Plant yourself in one conversation and go deep", energy_cost: 1, sets_stream_state: { stream: "belonging", state: "first_anchor" } },
      { option_key: "circulate_surface", label: "Circulate — stay surface with everyone", energy_cost: 1, sets_stream_state: { stream: "belonging", state: "open_scanning" } },
      { option_key: "find_the_lost_one", label: "Find the person who also looks like they don't know what to do", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "first_anchor" } },
      { option_key: "leave_early", label: "Leave early — the pressure of it is too much", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "withdrawal" } },
    ],
    default_next_step_key: "belonging_s3_first_connection",
    due_offset_days: 0,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_belonging,
    step_key: "belonging_s3_first_connection",
    order_index: 3,
    title: "The First Thread",
    body: "Somewhere — class, dining hall, a second visit to an orientation event — you have a conversation that feels different. Longer than expected. You said something true. You can't find them later on social media. You have their dorm room number on a torn piece of notebook paper in your pocket, or you don't.",
    options: [
      { option_key: "follow_up", label: "Follow up — knock on their door or find them at the dining hall", energy_cost: 1, sets_stream_state: { stream: "belonging", state: "genuine_match" } },
      { option_key: "keep_the_paper", label: "Keep the paper — wait and see if paths cross again", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "first_anchor" } },
      { option_key: "let_it_be", label: "Let it be a good moment — not every conversation is a beginning", energy_cost: 0 },
    ],
    default_next_step_key: "belonging_s4_fork",
    due_offset_days: 2,
    expires_after_days: 3,
  },
  {
    arc_id: ARC_IDS.arc_belonging,
    step_key: "belonging_s4_fork",
    order_index: 4,
    title: "First Week, Belonging",
    body: "The belonging stream has found its first shape. You know where you're going after dinner, or you don't. Either has a name.",
    options: [
      { option_key: "found_a_home", label: "One person or small group has clicked — you know where you're going", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "genuine_match" } },
      { option_key: "still_searching", label: "Nothing has stuck yet — you're present but not inside anything", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "open_scanning" } },
      { option_key: "deliberate_solitude", label: "You've decided not to rush it — watching more than joining", energy_cost: 0, sets_stream_state: { stream: "belonging", state: "withdrawal" } },
    ],
    default_next_step_key: null,
    due_offset_days: 5,
    expires_after_days: 1,
  },

  // ── OPPORTUNITY ──────────────────────────────────────────────────────────
  {
    arc_id: ARC_IDS.arc_opportunity,
    step_key: "opportunity_s1_discovery",
    order_index: 1,
    title: "Discovery",
    body: "It appears early. A flyer on the bulletin board. An upperclassman who mentions something offhand. A professor at the academic open house who says a position is available. The window is short — by Thursday it may be gone. You notice it, and then you notice whether you're drawn toward it or away from it.",
    options: [
      { option_key: "pursue_info", label: "Pursue more information — find out what it actually requires", energy_cost: 1, sets_stream_state: { stream: "opportunity", state: "considering" } },
      { option_key: "note_and_move", label: "Note it and move on — not ready to commit", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "considering" } },
      { option_key: "mention_someone", label: "Mention it to your roommate or a new acquaintance", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "considering" } },
      { option_key: "dismiss_it", label: "Dismiss it — not for you, not yet", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "undiscovered" } },
    ],
    default_next_step_key: "opportunity_s2_obstacle",
    due_offset_days: 0,
    expires_after_days: 2,
  },
  {
    arc_id: ARC_IDS.arc_opportunity,
    step_key: "opportunity_s2_obstacle",
    order_index: 2,
    title: "The Obstacle",
    body: "Something makes pursuing it harder than it initially seemed. The timing conflicts with something else. It requires more confidence than you currently feel. Someone on your floor is also pursuing it — now there's comparison. You can't just apply online. You have to go somewhere in person, during specific hours, and talk to a person.",
    options: [
      { option_key: "push_through_obstacle", label: "Work around it — figure out the logistics", energy_cost: 2, sets_stream_state: { stream: "opportunity", state: "pursuing" } },
      { option_key: "gather_more_info", label: "Get more information before deciding", energy_cost: 1, sets_stream_state: { stream: "opportunity", state: "considering" } },
      { option_key: "obstacle_discourages", label: "The obstacle is a sign — let the window close", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "expired" } },
    ],
    default_next_step_key: "opportunity_s3_decision_point",
    due_offset_days: 1,
    expires_after_days: 3,
  },
  {
    arc_id: ARC_IDS.arc_opportunity,
    step_key: "opportunity_s3_decision_point",
    order_index: 3,
    title: "The Decision Point",
    body: "The window is narrowing. You have to decide. This is a genuine fork with meaningful consequences in both directions. \"I don't actually know if I can do this. I'm doing it anyway.\" Or: \"It wasn't the right time. There will be others.\" (Is that true? You're not sure.)",
    options: [
      { option_key: "go_for_it", label: "Go for it — show up underprepared and make the case", energy_cost: 2, sets_stream_state: { stream: "opportunity", state: "pursuing" } },
      { option_key: "prepare_first", label: "Spend a day preparing — then go", energy_cost: 2, sets_stream_state: { stream: "opportunity", state: "pursuing" } },
      { option_key: "let_it_expire", label: "Let the window close — it wasn't the right time", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "expired" }, sets_expired_opportunity: "academic" },
    ],
    default_next_step_key: "opportunity_s4_fork",
    due_offset_days: 2,
    expires_after_days: 3,
  },
  {
    arc_id: ARC_IDS.arc_opportunity,
    step_key: "opportunity_s4_fork",
    order_index: 4,
    title: "First Week, Opportunity",
    body: "The opportunity stream has resolved. You tried, or you didn't. Either outcome contains information about yourself.",
    options: [
      { option_key: "tried_worked", label: "You went. You're in. The cost is real — so is the momentum.", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "claimed" } },
      { option_key: "tried_not_in", label: "You went. You're not in. But you went.", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "expired" } },
      { option_key: "didnt_try", label: "The opportunity is gone. You tell yourself it's fine.", energy_cost: 0, sets_stream_state: { stream: "opportunity", state: "expired" }, sets_expired_opportunity: "social" },
    ],
    default_next_step_key: null,
    due_offset_days: 5,
    expires_after_days: 1,
  },

  // ── HOME ──────────────────────────────────────────────────────────
  {
    arc_id: ARC_IDS.arc_home,
    step_key: "home_s1_first_contact",
    order_index: 1,
    title: "The First Contact",
    body: "Your mother calls the floor phone. Someone knocks on your door to get you. Or a letter arrives — postmarked before you even left, timed to arrive your first week. What do you tell them? \"I'm fine\" is a lie. \"I'm scared\" is more than they need.",
    options: [
      { option_key: "respond_fully", label: "Respond fully and honestly — tell them what it's actually like", energy_cost: 1, sets_stream_state: { stream: "home", state: "background_warmth" } },
      { option_key: "respond_cheerfully", label: "Respond cheerfully — edit out the hard parts", energy_cost: 0, sets_stream_state: { stream: "home", state: "guilt_current" } },
      { option_key: "respond_briefly", label: "Respond briefly — you're fine, everything is fine", energy_cost: 0 },
      { option_key: "delay", label: "Delay — you'll write back when you know what to say", energy_cost: 0, sets_stream_state: { stream: "home", state: "guilt_current" } },
    ],
    default_next_step_key: "home_s2_contrast_moment",
    due_offset_days: 0,
    expires_after_days: 3,
  },
  {
    arc_id: ARC_IDS.arc_home,
    step_key: "home_s2_contrast_moment",
    order_index: 2,
    title: "The Contrast Moment",
    body: "Someone on your floor has a family background very different from yours — wealthier, less stable, more educated, less supported. You catch yourself using language or framing from home that doesn't quite fit here. You are already two people — who you were and who you're becoming.",
    options: [
      { option_key: "name_the_difference", label: "Name it, at least to yourself — acknowledge the gap", energy_cost: 1, sets_stream_state: { stream: "home", state: "background_warmth" } },
      { option_key: "adjust_quietly", label: "Adjust quietly — let the version of yourself that fits here take over", energy_cost: 0, sets_stream_state: { stream: "home", state: "clean_break" } },
      { option_key: "sit_with_it", label: "Sit with the dissonance — don't resolve it yet", energy_cost: 0, sets_stream_state: { stream: "home", state: "guilt_current" } },
    ],
    default_next_step_key: "home_s3_request",
    due_offset_days: 1,
    expires_after_days: 3,
  },
  {
    arc_id: ARC_IDS.arc_home,
    step_key: "home_s3_request",
    order_index: 3,
    title: "The Request",
    body: "Home asks something of you. A parent asks if you're sure about your major, gently, in a way that carries weight. Your parents mention money in a way that reminds you what they're carrying so you can be here. This is the moment where the emotional transaction becomes visible.",
    options: [
      { option_key: "respond_to_actual_ask", label: "Respond to what they're actually asking — be direct", energy_cost: 2, sets_stream_state: { stream: "home", state: "background_warmth" } },
      { option_key: "respond_to_surface", label: "Respond to what they said on the surface — don't dig deeper", energy_cost: 0, sets_stream_state: { stream: "home", state: "guilt_current" } },
      { option_key: "set_a_limit", label: "Set a limit — tell them you're okay and you'll call on Sunday", energy_cost: 1, sets_stream_state: { stream: "home", state: "clean_break" } },
      { option_key: "feel_the_guilt", label: "Feel the guilt and do nothing with it", energy_cost: 0, sets_stream_state: { stream: "home", state: "active_pull" } },
    ],
    default_next_step_key: "home_s4_fork",
    due_offset_days: 2,
    expires_after_days: 4,
  },
  {
    arc_id: ARC_IDS.arc_home,
    step_key: "home_s4_fork",
    order_index: 4,
    title: "First Week, Home",
    body: "The home stream has found its shape for now. You are connected to where you came from, or you've begun to let the distance happen. Either is real.",
    options: [
      { option_key: "healthy_distance", label: "You're in contact, it's warm. The separation is working.", energy_cost: 0, sets_stream_state: { stream: "home", state: "background_warmth" } },
      { option_key: "carrying_quietly", label: "Something from home is sitting with you. You haven't resolved it.", energy_cost: 0, sets_stream_state: { stream: "home", state: "guilt_current" } },
      { option_key: "pull_is_real", label: "Home is competing with being here. You're spending energy navigating it.", energy_cost: 0, sets_stream_state: { stream: "home", state: "active_pull" } },
      { option_key: "clean_rupture", label: "Something widened the gap faster than expected. You're more alone — and not entirely sure that's bad.", energy_cost: 0, sets_stream_state: { stream: "home", state: "identity_rupture" } },
    ],
    default_next_step_key: null,
    due_offset_days: 5,
    expires_after_days: 1,
  },
];

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  console.log(`Inserting ${steps.length} arc steps...`);

  const { data, error } = await supabase
    .from("arc_steps")
    .upsert(steps, { onConflict: "arc_id,step_key", ignoreDuplicates: true })
    .select("step_key");

  if (error) {
    console.error("Error inserting arc steps:", error);
    process.exit(1);
  }

  console.log(`✅ Inserted/upserted ${data?.length ?? 0} arc steps`);

  // Verify
  const { data: verify, error: verifyError } = await supabase
    .from("arc_steps")
    .select("arc_id, step_key, order_index")
    .order("arc_id")
    .order("order_index");

  if (verifyError) {
    console.error("Verification error:", verifyError);
  } else {
    console.log(`\n✅ Total arc_steps in DB: ${verify.length}`);
    verify.forEach(s => console.log(`  ${s.step_key}`));
  }
}

main();
