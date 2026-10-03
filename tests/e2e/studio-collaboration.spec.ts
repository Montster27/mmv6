import type { StudioRecord, StudioManifest } from "../../src/types/studio";
import type { PlanningImpact } from "../../src/core/studio/planning";
import { test, expect, type Page } from "@playwright/test";

// Browser interaction tests against a local build, with explicitly synthetic API state.
// Database permissions and transactions are covered by check-studio-database.mjs.
test.skip(!process.env.STUDIO_UI_TEST, "Run with STUDIO_UI_TEST=1 and a local BASE_URL using the studio-test Supabase URL.");
const owner = "10000000-0000-0000-0000-000000000001";
const workspace = { id: "workspace", title: "Roommate strand", owner_id: owner, reviewer_id: "reviewer", collaborator_ids: [], base_release_id: "baseline", revision: 1, status: "draft", brief: "Leave room for late entry.", blocked_reason: "", plan_id: null };
const empty: StudioManifest = { storylets: [], tracks: [], consequences: [], plans: [], definitions: [], scenarios: [] };
async function fixture(page: Page) {
  const state = { actor: { id: owner, email: "writer@example.test", admin: false, role: "writer" }, workspace: { ...workspace }, workspaces: [{ ...workspace }], members: [{ user_id: owner, display_name: "Writer", role: "writer" }], releases: [{ id: "baseline", title: "Baseline", runtime_version: "narrative-offers-v1", created_at: "2026-10-03T12:00:00Z" }], activeReleaseId: "baseline", activePlans: [] as StudioRecord[], inheritedBriefs: [] as StudioRecord[], impacts: [] as PlanningImpact[], manifest: structuredClone(empty), base: structuredClone(empty), changes: [] as unknown[], events: [], conflicts: [] as unknown[], issues: [], tests: [] };
  await page.addInitScript(({ owner }) => {
    sessionStorage.setItem("studio.workspace", "workspace");
    localStorage.setItem("sb-studio-test-auth-token", JSON.stringify({ access_token: "synthetic-ui-test", refresh_token: "synthetic", expires_at: Math.floor(Date.now()/1000)+3600, token_type: "bearer", user: { id: owner, email: "writer@example.test", aud: "authenticated" } }));
  }, { owner });
  await page.route("https://studio-test.supabase.co/**", (route) => route.fulfill({ json: { id: owner } }));
  const commands: Record<string, unknown>[] = [];
  let conflict = false;
  await page.route("**/api/admin/studio**", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: state });
    const body = route.request().postDataJSON(); commands.push(body);
    if (conflict) return route.fulfill({ status: 409, json: { error: "Revision conflict. Your work is preserved; reload and compare before saving." } });
    if (body.action === "save") {
      const rows = state.manifest[body.kind as keyof typeof empty] as unknown[];
      rows.push(body.payload); state.changes.push({ kind: body.kind, object_id: body.object_id, payload: body.payload });
    }
    state.workspace.revision++;
    return route.fulfill({ json: { revision: state.workspace.revision } });
  });
  return { state, commands, conflict: () => { conflict = true; } };
}
test("writer creates a plan and retains unsaved work after a competing save", async ({ page }) => {
  const setup = await fixture(page);
  await page.goto("/studio/content/narrative");
  await page.getByRole("button", { name: "+ Plan", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Arriving late");
  await page.getByLabel("Player experience").fill("Make a connection without requiring the first-night encounter.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved to this draft");
  expect(setup.commands[0]).toMatchObject({ action: "save", revision: 1, kind: "plans", payload: { title: "Arriving late" } });
  await page.getByRole("button", { name: /arc Arriving late/ }).click();
  await page.getByLabel("Title", { exact: true }).fill("My unsaved title");
  setup.conflict();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Revision conflict" })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("My unsaved title");
});
test("invalid advanced scenario input cannot silently save an older value", async ({ page }) => {
  await fixture(page);
  await page.goto("/studio/content/review");
  await page.getByRole("button", { name: "+ Offer scenario", exact: true }).click();
  await page.getByLabel("Test name").fill("Late entry");
  await page.getByText("Advanced scenario state", { exact: true }).click();
  await page.getByRole("textbox", { name: "Advanced scenario state" }).fill("{broken");
  await expect(page.getByRole("button", { name: "Save and run scenario" })).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid scenario" })).toBeVisible();
  await page.getByRole("textbox", { name: "Advanced scenario state" }).fill('{"choices":{},"skills":[],"precluded":[]}');
  await expect(page.getByRole("button", { name: "Save and run scenario" })).toBeEnabled();
});
test("overlapping versions require an explicit choice before integration", async ({ page }) => {
  const setup = await fixture(page);
  setup.state.activeReleaseId = "new-release";
  setup.state.conflicts = [{ id: "plans:plot", draft: { title: "Writer version" }, released: { title: "Lead version" } }];
  await page.goto("/studio/content/review");
  await expect(page.getByRole("heading", { name: "Resolve overlapping edits" })).toBeVisible();
  await page.getByLabel("Keep current release").check();
  await page.getByRole("button", { name: "Rebase reviewed changes" }).click();
  await expect.poll(() => setup.commands[0]).toMatchObject({ action: "rebase", release_id: "new-release", resolutions: { "plans:plot": "released" } });
});

test("a changed deadline is compared and acknowledged before rebasing", async ({ page }) => {
  const setup = await fixture(page);
  setup.state.activeReleaseId = "friday-release";
  setup.state.impacts = [{ id: "definitions:meeting", title: "Study meeting", fields: ["timing"], path: ["invitation", "meeting"], before: { id: "meeting", timing: "Thursday" }, after: { id: "meeting", timing: "Friday" } }];
  await page.goto("/studio/content/review");
  await expect(page.getByRole("heading", { name: "Changed agreements affecting this assignment" })).toBeVisible();
  await expect(page.getByText("Thursday", { exact: true })).toBeVisible();
  await expect(page.getByText("Friday", { exact: true })).toBeVisible();
  const rebase = page.getByRole("button", { name: "Rebase reviewed changes" });
  await expect(rebase).toBeDisabled();
  await page.getByLabel("I reviewed the impact of Study meeting").check();
  await rebase.click();
  await expect.poll(() => setup.commands[0]).toMatchObject({ action: "rebase", release_id: "friday-release", acknowledged_impacts: ["definitions:meeting"] });
});
test("a lead can hand off an approved plan with attributed constraints", async ({ page }) => {
  const setup = await fixture(page);
  setup.state.activePlans = [{ id: "plot", kind: "plot", title: "Belonging", constraints: "The player may decline", suggestions: "Try a quiet invitation" }];
  setup.state.inheritedBriefs = setup.state.activePlans;
  await page.goto("/studio/content/work?plan=plot");
  await expect(page.getByLabel("Approved plan for this assignment")).toHaveValue("plot");
  const brief = page.locator("section").filter({ has: page.getByRole("heading", { name: "Assignment brief", exact: true }) });
  await expect(brief.getByText("The player may decline", { exact: true })).toBeVisible();
  await expect(brief.getByText("Creative suggestions", { exact: true })).toBeVisible();
  await page.getByLabel("Workspace title", { exact: true }).fill("Write the invitation");
  await page.getByRole("button", { name: "Create draft workspace" }).click();
  await expect.poll(() => setup.commands[0]).toMatchObject({ action: "create", plan_id: "plot", title: "Write the invitation" });
});

test("a writer defines a known false fact without confusing it with unknown", async ({ page }) => {
  const setup = await fixture(page);
  await page.goto("/studio/content/library");
  await page.getByRole("button", { name: "+ Definition", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Study invitation accepted");
  await page.getByRole("button", { name: "Define fact values" }).click();
  await expect(page.getByLabel("Initial knowledge")).toHaveValue("unknown");
  await page.getByLabel("Initial knowledge").selectOption("known");
  await page.getByRole("combobox", { name: "Initial value", exact: true }).selectOption("false");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => setup.commands[0]).toMatchObject({ kind: "definitions", payload: { kind: "fact", fact_schema: { type: "boolean", default_known: true, default_value: false } } });
});
test("a calendar reservation captures its clock, location, and shared NPC", async ({ page }) => {
  const setup = await fixture(page);
  setup.state.manifest.tracks = [{ id: "academic", title: "Academic" }];
  setup.state.manifest.definitions = [{ id: "priya", title: "Priya", kind: "npc" }, { id: "library", title: "Library", kind: "location" }];
  await page.goto("/studio/content/library");
  await page.getByRole("button", { name: "+ Definition", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Study meeting");
  await page.getByRole("combobox", { name: "Type", exact: true }).selectOption("calendar");
  await page.getByRole("button", { name: "Reserve a calendar window" }).click();
  await page.getByLabel("Track clock").selectOption("academic");
  await page.getByLabel("Track day", { exact: true }).fill("4");
  await page.getByLabel("Start hour", { exact: true }).fill("14");
  await page.getByLabel("End hour", { exact: true }).fill("16");
  await page.getByRole("combobox", { name: "Location", exact: true }).selectOption("library");
  await page.getByLabel("Required NPCs").selectOption(["priya"]);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => setup.commands[0]).toMatchObject({ payload: { kind: "calendar", reservation: { track_id: "academic", day: 4, start_hour: 14, end_hour: 16, location_id: "library", npc_ids: ["priya"] } } });
});
