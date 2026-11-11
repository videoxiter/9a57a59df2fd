#!/usr/bin/env node
/* Штатная проверка всех страниц сайта: код ответа, JS-ошибки, отрисовка, reveal-блоки.
 *
 * Запуск (из корня репозитория):
 *   node scripts/verify.js                       # опубликованный сайт (GitHub Pages)
 *   node scripts/verify.js http://localhost:8080 # любой другой статический сервер
 *   node scripts/verify.js "" --shots .verify/shots   # скриншоты ключевых страниц
 *
 * Требуется playwright-core (или playwright) и установленный Chrome:
 *   npm i -D playwright-core
 * Путь к Chrome можно задать переменной CHROME_PATH.
 *
 * Проверяет: 200 у каждого адреса, ошибки консоли и pageerror, пустой #root на
 * персональных страницах, блоки [data-reveal], оставшиеся прозрачными после прокрутки.
 * Код выхода 1, если есть хоть одна проблема (кроме favicon.ico в корне).
 */
"use strict";
const fs = require("fs");
const path = require("path");

let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) {
  try { ({ chromium } = require("playwright-core")); }
  catch (e2) {
    console.error("Нужен playwright или playwright-core. Установи: npm i -D playwright-core");
    process.exit(2);
  }
}

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const BASE_IN = args.find((a) => !a.startsWith("--") && a !== "") || "https://videoxiter.github.io/9a57a59df2fd/";
const BASE = String(BASE_IN).replace(/\/?$/, "/");
const shotsArg = args.indexOf("--shots");
const SHOTS = shotsArg >= 0 ? path.resolve(args[shotsArg + 1] || ".verify/shots") : null;
const CONC = Number((args.find((a) => a.startsWith("--conc=")) || "").split("=")[1] || 5);
/* На локальном прогоне (file://) HTTP-статуса нет — код ответа не проверяем. */
const IS_FILE = /^file:\/\//i.test(BASE);

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ];
  return cands.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } }) || undefined;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --- список страниц берём из файловой системы: новые сотрудники попадут сами --- */
/* В URL всегда указываем index.html: HTTP-сервер и GitHub Pages отдают каталог сами,
   а file:// — нет (вместо страницы будет листинг каталога). */
