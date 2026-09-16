/* Логика персональной страницы: помесячный drill-down */
(function () {
  "use strict";
  const D = window.OTP_EMP;
  const root = document.getElementById("root");
  const emp = D && D.employee;
  if (!emp) { root.innerHTML = '<p class="muted" style="padding:60px 0">Страница недоступна.</p>'; return; }

  const MKEYS = otp.MKEYS;
  const history = emp.history || [];
  const hasKpi = !!emp.current;
  // месяц «с данными» = есть все 5 KPI или есть бонус (иначе месяц ещё не заполнен)
  const monthHasData = (h) => MKEYS.every((k) => h[k] != null) || h.bonus != null;
  const filledMonths = history.map((h, i) => (monthHasData(h) ? i : -1)).filter((i) => i >= 0);
  // открываем последний заполненный месяц (у кого нет августа — показываем июль и т.д.)
  let selected = filledMonths.length ? filledMonths[filledMonths.length - 1] : Math.max(0, history.length - 1);
  document.title = `Мои результаты · ${emp.shortName}`;

  const trend = otp.trend(emp);
  const trendIcon = trend.dir === "up" ? "trend-up" : trend.dir === "down" ? "trend-down" : "minus";
  // командные данные (нужны там, где у сотрудника нет KPI — например, у руководителя)
  const team = D.team || {};
  const teamProfileByMonth = team.profileByMonth || {};
  const teamAvgByMonth = team.avgByMonth || {};
  const teamMembers = team.memberCount || 0;
  const teamProfileOf = (key) => teamProfileByMonth[key] || null;   // [5 значений] средние по команде
  const teamAvgOf = (key) => (teamAvgByMonth[key] != null ? teamAvgByMonth[key] : null);
  const leaderboardRows = D.leaderboard || [];
  const myPlace = (leaderboardRows.find((r) => r.id === emp.id) || {}).place || null;

  const awardTile = (a, extra = "", ttl = "") =>
    `<div class="award-tile${a.id === "perfect" ? " star-medal" : ""}"${ttl ? ` title="${ttl}"` : ""}><span class="medal" style="--ac:${a.color}"><span class="medal-glyph">${a.glyph || ""}</span></span><div class="a-t">${a.title}${extra}</div><div class="a-r">${a.desc}</div></div>`;
  const awards = (emp.awards || []).map((a) =>
    awardTile(a, a.count > 1 ? ` <span class="got">×${a.count}</span>` : "", a.months ? `Получена: ${a.months.join(", ")}` : "")).join("");
  const earnedIds = new Set((emp.awards || []).map((a) => a.id));
  const glossary = (D.awardsCatalog || []).map((g) => {
    const earned = earnedIds.has(g.id);
    return `<div class="award-tile ${earned ? "earned" : "locked"}${g.id === "perfect" ? " star-medal" : ""}"><span class="medal" style="--ac:${earned ? g.color : "#3a4250"}"><span class="medal-glyph">${g.glyph || ""}</span></span><div class="a-t">${g.title} ${earned ? '<span class="got">· получена</span>' : ""}</div><div class="a-r">${g.desc}</div></div>`;
  }).join("");

  const statusBadge = emp.status === "left"
    ? '<span class="badge badge-left"><i class="ph ph-archive"></i> ' + (emp.statusNote || "выбыл") + '</span>'
    : '<span class="badge badge-good"><i class="ph ph-check"></i> в команде</span>';
  const lvl = emp.lvl || 1;
  const inLvl = emp.stars_in_level || 0;
  const delta = emp.stars_delta || 0;
  const deltaBadge = delta > 0
    ? `<span class="badge badge-good"><i class="ph-fill ph-star"></i> +${delta} ⭐ за месяц</span>`
    : delta < 0
      ? `<span class="badge badge-left"><i class="ph ph-star"></i> −${Math.abs(delta)} ⭐ за месяц</span>`
      : "";

  /* ---------- уровень, звёзды и правила игры ---------- */
  const showBoard = emp.id === "yakovlenkov";          // турнирная таблица — только у руководителя
  const RULES = D.rules || null;
  const RULE_LEVELS = (RULES && RULES.levels) || [];
  const lvlInfo = (n) => RULE_LEVELS.find((x) => x.lvl === n) || null;
  const lvlNow = lvlInfo(lvl);
  const lvlNext = lvlInfo(lvl + 1);
  const starsNeed = Math.max(0, 10 - inLvl);
  const starsBar = Array.from({ length: 10 }, (_, i) => `<span class="sb${i < inLvl ? " on" : ""}">${i < inLvl ? "★" : "☆"}</span>`).join("");
  const starLog = emp.starLog || [];
  const starLogRows = starLog.length
    ? starLog.map((r) => {
        const sign = r.stars == null ? "точка отсчёта" : r.stars > 0 ? "+1 ⭐" : r.stars < 0 ? "−1 ⭐" : "0 ⭐";
        const cls = r.stars == null ? "start" : r.stars > 0 ? "gain" : r.stars < 0 ? "loss" : "hold";
        return `<div class="sl-row ${cls}"><span class="sl-m">${r.month}</span><span class="sl-k">${sign}</span><span class="sl-r">${r.reason}</span><span class="sl-t">${r.total} ⭐</span></div>`;
      }).join("")
    : '<p class="muted">Журнал появится после второго месяца с KPI.</p>';
  const rulesStars = RULES && RULES.stars
    ? RULES.stars.map((s) => `<div class="rule-tile"><span class="rule-ic">${s.icon}</span><div><div class="rule-t">${s.title}</div><div class="rule-d">${s.text}</div></div></div>`).join("")
    : "";
  const rulesLevels = RULE_LEVELS.map((L) => {
    const isNow = L.lvl === lvl, passed = L.lvl < lvl;
    return `<div class="lvl-row${isNow ? " is-now" : ""}${passed ? " is-passed" : ""}">
      <div class="lvl-cell"><span class="lvl-n">LVL ${L.lvl}</span><span class="lvl-s">${L.stars}</span></div>
      <div class="lvl-body"><div class="lvl-t">${L.title}${isNow ? ' <span class="got">· твой уровень сейчас</span>' : passed ? ' <span class="got">· пройден</span>' : ""}</div>
      <ul class="lvl-perks">${L.perks.map((x) => `<li>${x}</li>`).join("")}</ul></div></div>`;
  }).join("");
  const avgNow = emp.avg;
  const growItems = [];
  if (lvlNext) {
    growItems.push(`До <b>LVL ${lvlNext.lvl} «${lvlNext.title}»</b> осталось <b>${starsNeed} ⭐</b> — по звезде за каждый месяц, где средний KPI вырос или удержан на 8.0 и выше (то есть минимум ${starsNeed} ${pluralM(starsNeed)} такой работы).`);
    growItems.push(`Что откроет LVL ${lvlNext.lvl}: ${lvlNext.perks.join("; ").toLowerCase()}.`);
  } else {
    growItems.push("Ты уже на максимальном уровне — держи планку и помогай расти остальным.");
  }
  if (avgNow != null) {
    growItems.push(avgNow >= 8
      ? `Средний KPI сейчас <b>${avgNow.toFixed(1)}</b> — ты в зоне удержания: не опускайся ниже 8.0, и звезда будет приходить каждый месяц.`
      : `Средний KPI сейчас <b>${avgNow.toFixed(1)}</b> — до порога удержания 8.0 не хватает <b>${(8 - avgNow).toFixed(1)}</b>. Подними 2–3 метрики до 9–10, и удержание начнёт приносить звёзды.`);
  }
  if (delta < 0) growItems.push(`Последний месяц дал <b>−${Math.abs(delta)} ⭐</b> — чтобы вернуть звезду, нужен рост среднего KPI к прошлому месяцу.`);
  growItems.push("Правило-предохранитель: падение среднего KPI меньше 1.0 звёзд не забирает — важна стабильность, а не идеальность.");
  const rulesAwards = (D.awardsCatalog || []).map((g) => `<div class="rule-award"><span class="ra-g">${g.glyph || ""}</span><span class="ra-t">${g.title}</span><span class="ra-d">${g.desc}</span></div>`).join("");

  function tickets(text) { return (text || "").match(/HELP-\d+/g) || []; }
  function tLinks(text) { return tickets(text).map((t) => `<a href="https://jira.centrofinans.ru/browse/${t}" target="_blank" rel="noopener">${t}</a>`).join(" "); }

  function metricDelta(i, k) {
    if (i <= 0) return { s: "", c: "flat" };
    const a = history[i - 1][k], b = history[i][k];
    if (a == null || b == null) return { s: "", c: "flat" };
    return b > a ? { s: "▲", c: "up" } : b < a ? { s: "▼", c: "down" } : { s: "▬", c: "flat" };
  }

  /* ---------- рендер выбранного месяца ---------- */
  function renderMonth(i) {
    const cur = history[i];
    if (!cur) return;
    selected = i;
    const hasMk = cur && MKEYS.every((k) => cur[k] != null);

    document.querySelectorAll(".month-tab").forEach((t, idx) => t.classList.toggle("active", idx === i));
    document.querySelectorAll(".month-label").forEach((el) => (el.textContent = cur.month));
    const mAwards = cur.awards || [];
    const ma = document.getElementById("month-awards");
    if (ma) ma.innerHTML = mAwards.length
      ? mAwards.map((a) => awardTile(a)).join("")
      : `<p class="muted">За ${cur.month} наград не получено.</p>`;

    // плитки метрик
    const tilesEl = document.getElementById("metric-grid");
    const teamProf = hasKpi ? null : teamProfileOf(cur.key);
    tilesEl.innerHTML = hasMk
      ? MKEYS.map((k) => {
          const m = D.metrics[k];
          const d = metricDelta(i, k);
          const dc = d.c === "up" ? "good" : d.c === "down" ? "bad" : "muted";
          return `<div class="metric-tile"><span class="ic" style="background:${otp.hexA(m.color, 0.12)};color:${m.color}"><span style="font-size:1.3rem;line-height:1">${m.emoji || ""}</span></span><div style="flex:1"><div class="name">${m.label}</div><div class="val" style="color:${m.color}">${cur[k]}<span style="font-size:.8rem;color:var(--${dc})"> ${d.s}</span></div></div></div>`;
        }).join("")
      : teamProf
        ? MKEYS.map((k, j) => {
            const m = D.metrics[k];
            return `<div class="metric-tile team-tile" title="Средний балл команды за ${cur.month}"><span class="ic" style="background:${otp.hexA(m.color, 0.12)};color:${m.color}"><span style="font-size:1.3rem;line-height:1">👥</span></span><div style="flex:1"><div class="name">${m.label}</div><div class="val" style="color:${m.color}">${teamProf[j].toFixed(1)}<span style="font-size:.72rem;color:var(--muted)"> · команда</span></div></div></div>`;
          }).join("")
        : `<div class="demo-banner" style="margin:0;grid-column:1/-1;border-color:rgba(34,211,238,.28);color:var(--accent-2)"><i class="ph ph-info"></i> За ${cur.month} KPI не зафиксирован.</div>`;

    // бонусы
    const bt = cur.bonus;
    document.getElementById("bonus-total").innerHTML = bt != null ? `<span class="badge">${otp.rub(bt)}</span>` : "";
    const money = cur.money || [];
    document.getElementById("bonus-items").innerHTML = money.length
      ? money.map((b) => `<div class="bonus-item"><span class="amt">+${otp.fmt(b.amount)} ₽</span><div><div class="d">${b.text}</div>${tickets(b.text).length ? `<div class="v">${tLinks(b.text)}</div>` : ""}</div></div>`).join("")
      : `<p class="muted">Детализация бонуса за ${cur.month} — в процессе разработки.</p>`;

    // сильные стороны / зоны роста
    const strengths = cur.strengths || [];
    document.getElementById("strengths-list").innerHTML = strengths.length
      ? strengths.map((s) => `<div class="plus-item"><i class="ph ph-check-circle"></i><div><div class="b">${s[0]}</div><div class="d">${s[1]}</div></div></div>`).join("")
      : '<p class="muted">За месяц сильных сторон не зафиксировано.</p>';
    const growth = cur.growth || [];
    document.getElementById("growth-list").innerHTML = growth.length
      ? growth.map((g) => `<div class="minus-item"><i class="ph ph-warning-circle"></i><div><div class="b">${g.zone}</div><div class="advice">${g.advice}</div><div class="fact">${g.fact} ${tLinks(g.fact)}</div></div></div>`).join("")
      : '<p class="muted">Замечаний нет — молодец!</p>';

    // план роста: шаги руководителя из файла итогов (помесячно) + «Твой результат»
    const planTxt = cur.planTxt || null;
    const planSteps = planTxt && planTxt.steps ? planTxt.steps : [];
    const recs = cur.recommendations || [];
    const planGrid = document.getElementById("plan-grid");
    const rawTitle = planTxt && planTxt.title ? String(planTxt.title) : "";
    const whenTxt = /^Твой план на\s*/i.test(rawTitle) ? rawTitle.replace(/^Твой план на\s*/i, "").trim() : "";
    const whenEl = document.getElementById("plan-when");
    if (whenEl) whenEl.textContent = planSteps.length ? "· " + (whenTxt ? "на " + whenTxt : "по итогам " + cur.month) : "";
    if (planSteps.length) {
      planGrid.innerHTML = planSteps.map((s, n) => `<div class="step"><div class="n">0${n + 1}</div><div><div class="act">${s.title}</div>${s.text ? `<div class="zone-note">${s.text}</div>` : ""}${s.result ? `<div class="goal"><span class="goal-k">Твой результат</span>${s.result}</div>` : ""}</div></div>`).join("");
    } else {
      planGrid.innerHTML = recs.length
        ? recs.map((r, n) => `<div class="step"><div class="n">0${n + 1}</div><div><div class="zone">${r.zone}</div><div class="act">${r.method}</div><div class="res">→ ${r.result}</div>${r.fact ? `<div class="fact-line"><i class="ph ph-quotes"></i> ${r.fact}</div>` : ""}<span class="dl">до ${r.deadline}</span></div></div>`).join("")
        : '<p class="muted">За месяц замечаний не было — продолжай в том же духе!</p>';
    }

    // напутствие руководителя — письмом, по абзацам
    const mentor = cur.mentor || [];
    const mWrap = document.getElementById("mentor-wrap");
    if (mWrap) {
      const mCard = document.getElementById("mentor-card");
      mWrap.style.display = mentor.length ? "" : "none";
      if (mentor.length) mCard.innerHTML = mentor.map((p, i) => `<p class="${i === 0 ? "lead" : ""}">${p}</p>`).join("");
      else mCard.innerHTML = "";
    }

    // радар + подсветка бонусного столбца
    if (radarChart) {
      radarChart.data.datasets[0].data = hasKpi
        ? (hasMk ? MKEYS.map((k) => cur[k]) : MKEYS.map(() => 0))
        : (teamProfileOf(cur.key) || MKEYS.map(() => 0));
      radarChart.data.datasets[0].label = hasKpi ? emp.shortName : "Команда";
      radarChart.update();
    }
    if (bonusChart) {
      const colors = history.map((_, idx) => idx === i ? "#22d3ee" : "#0e7490");
      bonusChart.data.datasets[0].backgroundColor = colors;
      bonusChart.update();
    }
  }

  /* ---------- скелет ---------- */
  const books = (emp.literature || []).map((b) =>
    `<a class="book" href="${b.url}" target="_blank" rel="noopener"><span class="ic"><i class="ph ph-book-open"></i></span><div style="flex:1"><div class="t">${b.title}</div><div class="a">${b.author}</div><div class="why">${b.why}</div></div><span class="type">${b.type}</span></a>`).join("");
  const resources = (emp.resources || []).map((r) =>
    `<a class="book" href="${r.url}" target="_blank" rel="noopener"><span class="ic"><i class="${r.icon || "ph-globe"}"></i></span><div style="flex:1"><div class="t">${r.title}</div><div class="a">${r.type}</div></div><span class="type">интернет</span></a>`).join("");

  root.innerHTML = `
    <section style="padding:20px 0 8px">
      <div class="profile-hero" data-reveal>
        <span class="avatar-xl">${otp.initials(emp.fullName)}</span>
        <div style="flex:1;min-width:260px">
          <span class="kicker">${emp.siteTitle}</span>
          <h1 class="grad-text" style="font-size:clamp(2.1rem,5vw,3.4rem)">Мои результаты</h1>
          <div style="font-size:1.25rem;font-weight:600;margin-top:4px">${emp.fullName}</div>
          <div class="muted">${emp.role}</div>
          <p class="tag">${emp.tagline}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
            ${statusBadge}
            ${deltaBadge}
            ${hasKpi ? `<span class="badge"><i class="ph ph-${trendIcon}"></i> тренд ${trend.delta > 0 ? "+" + trend.delta : trend.delta} за период</span>` : ""}
          </div>
        </div>
        <div style="text-align:center;min-width:150px">
          <div style="font-family:var(--font-mono);font-size:.72rem;color:var(--muted);letter-spacing:.08em;text-transform:uppercase">уровень</div>
          <div style="font-family:var(--font-mono);font-size:2.6rem;font-weight:800;line-height:1;background:linear-gradient(135deg,var(--accent),#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent">LVL ${lvl}</div>
          <div style="font-size:.82rem;color:var(--warn);margin-top:6px"><i class="ph-fill ph-star"></i> ${inLvl}/10 ⭐ до след.</div>
          <div style="margin-top:14px;font-family:var(--font-mono);font-size:.72rem;color:var(--muted)">${hasKpi ? "средний KPI" : "средний KPI команды"}</div>
          <div style="font-family:var(--font-mono);font-size:2rem;font-weight:700;color:var(--accent-2);line-height:1">${hasKpi ? emp.avg.toFixed(1) : (teamAvgOf(history[selected] && history[selected].key) != null ? teamAvgOf(history[selected].key).toFixed(1) : "—")}</div>
        </div>
      </div>
    </section>

    <section style="padding:6px 0 0">
      <div class="sub-head" data-reveal><i class="ph ph-trophy"></i> Награды за <span class="month-label">…</span></div>
      <div class="awards-row" id="month-awards" data-stagger></div>
      ${awards ? `<div class="sub-head" data-reveal style="margin-top:26px"><i class="ph ph-stack"></i> Накоплено за всё время · ${emp.awards.length}</div><div class="awards-row" data-stagger>${awards}</div>` : ""}
      <div style="margin-top:14px">
        <button type="button" class="btn btn-ghost" id="glossary-toggle" style="font-size:.85rem"><i class="ph ph-book-bookmark"></i> Справочник наград</button>
      </div>
      <div id="glossary" class="glossary" style="display:none">${glossary}</div>
    </section>

    <section style="padding:22px 0 0">
      <div class="sub-head" data-reveal><i class="ph ph-star"></i> Уровень и звёзды<span class="plan-when">· LVL ${lvl}${lvlNow ? " «" + lvlNow.title + "»" : ""}</span></div>
      <div class="two-col" style="align-items:start">
        <div class="card" data-reveal>
          <div class="lvl-head"><span class="lvl-big">LVL ${lvl}</span>${lvlNow ? `<span class="lvl-name">${lvlNow.title}</span>` : ""}</div>
          <div class="stars-bar" title="${inLvl} из 10 звёзд внутри уровня">${starsBar}</div>
          <div class="lvl-next">${lvlNext ? `До LVL ${lvlNext.lvl} «${lvlNext.title}» — <b>${starsNeed} ⭐</b> (${starsNeed} ${pluralM(starsNeed)} роста KPI)` : "Максимальный уровень достигнут"}</div>
          <div class="lvl-progress"><span style="width:${inLvl * 10}%"></span></div>
          <div class="lvl-total">Всего звёзд: <b>${emp.stars || 0}</b>${delta ? ` · последний месяц: <b>${delta > 0 ? "+" + delta : "−" + Math.abs(delta)} ⭐</b>` : ""}</div>
        </div>
        <div class="card" data-reveal>
          <h3 style="margin-bottom:10px">За что приходили и уходили звёзды</h3>
          <div class="star-log">${starLogRows}</div>
        </div>
      </div>

      <details class="rules-card">
        <summary><i class="ph ph-game-controller"></i> Правила игры: звёзды, уровни, награды — и что даёт высокий уровень</summary>
        <div class="rules-body">
          <h4 class="rules-h">Как начисляются и снимаются звёзды</h4>
          <div class="rules-grid">${rulesStars}</div>

          <h4 class="rules-h">Что даёт каждый уровень</h4>
          <p class="tt-hint" style="margin:-4px 0 12px">уровень не понижается — набранное остаётся с тобой, звёзды продолжают копиться внутри уровня</p>
          <div class="lvl-list">${rulesLevels}</div>

          <h4 class="rules-h">Что нужно тебе, чтобы вырасти дальше</h4>
          <ul class="grow-list">${growItems.map((g) => `<li>${g}</li>`).join("")}</ul>

          <h4 class="rules-h">Как получают награды</h4>
          <div class="rules-awards">${rulesAwards}</div>
        </div>
      </details>
    </section>

    <section style="padding:20px 0 0">
      <div class="month-tabs" id="month-tabs" data-reveal>${history.map((h, i) => `<button class="month-tab${monthHasData(h) ? "" : " empty"}" data-i="${i}"${monthHasData(h) ? "" : ' title="За этот месяц данных пока нет"'}>${h.month}</button>`).join("")}</div>
    </section>

    <section style="padding:14px 0 0"><div class="metric-grid" id="metric-grid" data-stagger></div></section>

    <div class="sub-head" id="bonus-section" data-reveal style="scroll-margin-top:96px"><i class="ph ph-currency-rub"></i> Достижения и бонусы за <span class="month-label">…</span> <span id="bonus-total"></span></div>
    <div id="bonus-items" data-stagger></div>

    <div class="sub-head" data-reveal><i class="ph ph-scales"></i> Сильные стороны и зоны роста за <span class="month-label">…</span></div>
    <div class="two-col">
      <div class="card" data-reveal><h3 style="margin-bottom:12px"><span style="color:var(--good)">✅</span> Что получается круто</h3><div id="strengths-list"></div></div>
      <div class="card" data-reveal><h3 style="margin-bottom:12px"><span style="color:var(--warn)">⚠️</span> Зоны роста</h3><div id="growth-list"></div></div>
    </div>

    <div class="sub-head" data-reveal><i class="ph ph-target"></i> План роста<span class="plan-when" id="plan-when"></span></div>
    <p class="tt-hint" id="plan-legend" style="margin:-6px 0 14px">шаги из итогов месяца · «Твой результат» — что должно получиться на выходе</p>
    <div class="grid" id="plan-grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))"></div>

    <div id="mentor-wrap" style="display:none">
      <div class="sub-head" data-reveal style="margin-top:28px"><i class="ph ph-chats"></i> Напутствие руководителя</div>
      <div class="mentor-card" id="mentor-card" data-reveal></div>
    </div>

    <div class="sub-head" data-reveal><i class="ph ph-book-open"></i> Учебные материалы под твои зоны роста</div>
    <div class="two-col">
      <div class="list-col" data-stagger>${books}</div>
      <div class="list-col" data-stagger>${resources}</div>
    </div>

    <div class="sub-head" data-reveal><i class="ph ph-chart-line"></i> Динамика по месяцам</div>
    <div class="grid grid-2" style="margin-bottom:20px">
      <div class="card" data-reveal>
        <h3 style="margin-bottom:4px">${hasKpi ? "Профиль за" : "Средний профиль команды за"} <span class="month-label">…</span></h3>
        <p class="tt-hint" style="margin-bottom:16px">${hasKpi ? "5 метрик за выбранный месяц" : "средние по " + teamMembers + " специалистам за выбранный месяц"}</p>
        <div class="chart-box"><canvas id="chart-radar"></canvas></div>
      </div>
      <div class="card" data-reveal>
        <h3 style="margin-bottom:4px">Бонусы по месяцам</h3>
        <p class="tt-hint" style="margin-bottom:16px">кликни по столбцу любого месяца — страница сразу перейдёт к «Достижениям и бонусам» с цифрами в рублях</p>
        <div class="chart-box"><canvas id="chart-bonus"></canvas></div>
      </div>
    </div>
    <div class="card" data-reveal style="margin-bottom:20px">
      <h3 style="margin-bottom:4px">${hasKpi ? "Все метрики в динамике" : "Все метрики команды в динамике"}</h3>
      <p class="tt-hint" style="margin-bottom:16px">${hasKpi ? "кликни по метрике в легенде, чтобы скрыть/показать" : "средние значения по команде — кликни по метрике в легенде, чтобы скрыть/показать"}</p>
      <div class="chart-box lg"><canvas id="chart-lines"></canvas></div>
    </div>

    ${showBoard ? `<div class="sub-head" data-reveal><i class="ph ph-trophy"></i> Турнирная таблица команды · ${D.meta.updated}</div>
    <div id="leaderboard" class="lb" data-reveal></div>` : ""}

    <section style="padding:28px 0 10px"><div class="personal-note" data-reveal>💬 ${emp.personal}</div></section>
  `;

  document.querySelectorAll(".month-tab").forEach((t) => t.addEventListener("click", () => renderMonth(+t.dataset.i)));

  const gt = document.getElementById("glossary-toggle");
  if (gt) {
    gt.addEventListener("click", () => {
      const g = document.getElementById("glossary");
      const open = g.style.display !== "none";
      g.style.display = open ? "none" : "grid";
      gt.innerHTML = open ? '<i class="ph ph-book-bookmark"></i> Справочник наград' : '<i class="ph ph-x"></i> Скрыть справочник';
    });
  }
  /* ---------- графики ---------- */
  let radarChart = null, bonusChart = null;
  if (window.Chart) {
    {
      radarChart = new Chart(document.getElementById("chart-radar"), {
        type: "radar",
        data: {
          labels: MKEYS.map((k) => D.metrics[k].label),
          datasets: [{ label: hasKpi ? emp.shortName : "Команда", data: MKEYS.map(() => 0), borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.16)", borderWidth: 2, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: "#22d3ee" }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false, backdropColor: "transparent" }, grid: { color: "rgba(255,255,255,.08)" }, angleLines: { color: "rgba(255,255,255,.08)" }, pointLabels: { color: "#8b96a8", font: { size: 12 } } } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.r}` } } },
        },
      });
    }
    const bonusCanvas = document.getElementById("chart-bonus");
    bonusChart = new Chart(bonusCanvas, {
      type: "bar",
      data: {
        labels: D.months,
        datasets: [{ label: "Бонус", data: history.map((h) => (h.bonus == null ? 0 : h.bonus)), backgroundColor: "#0e7490", hoverBackgroundColor: "#22d3ee", borderRadius: 6, maxBarThickness: 28 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.05)" }, ticks: { callback: (v) => otp.fmt(v) + " ₽" } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: (c) => (history[c.dataIndex] && history[c.dataIndex].bonus != null ? otp.rub(c.parsed.y) : "бонуса не было"),
            afterLabel: () => "клик — подробности этого месяца",
          } },
        },
      },
    });
    // клик по любому месяцу (в т.ч. где бонуса не было / столбец нулевой) — определяем месяц по координате
    bonusCanvas.style.cursor = "pointer";
    bonusCanvas.addEventListener("click", (ev) => {
      if (!bonusChart || !bonusChart.scales.x) return;
      const rect = bonusCanvas.getBoundingClientRect();
      const v = bonusChart.scales.x.getValueForPixel(ev.clientX - rect.left);
      const i = Math.round(v);
      if (Number.isFinite(i) && i >= 0 && i < history.length) {
        renderMonth(i);
        const sec = document.getElementById("bonus-section");
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    new Chart(document.getElementById("chart-lines"), {
      type: "line",
      data: {
        labels: D.months,
        datasets: MKEYS.map((k) => ({ label: D.metrics[k].label, data: history.map((h) => (hasKpi ? h[k] : (teamProfileOf(h.key) ? teamProfileOf(h.key)[MKEYS.indexOf(k)] : null))), borderColor: D.metrics[k].color, backgroundColor: D.metrics[k].color, tension: 0.35, borderWidth: 2, spanGaps: true, pointRadius: 3, pointHoverRadius: 5, pointHitRadius: 8 })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        scales: { y: { min: 0, max: 10, grid: { color: "rgba(255,255,255,.05)" }, ticks: { stepSize: 2 } }, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } } },
        plugins: { legend: { position: "top" } },
      },
    });
  }

  /* ---------- турнирная таблица команды (соревновательная форма) ---------- */
  function renderLeaderboard() {
    if (!showBoard) return;                              // доска — только на странице руководителя
    const el = document.getElementById("leaderboard");
    if (!el) return;
    const rows = leaderboardRows;
    if (!rows.length) { el.innerHTML = '<p class="muted">Рейтинг появится после первого месяца с KPI.</p>'; return; }
    const medal = (p) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : p);
    const podium = rows.slice(0, 3).map((r) =>
      `<div class="lb-podium${r.id === emp.id ? " is-me" : ""}"><div class="lb-pm">${medal(r.place)}</div><div class="lb-pn">${r.short}</div><div class="lb-pt">${r.title}</div><div class="lb-ps">LVL ${r.lvl} · ⭐ ${r.stars}</div><div class="lb-pa">${r.glyphs.join(" ")}</div></div>`).join("");
    const list = rows.map((r) =>
      `<div class="lb-row${r.id === emp.id ? " is-me" : ""}">
        <span class="lb-place">${medal(r.place)}</span>
        <span class="lb-who">${r.name}${r.id === emp.id ? '<span class="lb-you">ты</span>' : ""}<span class="lb-title-inline">${r.title}</span></span>
        <span class="lb-lvl">LVL ${r.lvl}</span>
        <span class="lb-stars" title="${r.starsInLevel}/10 звёзд до следующего уровня">${"★".repeat(r.starsInLevel)}${"☆".repeat(10 - r.starsInLevel)}</span>
        <span class="lb-avg">${r.avg.toFixed(1)}</span>
        <span class="lb-awards" title="Наград всего: ${r.awards}">${r.glyphs.join("")}<b>${r.awards}</b></span>
      </div>`).join("");
    const me = rows.find((r) => r.id === emp.id);
    const tag = (r) => (r ? `${r.short} ${r.name.split(" ")[0].slice(0, 1)}.` : "—");
    let hint;
    if (!me) {
      hint = `<div class="lb-hint">Ты вне турнира: по должности KPI не ведётся — зато вся команда перед тобой.</div>`;
    } else if (me.place === 1) {
      hint = `<div class="lb-hint lb-hint-top">🔥 Ты лидер турнира. Отрыв от ${tag(rows[1])} — ${me.gapDown} ${plural(me.gapDown)}. Держи темп: за тобой охотятся.</div>`;
    } else {
      const up = rows[me.place - 2], down = rows[me.place];
      const back = me.gapUp > 0
        ? `До ${me.place - 1}-го места (${tag(up)}) — ${me.gapUp} ${plural(me.gapUp)}.`
        : `По очкам ты вровень с ${tag(up)}, выше решает средний KPI (${up.avg.toFixed(1)} против твоих ${me.avg.toFixed(1)}).`;
      const ahead = down ? ` Отрыв от ${me.place + 1}-го (${tag(down)}) — ${me.gapDown} ${plural(me.gapDown)}.` : " Ты замыкаешь таблицу — вперёд.";
      hint = `<div class="lb-hint">Ты #${me.place} из ${rows.length}. ${back}${ahead}</div>`;
    }
    el.innerHTML = `<div class="lb-podium-wrap">${podium}</div><div class="lb-list">${list}</div>${hint}<div class="lb-legend">Очки = LVL × 10 + ⭐ · 10 ⭐ = +1 LVL · награды копятся за все месяцы. Один уровень — за стабильность и рост KPI.</div>`;
  }
  function pluralM(n) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return "месяцев";
    if (b > 1 && b < 5) return "месяца";
    if (b === 1) return "месяц";
    return "месяцев";
  }
  function plural(n) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return "очков";
    if (b > 1 && b < 5) return "очка";
    if (b === 1) return "очко";
    return "очков";
  }

  renderLeaderboard();
  renderMonth(selected);
  otp.reveal(document);
})();
