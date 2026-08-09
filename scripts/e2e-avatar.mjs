import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

try {
  await page.goto("http://localhost:3010/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.getByRole("button", { name: /Get Started/i }).click();
  await page.waitForTimeout(400);

  await page
    .getByRole("button", { name: /Solo Practice/i })
    .first()
    .click();
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await page.waitForTimeout(800);

  const radios = page.getByRole("radio");
  const n = await radios.count();
  console.log("avatar_radios", n);
  if (n < 1) {
    console.log("FAIL no radios");
    console.log((await page.locator("body").innerText()).slice(0, 800));
    await page.screenshot({ path: "tmp-avatar-fail.png", fullPage: true });
    process.exitCode = 1;
  } else {

    await radios.nth(1).click();
    await page.waitForTimeout(300);
    const checkedLabel = await page
      .locator('[role=radio][aria-checked="true"]')
      .getAttribute("aria-label");
    console.log("selected", checkedLabel);
    const profile = await page.evaluate(() =>
      localStorage.getItem("retailer-challenge-player-profile"),
    );
    console.log("profile", profile);

    await radios.nth(n - 1).click();
    await page.waitForTimeout(300);
    const checked2 = await page
      .locator('[role=radio][aria-checked="true"]')
      .getAttribute("aria-label");
    console.log("selected2", checked2);
    const profile2 = await page.evaluate(() =>
      localStorage.getItem("retailer-challenge-player-profile"),
    );
    console.log("profile2", profile2);

    await page.getByLabel(/Display name/i).fill("Ava");
    await page.waitForTimeout(200);
    const canStart = await page
      .getByRole("button", { name: /Start practice/i })
      .isEnabled();
    console.log("start_enabled", canStart);

    await page.screenshot({ path: "tmp-avatar-select.png", fullPage: true });
    console.log("console_errors", errors.length ? errors : "none");

    const ok =
      !!checked2 &&
      !!profile2 &&
      profile2.includes("the-steward") &&
      canStart === true;
    console.log(ok ? "PASS avatar select" : "FAIL avatar select");
    process.exitCode = ok ? 0 : 1;
  }
} finally {
  await browser.close();
}
