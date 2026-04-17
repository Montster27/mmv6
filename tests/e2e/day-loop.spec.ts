import { test, expect } from "@playwright/test";

/**
 * Day-loop integration test.
 *
 * Catches the class of bugs the playthrough_runner cannot — client-side
 * React state machine races in segment transitions.
 *
 * Scenario:
 *   1. Start at Day 1 Morning (via Reset run from Dev menu)
 *   2. Resolve Room 214 (roommate, conversational nodes) + Down the Hall (belonging)
 *   3. Click dismissal Continue buttons — the last one should advance morning → afternoon
 *   4. Assert: we are on Day 1 Afternoon, lunch_floor is visible, we did NOT cascade to night
 *
 * The bug this test guards against (diagnosed 2026-04-16, fixed in commit 9bbde1c
 * and decisively removed in commit 00edffc):
 *   The dismiss+advance merged click triggered a 400ms auto-advance timer that fired
 *   against stale state, invoking a second handleAdvanceSegment call that cascaded
 *   afternoon → evening → night in under a second. lunch_floor never got a chance
 *   to render. This test would have caught it before the push.
 */

const USERNAME = process.env.TEST_USER_USERNAME;
const PASSWORD = process.env.TEST_USER_PASSWORD;

test.skip(
  !USERNAME || !PASSWORD,
  "TEST_USER_USERNAME and TEST_USER_PASSWORD must be set (see .env.test.local.example)"
);

test.describe("Day 0 → Day 1 segment flow", () => {
  test("morning resolves without cascading past afternoon", async ({ page }) => {
    // ── 1. Login ────────────────────────────────────────────────────────────
    await page.goto("/login");

    // The login page has multiple "Username" labels (sign-in and create-account).
    // Scope to the sign-in card by finding the form containing the Sign in button.
    const signInForm = page.locator("form").filter({
      has: page.getByRole("button", { name: "Sign in" }),
    });
    await signInForm.getByLabel("Username").fill(USERNAME!);
    await signInForm.getByLabel("Password").fill(PASSWORD!);
    await signInForm.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/play/, { timeout: 15_000 });

    // ── 2. Reset the run ───────────────────────────────────────────────────
    await page.getByRole("button", { name: "Dev menu" }).click();
    await page.getByRole("button", { name: "Reset run" }).click();

    // After reset, page should show Day 1 Morning header
    await expect(page.getByText(/Day 1 · Morning/)).toBeVisible({ timeout: 15_000 });

    // Close dev menu so it doesn't overlay the play content
    const closeButton = page.getByRole("button", { name: "Close" });
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }

    // ── 3. Walk Room 214 (conversational nodes + terminal choice) ──────────
    await page
      .getByRole("button", { name: "Put the duffel down, shake his hand" })
      .click();

    // Node transition after micro-choice
    await page
      .getByRole("button", { name: "Continue →", exact: true })
      .first()
      .click();

    // Next conv-node: "What is that song?" micro-choice
    await page.getByRole("button", { name: '"What is that song?"' }).click();

    // Advance again
    await page
      .getByRole("button", { name: "Continue →", exact: true })
      .first()
      .click();

    // Terminal choice
    await page
      .getByRole("button", {
        name: '"Head out to see what\'s down the hall"',
      })
      .click();

    // ── 4. Walk Down the Hall (dorm_hallmates) — pick a choice that chains to lunch_floor ──
    await page.getByRole("button", { name: '"I\'ll come"' }).click();

    // ── 5. Dismiss both resolved cards — last click advances to afternoon ──
    // First Continue button dismisses the first card (no segment advance)
    await page
      .getByRole("button", { name: "Continue", exact: true })
      .first()
      .click();

    // Last dismissal merges with segment advance
    await page.getByRole("button", { name: /Continue to afternoon/ }).click();

    // ── 6. Assertions: we are on afternoon with lunch_floor, NOT night ────
    await expect(page.getByText(/Day 1 · Afternoon/)).toBeVisible({
      timeout: 10_000,
    });

    // lunch_floor's title
    await expect(
      page.getByRole("heading", { name: "The Dining Hall" })
    ).toBeVisible();

    // Negative assertion: day did NOT cascade to night / end-of-day
    await expect(page.getByText(/End of Day 1/)).not.toBeVisible();
    await expect(page.getByText(/Sleep \(8h\)/)).not.toBeVisible();
    await expect(page.getByText(/Day 1 · Night/)).not.toBeVisible();
  });
});
