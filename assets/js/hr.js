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
    const all = load2().filter((r) => r.status !== "cancelled").sort((a, b) => (b.created || "").localeCompare(a.created || ""));
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
      <div class="hr-tools">
        <button class="btn btn-ghost" id="hr-export"><i class="ph-bold ph-download-simple"></i> Экспорт заявок</button>
        <label class="btn btn-ghost"><i class="ph-bold ph-upload-simple"></i> Импорт заявок
          <input type="file" id="hr-import" accept=".json" hidden></label>
        <span class="hr-provider">${(CLOUD && CLOUD.provider()) ? "канал: " + CLOUD.provider() : "канал: локальный"}</span>
      </div>
      <p class="hr-note"><i class="ph ph-info"></i> Экспорт/импорт — обмен заявками без общего сервера: сотрудник присылает файл,
        ты импортируешь здесь решения. Для полной синхронизации подключи облачную базу (scripts/cloud.json).</p>`;

    const exp = box.querySelector("#hr-export");
    if (exp) exp.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify({ requests: load2() }, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "otp-requests-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
    });
    const imp = box.querySelector("#hr-import");
    if (imp) imp.addEventListener("change", async () => {
      const f = imp.files && imp.files[0];
      if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        const incoming = Array.isArray(j) ? j : (j.requests || []);
        const merged = CLOUD ? CLOUD.merge(load2(), incoming) : incoming;
        save2(merged);
        if (CLOUD) await CLOUD.put(merged);
        render();
      } catch (e) { alert("Не удалось прочитать файл заявок"); }
    });
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
    const list = load2();
    const r = list.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    r.reject = reject || "";
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
