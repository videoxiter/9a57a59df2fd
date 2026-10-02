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
        ${r.status === "rejected" && r.reject ? `<em class="rej">Отказ: ${r.reject}</em>` : ""}
      </span>
      ${r.status === "pending" && !decided
        ? `<span class="hr-actions">
             ${r.type === "leave" ? `<label class="hr-nodeduct" title="Часы увольнительной не спишутся с переработки">
               <input type="checkbox" data-nodeduct="${r.id}"> <span>не списывать</span></label>` : ""}
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
      decide(id, "approved", "", chk ? chk.checked : false);
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

  function decide(id, status, reject, noDeduct) {
    const list = load2();
    const r = list.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    r.reject = reject || "";
    if (status === "approved" && typeof noDeduct === "boolean") r.noDeduct = noDeduct;
    r.decided = new Date().toISOString();
    save2(list);
    if (CLOUD) CLOUD.upsert(r); else push(list);
    render();
  }

  function refresh() { render(); pull().then(() => render()); }
  document.addEventListener("DOMContentLoaded", refresh);
  if (document.readyState !== "loading") refresh();
  setInterval(() => pull().then((r) => { if (r.online) render(); }), 60000);
})();
