import { test, expect, type Page } from "@playwright/test";
import { emptyManifest } from "../../src/core/studio/manifest";
import { CHAPTER_ONE_TRACK_KEYS } from "../../src/types/tracks";
import type { StudioManifest } from "../../src/types/studio";

// Beginner-flow tests against a local build with an explicitly synthetic API.
test.skip(!process.env.STUDIO_UI_TEST, "Run with STUDIO_UI_TEST=1 and a local BASE_URL using the studio-test Supabase URL.");

const me = "10000000-0000-0000-0000-000000000001";
const tracks = CHAPTER_ONE_TRACK_KEYS.map((key) => ({ id: `track-${key}`, key, title: key, is_enabled: true }));

async function setup(page: Page, opts: { admin?: boolean; soloMode?: boolean; withWorkspace?: boolean; scenes?: number; members?: number; mutate?: (state: Record<string, any>) => void } = {}) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const workspace = { id: "ws", title: "My draft", owner_id: me, reviewer_id: null, collaborator_ids: [], base_release_id: "base", revision: 1, status: "draft", brief: "", blocked_reason: "", plan_id: null };
  const manifest: StudioManifest = { ...emptyManifest(), tracks: tracks as never };
  for (let i = 0; i < (opts.scenes ?? 0); i++) manifest.storylets.push({ id: `old-${i}`, slug: `old-${i}`, storylet_key: `old_${i}`, title: `Old ${i}`, body: "Old.", choices: [], is_active: true, track_id: "track-roommate", order_index: i + 1 });
  const state = {
    actor: { id: me, email: "writer@example.test", admin: opts.admin ?? true, role: "writer" },
    workspace: opts.withWorkspace ? workspace : null, workspaces: opts.withWorkspace ? [workspace] : [],
    members: Array.from({ length: opts.members ?? 1 }, (_, i) => ({ user_id: i === 0 ? me : `u${i}`, display_name: i === 0 ? "Writer" : `Other ${i}`, role: "writer" })),
    releases: [
      { id: "base", title: "Baseline", runtime_version: "narrative-offers-v1", created_at: "2026-10-03T12:00:00Z" },
      { id: "solo-1", title: "Self published", runtime_version: "narrative-offers-v1", created_at: "2026-10-04T12:00:00Z", self_reviewed: true },
    ],
    activeReleaseId: "base", activePlans: [], inheritedBriefs: [], impacts: [], conflicts: [], manifest, base: manifest, changes: [], events: [], issues: [], tests: [],
    soloMode: opts.soloMode ?? false,
  };
  opts.mutate?.(state as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
  await page.addInitScript(({ me, ws }) => {
    if (ws) sessionStorage.setItem("studio.workspace", "ws");
    localStorage.setItem("sb-studio-test-auth-token", JSON.stringify({ access_token: "synthetic-ui-test", refresh_token: "synthetic", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: me, email: "writer@example.test", aud: "authenticated" } }));
  }, { me, ws: Boolean(opts.withWorkspace) });
  await page.route("https://studio-test.supabase.co/**", (route) => route.fulfill({ json: { id: me } }));
  const commands: Record<string, unknown>[] = [];
  const sceneWrites: Record<string, unknown>[] = [];
  await page.route("**/api/admin/studio**", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: state });
    const body = route.request().postDataJSON();
    commands.push(body);
    if (body.action === "create") { state.workspace = { ...workspace }; state.workspaces = [{ ...workspace }]; return route.fulfill({ json: { id: "ws", revision: 1 } }); }
    if (body.action === "solo") state.soloMode = Boolean(body.enabled);
    return route.fulfill({ json: { revision: 2 } });
  });
  await page.route("**/api/admin/storylets", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      sceneWrites.push(body);
      return route.fulfill({ json: { ok: true, id: "new-id", revision: 2, record: body } });
    }
    return route.fulfill({ json: { storylets: [] } });
  });
  return { state, commands, sceneWrites };
}

