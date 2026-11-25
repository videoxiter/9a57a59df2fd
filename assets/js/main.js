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
  /* Корень дашборда (страницы «Моя команда», «Журнал», …) — для ссылок из JS. */
  const DASH_BASE = location.pathname.replace(/\/(dynamics|people|duties|development|settings|staff|hours)\/.*$/, "/");

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

  /* ---------- накопленные часы ----------
     Правило одно на весь сайт (otp.reqDelta): увольнительная списывает до 4 ч, если
     руководитель не поставил «не списывать»; корректировка — по знаку; отгул за
     выходную смену и прочее часы не двигают. Автоматических исключений по KPI нет. */
  const hoursOfReq = (r) => otp.reqHours(r);
  function balanceOf(emp, reqs) {
    if (!emp) return null;
    let sum = emp.hours_base || 0;
    for (const r of reqs) {
      if (r.empSlug !== emp.slug || r.status !== "approved") continue;
      sum += otp.reqDelta(r);
    }
    return { balance: Math.round(sum * 10) / 10 };
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
    const signed = (r) => otp.reqDelta(r);
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
        <th>Дата</th><th>Сотрудник</th><th>Кто</th><th>Источник</th><th>Тип</th><th class="num">Часы</th><th>Причина</th><th>Статус</th><th class="num">Остаток</th>
      </tr></thead><tbody id="hjx-body"></tbody></table></div>
      <div class="hj-pager" id="hjx-pager"></div>`;
    const f = { emp: "", kind: "", src: "", year: "", status: "" };
    let page = 0;
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
      // остаток по хронологии
      const balMap = new Map();
      const baseBySlug = {};
      ((window.OTP_DATA && OTP_DATA.employees) || []).forEach((e) => { baseBySlug[e.slug || e.id] = e.hours_base || 0; });
      const byEmpBase = Object.assign({}, baseBySlug);
      shown.slice().reverse().forEach((r) => {
        if (r.status !== "approved") return;
        const hh = signed(r);
        byEmpBase[r.empSlug] = byEmpBase[r.empSlug] || 0;
        byEmpBase[r.empSlug] += hh;
        balMap.set(r.id, Math.round(byEmpBase[r.empSlug] * 10) / 10);
      });
      const PER = 10;
      const pages = Math.max(1, Math.ceil(shown.length / PER));
      if (page > pages - 1) page = pages - 1;
      const view = shown.slice(page * PER, page * PER + PER);
      document.getElementById("hjx-body").innerHTML = view.map((r) => {
        const hh = signed(r);
        const note = otp.reqDeltaNote(r);
        const who = r.decidedBy || (r.status === "approved" ? "руководитель (ранее)" : "—");
        return `<tr><td class="mono">${escJ(String(r.date || "—"))}</td><td>${escJ(String(r.empName || ""))}</td>
          <td class="hj-who">${escJ(String(who))}</td>
          <td>${r.type === "adjust" ? '<span class="hj-boss">руководитель</span>' : '<span class="hj-emp-src">заявка</span>'}</td>
          <td>${escJ(TYPE[r.type] || r.type || "")}</td>
          <td class="num ${hh < 0 ? "neg" : "pos"}"${note ? ` title="${escJ(note)}"` : ""}>${hh === 0 ? "0" : (hh > 0 ? "+" : "") + hh}${note ? '<sup class="hj-zero">·</sup>' : ""}</td>
          <td class="hj-why">${escJ(String(r.reason || ""))}</td>
          <td><span class="hj-st hj-${r.status || "pending"}">${ST[r.status] || r.status || ""}</span>${(() => { const d = otp.reqDecision(r); return d ? `<span class="hj-dec">${escJ(d)}</span>` : ""; })()}</td>
          <td class="num hj-left">${r.status === "approved" ? balMap.get(r.id) : "—"}</td></tr>`;
      }).join("");
      const pager = document.getElementById("hjx-pager");
      if (pager) {
        if (pages <= 1) pager.innerHTML = "";
        else {
          const nums = [];
          for (let i = 0; i < pages; i++) {
            if (pages > 7 && i > 0 && i < pages - 1 && Math.abs(i - page) > 1) {
              if (nums[nums.length - 1] !== "…") nums.push("…");
              continue;
            }
            nums.push(i);
          }
          pager.innerHTML = `<button class="hj-pg" data-pg="${page - 1}" ${page === 0 ? "disabled" : ""}>‹</button>`
            + nums.map((n) => n === "…" ? '<span class="hj-pg-dots">…</span>'
              : `<button class="hj-pg${n === page ? " on" : ""}" data-pg="${n}">${n + 1}</button>`).join("")
            + `<button class="hj-pg" data-pg="${page + 1}" ${page >= pages - 1 ? "disabled" : ""}>›</button>`
            + `<span class="hj-pg-info">${page * PER + 1}–${Math.min(shown.length, (page + 1) * PER)} из ${shown.length}</span>`;
          pager.querySelectorAll("button[data-pg]").forEach((b) => b.addEventListener("click", () => {
            const n = +b.dataset.pg;
            if (n >= 0 && n < pages) { page = n; draw(); }
          }));
        }
      }
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
      if (el) el.addEventListener("change", () => { f[key] = el.value; page = 0; draw(); });
    });
    const csv = document.getElementById("hjx-csv");
    if (csv) csv.addEventListener("click", () => {
      const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const head = ["Дата", "Сотрудник", "Кто", "Источник", "Тип", "Часы", "Причина", "Статус", "Остаток часов"];
      const rows = [head.map(q).join(";")].concat(shown.map((r) => [r.date || "", r.empName || "", r.decidedBy || "", r.type === "adjust" ? "руководитель" : "заявка сотрудника", TYPE[r.type] || r.type || "", signed(r), r.reason || "", ST[r.status] || r.status || "", r.status === "approved" ? String(balMap.get(r.id)) : ""].map(q).join(";")));
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
  const HX_PER = 10;            // история начислений/списаний — по 10 на страницу
  let hxPage = 0;
  function renderHoursAdmin(reqs) {
    const box = $("#hours-admin");
    if (!box) return;
    const all = (reqs || []).filter((r) => r.type === "adjust")
      .sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
    const pages = Math.max(1, Math.ceil(all.length / HX_PER));
    hxPage = Math.min(Math.max(0, hxPage), pages - 1);
    const list = all.slice(hxPage * HX_PER, hxPage * HX_PER + HX_PER);
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
    const pager = pages > 1 ? `<div class="hj-pager hx-pager">
      <button class="hj-pg" data-hxpg="${hxPage - 1}" ${hxPage === 0 ? "disabled" : ""}>‹</button>
      ${Array.from({ length: pages }, (_, i) => `<button class="hj-pg${i === hxPage ? " on" : ""}" data-hxpg="${i}">${i + 1}</button>`).join("")}
      <button class="hj-pg" data-hxpg="${hxPage + 1}" ${hxPage >= pages - 1 ? "disabled" : ""}>›</button>
      <span class="hj-pg-info">${hxPage * HX_PER + 1}–${Math.min(all.length, (hxPage + 1) * HX_PER)} из ${all.length}</span>
    </div>` : "";
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
      <p class="hx-rule"><i class="ph-bold ph-info"></i> Подтверждённая корректировка сдвигает часы: плюс начисляет, минус списывает. Увольнительная списывает до 4 ч, отгул за выходную смену — всегда 0.</p>
      <div class="hx-log">
        <div class="hx-log-h">История начислений и списаний <span>${all.length}</span></div>
        ${list.length ? list.map(row).join("") : `<div class="hx-empty">Пока нет записей.</div>`}
        ${pager}
      </div>
    </div>`;
    box.querySelectorAll("[data-hxpg]").forEach((b) => b.addEventListener("click", () => {
      const n = +b.dataset.hxpg;
      if (n < 0 || n > pages - 1) return;
      hxPage = n;
      renderHoursAdmin(window.OTP_REQS || []);
    }));
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
      // минус тоже допустим: подтверждённая корректировка списывает часы
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
      hxPage = 0;                                   // свежая запись — на первую страницу
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
  if ($("#meta-month")) {
    const mm = $("#meta-month");
    mm.textContent = D.meta.updated;
    const bd = mm.closest(".badge");
    if (bd) bd.title = "Итоги за " + D.meta.updated + ". Текущий месяц появится после загрузки итогов.";
  }
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

  /* P1.3: индикатор синхронизации дашборда. Объявлен ДО первого вызова
     renderNowBoard(), иначе первый же рендер падал на TDZ (let __nowSyncOk)
     и плашки «Сейчас на смене» появлялись только со второго тика (60 с). */
  let __nowSyncOk = null;
  /* P2.2: активный фильтр списка сотрудников по статусу (null — все). */
  let nowFilter = null;
  /* План 24.11.2026: поиск по таблице команды на оперативной главной. */
  let nowSearch = "";
  /* Сообщение, которое покажем после перезагрузки списка в «Админке». */
  let __staffMsg = "";
  /* Пароли, заданные в этом сеансе страницы: из базы их не показать (только хеш),
     но «Текст доступа» должен содержать именно заданный пароль. */
  const __sessionPass = new Map();
  function nowSyncSet(ok) { __nowSyncOk = ok; }
  function nowSync() {
    if (__nowSyncOk === null) return `<span class="now-chip s">… соединение</span>`;
    if (__nowSyncOk) return `<span class="now-chip s ok" title="Данные подтягиваются из облака автоматически"><i class="ph-bold ph-check-circle"></i> синхр. ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>`;
    return `<span class="now-chip s warn" title="Не удалось опросить данные (интернет или прокси). Статусы сотрудников на их экранах не зависят от этого."><i class="ph-bold ph-wifi-high-signal-slash"></i> офлайн</span>`;
  }

  otp.reveal(document);
  hydrateHours();
  renderHoursJournal();
  renderNowBoard();
  setInterval(() => { if (!document.hidden) renderNowBoard(); }, 60000);

  /* P1.5: зеркало графика в БД. Дашборд — единственная страница, где гарантированно
     есть актуальный график И админ-сессия; раз в 10 минут копируем его в
     otp_schedule_cache, а cron при старте читает график сначала оттуда.
     Откат сайта к старой версии больше не закручивает уведомления. */
  (function mirrorSchedule() {
    const KEY = "otp_sched_mirror";
    // Версия сайта — из href тега <link main.css?v=N> (в HTML её печатает генератор).
    // Раньше здесь стояла переменная V, которой в main.js нет → ReferenceError
    // синхронно рвал весь скрипт для админа: не рендерились «Сейчас на смене»,
    // «Настройка» и «Админка». Теперь версия читается из DOM; если тега нет —
    // «runtime» (поле информационное, без него ничего не ломается).
    const mVer = /v=(\d+)/.exec((document.querySelector('link[href*="main.css"]') || {}).href || "");
    const VER = mVer ? "v" + mVer[1] : "runtime";
    const push = () => {
      if (!window.OTP_AUTH || !window.OTP_AUTH.token("admin")) return;
      const doc = { generated: VER, team: (D.schedule && D.schedule.people) || [], schedule: D.schedule || {} };
      let last = 0;
      try { last = +localStorage.getItem(KEY) || 0; } catch (e) {}
      if (Date.now() - last < 10 * 60 * 1000) return;
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      window.OTP_AUTH.scheduleSet(doc).then((r) => {
        if (r && r.ok) try { localStorage.setItem(KEY + "_ok", new Date().toISOString()); } catch (e) {}
      }).catch(() => {});
    };
    push();
    setInterval(push, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) push(); });
  })();

  /* P3: Realtime на дашборде — «Сейчас на смене» обновляется по факту события
     (с любого устройства), а не только раз в минуту. Если Realtime выключен
     в Supabase, подписка молча ничего не делает — опрос 60 с работает как раньше. */
  if (otp.realtime) {
    let rtT = 0;
    otp.realtime("otp_time_events", () => {
      clearTimeout(rtT);
      rtT = setTimeout(() => { if (!document.hidden) renderNowBoard(); }, 1200);
    });
  }

  /* ---------- «Сейчас на смене»: статусы по событиям «Стартовой» ---------- */
  async function renderNowBoard() {
    const box = $("#now-board");
    if (!box) return;
    if (!box.dataset.loaded) {
      box.innerHTML = `<div class="now-head"><h3><i class="ph-bold ph-broadcast"></i> Сейчас на смене</h3>${nowSync()}</div>
        <div class="skl-grid">${Array.from({ length: 6 }).map(() => `<div class="skl-card"><div class="skl"></div><div class="skl"></div></div>`).join("")}</div>`;
    }
    const c = D.hrRules && D.hrRules.cloud;
    if (!c || !c.url) return;
    // данные доступны только после входа (прокси проверяет токен)
    if (!window.OTP_AUTH || !window.OTP_AUTH.token("admin")) return;
    const dt = new Date();
    const day = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    let rows = [];
    try {
      rows = await window.OTP_AUTH.api("admin", `otp_time_events?select=*&day=eq.${day}&order=at.asc`, "GET");
      if (!Array.isArray(rows)) rows = [];
    } catch (e) { nowSyncSet(false); return; }   // сеть/прокси недоступны — показываем offline-бейдж
    if (!Array.isArray(rows)) { nowSyncSet(false); return; }

    const byEmp = new Map();
    for (const e of rows) {
      const k = e.empSlug || e.empName;
      if (!byEmp.has(k)) byEmp.set(k, []);
      byEmp.get(k).push(e);
    }
    /* Отпуска (из графика) и согласованные заявки (отгул, увольнительная) — чтобы
       вместо «не начинал» было видно, почему человека нет на смене. */
    const year = String(dt.getFullYear());
    const vacAll = (D.schedule && D.schedule.vacations && D.schedule.vacations[year]) || {};
    const vacOf = (fio) => {
      const list = vacAll[fio] || [];
      return list.find((v) => day >= v.from && day <= v.to) || null;
    };
    let reqs = [];
    try {
      reqs = await window.OTP_AUTH.api("admin", `otp_requests?select=*&status=eq.approved&date=eq.${day}`, "GET");
      if (!Array.isArray(reqs)) reqs = [];
    } catch (e) { reqs = []; }
    const reqOf = (slug) => reqs.filter((r) => r.empSlug === slug || r.slug === slug);
    const nowMin = dt.getHours() * 60 + dt.getMinutes();
    const hhmmToMin = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; };
    const escNow = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
    const hms = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, "0")).join(":");
    const hm = (ms) => { const d = new Date(ms + 3 * 3600 * 1000); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
    const SLOT = { tech1: ["тех.перерыв 1", "ph-coffee"], tech2: ["тех.перерыв 2", "ph-coffee"], lunch: ["обед", "ph-fork-knife"], absence: ["отсутствие", "ph-walking"] };
    const stateOf = (ev) => {
      let acc = 0, running = false, last = 0, started = 0, stopped = 0, active = null, note = "";
      for (const e of ev) {
        const t = Date.parse(e.at);
        if (e.type === "shift_start") { started = t; running = true; last = t; }
        else if (e.type === "shift_stop") { if (running) acc += t - last; running = false; stopped = t; }
        else if (e.type === "break_start" || e.type === "absence_start") {
          /* «Временное отсутствие: Без заявки…» — статус фиксируем, но рабочее
             время НЕ останавливаем. Сравнение по началу строки: после «Без заявки»
             часто идёт пояснение («— работа по ЦО»), строгое равенство не срабатывало. */
          const noStop = e.type === "absence_start" && String(e.reason || "").trim().startsWith("Без заявки");
          if (running) acc += t - last;
          if (noStop) { running = true; last = t; active = null; note = e.reason || ""; }
          else { running = false; active = e; note = ""; }
        }
        else if (e.type === "break_end" || e.type === "absence_end") { if (!running) { running = true; last = t; } active = null; }
      }
      if (running) acc += Date.now() - last;
      const sec = Math.max(0, Math.round(acc / 1000));
      if (stopped) return { kind: "done", label: "смена завершена", icon: "ph-check-circle", since: stopped, sec };
      if (active) {
        const nm = SLOT[active.slot] || ["пауза", "ph-pause"];
        /* длительность самой паузы (а не отработанное время) — нужна для плашки
           «Пауза больше 15 минут»; раньше там сравнивалось отработанное время,
           и плашка появлялась почти у всех на паузе. */
        const pauseSec = Math.max(0, Math.round((Date.now() - Date.parse(active.at)) / 1000));
        return { kind: "pause", label: nm[0] + (active.reason ? ": " + active.reason : ""), icon: nm[1], since: Date.parse(active.at), sec, pauseSec };
      }
      if (started) return { kind: "work", label: "работает" + (note ? " · " + note : ""), icon: "ph-briefcase", since: last, sec };
      return { kind: "idle", label: "не начинал", icon: "ph-moon", since: null, sec };
    };
    let avatarBy = new Map();
    if (window.OTP_AUTH) {
      const sl = await window.OTP_AUTH.staffList();
      for (const s of (sl || [])) if (s.avatar) avatarBy.set(s.slug, s.avatar);
    }
    const fioOf = (id) => {
      const pl = (D.schedule && D.schedule.people) || [];
      const p = pl.find((x) => x.slug === id);
      return p ? p.fio : "";
    };
    const shiftPct = (e) => {
      const iso = day.slice(0, 7);
      const m = D.schedule && D.schedule.months && D.schedule.months[iso];
      if (!m || !m.shifts) return 0;
      const sh = m.shifts[fioOf(e.id)] && m.shifts[fioOf(e.id)][String(dt.getDate())];
      if (!sh) return 0;
      const mm = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(String(sh.time || ""));
      if (!mm) return 0;
      const s = new Date(day + "T" + mm[1].padStart(2, "0") + ":" + mm[2] + ":00").getTime();
      const en = new Date(day + "T" + mm[3].padStart(2, "0") + ":" + mm[4] + ":00").getTime();
      if (!(en > s)) return 0;
      return Math.max(0, Math.min(100, Math.round(((Date.now() - s) / (en - s)) * 100)));
    };
    const order = { work: 0, pause: 1, done: 2, leave: 3, dayoff: 4, vacation: 5, idle: 6 };
    /* Почему человека нет на смене: отпуск по графику, отгул или увольнительная по заявке. */
    const absenceStatus = (emp) => {
      const v = vacOf(emp.fullName);
      if (v) return { kind: "vacation", label: `в отпуске до ${String(v.to).split("-").reverse().join(".")}`, icon: "ph-airplane", since: null, sec: 0 };
      const rs = reqOf(emp.slug);
      const dayoff = rs.find((r) => r.type === "dayoff");
      if (dayoff) return { kind: "dayoff", label: "отгул за выходную смену", icon: "ph-calendar-minus", since: null, sec: 0 };
      const leave = rs.find((r) => r.type === "leave");
      if (leave) {
        const a = hhmmToMin(leave.from), b = hhmmToMin(leave.to);
        if (a != null && b != null && nowMin >= a && nowMin < b) {
          return { kind: "leave", label: `увольнительная ${leave.from}–${leave.to}`, icon: "ph-door-open", since: null, sec: 0 };
        }
        if (a != null && nowMin < a) {
          return { kind: "leave", label: `увольнительная с ${leave.from} до ${leave.to}`, icon: "ph-door-open", since: null, sec: 0 };
        }
      }
      return null;
    };
    const list = D.employees.filter((e) => e.status !== "left")
      .map((e) => {
        const st = byEmp.has(e.slug) ? stateOf(byEmp.get(e.slug)) : { kind: "idle", label: "не начинал", icon: "ph-moon", since: null, sec: 0 };
        if (st.kind === "idle") { const a = absenceStatus(e); if (a) return { emp: e, st: a }; }
        return { emp: e, st };
      })
      .sort((a, b) => order[a.st.kind] - order[b.st.kind] || String(a.emp.fullName).localeCompare(String(b.emp.fullName), "ru"));
    // кто сейчас отсутствует (последнее событие — начало отсутствия)
    const absNow = [];
    for (const [emp, evs] of byEmp.entries()) {
      const last = evs[evs.length - 1];
      if (last && last.type === "absence_start") absNow.push({ emp, slug: last.empSlug, reason: last.reason || "", at: last.at });
    }
    // действующие увольнительные (approved leave, внутри интервала)
    let leaveNow = [];
    try {
      const rows2 = await window.OTP_AUTH.api("admin", `otp_requests?select=*&type=eq.leave&status=eq.approved&date=eq.${day}`, "GET");
      if (Array.isArray(rows2)) {
        const base = new Date(day + "T00:00:00").getTime();
        const minsOf = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; };
        leaveNow = (Array.isArray(rows2) ? rows2 : []).map((l) => {
          const a = minsOf(l.from), b = minsOf(l.to);
          if (a == null || b == null) return null;
          return { id: l.id, fio: l.empName, fromTxt: l.from, toTxt: l.to, start: base + a * 60000, end: base + b * 60000 };
        }).filter((x) => x && Date.now() >= x.start && Date.now() < x.end);
      }
    } catch (e) {}
    /* P2.2: кто должен был начать смену, но «Начало» не нажал (порог 5 минут,
       как у cron). График уже в памяти страницы — отдельный запрос не нужен. */
    const monSched = (D.schedule && D.schedule.months && D.schedule.months[day.slice(0, 7)]) || null;
    const dayNum = String(+day.slice(8, 10));
    const WORK_KINDS = new Set(["shift", "weekend", "duty", "extra"]);
    const shiftOf = (emp) => {
      const sh = monSched && monSched.shifts ? (monSched.shifts[fioOf(emp.id)] || monSched.shifts[emp.fullName]) : null;
      const s = sh && sh[dayNum];
      if (!s || !WORK_KINDS.has(String(s.kind))) return null;
      const m = /^(\d{1,2}):(\d{2})/.exec(String(s.time || ""));
      if (!m) return null;
      return { start: +m[1] * 60 + +m[2], time: String(s.time).trim() };
    };
    const late = list
      .filter((x) => x.st.kind === "idle" && (() => { const s = shiftOf(x.emp); return !!s && nowMin > s.start + 5; })())
      .map((x) => ({ emp: x.emp, s: shiftOf(x.emp) }));
    /* Таблица команды (план 24.11.2026): ФИО ведёт в профиль, «Стартовая» — в учёт.
       Фильтр по статусу + поиск. Данные те же, что раньше рисовались карточками. */
    const filterList = (l) => l.filter((x) => {
      const byF = !nowFilter || (nowFilter === "v"
        ? ["vacation", "dayoff", "leave"].includes(x.st.kind)
        : x.st.kind === nowFilter);
      const byS = !nowSearch || String(x.emp.fullName).toLowerCase().includes(nowSearch);
      return byF && byS;
    });
    const opLink = (x, sec) => SITE_ROOT + "team/" + (x.emp.slug || x.emp.id) + "/" + (sec || "");
    const rowsHtml = (l) => filterList(l).map((x) => `<div class="op-tr k-${x.st.kind}" data-ns="${escNow(x.emp.id)}" role="row">
      <a class="op-name" href="${opLink(x)}" title="Открыть профиль">${escNow(x.emp.fullName)} <i class="ph-bold ph-arrow-up-right" aria-hidden="true"></i></a>
      <span class="op-st"><i class="ph-bold ${x.st.icon}" aria-hidden="true"></i> ${escNow(x.st.label)}</span>
      <span class="op-since">${x.st.since ? hm(x.st.since) : "—"}</span>
      <span class="op-time${x.st.kind === "idle" ? " is-idle" : ""}">${x.st.kind === "idle" ? "—" : hms(x.st.sec)}</span>
      <a class="op-go" href="${opLink(x, "start/")}" title="«Стартовая»: смена, перерывы, отсутствие">Стартовая</a>
    </div>`).join("") || '<p class="muted op-empty">Никого не найдено — измени фильтр или поиск.</p>';
    const tableHtml = (l) => `<div class="op-table" role="table" aria-label="Сотрудники">
      <div class="op-tr op-th" role="row"><span>ФИО</span><span>Статус</span><span>С</span><span>Таймер</span><span>Учёт</span></div>
      ${rowsHtml(l)}
    </div>`;
    const repaintTable = () => {
      const tbl = box.querySelector(".op-table");
      if (tbl) tbl.outerHTML = tableHtml(window.__nowList || []);
    };
    if (!list.length) {
      nowSyncSet(false);
      box.dataset.loaded = "1";
      box.innerHTML = `<p class="muted">Сегодня событий пока нет — никто не нажимал кнопки.</p>`;
      renderHomeSide({ late, absNow, leaveNow, list });
      return;
    }
    nowSyncSet(true);
    box.dataset.loaded = "1";
    const cnt = (k) => list.filter((x) => x.st.kind === k).length;
    window.__nowList = list;
    box.innerHTML = `
      <div class="op-tools">
        <input class="op-search" id="op-search" type="search" placeholder="Поиск сотрудника" value="${escNow(nowSearch)}" aria-label="Поиск сотрудника">
        <span class="op-filters">
          <button class="op-chip${!nowFilter ? " is-on" : ""}" data-f="">Все <b>${list.length}</b></button>
          <button class="op-chip${nowFilter === "work" ? " is-on" : ""}" data-f="work">Работают <b>${cnt("work")}</b></button>
          <button class="op-chip${nowFilter === "pause" ? " is-on" : ""}" data-f="pause">На паузе <b>${cnt("pause")}</b></button>
          <button class="op-chip${nowFilter === "idle" ? " is-on" : ""}" data-f="idle">Не начали <b>${cnt("idle")}</b></button>
        </span>
        ${nowSync()}
      </div>
      ${tableHtml(list)}`;
    renderHomeSide({ late, absNow, leaveNow, list });
    window.__nowState = list.map((x) => ({ slug: x.emp.id, sec: x.st.sec, running: x.st.kind === "work", base: Date.now() }));
    if (!box.dataset.tick) {
      box.dataset.tick = "1";
      setInterval(() => {
        if (document.hidden) return;
        for (const s of (window.__nowState || [])) {
          if (!s.running) continue;
          const el = box.querySelector(`[data-ns="${s.slug}"] .op-time`);
          if (el) el.textContent = hms(Math.max(0, Math.round(s.sec + (Date.now() - s.base) / 1000)));
        }
      }, 1000);
    }
    box.querySelectorAll(".op-filters .op-chip").forEach((c) => c.addEventListener("click", () => {
      const f = c.getAttribute("data-f") || null;
      nowFilter = nowFilter === f ? null : f;
      box.querySelectorAll(".op-filters .op-chip").forEach((x) => x.classList.toggle("is-on", (x.getAttribute("data-f") || null) === nowFilter));
      repaintTable();
    }));
    const opSearch = box.querySelector("#op-search");
    if (opSearch) {
      let t = 0;
      opSearch.addEventListener("input", () => {
        nowSearch = String(opSearch.value || "").trim().toLowerCase();
        clearTimeout(t);
        t = setTimeout(repaintTable, 250);
      });
    }
    box.querySelectorAll("[data-leave]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.getAttribute("data-leave");
      if (!id) return;
      const d = new Date(Date.now() + 3 * 3600 * 1000);
      const hhmm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      b.disabled = true;
      try {
        // v4: заявка — только через прокси `api` с админ-токеном (anon-запись закрыта)
        await window.OTP_AUTH.api("admin", `otp_requests?id=eq.${id}`, "PATCH", { to: hhmm });
      } catch (e) {}
      renderNowBoard();
    }));
    box.querySelectorAll("[data-abs]").forEach((b) => b.addEventListener("click", async () => {
      const slug = b.getAttribute("data-abs");
      const emp = b.getAttribute("data-emp");
      if (!slug) return;
      const d = new Date(Date.now() + 3 * 3600 * 1000);
      const hhmm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      b.disabled = true;
      try {
        // v4: событие — только через прокси `api` (anon-insert закрыт RLS)
        await window.OTP_AUTH.api("admin", "otp_time_events", "POST", [{
          id: "mgr-" + Date.now() + "-" + String(slug).slice(0, 8),
          empSlug: slug, empName: emp, day, type: "absence_end", slot: "absence",
          at: new Date().toISOString(), reason: "закрыто руководителем",
        }]);
      } catch (e) {}
      renderNowBoard();
    }));
  }

  /* ---------- Правая колонка оперативной главной (план 24.11.2026) ---------- */
  async function renderHomeSide(att) {
    const box = $("#home-side");
    if (!box) return;
    if (!window.OTP_AUTH || !window.OTP_AUTH.token("admin")) { box.innerHTML = ""; return; }
    const dt = new Date();
    const day = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const monthStart = day.slice(0, 8) + "01";
    let pending = [], monthReqs = [];
    try {
      pending = await window.OTP_AUTH.api("admin", "otp_requests?select=*&status=eq.pending&order=date.asc", "GET");
      monthReqs = await window.OTP_AUTH.api("admin", `otp_requests?select=*&date=gte.${monthStart}&date=lte.${day}&status=eq.approved&order=date.desc`, "GET");
    } catch (e) {}
    if (!Array.isArray(pending)) pending = [];
    if (!Array.isArray(monthReqs)) monthReqs = [];
    const esc = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
    const TYPE = { leave: "Увольнительная", dayoff: "Отгул", overtime: "Переработка", adjust: "Корректировка" };
    const hhmm = (s) => String(s || "").slice(0, 5);
    const hrs = (r) => (r.hours != null ? +r.hours || 0 : 0);
    const short = (fio) => { const p = String(fio || "").split(" "); return p[0] + (p[1] ? " " + p[1].slice(0, 1) + "." : ""); };
    const notes = (rows) => rows.map((r) => `<a class="op-note" href="#hr-sec">
        <span class="op-note-t">${esc(TYPE[r.type] || r.type)} · ${esc(r.empName)}</span>
        <span class="op-note-d">${esc(r.date)}${r.from ? " · " + esc(hhmm(r.from)) + "–" + esc(hhmm(r.to)) : ""}${(r.type === "overtime" || r.type === "adjust") ? " · " + esc(hrs(r)) + " ч" : ""}</span></a>`).join("")
      || '<p class="muted op-empty">Пока нет.</p>';
    const attn = [];
    if (att && att.late && att.late.length) attn.push({ icon: "ph-alarm", cls: "late", text: `Не вышли к смене: ${att.late.map((l) => short(l.emp.fullName)).join(", ")}` });
    if (att && att.absNow && att.absNow.length) attn.push({ icon: "ph-walking", cls: "abs", text: `Отсутствуют: ${att.absNow.map((a) => short(a.emp)).join(", ")}` });
    const longPause = ((att && att.list) || []).filter((x) => x.st.kind === "pause" && (x.st.pauseSec || 0) > 15 * 60);
    if (longPause.length) attn.push({ icon: "ph-pause", cls: "pause", text: `Пауза больше 15 минут: ${longPause.map((x) => short(x.emp.fullName)).join(", ")}` });
    const leaveRows = monthReqs.filter((r) => r.type === "leave" || r.type === "dayoff");
    const overRows = monthReqs.filter((r) => r.type === "overtime" || r.type === "adjust");
    const overTotal = overRows.reduce((s, r) => s + hrs(r), 0);
    box.innerHTML = `
      <section class="op-block">
        <h3>Требуют внимания</h3>
        ${attn.length ? attn.map((a) => `<div class="op-alert k-${a.cls}"><i class="ph-bold ${a.icon}" aria-hidden="true"></i><span>${esc(a.text)}</span></div>`).join("") : '<p class="muted op-empty">Отклонений нет.</p>'}
        <div class="op-sub">Заявки к решению${pending.length ? ` <b>${pending.length}</b>` : ""}</div>
        ${pending.length ? notes(pending.slice(0, 4)) : '<p class="muted op-empty">Заявок к решению нет.</p>'}
        ${pending.length > 4 ? '<a class="op-more" href="#hr-sec">Все заявки →</a>' : ""}
      </section>
      <section class="op-block">
        <h3>В этом месяце</h3>
        <div class="op-sub">Увольнительные и отгулы <b>${leaveRows.length}</b></div>
        ${leaveRows.length ? notes(leaveRows.slice(0, 3)) : '<p class="muted op-empty">Пока нет.</p>'}
        <div class="op-sub">Переработки · ${overTotal} ч</div>
        ${overRows.length ? notes(overRows.slice(0, 3)) : '<p class="muted op-empty">Пока нет.</p>'}
        <a class="op-more" href="${DASH_BASE}hours/">Полный журнал часов →</a>
      </section>`;
  }

  /* Шапка оперативной главной + формы занесения (план 24.11.2026, этап 2). */
  (function initHomeChrome() {
    const dateEl = $("#op-date");
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} · обновлено ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} МСК`;
    }

    const modal = $("#op-modal"), form = $("#op-form"), titleEl = $("#op-modal-title"), errEl = $("#op-form-err");
    if (!modal || !form) return;
    const LABEL = { leave: "Увольнительная", dayoff: "Отгул", overtime: "Начисление переработки" };
    const ICON = { leave: "ph-door-open", dayoff: "ph-calendar-minus", overtime: "ph-plus-circle" };
    const FIELDS = {
      leave: [["date", "Дата", "date", true], ["from", "Время с", "time", true], ["to", "Время до", "time", true], ["reason", "Причина", "textarea", true]],
      dayoff: [["date", "Дата отгула", "date", true], ["date2", "Дата выходной смены", "date", true], ["reason", "Комментарий", "textarea", false]],
      overtime: [["date", "Дата работы", "date", true], ["hours", "Часы", "number", true], ["reason", "Какие задачи выполнялись", "textarea", true]],
    };
    const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    const parseHM = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; };
    const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    let curType = null;
    let busy = false;

    const empOptions = () => (D.employees || []).filter((e) => e.status !== "left")
      .map((e) => `<option value="${escAttr(e.slug || e.id)}">${escAttr(e.fullName)}</option>`).join("");
    const escAttr = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

    /* Собирает заявку из формы: {rec} или {err}. Часы — из времени или поля. */
    function buildRec() {
      const fd = Object.fromEntries(new FormData(form).entries());
      const emp = (D.employees || []).find((e) => (e.slug || e.id) === fd.emp);
      if (!emp) return { err: "Выбери сотрудника." };
      let hours = null;
      if (curType === "dayoff") hours = 8;
      else if (curType === "overtime") hours = Number(String(fd.hours || "").replace(",", "."));
      else {
        const a = parseHM(fd.from), b = parseHM(fd.to);
        hours = (a != null && b != null && b > a) ? Math.round((b - a) / 6) / 10 : null;
        if (hours == null) return { err: "Проверь время: конец должен быть позже начала." };
      }
      if (!fd.date) return { err: "Укажи дату." };
      const max = (D.hrRules && D.hrRules.leaveMaxHours) || 4;
      if (curType === "leave" && hours > max) return { err: `Увольнительная больше ${max} ч в день невозможна.` };
      if (curType === "overtime" && !(hours > 0 && hours <= 24)) return { err: "Часы должны быть от 0,5 до 24." };
      if (curType === "dayoff" && !fd.date2) return { err: "Укажи дату выходной смены." };
      const nowIso = new Date().toISOString();
      const rec = {
        id: "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        empSlug: emp.slug || emp.id, empName: emp.fullName, type: curType,
        date: fd.date, date2: fd.date2 || "", from: fd.from || "", to: fd.to || "",
        hours, reason: String(fd.reason || "").trim(), status: "approved",
        created: nowIso, decided: nowIso, decidedBy: window.OTP_ACTOR || "Руководитель",
      };
      if (curType === "leave" && fd.noDeduct) rec.noDeduct = true;
      return { rec };
    }

    /* Расчёт по действующим правилам (otp.reqDelta): что произойдёт с часами. */
    function deltaText(rec) {
      if (!window.otp || !otp.reqDelta) return "";
      const d = otp.reqDelta(rec);
      if (rec.type === "dayoff") return "отгул часы не двигает";
      if (rec.type === "leave") return rec.noDeduct ? "часы не спишутся (решение руководителя)" : (d < 0 ? `спишется ${Math.abs(d)} ч` : "часы не спишутся");
      return d > 0 ? `начислится ${d} ч` : "часы не изменятся";
    }

    function preview() {
      const box = $("#op-preview");
      if (!box) return;
      const r = buildRec();
      if (r.err) { box.textContent = r.err; box.className = "op-preview is-err"; return; }
      box.textContent = `Итог: ${deltaText(r.rec)}`;
      box.className = "op-preview";
    }

    /* Пересечения: та же дата у того же сотрудника (для увольнительной — по времени). */
    async function conflict(rec) {
      try {
        const rows = await window.OTP_AUTH.api("admin", `otp_requests?select=*&empSlug=eq.${encodeURIComponent(rec.empSlug)}&type=eq.${rec.type}&date=eq.${rec.date}`, "GET");
        const list = (Array.isArray(rows) ? rows : []).filter((r) => r.status !== "rejected" && r.status !== "cancelled");
        for (const r of list) {
          if (rec.type === "leave") {
            const a1 = parseHM(rec.from), b1 = parseHM(rec.to), a2 = parseHM(r.from), b2 = parseHM(r.to);
            if (a1 != null && b1 != null && a2 != null && b2 != null && a1 < b2 && a2 < b1) {
              return `Пересечение с увольнительной ${hm(a2)}–${hm(b2)} в этот день.`;
            }
            if (r.noDeduct === true && !rec.noDeduct) return "На эту дату уже есть увольнительная без списания.";
          } else if (rec.type === "dayoff") {
            if (String(r.date2 || "") === String(rec.date2 || "")) return "Отгул за эту выходную смену уже зарегистрирован.";
            if (String(r.date || "") === String(rec.date || "")) return "На эту дату отгул уже есть.";
          } else {
            return "Переработка на эту дату уже зарегистрирована.";
          }
        }
      } catch (e) { /* нет связи — не блокируем, сервер всё равно проверит */ }
      return "";
    }

    function open(type) {
      curType = type;
      titleEl.innerHTML = `<i class="ph-bold ${ICON[type]}" aria-hidden="true"></i> ${LABEL[type]}`;
      errEl.textContent = "";
      const fields = FIELDS[type].map(([name, label, kind, req]) => {
        if (kind === "textarea") return `<label class="op-f"><span>${label}</span><textarea name="${name}" rows="2" ${req ? "required" : ""}></textarea></label>`;
        if (kind === "number") return `<label class="op-f"><span>${label}</span><input type="number" name="${name}" step="0.5" min="0.5" max="24" ${req ? "required" : ""}></label>`;
        return `<label class="op-f"><span>${label}</span><input type="${kind}" name="${name}" value="${kind === "date" ? todayIso() : ""}" ${req ? "required" : ""}></label>`;
      }).join("");
      form.innerHTML = `<label class="op-f"><span>Сотрудник</span><select name="emp">${empOptions()}</select></label>
        ${fields}
        ${type === "leave" ? `<label class="op-check"><input type="checkbox" name="noDeduct"> <span>Не списывать часы</span></label>
          <div class="op-note">Увольнительная — не больше ${(D.hrRules && D.hrRules.leaveMaxHours) || 4} ч в день.</div>` : ""}
        <div class="op-preview" id="op-preview"></div>
        <div class="op-form-foot">
          <button class="btn btn-primary" type="submit"><i class="ph-bold ph-check" aria-hidden="true"></i> Зарегистрировать</button>
          <button class="btn btn-ghost" type="button" id="op-cancel">Отмена</button>
        </div>`;
      modal.hidden = false;
      $("#op-cancel").addEventListener("click", close);
      form.querySelectorAll("input,select,textarea").forEach((el) => el.addEventListener("input", preview));
      preview();
      const first = form.querySelector("select");
      if (first) first.focus();
    }
    function close() { modal.hidden = true; curType = null; }

    /* --- синхронизация графика с Confluence (кнопка на главной) ---
       Кнопка только пишет запрос в otp_sync_flags; сам график забирает локальный
       агент из Confluence (интранет): scripts/sync_schedule.py --if-requested. */
    const cloudCfg = () => (D.hrRules && D.hrRules.cloud) || null;
    function syncStateText(f) {
      /* «график от» показывает дату и время, когда Confluence отдал график
         (старые schedule.json содержат только дату — их тоже понимаем). */
      const g = (D.schedule && D.schedule.generated) || "";
      let gen = "—";
      if (g) {
        const s = String(g);
        const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
        if (isNaN(d.getTime())) gen = s;
        else gen = s.includes("T")
          ? d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : d.toLocaleDateString("ru-RU");
      }
      if (!f || !f.done_at) return `график от ${gen}`;
      const t = new Date(f.done_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      return `график от ${gen} · синхронизирован ${t}` + (f.ok === false ? ` (ошибка: ${f.message || ""})` : "");
    }
    async function renderSyncState() {
      const el = $("#op-sync-state");
      if (!el) return;
      el.textContent = syncStateText(null);
      if (!window.OTP_AUTH || !window.OTP_AUTH.token("admin")) return;
      try {
        const rows = await window.OTP_AUTH.api("admin", "otp_sync_flags?select=*&id=eq.schedule", "GET");
        el.textContent = syncStateText(Array.isArray(rows) ? rows[0] : null);
      } catch (e) {}
    }
    function requestSync() {
      const el = $("#op-sync-state");
      if (!el) return;
      if (!window.OTP_AUTH || !window.OTP_AUTH.token("admin")) { el.textContent = "Синхронизация недоступна: нужен вход."; return; }
      el.textContent = "Отправляю запрос…";
      window.OTP_AUTH.api("admin", "otp_sync_flags?id=eq.schedule", "PATCH", {
        requested_at: new Date().toISOString(),
        requested_by: window.OTP_ACTOR || "Руководитель",
      }).then(() => {
        el.textContent = "Синхронизация запрошена — ПК заберёт график из Confluence в течение пары минут.";
        setTimeout(renderSyncState, 90000);
      }).catch(() => { el.textContent = "Не удалось запросить синхронизацию — проверь связь."; });
    }
    renderSyncState();

    document.querySelectorAll(".op-actions [data-op]").forEach((b) => b.addEventListener("click", () => {
      const op = b.getAttribute("data-op");
      if (op === "sync") { requestSync(); return; }
      open(op);
    }));
    const x = $("#op-modal-x");
    if (x) x.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;                       // двойное нажатие = одна операция
      const r = buildRec();
      if (r.err) { errEl.textContent = r.err; return; }
      busy = true;
      errEl.textContent = "Проверяю пересечения…";
      const bad = await conflict(r.rec);
      if (bad) { errEl.textContent = bad; busy = false; return; }
      errEl.textContent = "Сохраняю…";
      try {
        if (window.OTP_CLOUD) await window.OTP_CLOUD.upsert(r.rec);
        close();
        renderNowBoard();                    // обновить таблицу и правую колонку
        if (window.otpRefreshHours) window.otpRefreshHours();
      } catch (err) {
        errEl.textContent = "Не удалось сохранить — проверь связь и попробуй ещё раз.";
      }
      busy = false;
    });
  })();

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
          ${T.themes.map((x) => `<button class="set-opt set-theme-card${st.theme === x.id ? " is-on" : ""}${["classic","light","dark","cyberpunk"].includes(x.id) ? "" : " set-hide"}" data-theme-id="${x.id}">
            <span class="set-thumb th-${x.id}">${(x.figures && x.figures[0]) ? `<img src="${T.img(x.figures[0])}" alt="${x.label}">` : `<span class="set-thumb-fx"></span>`}</span>
            <b>${x.label}</b><i>${x.hint}</i>
            <i class="ph-bold ph-check-circle set-tick"></i></button>`).join("")}
        </div>
        <button class="set-more" id="set-more">Показать все темы</button>
      </section>
      <section class="set-block">
        <div class="set-h"><i class="ph-bold ph-sparkle"></i><h3>Анимация</h3></div>
        <p class="set-sub">У каждой темы своя постоянная анимация на фоне — она не перекрывает текст.</p>
        <label class="set-row"><input type="checkbox" id="set-anim-on"${st.animOn ? " checked" : ""}>
          <span>Включить анимацию фона${cur && cur.anim ? " — " + cur.label : ""}</span></label>
        <div class="set-foot"><button class="set-btn ghost" id="set-reset"><i class="ph-bold ph-arrow-counter-clockwise"></i> Сбросить к классической</button></div>
      </section>
    </div>`;
    const more = document.getElementById("set-more");
    if (more) more.addEventListener("click", () => {
      const grid = document.getElementById("set-themes");
      if (!grid) return;
      const open = grid.classList.toggle("set-open");
      more.textContent = open ? "Свернуть темы" : "Показать все темы";
    });
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
  initStaffPage();

  /* ---------- админка: сотрудники, логины, пароли ---------- */
  async function initStaffPage() {
    const app = $("#staff-app");
    if (!app || !window.OTP_AUTH) return;
    const A = window.OTP_AUTH;
    const escNow = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

    const loginForm = () => {
      app.innerHTML = `<div class="staff-login">
        <h3><i class="ph-bold ph-lock-key"></i> Вход для руководителя</h3>
        <p>Введите пароль администратора, чтобы управлять сотрудниками.</p>
        <input id="staff-pass" type="password" placeholder="пароль" autocomplete="current-password">
        <div class="staff-actions">
          <button class="btn btn-primary" id="staff-do-login">Войти</button>
          <span class="staff-err" id="staff-err"></span>
        </div>
      </div>`;
      const go = async () => {
        const pass = ($("#staff-pass") || {}).value || "";
        const err = $("#staff-err");
        const res = await A.login("admin", pass);
        if (res && res.ok) initStaffPage();
        else if (err) err.textContent = res && res.error === "bad_password" ? "Неверный пароль" : "Не удалось войти";
      };
      $("#staff-do-login").addEventListener("click", go);
      $("#staff-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    };

    const sess = await A.session("admin");
    if (!sess || !sess.admin) { loginForm(); return; }

    const staff = await A.staffList();
    const bySlug = new Map((staff || []).map((s) => [s.slug, s]));
    /* v19: флаг «старт только из приложения» и код страницы — из otp_staff */
    const onlyAppOf = (s) => !!(s && (s.only_app || s.onlyApp));
    const rows = D.employees.filter((e) => e.status !== "left").map((e) => {
      const s = bySlug.get(e.id) || {};
      return {
        slug: e.id, hash: e.slug, fio: s.fio || e.fullName, login: s.login || "", pass: s.pass || "",
        avatar: s.avatar || "", active: s.active !== false,
        hasPass: !!s.has_pass, onlyApp: onlyAppOf(s),
      };
    });
    // сотрудники, которых нет в data.js (добавлены вручную в админке) — тоже показываем
    for (const s of (staff || [])) {
      if (!s || !s.slug || s.slug === "admin") continue;
      if (rows.some((r) => r.slug === s.slug)) continue;
      rows.push({
        slug: s.slug, hash: s.slug, fio: s.fio || s.slug, login: s.login || "", pass: "",
        avatar: s.avatar || "", active: s.active !== false, hasPass: !!s.has_pass,
        onlyApp: onlyAppOf(s), manual: true,
      });
    }
    // администратор — первым
    const admin = bySlug.get("admin");
    if (admin) rows.unshift({ slug: "admin", fio: admin.fio || "Руководитель", login: admin.login || "", pass: admin.pass || "", avatar: admin.avatar || "", active: admin.active !== false, hasPass: !!admin.has_pass });

    app.innerHTML = `<div class="staff-head">
        <h3><i class="ph-bold ph-identification-card"></i> Сотрудники и доступы</h3>
        <button class="btn btn-ghost" id="staff-out">Выйти</button>
      </div>
      <div class="staff-add">
        <h4><i class="ph-bold ph-user-plus"></i> Добавить сотрудника</h4>
        <div class="staff-add-grid">
          <label>ФИО<input id="sa-fio" placeholder="Иванов Иван Иванович"></label>
          <label>Код страницы<input id="sa-slug" placeholder="пусто — сгенерировать"></label>
          <label>Логин<input id="sa-login" placeholder="имя@ftech.io"></label>
          <label>Пароль<input id="sa-pass" type="password" placeholder="не короче 6 символов"></label>
          <label>Аватар (ссылка)<input id="sa-avatar" placeholder="https://..."></label>
        </div>
        <div class="staff-add-foot">
          <button class="btn btn-primary" id="sa-add" type="button"><i class="ph-bold ph-plus" aria-hidden="true"></i> Добавить</button>
          <label class="staff-add-check"><input type="checkbox" id="sa-pages" checked> создать страницы сразу</label>
          <span class="staff-hint" id="sa-msg"></span>
        </div>
      </div>
      <div class="staff-add">
        <h4><i class="ph-bold ph-chart-line"></i> KPI и бонусы за месяц</h4>
        <div class="staff-add-grid">
          <label>Сотрудник<select id="kpi-emp">${rows.filter((r) => r.slug !== "admin")
            .map((r) => `<option value="${escNow(r.slug)}">${escNow(r.fio)}</option>`).join("")}</select></label>
          <label>Месяц<select id="kpi-month">${(D.employees.find((e) => e.history && e.history.length) || { history: [] })
            .history.map((h) => `<option value="${escNow(h.key)}">${escNow(h.month || h.key)}</option>`).join("")}</select></label>
          <label>Качество<input id="kpi-quality" type="number" min="0" max="10" step="1"></label>
          <label>Обучаемость<input id="kpi-learnability" type="number" min="0" max="10" step="1"></label>
          <label>Инициатива<input id="kpi-initiative" type="number" min="0" max="10" step="1"></label>
          <label>Вовлечённость<input id="kpi-engagement" type="number" min="0" max="10" step="1"></label>
          <label>Дисциплина<input id="kpi-discipline" type="number" min="0" max="10" step="1"></label>
          <label>Бонус, ₽<input id="kpi-bonus" type="number" min="0" step="100"></label>
          <label>Комментарий<input id="kpi-note" placeholder="необязательно"></label>
        </div>
        <div class="staff-add-foot">
          <button class="btn btn-primary" id="kpi-save" type="button"><i class="ph-bold ph-check" aria-hidden="true"></i> Сохранить и применить</button>
          <span class="staff-hint" id="kpi-msg"></span>
        </div>
      </div>
      <div class="staff-add" id="poll-admin">
        <h4><i class="ph-bold ph-calendar-check"></i> Опрос по графику</h4>
        <div class="staff-add-grid">
          <label>Месяц<input id="poll-month" type="month" value="2026-12"></label>
          <label>Сдать до<input id="poll-due" type="datetime-local"></label>
        </div>
        <div class="staff-add-foot">
          <button class="btn btn-primary" id="poll-create" type="button"><i class="ph-bold ph-paper-plane-right" aria-hidden="true"></i> Открыть опрос</button>
          <button class="btn btn-ghost" id="poll-close" type="button">Закрыть опрос</button>
          <span class="staff-hint" id="poll-admin-msg"></span>
        </div>
        <div id="poll-summary"></div>
      </div>
      <p class="staff-hint">Пароль: если оставить пустым — не меняется. Логин — для личных сообщений в Мессенджере (например, a.bolgov@ftech.io).</p>
      <div class="staff-list">
        ${rows.map((r) => `<div class="staff-row" data-slug="${escNow(r.slug)}">
          <div class="staff-cell"><label>ФИО</label><input data-f="fio" value="${escNow(r.fio)}"></div>
          <div class="staff-cell"><label>Логин</label><input data-f="login" value="${escNow(r.login)}" placeholder="имя@ftech.io"></div>
          <div class="staff-cell"><label>Пароль ${r.hasPass ? "(задан)" : "(нет)"}</label><div class="pass-wrap"><input data-f="pass" type="password" value="${escNow(r.pass || "")}" placeholder="новый пароль"><button type="button" data-eye title="Показать пароль"><i class="ph-bold ph-eye"></i></button></div></div>
          <div class="staff-cell"><label>Аватар</label><input data-f="avatar" value="${escNow(r.avatar)}" placeholder="https://..."><div class="staff-up"><button data-file>Загрузить фото</button><input type="file" data-file-inp accept="image/*" hidden></div></div>
          <div class="staff-cell staff-check"><label><input data-f="active" type="checkbox" ${r.active ? "checked" : ""}> активен</label></div>
          <div class="staff-cell staff-check"><label title="Смену можно начать только из приложения-трея"><input data-f="onlyapp" type="checkbox" ${r.onlyApp ? "checked" : ""}> только из приложения</label></div>
          <div class="staff-cell staff-save"><button class="btn btn-primary" data-save>Сохранить</button><button type="button" class="btn btn-ghost" data-access>Текст доступа</button><span class="staff-ok" hidden>сохранено</span></div>
        </div>`).join("")}
      </div>
      <div class="staff-devices" id="staff-devices"></div>`;
    /* P3: метрики — неудачные попытки входа за последние 15 минут (скрипт
       scripts/supabase_v6_realtime.sql). Показываем тихо, не мешая работе. */
    /* v21: опрос по графику — создать, закрыть, смотреть пожелания */
    const pollLoad = async () => {
      const mEl = $("#poll-month");
      const host = $("#poll-summary");
      if (!mEl || !host) return;
      const pollId = "p-" + mEl.value;
      host.innerHTML = "<p class=\"staff-hint\">Загружаю ответы…</p>";
      const res = await A.pollSummary(pollId);
      if (!res || !res.ok) { host.innerHTML = "<p class=\"staff-hint\">Сводка недоступна (нужен админ-вход).</p>"; return; }
      const list = res.list || [];
      const missing = res.missing || [];
      const short = (a) => {
        if (!a || typeof a !== "object") return "";
        const parts = [];
        if (a.weekend_none) parts.push("без выходных смен");
        if (Array.isArray(a.weekend_dates) && a.weekend_dates.length) parts.push("выходные: " + a.weekend_dates.join(", "));
        if (Array.isArray(a.off_dates) && a.off_dates.length) parts.push("обязательные выходные: " + a.off_dates.join(", "));
        if (a.third_none) parts.push("без 3-й смены");
        else if (Array.isArray(a.third_weeks) && a.third_weeks.length) parts.push("3-я смена: недели с " + a.third_weeks.join(", "));
        if (a.tania === true) parts.push("Тания: готов");
        if (a.tania === false) parts.push("Тания: нет");
        if (a.comment) parts.push("«" + String(a.comment).slice(0, 60) + "»");
        return parts.join("; ");
      };
      host.innerHTML = `<p class="staff-hint">Ответили: <b>${list.length}</b> · не ответили: <b>${missing.length}</b>
        ${missing.length ? "— " + missing.map((x) => escNow(x)).join(", ") : ""}</p>
        ${list.length ? `<div class="poll-table">${list.map((r) => `<div class="poll-tr">
          <b>${escNow(r.fio)}</b><span>${escNow(short(r.answers))}</span></div>`).join("")}</div>` : ""}`;
    };
    const pollCreateBtn = $("#poll-create");
    if (pollCreateBtn) pollCreateBtn.addEventListener("click", async () => {
      const month = ($("#poll-month") || {}).value;
      const due = ($("#poll-due") || {}).value;
      const msg = $("#poll-admin-msg");
      if (!month) { if (msg) msg.textContent = "Выберите месяц."; return; }
      const res = await A.pollCreate(month, due ? new Date(due).toISOString() : null, {});
      if (msg) msg.textContent = res && res.ok ? "Опрос открыт: " + month : "Не удалось открыть (нужен админ-вход).";
      pollLoad();
    });
    const pollCloseBtn = $("#poll-close");
    if (pollCloseBtn) pollCloseBtn.addEventListener("click", async () => {
      const month = ($("#poll-month") || {}).value;
      const msg = $("#poll-admin-msg");
      if (!month) return;
      const res = await A.pollSetStatus("p-" + month, "closed");
      if (msg) msg.textContent = res && res.ok ? "Опрос закрыт: " + month : "Не удалось закрыть.";
      pollLoad();
    });
    const pollMonthEl = $("#poll-month");
    if (pollMonthEl) pollMonthEl.addEventListener("change", pollLoad);
    pollLoad();
    /* v19: переключатель «только из приложения» + список привязанных устройств */
    app.querySelectorAll('[data-f="onlyapp"]').forEach((box) => box.addEventListener("change", async () => {
      const row = box.closest(".staff-row");
      const slug = row && row.getAttribute("data-slug");
      const res = await A.setOnlyApp(slug, box.checked);
      if (res && res.ok) toast(box.checked ? "Старт смены — только из приложения" : "Старт смены разрешён и в браузере");
      else { box.checked = !box.checked; toast("Не удалось переключить (нужен админ-вход)"); }
    }));
    A.devicesList().then((list) => {
      const host = document.getElementById("staff-devices");
      if (!host) return;
      const bulk = `<div class="staff-dev-actions">
        <button class="btn btn-ghost" type="button" data-onlyapp-all="1">Правило для всех</button>
        <button class="btn btn-ghost" type="button" data-onlyapp-all="0">Разрешить браузер всем</button>
      </div>`;
      if (!Array.isArray(list) || !list.length) {
        host.innerHTML = `<h4><i class="ph-bold ph-device-mobile"></i> Устройства</h4>
          <p class="staff-hint">Пока ни одно устройство не привязано: сотрудник должен один раз войти в приложение.</p>${bulk}`;
      } else {
        host.innerHTML = `<h4><i class="ph-bold ph-device-mobile"></i> Устройства (${list.length})</h4>
          <div class="staff-dev-list">${list.map((d) => `<div class="staff-dev-row">
            <b>${escNow(d.fio || d.slug)}</b>
            <span>${escNow(d.label || "устройство")}</span>
            <span class="staff-hint">${d.last_seen ? "был онлайн " + new Date(d.last_seen).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "не выходил на связь"}</span>
            <button class="btn btn-ghost" type="button" data-revoke="${escNow(d.slug)}|${escNow(d.device || "")}">Отвязать</button>
          </div>`).join("")}</div>${bulk}`;
      }
      host.querySelectorAll("[data-onlyapp-all]").forEach((btn) => btn.addEventListener("click", async () => {
        const on = btn.getAttribute("data-onlyapp-all") === "1";
        const res = await A.setOnlyAppAll(on);
        if (res && res.ok) toast(on ? `Правило включено: ${res.updated || 0} сотрудников` : "Браузер разрешён всем");
        else toast("Не удалось применить (нужен админ-вход)");
        initStaffPage();
      }));
      host.querySelectorAll("[data-revoke]").forEach((btn) => btn.addEventListener("click", async () => {
        const [slug, device] = btn.getAttribute("data-revoke").split("|");
        if (!device) { toast("Устройство не найдено — обновите список"); return; }
        const res = await A.revokeDevice(slug, device);
        if (res && res.ok) { toast("Устройство отвязано"); initStaffPage(); }
        else toast("Не удалось отвязать");
      }));
    }).catch(() => {});
    A.loginFails().then((list) => {
      if (!Array.isArray(list) || !list.length) return;
      const total = list.reduce((s, x) => s + (+x.fails || 0), 0);
      const head = app.querySelector(".staff-head");
      if (head && !document.getElementById("staff-fails")) {
        head.insertAdjacentHTML("afterend", `<p class="staff-hint" id="staff-fails">🔒 Неудачные входы (за 15 мин): <b>${total}</b> — ${list.map((x) => escNow(x.slug) + " ×" + (+x.fails || 0)).join(", ")}</p>`);
      }
    }).catch(() => {});
    app.insertAdjacentHTML("beforeend", `<div class="sc-wrap">
      <h3><i class="ph-bold ph-medal"></i> Достижения, бонусы и зоны роста</h3>
      <p class="staff-hint">Записи появляются на личной странице сотрудника в соответствующем разделе.</p>
      <div class="sc-form">
        <select id="sc-emp">${rows.map((r) => `<option value="${escNow(r.slug)}">${escNow(r.fio)}</option>`).join("")}</select>
        <select id="sc-section">
          <option value="bonus">Бонусы</option>
          <option value="awards">Награды</option>
          <option value="growth">Зоны роста</option>
          <option value="lvl">Достижения</option>
          <option value="stats">Статистика</option>
        </select>
        <input id="sc-title" placeholder="Заголовок">
        <input id="sc-value" placeholder="Сумма/подпись (5 000 ₽)">
        <input id="sc-date" type="date">
        <textarea id="sc-body" placeholder="Описание" rows="2"></textarea>
        <button class="btn btn-primary" id="sc-add">Добавить</button>
      </div>
      <div class="sc-list" id="sc-list"></div>
    </div>`);    $("#staff-out").addEventListener("click", () => { A.logout("admin"); initStaffPage(); });

    /* Добавление сотрудника: создаёт/обновляет запись otp_staff (логин, пароль).
       Если код страницы новый — страница появится после добавления в данные сайта. */
    const saAdd = $("#sa-add");
    if (saAdd) saAdd.addEventListener("click", async () => {
      const fio = ($("#sa-fio") || {}).value.trim();
      const pass = ($("#sa-pass") || {}).value;
      let slug = ($("#sa-slug") || {}).value.trim();
      const login = ($("#sa-login") || {}).value.trim();
      const avatar = ($("#sa-avatar") || {}).value.trim();
      const msg = $("#sa-msg");
      if (!msg) return;
      if (fio.length < 3) { msg.textContent = "Укажи ФИО."; return; }
      if (pass.length < 6) { msg.textContent = "Пароль не короче 6 символов."; return; }
      if (!slug) {
        const buf = new Uint8Array(6);
        crypto.getRandomValues(buf);
        slug = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
      }
      saAdd.disabled = true;
      const res = await A.saveStaff({ slug, fio, login, pass, avatar, active: true }).catch(() => null);
      saAdd.disabled = false;
      if (!res || !res.ok) {
        msg.textContent = "Не удалось сохранить: " + ((res && res.error) || "ошибка связи");
        return;
      }
      const known = D.employees.some((e) => (e.slug || e.id) === slug);
      let queued = false;
      if (!known) {
        const chk = $("#sa-pages");
        const c = D.hrRules && D.hrRules.cloud;
        if (chk && chk.checked && c && c.url && c.key) {
          fetch(`${c.url.replace(/\/$/, "")}/rest/v1/otp_tasks`, {
            method: "POST",
            headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify([{
              id: "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
              kind: "add_employee",
              payload: { fio, slug },
              requested_by: window.OTP_ACTOR || "Руководитель",
            }]),
          }).catch(() => {});
          queued = true;
        }
      }
      __staffMsg = known
        ? `Сохранено: ${fio}.`
        : `Сохранено: ${fio}. ` + (queued
          ? "Страница создаётся — появится в течение 5 минут."
          : `Страница появится после добавления в данные сайта: ${location.origin}${SITE_ROOT}team/${slug}/start/`);
      initStaffPage();
    });
    /* KPI за месяц: сохраняем в otp_kpi и ставим задачу агенту (он применит к data.js) */
    const kpiEmp = $("#kpi-emp"), kpiMonth = $("#kpi-month");
    const KPI_KEYS = ["quality", "learnability", "initiative", "engagement", "discipline"];
    const kpiFill = () => {
      if (!kpiEmp || !kpiMonth) return;
      const e = D.employees.find((x) => (x.slug || x.id) === kpiEmp.value);
      const h = e && (e.history || []).find((x) => x.key === kpiMonth.value);
      KPI_KEYS.forEach((k) => { const el = $("#kpi-" + k); if (el) el.value = (h && h[k] != null) ? h[k] : ""; });
      const b = $("#kpi-bonus"); if (b) b.value = (h && h.bonus != null) ? h.bonus : "";
      const n = $("#kpi-note"); if (n) n.value = "";
    };
    if (kpiEmp) kpiEmp.addEventListener("change", kpiFill);
    if (kpiMonth) kpiMonth.addEventListener("change", kpiFill);
    kpiFill();
    const kpiSave = $("#kpi-save");
    if (kpiSave) kpiSave.addEventListener("click", async () => {
      const msg = $("#kpi-msg");
      const emp = D.employees.find((x) => (x.slug || x.id) === (kpiEmp ? kpiEmp.value : ""));
      if (!emp || !msg || !kpiMonth) return;
      const month = kpiMonth.value;
      const val = (id) => { const el = $(id); return el && el.value !== "" ? +el.value : null; };
      const row = {
        id: (emp.slug || emp.id) + ":" + month,
        emp_slug: emp.slug || emp.id,
        month,
        quality: val("#kpi-quality"), learnability: val("#kpi-learnability"),
        initiative: val("#kpi-initiative"), engagement: val("#kpi-engagement"),
        discipline: val("#kpi-discipline"), bonus: val("#kpi-bonus"),
        note: ($("#kpi-note") || {}).value || "",
        updated_by: window.OTP_ACTOR || "Руководитель",
      };
      const c = D.hrRules && D.hrRules.cloud;
      if (!c || !c.url || !c.key) { msg.textContent = "Нет конфигурации облака."; return; }
      const base = c.url.replace(/\/$/, "");
      const headers = { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json", Prefer: "return=minimal" };
      kpiSave.disabled = true;
      try {
        const r = await fetch(`${base}/rest/v1/otp_kpi`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([row]),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        await fetch(`${base}/rest/v1/otp_tasks`, {
          method: "POST", headers,
          body: JSON.stringify([{
            id: "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            kind: "apply_kpi", payload: { emp_slug: row.emp_slug, month },
            requested_by: row.updated_by,
          }]),
        });
        msg.textContent = "Сохранено. Применится к сайту в течение 5 минут.";
      } catch (e) {
        msg.textContent = "Не удалось сохранить: " + e.message;
      }
      kpiSave.disabled = false;
    });
    if (__staffMsg) { const m = $("#sa-msg"); if (m) m.textContent = __staffMsg; __staffMsg = ""; }
    const scList = $("#sc-list");
    const scEmp = $("#sc-emp");
    const escX = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[c]));
    const loadContent = async () => {
      if (!scList || !scEmp) return;
      const list = await A.contentList(scEmp.value);
      scList.innerHTML = (list || []).length
        ? list.map((x) => `<div class="sc-item"><div><b>${escX(x.title || "Без названия")}</b><span>${escX(x.section)}${x.on_date ? " · " + escX(x.on_date) : ""}${x.value ? " · " + escX(x.value) : ""}</span><p>${escX(x.body || "")}</p></div><button class="sc-del" data-del="${escX(x.id)}">Удалить</button></div>`).join("")
        : `<div class="sc-empty">Пока нет записей</div>`;
      scList.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
        b.disabled = true;
        await A.delContent(b.getAttribute("data-del"));
        loadContent();
      }));
    };
    if (scEmp) { scEmp.addEventListener("change", loadContent); loadContent(); }
    if ($("#sc-add")) $("#sc-add").addEventListener("click", async () => {
      const row = { emp: scEmp.value, section: $("#sc-section").value, title: $("#sc-title").value.trim(), value: $("#sc-value").value.trim(), onDate: $("#sc-date").value, body: $("#sc-body").value.trim() };
      if (!row.title && !row.body) return;
      const res = await A.saveContent(row);
      if (res && res.ok) { $("#sc-title").value = ""; $("#sc-value").value = ""; $("#sc-body").value = ""; loadContent(); }
    });
    const toast = (text) => {
      const el = document.createElement("div");
      el.className = "toast";
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2600);
    };
    app.querySelectorAll("[data-eye]").forEach((b) => b.addEventListener("click", () => {
      const inp = b.closest(".pass-wrap") && b.closest(".pass-wrap").querySelector("input");
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
    }));
    app.querySelectorAll("[data-access]").forEach((btn) => btn.addEventListener("click", async () => {
      const row = btn.closest(".staff-row");
      if (!row) return;
      const slug = row.getAttribute("data-slug");
      const info = rows.find((x) => x.slug === slug) || {};
      const typedPass = ((row.querySelector(`[data-f="pass"]`) || {}).value || "").trim();
      /* Если пароль введён прямо сейчас — сначала сохраняем его, чтобы в тексте
         оказался рабочий пароль. Не сохранился — пароль в текст не попадёт. */
      if (typedPass) {
        if (typedPass.length < 6) { toast("Пароль короче 6 символов — сервер его не примет"); return; }
        const saved = await A.saveStaff({
          slug,
          fio: (row.querySelector(`[data-f="fio"]`) || {}).value.trim() || info.fio,
          login: (row.querySelector(`[data-f="login"]`) || {}).value.trim(),
          pass: typedPass,
          avatar: (row.querySelector(`[data-f="avatar"]`) || {}).value.trim(),
          active: true,
        }).catch(() => null);
        if (!saved || !saved.ok) {
          toast("Не удалось сохранить пароль: " + ((saved && saved.error) || "ошибка связи"));
          return;
        }
        const chk = await A.verifyPass(slug, typedPass);
        if (chk && chk.ok && chk.matches === false) {
          toast("Пароль НЕ записался в базу — текст доступа не копирую");
          return;
        }
        __sessionPass.set(slug, typedPass);
        const fld = row.querySelector(`[data-f="pass"]`);
        if (fld) fld.value = "";
      }
      const pass = typedPass || __sessionPass.get(slug) || __sessionPass.get(info.fio) || info.pass || "";
      if (!pass) {
        toast("Сначала задайте пароль: введите его в поле «Пароль» и нажмите «Текст доступа»");
        return;
      }
      const fio = (row.querySelector(`[data-f="fio"]`) || {}).value || info.fio || "";
      const hash = info.hash || "";
      const link = hash ? "https://videoxiter.github.io/9a57a59df2fd/team/" + hash + "/start/index.html" : "";
      const text = "Привет! Это «Мои результаты» — личный кабинет сотрудника отдела технической поддержки ОТП.\n\n"
        + (fio ? fio + ", твоя страница:\n" : "Твоя страница:\n") + link + "\n"
        + "Пароль: " + pass + "\n\n"
        + "Зачем это нужно:\n"
        + "• видеть свои результаты и расти осознанно: KPI по месяцам, место в рейтинге, бонусы и доход;\n"
        + "• не держать в голове часы: «Стартовая» считает смену, перерывы и прогресс дня;\n"
        + "• понимать, куда двигаться: зоны роста, награды, уровни и рекомендации руководителя;\n"
        + "• команде — прозрачность: видно, кто на смене, кто в перерыве, кто отсутствует.\n\n"
        + "Что внутри:\n"
        + "• «Стартовая» — начало и конец смены, перерывы, обед, отсутствие, таймер и норма 7:30 в день\n"
        + "• «Бонусы» и «Карта доходов» — из чего складывается премия и сколько начислено за месяц\n"
        + "• «Мой LVL», «Награды», «Мой рост» — достижения, уровни и зоны развития\n"
        + "• «Статистика» и «Мой график» — метрики и смены на месяц\n"
        + "• «Журнал часов» — увольнительные, переработки и корректировки с решениями руководителя\n"
        + "• «Правила» — как всё считается; «Настройки» — тема, фото и пароль\n\n"
        + "Как начать: открой ссылку на телефоне или ПК, введи пароль (запомнится на 60 дней), "
        + "на «Стартовой» нажми «Начало смены». Перерывы и завершение смены — по кнопкам.";
      try { await navigator.clipboard.writeText(text); toast("Текст доступа скопирован"); }
      catch (e) { window.prompt("Скопируйте текст:", text); }
    }));
    app.querySelectorAll("[data-file]").forEach((btn) => btn.addEventListener("click", () => {
      const row = btn.closest(".staff-row");
      const inp = row && row.querySelector("[data-file-inp]");
      if (inp) inp.click();
    }));
    app.querySelectorAll("[data-file-inp]").forEach((inp) => inp.addEventListener("change", async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const row = inp.closest(".staff-row");
      const slug = row.getAttribute("data-slug");
      const c = D.hrRules && D.hrRules.cloud;
      if (!c || !c.url) return;
      const btn = row.querySelector("[data-file]");
      if (btn) btn.disabled = true;
      const path = slug + "-" + Date.now() + "." + (file.name.split(".").pop() || "png");
      try {
        const res = await fetch(c.url.replace(/\/$/, "") + "/storage/v1/object/avatars/" + path, {
          method: "POST",
          headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": file.type, "x-upsert": "true" },
          body: file,
        });
        if (res.ok) {
          const url = c.url.replace(/\/$/, "") + "/storage/v1/object/public/avatars/" + path;
          row.querySelector(`[data-f="avatar"]`).value = url;
          await A.saveStaff({
            slug: slug,
            fio: row.querySelector(`[data-f="fio"]`).value.trim(),
            login: row.querySelector(`[data-f="login"]`).value.trim(),
            avatar: url,
            active: row.querySelector(`[data-f="active"]`).checked,
          });
        }
      } catch (e) {}
      if (btn) btn.disabled = false;
    }));
    app.querySelectorAll("[data-save]").forEach((btn) => btn.addEventListener("click", async () => {
      const row = btn.closest(".staff-row");
      const get = (f) => row.querySelector(`[data-f="${f}"]`);
      const ok = row.querySelector(".staff-ok");
      btn.disabled = true;
      const typed = (get("pass").value || "").trim();
      const res = await A.saveStaff({
        slug: row.getAttribute("data-slug"),
        fio: get("fio").value.trim(),
        login: get("login").value.trim(),
        pass: typed || null,
        avatar: get("avatar").value.trim(),
        active: get("active").checked,
      });
      btn.disabled = false;
      if (res && res.ok) {
        const hadPass = !!typed;
        if (hadPass) {
          /* v14: сверяем, что пароль действительно записался (crypt по хешу) */
          const chk = await A.verifyPass(row.getAttribute("data-slug"), typed);
          if (chk && chk.ok && chk.matches === false) {
            toast("Пароль НЕ записался в базу — повторите сохранение");
            return;
          }
          __sessionPass.set(row.getAttribute("data-slug"), typed);
          __sessionPass.set(String(get("fio").value.trim()), typed);
        }
        if (ok) { ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000); }
        toast(hadPass ? "Пароль сохранён" : "Данные сохранены");
        if (hadPass) get("pass").value = "";
      }
    }));
  }

  /* аватар руководителя в шапке (v4: только если есть админ-сессия,
     иначе otp_staff_admin_list вернёт forbidden — просто без аватара) */
  if (window.OTP_AUTH && D.hrRules && D.hrRules.cloud && window.OTP_AUTH.token("admin")) {
    window.OTP_AUTH.staffList().then((list) => {
      const ad = (list || []).find((x) => x.slug === "admin");
      if (ad && ad.avatar) {
        const logo = document.querySelector(".nav-logo");
        if (logo && !document.querySelector(".nav-ava")) {
          logo.insertAdjacentHTML("afterend", `<span class="nav-ava"><img src="${ad.avatar}" alt=""></span>`);
        }
      }
    }).catch(() => {});
  }

  otp.reveal(document);
})();