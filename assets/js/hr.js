/* Согласование заявок сотрудников: переработки, увольнительные, отгулы.
   Данные — общий с персональными страницами ключ localStorage (otp_hr_requests_v1).
   Показывает то, что оформлено в этом браузере: заявку сотрудник оформляет на своей
   странице «Мой график», руководитель решает здесь. */
(function () {
  "use strict";
  const KEY = "otp_hr_requests_v1";
  const TYPES = {
    overtime: { label: "Переработка", icon: "ph-clock-plus" },
    leave: { label: "Увольнительная", icon: "ph-door-open" },
    dayoff: { label: "Отгул за вых. смену", icon: "ph-calendar-minus" },
  };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } };
  const save = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };
  const ENDPOINT = ((window.OTP_DATA && window.OTP_DATA.hrRules && window.OTP_DATA.hrRules.endpoint) || "").replace(/\/$/, "");
  const CLOUD = window.OTP_CLOUD || null;
  const load2 = () => (CLOUD ? CLOUD.loadLocal() : load());
  const save2 = (l) => (CLOUD ? CLOUD.saveLocal(l) : save(l));
  async function pull() {
    if (!CLOUD) return { online: false };
    const s = await CLOUD.sync();
    return s.online ? { online: true, list: s.list } : { online: false };
  }
  async function push(list) { return CLOUD ? CLOUD.put(list) : false; }
  const hoursOf = (r) => {
    if (r.type === "dayoff") return r.hours || 8;
    const p = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? +m[1] + +m[2] / 60 : null; };
    const a = p(r.from), b = p(r.to);
    return a == null || b == null ? 0 : Math.max(0, Math.round((b - a) * 10) / 10);
  };
  const fmtH = (h) => (Math.round(h * 10) / 10).toString().replace(".", ",") + " ч";
  const dmy = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; };

  /* Баланс часов сотрудника: база + подтверждённые переработки − увольнительные
     (увольнительные не списываются, если у сотрудника нет провальных показателей
     или руководитель отметил «не списывать»). */
  function empHours(slug) {
    const D = window.OTP_DATA || {};
    const e = (D.employees || []).find((x) => x.slug === slug);
    const base = e ? (e.hours_base || 0) : 0;
    let plus = 0, minus = 0;
    for (const r of load2()) {
      if (r.empSlug !== slug || r.status !== "approved") continue;
      const h = hoursOf(r);
      if (r.type === "overtime") plus += h;
      else if (r.type === "leave" || r.type === "dayoff") {
        // списываем, если руководитель так решил (forceDeduct) либо это обычная увольнительная
        // без защиты по показателям; отгул сам по себе часы не двигает
        const forced = !!r.forceDeduct;
        const plain = r.type === "leave" && !r.noDeduct && !(e && e.no_deduct);
        if (forced || plain) minus += h;
      }
    }
    return { base, plus: Math.round(plus * 10) / 10, minus: Math.round(minus * 10) / 10,
             balance: Math.round((base + plus - minus) * 10) / 10, noDeduct: !!(e && e.no_deduct) };
  }
  const hoursChip = (slug) => {
    const b = empHours(slug);
    const cls = b.balance >= 0 ? "pos" : "neg";
    const label = b.balance >= 0 ? "накоплено" : "должен отработать";
    return `<span class="hr-hours ${cls}" title="База ${fmtH(b.base)} · переработки +${fmtH(b.plus)} · списано −${fmtH(b.minus)}">
      <i class="ph-bold ph-hourglass-high"></i> ${b.balance >= 0 ? "+" : "−"}${fmtH(Math.abs(b.balance))} ${label}</span>`;
  };

  /* Кто ещё отсутствует в отделе на дату заявки: отпуск, отгул, увольнительная. */
  function absencesOn(dateIso, excludeId) {
    const D = window.OTP_DATA || {};
    const out = [];
    if (!dateIso) return out;
    const vac = (D.schedule && D.schedule.vacations && D.schedule.vacations[dateIso.slice(0, 4)]) || {};
    for (const [fio, list] of Object.entries(vac)) {
      for (const p of list || []) {
        if (p.from <= dateIso && dateIso <= p.to) {
          const to = new Date(p.to + "T00:00:00");
          out.push({ who: fio, kind: "отпуск", note: `до ${to.getDate()}.${String(to.getMonth() + 1).padStart(2, "0")}` });
        }
      }
    }
    for (const other of load2()) {
      if (other.id === excludeId) continue;
      if (other.type !== "leave" && other.type !== "dayoff") continue;
      if (other.status !== "approved" && other.status !== "pending") continue;
      if ((other.date || "") !== dateIso) continue;
      out.push({
        who: other.empName || other.empSlug,
        kind: other.type === "leave" ? "увольнительная" : "отгул",
        note: (other.type === "leave" ? `${other.from || ""}–${other.to || ""}` : "на весь день") +
              (other.status === "pending" ? " · ждёт решения" : ""),
      });
    }
    return out;
  }
  function clashNote(r) {
    const list = absencesOn(r.date, r.id);
    if (!list.length) return "";
    const names = list.map((x) => `${(x.who || "").split(" ").slice(0, 2).join(" ")} — ${x.kind} (${x.note})`).join("; ");
    return `<div class="hr-clash" title="На это время в отделе уже кто-то отсутствует">
      <i class="ph-bold ph-warning"></i> На ${dmy(r.date)} уже отсутствуют: ${names}</div>`;
  }

  function row(r, decided) {
    const t = TYPES[r.type] || { label: r.type, icon: "ph-note" };
    return `<div class="hr-row st-${r.status}" data-id="${r.id}">
      <span class="hr-ic"><i class="ph-bold ${t.icon}"></i></span>
      <span class="hr-main">
        <b>${t.label} · ${r.empName || r.empSlug}</b>
        <i>${r.type === "dayoff"
              ? `отгул ${dmy(r.date)} · за выходную смену ${dmy(r.date2)}`
              : `${dmy(r.date)} · ${r.from}–${r.to} · ${fmtH(hoursOf(r))}`}</i>
        ${r.reason ? `<em>${r.reason}</em>` : ""}
        <span class="hr-hours-line">${hoursChip(r.empSlug)}${empHours(r.empSlug).noDeduct ? '<span class="hr-hours-note">показатели 7+ — часы не списываются</span>' : ""}</span>
        ${r.forceDeduct ? '<span class="hr-forced"><i class="ph-bold ph-scissors"></i> списано по решению руководителя</span>' : ""}
        ${clashNote(r)}
        ${r.status === "rejected" && r.reject ? `<em class="rej">Отказ: ${r.reject}</em>` : ""}
      </span>
      ${r.status === "pending" && !decided
        ? `<span class="hr-actions">
             ${r.type === "leave" ? `<label class="hr-nodeduct" title="Часы увольнительной не спишутся с переработки">
               <input type="checkbox" data-nodeduct="${r.id}"> <span>не списывать</span></label>` : ""}
             ${r.type === "leave" || r.type === "dayoff" ? `<label class="hr-force" title="Решение руководителя сильнее правила: часы спишутся, даже если показатели позволяют не списывать">
               <input type="checkbox" data-force="${r.id}"> <span>всё равно списать</span></label>` : ""}
             <button class="hr-ok" data-ok="${r.id}" title="Одобрить"><i class="ph-bold ph-check"></i></button>
             <button class="hr-no" data-no="${r.id}" title="Отказать"><i class="ph-bold ph-x"></i></button>
           </span>`
        : r.status === "approved"
          ? `<span class="req-st ok"><i class="ph-bold ph-check-circle"></i> подтверждено${r.noDeduct ? " · без списания" : ""}</span>`
          : '<span class="req-st no"><i class="ph-bold ph-x-circle"></i> отказано</span>'}
    </div>`;
  }

  function render() {
    const box = document.getElementById("hr-requests");
    if (!box) return;
    const sec = box.closest("section") || box;
    const active = load2().filter((r) => r.status === "pending")
      .sort((x, y) => (y.created || "").localeCompare(x.created || ""));
    if (!active.length) {                       // нет активных заявок — блока на странице нет
      sec.style.display = "none";
      box.innerHTML = "";
      return;
    }
    sec.style.display = "";
    box.innerHTML = `
      <div class="hr-head">
        <h2><i class="ph-bold ph-clipboard-text"></i> Заявки сотрудников</h2>
        <span class="hr-stat"><b>${active.length}</b> ${active.length === 1 ? "активная заявка" : "активных заявок"}</span>
      </div>
      <div class="hr-pending">${active.map((r) => row(r)).join("")}</div>`;

    box.querySelectorAll("[data-ok]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.ok;
      const chk = box.querySelector(`[data-nodeduct="${id}"]`);
      const frc = box.querySelector(`[data-force="${id}"]`);
      decide(id, "approved", "", chk ? chk.checked : false, frc ? frc.checked : false);
    }));
    box.querySelectorAll("[data-nodeduct]").forEach((c) => c.addEventListener("change", () => {
      const f = box.querySelector(`[data-force="${c.dataset.nodeduct}"]`);
      if (c.checked && f) f.checked = false;
    }));
    box.querySelectorAll("[data-force]").forEach((c) => c.addEventListener("change", () => {
      const n = box.querySelector(`[data-nodeduct="${c.dataset.force}"]`);
      if (c.checked && n) n.checked = false;
    }));
    box.querySelectorAll("[data-no]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.no;
      const rowEl = box.querySelector(`.hr-row[data-id="${id}"]`);
      if (rowEl.querySelector(".hr-reject")) return;
      const f = document.createElement("div");
      f.className = "hr-reject";
      f.innerHTML = `<input type="text" placeholder="Причина отказа — её увидит сотрудник" />
        <button class="btn btn-ghost" type="button">Отправить отказ</button>`;
      rowEl.querySelector(".hr-actions").appendChild(f);
      f.querySelector("button").addEventListener("click", () => {
        const why = f.querySelector("input").value.trim();
        if (!why) { f.querySelector("input").focus(); return; }
        decide(id, "rejected", why);
      });
    }));
  }

  function decide(id, status, reject, noDeduct, force) {
    const list = load2();
    const r = list.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    r.reject = reject || "";
    if (status === "approved" && typeof noDeduct === "boolean") r.noDeduct = noDeduct;
    if (status === "approved") r.forceDeduct = !!force;
    r.decided = new Date().toISOString();
    save2(list);
    if (CLOUD) CLOUD.upsert(r); else push(list);
    render();
    if (typeof window.otpRefreshHours === "function") window.otpRefreshHours();
  }

  function refresh() { render(); pull().then(() => render()); }
  document.addEventListener("DOMContentLoaded", refresh);
  if (document.readyState !== "loading") refresh();
  setInterval(() => pull().then((r) => { if (r.online) render(); }), 60000);
})();
