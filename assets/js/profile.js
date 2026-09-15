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
  let selected = history.length - 1;
  document.title = `Мои результаты · ${emp.shortName}`;

  const trend = otp.trend(emp);
  const trendIcon = trend.dir === "up" ? "trend-up" : trend.dir === "down" ? "trend-down" : "minus";

  const awards = (emp.awards || []).map((a) =>
    `<div class="award" style="border-color:${otp.hexA(a.color, 0.35)}"><i class="${a.icon}" style="color:${a.color}"></i><div><div class="a-t">${a.title}</div><div class="a-r">${a.desc}</div></div></div>`).join("");
  const earnedIds = new Set((emp.awards || []).map((a) => a.id));
  const glossary = (D.awardsCatalog || []).map((g) => {
    const earned = earnedIds.has(g.id);
    return `<div class="award ${earned ? "earned" : "locked"}" style="border-color:${earned ? otp.hexA(g.color, 0.4) : "var(--border)"}"><i class="${g.icon}" style="color:${earned ? g.color : "var(--faint)"}"></i><div><div class="a-t">${g.title} ${earned ? '<span class="got">· получена</span>' : ""}</div><div class="a-r">${g.desc}</div></div></div>`;
  }).join("");

  const statusBadge = emp.status === "left"
    ? '<span class="badge badge-left"><i class="ph ph-archive"></i> ' + (emp.statusNote || "выбыл") + '</span>'
    : '<span class="badge badge-good"><i class="ph ph-check"></i> в команде</span>';
  const rankTxt = hasKpi ? `место #${emp.rank} из ${D.totalEmployees}` : "руководитель — KPI не ведётся";
  const starsBadge = hasKpi && emp.stars > 0 ? `<span class="badge" style="color:var(--warn)"><i class="ph-fill ph-star"></i> +${emp.stars} ${emp.stars === 1 ? "звезда" : "звёзды"} за рост</span>` : "";

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
    selected = i;
    const cur = history[i];
    const hasMk = cur && MKEYS.every((k) => cur[k] != null);

    document.querySelectorAll(".month-tab").forEach((t, idx) => t.classList.toggle("active", idx === i));
    document.querySelectorAll(".month-label").forEach((el) => (el.textContent = cur.month));

    // плитки метрик
    const tilesEl = document.getElementById("metric-grid");
    tilesEl.innerHTML = hasMk
      ? MKEYS.map((k) => {
          const m = D.metrics[k];
          const d = metricDelta(i, k);
          const dc = d.c === "up" ? "good" : d.c === "down" ? "bad" : "muted";
          return `<div class="metric-tile"><span class="ic" style="background:${otp.hexA(m.color, 0.12)};color:${m.color}"><i class="${m.icon}"></i></span><div style="flex:1"><div class="name">${m.label}</div><div class="val" style="color:${m.color}">${cur[k]}<span style="font-size:.8rem;color:var(--${dc})"> ${d.s}</span></div></div></div>`;
        }).join("")
      : `<div class="demo-banner" style="margin:0;grid-column:1/-1;border-color:rgba(34,211,238,.28);color:var(--accent-2)"><i class="ph ph-info"></i> За ${cur.month} KPI не зафиксирован.</div>`;

    // бонусы
    const bt = cur.bonus;
    document.getElementById("bonus-total").innerHTML = bt != null ? `<span class="badge">${otp.rub(bt)}</span>` : "";
    const money = cur.money || [];
    document.getElementById("bonus-items").innerHTML = money.length
      ? money.map((b) => `<div class="bonus-item"><span class="amt">+${otp.fmt(b.amount)} ₽</span><div><div class="d">${b.text}</div>${tickets(b.text).length ? `<div class="v">${tLinks(b.text)}</div>` : ""}</div></div>`).join("")
      : `<p class="muted">За ${cur.month} детализация бонуса не указана.</p>`;

    // сильные стороны / зоны роста
    const pos = cur.positives || [];
    const strengths = (pos.length ? pos.map((p) => [p.text, "Отмечено руководителем"]) : (emp.strengths || []));
    document.getElementById("strengths-list").innerHTML = (strengths.length ? strengths : [])
      .map((s) => `<div class="plus-item"><i class="ph ph-check-circle"></i><div><div class="b">${s[0]}</div><div class="d">${s[1]}</div></div></div>`).join("") || '<p class="muted">—</p>';
    const neg = cur.negatives || [];
    document.getElementById("growth-list").innerHTML = neg.length
      ? neg.map((g) => `<div class="minus-item"><i class="ph ph-warning-circle"></i><div><div class="b">${g.text}</div>${tickets(g.text).length ? `<div class="d" style="font-family:var(--font-mono)">${tLinks(g.text)}</div>` : ""}</div></div>`).join("")
      : '<p class="muted">Замечаний нет — молодец!</p>';

    // рекомендации
    const recs = cur.recommendations || [];
    document.getElementById("plan-grid").innerHTML = recs.length
      ? recs.map((r, n) => `<div class="step"><div class="n">0${n + 1}</div><div><div class="act">${r.action}</div><div class="res">→ ${r.result}</div>${r.fact ? `<div class="fact-line"><i class="ph ph-quotes"></i> ${r.fact}</div>` : ""}<span class="dl">до ${r.deadline}</span></div></div>`).join("")
      : '<p class="muted">За месяц замечаний не было — продолжай в том же духе!</p>';

    // радар + подсветка бонусного столбца
    if (radarChart) {
      radarChart.data.datasets[0].data = hasMk ? MKEYS.map((k) => cur[k]) : [0, 0, 0, 0, 0];
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
  const links = (emp.links || []).map((l) => {
    if (l.url && l.url !== "#") {
      return `<a class="book" href="${l.url}" target="_blank" rel="noopener"><span class="ic"><i class="${l.icon}"></i></span><div class="t" style="font-weight:600">${l.label}</div><span class="type">ссылка</span></a>`;
    }
    return `<a class="book" href="#" data-internal="${l.label}"><span class="ic"><i class="${l.icon}"></i></span><div class="t" style="font-weight:600">${l.label}</div><span class="type">внутр.</span></a>`;
  }).join("");

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
            <span class="badge"><i class="ph ph-trophy"></i> ${rankTxt}</span>
            ${hasKpi ? `<span class="badge"><i class="ph ph-${trendIcon}"></i> тренд ${trend.delta > 0 ? "+" + trend.delta : trend.delta} за год</span>` : ""}
            ${starsBadge}
          </div>
        </div>
        <div style="text-align:center;min-width:120px">
          <div style="font-family:var(--font-mono);font-size:.8rem;color:var(--muted)">средний KPI</div>
          <div style="font-family:var(--font-mono);font-size:3rem;font-weight:700;color:var(--accent-2);line-height:1">${hasKpi ? emp.avg.toFixed(1) : "—"}</div>
        </div>
      </div>
    </section>

    <section style="padding:6px 0 0">
      ${awards ? `<div class="awards-row" data-stagger>${awards}</div>` : ""}
      <div style="margin-top:14px">
        <button type="button" class="btn btn-ghost" id="glossary-toggle" style="font-size:.85rem"><i class="ph ph-book-bookmark"></i> Справочник наград</button>
      </div>
      <div id="glossary" class="glossary" style="display:none">${glossary}</div>
    </section>

    <section style="padding:20px 0 0">
      <div class="month-tabs" id="month-tabs" data-reveal>${history.map((h, i) => `<button class="month-tab" data-i="${i}">${h.month}</button>`).join("")}</div>
    </section>

    <section style="padding:14px 0 0"><div class="metric-grid" id="metric-grid" data-stagger></div></section>

    <div class="sub-head" data-reveal><i class="ph ph-chart-line"></i> Динамика по метрикам</div>
    <div class="grid grid-2" style="margin-bottom:20px">
      <div class="card" data-reveal>
        <h3 style="margin-bottom:4px">Профиль за <span class="month-label">…</span></h3>
        <p class="tt-hint" style="margin-bottom:16px">5 метрик за выбранный месяц</p>
        <div class="chart-box"><canvas id="chart-radar"></canvas></div>
      </div>
      <div class="card" data-reveal>
        <h3 style="margin-bottom:4px">Бонусы по месяцам</h3>
        <p class="tt-hint" style="margin-bottom:16px">кликни по столбцу — увидишь, за что</p>
        <div class="chart-box"><canvas id="chart-bonus"></canvas></div>
      </div>
    </div>
    <div class="card" data-reveal style="margin-bottom:20px">
      <h3 style="margin-bottom:4px">Все метрики в динамике</h3>
      <p class="tt-hint" style="margin-bottom:16px">кликни по метрике в легенде, чтобы скрыть/показать</p>
      <div class="chart-box lg"><canvas id="chart-lines"></canvas></div>
    </div>

    <div class="sub-head" data-reveal><i class="ph ph-currency-rub"></i> Достижения и бонусы за <span class="month-label">…</span> <span id="bonus-total"></span></div>
    <div id="bonus-items" data-stagger></div>

    <div class="sub-head" data-reveal><i class="ph ph-scales"></i> Сильные стороны и зоны роста за <span class="month-label">…</span></div>
    <div class="two-col">
      <div class="card" data-reveal><h3 style="margin-bottom:12px"><span style="color:var(--good)">✅</span> Что получается круто</h3><div id="strengths-list"></div></div>
      <div class="card" data-reveal><h3 style="margin-bottom:12px"><span style="color:var(--warn)">⚠️</span> Зоны роста</h3><div id="growth-list"></div></div>
    </div>

    <div class="sub-head" data-reveal><i class="ph ph-target"></i> План роста на <span class="month-label">…</span></div>
    <div class="grid" id="plan-grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"></div>

    <div class="sub-head" data-reveal><i class="ph ph-book-open"></i> Полезная литература и ресурсы</div>
    <div class="two-col">
      <div class="list-col" data-stagger>${books}</div>
      <div class="list-col" data-stagger>${links}</div>
    </div>

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
  document.querySelectorAll("a[data-internal]").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      otp.toast(`«${a.dataset.internal}» — внутренний ресурс команды. Ссылку выдаст руководитель.`);
    });
  });

  /* ---------- графики ---------- */
  let radarChart = null, bonusChart = null;
  if (window.Chart) {
    if (hasKpi) {
      radarChart = new Chart(document.getElementById("chart-radar"), {
        type: "radar",
        data: {
          labels: MKEYS.map((k) => D.metrics[k].label),
          datasets: [{ label: emp.shortName, data: MKEYS.map((k) => 0), borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.16)", borderWidth: 2, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: "#22d3ee" }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false, backdropColor: "transparent" }, grid: { color: "rgba(255,255,255,.08)" }, angleLines: { color: "rgba(255,255,255,.08)" }, pointLabels: { color: "#8b96a8", font: { size: 12 } } } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.r}` } } },
        },
      });
    }
    bonusChart = new Chart(document.getElementById("chart-bonus"), {
      type: "bar",
      data: {
        labels: D.months,
        datasets: [{ label: "Бонус", data: history.map((h) => h.bonus), backgroundColor: "#0e7490", hoverBackgroundColor: "#22d3ee", borderRadius: 6, maxBarThickness: 28 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (e, els) => { if (els && els.length) renderMonth(els[0].index); },
        scales: {
          y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { callback: (v) => otp.fmt(v) + " ₽" } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => otp.rub(c.parsed.y) } } },
      },
    });
    new Chart(document.getElementById("chart-lines"), {
      type: "line",
      data: {
        labels: D.months,
        datasets: MKEYS.map((k) => ({ label: D.metrics[k].label, data: history.map((h) => h[k]), borderColor: D.metrics[k].color, backgroundColor: D.metrics[k].color, tension: 0.35, borderWidth: 2, spanGaps: true, pointRadius: 3, pointHoverRadius: 5, pointHitRadius: 8 })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        scales: { y: { min: 0, max: 10, grid: { color: "rgba(255,255,255,.05)" }, ticks: { stepSize: 2 } }, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } } },
        plugins: { legend: { position: "top" } },
      },
    });
  }

  renderMonth(selected);
  otp.reveal(document);
})();