test("a first-time writer writes, checks, plays and saves a scene", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/studio/content");
  await expect(page).toHaveURL(/\/studio\/content\/start/);
  await expect(page.getByRole("heading", { name: "Write your first scene" })).toBeVisible();

  await page.getByRole("button", { name: /Academic Footing/ }).click();
  await page.getByRole("button", { name: "Next: write it" }).click();

  await page.getByLabel("Scene title").fill("The hall phone");
  await page.getByLabel("Scene text").fill("The pay phone on your floor has a line of three. The dial is warm from other hands.");
  await page.getByLabel("Choice 1 label").fill("Wait your turn and call home");
  await page.getByLabel("Choice 1 reaction").fill("It rings four times before anyone answers.");
  await page.getByLabel("Choice 2 label").fill("Write a postcard instead");
  await page.getByLabel("Choice 2 reaction").fill("The picture is of a clock tower you have not seen up close.");
  await page.getByRole("button", { name: "Next: check and play it" }).click();

  await page.getByRole("button", { name: "▶ Play this scene" }).click();
  const dialog = page.getByRole("dialog", { name: "Play this scene" });
  await expect(dialog.getByText("The pay phone on your floor")).toBeVisible();
  await dialog.getByRole("button", { name: "Wait your turn and call home" }).click();
  await expect(dialog.getByText("It rings four times")).toBeVisible();
  await expect(dialog.getByText("What this choice does")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Next: save it" }).click();
  await page.getByRole("button", { name: "Save to my draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved “The hall phone” to your draft" })).toBeVisible();

  expect(api.commands[0]).toMatchObject({ action: "create" });
  expect(api.sceneWrites[0]).toMatchObject({ title: "The hall phone", track_id: "track-academic", storylet_key: "the_hall_phone", is_active: true, due_offset_days: 0, segment: "morning" });
  const choices = api.sceneWrites[0].choices as Record<string, unknown>[];
  expect(choices.every((c) => Array.isArray(c.precludes) && Array.isArray(c.identity_tags))).toBe(true);
});

test("checks explain problems in plain words and fix them in one click", async ({ page }) => {
  await setup(page);
  await page.goto("/studio/content/start");
  await page.getByRole("button", { name: /Start from a blank page/ }).click();
  await page.getByRole("button", { name: "Next: write it" }).click();
  await page.getByLabel("Scene title").fill("A scene");
  await page.getByLabel("Scene text").fill("Some text.");
  await page.getByLabel("Choice 1 label").fill("Do it");
  await page.getByLabel("Choice 1 reaction").fill("You did it.");
  await page.getByLabel("Choice 2 label").fill("Skip it");
  await page.getByLabel("Choice 2 reaction").fill("You skipped it.");
  await page.getByRole("button", { name: "Next: check and play it" }).click();
  // New choices already say they close nothing off; the kind of choice is still to be picked.
  await expect(page.getByText("Say whether this choice closes anything off")).toHaveCount(0);
  await expect(page.getByText("Say what kind of choice this is").first()).toBeVisible();
  await page.getByRole("button", { name: "Fix everything that is safe to fix automatically" }).click();
  await expect(page.getByText("Nothing to fix. This scene follows the project rules.")).toBeVisible();
});

test("example text from a template must be replaced before it feels finished", async ({ page }) => {
  await setup(page);
  await page.goto("/studio/content/start");
  await page.getByRole("button", { name: "Next: write it" }).click();
  await page.getByRole("button", { name: "Next: check and play it" }).click();
  await expect(page.getByText("Replace the example text with your own")).toBeVisible();
});

