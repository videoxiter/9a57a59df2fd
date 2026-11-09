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
  /* Корень сайта (там лежит assets/): путь до /team/ либо первый сегмент адреса.
     Страницы дашборда лежат на уровень глубже корня — нельзя резать по последнему слэшу. */
  const SITE_ROOT = (() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const t = parts.indexOf("team");
    if (t > 0) return "/" + parts.slice(0, t).join("/") + "/";
    return parts.length > 1 ? "/" + parts[0] + "/" : "/";
  })();

  const bySurname = (fio) => (D.employees || []).find((e) => (e.fullName || "").split(" ")[0] === String(fio).split(" ")[0]) || null;
  const MKEYS = ["quality", "learnability", "initiative", "engagement", "discipline"];
  const ACTIVE = D.employees.filter((e) => e.status !== "left");   // уволенных не показываем
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
    if (r.type === "adjust") return +r.hours || 0;      // начисление (+) или списание (−) часов
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
      if (r.type === "adjust") { if (h >= 0) plus += h; else minus += -h; }
      else if (r.type === "overtime") plus += h;
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
  /* Часы и статусы: сначала рисуем по локальной копии (мгновенно), потом уточняем по облаку.
     Важно не блокировать отрисовку ожиданием сети — иначе страница остаётся пустой. */
  let hydrating = false;

  /* ---------- Журнал часов: все сотрудники, кто поставил/одобрил + CSV ---------- */
  async function renderHoursJournal() {
    const box = $("#hours-journal");
    if (!box || box.dataset.ready === "1") return;
    box.dataset.ready = "1";
    const escJ = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const cloud = window.OTP_CLOUD;
    let list = [];
    try { list = (cloud && (await cloud.all())) || []; } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    const isGone = (r) => r.empSlug === "deleted" || /^\[(удалено|тест)\]/.test(String(r.reason || "")) || /^DIAG TEST/i.test(String(r.reason || ""));
    list = list.filter((r) => !isGone(r));
    const TYPE = { adjust: "Корректировка (руководитель)", overtime: "Переработка", leave: "Увольнительная", dayoff: "Отгул за вых. смену" };
    const ST = { approved: "подтверждено", pending: "на рассмотрении", cancelled: "отменено", rejected: "отклонено" };
    const signed = (r) => {
      if (r.type === "adjust") return +r.hours || 0;
      const p = (x) => { const mm = /^(\d{1,2}):(\d{2})$/.exec(x || ""); return mm ? +mm[1] + +mm[2] / 60 : null; };
      if (r.type === "dayoff") return +r.hours || 8;
      const a = p(r.from), b = p(r.to);
      const hh = a == null || b == null ? 0 : Math.max(0, Math.round((b - a) * 10) / 10);
      return r.type === "leave" ? -hh : hh;
    };
    const names = [...new Set(list.map((r) => r.empName).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ru"));
    const years = [...new Set(list.map((r) => String(r.date || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    box.innerHTML = `
      <h3 class="hr-block-h"><i class="ph-bold ph-clock-counter-clockwise"></i> Журнал часов — все сотрудники</h3>
      <div class="hj-filters">
        <label class="hj-f"><span>Сотрудник</span><select id="hjx-emp"><option value="">Все</option>${names.map((n) => `<option value="${escJ(n)}">${n}</option>`).join("")}</select></label>
        <label class="hj-f"><span>Операции</span><select id="hjx-kind"><option value="">Все</option><option value="plus">Начисления</option><option value="minus">Списания</option></select></label>
        <label class="hj-f"><span>Источник</span><select id="hjx-src"><option value="">Все</option><option value="boss">Руководитель/главный</option><option value="emp">Заявка сотрудника</option></select></label>
        <label class="hj-f"><span>Период</span><select id="hjx-year"><option value="">Всё время</option>${years.map((y) => `<option value="${y}">${y}</option>`).join("")}</select></label>
        <label class="hj-f"><span>Статус</span><select id="hjx-status"><option value="">Все</option><option value="approved">Подтверждено</option><option value="pending">На рассмотрении</option><option value="cancelled">Отменено</option></select></label>
        <button class="btn btn-primary" type="button" id="hjx-csv"><i class="ph-bold ph-download-simple"></i> Выгрузить CSV</button>
      </div>
      <div class="hj-sum" id="hjx-sum"></div>
      <div class="hj-table-wrap"><table class="hj-table"><thead><tr>
        <th>Дата</th><th>Сотрудник</th><th>Кто</th><th>Источник</th><th>Тип</th><th class="num">Часы</th><th>Причина</th><th>Статус</th>
      </tr></thead><tbody id="hjx-body"></tbody></table></div>`;
    const f = { emp: "", kind: "", src: "", year: "", status: "" };
    let shown = [];
    function draw() {
      shown = list.filter((r) => {
        if (f.emp && r.empName !== f.emp) return false;
        if (f.src && (r.type === "adjust" ? "boss" : "emp") !== f.src) return false;
        if (f.status && r.status !== f.status) return false;
        if (f.year && String(r.date || "").slice(0, 4) !== f.year) return false;
        const hh = signed(r);
        if (f.kind === "plus" && !(hh > 0)) return false;
        if (f.kind === "minus" && !(hh < 0)) return false;
        return true;
      }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      document.getElementById("hjx-body").innerHTML = shown.map((r) => {
        const hh = signed(r);
        const who = r.decidedBy || (r.status === "approved" ? "руководитель (ранее)" : "—");
        return `<tr><td class="mono">${escJ(String(r.date || "—"))}</td><td>${escJ(String(r.empName || ""))}</td>
          <td class="hj-who">${escJ(String(who))}</td>
          <td>${r.type === "adjust" ? '<span class="hj-boss">руководитель</span>' : '<span class="hj-emp-src">заявка</span>'}</td>
          <td>${escJ(TYPE[r.type] || r.type || "")}</td>
          <td class="num ${hh < 0 ? "neg" : "pos"}">${hh > 0 ? "+" : ""}${hh}</td>
          <td class="hj-why">${escJ(String(r.reason || ""))}</td>
          <td><span class="hj-st hj-${r.status || "pending"}">${ST[r.status] || r.status || ""}</span></td></tr>`;
      }).join("");
      const ok = shown.filter((r) => r.status === "approved");
      const plus = ok.reduce((s, r) => s + Math.max(0, signed(r)), 0);
      const minus = ok.reduce((s, r) => s + Math.min(0, signed(r)), 0);
      document.getElementById("hjx-sum").innerHTML =
        `<span class="hj-chip">записей: <b>${shown.length}</b></span>
         <span class="hj-chip plus">начислено: <b>+${plus} ч</b></span>
         <span class="hj-chip minus">списано: <b>${minus} ч</b></span>`;
    }
    [["hjx-emp", "emp"], ["hjx-kind", "kind"], ["hjx-src", "src"], ["hjx-year", "year"], ["hjx-status", "status"]].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => { f[key] = el.value; draw(); });
    });
    const csv = document.getElementById("hjx-csv");
    if (csv) csv.addEventListener("click", () => {
      const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const head = ["Дата", "Сотрудник", "Кто", "Источник", "Тип", "Часы", "Причина", "Статус"];
      const rows = [head.map(q).join(";")].concat(shown.map((r) => [r.date || "", r.empName || "", r.decidedBy || "", r.type === "adjust" ? "руководитель" : "заявка сотрудника", TYPE[r.type] || r.type || "", signed(r), r.reason || "", ST[r.status] || r.status || ""].map(q).join(";")));
      const blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "zhurnal-chasov-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    });
    draw();
  }

  async function hydrateHours() {
    if (hydrating) return;
    hydrating = true;
    const paint = (reqs) => {
      document.querySelectorAll("[data-hours], [data-hoursfio]").forEach((el) => {
        const emp = bySlug(el.dataset.hours || "") || bySurname(el.dataset.hoursfio || "");
        if (emp) el.innerHTML = hoursChip(emp, reqs);
      });
      const now = new Date();
      document.querySelectorAll("[data-today]").forEach((el) => {
        const emp = bySlug(el.dataset.today);
        const st = emp ? todayState(emp, now, reqs) : null;
        el.innerHTML = st ? `<span class="td-chip k-${st.kind}" title="Линия, смена и отсутствия на сегодня"><i class="ph-bold ${tdIcon(st.kind)}"></i> ${st.text}</span>` : "";
      });
    };
    try {
      const local = window.OTP_CLOUD ? window.OTP_CLOUD.loadLocal() || [] : [];
      window.OTP_REQS = local;
      paint(local);
      renderHoursAdmin(local);
    } catch (e) { /* локальные данные могли быть битыми — не критично */ }
    try {
      const list = window.OTP_CLOUD ? await window.OTP_CLOUD.all() : null;
      if (list) { window.OTP_REQS = list; paint(list); renderHoursAdmin(list); }
    } catch (e) { /* нет сети — остаются локальные значения */ }
    hydrating = false;
  }
  /* ---------- Часы: начисление/списание от руководителя ---------- */
  const escT = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function renderHoursAdmin(reqs) {
    const box = $("#hours-admin");
    if (!box) return;
    const list = (reqs || []).filter((r) => r.type === "adjust")
      .sort((a, b) => String(b.created || "").localeCompare(String(a.created || ""))).slice(0, 40);
    const emps = ACTIVE.filter((e) => e.slug && e.status !== "left");
    const row = (r) => {
      const h = +r.hours || 0;
      const d = String(r.date || (r.created || "").slice(0, 10));
      return `<div class="hx-row">
        <span class="hx-d">${escT(d)}</span>
        <span class="hx-n">${escT(r.empName || "")}</span>
        <b class="hx-h ${h >= 0 ? "pos" : "neg"}">${h >= 0 ? "+" : "−"}${fmtH(Math.abs(h))}</b>
        <span class="hx-r">${escT(r.reason || "")}</span>
      </div>`;
    };
    box.innerHTML = `<div class="hx-wrap">
      <div class="hx-head">
        <h3><i class="ph-bold ph-hourglass-high"></i> Часы: начислить или списать</h3>
        <span class="hx-note">решение руководителя · история видна всем сотрудникам</span>
      </div>
      <form class="hx-form" id="hx-form" autocomplete="off">
        <select id="hx-emp">${emps.map((e) => `<option value="${e.slug}">${escT(e.fullName)}</option>`).join("")}</select>
        <input id="hx-hours" type="number" step="0.5" inputmode="decimal" placeholder="часы: +2 или −1,5" required>
        <input id="hx-reason" type="text" maxlength="160" placeholder="Причина (обязательно)" required>
        <button type="submit" class="hx-btn"><i class="ph-bold ph-check"></i> Применить</button>
      </form>
      <div class="hx-log">
        <div class="hx-log-h">История начислений и списаний <span>${list.length}</span></div>
        ${list.length ? list.map(row).join("") : `<div class="hx-empty">Пока нет записей.</div>`}
      </div>
    </div>`;
    const form = $("#hx-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emp = bySlug($("#hx-emp").value);
      const h = parseFloat(String($("#hx-hours").value).replace(",", "."));
      const reason = $("#hx-reason").value.trim();
      if (!emp || !isFinite(h) || h === 0 || reason.length < 3) {
        form.classList.add("is-err");
        setTimeout(() => form.classList.remove("is-err"), 1200);
        return;
      }
      const nowIso = new Date().toISOString();
      const rec = {
        id: "adj-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        empSlug: emp.slug, empName: emp.fullName, type: "adjust",
        date: isoDate(new Date()), from: "", to: "", hours: h, reason,
        status: "approved", created: nowIso, decided: nowIso, decidedBy: window.OTP_ACTOR || "Яковлев Е.Е.",
      };
      try { if (window.OTP_CLOUD) await window.OTP_CLOUD.upsert(rec); } catch (err) {}
      $("#hx-hours").value = "";
      $("#hx-reason").value = "";
      await hydrateHours();
      renderHoursAdmin(window.OTP_REQS || []);
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
    if (!m || !m.shifts) return null;
    let days = m.shifts[fio];
    if (!days) {                                // в графике ФИО может отличаться написанием — ищем по фамилии
      const key = Object.keys(m.shifts).find((k) => samePerson(k, fio));
      days = key ? m.shifts[key] : null;
    }
    return days ? days[String(dt.getDate())] || null : null;
  }
  /* Линии человека: все, где он указан на ТЕКУЩЕЙ неделе (может быть в нескольких,
     например L0 + L3). Если на этой неделе его в линиях нет — берём ближайшую неделю,
     где он есть, и помечаем её датой начала. */
  function linesOf(fio, dt) {
    const m = monthOf(dt);
    if (!m || !m.lines) return [];
    const d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const found = [];
    for (const [lid, info] of Object.entries(m.lines)) {
      const labels = info.labels || [];
      const weeks = info.weeks || [];
      for (let i = 0; i < weeks.length; i++) {
        // в ячейке может быть несколько человек — приходит массивом
        const names = Array.isArray(weeks[i]) ? weeks[i] : [weeks[i]];
        if (!names.some((n) => samePerson(n, fio))) continue;
        const mm = /^(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})$/.exec(String(labels[i] || "").trim());
        if (!mm) continue;
        const y = dt.getFullYear();
        const from = new Date(y, +mm[2] - 1, +mm[1]);
        let to = new Date(y, +mm[4] - 1, +mm[3]);
        if (to < from) to = new Date(y + 1, +mm[4] - 1, +mm[3]);
        found.push({ id: lid, title: info.title, from, to });
      }
    }
    if (!found.length) return [];
    const cur = found.filter((f) => d0 >= f.from && d0 <= f.to);
    if (cur.length) return cur.map((f) => ({ ...f, current: true }));
    const dist = (f) => Math.min(Math.abs(f.from - d0), Math.abs(f.to - d0));
    const best = Math.min(...found.map(dist));
    return found.filter((f) => dist(f) === best).map((f) => ({ ...f, current: false }));
  }
  const lineLabel = (list) => {
    if (!list || !list.length) return "";
    const f = list[0];
    const since = f.current ? "" : " · с " + String(f.from.getDate()).padStart(2, "0") + "." + String(f.from.getMonth() + 1).padStart(2, "0");
    return list.map((l) => l.id).join(" + ") + " · " + f.title + since;
  };
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
    const lns = linesOf(emp.fullName, dt);
    const work = ["shift", "weekend", "duty", "extra"].includes(sh.kind);
    if (!work) return { kind: "off", text: sh.kind === "dayoff" ? sh.title : "Выходной" };
    return { kind: "shift", text: [lineLabel(lns), sh.title, sh.time || ""].filter(Boolean).join(" · "), sym: sh.sym };
  }

  function initials(name) {
    const p = name.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "")).toUpperCase();
  }

  const rated = D.employees.filter((e) => e.avg != null);
  const teamAvgNow = rated.length ? +(rated.reduce((s, e) => s + e.avg, 0) / rated.length).toFixed(2) : 0;
  // в рейтинг по KPI попадают только действующие сотрудники с оценкой:
  // уволенные и новички на адаптации (KPI ещё не ведётся) сюда не входят
  const ranked = D.employees.filter((e) => e.status === "active" && e.avg != null)
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  const leader = ranked[0];
  const lastBonus = D.employees.reduce((s, e) => s + (e.history[e.history.length - 1].bonus || 0), 0);

  /* ---------- шапка / подвал ---------- */
  if ($("#meta-count")) $("#meta-count").textContent = ACTIVE.length;   // без уволенных
  /* Кто сейчас на обучении/адаптации — чтобы новички были видны сразу на главной */
  const adaptBox = $("#adapt-strip");
  if (adaptBox) {
    const novices = D.employees.filter((e) => e.status === "adaptation");
    adaptBox.innerHTML = novices.length
      ? `<span class="adapt-strip-h"><i class="ph-bold ph-graduation-cap"></i> На обучении / адаптации:</span>
         ${novices.map((e) => `<a class="adapt-chip" href="${SITE_ROOT}team/${e.slug}/index.html" title="Открыть страницу сотрудника">${e.shortName} ${e.fullName.split(" ")[0] || ""}<small>${e.role.replace(/\s*\(.*\)$/, "")}</small></a>`).join("")}`
      : "";
  }
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
            <a class="bc-name" href="${SITE_ROOT}team/${leader.slug}/index.html">${leader.fullName}</a>
            <div class="bc-role">${leader.role}</div>
          </div>
        </div>
        <div class="bc-metrics">${metrics}</div>
      </div>
      <div class="bc-right">
        <div class="bc-avg">${leader.avg.toFixed(1)}</div>
        <div class="bc-avg-l">средний KPI · <span class="bc-trend ${t.dir}">${arrow} ${t.delta > 0 ? "+" + t.delta : t.delta}</span></div>
        <div class="bc-badges"><span class="bc-badge">LVL ${leader.lvl} · ${leader.stars_in_level}/10</span>${awards}</div>
        <a class="btn btn-primary" href="${SITE_ROOT}team/${leader.slug}/index.html"><i class="ph ph-user"></i> Страница специалиста</a>
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
    const leftBadge = e.status === "left" ? '<span class="badge badge-left">выбыл</span>'
      : e.status === "adaptation" ? '<span class="badge badge-adapt">адаптация</span>' : "";
    const stars = hasKpi ? `<span class="lb-trend up" title="уровень">LVL ${e.lvl}</span>` : "";
    const trendCell = hasKpi
      ? `<span class="lb-trend ${cls}">${arrow} ${t.delta > 0 ? "+" + t.delta : t.delta}</span>`
      : '<span class="badge" style="font-size:.68rem"><i class="ph ph-crown"></i> руководитель</span>';
    return `
      <a class="lb-row" href="${SITE_ROOT}team/${e.slug}/index.html" data-reveal>
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
  if (grid) grid.innerHTML = ACTIVE.map((e) => {
    const hasKpi = e.avg != null;
    const mini = hasKpi
      ? MKEYS.map((k) => {
          const m = D.metrics[k];
          return `<div class="mm"><span style="font-size:1.15rem;line-height:1">${m.emoji || ""}</span><div class="v">${e.current[k]}</div><div class="l">${m.label.split(" ")[0]}</div></div>`;
        }).join("")
      : '<div class="mm" style="grid-column:1/-1;color:var(--muted);padding:12px"><i class="ph ph-crown"></i> KPI не ведётся — руководитель</div>';
    const leftTag = e.status === "left" ? '<span class="badge badge-left" style="font-size:.68rem">выбыл</span>'
      : e.status === "adaptation" ? '<span class="badge badge-adapt" style="font-size:.68rem">адаптация</span>' : "";
    const awardTop = (e.awards && e.awards[0]) ? `<span class="badge" style="font-size:.66rem;color:${e.awards[0].color};border-color:${otp.hexA(e.awards[0].color,0.3)}"><i class="${e.awards[0].icon}"></i> ${e.awards[0].title}</span>` : "";
    const stars = hasKpi ? `<span style="color:var(--warn);font-size:.75rem;font-weight:600"><i class="ph-fill ph-star"></i> LVL ${e.lvl} · ${e.stars_in_level}/10</span>` : "";
    return `
      <a class="card emp-card" href="${SITE_ROOT}team/${e.slug}/index.html" data-reveal>
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



  /* ---------- мои награды (руководитель): знаки признания + похвалы ИТ-директора ---------- */
  const maBox = $("#my-awards");
  const boss = D.bossAwards;
  if (maBox && boss && ((boss.recognition || []).length || (boss.praise || []).length)) {
    const esc = (s) => String(s || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
    maBox.innerHTML = `
      <div class="my-awards-h">
        <h3><i class="ph-bold ph-medal"></i> Мои награды</h3>
        <span>признание компании и похвалы ИТ-директора</span>
      </div>
      <div class="my-awards-list">
        ${(boss.recognition || []).map((a) => `<div class="my-award">
          <img src="${SITE_ROOT}${String(a.image || "").replace(/^\/+/, "")}" alt="${esc(a.title)}" loading="lazy">
          <div class="my-award-body"><b>${a.degree} степень</b><span>${esc(String(a.title || "").replace(/^Признание:\s*/, ""))}</span></div>
        </div>`).join("")}
        ${(boss.praise || []).map((p) => `<div class="my-award praise">
          <span class="my-award-glyph">${p.glyph || "🏅"}</span>
          <div class="my-award-body"><b>${esc(p.month || "")}</b><span>${esc(p.title || "Похвала от ИТ Директора")} — за что: ${esc(p.reason || "")}</span></div>
        </div>`).join("")}
      </div>`;
  }

  /* ---------- признание: нагрудные знаки (вручает руководитель лично) ---------- */

  const recBox = $("#recognition-board");
  if (recBox && (D.recognition || []).length) {
    const rm = (s) => String(s || "").replace(/^Признание:\s*/, "");
    recBox.innerHTML = `
      <div class="rec-head">
        <h3><i class="ph-bold ph-medal"></i> Признание в Компании</h3>
        <span class="rec-hint">нагрудные знаки вручаются лично — вне метрик и рейтинга</span>
      </div>
      <div class="rec-list">
        ${D.recognition.map((c) => `<div class="rec-card" style="--rc:${c.color}">
          <img class="rec-img" src="${SITE_ROOT + String(c.image || "").replace(/^\/+/, "")}" alt="${c.title}" loading="lazy">
          <div class="rec-body">
            <div class="rec-degree">${c.degree} степень</div>
            <div class="rec-title">${rm(c.title)}</div>
            <div class="rec-desc">${c.desc || ""}</div>
            <div class="rec-holders">${(c.holders || []).map((h) => `<span class="rec-holder${h.role ? " boss" : ""}">${h.shortName}${h.role ? " · " + h.role : ""}</span>`).join("") || '<span class="rec-none">пока никто</span>'}</div>
          </div>
        </div>`).join("")}
      </div>`;
  }

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
        const person = bySurname(fio);
        if (person && person.status === "left") continue;      // уволенных в графике отдела нет
        const sh = days[String(dt.getDate())];
        if (!sh) continue;
        out.push({ fio, sh, ln: linesOf(fio, dt) });
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
          ${work.map((x) => `<div class="dt-row"><span class="gs-sym k-${x.sh.kind}">${x.sh.sym}</span><span class="dt-fio">${x.fio} <span class="dt-hours" data-hoursfio="${x.fio}"></span></span><span class="dt-time">${x.sh.time || ""}</span><span class="dt-ln">${x.ln.length ? lineLabel(x.ln) : '<span class="dt-ln-none">вне линий</span>'}</span></div>`).join("")}
          ${off.map((x) => `<div class="dt-row off"><span class="gs-sym k-${x.sh.kind}">${x.sh.sym}</span><span class="dt-fio">${x.fio}</span><span class="dt-time">${x.sh.title}</span></div>`).join("")}
        </div></div>`;
    };
    const year = String(today.getFullYear());
    const vacAll = S.vacations && S.vacations[year] ? S.vacations[year] : {};
    // в отпусках отдела — только действующие сотрудники команды (без уволенных и посторонних)
    const vac = {};
    for (const [fio, list] of Object.entries(vacAll)) {
      const person = bySurname(fio);
      if (person && person.status !== "left") vac[fio] = list;
    }
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
  renderHoursJournal();

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


  /* ---------- Настройки (страница /settings/) ---------- */
  function renderSettings() {
    const box = $("#settings-panel");
    const T = window.OTP_THEME;
    if (!box || !T) return;
    const st = T.get();
    const cur = T.themeOf(st.theme);
    box.innerHTML = `<div class="set-wrap">
      <section class="set-block">
        <div class="set-h"><i class="ph-bold ph-palette"></i><h3>Тема оформления</h3></div>
        <p class="set-sub">Тема меняет фон, элементы, иконки, эмблему и включает свою анимацию. Настройка личная — у сотрудников свои темы.</p>
        <div class="set-grid set-grid-themes" id="set-themes">
          ${T.themes.map((x) => `<button class="set-opt set-theme-card${st.theme === x.id ? " is-on" : ""}" data-theme-id="${x.id}">
            <span class="set-thumb th-${x.id}">${(x.figures && x.figures[0]) ? `<img src="${T.img(x.figures[0])}" alt="">` : `<span class="set-thumb-fx"></span>`}</span>
            <b>${x.label}</b><i>${x.hint}</i>
            <i class="ph-bold ph-check-circle set-tick"></i></button>`).join("")}
        </div>
      </section>
      <section class="set-block">
        <div class="set-h"><i class="ph-bold ph-sparkle"></i><h3>Анимация</h3></div>
        <p class="set-sub">У каждой темы своя постоянная анимация на фоне — она не перекрывает текст.</p>
        <label class="set-row"><input type="checkbox" id="set-anim-on"${st.animOn ? " checked" : ""}>
          <span>Включить анимацию фона${cur && cur.anim ? " — " + cur.label : ""}</span></label>
        <div class="set-foot"><button class="set-btn ghost" id="set-reset"><i class="ph-bold ph-arrow-counter-clockwise"></i> Сбросить к классической</button></div>
      </section>
    </div>`;
    document.querySelectorAll("#set-themes .set-opt").forEach((b) =>
      b.addEventListener("click", () => {
        T.setTheme(b.dataset.themeId);
        document.querySelectorAll("#set-themes .set-opt").forEach((x) => x.classList.remove("is-on"));
        b.classList.add("is-on");
        const th = T.themeOf(b.dataset.themeId);
        const lbl = document.querySelector("#set-anim-on + span");
        if (lbl) lbl.textContent = "Включить анимацию фона" + (th.anim ? " — " + th.label : "");
        const chk = $("#set-anim-on"); if (chk) chk.checked = T.get().animOn;
      }));
    const chk = $("#set-anim-on");
    if (chk) chk.addEventListener("change", () => T.setAnim(chk.checked));
    const reset = $("#set-reset");
    if (reset) reset.addEventListener("click", () => {
      T.apply({ theme: "classic", animOn: true });
      document.querySelectorAll("#set-themes .set-opt").forEach((x) => x.classList.remove("is-on"));
      const c = document.querySelector('#set-themes .set-opt[data-theme-id="classic"]');
      if (c) c.classList.add("is-on");
      if (chk) chk.checked = true;
    });
  }

  renderSettings();

  otp.reveal(document);
})();
