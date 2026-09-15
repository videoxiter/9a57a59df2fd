const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  const base = "file:///G:/LMStudio/otp-team/";

  // ===== главный дашборд =====
  await page.goto(base + "1bceb335668c/index.html");
  await page.waitForTimeout(4000);
  console.log("HOME title=" + await page.title());
  console.log("LB_ROWS=" + await page.locator(".lb-row").count());
  console.log("EMP_CARDS=" + await page.locator(".emp-card").count());
  console.log("HOME_ERRORS=" + JSON.stringify(errors));

  // ===== профиль с KPI (Фролов) =====
  errors.length = 0;
  await page.goto(base + "team/5414335d1bd0/index.html");
  await page.waitForTimeout(4000);
  const bodyText = await page.locator("body").textContent();
  console.log("\nFROLOV title=" + await page.title());
  console.log("HAS_RANK_POSITION=" + /место\s*#/.test(bodyText));
  console.log("MONTH_AWARDS=" + await page.locator("#month-awards .award-tile").count());
  console.log("ACCUM_AWARDS_ROWS=" + await page.locator(".awards-row").count());
  console.log("STRENGTHS=" + await page.locator("#strengths-list .plus-item").count());
  console.log("GROWTH=" + await page.locator("#growth-list .minus-item").count());
  console.log("GROWTH_HAS_ADVICE=" + await page.locator("#growth-list .advice").count());
  console.log("STEPS=" + await page.locator(".step").count());
  console.log("ZONES=" + await page.locator(".step .zone").count());
  await page.locator("#glossary-toggle").click();
  await page.waitForTimeout(300);
  console.log("GLOSSARY_TILES=" + await page.locator(".glossary .award-tile").count());
  console.log("FROLOV_ERRORS=" + JSON.stringify(errors));

  // ===== профиль без KPI (Яковленков) =====
  errors.length = 0;
  await page.goto(base + "team/38bdf40f5090/index.html");
  await page.waitForTimeout(4000);
  const yakText = await page.locator("body").textContent();
  console.log("\nYAK title=" + await page.title());
  console.log("HAS_RANK_POSITION=" + /место\s*#/.test(yakText));
  console.log("STRENGTHS=" + await page.locator("#strengths-list .plus-item").count());
  console.log("GROWTH=" + await page.locator("#growth-list .minus-item").count());
  console.log("YAK_ERRORS=" + JSON.stringify(errors));

  await browser.close();
  console.log("\nDONE");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
