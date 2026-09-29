/* Логика персональных страниц: разделы «Бонусы / Мой LVL / Награды / Мой рост / Статистика / Правила» */
(function () {
  "use strict";
  const D = window.OTP_EMP;
  const SECTION = window.OTP_SECTION || "bonus";
  const root = document.getElementById("root");
  const emp = D && D.employee;
  if (!emp) { root.innerHTML = '<p class="muted" style="padding:60px 0">Страница недоступна.</p>'; return; }

  const MKEYS = otp.MKEYS;
  const history = emp.history || [];
  const hasKpi = !!emp.current;
  const monthHasData = (h) => MKEYS.every((k) => h[k] != null) || h.bonus != null;
  const filledMonths = history.map((h, i) => (monthHasData(h) ? i : -1)).filter((i) => i >= 0);
  let selected = filledMonths.length ? filledMonths[filledMonths.length - 1] : Math.max(0, history.length - 1);

  const SECTION_TITLES = { bonus: "Бонусы", lvl: "Мой LVL", awards: "Награды", growth: "Мой рост", stats: "Статистика", rules: "Правила" };
  document.title = `Мои результаты · ${SECTION_TITLES[SECTION] || ""} · ${emp.shortName}`;

  /* ---------- общие данные ---------- */
  const RULES = D.rules || {};
  const RULE_LEVELS = RULES.levels || [];
  const LVL_STEP = RULES.lvlStep || 10;
  const HOLD = RULES.hold || 9;
  const DROP = RULES.drop || 1;
  const GAIN_CAP = RULES.gainCap || 4;
  const LOSS_CAP = RULES.lossCap || 3;
  const lvl = emp.lvl || 1;
  const inLvl = emp.stars_in_level || 0;
  const delta = emp.stars_delta || 0;
  const lvlInfo = (n) => RULE_LEVELS.find((x) => x.lvl === n) || null;
  const lvlNow = lvlInfo(lvl);
  const lvlNext = lvlInfo(lvl + 1);
  const starsNeed = Math.max(0, LVL_STEP - inLvl);
  const starLog = emp.starLog || [];
  const awardsCatalog = D.awardsCatalog || [];
  const empAwards = emp.awards || [];
  const earnedIds = new Set(empAwards.map((a) => a.id));
  const totalAwardsCount = empAwards.reduce((s, a) => s + (a.count || 1), 0);

  const team = D.team || {};
  const teamProfileByMonth = team.profileByMonth || {};
  const teamAvgByMonth = team.avgByMonth || {};
  const teamMembers = team.memberCount || 0;
  const teamProfileOf = (key) => teamProfileByMonth[key] || null;
  const teamAvgOf = (key) => (teamAvgByMonth[key] != null ? teamAvgByMonth[key] : null);
  const leaderboardRows = D.leaderboard || [];
  const showBoard = emp.id === "yakovlenkov";

  const trend = otp.trend(emp);
  const trendIcon = trend.dir === "up" ? "trend-up" : trend.dir === "down" ? "trend-down" : "minus";

  function plural(n) { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return "очков"; if (b > 1 && b < 5) return "очка"; if (b === 1) return "очко"; return "очков"; }
  function plStars(n) { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return "звёзд"; if (b > 1 && b < 5) return "звезды"; if (b === 1) return "звезда"; return "звёзд"; }
  function plMonths(n) { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return "месяцев"; if (b > 1 && b < 5) return "месяца"; if (b === 1) return "месяц"; return "месяцев"; }
  function tickets(text) { return (text || "").match(/HELP-\d+/g) || []; }
  function tLinks(text) { return tickets(text).map((t) => `<a href="https://jira.centrofinans.ru/browse/${t}" target="_blank" rel="noopener">${t}</a>`).join(" "); }

  const awardTile = (a, extra = "", ttl = "") =>
    `<div class="award-tile${a.id === "perfect" ? " star-medal" : ""}"${ttl ? ` title="${ttl}"` : ""}><span class="medal" style="--ac:${a.color}"><span class="medal-glyph">${a.glyph || ""}</span></span><div class="a-t">${a.title}${extra}</div><div class="a-r">${a.desc}</div></div>`;

  const metricLabel = (k) => (D.metrics[k] || {}).label || k;
  const metricColor = (k) => (D.metrics[k] || {}).color || "#22d3ee";
  const metricEmoji = (k) => (D.metrics[k] || {}).emoji || "";
  const avgOf = (h) => (h && MKEYS.every((k) => h[k] != null) ? Math.round((MKEYS.reduce((s, k) => s + h[k], 0) / 5) * 100) / 100 : null);

  /* ---------- шапка (компактная, одинаковая на всех разделах) ---------- */
  function heroHtml() {
    const deltaBadge = delta > 0
      ? `<span class="badge badge-good"><i class="ph-fill ph-star"></i> +${delta} ⭐ за месяц</span>`
      : delta < 0
        ? `<span class="badge badge-left"><i class="ph ph-star"></i> −${Math.abs(delta)} ⭐ за месяц</span>`
        : "";
    const statusBadge = emp.status === "left"
      ? `<span class="badge badge-left"><i class="ph ph-archive"></i> ${emp.statusNote || "выбыл"}</span>`
      : '<span class="badge badge-good"><i class="ph ph-check"></i> в команде</span>';
    return `
    <section class="p-hero" data-reveal>
      <span class="avatar-xl">${otp.initials(emp.fullName)}</span>
      <div class="p-hero-main">
        <span class="kicker">${emp.siteTitle}</span>
        <h1 class="p-hero-name">${emp.fullName}</h1>
        <div class="muted" style="font-size:.9rem">${emp.role} · <span class="p-sec-now">${SECTION_TITLES[SECTION] || ""}</span></div>
        <div class="p-hero-badges">
          ${statusBadge}${deltaBadge}
          ${hasKpi ? `<span class="badge"><i class="ph ph-${trendIcon}"></i> тренд ${trend.delta > 0 ? "+" + trend.delta : trend.delta} за период</span>` : ""}
        </div>
      </div>
      <a class="p-lvl-chip" href="${navHref("lvl")}" title="Перейти к уровням и звёздам">
        <span class="p-lvl-n">LVL ${lvl}</span>
        <span class="p-lvl-t">${lvlNow ? lvlNow.title : ""}</span>
        <span class="p-lvl-s">⭐ ${emp.stars || 0} всего · ${inLvl}/${LVL_STEP} до след.</span>
      </a>
    </section>`;
  }

  /* ---------- переходы по разделам (нижние «робо-кнопки») ---------- */
  const SECTION_DEFS = [
    { key: "bonus", label: "Бонусы", icon: "ph-wallet", note: "KPI и денежная часть" },
    { key: "lvl", label: "Мой LVL", icon: "ph-medal", note: "уровень и звёзды" },
    { key: "awards", label: "Награды", icon: "ph-trophy", note: "полученные и справочник" },
    { key: "growth", label: "Мой рост", icon: "ph-rocket-launch", note: "план развития" },
    { key: "stats", label: "Статистика", icon: "ph-chart-line", note: "динамика и детализация" },
    { key: "rules", label: "Правила", icon: "ph-book-open", note: "как всё устроено" },
  ];
  const NAV = window.OTP_NAV || {};
  const navHref = (key) => NAV[key] || (key === "bonus" ? "./" : key + "/");

  function robotMenuHtml() {
    return `<div class="robot-menu" data-reveal>
      <div class="robot-menu-title"><i class="ph-bold ph-robot"></i> Разделы</div>
      <div class="robot-grid">
        ${SECTION_DEFS.map((s) => `<a class="rb-btn${s.key === SECTION ? " is-now" : ""}" href="${navHref(s.key)}" title="${s.label} · ${s.note}">
            <span class="rb-corner tl"></span><span class="rb-corner tr"></span><span class="rb-corner bl"></span><span class="rb-corner br"></span>
            <span class="rb-ic"><i class="ph-bold ${s.icon}"></i></span>
            <span class="rb-tx"><b>${s.label}</b><i>${s.key === SECTION ? "вы здесь" : s.note}</i></span>
            <span class="rb-scan"></span>
          </a>`).join("")}
      </div>
      <div class="robot-menu-foot">
        <a class="btn btn-ghost" href="${navHref("bonus")}"><i class="ph ph-house"></i> На главную</a>
        <button class="btn btn-ghost" type="button" onclick="if(history.length>1){history.back()}else{location.href='${navHref("bonus")}'}"><i class="ph ph-arrow-left"></i> Назад</button>
      </div>
    </div>`;
  }

  /* ---------- табы месяцев ---------- */
  function monthTabsHtml() {
    return `<div class="month-tabs" id="month-tabs" data-reveal>${history.map((h, i) => `<button class="month-tab${monthHasData(h) ? "" : " empty"}" data-i="${i}"${monthHasData(h) ? "" : ' title="За этот месяц данных пока нет"'}>${h.month}</button>`).join("")}</div>`;
  }
  /** выбирает месяц по клику на график/таблицу (для страницы «Статистика») */
  function monthAt(key) { return history.findIndex((h) => h.key === key); }

  /* ================= РАЗДЕЛ: БОНУСЫ ================= */
  function sectionBonus() {
    const cur = history[selected] || {};
    const money = cur.money || [];
    const bonus = cur.bonus;
    const strengths = cur.strengths || [];
    const growth = cur.growth || [];
    const mentor = cur.mentor || [];
    const planTxt = cur.planTxt || null;
    const planSteps = planTxt && planTxt.steps ? planTxt.steps : [];
    const recs = cur.recommendations || [];
    const whenTxt = planTxt && planTxt.title ? String(planTxt.title).replace(/^Твой план на\s*/i, "").trim() : "";

    const starsOfMonth = (starLog.find((r) => r.key === cur.key) || {}).stars || 0;
    const awardsOfMonth = cur.awards || [];

    return `
    <section class="p-sec p-sec-top" data-reveal>
      <div class="p-sec-head inline">
        <h2><i class="ph-bold ph-wallet"></i> Бонусы</h2>
        ${monthTabsHtml()}
      </div>
      <div class="bonus-cols">
        <div class="card kpi-card" data-reveal>
          <div class="sub-head" style="margin-top:0"><i class="ph ph-chart-polar"></i> KPI за <span class="month-label">…</span></div>
          <div class="metric-grid compact" id="metric-grid" data-stagger></div>
        </div>
        <div class="card money-card" data-reveal>
          <div class="money-star">
            <span class="ms-star"></span>
            <span class="ms-in">
              <span class="ms-cap">Бонусная часть за <span class="month-label">…</span></span>
              <span class="ms-sum" id="bonus-total-big">—</span>
              <span class="ms-sub" id="bonus-total-sub"></span>
            </span>
          </div>
          <div class="bonus-side">
            <div class="bs-item"><span class="bs-k">Звёзды за месяц</span><span class="bs-v">${starsOfMonth > 0 ? "+" + starsOfMonth : starsOfMonth} ⭐</span></div>
            <div class="bs-item"><span class="bs-k">Награды за месяц</span><span class="bs-v">${awardsOfMonth.length}</span></div>
            <div class="bs-item"><span class="bs-k">Средний KPI</span><span class="bs-v" id="month-avg">—</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="p-sec">
      <div class="sub-head" data-reveal><i class="ph ph-scales"></i> Сильные стороны и зоны роста за <span class="month-label">…</span></div>
      <div class="two-col">
        <div class="card" data-reveal><h3 style="margin-bottom:12px"><span style="color:var(--good)">✅</span> Что получается круто</h3><div id="strengths-list"></div></div>
        <div class="card" data-reveal><h3 style="margin-bottom:12px"><span style="color:var(--warn)">⚠️</span> Зоны роста</h3><div id="growth-list"></div></div>
      </div>
    </section>

    <section class="p-sec" id="mentor-wrap" style="display:none">
      <div class="sub-head" data-reveal><i class="ph ph-chats"></i> Напутствие руководителя · <span class="month-label">…</span></div>
      <div class="mentor-card" id="mentor-card" data-reveal></div>
    </section>

    <section class="p-sec" id="bonus-section">
      <div class="sub-head" data-reveal><i class="ph ph-receipt"></i> Из чего сложилась сумма за <span class="month-label">…</span></div>
      <div id="bonus-items" class="bonus-items" data-stagger></div>
    </section>

    <section class="p-sec">
      <div class="sub-head" data-reveal><i class="ph ph-target"></i> План роста<span class="plan-when" id="plan-when"></span></div>
      <p class="tt-hint" id="plan-legend" style="margin:-6px 0 14px">шаги из итогов месяца · «Твой результат» — что должно получиться на выходе</p>
      <div class="grid" id="plan-grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))"></div>
    </section>

    ${robotMenuHtml()}`;
  }

  /* ================= РАЗДЕЛ: МОЙ LVL ================= */
  function sectionLvl() {
    const starsBar = Array.from({ length: LVL_STEP }, (_, i) => `<span class="sb${i < inLvl ? " on" : ""}">${i < inLvl ? "★" : "☆"}</span>`).join("");
    const totalStars = emp.stars || 0;
    const gains = starLog.reduce((s, r) => s + Math.max(0, r.stars || 0), 0);
    const losses = starLog.reduce((s, r) => s + Math.min(0, r.stars || 0), 0);
    const kinds = [
      { id: "рост KPI", re: /вырос/ },
      { id: "удержание " + HOLD.toFixed(1), re: /удержан/ },
      { id: "новые награды", re: /Новая награда/ },
      { id: "каждые 10 наград", re: /накопилось/ },
      { id: "решение руководителя", re: /руководител/ },
    ];
    const allReasons = starLog.flatMap((r) => r.reasons || []);
    const byKind = kinds.map((k) => ({ id: k.id, n: allReasons.filter((x) => k.re.test(x)).length }));

    const journal = starLog.length
      ? starLog.map((r) => {
          const ch = r.stars || 0;
          const sign = r.kind === "start" ? "старт" : ch > 0 ? `+${ch} ⭐` : ch < 0 ? `−${Math.abs(ch)} ⭐` : "0 ⭐";
          const cls = r.kind === "start" ? "start" : ch > 0 ? "gain" : ch < 0 ? "loss" : "hold";
          const items = (r.reasons && r.reasons.length ? r.reasons : [r.reason]).map((x) => `<li>${x}</li>`).join("");
          const notes = (r.notes || []).map((x) => `<li class="sl-note">${x}</li>`).join("");
          return `<div class="sl-row ${cls}">
            <span class="sl-m">${r.month}</span>
            <span class="sl-k">${sign}</span>
            <div class="sl-r"><ul class="sl-list">${items}${notes}</ul></div>
            <span class="sl-t">${r.total} ⭐</span>
          </div>`;
        }).join("")
      : '<p class="muted">Журнал появится после второго месяца с KPI.</p>';

    return `
    <section class="p-sec" data-reveal>
      <div class="p-sec-head"><h2><i class="ph-bold ph-medal"></i> Мой LVL</h2><span class="p-sec-hint">звёзды копятся за рост, награды и особые заслуги</span></div>
      <div class="lvl-hero card" data-reveal>
        <div class="lh-left">
          <div class="lh-lvl">LVL ${lvl}</div>
          <div class="lh-name">${lvlNow ? lvlNow.title : ""}</div>
          <div class="stars-bar lg">${starsBar}</div>
          <div class="lvl-progress"><span style="width:${(inLvl / LVL_STEP) * 100}%"></span></div>
          <div class="lh-next">${lvlNext ? `До <b>LVL ${lvlNext.lvl} «${lvlNext.title}»</b> — <b>${starsNeed} ${plStars(starsNeed)}</b>` : "Максимальный уровень достигнут 🏆"}</div>
        </div>
        <div class="lh-right">
          <div class="lh-stat"><span class="lh-k">Всего звёзд</span><span class="lh-v">${totalStars}</span></div>
          <div class="lh-stat"><span class="lh-k">Начислено за период</span><span class="lh-v good">+${gains}</span></div>
          <div class="lh-stat"><span class="lh-k">Снято за период</span><span class="lh-v bad">${losses} ⭐</span></div>
          <div class="lh-stat"><span class="lh-k">Последний месяц</span><span class="lh-v">${delta > 0 ? "+" + delta : delta} ⭐</span></div>
        </div>
      </div>
    </section>

    <section class="p-sec">
      <div class="two-col">
        <div class="card" data-reveal>
          <h3 style="margin-bottom:10px"><i class="ph ph-gift"></i> Что даёт твой LVL ${lvl}${lvlNow ? " «" + lvlNow.title + "»" : ""}</h3>
          <ul class="perk-list">${(lvlNow ? lvlNow.perks : []).map((x) => `<li>${x}</li>`).join("") || "<li>Уровень только начинает действовать — выполняй план месяца.</li>"}</ul>
          ${lvlNext ? `<div class="next-unlock"><span class="nu-h">На LVL ${lvlNext.lvl} «${lvlNext.title}» откроется</span><ul class="perk-list next">${lvlNext.perks.map((x) => `<li>${x}</li>`).join("")}</ul></div>` : ""}
        </div>
        <div class="card" data-reveal>
          <h3 style="margin-bottom:10px"><i class="ph ph-chart-line-up"></i> За что набраны звёзды</h3>
          <div class="kind-stats">${byKind.map((k) => `<div class="ks-row"><span class="ks-k">${k.id}</span><span class="ks-bar"><span style="width:${gains ? Math.min(100, (k.n / Math.max(1, gains)) * 100) : 0}%"></span></span><span class="ks-v">${k.n}</span></div>`).join("")}</div>
          <div class="chart-box" style="height:180px;margin-top:18px"><canvas id="chart-stars"></canvas></div>
          <p class="tt-hint" style="margin:10px 0 0">накопление звёзд по месяцам</p>
        </div>
      </div>
    </section>

    <section class="p-sec">
      <div class="sub-head" data-reveal><i class="ph ph-clock-counter-clockwise"></i> Журнал звёзд: за что приходили и уходили</div>
      <div class="star-log">${journal}</div>
    </section>

    <section class="p-sec">
      <details class="rules-card">
        <summary><i class="ph ph-game-controller"></i> Напомнить правила начисления звёзд</summary>
        <div class="rules-body"><div class="rules-grid">${(RULES.stars || []).map((s) => `<div class="rule-tile"><span class="rule-ic">${s.icon}</span><div><div class="rule-t">${s.title}</div><div class="rule-d">${s.text}</div></div></div>`).join("")}</div></div>
      </details>
    </section>

    ${robotMenuHtml()}`;
  }

  /* ================= РАЗДЕЛ: НАГРАДЫ ================= */
  function sectionAwards() {
    const cur = history[selected] || {};
    const mAwards = cur.awards || [];
    const glyphs = empAwards.map((a) => a.glyph || "").join(" ");
    const book = awardsCatalog.map((g) => {
      const got = empAwards.find((a) => a.id === g.id);
      return `<div class="award-tile book${got ? " earned" : " locked"}${g.id === "perfect" ? " star-medal" : ""}">
        <span class="medal" style="--ac:${got ? g.color : "#3a4250"}"><span class="medal-glyph">${g.glyph || ""}</span></span>
        <div class="a-t">${g.title}${got ? ` <span class="got">· ×${got.count}</span>` : ""}</div>
        <div class="a-r">${g.desc}</div>
        ${g.motiv ? `<div class="a-m">💪 ${g.motiv}</div>` : ""}
        <div class="a-when">${got ? "Получена: " + (got.months || []).join(", ") : "Ещё не получена"}</div>
      </div>`;
    }).join("");

    return `
    <section class="p-sec" data-reveal>
      <div class="awards-counter" data-reveal>
        <div class="ac-left">
          <div class="ac-num">${totalAwardsCount}</div>
          <div class="ac-cap">наград за всё время</div>
          <div class="ac-uniq">уникальных: <b>${empAwards.length}</b> из ${awardsCatalog.length}</div>
        </div>
        <div class="ac-glyphs">${glyphs || '<span class="muted">пока пусто — всё впереди</span>'}</div>
      </div>
    </section>

    <section class="p-sec">
      <div class="p-sec-head"><h2><i class="ph-bold ph-trophy"></i> Награды</h2><span class="p-sec-hint">месяц: <b class="month-label">…</b></span></div>
      ${monthTabsHtml()}
      <div class="sub-head" data-reveal><i class="ph ph-medal"></i> Награды за <span class="month-label">…</span></div>
      <div class="awards-row" id="month-awards" data-stagger></div>
      <div class="sub-head" data-reveal style="margin-top:26px"><i class="ph ph-stack"></i> Накоплено за всё время</div>
      <div class="awards-row" data-stagger>${empAwards.map((a) => awardTile(a, a.count > 1 ? ` <span class="got">×${a.count}</span>` : "", (a.months || []).join(", "))).join("") || '<p class="muted">Наград пока нет.</p>'}</div>
    </section>

    <section class="p-sec">
      <div class="sub-head" data-reveal><i class="ph ph-book-bookmark"></i> Справочник наград: что нужно сделать</div>
      <p class="tt-hint" style="margin:-6px 0 14px">условие получения, мотивация и месяц, когда награда уже была получена</p>
      <div class="awards-book">${book}</div>
    </section>

    ${robotMenuHtml()}`;
  }

  /* ================= РАЗДЕЛ: МОЙ РОСТ ================= */
  function sectionGrowth() {
    return `
    <section class="p-sec" data-reveal>
      <div class="p-sec-head"><h2><i class="ph-bold ph-rocket-launch"></i> Мой рост</h2></div>
      <div class="dev-card" data-reveal>
        <div class="dev-glow"></div>
        <div class="dev-ic"><i class="ph-bold ph-rocket-launch"></i></div>
        <div class="dev-big">В разработке</div>
        <p class="dev-sub">Здесь появится твой план развития: трек роста по метрикам, цели на квартал, ИПР и чек-листы для перехода на следующий уровень.</p>
        <div class="dev-steps">
          <div class="dev-step"><span>01</span> Индивидуальный план развития по зонам роста</div>
          <div class="dev-step"><span>02</span> Цели на квартал и прогресс по ним</div>
          <div class="dev-step"><span>03</span> Рекомендации наставника и чек-лист следующего уровня</div>
        </div>
      </div>
    </section>
    ${robotMenuHtml()}`;
  }

  /* ================= РАЗДЕЛ: СТАТИСТИКА ================= */
  function sectionStats() {
    const withKpi = history.filter((h) => avgOf(h) != null);
    const lastAvg = emp.avg;
    const best = withKpi.slice().sort((a, b) => avgOf(b) - avgOf(a))[0];
    const bonusSum = history.reduce((s, h) => s + (h.bonus || 0), 0);
    const rows = history.map((h, i) => {
      const a = avgOf(h);
      const st = (starLog.find((r) => r.key === h.key) || {}).stars;
      return `<tr data-i="${i}" class="st-row${i === selected ? " is-now" : ""}">
        <td class="st-m">${h.month}</td>
        ${MKEYS.map((k) => `<td style="color:${h[k] != null ? metricColor(k) : "var(--muted)"}">${h[k] != null ? h[k] : "—"}</td>`).join("")}
        <td class="st-avg">${a != null ? a.toFixed(1) : "—"}</td>
        <td>${h.bonus != null ? otp.rub(h.bonus) : "—"}</td>
        <td>${st != null ? (st > 0 ? "+" + st : st) + " ⭐" : "—"}</td>
        <td>${(h.awards || []).length}</td>
      </tr>`;
    }).join("");

    return `
    <section class="p-sec" data-reveal>
      <div class="p-sec-head"><h2><i class="ph-bold ph-chart-line"></i> Статистика</h2><span class="p-sec-hint">вся динамика за период · клик по графику или строке — детализация месяца</span></div>
      <div class="stat-cards">
        <div class="stat-card"><span class="sc-k">Средний KPI</span><span class="sc-v">${lastAvg != null ? lastAvg.toFixed(1) : "—"}</span><span class="sc-s">${trend.delta > 0 ? "▲ +" + trend.delta : "▼ " + trend.delta} за период</span></div>
        <div class="stat-card"><span class="sc-k">Лучший месяц</span><span class="sc-v">${best ? best.month.split(" ")[0] : "—"}</span><span class="sc-s">${best ? "avg " + avgOf(best).toFixed(1) : "нет данных"}</span></div>
        <div class="stat-card"><span class="sc-k">Звёзд всего</span><span class="sc-v">${emp.stars || 0}</span><span class="sc-s">LVL ${lvl} · ${inLvl}/${LVL_STEP} до след.</span></div>
        <div class="stat-card"><span class="sc-k">Бонусы за период</span><span class="sc-v">${otp.rub(bonusSum)}</span><span class="sc-s">${history.filter((h) => h.bonus != null).length} ${plMonths(history.filter((h) => h.bonus != null).length)} с бонусом</span></div>
        <div class="stat-card"><span class="sc-k">Наград получено</span><span class="sc-v">${totalAwardsCount}</span><span class="sc-s">уникальных ${empAwards.length} из ${awardsCatalog.length}</span></div>
      </div>
    </section>

    <section class="p-sec">
      <div class="detail-bar" data-reveal>
        <span class="db-k">Детализация месяца:</span>
        <b class="month-label">…</b>
        <span class="db-v" id="detail-avg"></span>
        <span class="db-sp"></span>
        ${monthTabsHtml()}
      </div>
      <div class="grid grid-2">
        <div class="card" data-reveal>
          <h3 style="margin-bottom:4px">${hasKpi ? "Профиль за" : "Средний профиль команды за"} <span class="month-label">…</span></h3>
          <p class="tt-hint" style="margin-bottom:16px">${hasKpi ? "5 метрик выбранного месяца" : "средние по " + teamMembers + " специалистам"}</p>
          <div class="chart-box"><canvas id="chart-radar"></canvas></div>
        </div>
        <div class="card" data-reveal>
          <h3 style="margin-bottom:4px">Средний KPI по месяцам</h3>
          <p class="tt-hint" style="margin-bottom:16px">клик по точке — показать этот месяц в детализации</p>
          <div class="chart-box"><canvas id="chart-avg"></canvas></div>
        </div>
        <div class="card" data-reveal>
          <h3 style="margin-bottom:4px">Бонусы по месяцам</h3>
          <p class="tt-hint" style="margin-bottom:16px">клик по столбцу — детализация месяца ниже</p>
          <div class="chart-box"><canvas id="chart-bonus"></canvas></div>
        </div>
        <div class="card" data-reveal>
          <h3 style="margin-bottom:4px">${hasKpi ? "Все метрики в динамике" : "Все метрики команды в динамике"}</h3>
          <p class="tt-hint" style="margin-bottom:16px">клик по месяцу — детализация</p>
          <div class="chart-box"><canvas id="chart-lines"></canvas></div>
        </div>
      </div>
    </section>

    <section class="p-sec">
      <div class="sub-head" data-reveal><i class="ph ph-table"></i> Все данные по месяцам</div>
      <div class="stat-table-wrap" data-reveal>
        <table class="stat-table">
          <thead><tr><th>Месяц</th>${MKEYS.map((k) => `<th title="${metricLabel(k)}">${metricEmoji(k)} ${metricLabel(k)}</th>`).join("")}<th>Средний</th><th>Бонус</th><th>Звёзды</th><th>Награды</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="grid grid-2" style="margin-top:20px">
        <div class="card" data-reveal><h3 style="margin-bottom:10px"><i class="ph ph-receipt"></i> Детализация бонусов: <span class="month-label">…</span></h3><div id="detail-money"></div></div>
        <div class="card" data-reveal><h3 style="margin-bottom:10px"><i class="ph ph-medal"></i> Награды месяца: <span class="month-label">…</span></h3><div class="awards-row" id="detail-awards"></div></div>
      </div>
      ${hasKpi ? "" : `<p class="tt-hint" style="margin-top:12px">По должности KPI не ведётся — в таблице и графиках показаны средние значения команды (${teamMembers} специалистов).</p>`}
    </section>

    ${showBoard ? `<section class="p-sec"><div class="sub-head" data-reveal><i class="ph ph-trophy"></i> Турнирная таблица команды · ${D.meta.updated}</div><div id="leaderboard" class="lb" data-reveal></div></section>` : ""}

    ${robotMenuHtml()}`;
  }

  /* ================= РАЗДЕЛ: ПРАВИЛА (книга) ================= */
  function sectionRules() {
    return `
    <section class="p-sec" data-reveal>
      <div class="p-sec-head"><h2><i class="ph-bold ph-book-open"></i> Правила игры</h2><span class="p-sec-hint">листай страницы кнопкой «Далее»</span></div>
      <div class="book" id="book" data-reveal>
        <div class="book-frame">
          <div class="book-top"><span class="book-chapter" id="book-chapter">Глава 1</span><span class="book-pages" id="book-pages">1 / 1</span></div>
          <div class="book-stage" id="book-stage"><article class="book-page" id="book-page"></article></div>
          <div class="book-nav">
            <button class="bk-btn" type="button" id="bk-prev"><i class="ph-bold ph-caret-left"></i> Назад</button>
            <div class="bk-dots" id="bk-dots"></div>
            <button class="bk-btn bk-next" type="button" id="bk-next">Далее <i class="ph-bold ph-caret-right"></i></button>
          </div>
        </div>
      </div>
    </section>

    ${robotMenuHtml()}`;
  }

  /* ---------- галерея правил «как в книге» ---------- */
  function bookPages() {
    const lvlRows = (from, to) => RULE_LEVELS.filter((L) => L.lvl >= from && L.lvl <= to).map((L) => `
      <div class="bk-lvl${L.lvl === lvl ? " is-now" : ""}">
        <div class="bk-lvl-h"><span class="bk-lvl-n">LVL ${L.lvl}</span> <b>${L.title}</b> <span class="bk-lvl-s">${L.stars}</span>${L.lvl === lvl ? ' <span class="got">· твой уровень</span>' : ""}</div>
        <ul>${L.perks.map((x) => `<li>${x}</li>`).join("")}</ul>
      </div>`).join("");
    const starGain = (RULES.stars || []).slice(0, 6).map((s) => `<div class="rule-tile"><span class="rule-ic">${s.icon}</span><div><div class="rule-t">${s.title}</div><div class="rule-d">${s.text}</div></div></div>`).join("");
    const starLose = (RULES.stars || []).slice(6).map((s) => `<div class="rule-tile"><span class="rule-ic">${s.icon}</span><div><div class="rule-t">${s.title}</div><div class="rule-d">${s.text}</div></div></div>`).join("");
    const awardBook = awardsCatalog.map((g) => `<div class="bk-award"><span class="bk-a-ic">${g.glyph || ""}</span><div><div class="bk-a-t">${g.title}</div><div class="bk-a-d">${g.desc}</div>${g.motiv ? `<div class="bk-a-m">${g.motiv}</div>` : ""}</div></div>`).join("");

    return [
      {
        chapter: "Глава 1", title: "Как устроена игра",
        html: `<p>Система держится на трёх вещах: <b>KPI</b>, <b>звёзды</b> и <b>уровни</b>.</p>
        <ol class="bk-list">
          <li>Каждый месяц руководитель оценивает пять метрик от 1 до 10: качество, обучаемость, инициатива, вовлечённость и требования к работе. Их средний балл — твой <b>средний KPI</b>.</li>
          <li>За результат месяца начисляются <b>звёзды</b> ⭐ — за рост, удержание высокой планки, награды и особые заслуги. До ${GAIN_CAP} звёзд за месяц.</li>
          <li>Каждые ${LVL_STEP} звёзд дают новый <b>уровень (LVL)</b>. Уровней десять: от «Новичка» до «Легенды отдела». Уровень <b>не понижается</b> — набранное остаётся с тобой.</li>
          <li>Чем выше уровень, тем больше возможностей: приоритет в графике, отпуске и увольнительных, бонусные задачи, наставничество, своё направление и участие в жизни отдела.</li>
        </ol>
        <p class="bk-note">Сейчас ты на <b>LVL ${lvl} «${lvlNow ? lvlNow.title : ""}»</b>, у тебя <b>${emp.stars || 0} ⭐</b>${lvlNext ? ` — до LVL ${lvlNext.lvl} «${lvlNext.title}» осталось <b>${starsNeed} ${plStars(starsNeed)}</b>` : " — это максимальный уровень"}.</p>`,
      },
      {
        chapter: "Глава 2", title: "Как начисляются звёзды",
        html: `<p>Основания <b>суммируются</b>: за один месяц можно заработать до <b>${GAIN_CAP} звёзд</b>.</p>${starGain}
        <p class="bk-note">Если оснований больше четырёх, в журнале будет отметка, что сработал лимит: в приоритете звезда руководителя, рост и удержание, затем награды.</p>`,
      },
      {
        chapter: "Глава 3", title: "Как теряются звёзды",
        html: `<p>Потерять можно до <b>${LOSS_CAP} звёзд</b> за месяц. Ниже нуля звёзды не уходят: один тяжёлый месяц не обнуляет накопленное.</p>${starLose}`,
      },
      {
        chapter: "Глава 4", title: "Как растёт уровень",
        html: `<p>Стартовый уровень — <b>LVL 1 «Новичок»</b>. Каждые <b>${LVL_STEP} звёзд</b> поднимают тебя на следующий уровень. Звёзды внутри уровня видны в карточке «Мой LVL»: там же — журнал, за что именно пришла каждая звезда.</p>
        <p>Первый месяц с KPI — точка отсчёта: звёзды за KPI начинаются со следующего месяца, а награды дают звёзды сразу.</p>
        <div class="bk-table">
          <div class="bk-tr bk-th"><span>Уровень</span><span>Звание</span><span>Нужно звёзд</span></div>
          ${RULE_LEVELS.map((L) => `<div class="bk-tr${L.lvl === lvl ? " is-now" : ""}"><span>LVL ${L.lvl}</span><span>${L.title}</span><span>${L.stars}</span></div>`).join("")}
        </div>
        <p class="bk-note">Чем выше уровень — тем серьёзнее возможности. Ниже — что даёт каждый из десяти уровней.</p>`,
      },
      { chapter: "Глава 5", title: "Что даёт LVL 1–5", html: `<p>Каждый уровень открывает конкретные возможности — их не нужно «выпрашивать», они закреплены за уровнем.</p>${lvlRows(1, 5)}` },
      { chapter: "Глава 6", title: "Что даёт LVL 6–10", html: `<p>Верхние уровни — это уже про влияние на отдел: наставничество, своё направление, аудит коллег, замещение руководителя.</p>${lvlRows(6, 10)}` },
      { chapter: "Глава 7", title: "Награды: что нужно сделать", html: `<p>Наград ${awardsCatalog.length}. Часть приходит автоматически по KPI месяца, часть отмечает руководитель за конкретные заслуги.</p>${awardBook}` },
      {
        chapter: "Глава 8", title: "Как заработать больше звёзд",
        html: `<ol class="bk-list">
          <li><b>Держи рост.</b> Даже +0.2 к среднему KPI — это звезда за рост.</li>
          <li><b>Не сбавляй после рывка.</b> Средний ${HOLD.toFixed(1)} и выше даёт звезду за удержание — отдельно от роста.</li>
          <li><b>Поднимай метрики до 10.</b> Каждая метрика на 10 даёт свою награду, а каждая новая награда — звезду.</li>
          <li><b>Копи награды.</b> Каждые ${LVL_STEP} одинаковых наград — ещё одна звезда.</li>
          <li><b>Бери сложные задачи.</b> Особые заслуги руководитель отмечает отдельной звездой — с записью в журнале, за что именно.</li>
          <li><b>Не роняй больше чем на ${DROP.toFixed(1)}.</b> Падение на ${DROP.toFixed(1)}+ снимает звезду, а средний ниже 5.0 — ещё одну. Стабильность дешевле, чем отыгрыш.</li>
        </ol>
        <p class="bk-note">Твой ориентир на следующий месяц: ${lvlNext ? `дойти до <b>LVL ${lvlNext.lvl} «${lvlNext.title}»</b> — это ${starsNeed} ${plStars(starsNeed)}` : "удержать максимальный уровень и помогать расти команде"}.</p>`,
      },
    ];
  }

  /* ---------- рендер раздела ---------- */
  const RENDER = { bonus: sectionBonus, lvl: sectionLvl, awards: sectionAwards, growth: sectionGrowth, stats: sectionStats, rules: sectionRules };
  root.innerHTML = heroHtml() + (RENDER[SECTION] || sectionBonus)();

  /* ---------- общие обработчики ---------- */
  const tabs = document.querySelectorAll(".month-tab");
  tabs.forEach((t) => t.addEventListener("click", () => onPickMonth(+t.dataset.i)));
  function onPickMonth(i) { selected = i; renderMonth(i); }

  function renderMonth(i) {
    const cur = history[i];
    if (!cur) return;
    selected = i;
    const hasMk = MKEYS.every((k) => cur[k] != null);
    document.querySelectorAll(".month-tab").forEach((t, idx) => t.classList.toggle("active", idx === i));
    document.querySelectorAll(".month-label").forEach((el) => (el.textContent = cur.month));

    if (statsDetail) { statsDetail(); return; }

    const ma = document.getElementById("month-awards");
    if (ma) ma.innerHTML = (cur.awards || []).length ? (cur.awards || []).map((a) => awardTile(a)).join("") : `<p class="muted">За ${cur.month} наград не получено.</p>`;

    const tilesEl = document.getElementById("metric-grid");
    if (tilesEl) {
      const teamProf = hasKpi ? null : teamProfileOf(cur.key);
      tilesEl.innerHTML = hasMk
        ? MKEYS.map((k) => {
            const m = D.metrics[k];
            const prev = i > 0 ? history[i - 1][k] : null;
            const d = prev == null ? { s: "", c: "flat" } : cur[k] > prev ? { s: "▲", c: "up" } : cur[k] < prev ? { s: "▼", c: "down" } : { s: "▬", c: "flat" };
            const dc = d.c === "up" ? "good" : d.c === "down" ? "bad" : "muted";
            return `<div class="metric-tile"><span class="ic" style="background:${otp.hexA(m.color, 0.12)};color:${m.color}"><span style="font-size:1.3rem;line-height:1">${m.emoji || ""}</span></span><div style="flex:1"><div class="name">${m.label}</div><div class="val" style="color:${m.color}">${cur[k]}<span style="font-size:.8rem;color:var(--${dc})"> ${d.s}</span></div></div></div>`;
          }).join("")
        : teamProf
          ? MKEYS.map((k, j) => `<div class="metric-tile team-tile" title="Средний балл команды за ${cur.month}"><span class="ic" style="background:${otp.hexA(D.metrics[k].color, 0.12)};color:${D.metrics[k].color}"><span style="font-size:1.3rem;line-height:1">👥</span></span><div style="flex:1"><div class="name">${D.metrics[k].label}</div><div class="val" style="color:${D.metrics[k].color}">${teamProf[j].toFixed(1)}<span style="font-size:.72rem;color:var(--muted)"> · команда</span></div></div></div>`).join("")
          : `<div class="demo-banner" style="margin:0;grid-column:1/-1;border-color:rgba(34,211,238,.28);color:var(--accent-2)"><i class="ph ph-info"></i> За ${cur.month} KPI не зафиксирован.</div>`;
    }

    const big = document.getElementById("bonus-total-big");
    if (big) {
      big.textContent = cur.bonus != null ? otp.rub(cur.bonus) : "—";
      const sub = document.getElementById("bonus-total-sub");
      if (sub) sub.textContent = cur.bonus != null ? "итог за " + cur.month : "бонус за этот месяц не зафиксирован";
    }
    const mAvg = document.getElementById("month-avg");
    if (mAvg) { const a = avgOf(cur); mAvg.textContent = a != null ? a.toFixed(1) : "—"; }

    const money = cur.money || [];
    const it = document.getElementById("bonus-items");
    if (it) it.innerHTML = money.length
      ? money.map((b) => `<div class="bonus-item"><span class="amt">+${otp.fmt(b.amount)} ₽</span><div><div class="d">${b.text}</div>${tickets(b.text).length ? `<div class="v">${tLinks(b.text)}</div>` : ""}</div></div>`).join("")
      : `<p class="muted">Детализация бонуса за ${cur.month} — в процессе разработки.</p>`;

    const sl = document.getElementById("strengths-list");
    if (sl) sl.innerHTML = (cur.strengths || []).length
      ? (cur.strengths || []).map((s) => `<div class="plus-item"><i class="ph ph-check-circle"></i><div><div class="b">${s[0]}</div><div class="d">${s[1]}</div></div></div>`).join("")
      : '<p class="muted">За месяц сильных сторон не зафиксировано.</p>';
    const gl = document.getElementById("growth-list");
    if (gl) gl.innerHTML = (cur.growth || []).length
      ? (cur.growth || []).map((g) => `<div class="minus-item"><i class="ph ph-warning-circle"></i><div><div class="b">${g.zone}</div><div class="advice">${g.advice}</div><div class="fact">${g.fact} ${tLinks(g.fact)}</div></div></div>`).join("")
      : '<p class="muted">Замечаний нет — молодец!</p>';

    const mentor = cur.mentor || [];
    const mWrap = document.getElementById("mentor-wrap");
    if (mWrap) {
      const mCard = document.getElementById("mentor-card");
      mWrap.style.display = mentor.length ? "" : "none";
      mCard.innerHTML = mentor.length ? mentor.map((p, ix) => `<p class="${ix === 0 ? "lead" : ""}">${p}</p>`).join("") : "";
    }

    const planTxt = cur.planTxt || null;
    const planSteps = planTxt && planTxt.steps ? planTxt.steps : [];
    const recs = cur.recommendations || [];
    const planGrid = document.getElementById("plan-grid");
    if (planGrid) {
      const rawTitle = planTxt && planTxt.title ? String(planTxt.title) : "";
      const whenTxt = /^Твой план на\s*/i.test(rawTitle) ? rawTitle.replace(/^Твой план на\s*/i, "").trim() : "";
      const whenEl = document.getElementById("plan-when");
      if (whenEl) whenEl.textContent = planSteps.length ? "· " + (whenTxt ? "на " + whenTxt : "по итогам " + cur.month) : "";
      planGrid.innerHTML = planSteps.length
        ? planSteps.map((s, n) => `<div class="step"><div class="n">0${n + 1}</div><div><div class="act">${s.title}</div>${s.text ? `<div class="zone-note">${s.text}</div>` : ""}${s.result ? `<div class="goal"><span class="goal-k">Твой результат</span>${s.result}</div>` : ""}</div></div>`).join("")
        : recs.length
          ? recs.map((r, n) => `<div class="step"><div class="n">0${n + 1}</div><div><div class="zone">${r.zone}</div><div class="act">${r.method}</div><div class="res">→ ${r.result}</div>${r.fact ? `<div class="fact-line"><i class="ph ph-quotes"></i> ${r.fact}</div>` : ""}<span class="dl">до ${r.deadline}</span></div></div>`).join("")
          : '<p class="muted">За месяц замечаний не было — продолжай в том же духе!</p>';
    }
  }

  /* ---------- раздел «Мой LVL»: график накопления звёзд ---------- */
  if (SECTION === "lvl" && window.Chart) {
    const el = document.getElementById("chart-stars");
    if (el) {
      new Chart(el, {
        type: "line",
        data: {
          labels: starLog.map((r) => r.month),
          datasets: [{ label: "Звёзд всего", data: starLog.map((r) => r.total), borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,.18)", fill: true, tension: .35, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6 }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.05)" } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `Всего звёзд: ${c.parsed.y}` } } } },
      });
    }
  }

  /* ---------- раздел «Статистика» ---------- */
  let statsDetail = null;
  if (SECTION === "stats") {
    const radarEl = document.getElementById("chart-radar");
    let radar = null, avgChart = null, bonusChart = null;
    if (window.Chart) {
      if (radarEl) radar = new Chart(radarEl, {
        type: "radar",
        data: { labels: MKEYS.map((k) => D.metrics[k].label), datasets: [{ label: hasKpi ? emp.shortName : "Команда", data: MKEYS.map(() => 0), borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.16)", borderWidth: 2, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: "#22d3ee" }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false, backdropColor: "transparent" }, grid: { color: "rgba(255,255,255,.08)" }, angleLines: { color: "rgba(255,255,255,.08)" }, pointLabels: { color: "#8b96a8", font: { size: 12 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.r}` } } } },
      });
      const avgEl = document.getElementById("chart-avg");
      const avgData = hasKpi ? history.map((h) => avgOf(h)) : history.map((h) => teamAvgOf(h.key));
      avgChart = new Chart(avgEl, {
        type: "line",
        data: { labels: D.months, datasets: [{ label: "Средний KPI", data: avgData, borderColor: "#22d3ee", backgroundColor: "#22d3ee", tension: .35, borderWidth: 2, spanGaps: true, pointRadius: 4, pointHoverRadius: 7 }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, scales: { y: { min: 0, max: 10, grid: { color: "rgba(255,255,255,.05)" }, ticks: { stepSize: 2 } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: () => "клик — детализация месяца" } } } },
      });
      const bonusEl = document.getElementById("chart-bonus");
      bonusChart = new Chart(bonusEl, {
        type: "bar",
        data: { labels: D.months, datasets: [{ label: "Бонус", data: history.map((h) => (h.bonus == null ? 0 : h.bonus)), backgroundColor: "#0e7490", hoverBackgroundColor: "#22d3ee", borderRadius: 6, maxBarThickness: 28 }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.05)" }, ticks: { callback: (v) => otp.fmt(v) + " ₽" } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => (history[c.dataIndex] && history[c.dataIndex].bonus != null ? otp.rub(c.parsed.y) : "бонуса не было"), afterLabel: () => "клик — детализация месяца" } } } },
      });
      const linesEl = document.getElementById("chart-lines");
      new Chart(linesEl, {
        type: "line",
        data: { labels: D.months, datasets: MKEYS.map((k) => ({ label: D.metrics[k].label, data: history.map((h) => (hasKpi ? h[k] : (teamProfileOf(h.key) ? teamProfileOf(h.key)[MKEYS.indexOf(k)] : null))), borderColor: D.metrics[k].color, backgroundColor: D.metrics[k].color, tension: .35, borderWidth: 2, spanGaps: true, pointRadius: 3, pointHoverRadius: 5, pointHitRadius: 8 })) },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, scales: { y: { min: 0, max: 10, grid: { color: "rgba(255,255,255,.05)" }, ticks: { stepSize: 2 } }, x: { grid: { display: false } } }, plugins: { legend: { position: "top" }, tooltip: { callbacks: { afterLabel: () => "клик — детализация месяца" } } } },
      });
      const clickMonth = (chart, canvas) => canvas && canvas.addEventListener("click", (ev) => {
        const rect = canvas.getBoundingClientRect();
        const v = chart.scales.x.getValueForPixel(ev.clientX - rect.left);
        const i = Math.round(v);
        if (Number.isFinite(i) && i >= 0 && i < history.length) { selected = i; renderMonth(i); }
      });
      clickMonth(avgChart, avgEl); clickMonth(bonusChart, bonusEl);
    }
    document.querySelectorAll(".st-row").forEach((tr) => tr.addEventListener("click", () => renderMonth(+tr.dataset.i)));

    statsDetail = function () {
      const cur = history[selected] || {};
      document.querySelectorAll(".month-tab").forEach((t, idx) => t.classList.toggle("active", idx === selected));
      document.querySelectorAll(".month-label").forEach((el) => (el.textContent = cur.month));
      document.querySelectorAll(".st-row").forEach((tr) => tr.classList.toggle("is-now", +tr.dataset.i === selected));
      const a = avgOf(cur);
      const dv = document.getElementById("detail-avg");
      if (dv) dv.textContent = hasKpi ? (a != null ? `средний ${a.toFixed(1)}` : "нет KPI") : `средний по команде ${teamAvgOf(cur.key) != null ? teamAvgOf(cur.key).toFixed(1) : "—"}`;
      if (radar) {
        radar.data.datasets[0].data = hasKpi ? (MKEYS.every((k) => cur[k] != null) ? MKEYS.map((k) => cur[k]) : MKEYS.map(() => 0)) : (teamProfileOf(cur.key) || MKEYS.map(() => 0));
        radar.data.datasets[0].label = hasKpi ? emp.shortName : "Команда";
        radar.update();
      }
      const dm = document.getElementById("detail-money");
      if (dm) dm.innerHTML = (cur.money || []).length
        ? (cur.money || []).map((b) => `<div class="bonus-item"><span class="amt">+${otp.fmt(b.amount)} ₽</span><div><div class="d">${b.text}</div>${tickets(b.text).length ? `<div class="v">${tLinks(b.text)}</div>` : ""}</div></div>`).join("") + `<div class="dm-total">Итого: <b>${cur.bonus != null ? otp.rub(cur.bonus) : "—"}</b></div>`
        : `<p class="muted">Детализация за ${cur.month} — в процессе разработки.</p>`;
      const da = document.getElementById("detail-awards");
      if (da) da.innerHTML = (cur.awards || []).length ? (cur.awards || []).map((x) => awardTile(x)).join("") : '<p class="muted">Наград за этот месяц нет.</p>';
    };
    statsDetail();
  }

  /* ---------- раздел «Правила»: книга с перелистыванием ---------- */
  if (SECTION === "rules") {
    const pages = bookPages();
    let page = 0, busy = false;
    const pageEl = document.getElementById("book-page");
    const chEl = document.getElementById("book-chapter");
    const pgEl = document.getElementById("book-pages");
    const dotsEl = document.getElementById("bk-dots");
    const prevBtn = document.getElementById("bk-prev");
    const nextBtn = document.getElementById("bk-next");
    dotsEl.innerHTML = pages.map((_, i) => `<span class="bk-dot" data-i="${i}"></span>`).join("");
    const paint = () => {
      pageEl.innerHTML = `<h3 class="bk-h">${pages[page].title}</h3>${pages[page].html}`;
      chEl.textContent = pages[page].chapter;
      pgEl.textContent = `${page + 1} / ${pages.length}`;
      document.querySelectorAll(".bk-dot").forEach((d, i) => d.classList.toggle("on", i === page));
      prevBtn.disabled = page === 0;
      nextBtn.disabled = page === pages.length - 1;
    };
    const turn = (to, dir) => {
      if (busy || to < 0 || to >= pages.length || to === page) return;
      busy = true;
      pageEl.classList.add(dir > 0 ? "flip-out" : "flip-out-back");
      setTimeout(() => {
        page = to; paint();
        pageEl.classList.remove("flip-out", "flip-out-back");
        pageEl.classList.add(dir > 0 ? "flip-in" : "flip-in-back");
        setTimeout(() => { pageEl.classList.remove("flip-in", "flip-in-back"); busy = false; }, 320);
      }, 320);
    };
    nextBtn.addEventListener("click", () => turn(page + 1, 1));
    prevBtn.addEventListener("click", () => turn(page - 1, -1));
    document.querySelectorAll(".bk-dot").forEach((d) => d.addEventListener("click", () => turn(+d.dataset.i, +d.dataset.i > page ? 1 : -1)));
    document.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") turn(page + 1, 1); if (e.key === "ArrowLeft") turn(page - 1, -1); });
    paint();
  }

  renderMonth(selected);
  otp.reveal(document);
})();
