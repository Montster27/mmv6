/* eslint-disable no-console */
const puppeteer = require("puppeteer");

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL || "";
const PASSWORD = process.env.E2E_PASSWORD || "";
const HEADLESS = process.env.E2E_HEADLESS !== "0";
const SLOWMO = Number(process.env.E2E_SLOWMO || "0");

async function waitForText(page, text, timeout = 10000) {
  const escaped = text.replace(/"/g, '\\"');
  const [node] = await page.$x(`//*[contains(normalize-space(), "${escaped}")]`);
  if (node) return node;
  return page.waitForXPath(`//*[contains(normalize-space(), "${escaped}")]`, {
    timeout,
  });
}

async function clickByText(page, text, timeout = 10000) {
  const node = await waitForText(page, text, timeout);
  await node.click();
}

async function maybeLogin(page) {
  const emailInput =
    (await page.$('input[type="email"]')) ||
    (await page.$('input[name="email"]'));
  if (!emailInput) return false;
  if (!EMAIL) {
    throw new Error("Login required. Set E2E_EMAIL (and E2E_PASSWORD if needed).");
  }

  await emailInput.click({ clickCount: 3 });
  await emailInput.type(EMAIL, { delay: 10 });

  const passwordInput =
    (await page.$('input[type="password"]')) ||
    (await page.$('input[name="password"]'));
  if (passwordInput && PASSWORD) {
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(PASSWORD, { delay: 10 });
  }

  const buttons = [
    'button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
  ];
  for (const selector of buttons) {
    const button = await page.$(selector);
    if (button) {
      await button.click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  await clickByText(page, "Sign in", 3000).catch(() => {});
  return true;
}

async function setAllocation(page, label, value) {
  const escaped = label.replace(/"/g, '\\"');
  const [input] = await page.$x(
    `//label[.//span[normalize-space(text())="${escaped}"]]//input[@type="number"]`
  );
  if (!input) {
    throw new Error(`Allocation input not found for ${label}`);
  }
  await input.click({ clickCount: 3 });
  await input.type(String(value), { delay: 5 });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: SLOWMO,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${BASE_URL}/play`, { waitUntil: "networkidle2" });

    await maybeLogin(page);
    await page.waitForTimeout(500);
    await page.goto(`${BASE_URL}/play`, { waitUntil: "networkidle2" });

    await waitForText(page, "Step 1: Time Allocation", 15000);

    await setAllocation(page, "Study", 20);
    await setAllocation(page, "Work", 20);
    await setAllocation(page, "Social", 20);
    await setAllocation(page, "Health", 20);
    await setAllocation(page, "Fun", 20);

    await clickByText(page, "Save allocation");
    await page.waitForTimeout(800);

    const [choiceButton] = await page.$x(
      `//section[.//h2[contains(normalize-space(), "Storylet")]]//button[not(@disabled)]`
    );
    if (choiceButton) {
      await choiceButton.click();
    }

    await page.waitForTimeout(800);
    await page.screenshot({ path: "test_output.png", fullPage: true });
    console.log("E2E run complete: test_output.png");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
