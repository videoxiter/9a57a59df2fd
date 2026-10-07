/* Логика дашборда «Моя команда ОТП».
   Один файл на все страницы: каждый блок срабатывает только если на странице есть его контейнер.

   index.html        — Моя команда · Кто лучше · Заявки · Рейтинг по KPI
   dynamics/         — Динамика команды (графики)
   people/           — Специалисты (карточки)
   duties/           — График отдела (смены и отпуска)
   development/      — Развитие отдела
*/
(function () {
  "use strict";
  const D = window.OTP_DATA;
  if (!D) return console.error("OTP_DATA не загружен");
  const bySlug = (s) => (D.employees || []).find((e) => e.slug === s) || null;
  const bySurname = (fio) => (D.employees || []).find((e) => (e.fullName || "").split(" ")[0] === String(fio).split(" ")[0]) || null;
  const MKEYS = ["quality", "learnability", "initiative", "engagement", "discipline"];
  const ACTIVE = D.employees.filter((e) => e.status === "active");
  const $ = (s) => document.querySelector(s);
  const WD_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const WD_FULL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const MON_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const isoOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const addDays = (dt, n) => { const d = new Date(dt.getTime()); d.setDate(d.getDate() + n); return d; };
  const surname = (f) => String(f || "").split(" ")[0].toLowerCase().replace("ё", "е");
  const samePerson = (a, b) => !!a && !!b && surname(a) === surname(b);

  /* ---------- накопленные часы ---------- */
  function hoursOfReq(r) {
    if (r.type === "dayoff") return r.hours || 8;
    const p = (x) => { const m = /^(\d{1,2}):(\d{2})$/.exec(x || ""); return m ? +m[1] + +m[2] / 60 : null; };
    const a = p(r.from), b = p(r.to);
    return a == null || b == null ? 0 : Math.max(0, Math.round((b - a) * 10) / 10);
  }
  function balanceOf(emp, reqs) {
    if (!emp) return null;
    let plus = 0, minus = 0;
    for (const r of reqs) {
      if (r.empSlug !== emp.slug || r.status !== "approved") continue;
      const h = hoursOfReq(r);
      if (r.type === "overtime") plus += h;
      else if (r.type === "leave" || r.type === "dayoff") {
        const forced = !!r.forceDeduct;                                  // решение руководителя сильнее правила
        const plain = r.type === "leave" && !r.noDeduct && !emp.no_deduct;
        if (forced || plain) minus += h;
      }
    }
    return { balance: Math.round(((emp.hours_base || 0) + plus - minus) * 10) / 10 };
  }
  const fmtH = (h) => (Math.round(h * 10) / 10).toString().replace(".", ",") + " ч";
  function hoursChip(emp, reqs) {
    const b = balanceOf(emp, reqs);
    if (!b) return "";
    return `<span class="hr-hours ${b.balance >= 0 ? "pos" : "neg"}" title="накопленная переработка или долг по часам">
      <i class="ph-bold ph-hourglass-high"></i> ${b.balance >= 0 ? "+" : "−"}${fmtH(Math.abs(b.balance))} ${b.balance >= 0 ? "накоплено" : "должен"}</span>`;
  }
  async function hydrateHours() {
    const reqs = (window.OTP_CLOUD ? await window.OTP_CLOUD.all() : null) || [];
    document.querySelectorAll("[data-hours], [data-hoursfio]").forEach((el) => {
      const emp = bySlug(el.dataset.hours) || bySurname(el.dataset.hoursfio || "");
      if (emp) el.innerHTML = hoursChip(emp, reqs);
    });
    const now = new Date();
    document.querySelectorAll("[data-today]").forEach((el) => {
      const emp = bySlug(el.dataset.today);
      const st = emp ? todayState(emp, now, reqs) : null;
      el.innerHTML = st ? `<span class="td-chip k-${st.kind}" title="Линия, смена и отсутствия на сегодня"><i class="ph-bold ${tdIcon(st.kind)}"></i> ${st.text}</span>` : "";
    });
  }
  const tdIcon = (k) => k === "shift" ? "ph-clock" : k === "vacation" ? "ph-airplane-tilt"
    : k === "leave" ? "ph-door-open" : k === "dayoff" ? "ph-calendar-minus" : "ph-moon";
  window.otpRefreshHours = hydrateHours;      // чтобы блок согласования заявок обновил часы сразу после решения

  /* ---------- кто на какой линии и кто отсутствует (общее для дашборда) ---------- */
  const SCH = D.schedule || null;
  const isoDate = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  function monthOf(dt) {
    if (!SCH) return null;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    return SCH.months[key] || null;
  }
  function shiftOf(fio, dt) {
    const m = monthOf(dt);
    const days = m && m.shifts ? m.shifts[fio] : null;
    return days ? days[String(dt.getDate())] || null : null;
  }
  function lineOf(fio, dt) {
    const m = monthOf(dt);
    if (!m || !m.lines || dt.getDay() === 0 || dt.getDay() === 6) return null;
    for (const [lid, info] of Object.entries(m.lines)) {
      const labels = info.labels || [];
      for (let i = 0; i < labels.length; i++) {
        if (!samePerson((info.weeks || [])[i], fio)) continue;
        const mm = /^(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})$/.exec(String(labels[i]).trim());
        if (!mm) continue;
        const y = dt.getFullYear();
        const from = new Date(y, +mm[2] - 1, +mm[1]);
        let to = new Date(y, +mm[4] - 1, +mm[3]);
        if (to < from) to = new Date(y + 1, +mm[4] - 1, +mm[3]);
        const d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        if (d0 >= from && d0 <= to) return { id: lid, title: info.title };
      }
    }
    return null;
  }
  function vacationOf(fio, dt) {
    if (!SCH || !SCH.vacations) return null;
    const y = String(dt.getFullYear());
    const iso = isoDate(dt);
    for (const [name, list] of Object.entries(SCH.vacations[y] || {})) {
      if (!samePerson(name, fio)) continue;
      for (const p of list || []) if (p.from <= iso && iso <= p.to) return p;
    }
    return null;
  }
  /* Что с сотрудником сегодня: заявка (увольнительная/отгул) -> отпуск -> смена/выходной */
  function todayState(emp, dt, reqs) {
    const iso = isoDate(dt);
    const list = (reqs || []).filter((r) => r.empSlug === emp.slug && r.status === "approved" &&
      (r.type === "leave" || r.type === "dayoff") && r.date === iso);
    const leave = list.find((r) => r.type === "leave");
    const dayoff = list.find((r) => r.type === "dayoff");
    if (leave) return { kind: "leave", text: `Увольнительная ${leave.from || ""}${leave.to ? "–" + leave.to : ""}`.trim(), hours: leave.hours };
    if (dayoff) return { kind: "dayoff", text: dayoff.date2 ? `Отгул за выходную смену ${dayoff.date2.slice(8, 10)}.${dayoff.date2.slice(5, 7)}` : "Отгул" };
    const vac = vacationOf(emp.fullName, dt);
    if (vac) {
      const to = new Date(vac.to + "T00:00:00");
      return { kind: "vacation", text: `Отпуск до ${to.getDate()} ${MON_GEN[to.getMonth()]}` };
    }
    const sh = shiftOf(emp.fullName, dt);
    if (!sh) return null;
    const ln = lineOf(emp.fullName, dt);
    const work = ["shift", "weekend", "duty", "extra"].includes(sh.kind);
    if (!work) return { kind: "off", text: sh.kind === "dayoff" ? sh.title : "Выходной" };
    return { kind: "shift", text: [ln ? ln.id : "", sh.title, sh.time || ""].filter(Boolean).join(" · "), sym: sh.sym };
  }

  function initials(name) {
    const p = name.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "")).toUpperCase();
  }

  const rated = D.employees.filter((e) => e.avg != null);
  const teamAvgNow = rated.length ? +(rated.reduce((s, e) => s + e.avg, 0) / rated.length).toFixed(2) : 0;
  const ranked = [...D.employees].sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  const leader = ranked[0];
  const lastBonus = D.employees.reduce((s, e) => s + (e.history[e.history.length - 1].bonus || 0), 0);

  /* ---------- шапка / подвал ---------- */
  if ($("#meta-count")) $("#meta-count").textContent = D.employees.length;
  if ($("#meta-month")) $("#meta-month").textContent = D.meta.updated;
  if ($("#stat-avg")) $("#stat-avg").textContent = teamAvgNow.toFixed(1);
  if ($("#stat-top")) $("#stat-top").textContent = leader.shortName;
  if ($("#stat-bonus")) $("#stat-bonus").textContent = otp.rub(lastBonus);
  const fm = $("#foot-month"); if (fm) fm.textContent = D.meta.updated;

  /* ---------- «Кто лучше»: лучший специалист месяца ---------- */
  const bestCard = $("#best-card");
  if (bestCard && leader && leader.avg != null) {
    const t = otp.trend(leader);
    const arrow = t.dir === "up" ? "▲" : t.dir === "down" ? "▼" : "▬";
    const metrics = MKEYS.map((k) => {
      const m = D.metrics[k];
      const v = leader.current ? leader.current[k] : "—";
      return `<span class="bc-m"><i class="ph-bold ${m.icon || "ph-chart-bar"}"></i><b>${v}</b><i>${m.label.split(" ")[0]}</i></span>`;
    }).join("");
    const awards = (leader.awards || []).slice(0, 2).map((a) => `<span class="bc-award" style="--ac:${a.color}">${a.glyph || ""} ${a.title}</span>`).join("");
    bestCard.innerHTML = `
      <div class="bc-left">
        <span class="bc-crown">🏆 Лучший результат месяца</span>
        <div class="bc-who">
          <span class="bc-avatar">${initials(leader.fullName)}</span>
          <div>
            <a class="bc-name" href="../team/${leader.slug}/index.html">${leader.fullName}</a>
            <div class="bc-role">${leader.role}</div>
          </div>
        </div>
        <div class="bc-metrics">${metrics}</div>
      </div>
      <div class="bc-right">
        <div class="bc-avg">${leader.avg.toFixed(1)}</div>
        <div class="bc-avg-l">средний KPI · <span class="bc-trend ${t.dir}">${arrow} ${t.delta > 0 ? "+" + t.delta : t.delta}</span></div>
        <div class="bc-badges"><span class="bc-badge">LVL ${leader.lvl} · ${leader.stars_in_level}/10</span>${awards}</div>
        <a class="btn btn-primary" href="../team/${leader.slug}/index.html"><i class="ph ph-user"></i> Страница специалиста</a>
      </div>`;
  } else if (bestCard) {
    bestCard.remove();
  }

  /* ---------- рейтинг по KPI ---------- */
  const lb = $("#leaderboard");
  if (lb) lb.innerHTML = ranked.map((e, i) => {
    const hasKpi = e.avg != null;
    const t = otp.trend(e);
    const arrow = t.dir === "up" ? "▲" : t.dir === "down" ? "▼" : "▬";
    const cls = t.dir === "up" ? "up" : t.dir === "down" ? "down" : "flat";
    const rankCls = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
    const medal = hasKpi ? (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1) : "👑";
    const leftBadge = e.status === "left" ? '<span class="badge badge-left">выбыл</span>' : "";
    const stars = hasKpi ? `<span class="lb-trend up" title="уровень">LVL ${e.lvl}</span>` : "";
    const trendCell = hasKpi
      ? `<span class="lb-trend ${cls}">${arrow} ${t.delta > 0 ? "+" + t.delta : t.delta}</span>`
      : '<span class="badge" style="font-size:.68rem"><i class="ph ph-crown"></i> руководитель</span>';
    return `
      <a class="lb-row" href="../team/${e.slug}/index.html" data-reveal>
        <span class="lb-rank ${rankCls}">${medal}</span>
        <span class="lb-name">${e.fullName} ${leftBadge} ${stars}<small>${e.role}</small>
          <span class="lb-hours" data-hours="${e.slug}"></span>
          <span class="lb-today" data-today="${e.slug}"></span></span>
        ${trendCell}
        <span class="lb-avg">${hasKpi ? e.avg.toFixed(1) : "—"}</span>
      </a>`;
  }).join("");

  /* ---------- карточки специалистов ---------- */
  const grid = $("#emp-grid");
  if (grid) grid.innerHTML = D.employees.map((e) => {
    const hasKpi = e.avg != null;
    const mini = hasKpi
      ? MKEYS.map((k) => {
          const m = D.metrics[k];
          return `<div class="mm"><span style="font-size:1.15rem;line-height:1">${m.emoji || ""}</span><div class="v">${e.current[k]}</div><div class="l">${m.label.split(" ")[0]}</div></div>`;
        }).join("")
      : '<div class="mm" style="grid-column:1/-1;color:var(--muted);padding:12px"><i class="ph ph-crown"></i> KPI не ведётся — руководитель</div>';
    const leftTag = e.status === "left" ? '<span class="badge badge-left" style="font-size:.68rem">выбыл</span>' : "";
    const awardTop = (e.awards && e.awards[0]) ? `<span class="badge" style="font-size:.66rem;color:${e.awards[0].color};border-color:${otp.hexA(e.awards[0].color,0.3)}"><i class="${e.awards[0].icon}"></i> ${e.awards[0].title}</span>` : "";
    const stars = hasKpi ? `<span style="color:var(--warn);font-size:.75rem;font-weight:600"><i class="ph-fill ph-star"></i> LVL ${e.lvl} · ${e.stars_in_level}/10</span>` : "";
    return `
      <a class="card emp-card" href="../team/${e.slug}/index.html" data-reveal>
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
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;min-height:22px">${awardTop} ${stars}</div>
        <div class="pe-hours" data-hours="${e.slug}"></div>
        <div class="mini-metrics">${mini}</div>
      </a>`;
  }).join("");

  /* ---------- график отдела (смены + отпуска) ---------- */
  const dutyBox = $("#duty-board");
  if (dutyBox && D.schedule) {
    const S = D.schedule;
    const today = new Date();
    const iso = isoOf(today);
    const month = S.months[iso] || (S.months[Object.keys(S.months)[0]] || null);
    const isoKey = S.months[iso] ? iso : Object.keys(S.months)[0];
    const isWork = (sh) => sh && ["shift", "weekend", "duty", "extra"].includes(sh.kind);
    const timeRank = (sh) => { const h = sh && sh.time ? parseInt(String(sh.time).slice(0, 2), 10) : NaN; return Number.isFinite(h) ? h : 9; };
    const dayList = (dt) => {
      const out = [];
      for (const [fio, days] of Object.entries((month && month.shifts) || {})) {
        const sh = days[String(dt.getDate())];
        if (!sh) continue;
        out.push({ fio, sh, ln: lineOf(fio, dt) });
      }
      out.sort((a, b) => timeRank(a.sh) - timeRank(b.sh) || a.fio.localeCompare(b.fio));
      return out;
    };
    const dayBlock = (dt, label) => {
      const list = dayList(dt);
      const work = list.filter((x) => isWork(x.sh));
      const off = list.filter((x) => !isWork(x.sh));
      return `<div class="dt-day">
        <div class="dt-day-h"><b>${label}</b><span>${WD_FULL[dt.getDay()]}, ${dt.getDate()} ${MON_GEN[dt.getMonth()]}</span><i>${work.length} на смене · ${off.length} отдыхают</i></div>
        <div class="dt-rows">
          ${work.map((x) => `<div class="dt-row"><span class="gs-sym k-${x.sh.kind}">${x.sh.sym}</span><span class="dt-fio">${x.fio} <span class="dt-hours" data-hoursfio="${x.fio}"></span></span><span class="dt-time">${x.sh.time || ""}</span><span class="dt-ln">${x.ln ? x.ln.id + " · " + x.ln.title : ""}</span></div>`).join("")}
          ${off.map((x) => `<div class="dt-row off"><span class="gs-sym k-${x.sh.kind}">${x.sh.sym}</span><span class="dt-fio">${x.fio}</span><span class="dt-time">${x.sh.title}</span></div>`).join("")}
        </div></div>`;
    };
    const year = String(today.getFullYear());
    const vac = S.vacations && S.vacations[year] ? S.vacations[year] : {};
    let showPast = false;                       // по умолчанию прошедшие отпуска скрыты
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const fmt = (p) => {
      const f = new Date(p.from + "T00:00:00"), t = new Date(p.to + "T00:00:00");
      return `с ${f.getDate()} ${MON_GEN[f.getMonth()]} по ${t.getDate()} ${MON_GEN[t.getMonth()]}`;
    };
    const renderDuty = () => {
      const vacRows = [];
      for (const [fio, list] of Object.entries(vac))
        for (const p of list) {
          if (!showPast && new Date(p.to + "T00:00:00") < today0) continue;
          vacRows.push({ fio, p });
        }
      vacRows.sort((a, b) => a.p.from.localeCompare(b.p.from));
      dutyBox.innerHTML = `
        <div class="dt-grid">${dayBlock(today, "Сегодня")}${dayBlock(addDays(today, 1), "Завтра")}</div>
        <div class="dt-sub-row">
          <h3 class="dt-sub"><i class="ph-bold ph-airplane-tilt"></i> Отпуска отдела · ${year}</h3>
          <label class="gs-past-toggle" title="Показать и уже прошедшие отпуска этого года">
            <input type="checkbox" id="duty-past"${showPast ? " checked" : ""}> <span>показывать прошедшие</span>
          </label>
        </div>
        <div class="gs-vac-table">
          <div class="gs-vac-tr head"><span>Период</span><span>Сотрудник</span><span>Дней</span></div>
          ${vacRows.length ? vacRows.map(({ fio, p }) => `<div class="gs-vac-tr${new Date(p.from + "T00:00:00") <= today0 && new Date(p.to + "T00:00:00") >= today0 ? " mine" : ""}">
            <span class="gs-vac-per">${fmt(p)}</span>
            <span class="gs-vac-who">${fio.split(" ")[0]} ${(fio.split(" ")[1] || "").slice(0, 1)}.${new Date(p.from + "T00:00:00") <= today0 && new Date(p.to + "T00:00:00") >= today0 ? ' <b class="gs-you">сейчас</b>' : ""}</span>
            <span class="gs-vac-dn">${p.days || ""}</span></div>`).join("") : '<div class="gs-vac-tr"><span class="gs-vac-per">Прошедших периодов нет</span><span></span><span></span></div>'}
        </div>`;
      const chk = $("#duty-past");
      if (chk) chk.addEventListener("change", () => { showPast = chk.checked; renderDuty(); });
    };
    renderDuty();
  }

  otp.reveal(document);
  hydrateHours();

  /* ---------- графики (страница «Динамика») ---------- */
  if (!window.Chart) return;

  if ($("#chart-team-avg")) {
    const KPI_EMPLOYEES = D.employees.filter((e) => e.current != null);
    const teamAvgSeries = D.months.map((_, i) => {
      const vals = KPI_EMPLOYEES.map((e) => otp.avgOf(e.history[i])).filter((v) => v > 0);
      return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    });
    new Chart($("#chart-team-avg"), {
      type: "line",
      data: { labels: D.months, datasets: [{
        label: "Средний KPI", data: teamAvgSeries,
        borderColor: "#22d3ee", borderWidth: 2.5, tension: 0.4,
        pointRadius: 3, pointHoverRadius: 6,
        pointBackgroundColor: "#22d3ee", pointBorderColor: "#0d1219", pointBorderWidth: 2,
        fill: true, backgroundColor: (c) => otp.lineGradient(c.chart, "#22d3ee"),
      }] },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        scales: {
          y: { min: 0, max: 10, grid: { color: "rgba(255,255,255,.05)" }, ticks: { stepSize: 2 } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `Средний KPI: ${c.parsed.y}` } } },
      },
    });
  }

  if ($("#chart-bonus")) {
    const bonusSeries = D.months.map((_, i) =>
      D.employees.reduce((s, e) => s + (e.history[i].bonus || 0), 0));
    new Chart($("#chart-bonus"), {
      type: "bar",
      data: { labels: D.months, datasets: [{ label: "Бонусы", data: bonusSeries,
        backgroundColor: "#0e7490", hoverBackgroundColor: "#22d3ee", borderRadius: 6, maxBarThickness: 26 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { callback: (v) => otp.fmt(v) + " ₽" } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => otp.rub(c.parsed.y) } } },
      },
    });
  }

  const sel = $("#radar-select");
  if (sel && $("#chart-radar")) {
    const teamProfile = {};
    const ratedEmployees = ACTIVE.filter((e) => e.current != null);
    MKEYS.forEach((k) => {
      teamProfile[k] = +(ratedEmployees.reduce((s, e) => s + e.current[k], 0) / ratedEmployees.length).toFixed(1);
    });
    sel.innerHTML = `<option value="__team__">Среднее по команде</option>` +
      D.employees.filter((e) => e.current != null)
        .map((e) => `<option value="${e.id}">${e.shortName} ${e.fullName.split(" ")[0]}</option>`).join("");
    let radarChart = null;
    const drawRadar = () => {
      const v = sel.value;
      const src = v === "__team__" ? teamProfile : (otp.byId(v)?.current || teamProfile);
      const label = v === "__team__" ? "Среднее по команде" : otp.byId(v).fullName;
      const data = MKEYS.map((k) => src[k]);
      if (radarChart) radarChart.destroy();
      radarChart = new Chart($("#chart-radar"), {
        type: "radar",
        data: { labels: MKEYS.map((k) => D.metrics[k].label), datasets: [{
          label, data, borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.16)",
          borderWidth: 2, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: "#22d3ee" }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false, backdropColor: "transparent" },
            grid: { color: "rgba(255,255,255,.08)" }, angleLines: { color: "rgba(255,255,255,.08)" },
            pointLabels: { color: "#8b96a8", font: { size: 12 } } } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.r}` } } },
        },
      });
    };
    sel.addEventListener("change", drawRadar);
    drawRadar();
  }

  otp.reveal(document);
})();
