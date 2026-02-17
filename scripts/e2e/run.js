/* eslint-disable no-console */
const puppeteer = require("puppeteer");

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL || "";
const PASSWORD = process.env.E2E_PASSWORD || "";
const HEADLESS = process.env.E2E_HEADLESS !== "0";
const SLOWMO = Number(process.env.E2E_SLOWMO || "0");
const CHROME_PATH =
  process.env.E2E_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function maybeLogin(page) {
  console.log("Checking if login is needed...");
  await page.waitForSelector('body', { timeout: 10000 });
  const emailSection = await page.locator('::-p-xpath(//div[h2[text()="Sign in with email"]])').waitHandle({ timeout: 5000 }).catch(() => null);
  if (!emailSection) return await page.evaluate(() => document.body.innerText.includes("Sign out"));

  console.log("Logging in...");
  const emailInp = await emailSection.$('input[type="email"]');
  const passInp = await emailSection.$('input[type="password"]');
  const btn = await emailSection.$('button');
  if (emailInp && passInp && btn) {
    await emailInp.type(EMAIL, { delay: 20 });
    await passInp.type(PASSWORD, { delay: 20 });
    await btn.click();
  }
  await new Promise(r => setTimeout(r, 8000));
  return await page.evaluate(() => document.body.innerText.includes("Sign out") || document.body.innerText.includes("Day"));
}

async function getCurrentDay(page) {
  return await page.evaluate(() => {
    const match = document.body.innerText.match(/Day\s+(\d+)/i);
    return match ? parseInt(match[1]) : null;
  });
}

async function fillInputs(page) {
  for (let i = 0; i < 5; i++) {
    const handle = await page.evaluateHandle((idx) => {
      const isDev = (el) => {
        let p = el;
        while (p) { if (p.tagName === 'DETAILS' || (p.className && typeof p.className === 'string' && p.className.includes('dev'))) return true; p = p.parentElement; }
        return false;
      };
      return Array.from(document.querySelectorAll('input[type="number"]')).filter(el => !isDev(el))[idx];
    }, i);
    const input = handle.asElement();
    if (input) {
      await input.scrollIntoViewIfNeeded();
      await input.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.keyboard.type('20', { delay: 50 });
      await page.keyboard.press('Tab');
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

async function completeStorylets(page) {
  console.log("Step 3: Completing Storylets...");
  for (let attempt = 0; attempt < 10; attempt++) {
    const hasStorylet = await page.evaluate(() => document.body.innerText.includes("Storylet"));
    if (!hasStorylet) {
      console.log("  No Storylets section found.");
      break;
    }

    // Check progress first
    const progress = await page.evaluate(() => {
      const m = document.body.innerText.match(/Progress:\s*([\d]+)\/([\d]+)/);
      return m ? { done: parseInt(m[1]), total: parseInt(m[2]) } : null;
    });

    if (progress && progress.done >= progress.total) {
      console.log(`  All storylets complete (${progress.done}/${progress.total}).`);
      break;
    }

    // Find a clickable storylet choice
    const clicked = await page.evaluate(() => {
      // Look for storylet choice buttons — they tend to be inside a card/section below "Storylet X of Y"
      const allBtns = Array.from(document.querySelectorAll('button, [role="button"]'));
      const systemBtns = ["Dev menu", "Sign out", "Save allocation", "Save", "Play", "Journal",
        "Theoryboard", "Group", "Close", "Steady", "Push", "Recover", "Connect"];

      const choiceBtns = allBtns.filter(b => {
        const text = b.innerText.trim();
        if (systemBtns.some(s => text === s)) return false;
        if (text.includes("Next day")) return false;
        if (text.length < 5) return false;
        const rect = b.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (choiceBtns.length > 0) {
        const btn = choiceBtns[0];
        btn.scrollIntoView();
        btn.click();
        return btn.innerText.trim().substring(0, 60);
      }
      return false;
    });

    if (clicked) {
      console.log(`  Clicked: "${clicked}"`);
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log("  No more choices to click.");
      break;
    }
  }
}

async function nextDay(page, userEmail) {
  // Navigate back to /play before advancing in case Storylets navigated away
  await page.goto(`${BASE_URL}/play`, { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 3000));

  const startDay = await getCurrentDay(page);
  console.log(`Advancing day (Current: Day ${startDay})...`);

  // Open Dev menu
  const devBtn = await page.locator('::-p-xpath(//button[contains(text(), "Dev menu")])').waitHandle({ timeout: 5000 }).catch(() => null);
  if (devBtn) {
    await devBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.warn("  Could not find Dev menu button!");
    return;
  }

  // Log what's in the Dev menu for debugging
  const devMenuContent = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.filter(b => b.innerText.includes('Next day')).map(b => ({
      text: b.innerText.trim(),
      parent: b.parentElement?.innerText?.substring(0, 100)
    }));
  });
  console.log(`  Found ${devMenuContent.length} 'Next day' button(s)`);

  // Click the "Next day" button
  const clicked = await page.evaluate((email) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const nextDayBtn = btns.find(b => b.innerText.trim().includes('Next day'));
    if (nextDayBtn) {
      nextDayBtn.click();
      return true;
    }
    return false;
  }, userEmail);

  if (!clicked) {
    console.warn("  Could not find Next day button!");
    return;
  }

  console.log("  Clicked Next day. Waiting for server response...");
  await new Promise(r => setTimeout(r, 15000));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 3000));
  const endDay = await getCurrentDay(page);
  console.log(`  Day changed from ${startDay} to ${endDay}`);
}

