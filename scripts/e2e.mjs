/**
 * End-to-end smoke test of the real flow:
 * front takes an order -> back marks ready -> front hands over.
 *
 * Usage: pnpm e2e   (requires `pnpm dev` and the dev seed)
 */
import { chromium } from "playwright-core";

const BASE = process.env.E2E_URL ?? "http://localhost:3000";
const STALL_USER = process.env.E2E_USER ?? "takoyaki";
const STALL_PASS = process.env.E2E_PASS ?? "takoyaki123";

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});

let failures = 0;
const check = (label, condition) => {
  console.log(`${condition ? "ok  " : "FAIL"}  ${label}`);
  if (!condition) failures += 1;
};

async function device(mode, label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', STALL_USER);
  await page.fill('input[name="password"]', STALL_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/mode");

  await page.fill('input[name="label"]', label);
  await page.click(`button[name="mode"][value="${mode}"]`);
  await page.waitForURL(mode === "front" ? "**/counter" : "**/queue");

  return { context, page };
}

try {
  /* ---------------------------------------------------------------- front */
  const front = await device("front", "E2E Front");
  check("front lands on the counter", front.page.url().endsWith("/counter"));

  // Item with options: tapping opens the option panel.
  await front.page.getByRole("button", { name: /Takoyaki \(6\)/ }).click();
  await front.page.getByRole("button", { name: /Extra sauce/ }).click();
  await front.page.getByRole("button", { name: "Add to order" }).click();
  await front.page.getByRole("button", { name: /Takoyaki \(6\)/ }).click();
  await front.page.getByRole("button", { name: "Add to order" }).click();
  await front.page.getByRole("button", { name: /Lemonade/ }).click();

  await front.page.fill('input[placeholder="Name for calling out"]', "E2E Customer");
  await front.page.fill('input[placeholder="Note (no sauce, allergy…)"]', "no mayo");

  const placeButton = front.page.getByRole("button", { name: /Place order/ });
  const placeLabel = await placeButton.innerText();
  check(
    "total reflects the 20% sale (¥550 with sauce + ¥500 + ¥300 = ¥1,080)",
    placeLabel.includes("¥1,080"),
  );

  // Cash calculator: ¥1,100 for a ¥1,080 order leaves ¥20.
  const cashCalc = front.page.locator("#cash-calc");
  await cashCalc.getByRole("button", { name: "¥1,000" }).click();
  await cashCalc.getByRole("button", { name: "¥100" }).click();
  await cashCalc.getByRole("button", { name: "Calculate change" }).click();
  check(
    "cash calculator works out the change",
    (await cashCalc.innerText()).includes("¥20"),
  );

  await placeButton.click();
  await front.page.waitForSelector("text=Order placed", { timeout: 5000 });
  check("calculator collapses after the order", !(await cashCalc.isVisible()));

  await front.page.getByRole("button", { name: "Change calculator" }).click();
  check(
    "calculator state is cleared after the order",
    (await cashCalc.locator("[data-cash-received]").innerText()) === "¥0",
  );
  const numberText = await front.page.locator("text=/^#\\d+$/").first().innerText();
  const orderNumber = Number(numberText.replace("#", ""));
  check(`order placed with a number (${numberText})`, orderNumber > 0);

  // Extra items for the same customer become a linked add-on ticket.
  await front.page.getByRole("button", { name: /Lemonade/ }).click();
  await front.page
    .getByRole("button", { name: new RegExp(`Add to #${orderNumber}`) })
    .click();
  await front.page.waitForSelector("text=/Added to #/", { timeout: 5000 });
  check("add-on accepted on the same number", true);

  // Clear the confirmation so the only place the number can appear is the rail.
  await front.page.getByRole("button", { name: "Next order" }).click();

  /* ----------------------------------------------------------------- back */
  const back = await device("back", "E2E Back");
  check("back lands on the queue", back.page.url().endsWith("/queue"));

  const ticket = back.page.locator("li", { hasText: "#" + orderNumber }).first();
  await ticket.waitFor({ timeout: 8000 });
  check("back sees the ticket", await ticket.isVisible());
  check(
    "ticket carries the note",
    (await back.page.getByText("no mayo").count()) > 0,
  );
  check(
    "kitchen shows the ticket as part 1 of 2",
    (await ticket.innerText()).includes("1/2"),
  );
  check(
    "kitchen sees the second part as 2/2",
    (await back.page.getByText("2/2").count()) > 0,
  );

  await ticket.getByRole("button", { name: "Ready" }).click();
  const addonTicket = back.page
    .locator("li", { hasText: "#" + orderNumber })
    .filter({ hasText: "2/2" })
    .first();
  await addonTicket.getByRole("button", { name: "Ready" }).click();
  await back.page.waitForSelector("text=Waiting at the counter", { timeout: 5000 });
  await back.page.waitForTimeout(3500); // let the front's poll catch up

  /* --------------------------------------------------------------- pick up */
  const readyCard = front.page.locator("li", { hasText: "#" + orderNumber }).first();
  await readyCard.waitFor({ timeout: 8000 });
  check("front sees the order in the ready rail", await readyCard.isVisible());
  check(
    "parent rail card is marked 1/2",
    (await readyCard.innerText()).includes("1/2"),
  );

  const addonCard = front.page
    .locator("li", { hasText: "#" + orderNumber })
    .filter({ hasText: "2/2" })
    .first();
  check("front sees part 2/2 in the rail", await addonCard.isVisible());

  await readyCard.getByRole("button", { name: "Handed over" }).click();
  await addonCard.getByRole("button", { name: "Handed over" }).click();
  await front.page.waitForTimeout(1200);
  check(
    "finished order leaves the ready rail",
    (await front.page.getByText("#" + orderNumber).count()) === 0,
  );

  /* --------------------------------------------------------------- borders */
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  const status = (
    await anonPage.goto(`${BASE}/counter`)
  )?.status() ?? 0;
  check("anonymous visitor cannot open the counter", anonPage.url().includes("/login"));
  const api = await anonPage.request.get(`${BASE}/api/queue`);
  check("anonymous visitor cannot read the queue", api.status() === 401);
  void status;
} catch (error) {
  failures += 1;
  console.error("FAIL  unexpected error:", error.message);
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
