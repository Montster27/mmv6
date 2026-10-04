/**
 * Plain-language names and meanings for Studio vocabulary. One source of truth so the
 * nav, tooltips and the Glossary page never drift apart.
 *
 * The unit of content is a **scene**. The code and database still call it a "storylet".
 */
export type TermId =
  | "scene" | "track" | "day" | "segment" | "window" | "key" | "status" | "choice" | "flag"
  | "precludes" | "identity" | "chain" | "draft" | "workspace" | "revision" | "release"
  | "rebase" | "plan" | "arc" | "definition" | "scenario" | "rehearsal" | "solo";

export type TermEntry = { id: TermId; label: string; short: string; long: string; alsoCalled?: string[] };

export const TERMS: Record<TermId, TermEntry> = {
  scene: { id: "scene", label: "Scene", alsoCalled: ["storylet", "moment", "offer"],
    short: "One small moment the player can step into.",
    long: "A scene is a short piece of text with two or three choices. The game offers scenes to the player; the player chooses whether to take part." },
  track: { id: "track", label: "Track", alsoCalled: ["stream"],
    short: "A storyline that runs alongside others, such as Roommate or Money.",
    long: "The game runs six tracks at once: Roommate, Academic, Money, Belonging, Opportunity and Home. Every scene belongs to exactly one." },
  day: { id: "day", label: "Day", short: "The day a scene first becomes available (0 is the first day).",
    long: "Counted from the start of the player's term. A scene set to day 2 cannot be offered on day 0 or 1." },
  segment: { id: "segment", label: "Part of day", alsoCalled: ["segment"], short: "Morning, afternoon or evening.",
    long: "Each day has three parts. A scene with a part of day is only offered then; leave it blank to allow any part." },
  window: { id: "window", label: "Window", alsoCalled: ["expires after"], short: "How many extra days a scene stays available.",
    long: "A window of 0 means the scene is offered on its day only. If the player passes, it is gone for good. A window of 3 keeps it available for three more days." },
  key: { id: "key", label: "Scene key", short: "A short internal name other scenes use to refer to this one.",
    long: "Lowercase words joined by underscores, like starter_home_phone. It must be unique within its track." },
  status: { id: "status", label: "Status", short: "Draft scenes are never shown to players.",
    long: "Only active scenes in a published release can be offered. Everything you write stays a draft until you publish." },
  choice: { id: "choice", label: "Choice", short: "One thing the player can do in a scene.",
    long: "Each choice has a short label, a reaction the player reads, and optional costs or consequences." },
  flag: { id: "flag", label: "Flag", short: "A note the game remembers, so later scenes can react.",
    long: "A choice can set a flag such as met_the_roommate. A later scene can require that flag before it appears." },
  precludes: { id: "precludes", label: "Closes off", alsoCalled: ["precludes"], short: "Scenes this choice makes impossible from now on.",
    long: "Most choices close nothing off, and that is fine: leave it empty. Use it only when a choice makes another scene impossible for good." },
  identity: { id: "identity", label: "Kind of choice", alsoCalled: ["identity tags"], short: "Whether a choice is about risk, people, achievement or safety.",
    long: "Every choice carries at least one of four tags: risk, people, achieve, safety. They describe who the player is becoming; they do not change the story directly." },
  chain: { id: "chain", label: "Follow-up", alsoCalled: ["chain", "next scene"], short: "A scene that comes after another one.",
    long: "Set a follow-up scene by requiring that an earlier scene happened, or that a flag was set." },
  draft: { id: "draft", label: "Draft", short: "Your private working copy. Saving a draft never changes what players see.",
    long: "Drafts live inside a workspace. Players only see a draft after you publish it." },
  workspace: { id: "workspace", label: "Workspace", alsoCalled: ["working context", "assignment"], short: "A named piece of work with its own draft.",
    long: "A workspace holds your changes, its owner and its reviewer. Different people can work in different workspaces without overwriting each other." },
  revision: { id: "revision", label: "Revision", short: "The version number of a workspace. It goes up with every save.",
    long: "If two people save at once, the second save is stopped so nothing is overwritten, and you are asked to compare." },
  release: { id: "release", label: "Release", alsoCalled: ["publish"], short: "A published version of the game's content.",
    long: "New players use the active release. Players already in a game stay on the release they started with." },
  rebase: { id: "rebase", label: "Update to latest", alsoCalled: ["rebase"], short: "Bring your draft up to date with what was published since you started.",
    long: "If a release went live after you began, update your draft before publishing. Studio shows what changed and asks you to confirm." },
  plan: { id: "plan", label: "Plan", alsoCalled: ["narrative map"], short: "A written outline: direction, plot, strand or arc.",
    long: "Plans organise who is responsible for what. They never force a route on the player." },
  arc: { id: "arc", label: "Arc", short: "A small story built from a handful of related scenes.",
    long: "An arc asks one question, such as whether a study group survives a disagreement, and says how the player can enter, miss or leave it." },
  definition: { id: "definition", label: "Shared definition", short: "Something many scenes agree on, such as a fact or a person.",
    long: "Definitions keep scenes consistent: what is true, who knows it, where it happens." },
  scenario: { id: "scenario", label: "Offer test", alsoCalled: ["scenario"], short: "A saved check that says which scenes should or should not appear.",
    long: "For example: on day 1 morning, after the player spoke to their roommate, the window scene must be offered." },
  rehearsal: { id: "rehearsal", label: "Rehearsal", short: "A saved walk through several scenes and choices.",
    long: "A rehearsal follows choices through the real game rules and checks resources, flags and what is offered next." },
  solo: { id: "solo", label: "Solo mode", short: "Lets a one-person team approve its own work.",
    long: "Releases made this way are permanently marked self-reviewed. It switches off when a second member joins." },
};

export const TERM_LIST: TermEntry[] = Object.values(TERMS);
export const termHelp = (id: TermId): string => TERMS[id].short;