test("navigation puts Scenes up front, power tools under Advanced, and the glossary explains the words", async ({ page }) => {
  await setup(page, { withWorkspace: true });
  await page.goto("/studio/content/work");
  const tabs = page.locator(".tabbar").first();
  for (const name of ["Start here", "Scenes", "My work", "Narrative map", "Library", "Review", "Releases"]) {
    await expect(tabs.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(tabs.getByRole("link", { name: "Calendar", exact: true })).toHaveCount(0);
  await tabs.getByRole("button", { name: /Advanced/ }).click();
  await expect(tabs.getByRole("link", { name: "Calendar", exact: true })).toBeVisible();
  await tabs.getByRole("link", { name: "Glossary", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Glossary" })).toBeVisible();
  await expect(page.getByText("also called storylet, moment, offer")).toBeVisible();
});

test("admin can turn on solo mode and releases show the self-reviewed mark", async ({ page }) => {
  const api = await setup(page, { withWorkspace: true });
  await page.goto("/studio/content/work");
  await expect(page.getByRole("heading", { name: "Working alone" })).toBeVisible();
  await page.getByRole("button", { name: "Turn on solo mode" }).click();
  await expect.poll(() => api.commands.find((c) => c.action === "solo")).toMatchObject({ action: "solo", enabled: true });
  await page.goto("/studio/content/releases");
  await expect(page.getByText("Self-reviewed", { exact: true })).toBeVisible();
});

test("solo mode cannot be turned on once the team has two people", async ({ page }) => {
  await setup(page, { withWorkspace: true, members: 2 });
  await page.goto("/studio/content/work");
  await expect(page.getByRole("button", { name: "Turn on solo mode" })).toBeDisabled();
  await expect(page.getByText("Your team has 2 members, so independent review applies.")).toBeVisible();
});

test("starting fresh states what happens to players before removing anything", async ({ page }) => {
  const api = await setup(page, { withWorkspace: true, scenes: 3 });
  await page.goto("/studio/content/work");
  await expect(page.getByText("This draft has 3 scenes.")).toBeVisible();
  let message = "";
  page.once("dialog", (dialog) => { message = dialog.message(); void dialog.accept(); });
  await page.getByRole("button", { name: "Start fresh with starter scenes" }).click();
  await expect.poll(() => api.commands.find((c) => c.action === "fresh")).toMatchObject({ action: "fresh" });
  expect(message).toMatch(/Remove all 3 scenes/);
  expect(message).toMatch(/already mid-game stay on their current version/);
});

test("a scene shows its checks with a one-click fix in the editor", async ({ page }) => {
  await setup(page, { withWorkspace: true });
  await page.route("**/api/admin/storylets", (route) => route.fulfill({ json: { storylets: [] } }));
  await page.goto("/studio/content/storylets");
  await page.getByRole("button", { name: "+ New" }).click();
  await page.getByRole("button", { name: "+ Add a choice" }).click();
  await page.getByLabel("Choice 1 label").fill("Knock");
  await page.getByRole("button", { name: /^Checks/ }).click();
  await expect(page.getByText("Say what kind of choice this is").first()).toBeVisible();
  await page.getByRole("button", { name: /Mark it “safety”/ }).first().click();
  await expect(page.getByText("Say what kind of choice this is")).toHaveCount(0);
});

const sceneRow = (id: string, extra: Record<string, unknown> = {}) => ({ id, slug: id, storylet_key: id, title: `Scene ${id}`, body: "Text.", choices: [], is_active: true, track_id: "track-roommate", order_index: 1, due_offset_days: 0, expires_after_days: 1, segment: "morning", requirements: {}, ...extra });

test("an arc shows a map of its scenes, and scenes are added with a searchable picker", async ({ page }) => {
  await setup(page, {
    withWorkspace: true,
    mutate: (state) => {
      state.manifest.storylets = [
        sceneRow("a", { choices: [{ id: "x", label: "X", sets_flag: ["spoke"], next_key: "b" }] }),
        sceneRow("b", { due_offset_days: 1, requirements: { requires_storylets: ["a"], requires_flag: "spoke" } }),
        sceneRow("c", { title: "Scene c, not yet linked" }),
      ];
      state.manifest.plans = [{ id: "arc1", kind: "arc", title: "Study group", storylet_ids: ["a", "b"], miss_path: "The player may decline." }];
    },
  });
  await page.goto("/studio/content/narrative");
  await page.getByRole("button", { name: /arc Study group/ }).click();
  await expect(page.getByRole("img", { name: "Map of this arc's scenes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open scene Scene a" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open scene Scene b" })).toBeVisible();
  await expect(page.getByText("Needs this scene first")).toBeVisible();
  await expect(page.getByText("Day 1")).toBeVisible();

  const picker = page.getByRole("combobox", { name: "Scenes in this arc" });
  await picker.fill("not yet");
  await page.getByRole("option", { name: /Scene c, not yet linked/ }).click();
  await expect(page.getByRole("link", { name: "Open scene Scene c, not yet linked" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Scene c, not yet linked" }).click();
  await expect(page.getByRole("link", { name: "Open scene Scene c, not yet linked" })).toHaveCount(0);
});

test("review shows what changed in plain words, with the raw data tucked away", async ({ page }) => {
  await setup(page, {
    withWorkspace: true,
    mutate: (state) => {
      const before = sceneRow("a", { title: "The phone", choices: [{ id: "x", label: "Call", energy_cost: 1 }] });
      const after = sceneRow("a", { title: "The hall phone", choices: [{ id: "x", label: "Call", energy_cost: 3 }, { id: "y", label: "Write" }] });
      state.base = { ...state.manifest, storylets: [before] };
      state.manifest = { ...state.manifest, storylets: [after] };
      state.changes = [{ kind: "storylets", object_id: "a", payload: after }];
    },
  });
  await page.goto("/studio/content/review");
  await page.getByText(/The hall phone · storylets · changed/).click();
  await expect(page.getByText("Title changed from “The phone” to “The hall phone”.")).toBeVisible();
  await expect(page.getByText("“Call”: now — costs 3 energy.")).toBeVisible();
  await expect(page.getByText("Choice added: “Write”.")).toBeVisible();
  await expect(page.getByText("Technical details (full before and after)")).toBeVisible();
});
