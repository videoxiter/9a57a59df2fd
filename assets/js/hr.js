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
  async function pull() {
    if (!ENDPOINT) return { online: false };
    try {
      const r = await fetch(ENDPOINT + "/requests", { cache: "no-store" });
      const j = await r.json();
      const remote = Array.isArray(j.requests) ? j.requests : [];
      const by = {};
      for (const x of [...remote, ...load()]) {
        const prev = by[x.id];
        if (!prev || (x.decided || x.created || "") > (prev.decided || prev.created || "")) by[x.id] = Object.assign({}, prev, x);
      }
      const merged = Object.values(by);
      save(merged);
      return { online: true, list: merged };
    } catch (e) { return { online: false }; }
  }
  async function push(list) {
    if (!ENDPOINT) return false;
    try {
      await fetch(ENDPOINT + "/requests", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: list }) });
      return true;
    } catch (e) { return false; }
  }
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
             <button class="hr-ok" data-ok="${r.id}" title="Одобрить"><i class="ph-bold ph-check"></i></button>
             <button class="hr-no" data-no="${r.id}" title="Отказать"><i class="ph-bold ph-x"></i></button>
           </span>`
        : r.status === "approved"
          ? '<span class="req-st ok"><i class="ph-bold ph-check-circle"></i> подтверждено</span>'
          : '<span class="req-st no"><i class="ph-bold ph-x-circle"></i> отказано</span>'}
    </div>`;
  }

  function render() {
    const box = document.getElementById("hr-requests");
    if (!box) return;
    const all = load().sort((a, b) => (b.created || "").localeCompare(a.created || ""));
    const pending = all.filter((r) => r.status === "pending");
    const decided = all.filter((r) => r.status !== "pending");
    const owed = {};
    for (const r of all) {
      if (r.status !== "approved") continue;
      const h = hoursOf(r) * (r.type === "overtime" ? 1 : -1);
      owed[r.empName || r.empSlug] = Math.round(((owed[r.empName || r.empSlug] || 0) + h) * 10) / 10;
    }
    box.innerHTML = `
      <div class="hr-head">
        <h2><i class="ph-bold ph-clipboard-text"></i> Заявки сотрудников</h2>
        <span class="hr-stat">${pending.length ? `<b>${pending.length}</b> ждут решения` : "нет новых заявок"}</span>
      </div>
      <div class="hr-pending">${pending.length ? pending.map((r) => row(r)).join("") : '<p class="muted">Все заявки рассмотрены.</p>'}</div>
      <details class="hr-history" ${decided.length ? "" : "hidden"}>
        <summary>История решений · ${decided.length}</summary>
        ${decided.map((r) => row(r, true)).join("")}
      </details>
      ${Object.keys(owed).length ? `<div class="hr-owed">Баланс часов по подтверждённым заявкам:
        ${Object.entries(owed).map(([n, h]) => `<span><b>${n.split(" ")[0]}</b> ${h >= 0 ? "+" : "−"}${fmtH(Math.abs(h))}</span>`).join("")}</div>` : ""}
      <p class="hr-note"><i class="ph ph-info"></i> Заявки хранятся в этом браузере (общий ключ с персональными страницами).
        Чтобы решения уходили сотруднику на любое устройство, подключи вебхук Hermes — скажи, и настрою.</p>`;

    box.querySelectorAll("[data-ok]").forEach((b) => b.addEventListener("click", () => decide(b.dataset.ok, "approved")));
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

  function decide(id, status, reject) {
    const list = load();
    const r = list.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    r.reject = reject || "";
    r.decided = new Date().toISOString();
    save(list);
    push(list);
    render();
  }

  function refresh() { render(); pull().then(() => render()); }
  document.addEventListener("DOMContentLoaded", refresh);
  if (document.readyState !== "loading") refresh();
  setInterval(() => pull().then((r) => { if (r.online) render(); }), 60000);
})();
