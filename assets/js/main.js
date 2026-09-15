/* Логика главного дашборда «Моя команда ОТП» */
(function () {
  "use strict";
  const D = window.OTP_DATA;
  if (!D) return console.error("OTP_DATA не загружен");
  const MKEYS = ["quality", "learnability", "initiative", "engagement", "discipline"];
  const ACTIVE = D.employees.filter((e) => e.status === "active");
  const $ = (s) => document.querySelector(s);

  function initials(name) {
    const p = name.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "")).toUpperCase();
  }

  /* ---------- hero-статистика ---------- */
  const rated = D.employees.filter((e) => e.avg != null);
  const teamAvgNow = +(rated.reduce((s, e) => s + e.avg, 0) / rated.length).toFixed(2);
  const ranked = [...D.employees].sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  const leader = ranked[0];
  const lastBonus = D.employees.reduce((s, e) => s + (e.history[e.history.length - 1].bonus || 0), 0);

  $("#meta-count").textContent = D.employees.length;
  $("#meta-month").textContent = D.meta.updated;
  $("#stat-avg").textContent = teamAvgNow.toFixed(1);
  $("#stat-top").textContent = leader.shortName;
  $("#stat-bonus").textContent = otp.rub(lastBonus);
  $("#foot-updated").textContent = D.meta.updated;
  const fm = $("#foot-month"); if (fm) fm.textContent = D.meta.updated;

  /* ---------- leaderboard ---------- */
  const lb = $("#leaderboard");
  lb.innerHTML = ranked
    .map((e, i) => {
      const hasKpi = e.avg != null;
      const t = otp.trend(e);
      const arrow = t.dir === "up" ? "▲" : t.dir === "down" ? "▼" : "▬";
      const cls = t.dir === "up" ? "up" : t.dir === "down" ? "down" : "flat";
      const rankCls = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
      const medal = hasKpi ? (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1) : "👑";
      const leftBadge = e.status === "left" ? '<span class="badge badge-left">выбыл</span>' : "";
      const stars = hasKpi && e.stars > 0 ? `<span class="lb-trend up">${"★".repeat(Math.min(e.stars, 5))}</span>` : "";
      const trendCell = hasKpi
        ? `<span class="lb-trend ${cls}">${arrow} ${t.delta > 0 ? "+" + t.delta : t.delta}</span>`
        : '<span class="badge" style="font-size:.68rem"><i class="ph ph-crown"></i> руководитель</span>';
      return `
        <a class="lb-row" href="team/${e.slug}/index.html" data-reveal>
          <span class="lb-rank ${rankCls}">${medal}</span>
          <span class="lb-name">${e.fullName} ${leftBadge} ${stars}<small>${e.role}</small></span>
          ${trendCell}
          <span class="lb-avg">${hasKpi ? e.avg.toFixed(1) : "—"}</span>
        </a>`;
    })
    .join("");

  /* ---------- карточки сотрудников ---------- */
  const grid = $("#emp-grid");
  grid.innerHTML = D.employees
    .map((e) => {
      const hasKpi = e.avg != null;
      const mini = hasKpi
        ? MKEYS.map((k) => {
            const m = D.metrics[k];
            return `<div class="mm"><i class="${m.icon}" style="color:${m.color}"></i><div class="v">${e.current[k]}</div><div class="l">${m.label.split(" ")[0]}</div></div>`;
          }).join("")
        : '<div class="mm" style="grid-column:1/-1;color:var(--muted);padding:12px"><i class="ph ph-crown"></i> KPI не ведётся — руководитель</div>';
      const leftTag = e.status === "left" ? '<span class="badge badge-left" style="font-size:.68rem">выбыл</span>' : "";
      const awardTop = (e.awards && e.awards[0]) ? `<span class="badge" style="font-size:.66rem;color:${e.awards[0].color};border-color:${otp.hexA(e.awards[0].color,0.3)}"><i class="${e.awards[0].icon}"></i> ${e.awards[0].title}</span>` : "";
      const stars = hasKpi && e.stars > 0 ? `<span style="color:var(--warn);font-size:.8rem;letter-spacing:2px">${"★".repeat(Math.min(e.stars, 5))}</span>` : "";
      return `
        <a class="card emp-card" href="team/${e.slug}/index.html" data-reveal>
          <div class="top">
            <div style="display:flex;gap:12px;align-items:center">
              <span class="avatar">${initials(e.fullName)}</span>
              <div>
                <h3>${e.shortName}</h3>
                <div class="role">${e.role}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div class="avg">${hasKpi ? e.avg.toFixed(1) : "—"}</div>
              ${leftTag}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;min-height:22px">${awardTop} ${stars}</div>
          <div class="mini-metrics">${mini}</div>
        </a>`;
    })
    .join("");

  /* раскрыть контент сразу, независимо от инициализации графиков */
  otp.reveal(document);

  /* ---------- графики ---------- */
  if (!window.Chart) return;

  // 1. средний KPI команды
  const KPI_EMPLOYEES = D.employees.filter((e) => e.current != null);
  const teamAvgSeries = D.months.map((_, i) => {
    const vals = KPI_EMPLOYEES.map((e) => otp.avgOf(e.history[i])).filter((v) => v > 0);
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  });
  new Chart($("#chart-team-avg"), {
    type: "line",
    data: {
      labels: D.months,
      datasets: [{
        label: "Средний KPI",
        data: teamAvgSeries,
        borderColor: "#22d3ee", borderWidth: 2.5, tension: 0.4,
        pointRadius: 3, pointHoverRadius: 6,
        pointBackgroundColor: "#22d3ee", pointBorderColor: "#0d1219", pointBorderWidth: 2,
        fill: true,
        backgroundColor: (c) => otp.lineGradient(c.chart, "#22d3ee"),
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      scales: {
        y: { min: 0, max: 10, grid: { color: "rgba(255,255,255,.05)" }, ticks: { stepSize: 2 } },
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `Средний KPI: ${c.parsed.y}` } },
      },
    },
  });

  // 2. сумма бонусов
  const bonusSeries = D.months.map((_, i) =>
    D.employees.reduce((s, e) => s + (e.history[i].bonus || 0), 0));
  new Chart($("#chart-bonus"), {
    type: "bar",
    data: {
      labels: D.months,
      datasets: [{
        label: "Бонусы",
        data: bonusSeries,
        backgroundColor: "#0e7490",
        hoverBackgroundColor: "#22d3ee",
        borderRadius: 6, maxBarThickness: 26,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { callback: (v) => otp.fmt(v) + " ₽" } },
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => otp.rub(c.parsed.y) } },
      },
    },
  });

  // 3. радар (с выбором сотрудника)
  const teamProfile = {};
  const ratedEmployees = ACTIVE.filter((e) => e.current != null);
  MKEYS.forEach((k) => {
    teamProfile[k] = +(ratedEmployees.reduce((s, e) => s + e.current[k], 0) / ratedEmployees.length).toFixed(1);
  });

  const sel = $("#radar-select");
  sel.innerHTML =
    `<option value="__team__">Среднее по команде</option>` +
    D.employees.filter((e) => e.current != null)
      .map((e) => `<option value="${e.id}">${e.shortName} ${e.fullName.split(" ")[0]}</option>`).join("");

  let radarChart = null;
  function drawRadar() {
    const v = sel.value;
    const src = v === "__team__" ? teamProfile : (otp.byId(v)?.current || teamProfile);
    const label = v === "__team__" ? "Среднее по команде" : otp.byId(v).fullName;
    const data = MKEYS.map((k) => src[k]);
    if (radarChart) radarChart.destroy();
    radarChart = new Chart($("#chart-radar"), {
      type: "radar",
      data: {
        labels: MKEYS.map((k) => D.metrics[k].label),
        datasets: [{
          label, data,
          borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.16)",
          borderWidth: 2, pointRadius: 4, pointHoverRadius: 7,
          pointBackgroundColor: "#22d3ee",
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          r: {
            min: 0, max: 10, ticks: { stepSize: 2, display: false, backdropColor: "transparent" },
            grid: { color: "rgba(255,255,255,.08)" }, angleLines: { color: "rgba(255,255,255,.08)" },
            pointLabels: { color: "#8b96a8", font: { size: 12 } },
          },
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.r}` } } },
      },
    });
  }
  sel.addEventListener("change", drawRadar);
  drawRadar();

  /* раскрыть динамически добавленный контент */
  otp.reveal(document);
})();
