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
  console.log("HERO_HAS_LVL=" + bodyText.includes("LVL"));
  console.log("HERO_HAS_PROGRESS=" + bodyText.includes("до след."));
  console.log("HERO_HAS_KPI_LABEL=" + bodyText.includes("средний KPI"));
  console.log("AWARD_TILES=" + await page.locator(".awards-row .award-tile").count());
  console.log("STAR_MEDAL=" + await page.locator(".awards-row .star-medal").count());
  const glyphs = await page.locator(".awards-row .medal-glyph").allTextContents();
  console.log("MEDAL_GLYPHS=" + JSON.stringify(glyphs));
  const kpiEmoji = await page.locator(".metric-tile .ic").allTextContents();
  console.log("KPI_EMOJIS=" + JSON.stringify(kpiEmoji));
  console.log("STEPS=" + await page.locator(".step").count());
  console.log("ZONES=" + await page.locator(".step .zone").count());
  console.log("RES_EXT_LINKS=" + await page.locator("a.book[href^='http']").count());
  console.log("INTERNAL_LINKS=" + await page.locator("a[data-internal]").count());
  // справочник
  await page.locator("#glossary-toggle").click();
  await page.waitForTimeout(300);
  console.log("GLOSSARY_TILES=" + await page.locator(".glossary .award-tile").count());
  console.log("GLOSSARY_LOCKED=" + await page.locator(".glossary .award-tile.locked").count());
  const glossaryText = await page.locator(".glossary").textContent();
  console.log("GLOSSARY_HAS_LEADER=" + glossaryText.includes("Руководитель"));
  console.log("GLOSSARY_HAS_NIGHT=" + glossaryText.includes("Ночной страж"));
  console.log("GLOSSARY_HAS_HERO=" + glossaryText.includes("Герой-спасатель"));
  console.log("GLOSSARY_HAS_CHANGER=" + glossaryText.includes("Меняет мир"));
  console.log("GLOSSARY_HAS_SELLER=" + glossaryText.includes("Продавец месяца"));
  console.log("GLOSSARY_HAS_BUDGET=" + glossaryText.includes("Вне бюджета"));
  // бонус fallback (у Фролова деньги есть, проверим что секция рендерится)
  console.log("FROLOV_ERRORS=" + JSON.stringify(errors));

  // ===== профиль без KPI (Яковленков) =====
  errors.length = 0;
  await page.goto(base + "team/38bdf40f5090/index.html");
  await page.waitForTimeout(4000);
  const yakText = await page.locator("body").textContent();
  console.log("\nYAK title=" + await page.title());
  console.log("HAS_RANK_POSITION=" + /место\s*#/.test(yakText));
  console.log("HERO_HAS_LVL=" + yakText.includes("LVL"));
  console.log("AWARD_TILES=" + await page.locator(".awards-row .award-tile").count());
  console.log("YAK_ERRORS=" + JSON.stringify(errors));

  await browser.close();
  console.log("\nDONE");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
