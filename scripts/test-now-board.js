/* Проверка оперативной доски: контракт stApi (чью сессию берём) + наличие
 * таблицы команды в main.js. Скрипт локальный, без браузера и без сети.
 *
 * Запуск: node scripts/test-now-board.js
 * Код выхода 1 — есть проблема.
 *
 * Раньше файл извлекал из profile.js функцию initNowBoard(), которой там уже нет,
 * и падал с «A.api(...).then is not a function»: доска давно живёт в main.js.
 * Здесь проверяется то, что реально есть в коде.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const profileSource = fs.readFileSync("assets/js/profile.js", "utf8");
const mainSource = fs.readFileSync("assets/js/main.js", "utf8");
const extract = (start, end) => profileSource.slice(
  profileSource.indexOf(start),
  profileSource.indexOf(end, profileSource.indexOf(start)),
);

/* 1. stApi выбирает сессию: админ — для админских запросов, иначе своя.
   Заглушка api обязана возвращать Promise — иначе stApi().then падает
   (именно это и было причиной «A.api(...).then is not a function»). */
const apiContext = {
  window: { OTP_AUTH: { token: (slug) => (slug === "admin" ? "session" : null), api: (slug) => Promise.resolve(slug) } },
  ST_CLOUD: () => ({ url: "https://example.invalid" }),
  emp: { id: "bolgov" },
  String, Promise, Array, JSON,
  // зависимости stApi, которых нет в изоляции (очередь отправки, localStorage)
  renderStOutbox: () => {},
  localStorage: { setItem: () => {} },
};
vm.createContext(apiContext);
vm.runInContext(extract("  function stApi(", "  const stLocal ="), apiContext);

(async () => {
  assert.equal(await apiContext.stApi("otp_time_events"), "admin", "без своей сессии сотрудник идёт как admin");
  for (const employee of ["bolgov", "frolov"]) {
    apiContext.emp.id = employee;
    apiContext.window.OTP_AUTH.token = (slug) => (slug === employee ? "session" : null);
    assert.equal(await apiContext.stApi("otp_time_events"), employee, "своя сессия важнее");
  }

  /* 2. stIsoDate считает день по Москве (UTC+3). */
  const isoContext = vm.runInNewContext(
    extract("  const stIsoDate =", "  const ST_MISS_KEY") + '\nstIsoDate(new Date("2026-11-19T22:00:00Z"))',
    { Date, Intl, String },
  );
  assert.equal(isoContext, "2026-11-20", "22:00 UTC — уже следующий день в Москве");

  /* 3. Оперативная доска в main.js: таблица, фильтр, поиск, правая колонка. */
  const must = [
    ["таблица команды", /class="op-table"/],
    ["строки со ссылкой в профиль", /class="op-name"/],
    ["переход в «Стартовую»", /opLink\(x, "start\/"\)/],
    ["фильтр по статусу", /\.op-filters \.op-chip/],
    ["поиск сотрудника", /id="op-search"/],
    ["правая колонка", /async function renderHomeSide/],
    ["заявки к решению", /status=eq\.pending/],
    ["блок «В этом месяце»", /В этом месяце/],
  ];
  for (const [name, re] of must) {
    assert.ok(re.test(mainSource), "в main.js нет: " + name);
  }

  console.log("now board checks passed:", must.length, "признаков доски, stApi и stIsoDate");
})().catch((e) => { console.error(e); process.exit(1); });
