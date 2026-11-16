/* Набор демонстрационных клипов: действия на реальных страницах сайта. */
const { move, click, scroll, zoom, unzoom, type, wait } = require("./record-demo.js");

module.exports = {
  // ---------- Стартовая ----------
  "st-begin": { page: "start", steps: [zoom('[data-act="start"]', 1.6), click('[data-act="start"]'), unzoom, wait(600)] },
  "st-break1": { page: "start", steps: [click('[data-act="start"]'), wait(600), zoom('[data-act="slot-tech1"]', 1.6),
    click('[data-act="slot-tech1"]'), unzoom, wait(500)] },
  "st-break2": { page: "start", steps: [click('[data-act="start"]'), wait(600), zoom('[data-act="slot-tech2"]', 1.6),
    click('[data-act="slot-tech2"]'), unzoom, wait(500)] },
  "st-lunch": { page: "start", steps: [click('[data-act="start"]'), wait(600), zoom('[data-act="slot-lunch"]', 1.6),
    click('[data-act="slot-lunch"]'), unzoom, wait(600)] },
  "st-absence": { page: "start", steps: [click('[data-act="start"]'), wait(600), zoom('[data-act="absence"]', 1.7),
    click('[data-act="absence"]'), wait(900), unzoom, wait(500)] },
  "st-stop": { page: "start", steps: [click('[data-act="start"]'), wait(600), zoom('[data-act="stop"]', 1.6),
    click('[data-act="stop"]'), unzoom, wait(900)] },
  "st-status": { page: "start", steps: [scroll(200), zoom('[id="st-status"], #st-timer', 1.5), wait(900), unzoom] },
  "st-week": { page: "start", steps: [scroll(760), wait(900), scroll(400), wait(700)] },

  // ---------- График ----------
  "gr-shifts": { page: "graph", steps: [scroll(200), wait(800), zoom("table, .gp, [class*=graph]", 1.35), wait(900), unzoom] },
  "gr-scroll": { page: "graph", steps: [scroll(600), wait(900), scroll(1100), wait(900)] },

  // ---------- Статистика ----------
  "stc-metrics": { page: "stats", steps: [scroll(300), wait(800), zoom("[class*=metric], .sm-card", 1.5), wait(900), unzoom] },
  "stc-scroll": { page: "stats", steps: [scroll(700), wait(900), scroll(1200), wait(800)] },

  // ---------- LVL ----------
  "lvl-progress": { page: "lvl", steps: [scroll(200), zoom("[class*=lvl], .lv-bar", 1.5), wait(900), unzoom] },
  "lvl-stars": { page: "lvl", steps: [scroll(600), wait(900), scroll(1000), wait(800)] },

  // ---------- Награды ----------
  "aw-catalog": { page: "awards", steps: [scroll(250), wait(800), zoom("[class*=award], .aw-card", 1.45), wait(900), unzoom] },
  "aw-scroll": { page: "awards", steps: [scroll(700), wait(900), scroll(1200), wait(800)] },

  // ---------- Настройки ----------
  "set-profile": { page: "settings", steps: [scroll(200), wait(700), zoom("[class*=profile], #set-profile", 1.5), wait(900), unzoom] },
  "set-themes": { page: "settings", steps: [scroll(900), wait(700), zoom("#set-themes", 1.35), wait(1000),
    move('#set-themes .set-opt:nth-child(7)'), click('#set-themes .set-opt:nth-child(7)'), wait(1300), unzoom] },
  "set-theme2": { page: "settings", steps: [scroll(900), wait(700), click('#set-themes .set-opt:nth-child(5)'), wait(1300),
    click('#set-themes .set-opt:nth-child(9)'), wait(1300)] },

  // ---------- Журнал часов ----------
  "hj-journal": { page: "hours", steps: [scroll(250), wait(800), zoom("#st-from, .hj-f", 1.5), wait(900), unzoom] },


  // ---------- Ссылки ----------
  "ln-links": { page: "links", steps: [scroll(200), wait(800), zoom("a, [data-link]", 1.4), wait(900), unzoom] },

  // ---------- Правила ----------
  "rl-rules": { page: "rules", steps: [scroll(250), wait(800), zoom("[class*=rule], .rc", 1.4), wait(900), unzoom] },

  // ---------- Рост ----------
  "gr-growth": { page: "growth", steps: [scroll(250), wait(800), scroll(800), wait(800)] },
};