async function logResources(page, stage) {
  try {
    const resources = await page.evaluate(() => {
      const res = {};
      ["Knowledge", "Cash on Hand", "Social Leverage", "Physical Resilience", "Morale", "Energy", "Stress"].forEach(t => {
        const match = document.body.innerText.match(new RegExp(t + "[^\\d]*?(\\d+)", "i"));
        if (match) res[t] = match[1];
      });
      return res;
    });
    console.log(`  ${stage} Resources: ${JSON.stringify(resources)}`);
  } catch (e) { }
}

async function run() {
  console.log(`Starting 10-day E2E test on ${BASE_URL}`);
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: SLOWMO,
    executablePath: CHROME_PATH,
    args: ["--disable-web-security"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  page.setDefaultTimeout(30000);

  try {
    await page.goto(`${BASE_URL}/play`, { waitUntil: "networkidle2" });
    await maybeLogin(page);
    await page.goto(`${BASE_URL}/play`, { waitUntil: "networkidle2" });

    for (let day = 1; day <= 10; day++) {
      await page.waitForSelector('body');
      await new Promise(r => setTimeout(r, 3000));
      const uiDay = await getCurrentDay(page);
      console.log(`\n=== Loop ${day} (UI: Day ${uiDay}) ===`);
      await logResources(page, "Start");

      // Step 1: Posture
      console.log("Step 1: Selecting posture...");
      const postureClicked = await page.evaluate(() => {
        const target = Array.from(document.querySelectorAll('button')).find(b =>
          ["Steady", "Push", "Recover", "Connect"].includes(b.innerText.trim()));
        if (target) { target.click(); return target.innerText.trim(); }
        return false;
      });
      if (postureClicked) console.log(`  Selected: ${postureClicked}`);
      else console.log("  Posture not available (already set or different step).");
      await new Promise(r => setTimeout(r, 4000));

      // Step 2: Allocation
      console.log("Step 2: Time Allocation...");
      const hasAlloc = await page.evaluate(() => document.body.innerText.includes("Allocation") && document.body.innerText.includes("current:"));
      if (hasAlloc) {
        await fillInputs(page);
        const total = await page.evaluate(() => {
          const m = document.body.innerText.match(/current:\s*(\d+)/i);
          return m ? m[1] : "?";
        });
        console.log(`  Total: ${total}`);
        const saveBtn = await page.locator('::-p-xpath(//button[contains(text(), "Save")])').waitHandle({ timeout: 5000 }).catch(() => null);
        if (saveBtn) {
          await saveBtn.click();
          console.log("  Saved allocation.");
          await new Promise(r => setTimeout(r, 5000));
        }
      } else {
        console.log("  No allocation section (may be past this step).");
      }

      // Step 3: Storylets
      await completeStorylets(page);

      await logResources(page, "End");
      await page.screenshot({ path: `test_day_${day}.png`, fullPage: true });

      if (day < 10) {
        await nextDay(page, EMAIL);
      }
    }

    await page.screenshot({ path: "test_output.png", fullPage: true });
    console.log("\n=== 10-day E2E test complete! ===");
  } catch (err) {
    console.error("E2E failed:", err);
    await page.screenshot({ path: "test_error.png", fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run().catch((err) => { console.error("FATAL:", err); process.exit(1); });
