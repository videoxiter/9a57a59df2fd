/* Штатная проверка всех страниц: дашборд + 2 персональные + скролл к бонусам.
   Запуск из временной папки с playwright:
     cd "$LOCALAPPDATA/Temp/otp-verify" && NODE_PATH="$(pwd)/node_modules" node /g/LMStudio/otp-team/scripts/verify.js */
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
  console.log("EMP_CARDS=" + await page.locator(".emp-card").count());
  console.log("HOME_ERRORS=" + JSON.stringify(errors));

  // ===== профиль с KPI (Фролов) =====
  errors.length = 0;
  await page.goto(base + "team/5414335d1bd0/index.html");
  await page.waitForTimeout(3500);
  const bodyText = await page.locator("body").textContent();
  console.log("\nFROLOV title=" + await page.title());
  console.log("PLAN_HEAD_NO_MONTH=" + await page.locator(".sub-head", { hasText: "План роста" }).first().textContent().then((t) => t.trim()));
  console.log("HAS_RANK_POSITION=" + /место\s*#/.test(bodyText));
  console.log("MONTH_AWARDS=" + await page.locator("#month-awards .award-tile").count());
  console.log("STRENGTHS=" + await page.locator("#strengths-list .plus-item").count());
  console.log("GROWTH=" + await page.locator("#growth-list .minus-item").count());
  console.log("STEPS=" + await page.locator(".step").count());
  console.log("LEADERBOARD_ROWS=" + await page.locator(".lb-row").count());
  console.log("LEADERBOARD_ME=" + await page.locator(".lb-row.is-me").count());
  console.log("LEADERBOARD_HINT=" + (await page.locator(".lb-hint").first().textContent()).trim());
  console.log("LINKS_TO_OTHERS=" + await page.locator('a[href*="team/"], a[href*="1bceb335668c"]').count());
  console.log("FROLOV_ERRORS=" + JSON.stringify(errors));

  // ===== профиль без KPI (Яковленков) — командные графики =====
  errors.length = 0;
  await page.goto(base + "team/38bdf40f5090/index.html");
  await page.waitForTimeout(3500);
  console.log("\nYAK title=" + await page.title());
  console.log("TEAM_TILES=" + await page.locator("#metric-grid .team-tile").count());
  console.log("CARD_HEADS=" + JSON.stringify(await page.locator(".card h3").allTextContents()));
  console.log("TEAM_AVG=" + (await page.locator(".lb-hint").first().textContent()).trim());
  console.log("STRENGTHS=" + await page.locator("#strengths-list .plus-item").count());
  console.log("GROWTH=" + await page.locator("#growth-list .minus-item").count());
  console.log("STEPS=" + await page.locator(".step").count());
  console.log("LEADERBOARD_ROWS=" + await page.locator(".lb-row").count());
  console.log("YAK_ERRORS=" + JSON.stringify(errors));

  // ===== клик по столбцу бонусов → переход к «Достижения и бонусы» (Завьялов) =====
  errors.length = 0;
  await page.goto(base + "team/a9cb0e50ea70/index.html");
  await page.waitForTimeout(3500);
  const canvas = page.locator("#chart-bonus");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.9);
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => {
    const sec = document.getElementById("bonus-section");
    const r = sec.getBoundingClientRect();
    return {
      month: (document.querySelector(".month-tab.active") || {}).textContent,
      head: sec.textContent.trim(),
      inViewport: r.top >= -10 && r.top <= 220,
      scrollY: Math.round(window.scrollY),
    };
  });
  console.log("\nZAVYALOV после клика: месяц=" + state.month + " | " + state.head);
  console.log("BONUS_SECTION_IN_VIEWPORT=" + state.inViewport);
  console.log("SCROLL_MOVED=" + (Math.abs(state.scrollY - before) > 100));
  console.log("ZAVYALOV_ERRORS=" + JSON.stringify(errors));

  await browser.close();
  console.log("\nDONE");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
