/* Логика персональной страницы сотрудника */
(function () {
  "use strict";
  const D = window.OTP_EMP;
  const root = document.getElementById("root");
  const emp = D && D.employee;
  if (!emp) { root.innerHTML = '<p class="muted" style="padding:60px 0">Страница недоступна.</p>'; return; }

  const MKEYS = otp.MKEYS;
  const hasKpi = !!emp.current;
  document.title = `Мои результаты · ${emp.shortName} | Моя команда ОТП`;

  const arrow = (a, b) => (a > b ? { s: "▲", c: "up" } : a < b ? { s: "▼", c: "down" } : { s: "▬", c: "flat" });
  const trend = otp.trend(emp);
  const trendIcon = trend.dir === "up" ? "trend-up" : trend.dir === "down" ? "trend-down" : "minus";

  /* ---------- метрики-плитки ---------- */
  const prevMonth = emp.history[emp.history.length - 2];
  const tiles = hasKpi ? MKEYS.map((k) => {
    const m = D.metrics[k];
    const d = arrow(emp.current[k], prevMonth[k]);
    const dc = d.c === "up" ? "good" : d.c === "down" ? "bad" : "muted";
    return `
      <div class="metric-tile">
        <span class="ic" style="background:${otp.hexA(m.color, 0.12)};color:${m.color}"><i class="${m.icon}"></i></span>
        <div style="flex:1">
          <div class="name">${m.label}</div>
          <div class="val" style="color:${m.color}">${emp.current[k]}<span style="font-size:.8rem;color:var(--${dc})"> ${d.s}</span></div>
        </div>
      </div>`;
  }).join("") : "";

  /* ---------- награды (геймификация) ---------- */
  const awards = (emp.awards || []).map((a) => `
      <div class="award" style="border-color:${otp.hexA(a.color, 0.35)}">
        <i class="${a.icon}" style="color:${a.color}"></i>
        <div><div class="a-t">${a.title}</div><div class="a-r">${a.reason}</div></div>
      </div>`).join("");

  /* ---------- бонусы (достижения) ---------- */
  const lastBonus = (emp.history[emp.history.length - 1] || {}).bonus;
  const bonuses = (emp.bonuses && emp.bonuses.length)
    ? emp.bonuses.map((b) => {
        const tks = (b.text.match(/HELP-\d+/g) || []).map(t => `<a href="https://jira.centrofinans.ru/browse/${t}" target="_blank" rel="noopener">${t}</a>`).join(" ");
        return `
        <div class="bonus-item">
          <span class="amt">+${otp.fmt(b.amount)} ₽</span>
          <div><div class="d">${b.text}</div>${tks ? `<div class="v">${tks}</div>` : ""}</div>
        </div>`;
      }).join("")
    : '<p class="muted">Достижений за период нет.</p>';

  /* ---------- сильные стороны / зоны роста ---------- */
  const strengths = (emp.strengths || []).map((s) => `
      <div class="plus-item"><i class="ph ph-check-circle"></i><div><div class="b">${s[0]}</div><div class="d">${s[1]}</div></div></div>`).join("");
  const growth = (emp.growth || []).map((g) => {
    const tks = Array.isArray(g.ticket) ? g.ticket : (g.ticket && g.ticket !== "—" ? [g.ticket] : []);
    const links = tks.map(t => `<a href="https://jira.centrofinans.ru/browse/${t}" target="_blank" rel="noopener">${t}</a>`).join(" ");
    return `
      <div class="minus-item"><i class="ph ph-warning-circle"></i><div>
        <div class="b">${g.problem}</div>
        ${g.effect ? `<div class="d">${g.effect}${g.cause && g.cause !== "—" ? " → " + g.cause : ""}</div>` : ""}
        ${links ? `<div class="d" style="font-family:var(--font-mono)">${links}</div>` : ""}
      </div></div>`;
  }).join("");

  /* ---------- план (рекомендации с фактами) ---------- */
  const plan = (emp.recommendations && emp.recommendations.length)
    ? emp.recommendations.map((r, i) => `
        <div class="step" data-reveal>
          <div class="n">0${i + 1}</div>
          <div>
            <div class="act">${r.action}</div>
            <div class="res">→ ${r.result}</div>
            ${r.fact ? `<div class="fact-line"><i class="ph ph-quotes"></i> ${r.fact}</div>` : ""}
            <span class="dl">до ${r.deadline}</span>
          </div>
        </div>`).join("")
    : '<p class="muted">План роста не задан.</p>';

  /* ---------- литература / ссылки ---------- */
  const books = (emp.literature || []).map((b) => `
      <a class="book" href="${b.url}" target="_blank" rel="noopener">
        <span class="ic"><i class="ph ph-book-open"></i></span>
        <div style="flex:1"><div class="t">${b.title}</div><div class="a">${b.author}</div><div class="why">${b.why}</div></div>
        <span class="type">${b.type}</span>
      </a>`).join("");
  const links = (emp.links || []).map((l) => `
      <a class="book" href="${l.url}" ${l.url !== "#" ? 'target="_blank" rel="noopener"' : ""}>
        <span class="ic"><i class="${l.icon}"></i></span>
        <div class="t" style="font-weight:600">${l.label}</div>
      </a>`).join("");

  const statusBadge = emp.status === "left"
    ? '<span class="badge badge-left"><i class="ph ph-archive"></i> ' + (emp.statusNote || "выбыл") + '</span>'
    : '<span class="badge badge-good"><i class="ph ph-check"></i> в команде</span>';

  const rankTxt = hasKpi ? `место #${emp.rank} из ${D.totalEmployees}` : "руководитель — KPI не ведётся";
  const starsBadge = hasKpi && emp.stars > 0
    ? `<span class="badge" style="color:var(--warn)"><i class="ph-fill ph-star"></i> +${emp.stars} ${emp.stars === 1 ? "звезда" : "звёзды"} за рост</span>` : "";

  /* ---------- сборка ---------- */
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

    ${awards ? `<section style="padding:6px 0 0"><div class="awards-row" data-stagger>${awards}</div></section>` : ""}

    ${hasKpi ? `<section style="padding:18px 0 0"><div class="metric-grid" data-stagger>${tiles}</div></section>`
             : `<div class="demo-banner" data-reveal style="margin-top:18px;border-color:rgba(34,211,238,.28);color:var(--accent-2)"><i class="ph ph-crown"></i> Для руководителя KPI не ведётся — оцениваются бонусы, достижения и работа всей команды.</div>`}

    ${hasKpi ? `
    <div class="sub-head" data-reveal><i class="ph ph-chart-line"></i> Динамика по метрикам</div>
    <div class="grid grid-2" style="margin-bottom:20px">
      <div class="card" data-reveal>
        <h3 style="margin-bottom:4px">Профиль (радар)</h3>
        <p class="tt-hint" style="margin-bottom:16px">5 метрик за ${D.meta.updated}</p>
        <div class="chart-box"><canvas id="chart-radar"></canvas></div>
      </div>
      <div class="card" data-reveal>
        <h3 style="margin-bottom:4px">Бонусы по месяцам</h3>
        <p class="tt-hint" style="margin-bottom:16px">наведи для суммы</p>
        <div class="chart-box"><canvas id="chart-bonus"></canvas></div>
      </div>
    </div>
    <div class="card" data-reveal style="margin-bottom:20px">
      <h3 style="margin-bottom:4px">Все метрики в динамике</h3>
      <p class="tt-hint" style="margin-bottom:16px">кликни по метрике в легенде, чтобы скрыть/показать</p>
      <div class="chart-box lg"><canvas id="chart-lines"></canvas></div>
    </div>` : `
    <div class="sub-head" data-reveal><i class="ph ph-chart-line"></i> Бонусы по месяцам</div>
    <div class="card" data-reveal style="margin-bottom:20px">
      <p class="tt-hint" style="margin-bottom:16px">наведи для суммы</p>
      <div class="chart-box"><canvas id="chart-bonus"></canvas></div>
    </div>`}

    <div class="sub-head" data-reveal><i class="ph ph-currency-rub"></i> Достижения и бонусы${lastBonus ? `<span class="badge" style="margin-left:8px">${otp.rub(lastBonus)}</span>` : ""}</div>
    <div data-stagger>${bonuses}</div>

    <div class="sub-head" data-reveal><i class="ph ph-scales"></i> Сильные стороны и зоны роста</div>
    <div class="two-col">
      <div class="card" data-reveal>
        <h3 style="margin-bottom:12px"><span style="color:var(--good)">✅</span> Что получается круто</h3>
        ${strengths || '<p class="muted">—</p>'}
      </div>
      <div class="card" data-reveal>
        <h3 style="margin-bottom:12px"><span style="color:var(--warn)">⚠️</span> Зоны роста</h3>
        ${growth || '<p class="muted">Замечаний нет — молодец!</p>'}
      </div>
    </div>

    <div class="sub-head" data-reveal><i class="ph ph-target"></i> План роста</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${plan}</div>

    <div class="sub-head" data-reveal><i class="ph ph-book-open"></i> Полезная литература и ресурсы</div>
    <div class="two-col">
      <div class="list-col" data-stagger>${books}</div>
      <div class="list-col" data-stagger>${links}</div>
    </div>

    <section style="padding:28px 0 10px">
      <div class="personal-note" data-reveal>💬 ${emp.personal}</div>
    </section>
  `;

  /* ---------- графики ---------- */
  if (window.Chart) {
    const bonusData = emp.history.map((h) => h.bonus);
    new Chart(document.getElementById("chart-bonus"), {
      type: "bar",
      data: {
        labels: D.months,
        datasets: [{
          label: "Бонус", data: bonusData,
          backgroundColor: "#0e7490", hoverBackgroundColor: "#22d3ee",
          borderRadius: 6, maxBarThickness: 26,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { callback: (v) => otp.fmt(v) + " ₽" } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => otp.rub(c.parsed.y) } } },
      },
    });

    if (hasKpi) {
      new Chart(document.getElementById("chart-radar"), {
        type: "radar",
        data: {
          labels: MKEYS.map((k) => D.metrics[k].label),
          datasets: [{
            label: emp.shortName,
            data: MKEYS.map((k) => emp.current[k]),
            borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.16)",
            borderWidth: 2, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: "#22d3ee",
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false, backdropColor: "transparent" }, grid: { color: "rgba(255,255,255,.08)" }, angleLines: { color: "rgba(255,255,255,.08)" }, pointLabels: { color: "#8b96a8", font: { size: 12 } } } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.r}` } } },
        },
      });

      new Chart(document.getElementById("chart-lines"), {
        type: "line",
        data: {
          labels: D.months,
          datasets: MKEYS.map((k) => ({
            label: D.metrics[k].label,
            data: emp.history.map((h) => h[k]),
            borderColor: D.metrics[k].color,
            backgroundColor: D.metrics[k].color,
            tension: 0.35, borderWidth: 2, spanGaps: true,
            pointRadius: 3, pointHoverRadius: 5, pointHitRadius: 8,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            y: { min: 0, max: 10, grid: { color: "rgba(255,255,255,.05)" }, ticks: { stepSize: 2 } },
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
          },
          plugins: { legend: { position: "top" } },
        },
      });
    }
  }

  otp.reveal(document);
})();
