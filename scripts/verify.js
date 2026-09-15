const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  const base = "file:///G:/LMStudio/otp-team/";

  // главная
  await page.goto(base + "index.html");
  await page.waitForTimeout(4000);
  console.log("HOME TITLE=" + await page.title());
  console.log("META_COUNT=" + (await page.locator("#meta-count").textContent()).trim());
  console.log("META_MONTH=" + (await page.locator("#meta-month").textContent()).trim());
  console.log("STAT_AVG=" + (await page.locator("#stat-avg").textContent()).trim());
  console.log("LB_ROWS=" + await page.locator(".lb-row").count());
  console.log("EMP_CARDS=" + await page.locator(".emp-card").count());
  console.log("RADAR_OPTIONS=" + await page.locator("#radar-select option").count());
  console.log("HOME_ERRORS=" + JSON.stringify(errors));

  // профиль с KPI (фролов)
  errors.length = 0;
  await page.goto(base + "team/frolov/index.html");
  await page.waitForTimeout(4000);
  console.log("\nFROLOV title=" + await page.title());
  console.log("H1=" + (await page.locator("h1").first().textContent()).trim());
  console.log("AWARDS=" + await page.locator(".award").count());
  console.log("TILES=" + await page.locator(".metric-tile").count());
  console.log("STEPS=" + await page.locator(".step").count());
  console.log("FACTS=" + await page.locator(".fact-line").count());
  console.log("CANVASES=" + await page.locator("canvas").count());
  console.log("FROLOV_ERRORS=" + JSON.stringify(errors));

  // профиль БЕЗ KPI (яковленков)
  errors.length = 0;
  await page.goto(base + "team/yakovlenkov/index.html");
  await page.waitForTimeout(4000);
  console.log("\nYAK title=" + await page.title());
  console.log("H1=" + (await page.locator("h1").first().textContent()).trim());
  console.log("AWARDS=" + await page.locator(".award").count());
  console.log("TILES=" + await page.locator(".metric-tile").count());
  console.log("CANVASES=" + await page.locator("canvas").count());
  console.log("STEPS=" + await page.locator(".step").count());
  console.log("YAK_ERRORS=" + JSON.stringify(errors));

  await browser.close();
  console.log("\nDONE");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