function buildJobs() {
  const jobs = [{ url: "index.html", label: "корень (заглушка)", kind: "root" }];
  const dashDir = path.join(REPO, "1bceb335668c");
  if (fs.existsSync(dashDir)) {
    jobs.push({ url: "1bceb335668c/index.html", label: "дашборд/index", kind: "dash" });
    for (const ent of fs.readdirSync(dashDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      if (fs.existsSync(path.join(dashDir, ent.name, "index.html")))
        jobs.push({ url: `1bceb335668c/${ent.name}/index.html`, label: `дашборд/${ent.name}`, kind: "dash" });
    }
  }
  const teamDir = path.join(REPO, "team");
  if (fs.existsSync(teamDir)) {
    for (const slug of fs.readdirSync(teamDir).sort()) {
      const base = path.join(teamDir, slug);
      if (!fs.statSync(base).isDirectory()) continue;
      if (fs.existsSync(path.join(base, "index.html")))
        jobs.push({ url: `team/${slug}/index.html`, label: `team/${slug}/bonus`, kind: "team" });
      for (const sec of fs.readdirSync(base).sort()) {
        if (!fs.statSync(path.join(base, sec)).isDirectory()) continue;
        if (!fs.existsSync(path.join(base, sec, "index.html"))) continue;
        jobs.push({ url: `team/${slug}/${sec}/index.html`, label: `team/${slug}/${sec}`, kind: "team" });
      }
    }
  }
  return jobs;
}

const rows = [];
let done = 0;

async function worker(browser, queue, jobs) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  for (;;) {
    const item = queue.shift();
    if (!item) break;
    // Свежая вкладка на каждую страницу: переиспользование вкладки даёт ложные срабатывания
    // (переход по file:///быстрым страницам иногда не дожидался рендера).
    const page = await ctx.newPage();
    const errors = [];
    const notFound = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("response", (r) => { if (r.status() === 404) notFound.push(r.url()); });

    let status = null, note = "", probe = null;
    try {
      const resp = await page.goto(BASE + item.url, { waitUntil: "load", timeout: 45000 });
      status = resp ? resp.status() : null;
      await sleep(2000);
      const readProbe = () => page.evaluate(() => {
        const root = document.getElementById("root");
        return {
          title: document.title,
          rootLen: root ? root.textContent.trim().length : -1,
          reveals: document.querySelectorAll("[data-reveal]").length,
          canvases: document.querySelectorAll("canvas").length,
        };
      });
      probe = await readProbe();
      // контент рендерится из JS: если ещё пусто, даём второй шанс
      if (item.kind !== "root" && probe.rootLen < 50) {
        await sleep(2000);
        probe = await readProbe();
      }
      // прокрутка: reveal должен показать всё, что есть на странице
      await page.evaluate(async () => {
        const step = Math.round(innerHeight * 0.8);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80));
        }
        window.scrollTo(0, document.body.scrollHeight);
      });
      await sleep(1200);
      probe.hiddenAfterScroll = await page.evaluate(() => {
        const vis = (el) => { const c = getComputedStyle(el); return c.opacity !== "0" && c.visibility !== "hidden"; };
        return [...document.querySelectorAll("[data-reveal]")].filter((el) => !vis(el)).length;
      });
    } catch (e) {
      note += "FAIL " + e.message.split("\n")[0] + " ";
    }
    // favicon у заглушки корня — известная безобидная запись, её игнорируем.
    // Chrome пишет в консоль «Failed to load resource… 404 ()» без URL, поэтому
    // сопоставляем такие сообщения с фактическими 404-ответами страницы.
    const onlyFavicon404 = notFound.length > 0 && notFound.every((u) => /favicon\.ico$/i.test(u));
    const realErrors = errors.filter((e) => {
      if (item.kind === "root" && /favicon\.ico/.test(e)) return false;
      if (item.kind === "root" && onlyFavicon404 && /status of 404/.test(e)) return false;
      return true;
    });
    // На file:// SITE_ROOT даёт «file:///диск/», поэтому картинки наград не находятся —
    // это артефакт локального прогона, на HTTP/GitHub Pages они грузятся нормально.
    const fileArtifacts = IS_FILE ? realErrors.filter((e) => /ERR_FILE_NOT_FOUND/.test(e)) : [];
    const pageErrors = realErrors.filter((e) => !fileArtifacts.includes(e));
    if (probe && item.kind === "team" && probe.rootLen < 50) note += "пустой #root! ";
    if (probe && probe.hiddenAfterScroll > 0) note += `скрыто после прокрутки: ${probe.hiddenAfterScroll} `;

    const row = { ...item, status, ...(probe || {}), note: note.trim(), errors: pageErrors,
                  fileArtifacts: fileArtifacts.length };
    rows.push(row);
    const statusOk = IS_FILE ? status === 200 || status === null || status === 0 : status === 200;
    const rowOk = statusOk && !pageErrors.length && !note.trim();
    if (SHOTS && (item.kind === "dash")) {
      try {
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(400);
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: path.join(SHOTS, (item.url || "root").replace(/\//g, "_") + ".png") });
      } catch (e) { /* скриншот не критичен */ }
    }
    await page.close();
    done++;
    const mark = rowOk ? "ok  " : "FAIL";
    process.stdout.write(`\r[${done}/${jobs.length}] ${mark} ${item.label.padEnd(38)} ${status}\n`);
  }
  await ctx.close();
}

(async () => {
  const jobs = buildJobs();
  const exe = chromePath();
  const browser = await chromium.launch(exe ? { executablePath: exe, headless: true } : { headless: true });
  console.log(`Проверка: ${BASE}\nСтраниц: ${jobs.length}\n` + "-".repeat(72));
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: Math.max(1, CONC) }, () => worker(browser, queue, jobs)));
  await browser.close();

  const bad = rows.filter((r) => {
    const statusOk = IS_FILE ? r.status === 200 || r.status === null || r.status === 0 : r.status === 200;
    return !statusOk || r.errors.length || Boolean(r.note);
  });
  const byStatus = {};
  rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });

  console.log("\n" + "=".repeat(72));
  console.log("Всего:", rows.length, "| статусы:", JSON.stringify(byStatus));
  console.log("Пустой #root:", rows.filter((r) => r.kind === "team" && r.rootLen < 50).length);
  console.log("Скрытые reveal после прокрутки:", rows.filter((r) => (r.hiddenAfterScroll || 0) > 0).length);
  if (IS_FILE) {
    const arts = rows.reduce((s, r) => s + (r.fileArtifacts || 0), 0);
    console.log(`Артефактов file:// (SITE_ROOT-ресурсы, на Pages грузятся): ${arts}`);
  }
  console.log("Проблемных страниц:", bad.length);
  for (const b of bad) {
    console.log(`\n  ✗ ${b.label} [${b.status}]`);
    if (b.note) console.log("     " + b.note);
    b.errors.slice(0, 5).forEach((e) => console.log("     " + e));
  }
  console.log("=".repeat(72));
  console.log(bad.length ? "ЕСТЬ ПРОБЛЕМЫ" : "ВСЁ ЧИСТО");
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
