/* Р›РѕРіРёРєР° РґР°С€Р±РѕСЂРґР° В«РњРѕСЏ РєРѕРјР°РЅРґР° РћРўРџВ».
   РћРґРёРЅ С„Р°Р№Р» РЅР° РІСЃРµ СЃС‚СЂР°РЅРёС†С‹: РєР°Р¶РґС‹Р№ Р±Р»РѕРє СЃСЂР°Р±Р°С‚С‹РІР°РµС‚ С‚РѕР»СЊРєРѕ РµСЃР»Рё РЅР° СЃС‚СЂР°РЅРёС†Рµ РµСЃС‚СЊ РµРіРѕ РєРѕРЅС‚РµР№РЅРµСЂ.

   index.html        вЂ” РњРѕСЏ РєРѕРјР°РЅРґР° В· РљС‚Рѕ Р»СѓС‡С€Рµ В· Р—Р°СЏРІРєРё В· Р РµР№С‚РёРЅРі РїРѕ KPI
   dynamics/         вЂ” Р”РёРЅР°РјРёРєР° РєРѕРјР°РЅРґС‹ (РіСЂР°С„РёРєРё)
   people/           вЂ” РЎРїРµС†РёР°Р»РёСЃС‚С‹ (РєР°СЂС‚РѕС‡РєРё)
   duties/           вЂ” Р“СЂР°С„РёРє РѕС‚РґРµР»Р° (СЃРјРµРЅС‹ Рё РѕС‚РїСѓСЃРєР°)
   development/      вЂ” Р Р°Р·РІРёС‚РёРµ РѕС‚РґРµР»Р°
*/
(function () {
  "use strict";
  const D = window.OTP_DATA;
  if (!D) return console.error("OTP_DATA РЅРµ Р·Р°РіСЂСѓР¶РµРЅ");
  const bySlug = (s) => (D.employees || []).find((e) => e.slug === s) || null;
  /* РљРѕСЂРµРЅСЊ СЃР°Р№С‚Р° (С‚Р°Рј Р»РµР¶РёС‚ assets/): РїСѓС‚СЊ РґРѕ /team/ Р»РёР±Рѕ РїРµСЂРІС‹Р№ СЃРµРіРјРµРЅС‚ Р°РґСЂРµСЃР°.
     РЎС‚СЂР°РЅРёС†С‹ РґР°С€Р±РѕСЂРґР° Р»РµР¶Р°С‚ РЅР° СѓСЂРѕРІРµРЅСЊ РіР»СѓР±Р¶Рµ РєРѕСЂРЅСЏ вЂ” РЅРµР»СЊР·СЏ СЂРµР·Р°С‚СЊ РїРѕ РїРѕСЃР»РµРґРЅРµРјСѓ СЃР»СЌС€Сѓ. */
  const SITE_ROOT = (() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const t = parts.indexOf("team");
    if (t > 0) return "/" + parts.slice(0, t).join("/") + "/";
    return parts.length > 1 ? "/" + parts[0] + "/" : "/";
  })();
  /* РљРѕСЂРµРЅСЊ РґР°С€Р±РѕСЂРґР° (СЃС‚СЂР°РЅРёС†С‹ В«РњРѕСЏ РєРѕРјР°РЅРґР°В», В«Р–СѓСЂРЅР°Р»В», вЂ¦) вЂ” РґР»СЏ СЃСЃС‹Р»РѕРє РёР· JS. */
  const DASH_BASE = location.pathname.replace(/\/(dynamics|people|duties|development|settings|staff|hours)\/.*$/, "/");

  const bySurname = (fio) => (D.employees || []).find((e) => (e.fullName || "").split(" ")[0] === String(fio).split(" ")[0]) || null;
  const MKEYS = ["quality", "learnability", "initiative", "engagement", "discipline"];
  const ACTIVE = D.employees.filter((e) => e.status !== "left");   // СѓРІРѕР»РµРЅРЅС‹С… РЅРµ РїРѕРєР°Р·С‹РІР°РµРј
  const $ = (s) => document.querySelector(s);
  const WD_SHORT = ["РІСЃ", "РїРЅ", "РІС‚", "СЃСЂ", "С‡С‚", "РїС‚", "СЃР±"];
  const WD_FULL = ["РІРѕСЃРєСЂРµСЃРµРЅСЊРµ", "РїРѕРЅРµРґРµР»СЊРЅРёРє", "РІС‚РѕСЂРЅРёРє", "СЃСЂРµРґР°", "С‡РµС‚РІРµСЂРі", "РїСЏС‚РЅРёС†Р°", "СЃСѓР±Р±РѕС‚Р°"];
  const MON_GEN = ["СЏРЅРІР°СЂСЏ", "С„РµРІСЂР°Р»СЏ", "РјР°СЂС‚Р°", "Р°РїСЂРµР»СЏ", "РјР°СЏ", "РёСЋРЅСЏ", "РёСЋР»СЏ", "Р°РІРіСѓСЃС‚Р°", "СЃРµРЅС‚СЏР±СЂСЏ", "РѕРєС‚СЏР±СЂСЏ", "РЅРѕСЏР±СЂСЏ", "РґРµРєР°Р±СЂСЏ"];
  const isoOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const addDays = (dt, n) => { const d = new Date(dt.getTime()); d.setDate(d.getDate() + n); return d; };
  const surname = (f) => String(f || "").split(" ")[0].toLowerCase().replace("С‘", "Рµ");
  const samePerson = (a, b) => !!a && !!b && surname(a) === surname(b);

  /* ---------- РЅР°РєРѕРїР»РµРЅРЅС‹Рµ С‡Р°СЃС‹ ----------
     РџСЂР°РІРёР»Рѕ РѕРґРЅРѕ РЅР° РІРµСЃСЊ СЃР°Р№С‚ (otp.reqDelta): СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ СЃРїРёСЃС‹РІР°РµС‚ РґРѕ 4 С‡, РµСЃР»Рё
     СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ РЅРµ РїРѕСЃС‚Р°РІРёР» В«РЅРµ СЃРїРёСЃС‹РІР°С‚СЊВ»; РєРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° вЂ” РїРѕ Р·РЅР°РєСѓ; РѕС‚РіСѓР» Р·Р°
     РІС‹С…РѕРґРЅСѓСЋ СЃРјРµРЅСѓ Рё РїСЂРѕС‡РµРµ С‡Р°СЃС‹ РЅРµ РґРІРёРіР°СЋС‚. РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРёС… РёСЃРєР»СЋС‡РµРЅРёР№ РїРѕ KPI РЅРµС‚. */
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
  const fmtH = (h) => (Math.round(h * 10) / 10).toString().replace(".", ",") + " С‡";
  function hoursChip(emp, reqs) {
    const b = balanceOf(emp, reqs);
    if (!b) return "";
    return `<span class="hr-hours ${b.balance >= 0 ? "pos" : "neg"}" title="РЅР°РєРѕРїР»РµРЅРЅР°СЏ РїРµСЂРµСЂР°Р±РѕС‚РєР° РёР»Рё РґРѕР»Рі РїРѕ С‡Р°СЃР°Рј">
      <i class="ph-bold ph-hourglass-high"></i> ${b.balance >= 0 ? "+" : "в€’"}${fmtH(Math.abs(b.balance))} ${b.balance >= 0 ? "РЅР°РєРѕРїР»РµРЅРѕ" : "РґРѕР»Р¶РµРЅ"}</span>`;
  }
  /* Р§Р°СЃС‹ Рё СЃС‚Р°С‚СѓСЃС‹: СЃРЅР°С‡Р°Р»Р° СЂРёСЃСѓРµРј РїРѕ Р»РѕРєР°Р»СЊРЅРѕР№ РєРѕРїРёРё (РјРіРЅРѕРІРµРЅРЅРѕ), РїРѕС‚РѕРј СѓС‚РѕС‡РЅСЏРµРј РїРѕ РѕР±Р»Р°РєСѓ.
     Р’Р°Р¶РЅРѕ РЅРµ Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ РѕС‚СЂРёСЃРѕРІРєСѓ РѕР¶РёРґР°РЅРёРµРј СЃРµС‚Рё вЂ” РёРЅР°С‡Рµ СЃС‚СЂР°РЅРёС†Р° РѕСЃС‚Р°С‘С‚СЃСЏ РїСѓСЃС‚РѕР№. */
  let hydrating = false;

  /* ---------- Р–СѓСЂРЅР°Р» С‡Р°СЃРѕРІ: РІСЃРµ СЃРѕС‚СЂСѓРґРЅРёРєРё, РєС‚Рѕ РїРѕСЃС‚Р°РІРёР»/РѕРґРѕР±СЂРёР» + CSV ---------- */
  async function renderHoursJournal() {
    const box = $("#hours-journal");
    if (!box || box.dataset.ready === "1") return;
    box.dataset.ready = "1";
    const escJ = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const cloud = window.OTP_CLOUD;
    let list = [];
    try { list = (cloud && (await cloud.all())) || []; } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    const isGone = (r) => r.empSlug === "deleted" || /^\[(СѓРґР°Р»РµРЅРѕ|С‚РµСЃС‚)\]/.test(String(r.reason || "")) || /^DIAG TEST/i.test(String(r.reason || ""));
    list = list.filter((r) => !isGone(r));
    const TYPE = { adjust: "РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° (СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ)", overtime: "РџРµСЂРµСЂР°Р±РѕС‚РєР°", leave: "РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ", dayoff: "РћС‚РіСѓР» Р·Р° РІС‹С…. СЃРјРµРЅСѓ" };
    const ST = { approved: "РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ", pending: "РЅР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРё", cancelled: "РѕС‚РјРµРЅРµРЅРѕ", rejected: "РѕС‚РєР»РѕРЅРµРЅРѕ" };
    const signed = (r) => otp.reqDelta(r);
    const names = [...new Set(list.map((r) => r.empName).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ru"));
    const years = [...new Set(list.map((r) => String(r.date || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    box.innerHTML = `
      <h3 class="hr-block-h"><i class="ph-bold ph-clock-counter-clockwise"></i> Р–СѓСЂРЅР°Р» С‡Р°СЃРѕРІ вЂ” РІСЃРµ СЃРѕС‚СЂСѓРґРЅРёРєРё</h3>
      <div class="hj-filters">
        <label class="hj-f"><span>РЎРѕС‚СЂСѓРґРЅРёРє</span><select id="hjx-emp"><option value="">Р’СЃРµ</option>${names.map((n) => `<option value="${escJ(n)}">${n}</option>`).join("")}</select></label>
        <label class="hj-f"><span>РћРїРµСЂР°С†РёРё</span><select id="hjx-kind"><option value="">Р’СЃРµ</option><option value="plus">РќР°С‡РёСЃР»РµРЅРёСЏ</option><option value="minus">РЎРїРёСЃР°РЅРёСЏ</option></select></label>
        <label class="hj-f"><span>РСЃС‚РѕС‡РЅРёРє</span><select id="hjx-src"><option value="">Р’СЃРµ</option><option value="boss">Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ/РіР»Р°РІРЅС‹Р№</option><option value="emp">Р—Р°СЏРІРєР° СЃРѕС‚СЂСѓРґРЅРёРєР°</option></select></label>
        <label class="hj-f"><span>РџРµСЂРёРѕРґ</span><select id="hjx-year"><option value="">Р’СЃС‘ РІСЂРµРјСЏ</option>${years.map((y) => `<option value="${y}">${y}</option>`).join("")}</select></label>
        <label class="hj-f"><span>РЎС‚Р°С‚СѓСЃ</span><select id="hjx-status"><option value="">Р’СЃРµ</option><option value="approved">РџРѕРґС‚РІРµСЂР¶РґРµРЅРѕ</option><option value="pending">РќР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРё</option><option value="cancelled">РћС‚РјРµРЅРµРЅРѕ</option></select></label>
        <button class="btn btn-primary" type="button" id="hjx-csv"><i class="ph-bold ph-download-simple"></i> Р’С‹РіСЂСѓР·РёС‚СЊ CSV</button>
      </div>
      <div class="hj-sum" id="hjx-sum"></div>
      <div class="hj-table-wrap"><table class="hj-table"><thead><tr>
        <th>Р”Р°С‚Р°</th><th>РЎРѕС‚СЂСѓРґРЅРёРє</th><th>РљС‚Рѕ</th><th>РСЃС‚РѕС‡РЅРёРє</th><th>РўРёРї</th><th class="num">Р§Р°СЃС‹</th><th>РџСЂРёС‡РёРЅР°</th><th>РЎС‚Р°С‚СѓСЃ</th><th class="num">РћСЃС‚Р°С‚РѕРє</th>
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
      // РѕСЃС‚Р°С‚РѕРє РїРѕ С…СЂРѕРЅРѕР»РѕРіРёРё
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
        const who = r.decidedBy || (r.status === "approved" ? "СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ (СЂР°РЅРµРµ)" : "вЂ”");
        return `<tr><td class="mono">${escJ(String(r.date || "вЂ”"))}</td><td>${escJ(String(r.empName || ""))}</td>
          <td class="hj-who">${escJ(String(who))}</td>
          <td>${r.type === "adjust" ? '<span class="hj-boss">СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ</span>' : '<span class="hj-emp-src">Р·Р°СЏРІРєР°</span>'}</td>
          <td>${escJ(TYPE[r.type] || r.type || "")}</td>
          <td class="num ${hh < 0 ? "neg" : "pos"}"${note ? ` title="${escJ(note)}"` : ""}>${hh === 0 ? "0" : (hh > 0 ? "+" : "") + hh}${note ? '<sup class="hj-zero">В·</sup>' : ""}</td>
          <td class="hj-why">${escJ(String(r.reason || ""))}</td>
          <td><span class="hj-st hj-${r.status || "pending"}">${ST[r.status] || r.status || ""}</span>${(() => { const d = otp.reqDecision(r); return d ? `<span class="hj-dec">${escJ(d)}</span>` : ""; })()}</td>
          <td class="num hj-left">${r.status === "approved" ? balMap.get(r.id) : "вЂ”"}</td></tr>`;
      }).join("");
      const pager = document.getElementById("hjx-pager");
      if (pager) {
        if (pages <= 1) pager.innerHTML = "";
        else {
          const nums = [];
          for (let i = 0; i < pages; i++) {
            if (pages > 7 && i > 0 && i < pages - 1 && Math.abs(i - page) > 1) {
              if (nums[nums.length - 1] !== "вЂ¦") nums.push("вЂ¦");
              continue;
            }
            nums.push(i);
          }
          pager.innerHTML = `<button class="hj-pg" data-pg="${page - 1}" ${page === 0 ? "disabled" : ""}>вЂ№</button>`
            + nums.map((n) => n === "вЂ¦" ? '<span class="hj-pg-dots">вЂ¦</span>'
              : `<button class="hj-pg${n === page ? " on" : ""}" data-pg="${n}">${n + 1}</button>`).join("")
            + `<button class="hj-pg" data-pg="${page + 1}" ${page >= pages - 1 ? "disabled" : ""}>вЂє</button>`
            + `<span class="hj-pg-info">${page * PER + 1}вЂ“${Math.min(shown.length, (page + 1) * PER)} РёР· ${shown.length}</span>`;
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
        `<span class="hj-chip">Р·Р°РїРёСЃРµР№: <b>${shown.length}</b></span>
         <span class="hj-chip plus">РЅР°С‡РёСЃР»РµРЅРѕ: <b>+${plus} С‡</b></span>
         <span class="hj-chip minus">СЃРїРёСЃР°РЅРѕ: <b>${minus} С‡</b></span>`;
    }
    [["hjx-emp", "emp"], ["hjx-kind", "kind"], ["hjx-src", "src"], ["hjx-year", "year"], ["hjx-status", "status"]].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => { f[key] = el.value; page = 0; draw(); });
    });
    const csv = document.getElementById("hjx-csv");
    if (csv) csv.addEventListener("click", () => {
      const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
      const head = ["Р”Р°С‚Р°", "РЎРѕС‚СЂСѓРґРЅРёРє", "РљС‚Рѕ", "РСЃС‚РѕС‡РЅРёРє", "РўРёРї", "Р§Р°СЃС‹", "РџСЂРёС‡РёРЅР°", "РЎС‚Р°С‚СѓСЃ", "РћСЃС‚Р°С‚РѕРє С‡Р°СЃРѕРІ"];
      const rows = [head.map(q).join(";")].concat(shown.map((r) => [r.date || "", r.empName || "", r.decidedBy || "", r.type === "adjust" ? "СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ" : "Р·Р°СЏРІРєР° СЃРѕС‚СЂСѓРґРЅРёРєР°", TYPE[r.type] || r.type || "", signed(r), r.reason || "", ST[r.status] || r.status || "", r.status === "approved" ? String(balMap.get(r.id)) : ""].map(q).join(";")));
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
        el.innerHTML = st ? `<span class="td-chip k-${st.kind}" title="Р›РёРЅРёСЏ, СЃРјРµРЅР° Рё РѕС‚СЃСѓС‚СЃС‚РІРёСЏ РЅР° СЃРµРіРѕРґРЅСЏ"><i class="ph-bold ${tdIcon(st.kind)}"></i> ${st.text}</span>` : "";
      });
    };
    try {
      const local = window.OTP_CLOUD ? window.OTP_CLOUD.loadLocal() || [] : [];
      window.OTP_REQS = local;
      paint(local);
      renderHoursAdmin(local);
    } catch (e) { /* Р»РѕРєР°Р»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ РјРѕРіР»Рё Р±С‹С‚СЊ Р±РёС‚С‹РјРё вЂ” РЅРµ РєСЂРёС‚РёС‡РЅРѕ */ }
    try {
      const list = window.OTP_CLOUD ? await window.OTP_CLOUD.all() : null;
      if (list) { window.OTP_REQS = list; paint(list); renderHoursAdmin(list); }
    } catch (e) { /* РЅРµС‚ СЃРµС‚Рё вЂ” РѕСЃС‚Р°СЋС‚СЃСЏ Р»РѕРєР°Р»СЊРЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ */ }
    hydrating = false;
  }
  /* ---------- Р§Р°СЃС‹: РЅР°С‡РёСЃР»РµРЅРёРµ/СЃРїРёСЃР°РЅРёРµ РѕС‚ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ ---------- */
  const escT = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const HX_PER = 10;            // РёСЃС‚РѕСЂРёСЏ РЅР°С‡РёСЃР»РµРЅРёР№/СЃРїРёСЃР°РЅРёР№ вЂ” РїРѕ 10 РЅР° СЃС‚СЂР°РЅРёС†Сѓ
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
        <b class="hx-h ${h >= 0 ? "pos" : "neg"}">${h >= 0 ? "+" : "в€’"}${fmtH(Math.abs(h))}</b>
        <span class="hx-r">${escT(r.reason || "")}</span>
      </div>`;
    };
    const pager = pages > 1 ? `<div class="hj-pager hx-pager">
      <button class="hj-pg" data-hxpg="${hxPage - 1}" ${hxPage === 0 ? "disabled" : ""}>вЂ№</button>
      ${Array.from({ length: pages }, (_, i) => `<button class="hj-pg${i === hxPage ? " on" : ""}" data-hxpg="${i}">${i + 1}</button>`).join("")}
      <button class="hj-pg" data-hxpg="${hxPage + 1}" ${hxPage >= pages - 1 ? "disabled" : ""}>вЂє</button>
      <span class="hj-pg-info">${hxPage * HX_PER + 1}вЂ“${Math.min(all.length, (hxPage + 1) * HX_PER)} РёР· ${all.length}</span>
    </div>` : "";
    box.innerHTML = `<div class="hx-wrap">
      <div class="hx-head">
        <h3><i class="ph-bold ph-hourglass-high"></i> Р§Р°СЃС‹: РЅР°С‡РёСЃР»РёС‚СЊ РёР»Рё СЃРїРёСЃР°С‚СЊ</h3>
        <span class="hx-note">СЂРµС€РµРЅРёРµ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ В· РёСЃС‚РѕСЂРёСЏ РІРёРґРЅР° РІСЃРµРј СЃРѕС‚СЂСѓРґРЅРёРєР°Рј</span>
      </div>
      <form class="hx-form" id="hx-form" autocomplete="off">
        <select id="hx-emp">${emps.map((e) => `<option value="${e.slug}">${escT(e.fullName)}</option>`).join("")}</select>
        <input id="hx-hours" type="number" step="0.5" inputmode="decimal" placeholder="С‡Р°СЃС‹: +2 РёР»Рё в€’1,5" required>
        <input id="hx-reason" type="text" maxlength="160" placeholder="РџСЂРёС‡РёРЅР° (РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)" required>
        <button type="submit" class="hx-btn"><i class="ph-bold ph-check"></i> РџСЂРёРјРµРЅРёС‚СЊ</button>
      </form>
      <p class="hx-rule"><i class="ph-bold ph-info"></i> РџРѕРґС‚РІРµСЂР¶РґС‘РЅРЅР°СЏ РєРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° СЃРґРІРёРіР°РµС‚ С‡Р°СЃС‹: РїР»СЋСЃ РЅР°С‡РёСЃР»СЏРµС‚, РјРёРЅСѓСЃ СЃРїРёСЃС‹РІР°РµС‚. РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ СЃРїРёСЃС‹РІР°РµС‚ РґРѕ 4 С‡, РѕС‚РіСѓР» Р·Р° РІС‹С…РѕРґРЅСѓСЋ СЃРјРµРЅСѓ вЂ” РІСЃРµРіРґР° 0.</p>
      <div class="hx-log">
        <div class="hx-log-h">РСЃС‚РѕСЂРёСЏ РЅР°С‡РёСЃР»РµРЅРёР№ Рё СЃРїРёСЃР°РЅРёР№ <span>${all.length}</span></div>
        ${list.length ? list.map(row).join("") : `<div class="hx-empty">РџРѕРєР° РЅРµС‚ Р·Р°РїРёСЃРµР№.</div>`}
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
      // РјРёРЅСѓСЃ С‚РѕР¶Рµ РґРѕРїСѓСЃС‚РёРј: РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅР°СЏ РєРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° СЃРїРёСЃС‹РІР°РµС‚ С‡Р°СЃС‹
      const nowIso = new Date().toISOString();
      const rec = {
        id: "adj-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        empSlug: emp.slug, empName: emp.fullName, type: "adjust",
        date: isoDate(new Date()), from: "", to: "", hours: h, reason,
        status: "approved", created: nowIso, decided: nowIso, decidedBy: window.OTP_ACTOR || "РЇРєРѕРІР»РµРІ Р•.Р•.",
      };
      try { if (window.OTP_CLOUD) await window.OTP_CLOUD.upsert(rec); } catch (err) {}
      $("#hx-hours").value = "";
      $("#hx-reason").value = "";
      hxPage = 0;                                   // СЃРІРµР¶Р°СЏ Р·Р°РїРёСЃСЊ вЂ” РЅР° РїРµСЂРІСѓСЋ СЃС‚СЂР°РЅРёС†Сѓ
      await hydrateHours();
      renderHoursAdmin(window.OTP_REQS || []);
    });
  }

  const tdIcon = (k) => k === "shift" ? "ph-clock" : k === "vacation" ? "ph-airplane-tilt"
    : k === "leave" ? "ph-door-open" : k === "dayoff" ? "ph-calendar-minus" : "ph-moon";
  window.otpRefreshHours = hydrateHours;      // С‡С‚РѕР±С‹ Р±Р»РѕРє СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЏ Р·Р°СЏРІРѕРє РѕР±РЅРѕРІРёР» С‡Р°СЃС‹ СЃСЂР°Р·Сѓ РїРѕСЃР»Рµ СЂРµС€РµРЅРёСЏ

  /* ---------- РєС‚Рѕ РЅР° РєР°РєРѕР№ Р»РёРЅРёРё Рё РєС‚Рѕ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ (РѕР±С‰РµРµ РґР»СЏ РґР°С€Р±РѕСЂРґР°) ---------- */
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
    if (!days) {                                // РІ РіСЂР°С„РёРєРµ Р¤РРћ РјРѕР¶РµС‚ РѕС‚Р»РёС‡Р°С‚СЊСЃСЏ РЅР°РїРёСЃР°РЅРёРµРј вЂ” РёС‰РµРј РїРѕ С„Р°РјРёР»РёРё
      const key = Object.keys(m.shifts).find((k) => samePerson(k, fio));
      days = key ? m.shifts[key] : null;
    }
    return days ? days[String(dt.getDate())] || null : null;
  }
  /* Р›РёРЅРёРё С‡РµР»РѕРІРµРєР°: РІСЃРµ, РіРґРµ РѕРЅ СѓРєР°Р·Р°РЅ РЅР° РўР•РљРЈР©Р•Р™ РЅРµРґРµР»Рµ (РјРѕР¶РµС‚ Р±С‹С‚СЊ РІ РЅРµСЃРєРѕР»СЊРєРёС…,
     РЅР°РїСЂРёРјРµСЂ L0 + L3). Р•СЃР»Рё РЅР° СЌС‚РѕР№ РЅРµРґРµР»Рµ РµРіРѕ РІ Р»РёРЅРёСЏС… РЅРµС‚ вЂ” Р±РµСЂС‘Рј Р±Р»РёР¶Р°Р№С€СѓСЋ РЅРµРґРµР»СЋ,
     РіРґРµ РѕРЅ РµСЃС‚СЊ, Рё РїРѕРјРµС‡Р°РµРј РµС‘ РґР°С‚РѕР№ РЅР°С‡Р°Р»Р°. */
  function linesOf(fio, dt) {
    const m = monthOf(dt);
    if (!m || !m.lines) return [];
    const d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const found = [];
    for (const [lid, info] of Object.entries(m.lines)) {
      const labels = info.labels || [];
      const weeks = info.weeks || [];
      for (let i = 0; i < weeks.length; i++) {
        // РІ СЏС‡РµР№РєРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РЅРµСЃРєРѕР»СЊРєРѕ С‡РµР»РѕРІРµРє вЂ” РїСЂРёС…РѕРґРёС‚ РјР°СЃСЃРёРІРѕРј
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
    const since = f.current ? "" : " В· СЃ " + String(f.from.getDate()).padStart(2, "0") + "." + String(f.from.getMonth() + 1).padStart(2, "0");
    return list.map((l) => l.id).join(" + ") + " В· " + f.title + since;
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
  /* Р§С‚Рѕ СЃ СЃРѕС‚СЂСѓРґРЅРёРєРѕРј СЃРµРіРѕРґРЅСЏ: Р·Р°СЏРІРєР° (СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ/РѕС‚РіСѓР») -> РѕС‚РїСѓСЃРє -> СЃРјРµРЅР°/РІС‹С…РѕРґРЅРѕР№ */
  function todayState(emp, dt, reqs) {
    const iso = isoDate(dt);
    const list = (reqs || []).filter((r) => r.empSlug === emp.slug && r.status === "approved" &&
      (r.type === "leave" || r.type === "dayoff") && r.date === iso);
    const leave = list.find((r) => r.type === "leave");
    const dayoff = list.find((r) => r.type === "dayoff");
    if (leave) return { kind: "leave", text: `РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ ${leave.from || ""}${leave.to ? "вЂ“" + leave.to : ""}`.trim(), hours: leave.hours };
    if (dayoff) return { kind: "dayoff", text: dayoff.date2 ? `РћС‚РіСѓР» Р·Р° РІС‹С…РѕРґРЅСѓСЋ СЃРјРµРЅСѓ ${dayoff.date2.slice(8, 10)}.${dayoff.date2.slice(5, 7)}` : "РћС‚РіСѓР»" };
    const vac = vacationOf(emp.fullName, dt);
    if (vac) {
      const to = new Date(vac.to + "T00:00:00");
      return { kind: "vacation", text: `РћС‚РїСѓСЃРє РґРѕ ${to.getDate()} ${MON_GEN[to.getMonth()]}` };
    }
    const sh = shiftOf(emp.fullName, dt);
    if (!sh) return null;
    const lns = linesOf(emp.fullName, dt);
    const work = ["shift", "weekend", "duty", "extra"].includes(sh.kind);
    if (!work) return { kind: "off", text: sh.kind === "dayoff" ? sh.title : "Р’С‹С…РѕРґРЅРѕР№" };
    return { kind: "shift", text: [lineLabel(lns), sh.title, sh.time || ""].filter(Boolean).join(" В· "), sym: sh.sym };
  }

  function initials(name) {
    const p = name.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "")).toUpperCase();
  }

  const rated = D.employees.filter((e) => e.avg != null);
  const teamAvgNow = rated.length ? +(rated.reduce((s, e) => s + e.avg, 0) / rated.length).toFixed(2) : 0;
  // РІ СЂРµР№С‚РёРЅРі РїРѕ KPI РїРѕРїР°РґР°СЋС‚ С‚РѕР»СЊРєРѕ РґРµР№СЃС‚РІСѓСЋС‰РёРµ СЃРѕС‚СЂСѓРґРЅРёРєРё СЃ РѕС†РµРЅРєРѕР№:
  // СѓРІРѕР»РµРЅРЅС‹Рµ Рё РЅРѕРІРёС‡РєРё РЅР° Р°РґР°РїС‚Р°С†РёРё (KPI РµС‰С‘ РЅРµ РІРµРґС‘С‚СЃСЏ) СЃСЋРґР° РЅРµ РІС…РѕРґСЏС‚
  const ranked = D.employees.filter((e) => e.status === "active" && e.avg != null)
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  const leader = ranked[0];
  const lastBonus = D.employees.reduce((s, e) => s + (e.history[e.history.length - 1].bonus || 0), 0);

  /* ---------- С€Р°РїРєР° / РїРѕРґРІР°Р» ---------- */
  if ($("#meta-count")) $("#meta-count").textContent = ACTIVE.length;   // Р±РµР· СѓРІРѕР»РµРЅРЅС‹С…
  /* РљС‚Рѕ СЃРµР№С‡Р°СЃ РЅР° РѕР±СѓС‡РµРЅРёРё/Р°РґР°РїС‚Р°С†РёРё вЂ” С‡С‚РѕР±С‹ РЅРѕРІРёС‡РєРё Р±С‹Р»Рё РІРёРґРЅС‹ СЃСЂР°Р·Сѓ РЅР° РіР»Р°РІРЅРѕР№ */
  const adaptBox = $("#adapt-strip");
  if (adaptBox) {
    const novices = D.employees.filter((e) => e.status === "adaptation");
    adaptBox.innerHTML = novices.length
      ? `<span class="adapt-strip-h"><i class="ph-bold ph-graduation-cap"></i> РќР° РѕР±СѓС‡РµРЅРёРё / Р°РґР°РїС‚Р°С†РёРё:</span>
         ${novices.map((e) => `<a class="adapt-chip" href="${SITE_ROOT}team/${e.slug}/index.html" title="РћС‚РєСЂС‹С‚СЊ СЃС‚СЂР°РЅРёС†Сѓ СЃРѕС‚СЂСѓРґРЅРёРєР°">${e.shortName} ${e.fullName.split(" ")[0] || ""}<small>${e.role.replace(/\s*\(.*\)$/, "")}</small></a>`).join("")}`
      : "";
  }
  if ($("#meta-month")) {
    const mm = $("#meta-month");
    mm.textContent = D.meta.updated;
    const bd = mm.closest(".badge");
    if (bd) bd.title = "РС‚РѕРіРё Р·Р° " + D.meta.updated + ". РўРµРєСѓС‰РёР№ РјРµСЃСЏС† РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ Р·Р°РіСЂСѓР·РєРё РёС‚РѕРіРѕРІ.";
  }
  if ($("#stat-avg")) $("#stat-avg").textContent = teamAvgNow.toFixed(1);
  if ($("#stat-top")) $("#stat-top").textContent = leader.shortName;
  if ($("#stat-bonus")) $("#stat-bonus").textContent = otp.rub(lastBonus);
  const fm = $("#foot-month"); if (fm) fm.textContent = D.meta.updated;

  /* ---------- В«РљС‚Рѕ Р»СѓС‡С€РµВ»: Р»СѓС‡С€РёР№ СЃРїРµС†РёР°Р»РёСЃС‚ РјРµСЃСЏС†Р° ---------- */
  const bestCard = $("#best-card");
  if (bestCard && leader && leader.avg != null) {
    const t = otp.trend(leader);
    const arrow = t.dir === "up" ? "в–І" : t.dir === "down" ? "в–ј" : "в–¬";
    const metrics = MKEYS.map((k) => {
      const m = D.metrics[k];
      const v = leader.current ? leader.current[k] : "вЂ”";
      return `<span class="bc-m"><i class="ph-bold ${m.icon || "ph-chart-bar"}"></i><b>${v}</b><i>${m.label.split(" ")[0]}</i></span>`;
    }).join("");
    const awards = (leader.awards || []).slice(0, 2).map((a) => `<span class="bc-award" style="--ac:${a.color}">${a.glyph || ""} ${a.title}</span>`).join("");
    bestCard.innerHTML = `
      <div class="bc-left">
        <span class="bc-crown">рџЏ† Р›СѓС‡С€РёР№ СЂРµР·СѓР»СЊС‚Р°С‚ РјРµСЃСЏС†Р°</span>
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
        <div class="bc-avg-l">СЃСЂРµРґРЅРёР№ KPI В· <span class="bc-trend ${t.dir}">${arrow} ${t.delta > 0 ? "+" + t.delta : t.delta}</span></div>
        <div class="bc-badges"><span class="bc-badge">LVL ${leader.lvl} В· ${leader.stars_in_level}/10</span>${awards}</div>
        <a class="btn btn-primary" href="${SITE_ROOT}team/${leader.slug}/index.html"><i class="ph ph-user"></i> РЎС‚СЂР°РЅРёС†Р° СЃРїРµС†РёР°Р»РёСЃС‚Р°</a>
      </div>`;
  } else if (bestCard) {
    bestCard.remove();
  }

  /* ---------- СЂРµР№С‚РёРЅРі РїРѕ KPI ---------- */
  const lb = $("#leaderboard");
  if (lb) lb.innerHTML = ranked.map((e, i) => {
    const hasKpi = e.avg != null;
    const t = otp.trend(e);
    const arrow = t.dir === "up" ? "в–І" : t.dir === "down" ? "в–ј" : "в–¬";
    const cls = t.dir === "up" ? "up" : t.dir === "down" ? "down" : "flat";
    const rankCls = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
    const medal = hasKpi ? (i === 0 ? "рџҐ‡" : i === 1 ? "рџҐ€" : i === 2 ? "рџҐ‰" : i + 1) : "рџ‘‘";
    const leftBadge = e.status === "left" ? '<span class="badge badge-left">РІС‹Р±С‹Р»</span>'
      : e.status === "adaptation" ? '<span class="badge badge-adapt">Р°РґР°РїС‚Р°С†РёСЏ</span>' : "";
    const stars = hasKpi ? `<span class="lb-trend up" title="СѓСЂРѕРІРµРЅСЊ">LVL ${e.lvl}</span>` : "";
    const trendCell = hasKpi
      ? `<span class="lb-trend ${cls}">${arrow} ${t.delta > 0 ? "+" + t.delta : t.delta}</span>`
      : '<span class="badge" style="font-size:.68rem"><i class="ph ph-crown"></i> СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ</span>';
    return `
      <a class="lb-row" href="${SITE_ROOT}team/${e.slug}/index.html" data-reveal>
        <span class="lb-rank ${rankCls}">${medal}</span>
        <span class="lb-name">${e.fullName} ${leftBadge} ${stars}<small>${e.role}</small>
          <span class="lb-hours" data-hours="${e.slug}"></span>
          <span class="lb-today" data-today="${e.slug}"></span></span>
        ${trendCell}
        <span class="lb-avg">${hasKpi ? e.avg.toFixed(1) : "вЂ”"}</span>
      </a>`;
  }).join("");

  /* ---------- РєР°СЂС‚РѕС‡РєРё СЃРїРµС†РёР°Р»РёСЃС‚РѕРІ ---------- */
  const grid = $("#emp-grid");
  if (grid) grid.innerHTML = ACTIVE.map((e) => {
    const hasKpi = e.avg != null;
    const mini = hasKpi
      ? MKEYS.map((k) => {
          const m = D.metrics[k];
          return `<div class="mm"><span style="font-size:1.15rem;line-height:1">${m.emoji || ""}</span><div class="v">${e.current[k]}</div><div class="l">${m.label.split(" ")[0]}</div></div>`;
        }).join("")
      : '<div class="mm" style="grid-column:1/-1;color:var(--muted);padding:12px"><i class="ph ph-crown"></i> KPI РЅРµ РІРµРґС‘С‚СЃСЏ вЂ” СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ</div>';
    const leftTag = e.status === "left" ? '<span class="badge badge-left" style="font-size:.68rem">РІС‹Р±С‹Р»</span>'
      : e.status === "adaptation" ? '<span class="badge badge-adapt" style="font-size:.68rem">Р°РґР°РїС‚Р°С†РёСЏ</span>' : "";
    const awardTop = (e.awards && e.awards[0]) ? `<span class="badge" style="font-size:.66rem;color:${e.awards[0].color};border-color:${otp.hexA(e.awards[0].color,0.3)}"><i class="${e.awards[0].icon}"></i> ${e.awards[0].title}</span>` : "";
    const stars = hasKpi ? `<span style="color:var(--warn);font-size:.75rem;font-weight:600"><i class="ph-fill ph-star"></i> LVL ${e.lvl} В· ${e.stars_in_level}/10</span>` : "";
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
            <div class="avg">${hasKpi ? e.avg.toFixed(1) : "вЂ”"}</div>
            ${leftTag}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;min-height:22px">${awardTop} ${stars}</div>
        <div class="pe-hours" data-hours="${e.slug}"></div>
        <div class="mini-metrics">${mini}</div>
      </a>`;
  }).join("");



  /* ---------- РјРѕРё РЅР°РіСЂР°РґС‹ (СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ): Р·РЅР°РєРё РїСЂРёР·РЅР°РЅРёСЏ + РїРѕС…РІР°Р»С‹ РРў-РґРёСЂРµРєС‚РѕСЂР° ---------- */
  const maBox = $("#my-awards");
  const boss = D.bossAwards;
  if (maBox && boss && ((boss.recognition || []).length || (boss.praise || []).length)) {
    const esc = (s) => String(s || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
    maBox.innerHTML = `
      <div class="my-awards-h">
        <h3><i class="ph-bold ph-medal"></i> РњРѕРё РЅР°РіСЂР°РґС‹</h3>
        <span>РїСЂРёР·РЅР°РЅРёРµ РєРѕРјРїР°РЅРёРё Рё РїРѕС…РІР°Р»С‹ РРў-РґРёСЂРµРєС‚РѕСЂР°</span>
      </div>
      <div class="my-awards-list">
        ${(boss.recognition || []).map((a) => `<div class="my-award">
          <img src="${SITE_ROOT}${String(a.image || "").replace(/^\/+/, "")}" alt="${esc(a.title)}" loading="lazy">
          <div class="my-award-body"><b>${a.degree} СЃС‚РµРїРµРЅСЊ</b><span>${esc(String(a.title || "").replace(/^РџСЂРёР·РЅР°РЅРёРµ:\s*/, ""))}</span></div>
        </div>`).join("")}
        ${(boss.praise || []).map((p) => `<div class="my-award praise">
          <span class="my-award-glyph">${p.glyph || "рџЏ…"}</span>
          <div class="my-award-body"><b>${esc(p.month || "")}</b><span>${esc(p.title || "РџРѕС…РІР°Р»Р° РѕС‚ РРў Р”РёСЂРµРєС‚РѕСЂР°")} вЂ” Р·Р° С‡С‚Рѕ: ${esc(p.reason || "")}</span></div>
        </div>`).join("")}
      </div>`;
  }

  /* ---------- РїСЂРёР·РЅР°РЅРёРµ: РЅР°РіСЂСѓРґРЅС‹Рµ Р·РЅР°РєРё (РІСЂСѓС‡Р°РµС‚ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ Р»РёС‡РЅРѕ) ---------- */

  const recBox = $("#recognition-board");
  if (recBox && (D.recognition || []).length) {
    const rm = (s) => String(s || "").replace(/^РџСЂРёР·РЅР°РЅРёРµ:\s*/, "");
    recBox.innerHTML = `
      <div class="rec-head">
        <h3><i class="ph-bold ph-medal"></i> РџСЂРёР·РЅР°РЅРёРµ РІ РљРѕРјРїР°РЅРёРё</h3>
        <span class="rec-hint">РЅР°РіСЂСѓРґРЅС‹Рµ Р·РЅР°РєРё РІСЂСѓС‡Р°СЋС‚СЃСЏ Р»РёС‡РЅРѕ вЂ” РІРЅРµ РјРµС‚СЂРёРє Рё СЂРµР№С‚РёРЅРіР°</span>
      </div>
      <div class="rec-list">
        ${D.recognition.map((c) => `<div class="rec-card" style="--rc:${c.color}">
          <img class="rec-img" src="${SITE_ROOT + String(c.image || "").replace(/^\/+/, "")}" alt="${c.title}" loading="lazy">
          <div class="rec-body">
            <div class="rec-degree">${c.degree} СЃС‚РµРїРµРЅСЊ</div>
            <div class="rec-title">${rm(c.title)}</div>
            <div class="rec-desc">${c.desc || ""}</div>
            <div class="rec-holders">${(c.holders || []).map((h) => `<span class="rec-holder${h.role ? " boss" : ""}">${h.shortName}${h.role ? " В· " + h.role : ""}</span>`).join("") || '<span class="rec-none">РїРѕРєР° РЅРёРєС‚Рѕ</span>'}</div>
          </div>
        </div>`).join("")}
      </div>`;
  }

  /* ---------- РіСЂР°С„РёРє РѕС‚РґРµР»Р° (СЃРјРµРЅС‹ + РѕС‚РїСѓСЃРєР°) ---------- */
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
        if (person && person.status === "left") continue;      // СѓРІРѕР»РµРЅРЅС‹С… РІ РіСЂР°С„РёРєРµ РѕС‚РґРµР»Р° РЅРµС‚
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
        <div class="dt-day-h"><b>${label}</b><span>${WD_FULL[dt.getDay()]}, ${dt.getDate()} ${MON_GEN[dt.getMonth()]}</span><i>${work.length} РЅР° СЃРјРµРЅРµ В· ${off.length} РѕС‚РґС‹С…Р°СЋС‚</i></div>
        <div class="dt-rows">
          ${work.map((x) => `<div class="dt-row"><span class="gs-sym k-${x.sh.kind}">${x.sh.sym}</span><span class="dt-fio">${x.fio} <span class="dt-hours" data-hoursfio="${x.fio}"></span></span><span class="dt-time">${x.sh.time || ""}</span><span class="dt-ln">${x.ln.length ? lineLabel(x.ln) : '<span class="dt-ln-none">РІРЅРµ Р»РёРЅРёР№</span>'}</span></div>`).join("")}
          ${off.map((x) => `<div class="dt-row off"><span class="gs-sym k-${x.sh.kind}">${x.sh.sym}</span><span class="dt-fio">${x.fio}</span><span class="dt-time">${x.sh.title}</span></div>`).join("")}
        </div></div>`;
    };
    const year = String(today.getFullYear());
    const vacAll = S.vacations && S.vacations[year] ? S.vacations[year] : {};
    // РІ РѕС‚РїСѓСЃРєР°С… РѕС‚РґРµР»Р° вЂ” С‚РѕР»СЊРєРѕ РґРµР№СЃС‚РІСѓСЋС‰РёРµ СЃРѕС‚СЂСѓРґРЅРёРєРё РєРѕРјР°РЅРґС‹ (Р±РµР· СѓРІРѕР»РµРЅРЅС‹С… Рё РїРѕСЃС‚РѕСЂРѕРЅРЅРёС…)
    const vac = {};
    for (const [fio, list] of Object.entries(vacAll)) {
      const person = bySurname(fio);
      if (person && person.status !== "left") vac[fio] = list;
    }
    let showPast = false;                       // РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ РїСЂРѕС€РµРґС€РёРµ РѕС‚РїСѓСЃРєР° СЃРєСЂС‹С‚С‹
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const fmt = (p) => {
      const f = new Date(p.from + "T00:00:00"), t = new Date(p.to + "T00:00:00");
      return `СЃ ${f.getDate()} ${MON_GEN[f.getMonth()]} РїРѕ ${t.getDate()} ${MON_GEN[t.getMonth()]}`;
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
        <div class="dt-grid">${dayBlock(today, "РЎРµРіРѕРґРЅСЏ")}${dayBlock(addDays(today, 1), "Р—Р°РІС‚СЂР°")}</div>
        <div class="dt-sub-row">
          <h3 class="dt-sub"><i class="ph-bold ph-airplane-tilt"></i> РћС‚РїСѓСЃРєР° РѕС‚РґРµР»Р° В· ${year}</h3>
          <label class="gs-past-toggle" title="РџРѕРєР°Р·Р°С‚СЊ Рё СѓР¶Рµ РїСЂРѕС€РµРґС€РёРµ РѕС‚РїСѓСЃРєР° СЌС‚РѕРіРѕ РіРѕРґР°">
            <input type="checkbox" id="duty-past"${showPast ? " checked" : ""}> <span>РїРѕРєР°Р·С‹РІР°С‚СЊ РїСЂРѕС€РµРґС€РёРµ</span>
          </label>
        </div>
        <div class="gs-vac-table">
          <div class="gs-vac-tr head"><span>РџРµСЂРёРѕРґ</span><span>РЎРѕС‚СЂСѓРґРЅРёРє</span><span>Р”РЅРµР№</span></div>
          ${vacRows.length ? vacRows.map(({ fio, p }) => `<div class="gs-vac-tr${new Date(p.from + "T00:00:00") <= today0 && new Date(p.to + "T00:00:00") >= today0 ? " mine" : ""}">
            <span class="gs-vac-per">${fmt(p)}</span>
            <span class="gs-vac-who">${fio.split(" ")[0]} ${(fio.split(" ")[1] || "").slice(0, 1)}.${new Date(p.from + "T00:00:00") <= today0 && new Date(p.to + "T00:00:00") >= today0 ? ' <b class="gs-you">СЃРµР№С‡Р°СЃ</b>' : ""}</span>
            <span class="gs-vac-dn">${p.days || ""}</span></div>`).join("") : '<div class="gs-vac-tr"><span class="gs-vac-per">РџСЂРѕС€РµРґС€РёС… РїРµСЂРёРѕРґРѕРІ РЅРµС‚</span><span></span><span></span></div>'}
        </div>`;
      const chk = $("#duty-past");
      if (chk) chk.addEventListener("change", () => { showPast = chk.checked; renderDuty(); });
    };
    renderDuty();
  }

  /* P1.3: РёРЅРґРёРєР°С‚РѕСЂ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё РґР°С€Р±РѕСЂРґР°. РћР±СЉСЏРІР»РµРЅ Р”Рћ РїРµСЂРІРѕРіРѕ РІС‹Р·РѕРІР°
     renderNowBoard(), РёРЅР°С‡Рµ РїРµСЂРІС‹Р№ Р¶Рµ СЂРµРЅРґРµСЂ РїР°РґР°Р» РЅР° TDZ (let __nowSyncOk)
     Рё РїР»Р°С€РєРё В«РЎРµР№С‡Р°СЃ РЅР° СЃРјРµРЅРµВ» РїРѕСЏРІР»СЏР»РёСЃСЊ С‚РѕР»СЊРєРѕ СЃРѕ РІС‚РѕСЂРѕРіРѕ С‚РёРєР° (60 СЃ). */
  let __nowSyncOk = null;
  /* P2.2: Р°РєС‚РёРІРЅС‹Р№ С„РёР»СЊС‚СЂ СЃРїРёСЃРєР° СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ РїРѕ СЃС‚Р°С‚СѓСЃСѓ (null вЂ” РІСЃРµ). */
  let nowFilter = null;
  /* РџР»Р°РЅ 24.11.2026: РїРѕРёСЃРє РїРѕ С‚Р°Р±Р»РёС†Рµ РєРѕРјР°РЅРґС‹ РЅР° РѕРїРµСЂР°С‚РёРІРЅРѕР№ РіР»Р°РІРЅРѕР№. */
  let nowSearch = "";
  /* РЎРѕРѕР±С‰РµРЅРёРµ, РєРѕС‚РѕСЂРѕРµ РїРѕРєР°Р¶РµРј РїРѕСЃР»Рµ РїРµСЂРµР·Р°РіСЂСѓР·РєРё СЃРїРёСЃРєР° РІ В«РђРґРјРёРЅРєРµВ». */
  let __staffMsg = "";
  /* РџР°СЂРѕР»Рё, Р·Р°РґР°РЅРЅС‹Рµ РІ СЌС‚РѕРј СЃРµР°РЅСЃРµ СЃС‚СЂР°РЅРёС†С‹: РёР· Р±Р°Р·С‹ РёС… РЅРµ РїРѕРєР°Р·Р°С‚СЊ (С‚РѕР»СЊРєРѕ С…РµС€),
     РЅРѕ В«РўРµРєСЃС‚ РґРѕСЃС‚СѓРїР°В» РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ РёРјРµРЅРЅРѕ Р·Р°РґР°РЅРЅС‹Р№ РїР°СЂРѕР»СЊ. */
  const __sessionPass = new Map();
  function nowSyncSet(ok) { __nowSyncOk = ok; }
  function nowSync() {
    if (__nowSyncOk === null) return `<span class="now-chip s">вЂ¦ СЃРѕРµРґРёРЅРµРЅРёРµ</span>`;
    if (__nowSyncOk) return `<span class="now-chip s ok" title="Р”Р°РЅРЅС‹Рµ РїРѕРґС‚СЏРіРёРІР°СЋС‚СЃСЏ РёР· РѕР±Р»Р°РєР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё"><i class="ph-bold ph-check-circle"></i> СЃРёРЅС…СЂ. ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>`;
    return `<span class="now-chip s warn" title="РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРѕСЃРёС‚СЊ РґР°РЅРЅС‹Рµ (РёРЅС‚РµСЂРЅРµС‚ РёР»Рё РїСЂРѕРєСЃРё). РЎС‚Р°С‚СѓСЃС‹ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ РЅР° РёС… СЌРєСЂР°РЅР°С… РЅРµ Р·Р°РІРёСЃСЏС‚ РѕС‚ СЌС‚РѕРіРѕ."><i class="ph-bold ph-wifi-high-signal-slash"></i> РѕС„Р»Р°Р№РЅ</span>`;
  }

  otp.reveal(document);
  hydrateHours();
  renderHoursJournal();
  renderNowBoard();
  setInterval(() => { if (!document.hidden) renderNowBoard(); }, 60000);

  /* P1.5: Р·РµСЂРєР°Р»Рѕ РіСЂР°С„РёРєР° РІ Р‘Р”. Р”Р°С€Р±РѕСЂРґ вЂ” РµРґРёРЅСЃС‚РІРµРЅРЅР°СЏ СЃС‚СЂР°РЅРёС†Р°, РіРґРµ РіР°СЂР°РЅС‚РёСЂРѕРІР°РЅРЅРѕ
     РµСЃС‚СЊ Р°РєС‚СѓР°Р»СЊРЅС‹Р№ РіСЂР°С„РёРє Р Р°РґРјРёРЅ-СЃРµСЃСЃРёСЏ; СЂР°Р· РІ 10 РјРёРЅСѓС‚ РєРѕРїРёСЂСѓРµРј РµРіРѕ РІ
     otp_schedule_cache, Р° cron РїСЂРё СЃС‚Р°СЂС‚Рµ С‡РёС‚Р°РµС‚ РіСЂР°С„РёРє СЃРЅР°С‡Р°Р»Р° РѕС‚С‚СѓРґР°.
     РћС‚РєР°С‚ СЃР°Р№С‚Р° Рє СЃС‚Р°СЂРѕР№ РІРµСЂСЃРёРё Р±РѕР»СЊС€Рµ РЅРµ Р·Р°РєСЂСѓС‡РёРІР°РµС‚ СѓРІРµРґРѕРјР»РµРЅРёСЏ. */
  (function mirrorSchedule() {
    const KEY = "otp_sched_mirror";
    // Р’РµСЂСЃРёСЏ СЃР°Р№С‚Р° вЂ” РёР· href С‚РµРіР° <link main.css?v=N> (РІ HTML РµС‘ РїРµС‡Р°С‚Р°РµС‚ РіРµРЅРµСЂР°С‚РѕСЂ).
    // Р Р°РЅСЊС€Рµ Р·РґРµСЃСЊ СЃС‚РѕСЏР»Р° РїРµСЂРµРјРµРЅРЅР°СЏ V, РєРѕС‚РѕСЂРѕР№ РІ main.js РЅРµС‚ в†’ ReferenceError
    // СЃРёРЅС…СЂРѕРЅРЅРѕ СЂРІР°Р» РІРµСЃСЊ СЃРєСЂРёРїС‚ РґР»СЏ Р°РґРјРёРЅР°: РЅРµ СЂРµРЅРґРµСЂРёР»РёСЃСЊ В«РЎРµР№С‡Р°СЃ РЅР° СЃРјРµРЅРµВ»,
    // В«РќР°СЃС‚СЂРѕР№РєР°В» Рё В«РђРґРјРёРЅРєР°В». РўРµРїРµСЂСЊ РІРµСЂСЃРёСЏ С‡РёС‚Р°РµС‚СЃСЏ РёР· DOM; РµСЃР»Рё С‚РµРіР° РЅРµС‚ вЂ”
    // В«runtimeВ» (РїРѕР»Рµ РёРЅС„РѕСЂРјР°С†РёРѕРЅРЅРѕРµ, Р±РµР· РЅРµРіРѕ РЅРёС‡РµРіРѕ РЅРµ Р»РѕРјР°РµС‚СЃСЏ).
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

  /* P3: Realtime РЅР° РґР°С€Р±РѕСЂРґРµ вЂ” В«РЎРµР№С‡Р°СЃ РЅР° СЃРјРµРЅРµВ» РѕР±РЅРѕРІР»СЏРµС‚СЃСЏ РїРѕ С„Р°РєС‚Сѓ СЃРѕР±С‹С‚РёСЏ
     (СЃ Р»СЋР±РѕРіРѕ СѓСЃС‚СЂРѕР№СЃС‚РІР°), Р° РЅРµ С‚РѕР»СЊРєРѕ СЂР°Р· РІ РјРёРЅСѓС‚Сѓ. Р•СЃР»Рё Realtime РІС‹РєР»СЋС‡РµРЅ
     РІ Supabase, РїРѕРґРїРёСЃРєР° РјРѕР»С‡Р° РЅРёС‡РµРіРѕ РЅРµ РґРµР»Р°РµС‚ вЂ” РѕРїСЂРѕСЃ 60 СЃ СЂР°Р±РѕС‚Р°РµС‚ РєР°Рє СЂР°РЅСЊС€Рµ. */
  if (otp.realtime) {
    let rtT = 0;
    otp.realtime("otp_time_events", () => {
      clearTimeout(rtT);
      rtT = setTimeout(() => { if (!document.hidden) renderNowBoard(); }, 1200);
    });
  }

  /* ---------- В«РЎРµР№С‡Р°СЃ РЅР° СЃРјРµРЅРµВ»: СЃС‚Р°С‚СѓСЃС‹ РїРѕ СЃРѕР±С‹С‚РёСЏРј В«РЎС‚Р°СЂС‚РѕРІРѕР№В» ---------- */
  async function renderNowBoard() {
    const box = $("#now-board");
    if (!box) return;
    if (!box.dataset.loaded) {
      box.innerHTML = `<div class="now-head"><h3><i class="ph-bold ph-broadcast"></i> РЎРµР№С‡Р°СЃ РЅР° СЃРјРµРЅРµ</h3>${nowSync()}</div>
        <div class="skl-grid">${Array.from({ length: 6 }).map(() => `<div class="skl-card"><div class="skl"></div><div class="skl"></div></div>`).join("")}</div>`;
    }
    const c = D.hrRules && D.hrRules.cloud;
    if (!c || !c.url) return;
    // РґР°РЅРЅС‹Рµ РґРѕСЃС‚СѓРїРЅС‹ С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ РІС…РѕРґР° (РїСЂРѕРєСЃРё РїСЂРѕРІРµСЂСЏРµС‚ С‚РѕРєРµРЅ)
    if (!window.OTP_AUTH || !window.OTP_AUTH.token("admin")) return;
    const dt = new Date();
    const day = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    let rows = [];
    try {
      rows = await window.OTP_AUTH.api("admin", `otp_time_events?select=*&day=eq.${day}&order=at.asc`, "GET");
      if (!Array.isArray(rows)) rows = [];
    } catch (e) { nowSyncSet(false); return; }   // СЃРµС‚СЊ/РїСЂРѕРєСЃРё РЅРµРґРѕСЃС‚СѓРїРЅС‹ вЂ” РїРѕРєР°Р·С‹РІР°РµРј offline-Р±РµР№РґР¶
    if (!Array.isArray(rows)) { nowSyncSet(false); return; }

    const byEmp = new Map();
    for (const e of rows) {
      const k = e.empSlug || e.empName;
      if (!byEmp.has(k)) byEmp.set(k, []);
      byEmp.get(k).push(e);
    }
    /* РћС‚РїСѓСЃРєР° (РёР· РіСЂР°С„РёРєР°) Рё СЃРѕРіР»Р°СЃРѕРІР°РЅРЅС‹Рµ Р·Р°СЏРІРєРё (РѕС‚РіСѓР», СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ) вЂ” С‡С‚РѕР±С‹
       РІРјРµСЃС‚Рѕ В«РЅРµ РЅР°С‡РёРЅР°Р»В» Р±С‹Р»Рѕ РІРёРґРЅРѕ, РїРѕС‡РµРјСѓ С‡РµР»РѕРІРµРєР° РЅРµС‚ РЅР° СЃРјРµРЅРµ. */
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
    const SLOT = { tech1: ["С‚РµС….РїРµСЂРµСЂС‹РІ 1", "ph-coffee"], tech2: ["С‚РµС….РїРµСЂРµСЂС‹РІ 2", "ph-coffee"], lunch: ["РѕР±РµРґ", "ph-fork-knife"], absence: ["РѕС‚СЃСѓС‚СЃС‚РІРёРµ", "ph-walking"] };
    const stateOf = (ev) => {
      let acc = 0, running = false, last = 0, started = 0, stopped = 0, active = null, note = "";
      for (const e of ev) {
        const t = Date.parse(e.at);
        if (e.type === "shift_start") { started = t; running = true; last = t; }
        else if (e.type === "shift_stop") { if (running) acc += t - last; running = false; stopped = t; }
        else if (e.type === "break_start" || e.type === "absence_start") {
          /* В«Р’СЂРµРјРµРЅРЅРѕРµ РѕС‚СЃСѓС‚СЃС‚РІРёРµ: Р‘РµР· Р·Р°СЏРІРєРёвЂ¦В» вЂ” СЃС‚Р°С‚СѓСЃ С„РёРєСЃРёСЂСѓРµРј, РЅРѕ СЂР°Р±РѕС‡РµРµ
             РІСЂРµРјСЏ РќР• РѕСЃС‚Р°РЅР°РІР»РёРІР°РµРј. РЎСЂР°РІРЅРµРЅРёРµ РїРѕ РЅР°С‡Р°Р»Сѓ СЃС‚СЂРѕРєРё: РїРѕСЃР»Рµ В«Р‘РµР· Р·Р°СЏРІРєРёВ»
             С‡Р°СЃС‚Рѕ РёРґС‘С‚ РїРѕСЏСЃРЅРµРЅРёРµ (В«вЂ” СЂР°Р±РѕС‚Р° РїРѕ Р¦РћВ»), СЃС‚СЂРѕРіРѕРµ СЂР°РІРµРЅСЃС‚РІРѕ РЅРµ СЃСЂР°Р±Р°С‚С‹РІР°Р»Рѕ. */
          const noStop = e.type === "absence_start" && String(e.reason || "").trim().startsWith("Р‘РµР· Р·Р°СЏРІРєРё");
          if (running) acc += t - last;
          if (noStop) { running = true; last = t; active = null; note = e.reason || ""; }
          else { running = false; active = e; note = ""; }
        }
        else if (e.type === "break_end" || e.type === "absence_end") { if (!running) { running = true; last = t; } active = null; }
      }
      if (running) acc += Date.now() - last;
      const sec = Math.max(0, Math.round(acc / 1000));
      if (stopped) return { kind: "done", label: "СЃРјРµРЅР° Р·Р°РІРµСЂС€РµРЅР°", icon: "ph-check-circle", since: stopped, sec };
      if (active) {
        const nm = SLOT[active.slot] || ["РїР°СѓР·Р°", "ph-pause"];
        /* РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ СЃР°РјРѕР№ РїР°СѓР·С‹ (Р° РЅРµ РѕС‚СЂР°Р±РѕС‚Р°РЅРЅРѕРµ РІСЂРµРјСЏ) вЂ” РЅСѓР¶РЅР° РґР»СЏ РїР»Р°С€РєРё
           В«РџР°СѓР·Р° Р±РѕР»СЊС€Рµ 15 РјРёРЅСѓС‚В»; СЂР°РЅСЊС€Рµ С‚Р°Рј СЃСЂР°РІРЅРёРІР°Р»РѕСЃСЊ РѕС‚СЂР°Р±РѕС‚Р°РЅРЅРѕРµ РІСЂРµРјСЏ,
           Рё РїР»Р°С€РєР° РїРѕСЏРІР»СЏР»Р°СЃСЊ РїРѕС‡С‚Рё Сѓ РІСЃРµС… РЅР° РїР°СѓР·Рµ. */
        const pauseSec = Math.max(0, Math.round((Date.now() - Date.parse(active.at)) / 1000));
        return { kind: "pause", label: nm[0] + (active.reason ? ": " + active.reason : ""), icon: nm[1], since: Date.parse(active.at), sec, pauseSec };
      }
      if (started) return { kind: "work", label: "СЂР°Р±РѕС‚Р°РµС‚" + (note ? " В· " + note : ""), icon: "ph-briefcase", since: last, sec };
      return { kind: "idle", label: "РЅРµ РЅР°С‡РёРЅР°Р»", icon: "ph-moon", since: null, sec };
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
      const mm = /^(\d{1,2}):(\d{2})\s*[вЂ“-]\s*(\d{1,2}):(\d{2})/.exec(String(sh.time || ""));
      if (!mm) return 0;
      const s = new Date(day + "T" + mm[1].padStart(2, "0") + ":" + mm[2] + ":00").getTime();
      const en = new Date(day + "T" + mm[3].padStart(2, "0") + ":" + mm[4] + ":00").getTime();
      if (!(en > s)) return 0;
      return Math.max(0, Math.min(100, Math.round(((Date.now() - s) / (en - s)) * 100)));
    };
    const order = { work: 0, pause: 1, done: 2, leave: 3, dayoff: 4, vacation: 5, idle: 6 };
    /* РџРѕС‡РµРјСѓ С‡РµР»РѕРІРµРєР° РЅРµС‚ РЅР° СЃРјРµРЅРµ: РѕС‚РїСѓСЃРє РїРѕ РіСЂР°С„РёРєСѓ, РѕС‚РіСѓР» РёР»Рё СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ РїРѕ Р·Р°СЏРІРєРµ. */
    const absenceStatus = (emp) => {
      const v = vacOf(emp.fullName);
      if (v) return { kind: "vacation", label: `РІ РѕС‚РїСѓСЃРєРµ РґРѕ ${String(v.to).split("-").reverse().join(".")}`, icon: "ph-airplane", since: null, sec: 0 };
      const rs = reqOf(emp.slug);
      const dayoff = rs.find((r) => r.type === "dayoff");
      if (dayoff) return { kind: "dayoff", label: "РѕС‚РіСѓР» Р·Р° РІС‹С…РѕРґРЅСѓСЋ СЃРјРµРЅСѓ", icon: "ph-calendar-minus", since: null, sec: 0 };
      const leave = rs.find((r) => r.type === "leave");
      if (leave) {
        const a = hhmmToMin(leave.from), b = hhmmToMin(leave.to);
        if (a != null && b != null && nowMin >= a && nowMin < b) {
          return { kind: "leave", label: `СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ ${leave.from}вЂ“${leave.to}`, icon: "ph-door-open", since: null, sec: 0 };
        }
        if (a != null && nowMin < a) {
          return { kind: "leave", label: `СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ СЃ ${leave.from} РґРѕ ${leave.to}`, icon: "ph-door-open", since: null, sec: 0 };
        }
      }
      return null;
    };
    const list = D.employees.filter((e) => e.status !== "left")
      .map((e) => {
        const st = byEmp.has(e.slug) ? stateOf(byEmp.get(e.slug)) : { kind: "idle", label: "РЅРµ РЅР°С‡РёРЅР°Р»", icon: "ph-moon", since: null, sec: 0 };
        if (st.kind === "idle") { const a = absenceStatus(e); if (a) return { emp: e, st: a }; }
        return { emp: e, st };
      })
      .sort((a, b) => order[a.st.kind] - order[b.st.kind] || String(a.emp.fullName).localeCompare(String(b.emp.fullName), "ru"));
    // РєС‚Рѕ СЃРµР№С‡Р°СЃ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ (РїРѕСЃР»РµРґРЅРµРµ СЃРѕР±С‹С‚РёРµ вЂ” РЅР°С‡Р°Р»Рѕ РѕС‚СЃСѓС‚СЃС‚РІРёСЏ)
    const absNow = [];
    for (const [emp, evs] of byEmp.entries()) {
      const last = evs[evs.length - 1];
      if (last && last.type === "absence_start") absNow.push({ emp, slug: last.empSlug, reason: last.reason || "", at: last.at });
    }
    // РґРµР№СЃС‚РІСѓСЋС‰РёРµ СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅС‹Рµ (approved leave, РІРЅСѓС‚СЂРё РёРЅС‚РµСЂРІР°Р»Р°)
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
    /* P2.2: РєС‚Рѕ РґРѕР»Р¶РµРЅ Р±С‹Р» РЅР°С‡Р°С‚СЊ СЃРјРµРЅСѓ, РЅРѕ В«РќР°С‡Р°Р»РѕВ» РЅРµ РЅР°Р¶Р°Р» (РїРѕСЂРѕРі 5 РјРёРЅСѓС‚,
       РєР°Рє Сѓ cron). Р“СЂР°С„РёРє СѓР¶Рµ РІ РїР°РјСЏС‚Рё СЃС‚СЂР°РЅРёС†С‹ вЂ” РѕС‚РґРµР»СЊРЅС‹Р№ Р·Р°РїСЂРѕСЃ РЅРµ РЅСѓР¶РµРЅ. */
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
    /* РўР°Р±Р»РёС†Р° РєРѕРјР°РЅРґС‹ (РїР»Р°РЅ 24.11.2026): Р¤РРћ РІРµРґС‘С‚ РІ РїСЂРѕС„РёР»СЊ, В«РЎС‚Р°СЂС‚РѕРІР°СЏВ» вЂ” РІ СѓС‡С‘С‚.
       Р¤РёР»СЊС‚СЂ РїРѕ СЃС‚Р°С‚СѓСЃСѓ + РїРѕРёСЃРє. Р”Р°РЅРЅС‹Рµ С‚Рµ Р¶Рµ, С‡С‚Рѕ СЂР°РЅСЊС€Рµ СЂРёСЃРѕРІР°Р»РёСЃСЊ РєР°СЂС‚РѕС‡РєР°РјРё. */
    const filterList = (l) => l.filter((x) => {
      const byF = !nowFilter || (nowFilter === "v"
        ? ["vacation", "dayoff", "leave"].includes(x.st.kind)
        : x.st.kind === nowFilter);
      const byS = !nowSearch || String(x.emp.fullName).toLowerCase().includes(nowSearch);
      return byF && byS;
    });
    const opLink = (x, sec) => SITE_ROOT + "team/" + (x.emp.slug || x.emp.id) + "/" + (sec || "");
    const rowsHtml = (l) => filterList(l).map((x) => `<div class="op-tr k-${x.st.kind}" data-ns="${escNow(x.emp.id)}" role="row">
      <a class="op-name" href="${opLink(x)}" title="РћС‚РєСЂС‹С‚СЊ РїСЂРѕС„РёР»СЊ">${escNow(x.emp.fullName)} <i class="ph-bold ph-arrow-up-right" aria-hidden="true"></i></a>
      <span class="op-st"><i class="ph-bold ${x.st.icon}" aria-hidden="true"></i> ${escNow(x.st.label)}</span>
      <span class="op-since">${x.st.since ? hm(x.st.since) : "вЂ”"}</span>
      <span class="op-time${x.st.kind === "idle" ? " is-idle" : ""}">${x.st.kind === "idle" ? "вЂ”" : hms(x.st.sec)}</span>
      <a class="op-go" href="${opLink(x, "start/")}" title="В«РЎС‚Р°СЂС‚РѕРІР°СЏВ»: СЃРјРµРЅР°, РїРµСЂРµСЂС‹РІС‹, РѕС‚СЃСѓС‚СЃС‚РІРёРµ">РЎС‚Р°СЂС‚РѕРІР°СЏ</a>
    </div>`).join("") || '<p class="muted op-empty">РќРёРєРѕРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ вЂ” РёР·РјРµРЅРё С„РёР»СЊС‚СЂ РёР»Рё РїРѕРёСЃРє.</p>';
    const tableHtml = (l) => `<div class="op-table" role="table" aria-label="РЎРѕС‚СЂСѓРґРЅРёРєРё">
      <div class="op-tr op-th" role="row"><span>Р¤РРћ</span><span>РЎС‚Р°С‚СѓСЃ</span><span>РЎ</span><span>РўР°Р№РјРµСЂ</span><span>РЈС‡С‘С‚</span></div>
      ${rowsHtml(l)}
    </div>`;
    const repaintTable = () => {
      const tbl = box.querySelector(".op-table");
      if (tbl) tbl.outerHTML = tableHtml(window.__nowList || []);
    };
    if (!list.length) {
      nowSyncSet(false);
      box.dataset.loaded = "1";
      box.innerHTML = `<p class="muted">РЎРµРіРѕРґРЅСЏ СЃРѕР±С‹С‚РёР№ РїРѕРєР° РЅРµС‚ вЂ” РЅРёРєС‚Рѕ РЅРµ РЅР°Р¶РёРјР°Р» РєРЅРѕРїРєРё.</p>`;
      renderHomeSide({ late, absNow, leaveNow, list });
      return;
    }
    nowSyncSet(true);
    box.dataset.loaded = "1";
    const cnt = (k) => list.filter((x) => x.st.kind === k).length;
    window.__nowList = list;
    box.innerHTML = `
      <div class="op-tools">
        <input class="op-search" id="op-search" type="search" placeholder="РџРѕРёСЃРє СЃРѕС‚СЂСѓРґРЅРёРєР°" value="${escNow(nowSearch)}" aria-label="РџРѕРёСЃРє СЃРѕС‚СЂСѓРґРЅРёРєР°">
        <span class="op-filters">
          <button class="op-chip${!nowFilter ? " is-on" : ""}" data-f="">Р’СЃРµ <b>${list.length}</b></button>
          <button class="op-chip${nowFilter === "work" ? " is-on" : ""}" data-f="work">Р Р°Р±РѕС‚Р°СЋС‚ <b>${cnt("work")}</b></button>
          <button class="op-chip${nowFilter === "pause" ? " is-on" : ""}" data-f="pause">РќР° РїР°СѓР·Рµ <b>${cnt("pause")}</b></button>
          <button class="op-chip${nowFilter === "idle" ? " is-on" : ""}" data-f="idle">РќРµ РЅР°С‡Р°Р»Рё <b>${cnt("idle")}</b></button>
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
        // v4: Р·Р°СЏРІРєР° вЂ” С‚РѕР»СЊРєРѕ С‡РµСЂРµР· РїСЂРѕРєСЃРё `api` СЃ Р°РґРјРёРЅ-С‚РѕРєРµРЅРѕРј (anon-Р·Р°РїРёСЃСЊ Р·Р°РєСЂС‹С‚Р°)
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
        // v4: СЃРѕР±С‹С‚РёРµ вЂ” С‚РѕР»СЊРєРѕ С‡РµСЂРµР· РїСЂРѕРєСЃРё `api` (anon-insert Р·Р°РєСЂС‹С‚ RLS)
        await window.OTP_AUTH.api("admin", "otp_time_events", "POST", [{
          id: "mgr-" + Date.now() + "-" + String(slug).slice(0, 8),
          empSlug: slug, empName: emp, day, type: "absence_end", slot: "absence",
          at: new Date().toISOString(), reason: "Р·Р°РєСЂС‹С‚Рѕ СЂСѓРєРѕРІРѕРґРёС‚РµР»РµРј",
        }]);
      } catch (e) {}
      renderNowBoard();
    }));
  }

  /* ---------- РџСЂР°РІР°СЏ РєРѕР»РѕРЅРєР° РѕРїРµСЂР°С‚РёРІРЅРѕР№ РіР»Р°РІРЅРѕР№ (РїР»Р°РЅ 24.11.2026) ---------- */
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
    const TYPE = { leave: "РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ", dayoff: "РћС‚РіСѓР»", overtime: "РџРµСЂРµСЂР°Р±РѕС‚РєР°", adjust: "РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР°" };
    const hhmm = (s) => String(s || "").slice(0, 5);
    const hrs = (r) => (r.hours != null ? +r.hours || 0 : 0);
    const short = (fio) => { const p = String(fio || "").split(" "); return p[0] + (p[1] ? " " + p[1].slice(0, 1) + "." : ""); };
    const notes = (rows) => rows.map((r) => `<a class="op-note" href="#hr-sec">
        <span class="op-note-t">${esc(TYPE[r.type] || r.type)} В· ${esc(r.empName)}</span>
        <span class="op-note-d">${esc(r.date)}${r.from ? " В· " + esc(hhmm(r.from)) + "вЂ“" + esc(hhmm(r.to)) : ""}${(r.type === "overtime" || r.type === "adjust") ? " В· " + esc(hrs(r)) + " С‡" : ""}</span></a>`).join("")
      || '<p class="muted op-empty">РџРѕРєР° РЅРµС‚.</p>';
    const attn = [];
    if (att && att.late && att.late.length) attn.push({ icon: "ph-alarm", cls: "late", text: `РќРµ РІС‹С€Р»Рё Рє СЃРјРµРЅРµ: ${att.late.map((l) => short(l.emp.fullName)).join(", ")}` });
    if (att && att.absNow && att.absNow.length) attn.push({ icon: "ph-walking", cls: "abs", text: `РћС‚СЃСѓС‚СЃС‚РІСѓСЋС‚: ${att.absNow.map((a) => short(a.emp)).join(", ")}` });
    const longPause = ((att && att.list) || []).filter((x) => x.st.kind === "pause" && (x.st.pauseSec || 0) > 15 * 60);
    if (longPause.length) attn.push({ icon: "ph-pause", cls: "pause", text: `РџР°СѓР·Р° Р±РѕР»СЊС€Рµ 15 РјРёРЅСѓС‚: ${longPause.map((x) => short(x.emp.fullName)).join(", ")}` });
    const leaveRows = monthReqs.filter((r) => r.type === "leave" || r.type === "dayoff");
    const overRows = monthReqs.filter((r) => r.type === "overtime" || r.type === "adjust");
    const overTotal = overRows.reduce((s, r) => s + hrs(r), 0);
    box.innerHTML = `
      <section class="op-block">
        <h3>РўСЂРµР±СѓСЋС‚ РІРЅРёРјР°РЅРёСЏ</h3>
        ${attn.length ? attn.map((a) => `<div class="op-alert k-${a.cls}"><i class="ph-bold ${a.icon}" aria-hidden="true"></i><span>${esc(a.text)}</span></div>`).join("") : '<p class="muted op-empty">РћС‚РєР»РѕРЅРµРЅРёР№ РЅРµС‚.</p>'}
        <div class="op-sub">Р—Р°СЏРІРєРё Рє СЂРµС€РµРЅРёСЋ${pending.length ? ` <b>${pending.length}</b>` : ""}</div>
        ${pending.length ? notes(pending.slice(0, 4)) : '<p class="muted op-empty">Р—Р°СЏРІРѕРє Рє СЂРµС€РµРЅРёСЋ РЅРµС‚.</p>'}
        ${pending.length > 4 ? '<a class="op-more" href="#hr-sec">Р’СЃРµ Р·Р°СЏРІРєРё в†’</a>' : ""}
      </section>
      <section class="op-block">
        <h3>Р’ СЌС‚РѕРј РјРµСЃСЏС†Рµ</h3>
        <div class="op-sub">РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅС‹Рµ Рё РѕС‚РіСѓР»С‹ <b>${leaveRows.length}</b></div>
        ${leaveRows.length ? notes(leaveRows.slice(0, 3)) : '<p class="muted op-empty">РџРѕРєР° РЅРµС‚.</p>'}
        <div class="op-sub">РџРµСЂРµСЂР°Р±РѕС‚РєРё В· ${overTotal} С‡</div>
        ${overRows.length ? notes(overRows.slice(0, 3)) : '<p class="muted op-empty">РџРѕРєР° РЅРµС‚.</p>'}
        <a class="op-more" href="${DASH_BASE}hours/">РџРѕР»РЅС‹Р№ Р¶СѓСЂРЅР°Р» С‡Р°СЃРѕРІ в†’</a>
      </section>`;
  }

  /* РЁР°РїРєР° РѕРїРµСЂР°С‚РёРІРЅРѕР№ РіР»Р°РІРЅРѕР№ + С„РѕСЂРјС‹ Р·Р°РЅРµСЃРµРЅРёСЏ (РїР»Р°РЅ 24.11.2026, СЌС‚Р°Рї 2). */
  (function initHomeChrome() {
    const dateEl = $("#op-date");
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} В· РѕР±РЅРѕРІР»РµРЅРѕ ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} РњРЎРљ`;
    }

    const modal = $("#op-modal"), form = $("#op-form"), titleEl = $("#op-modal-title"), errEl = $("#op-form-err");
    if (!modal || !form) return;
    const LABEL = { leave: "РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ", dayoff: "РћС‚РіСѓР»", overtime: "РќР°С‡РёСЃР»РµРЅРёРµ РїРµСЂРµСЂР°Р±РѕС‚РєРё" };
    const ICON = { leave: "ph-door-open", dayoff: "ph-calendar-minus", overtime: "ph-plus-circle" };
    const FIELDS = {
      leave: [["date", "Р”Р°С‚Р°", "date", true], ["from", "Р’СЂРµРјСЏ СЃ", "time", true], ["to", "Р’СЂРµРјСЏ РґРѕ", "time", true], ["reason", "РџСЂРёС‡РёРЅР°", "textarea", true]],
      dayoff: [["date", "Р”Р°С‚Р° РѕС‚РіСѓР»Р°", "date", true], ["date2", "Р”Р°С‚Р° РІС‹С…РѕРґРЅРѕР№ СЃРјРµРЅС‹", "date", true], ["reason", "РљРѕРјРјРµРЅС‚Р°СЂРёР№", "textarea", false]],
      overtime: [["date", "Р”Р°С‚Р° СЂР°Р±РѕС‚С‹", "date", true], ["hours", "Р§Р°СЃС‹", "number", true], ["reason", "РљР°РєРёРµ Р·Р°РґР°С‡Рё РІС‹РїРѕР»РЅСЏР»РёСЃСЊ", "textarea", true]],
    };
    const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    const parseHM = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; };
    const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    let curType = null;
    let busy = false;

    const empOptions = () => (D.employees || []).filter((e) => e.status !== "left")
      .map((e) => `<option value="${escAttr(e.slug || e.id)}">${escAttr(e.fullName)}</option>`).join("");
    const escAttr = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

    /* РЎРѕР±РёСЂР°РµС‚ Р·Р°СЏРІРєСѓ РёР· С„РѕСЂРјС‹: {rec} РёР»Рё {err}. Р§Р°СЃС‹ вЂ” РёР· РІСЂРµРјРµРЅРё РёР»Рё РїРѕР»СЏ. */
    function buildRec() {
      const fd = Object.fromEntries(new FormData(form).entries());
      const emp = (D.employees || []).find((e) => (e.slug || e.id) === fd.emp);
      if (!emp) return { err: "Р’С‹Р±РµСЂРё СЃРѕС‚СЂСѓРґРЅРёРєР°." };
      let hours = null;
      if (curType === "dayoff") hours = 8;
      else if (curType === "overtime") hours = Number(String(fd.hours || "").replace(",", "."));
      else {
        const a = parseHM(fd.from), b = parseHM(fd.to);
        hours = (a != null && b != null && b > a) ? Math.round((b - a) / 6) / 10 : null;
        if (hours == null) return { err: "РџСЂРѕРІРµСЂСЊ РІСЂРµРјСЏ: РєРѕРЅРµС† РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕР·Р¶Рµ РЅР°С‡Р°Р»Р°." };
      }
      if (!fd.date) return { err: "РЈРєР°Р¶Рё РґР°С‚Сѓ." };
      const max = (D.hrRules && D.hrRules.leaveMaxHours) || 4;
      if (curType === "leave" && hours > max) return { err: `РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ Р±РѕР»СЊС€Рµ ${max} С‡ РІ РґРµРЅСЊ РЅРµРІРѕР·РјРѕР¶РЅР°.` };
      if (curType === "overtime" && !(hours > 0 && hours <= 24)) return { err: "Р§Р°СЃС‹ РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ РѕС‚ 0,5 РґРѕ 24." };
      if (curType === "dayoff" && !fd.date2) return { err: "РЈРєР°Р¶Рё РґР°С‚Сѓ РІС‹С…РѕРґРЅРѕР№ СЃРјРµРЅС‹." };
      const nowIso = new Date().toISOString();
      const rec = {
        id: "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        empSlug: emp.slug || emp.id, empName: emp.fullName, type: curType,
        date: fd.date, date2: fd.date2 || "", from: fd.from || "", to: fd.to || "",
        hours, reason: String(fd.reason || "").trim(), status: "approved",
        created: nowIso, decided: nowIso, decidedBy: window.OTP_ACTOR || "Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ",
      };
      if (curType === "leave" && fd.noDeduct) rec.noDeduct = true;
      return { rec };
    }

    /* Р Р°СЃС‡С‘С‚ РїРѕ РґРµР№СЃС‚РІСѓСЋС‰РёРј РїСЂР°РІРёР»Р°Рј (otp.reqDelta): С‡С‚Рѕ РїСЂРѕРёР·РѕР№РґС‘С‚ СЃ С‡Р°СЃР°РјРё. */
    function deltaText(rec) {
      if (!window.otp || !otp.reqDelta) return "";
      const d = otp.reqDelta(rec);
      if (rec.type === "dayoff") return "РѕС‚РіСѓР» С‡Р°СЃС‹ РЅРµ РґРІРёРіР°РµС‚";
      if (rec.type === "leave") return rec.noDeduct ? "С‡Р°СЃС‹ РЅРµ СЃРїРёС€СѓС‚СЃСЏ (СЂРµС€РµРЅРёРµ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ)" : (d < 0 ? `СЃРїРёС€РµС‚СЃСЏ ${Math.abs(d)} С‡` : "С‡Р°СЃС‹ РЅРµ СЃРїРёС€СѓС‚СЃСЏ");
      return d > 0 ? `РЅР°С‡РёСЃР»РёС‚СЃСЏ ${d} С‡` : "С‡Р°СЃС‹ РЅРµ РёР·РјРµРЅСЏС‚СЃСЏ";
    }

    function preview() {
      const box = $("#op-preview");
      if (!box) return;
      const r = buildRec();
      if (r.err) { box.textContent = r.err; box.className = "op-preview is-err"; return; }
      box.textContent = `РС‚РѕРі: ${deltaText(r.rec)}`;
      box.className = "op-preview";
    }

    /* РџРµСЂРµСЃРµС‡РµРЅРёСЏ: С‚Р° Р¶Рµ РґР°С‚Р° Сѓ С‚РѕРіРѕ Р¶Рµ СЃРѕС‚СЂСѓРґРЅРёРєР° (РґР»СЏ СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅРѕР№ вЂ” РїРѕ РІСЂРµРјРµРЅРё). */
    async function conflict(rec) {
      try {
        const rows = await window.OTP_AUTH.api("admin", `otp_requests?select=*&empSlug=eq.${encodeURIComponent(rec.empSlug)}&type=eq.${rec.type}&date=eq.${rec.date}`, "GET");
        const list = (Array.isArray(rows) ? rows : []).filter((r) => r.status !== "rejected" && r.status !== "cancelled");
        for (const r of list) {
          if (rec.type === "leave") {
            const a1 = parseHM(rec.from), b1 = parseHM(rec.to), a2 = parseHM(r.from), b2 = parseHM(r.to);
            if (a1 != null && b1 != null && a2 != null && b2 != null && a1 < b2 && a2 < b1) {
              return `РџРµСЂРµСЃРµС‡РµРЅРёРµ СЃ СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅРѕР№ ${hm(a2)}вЂ“${hm(b2)} РІ СЌС‚РѕС‚ РґРµРЅСЊ.`;
            }
            if (r.noDeduct === true && !rec.noDeduct) return "РќР° СЌС‚Сѓ РґР°С‚Сѓ СѓР¶Рµ РµСЃС‚СЊ СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ Р±РµР· СЃРїРёСЃР°РЅРёСЏ.";
          } else if (rec.type === "dayoff") {
            if (String(r.date2 || "") === String(rec.date2 || "")) return "РћС‚РіСѓР» Р·Р° СЌС‚Сѓ РІС‹С…РѕРґРЅСѓСЋ СЃРјРµРЅСѓ СѓР¶Рµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ.";
            if (String(r.date || "") === String(rec.date || "")) return "РќР° СЌС‚Сѓ РґР°С‚Сѓ РѕС‚РіСѓР» СѓР¶Рµ РµСЃС‚СЊ.";
          } else {
            return "РџРµСЂРµСЂР°Р±РѕС‚РєР° РЅР° СЌС‚Сѓ РґР°С‚Сѓ СѓР¶Рµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅР°.";
          }
        }
      } catch (e) { /* РЅРµС‚ СЃРІСЏР·Рё вЂ” РЅРµ Р±Р»РѕРєРёСЂСѓРµРј, СЃРµСЂРІРµСЂ РІСЃС‘ СЂР°РІРЅРѕ РїСЂРѕРІРµСЂРёС‚ */ }
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
      form.innerHTML = `<label class="op-f"><span>РЎРѕС‚СЂСѓРґРЅРёРє</span><select name="emp">${empOptions()}</select></label>
        ${fields}
        ${type === "leave" ? `<label class="op-check"><input type="checkbox" name="noDeduct"> <span>РќРµ СЃРїРёСЃС‹РІР°С‚СЊ С‡Р°СЃС‹</span></label>
          <div class="op-note">РЈРІРѕР»СЊРЅРёС‚РµР»СЊРЅР°СЏ вЂ” РЅРµ Р±РѕР»СЊС€Рµ ${(D.hrRules && D.hrRules.leaveMaxHours) || 4} С‡ РІ РґРµРЅСЊ.</div>` : ""}
        <div class="op-preview" id="op-preview"></div>
        <div class="op-form-foot">
          <button class="btn btn-primary" type="submit"><i class="ph-bold ph-check" aria-hidden="true"></i> Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊ</button>
          <button class="btn btn-ghost" type="button" id="op-cancel">РћС‚РјРµРЅР°</button>
        </div>`;
      modal.hidden = false;
      $("#op-cancel").addEventListener("click", close);
      form.querySelectorAll("input,select,textarea").forEach((el) => el.addEventListener("input", preview));
      preview();
      const first = form.querySelector("select");
      if (first) first.focus();
    }
    function close() { modal.hidden = true; curType = null; }

    /* --- СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РіСЂР°С„РёРєР° СЃ Confluence (РєРЅРѕРїРєР° РЅР° РіР»Р°РІРЅРѕР№) ---
       РљРЅРѕРїРєР° С‚РѕР»СЊРєРѕ РїРёС€РµС‚ Р·Р°РїСЂРѕСЃ РІ otp_sync_flags; СЃР°Рј РіСЂР°С„РёРє Р·Р°Р±РёСЂР°РµС‚ Р»РѕРєР°Р»СЊРЅС‹Р№
       Р°РіРµРЅС‚ РёР· Confluence (РёРЅС‚СЂР°РЅРµС‚): scripts/sync_schedule.py --if-requested. */
    const cloudCfg = () => (D.hrRules && D.hrRules.cloud) || null;
    function syncStateText(f) {
      /* В«РіСЂР°С„РёРє РѕС‚В» РїРѕРєР°Р·С‹РІР°РµС‚ РґР°С‚Сѓ Рё РІСЂРµРјСЏ, РєРѕРіРґР° Confluence РѕС‚РґР°Р» РіСЂР°С„РёРє
         (СЃС‚Р°СЂС‹Рµ schedule.json СЃРѕРґРµСЂР¶Р°С‚ С‚РѕР»СЊРєРѕ РґР°С‚Сѓ вЂ” РёС… С‚РѕР¶Рµ РїРѕРЅРёРјР°РµРј). */
      const g = (D.schedule && D.schedule.generated) || "";
      let gen = "вЂ”";
      if (g) {
        const s = String(g);
        const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
        if (isNaN(d.getTime())) gen = s;
        else gen = s.includes("T")
          ? d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : d.toLocaleDateString("ru-RU");
      }
      if (!f || !f.done_at) return `РіСЂР°С„РёРє РѕС‚ ${gen}`;
      const t = new Date(f.done_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      return `РіСЂР°С„РёРє РѕС‚ ${gen} В· СЃРёРЅС…СЂРѕРЅРёР·РёСЂРѕРІР°РЅ ${t}` + (f.ok === false ? ` (РѕС€РёР±РєР°: ${f.message || ""})` : "");
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
      if (!window.OTP_AUTH || !window.OTP_AUTH.token("admin")) { el.textContent = "РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РЅРµРґРѕСЃС‚СѓРїРЅР°: РЅСѓР¶РµРЅ РІС…РѕРґ."; return; }
      el.textContent = "РћС‚РїСЂР°РІР»СЏСЋ Р·Р°РїСЂРѕСЃвЂ¦";
      window.OTP_AUTH.api("admin", "otp_sync_flags?id=eq.schedule", "PATCH", {
        requested_at: new Date().toISOString(),
        requested_by: window.OTP_ACTOR || "Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ",
      }).then(() => {
        el.textContent = "РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ Р·Р°РїСЂРѕС€РµРЅР° вЂ” РџРљ Р·Р°Р±РµСЂС‘С‚ РіСЂР°С„РёРє РёР· Confluence РІ С‚РµС‡РµРЅРёРµ РїР°СЂС‹ РјРёРЅСѓС‚.";
        setTimeout(renderSyncState, 90000);
      }).catch(() => { el.textContent = "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСЂРѕСЃРёС‚СЊ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЋ вЂ” РїСЂРѕРІРµСЂСЊ СЃРІСЏР·СЊ."; });
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
      if (busy) return;                       // РґРІРѕР№РЅРѕРµ РЅР°Р¶Р°С‚РёРµ = РѕРґРЅР° РѕРїРµСЂР°С†РёСЏ
      const r = buildRec();
      if (r.err) { errEl.textContent = r.err; return; }
      busy = true;
      errEl.textContent = "РџСЂРѕРІРµСЂСЏСЋ РїРµСЂРµСЃРµС‡РµРЅРёСЏвЂ¦";
      const bad = await conflict(r.rec);
      if (bad) { errEl.textContent = bad; busy = false; return; }
      errEl.textContent = "РЎРѕС…СЂР°РЅСЏСЋвЂ¦";
      try {
        if (window.OTP_CLOUD) await window.OTP_CLOUD.upsert(r.rec);
        close();
        renderNowBoard();                    // РѕР±РЅРѕРІРёС‚СЊ С‚Р°Р±Р»РёС†Сѓ Рё РїСЂР°РІСѓСЋ РєРѕР»РѕРЅРєСѓ
        if (window.otpRefreshHours) window.otpRefreshHours();
      } catch (err) {
        errEl.textContent = "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ вЂ” РїСЂРѕРІРµСЂСЊ СЃРІСЏР·СЊ Рё РїРѕРїСЂРѕР±СѓР№ РµС‰С‘ СЂР°Р·.";
      }
      busy = false;
    });
  })();

  /* ---------- РіСЂР°С„РёРєРё (СЃС‚СЂР°РЅРёС†Р° В«Р”РёРЅР°РјРёРєР°В») ---------- */
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
        label: "РЎСЂРµРґРЅРёР№ KPI", data: teamAvgSeries,
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
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `РЎСЂРµРґРЅРёР№ KPI: ${c.parsed.y}` } } },
      },
    });
  }

  if ($("#chart-bonus")) {
    const bonusSeries = D.months.map((_, i) =>
      D.employees.reduce((s, e) => s + (e.history[i].bonus || 0), 0));
    new Chart($("#chart-bonus"), {
      type: "bar",
      data: { labels: D.months, datasets: [{ label: "Р‘РѕРЅСѓСЃС‹", data: bonusSeries,
        backgroundColor: "#0e7490", hoverBackgroundColor: "#22d3ee", borderRadius: 6, maxBarThickness: 26 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { callback: (v) => otp.fmt(v) + " в‚Ѕ" } },
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
    sel.innerHTML = `<option value="__team__">РЎСЂРµРґРЅРµРµ РїРѕ РєРѕРјР°РЅРґРµ</option>` +
      D.employees.filter((e) => e.current != null)
        .map((e) => `<option value="${e.id}">${e.shortName} ${e.fullName.split(" ")[0]}</option>`).join("");
    let radarChart = null;
    const drawRadar = () => {
      const v = sel.value;
      const src = v === "__team__" ? teamProfile : (otp.byId(v)?.current || teamProfile);
      const label = v === "__team__" ? "РЎСЂРµРґРЅРµРµ РїРѕ РєРѕРјР°РЅРґРµ" : otp.byId(v).fullName;
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


  /* ---------- РќР°СЃС‚СЂРѕР№РєРё (СЃС‚СЂР°РЅРёС†Р° /settings/) ---------- */
  function renderSettings() {
    const box = $("#settings-panel");
    const T = window.OTP_THEME;
    if (!box || !T) return;
    const st = T.get();
    const cur = T.themeOf(st.theme);
    box.innerHTML = `<div class="set-wrap">
      <section class="set-block">
        <div class="set-h"><i class="ph-bold ph-palette"></i><h3>РўРµРјР° РѕС„РѕСЂРјР»РµРЅРёСЏ</h3></div>
        <p class="set-sub">РўРµРјР° РјРµРЅСЏРµС‚ С„РѕРЅ, СЌР»РµРјРµРЅС‚С‹, РёРєРѕРЅРєРё, СЌРјР±Р»РµРјСѓ Рё РІРєР»СЋС‡Р°РµС‚ СЃРІРѕСЋ Р°РЅРёРјР°С†РёСЋ. РќР°СЃС‚СЂРѕР№РєР° Р»РёС‡РЅР°СЏ вЂ” Сѓ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ СЃРІРѕРё С‚РµРјС‹.</p>
        <div class="set-grid set-grid-themes" id="set-themes">
          ${T.themes.map((x) => `<button class="set-opt set-theme-card${st.theme === x.id ? " is-on" : ""}${["classic","light","dark","cyberpunk"].includes(x.id) ? "" : " set-hide"}" data-theme-id="${x.id}">
            <span class="set-thumb th-${x.id}">${(x.figures && x.figures[0]) ? `<img src="${T.img(x.figures[0])}" alt="${x.label}">` : `<span class="set-thumb-fx"></span>`}</span>
            <b>${x.label}</b><i>${x.hint}</i>
            <i class="ph-bold ph-check-circle set-tick"></i></button>`).join("")}
        </div>
        <button class="set-more" id="set-more">РџРѕРєР°Р·Р°С‚СЊ РІСЃРµ С‚РµРјС‹</button>
      </section>
      <section class="set-block">
        <div class="set-h"><i class="ph-bold ph-sparkle"></i><h3>РђРЅРёРјР°С†РёСЏ</h3></div>
        <p class="set-sub">РЈ РєР°Р¶РґРѕР№ С‚РµРјС‹ СЃРІРѕСЏ РїРѕСЃС‚РѕСЏРЅРЅР°СЏ Р°РЅРёРјР°С†РёСЏ РЅР° С„РѕРЅРµ вЂ” РѕРЅР° РЅРµ РїРµСЂРµРєСЂС‹РІР°РµС‚ С‚РµРєСЃС‚.</p>
        <label class="set-row"><input type="checkbox" id="set-anim-on"${st.animOn ? " checked" : ""}>
          <span>Р’РєР»СЋС‡РёС‚СЊ Р°РЅРёРјР°С†РёСЋ С„РѕРЅР°${cur && cur.anim ? " вЂ” " + cur.label : ""}</span></label>
        <div class="set-foot"><button class="set-btn ghost" id="set-reset"><i class="ph-bold ph-arrow-counter-clockwise"></i> РЎР±СЂРѕСЃРёС‚СЊ Рє РєР»Р°СЃСЃРёС‡РµСЃРєРѕР№</button></div>
      </section>
    </div>`;
    const more = document.getElementById("set-more");
    if (more) more.addEventListener("click", () => {
      const grid = document.getElementById("set-themes");
      if (!grid) return;
      const open = grid.classList.toggle("set-open");
      more.textContent = open ? "РЎРІРµСЂРЅСѓС‚СЊ С‚РµРјС‹" : "РџРѕРєР°Р·Р°С‚СЊ РІСЃРµ С‚РµРјС‹";
    });
    document.querySelectorAll("#set-themes .set-opt").forEach((b) =>
      b.addEventListener("click", () => {
        T.setTheme(b.dataset.themeId);
        document.querySelectorAll("#set-themes .set-opt").forEach((x) => x.classList.remove("is-on"));
        b.classList.add("is-on");
        const th = T.themeOf(b.dataset.themeId);
        const lbl = document.querySelector("#set-anim-on + span");
        if (lbl) lbl.textContent = "Р’РєР»СЋС‡РёС‚СЊ Р°РЅРёРјР°С†РёСЋ С„РѕРЅР°" + (th.anim ? " вЂ” " + th.label : "");
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
  initSchedulePage();

  /* ---------- Р°РґРјРёРЅРєР°: СЃРѕС‚СЂСѓРґРЅРёРєРё, Р»РѕРіРёРЅС‹, РїР°СЂРѕР»Рё ---------- */
  /* ---------------- v22: СЂРµРґР°РєС‚РѕСЂ РіСЂР°С„РёРєР° РјРµСЃСЏС†Р° ---------------- */
  const SCH_SYMBOLS = ["2", "1", "3", "Р’", "I", "II", "РЎСЂ", "Рў", "Рћ", "Р‘", "X", "РќР’", "Р”", "РЈ", "Рљ"];
  const SCH_KIND = {
    "1": "shift", "2": "shift", "3": "shift", "I": "week", "II": "week",
    "Р’": "off", "Рћ": "vac", "Р‘": "sick", "РЈ": "study", "X": "dayoff",
    "РќР’": "dayoff", "Р”": "extra", "Рљ": "trip", "РЎСЂ": "duty", "Рў": "duty",
  };
  /* РЅРѕСЂРјС‹ Р»РёРЅРёР№ Рё РґРѕРїСѓСЃС‚РёРјС‹Рµ СЃРѕС‚СЂСѓРґРЅРёРєРё (РїРѕ РїСЂР°РІРёР»Р°Рј СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ) */
  const SCH_LINES = [
    { line: "L0", need: 1, who: ["frolov", "bolgov"], shift: "2" },
    { line: "L1.1", need: 3, who: ["yuryev", "agarov", "vtorygin", "zavyalov", "khasanov"], shift: "2" },
    { line: "L2.1", need: 2, who: ["melnikov", "pestovsky", "eliseev", "yuryev"], shift: "2" },
    { line: "L2.2", need: 1, who: ["pestovsky", "yuryev"], shift: "2" },
    { line: "L2.3", need: 1, who: ["melnikov", "eliseev"], shift: "2" },
    { line: "L2.4", need: 1, who: ["pospelova", "melnikov"], shift: "2" },
    { line: "РЅРѕС‡РЅРѕР№", need: 1, who: ["zavyalov"], shift: "1" },
  ];
  const SCH_TANIA = ["bolgov", "melnikov", "eliseev"];
  const SCH_FIXED_HOLIDAYS = ["01-01", "01-02", "01-07", "02-23", "03-08", "05-01", "05-09", "06-12", "11-04"];
  const SCH_NO_SHIFTS = ["01-01", "01-02", "03-08"];

  function schMonthDays(month) {
    const [y, m] = month.split("-").map(Number);
    const total = new Date(y, m, 0).getDate();
    const out = [];
    for (let d = 1; d <= total; d++) {
      const dt = new Date(y, m - 1, d);
      const mmdd = String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      out.push({
        d, wd: dt.getDay(),
        holiday: SCH_FIXED_HOLIDAYS.includes(mmdd),
        noShifts: SCH_NO_SHIFTS.includes(mmdd),
      });
    }
    return out;
  }

  async function initScheduleEditor(emps, hostEl) {
    const app = hostEl || document.getElementById("app");
    if (!app || !emps || !emps.length) return;
    const D = window.OTP_DATA || {};
    const nextMonth = (() => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    })();
    const box = document.createElement("div");
    box.className = "staff-add sch-editor";
    box.innerHTML = `<h4><i class="ph-bold ph-table"></i> Р“СЂР°С„РёРє РјРµСЃСЏС†Р°</h4>
      <div class="staff-add-grid">
        <label>РњРµСЃСЏС†<input id="sch-month" type="month" value="${nextMonth}"></label>
        <label>Р”РµРЅСЊ РґР»СЏ РѕС‚РјРµС‚РєРё<input id="sch-flag-day" type="number" min="1" max="31" value="1"></label>
      </div>
      <div class="sch-toolbar">
        ${SCH_SYMBOLS.map((s, i) => `<button type="button" class="sch-sym${i === 0 ? " is-on" : ""}" data-sym="${s}">${s}</button>`).join("")}
        <span class="staff-hint">РІС‹Р±РµСЂРёС‚Рµ СЃРёРјРІРѕР» Рё РЅР°Р¶РёРјР°Р№С‚Рµ РїРѕ СЏС‡РµР№РєР°Рј</span>
      </div>
      <div class="staff-add-foot">
        <button class="btn btn-primary" id="sch-load" type="button">Р—Р°РіСЂСѓР·РёС‚СЊ</button>
        <button class="btn btn-ghost" id="sch-auto" type="button">РђРІС‚Рѕ РїРѕ РїРѕР¶РµР»Р°РЅРёСЏРј</button>
        <button class="btn btn-ghost" id="sch-check" type="button">РџСЂРѕРІРµСЂРёС‚СЊ РЅРѕСЂРјС‹</button>
        <button class="btn btn-ghost" id="sch-flag-short" type="button">Р”РµРЅСЊ СѓРєРѕСЂРѕС‡РµРЅРЅС‹Р№</button>
        <button class="btn btn-ghost" id="sch-flag-hol" type="button">Р’ РґРµРЅСЊ СЃРјРµРЅ РЅРµС‚</button>
        <button class="btn btn-ghost" id="sch-flag-clear" type="button">РЎРЅСЏС‚СЊ РѕС‚РјРµС‚РєСѓ</button>
        <button class="btn btn-primary" id="sch-save" type="button">РЎРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРє</button>
        <button class="btn btn-ghost" id="sch-publish" type="button">РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ</button>
        <button class="btn btn-ghost" id="sch-csv" type="button">Р’С‹РіСЂСѓР·РёС‚СЊ CSV</button>
        <button class="btn btn-ghost" id="sch-xlsx" type="button">XLSX СЃ С†РІРµС‚Р°РјРё</button>
        <button class="btn btn-ghost" id="sch-conf" type="button">Р’ Confluence</button>
        <span class="staff-hint" id="sch-msg"></span>
      </div>
      <div class="sch-report" id="sch-report"></div>
      <div class="sch-wrap" id="sch-wrap"></div>`;
    app.appendChild(box);

    let month = nextMonth;
    let cell = {};            // slug -> { day: symbol }
    let symbol = "2";
    let answers = {};         // slug -> РѕС‚РІРµС‚ РѕРїСЂРѕСЃР°
    let report = [];

    const bySlug = new Map(emps.map((e) => [e.slug, e]));
    const fio = (slug) => (bySlug.get(slug) || {}).fio || slug;

    const setMsg = (t) => { const m = box.querySelector("#sch-msg"); if (m) m.textContent = t; };

    const get = (slug, d) => (cell[slug] || {})[String(d)] || "";
    const put = (slug, d, v) => {
      cell[slug] = cell[slug] || {};
      if (v) cell[slug][String(d)] = v; else delete cell[slug][String(d)];
    };

    const render = () => {
      const days = schMonthDays(month);
      const head = days.map((x) => {
        const f = flagOf(x.d);
        const cls = `${x.wd === 0 ? "is-sun" : ""}${x.noShifts || f === "holiday" ? " is-holiday" : ""}${f === "short" ? " is-short" : ""}`;
        return `<th class="${cls}" title="${f === "short" ? "СѓРєРѕСЂРѕС‡РµРЅРЅС‹Р№ РґРµРЅСЊ" : f === "holiday" ? "СЃРјРµРЅ РЅРµС‚" : ""}">${x.d}${f === "short" ? "*" : ""}</th>`;
      }).join("");
      const rowsHtml = emps.map((e) => {
        const cells = days.map((x) => {
          const v = get(e.slug, x.d);
          const kind = SCH_KIND[v] || "";
          return `<td class="sch-cell ${kind}" data-slug="${e.slug}" data-day="${x.d}" title="${escNow(fio(e.slug))} В· ${x.d}">${escNow(v)}</td>`;
        }).join("");
        const shifts = days.filter((x) => ["1", "2", "3", "I", "II", "2Р ", "3Р "].includes(get(e.slug, x.d))).length;
        return `<tr><th class="sch-name">${escNow(fio(e.slug))}</th>${cells}<td class="sch-total">${shifts}</td></tr>`;
      }).join("");
      const wrap = box.querySelector("#sch-wrap");
      if (wrap) wrap.innerHTML = `<table class="sch-table"><thead><tr><th class="sch-name">Р¤РРћ</th>${head}<th>СЃРј.</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
      wrap.querySelectorAll(".sch-cell").forEach((td) => td.addEventListener("click", () => {
        put(td.dataset.slug, Number(td.dataset.day), symbol === "" ? "" : symbol);
        render();
      }));
      const rep = box.querySelector("#sch-report");
      if (rep) {
        rep.innerHTML = report.length
          ? `<b>Р—Р°РјРµС‡Р°РЅРёСЏ Р°РІС‚РѕСЃР±РѕСЂРєРё:</b><ul>${report.map((r) => `<li>${escNow(r)}</li>`).join("")}</ul>`
          : "";
      }
    };

    const loadAnswers = async () => {
      const res = await A.pollSummary("p-" + month);
      const map = {};
      if (res && res.ok && Array.isArray(res.list)) {
        for (const r of res.list) {
          const slug = (D.employees || []).find((e) => (e.slug === r.emp_slug || e.id === r.emp_slug));
          map[r.emp_slug] = r.answers || {};
          if (slug && slug.id !== r.emp_slug) map[slug.id] = r.answers || {};
        }
      }
      answers = map;
      return map;
    };

    const offDay = (slug, d) => {
      const a = answers[slug] || {};
      return (a.off_dates || []).map(Number).includes(Number(d));
    };
    /* РѕС‚РїСѓСЃРєР° РёР· Р±Р°Р·С‹ (Р·Р°РїРѕР»РЅСЏРµС‚ Р°РіРµРЅС‚ РёР· СЃС‚СЂР°РЅРёС†С‹ РѕС‚РїСѓСЃРєРѕРІ Confluence) */
    let vacations = [];
    let flags = [];   // РѕС‚РјРµС‚РєРё РґРЅРµР№: {day, kind: short|holiday}
    const loadFlags = async () => {
      const res = await A.flagsGet(month);
      flags = (res && res.ok && Array.isArray(res.list)) ? res.list : [];
      return flags;
    };
    const flagOf = (d) => (flags.find((f) => Number(f.day) === Number(d)) || {}).kind || "";
    const loadVacations = async () => {
      const res = await A.vacationsGet(month);
      vacations = (res && res.ok && Array.isArray(res.list)) ? res.list : [];
      return vacations;
    };
    const onVacation = (slug, d) => vacations.some((v) => v.emp_slug === slug && d >= v.from_day && d <= v.to_day);

    /* РїСЂРѕРІРµСЂРєР° РЅРѕСЂРј Р»РёРЅРёР№ РїРѕ С‚РµРєСѓС‰РµР№ С‚Р°Р±Р»РёС†Рµ */
    const checkNorms = () => {
      const days = schMonthDays(month);
      const bad = [];
      const isShift = (sym) => ["1", "2", "3", "I", "II", "2Р ", "3Р "].includes(sym);
      for (const day of days) {
        if (day.noShifts) continue;
        const weekend = day.wd === 0 || day.wd === 6 || day.holiday;
        if (weekend) continue;   // РІ РІС‹С…РѕРґРЅС‹Рµ РЅРѕСЂРјС‹ Р»РёРЅРёР№ РЅРµ РґРµР№СЃС‚РІСѓСЋС‚
        for (const line of SCH_LINES) {
          const have = emps.filter((e) => line.who.includes(e.slug) && isShift(get(e.slug, day.d))).length;
          if (have < line.need) bad.push(`${day.d}-Рµ: ${line.line} вЂ” ${have} РёР· ${line.need}`);
        }
      }
      report = bad;
      render();
      setMsg(bad.length ? `РќР°СЂСѓС€РµРЅРёР№ РЅРѕСЂРј: ${bad.length}` : "РќРѕСЂРјС‹ Р»РёРЅРёР№ СЃРѕР±Р»СЋРґРµРЅС‹");
    };

    const autoBuild = async () => {
      await loadAnswers();
      await loadVacations();
      const days = schMonthDays(month);
      cell = {};
      report = [];
      const consec = {};   // slug -> СЃРјРµРЅ РїРѕРґСЂСЏРґ
      const load = {};     // slug -> РІСЃРµРіРѕ СЃРјРµРЅ
      const lastShift = {};// slug -> РґРµРЅСЊ РїРѕСЃР»РµРґРЅРµР№ СЃРјРµРЅС‹
      const taniaQ = SCH_TANIA.slice();
      const l0Q = ["frolov", "bolgov"];

      for (const day of days) {
        const weekend = day.wd === 0 || day.wd === 6 || day.holiday;
        if (weekend || day.noShifts) {
          for (const e of emps) {
            put(e.slug, day.d, "Р’");
            consec[e.slug] = 0;
          }
          if (day.noShifts) continue;
          /* РІС‹С…РѕРґРЅС‹Рµ СЃРјРµРЅС‹ вЂ” С‚РѕР»СЊРєРѕ РїРѕ РїРѕР¶РµР»Р°РЅРёСЏРј */
          for (const e of emps) {
            if (onVacation(e.slug, day.d)) { put(e.slug, day.d, "Рћ"); continue; }
            const a = answers[e.slug] || {};
            if (a.weekend_none) continue;
            if ((a.weekend_dates || []).map(Number).includes(day.d)) {
              put(e.slug, day.d, a.weekend_time === "08:00" ? "II" : "I");
              load[e.slug] = (load[e.slug] || 0) + 1;
            }
          }
          /* РґРµР¶СѓСЂРЅС‹Рµ: СЃСѓР±Р±РѕС‚Р° вЂ” В«РўР°РЅРёСЏВ», РІРѕСЃРєСЂРµСЃРµРЅСЊРµ вЂ” В«СЃСЂРѕС‡РєР°В» РёР· L0 */
          const queue = day.wd === 6 ? taniaQ : l0Q;
          for (let i = 0; i < queue.length; i++) {
            const slug = queue[i];
            if (!emps.some((e) => e.slug === slug)) continue;
            if (get(slug, day.d) !== "Р’") continue;
            if (offDay(slug, day.d)) continue;
            put(slug, day.d, day.wd === 6 ? "Рў" : "РЎСЂ");
            queue.push(queue.shift());
            break;
          }
          continue;
        }

        /* Р±СѓРґРЅРё: РЅРѕСЂРјС‹ Р»РёРЅРёР№ */
        for (const e of emps) put(e.slug, day.d, onVacation(e.slug, day.d) ? "Рћ" : (offDay(e.slug, day.d) ? "X" : "Р’"));
        for (const line of SCH_LINES) {
          const cand = line.who
            .filter((slug) => bySlug.has(slug))
            .filter((slug) => get(slug, day.d) === "Р’")
            .filter((slug) => (consec[slug] || 0) < 6)
            .sort((a, b) => (load[a] || 0) - (load[b] || 0) || String(lastShift[a] || 0).localeCompare(String(lastShift[b] || 0)));
          const picked = cand.slice(0, line.need);
          if (picked.length < line.need) {
            report.push(`${day.d}-Рµ: ${line.line} вЂ” РЅРµРґРѕР±РѕСЂ (${picked.length} РёР· ${line.need})`);
          }
          for (const slug of picked) {
            const a = answers[slug] || {};
            const weekStart = new Date(month + "-" + String(day.d).padStart(2, "0")).getDate() - ((day.wd + 6) % 7);
            const thirdOk = (a.third_weeks || []).map(Number).includes(weekStart) && !a.third_none;
            put(slug, day.d, thirdOk && line.line !== "РЅРѕС‡РЅРѕР№" ? "3" : (line.shift || "2"));
            load[slug] = (load[slug] || 0) + 1;
            consec[slug] = (consec[slug] || 0) + 1;
            lastShift[slug] = day.d;
          }
        }
      }
      render();
    };

    box.querySelectorAll(".sch-sym").forEach((btn) => btn.addEventListener("click", () => {
      symbol = btn.getAttribute("data-sym");
      box.querySelectorAll(".sch-sym").forEach((b) => b.classList.toggle("is-on", b === btn));
    }));
    const onLoad = async () => {
      month = (box.querySelector("#sch-month") || {}).value || nextMonth;
      const res = await A.scheduleGet(month);
      cell = (res && res.ok && res.schedule && res.schedule.cell) ? res.schedule.cell : {};
      report = [];
      render();
      setMsg(res && res.schedule ? `Р—Р°РіСЂСѓР¶РµРЅРѕ (РІРµСЂСЃРёСЏ ${res.schedule.version}, ${res.schedule.status})` : "Р§РµСЂРЅРѕРІРёРєР° РЅРµС‚ вЂ” РјРѕР¶РЅРѕ СЃРѕР±СЂР°С‚СЊ Р°РІС‚Рѕ");
      loadAnswers();
      loadVacations();
      loadFlags();
    };
    const btnLoad = box.querySelector("#sch-load"); if (btnLoad) btnLoad.addEventListener("click", onLoad);
    const btnAuto = box.querySelector("#sch-auto"); if (btnAuto) btnAuto.addEventListener("click", autoBuild);
    const btnCheck = box.querySelector("#sch-check"); if (btnCheck) btnCheck.addEventListener("click", checkNorms);
    const setFlag = async (kind) => {
      const dayEl = box.querySelector("#sch-flag-day");
      const day = dayEl ? Number(dayEl.value) : 1;
      if (!day) return;
      await A.flagSet(month, day, kind);
      await loadFlags();
      render();
      setMsg(kind ? `РћС‚РјРµС‚РєР° РґР»СЏ ${day}-РіРѕ: ${kind === "short" ? "СѓРєРѕСЂРѕС‡РµРЅРЅС‹Р№ РґРµРЅСЊ" : "СЃРјРµРЅ РЅРµС‚"}` : `РћС‚РјРµС‚РєР° РґР»СЏ ${day}-РіРѕ СЃРЅСЏС‚Р°`);
    };
    [["sch-flag-short", "short"], ["sch-flag-hol", "holiday"], ["sch-flag-clear", ""]].forEach(([id, kind]) => {
      const b = box.querySelector("#" + id);
      if (b) b.addEventListener("click", () => setFlag(kind));
    });
    const btnSave = box.querySelector("#sch-save"); if (btnSave) btnSave.addEventListener("click", async () => {
      const res = await A.scheduleSave(month, cell, "draft", "С‡РµСЂРЅРѕРІРёРє РёР· Р°РґРјРёРЅРєРё");
      setMsg(res && res.ok ? `РЎРѕС…СЂР°РЅРµРЅРѕ (РІРµСЂСЃРёСЏ ${res.version})` : "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ (РЅСѓР¶РµРЅ Р°РґРјРёРЅ-РІС…РѕРґ)");
    });
    const btnPub = box.querySelector("#sch-publish"); if (btnPub) btnPub.addEventListener("click", async () => {
      const res = await A.scheduleSave(month, cell, "published", "РїСѓР±Р»РёРєР°С†РёСЏ РіСЂР°С„РёРєР°");
      if (!res || !res.ok) { setMsg("РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСѓР±Р»РёРєРѕРІР°С‚СЊ"); return; }
      /* Р·Р°РґР°С‡Р° Р°РіРµРЅС‚Сѓ: РїРµСЂРµРЅРµСЃС‚Рё РѕРїСѓР±Р»РёРєРѕРІР°РЅРЅС‹Р№ РјРµСЃСЏС† РІ data.js Рё РЅР° СЃР°Р№С‚ */
      try {
        const c = D.hrRules && D.hrRules.cloud;
        if (c && c.url && c.key) {
          await fetch(`${c.url.replace(/\/$/, "")}/rest/v1/otp_tasks`, {
            method: "POST",
            headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify([{
              id: "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
              kind: "publish_schedule", payload: { month },
              requested_by: window.OTP_ACTOR || "Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ",
            }]),
          });
          setMsg("РћРїСѓР±Р»РёРєРѕРІР°РЅРѕ РІ Р±Р°Р·Рµ. Р“СЂР°С„РёРє РїРѕСЏРІРёС‚СЃСЏ РЅР° СЃР°Р№С‚Рµ РІ С‚РµС‡РµРЅРёРµ 5 РјРёРЅСѓС‚ (Р°РіРµРЅС‚).");
        } else {
          setMsg("РћРїСѓР±Р»РёРєРѕРІР°РЅРѕ РІ Р±Р°Р·Рµ; Р°РІС‚РѕРїРµСЂРµРЅРѕСЃ РЅР° СЃР°Р№С‚ РЅРµРґРѕСЃС‚СѓРїРµРЅ (РЅРµС‚ РєРѕРЅС„РёРіСѓСЂР°С†РёРё РѕР±Р»Р°РєР°).");
        }
      } catch (e) {
        setMsg("РћРїСѓР±Р»РёРєРѕРІР°РЅРѕ РІ Р±Р°Р·Рµ, РЅРѕ Р·Р°РґР°С‡Р° РЅР° СЃР°Р№С‚ РЅРµ РѕС‚РїСЂР°РІР»РµРЅР°.");
      }
    });
    const btnCsv = box.querySelector("#sch-csv"); if (btnCsv) btnCsv.addEventListener("click", () => {
      const days = schMonthDays(month);
      const lines = [["Р¤РРћ", ...days.map((x) => String(x.d)), "СЃРјРµРЅ"].join(";")];
      for (const e of emps) {
        const row = [fio(e.slug), ...days.map((x) => get(e.slug, x.d) || "")];
        const shifts = days.filter((x) => ["1", "2", "3", "I", "II", "2Р ", "3Р "].includes(get(e.slug, x.d))).length;
        row.push(String(shifts));
        lines.push(row.map((v) => String(v).replace(/;/g, ",")).join(";"));
      }
      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "grafik-" + month + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMsg("CSV РІС‹РіСЂСѓР¶РµРЅ: grafik-" + month + ".csv");
    });
    const enqueue = async (kind, note) => {
      try {
        const c = D.hrRules && D.hrRules.cloud;
        if (!c || !c.url || !c.key) { setMsg("РќРµС‚ РєРѕРЅС„РёРіСѓСЂР°С†РёРё РѕР±Р»Р°РєР° вЂ” Р·Р°РґР°С‡Р° РЅРµ РѕС‚РїСЂР°РІР»РµРЅР°."); return; }
        await fetch(`${c.url.replace(/\/$/, "")}/rest/v1/otp_tasks`, {
          method: "POST",
          headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify([{
            id: "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            kind, payload: { month }, requested_by: window.OTP_ACTOR || "Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ",
          }]),
        });
        setMsg(note);
      } catch (e) {
        setMsg("Р—Р°РґР°С‡Р° РЅРµ РѕС‚РїСЂР°РІР»РµРЅР° вЂ” РїСЂРѕРІРµСЂСЊС‚Рµ СЃРІСЏР·СЊ.");
      }
    };
    const btnXlsx = box.querySelector("#sch-xlsx");
    if (btnXlsx) btnXlsx.addEventListener("click", () => enqueue("export_schedule_xlsx",
      "XLSX РіРѕС‚РѕРІРёС‚СЃСЏ вЂ” С„Р°Р№Р» РїРѕСЏРІРёС‚СЃСЏ РІ downloads РЅР° СЃР°Р№С‚Рµ РІ С‚РµС‡РµРЅРёРµ 5 РјРёРЅСѓС‚."));
    const btnConf = box.querySelector("#sch-conf");
    if (btnConf) btnConf.addEventListener("click", () => enqueue("publish_confluence_schedule",
      "РЎС‚СЂР°РЅРёС†Р° РІ Confluence СЃРѕР·РґР°С‘С‚СЃСЏ РІ С‚РµС‡РµРЅРёРµ 5 РјРёРЅСѓС‚ (РЅСѓР¶РЅС‹ РїСЂР°РІР° РЅР° Р·Р°РїРёСЃСЊ)."));
    render();
    loadAnswers();
  }

  /* ---------------- В«Р“СЂР°С„РёРє РЅР° РјРµСЃСЏС†В»: РѕРїСЂРѕСЃ, РѕС‚РІРµС‚С‹, СЂРµРґР°РєС‚РѕСЂ ---------------- */
  async function initSchedulePage() {
    const host = document.getElementById("schedule-app");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";
    const D = window.OTP_DATA || {};
    const A = window.OTP_AUTH;
    if (!A || !A.token("admin")) {
      host.innerHTML = `<div class="staff-add"><h4>РќСѓР¶РµРЅ РІС…РѕРґ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ</h4>
        <p class="staff-hint">Р Р°Р·РґРµР» РґРѕСЃС‚СѓРїРµРЅ РїРѕСЃР»Рµ РІС…РѕРґР° РІ Р°РґРјРёРЅРєСѓ вЂ” РѕС‚РєСЂРѕР№С‚Рµ В«РђРґРјРёРЅРєСѓВ» Рё РІРѕР№РґРёС‚Рµ.</p></div>`;
      return;
    }
    const staff = await A.staffList().catch(() => []);
    const bySlug = new Map((staff || []).map((s) => [s.slug, s]));
    const emps = ((D.employees || []).filter((e) => e.status !== "left"))
      .map((e) => ({ slug: e.id, fio: (bySlug.get(e.id) || {}).fio || e.fullName }))
      .filter((e) => e.slug !== "admin");

    const nextMonth = (() => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    })();

    host.insertAdjacentHTML("beforeend", `<div class="staff-add" id="sched-poll">
      <h4><i class="ph-bold ph-calendar-check"></i> РћРїСЂРѕСЃ РїРѕ РіСЂР°С„РёРєСѓ</h4>
      <div class="staff-add-grid">
        <label>РњРµСЃСЏС†<input id="sp-month" type="month" value="${nextMonth}"></label>
        <label>РЎРґР°С‚СЊ РґРѕ<input id="sp-due" type="datetime-local"></label>
      </div>
      <div class="staff-add-foot">
        <button class="btn btn-primary" id="sp-create" type="button">РћС‚РєСЂС‹С‚СЊ РѕРїСЂРѕСЃ</button>
        <button class="btn btn-ghost" id="sp-close" type="button">Р—Р°РєСЂС‹С‚СЊ РѕРїСЂРѕСЃ</button>
        <span class="staff-hint" id="sp-msg"></span>
      </div>
      <div id="sp-answers"></div>
    </div>`);

    const msg = $("#sp-msg");
    const month = () => (($("#sp-month") || {}).value || nextMonth);

    /* С‚Р°Р±Р»РёС†Р° РїРѕР¶РµР»Р°РЅРёР№: С‚Рѕ, С‡С‚Рѕ РЅСѓР¶РЅРѕ РІРёРґРµС‚СЊ РїСЂРё СЃРѕСЃС‚Р°РІР»РµРЅРёРё РіСЂР°С„РёРєР° */
    const renderAnswers = async () => {
      const hostA = document.getElementById("sp-answers");
      if (!hostA) return;
      const m = month();
      hostA.innerHTML = `<p class="staff-hint">Р—Р°РіСЂСѓР¶Р°СЋ РїРѕР¶РµР»Р°РЅРёСЏ РЅР° ${m}вЂ¦</p>`;
      const res = await A.pollSummary("p-" + m);
      if (!res || !res.ok) {
        hostA.innerHTML = `<p class="staff-hint">РџРѕР¶РµР»Р°РЅРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅС‹.</p>`;
        return;
      }
      const list = res.list || [];
      const missing = res.missing || [];
      const fmtDates = (arr) => (Array.isArray(arr) && arr.length ? arr.join(", ") : "вЂ”");
      const rows = list.map((r) => {
        const a = r.answers || {};
        const weekend = a.weekend_none ? "Р±РµР· РІС‹С…РѕРґРЅС‹С… СЃРјРµРЅ" : fmtDates(a.weekend_dates) + (a.weekend_time ? ` (${a.weekend_time})` : "");
        const off = (Array.isArray(a.off_dates) && a.off_dates.length) ? a.off_dates.join(", ") : "вЂ”";
        const third = a.third_none ? "Р±РµР· 3-Р№" : ((Array.isArray(a.third_weeks) && a.third_weeks.length) ? "РЅРµРґРµР»Рё СЃ " + a.third_weeks.join(", ") : "вЂ”");
        const tania = a.tania === true ? "РґР°" : a.tania === false ? "РЅРµС‚" : "вЂ”";
        return `<tr><td>${escNow(r.fio)}</td><td>${escNow(weekend)}</td><td>${escNow(off)}</td><td>${escNow(third)}</td><td>${escNow(tania)}</td><td>${escNow(String(a.comment || "").slice(0, 80))}</td></tr>`;
      }).join("");
      hostA.innerHTML = `<p class="staff-hint">РћС‚РІРµС‚РёР»Рё: <b>${list.length}</b> В· РЅРµ РѕС‚РІРµС‚РёР»Рё: <b>${missing.length}</b>${missing.length ? " вЂ” " + missing.map(escNow).join(", ") : ""}</p>
        <div class="sch-wrap"><table class="sch-table poll-answers"><thead><tr>
          <th class="sch-name">Р¤РРћ</th><th>Р’С‹С…РѕРґРЅС‹Рµ СЃРјРµРЅС‹</th><th>РћР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РІС‹С…РѕРґРЅС‹Рµ</th><th>3-СЏ СЃРјРµРЅР°</th><th>РўР°РЅРёСЏ</th><th>РљРѕРјРјРµРЅС‚Р°СЂРёР№</th>
        </tr></thead><tbody>${rows || `<tr><td colspan="6">РџРѕРєР° РЅРёРєС‚Рѕ РЅРµ РѕС‚РІРµС‚РёР»</td></tr>`}</tbody></table></div>`;
    };

    const createBtn = $("#sp-create");
    if (createBtn) createBtn.addEventListener("click", async () => {
      const due = ($("#sp-due") || {}).value;
      const res = await A.pollCreate(month(), due ? new Date(due).toISOString() : null, {});
      if (msg) msg.textContent = res && res.ok ? "РћРїСЂРѕСЃ РѕС‚РєСЂС‹С‚: " + month() : "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РѕРїСЂРѕСЃ";
      renderAnswers();
    });
    const closeBtn = $("#sp-close");
    if (closeBtn) closeBtn.addEventListener("click", async () => {
      const res = await A.pollSetStatus("p-" + month(), "closed");
      if (msg) msg.textContent = res && res.ok ? "РћРїСЂРѕСЃ Р·Р°РєСЂС‹С‚" : "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РєСЂС‹С‚СЊ";
      renderAnswers();
    });
    const mEl = $("#sp-month");
    if (mEl) mEl.addEventListener("change", renderAnswers);

    initScheduleEditor(emps, host);
    renderAnswers();
  }

  async function initStaffPage() {
    const app = $("#staff-app");
    if (!app || !window.OTP_AUTH) return;
    const A = window.OTP_AUTH;
    const escNow = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

    const loginForm = () => {
      app.innerHTML = `<div class="staff-login">
        <h3><i class="ph-bold ph-lock-key"></i> Р’С…РѕРґ РґР»СЏ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ</h3>
        <p>Р’РІРµРґРёС‚Рµ РїР°СЂРѕР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°, С‡С‚РѕР±С‹ СѓРїСЂР°РІР»СЏС‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°РјРё.</p>
        <input id="staff-pass" type="password" placeholder="РїР°СЂРѕР»СЊ" autocomplete="current-password">
        <div class="staff-actions">
          <button class="btn btn-primary" id="staff-do-login">Р’РѕР№С‚Рё</button>
          <span class="staff-err" id="staff-err"></span>
        </div>
      </div>`;
      const go = async () => {
        const pass = ($("#staff-pass") || {}).value || "";
        const err = $("#staff-err");
        const res = await A.login("admin", pass);
        if (res && res.ok) initStaffPage();
        else if (err) err.textContent = res && res.error === "bad_password" ? "РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ" : "РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕР№С‚Рё";
      };
      $("#staff-do-login").addEventListener("click", go);
      $("#staff-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    };

    const sess = await A.session("admin");
    if (!sess || !sess.admin) { loginForm(); return; }

    const staff = await A.staffList();
    const bySlug = new Map((staff || []).map((s) => [s.slug, s]));
    /* v19: С„Р»Р°Рі В«СЃС‚Р°СЂС‚ С‚РѕР»СЊРєРѕ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏВ» Рё РєРѕРґ СЃС‚СЂР°РЅРёС†С‹ вЂ” РёР· otp_staff */
    const onlyAppOf = (s) => !!(s && (s.only_app || s.onlyApp));
    const rows = D.employees.filter((e) => e.status !== "left").map((e) => {
      const s = bySlug.get(e.id) || {};
      return {
        slug: e.id, hash: e.slug, fio: s.fio || e.fullName, login: s.login || "", pass: s.pass || "",
        avatar: s.avatar || "", active: s.active !== false,
        hasPass: !!s.has_pass, onlyApp: onlyAppOf(s),
      };
    });
    // СЃРѕС‚СЂСѓРґРЅРёРєРё, РєРѕС‚РѕСЂС‹С… РЅРµС‚ РІ data.js (РґРѕР±Р°РІР»РµРЅС‹ РІСЂСѓС‡РЅСѓСЋ РІ Р°РґРјРёРЅРєРµ) вЂ” С‚РѕР¶Рµ РїРѕРєР°Р·С‹РІР°РµРј
    for (const s of (staff || [])) {
      if (!s || !s.slug || s.slug === "admin") continue;
      if (rows.some((r) => r.slug === s.slug)) continue;
      rows.push({
        slug: s.slug, hash: s.slug, fio: s.fio || s.slug, login: s.login || "", pass: "",
        avatar: s.avatar || "", active: s.active !== false, hasPass: !!s.has_pass,
        onlyApp: onlyAppOf(s), manual: true,
      });
    }
    // Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ вЂ” РїРµСЂРІС‹Рј
    const admin = bySlug.get("admin");
    if (admin) rows.unshift({ slug: "admin", fio: admin.fio || "Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ", login: admin.login || "", pass: admin.pass || "", avatar: admin.avatar || "", active: admin.active !== false, hasPass: !!admin.has_pass });

    app.innerHTML = `<div class="staff-head">
        <h3><i class="ph-bold ph-identification-card"></i> РЎРѕС‚СЂСѓРґРЅРёРєРё Рё РґРѕСЃС‚СѓРїС‹</h3>
        <button class="btn btn-ghost" id="staff-out">Р’С‹Р№С‚Рё</button>
      </div>
      <div class="staff-add">
        <h4><i class="ph-bold ph-user-plus"></i> Р”РѕР±Р°РІРёС‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°</h4>
        <div class="staff-add-grid">
          <label>Р¤РРћ<input id="sa-fio" placeholder="РРІР°РЅРѕРІ РРІР°РЅ РРІР°РЅРѕРІРёС‡"></label>
          <label>РљРѕРґ СЃС‚СЂР°РЅРёС†С‹<input id="sa-slug" placeholder="РїСѓСЃС‚Рѕ вЂ” СЃРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ"></label>
          <label>Р›РѕРіРёРЅ<input id="sa-login" placeholder="РёРјСЏ@ftech.io"></label>
          <label>РџР°СЂРѕР»СЊ<input id="sa-pass" type="password" placeholder="РЅРµ РєРѕСЂРѕС‡Рµ 6 СЃРёРјРІРѕР»РѕРІ"></label>
          <label>РђРІР°С‚Р°СЂ (СЃСЃС‹Р»РєР°)<input id="sa-avatar" placeholder="https://..."></label>
        </div>
        <div class="staff-add-foot">
          <button class="btn btn-primary" id="sa-add" type="button"><i class="ph-bold ph-plus" aria-hidden="true"></i> Р”РѕР±Р°РІРёС‚СЊ</button>
          <label class="staff-add-check"><input type="checkbox" id="sa-pages" checked> СЃРѕР·РґР°С‚СЊ СЃС‚СЂР°РЅРёС†С‹ СЃСЂР°Р·Сѓ</label>
          <span class="staff-hint" id="sa-msg"></span>
        </div>
      </div>
      <div class="staff-add">
        <h4><i class="ph-bold ph-chart-line"></i> KPI Рё Р±РѕРЅСѓСЃС‹ Р·Р° РјРµСЃСЏС†</h4>
        <div class="staff-add-grid">
          <label>РЎРѕС‚СЂСѓРґРЅРёРє<select id="kpi-emp">${rows.filter((r) => r.slug !== "admin")
            .map((r) => `<option value="${escNow(r.slug)}">${escNow(r.fio)}</option>`).join("")}</select></label>
          <label>РњРµСЃСЏС†<select id="kpi-month">${(D.employees.find((e) => e.history && e.history.length) || { history: [] })
            .history.map((h) => `<option value="${escNow(h.key)}">${escNow(h.month || h.key)}</option>`).join("")}</select></label>
          <label>РљР°С‡РµСЃС‚РІРѕ<input id="kpi-quality" type="number" min="0" max="10" step="1"></label>
          <label>РћР±СѓС‡Р°РµРјРѕСЃС‚СЊ<input id="kpi-learnability" type="number" min="0" max="10" step="1"></label>
          <label>РРЅРёС†РёР°С‚РёРІР°<input id="kpi-initiative" type="number" min="0" max="10" step="1"></label>
          <label>Р’РѕРІР»РµС‡С‘РЅРЅРѕСЃС‚СЊ<input id="kpi-engagement" type="number" min="0" max="10" step="1"></label>
          <label>Р”РёСЃС†РёРїР»РёРЅР°<input id="kpi-discipline" type="number" min="0" max="10" step="1"></label>
          <label>Р‘РѕРЅСѓСЃ, в‚Ѕ<input id="kpi-bonus" type="number" min="0" step="100"></label>
          <label>РљРѕРјРјРµРЅС‚Р°СЂРёР№<input id="kpi-note" placeholder="РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ"></label>
        </div>
        <div class="staff-add-foot">
          <button class="btn btn-primary" id="kpi-save" type="button"><i class="ph-bold ph-check" aria-hidden="true"></i> РЎРѕС…СЂР°РЅРёС‚СЊ Рё РїСЂРёРјРµРЅРёС‚СЊ</button>
          <span class="staff-hint" id="kpi-msg"></span>
        </div>
      </div>
      <p class="staff-hint">РћРїСЂРѕСЃ РїРѕ РіСЂР°С„РёРєСѓ, РїРѕР¶РµР»Р°РЅРёСЏ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ Рё СЃР±РѕСЂРєР° РјРµСЃСЏС†Р° вЂ” РІ СЂР°Р·РґРµР»Рµ <a href="../schedule/index.html">В«Р“СЂР°С„РёРє РЅР° РјРµСЃСЏС†В»</a>.</p>
      <p class="staff-hint">РџР°СЂРѕР»СЊ: РµСЃР»Рё РѕСЃС‚Р°РІРёС‚СЊ РїСѓСЃС‚С‹Рј вЂ” РЅРµ РјРµРЅСЏРµС‚СЃСЏ. Р›РѕРіРёРЅ вЂ” РґР»СЏ Р»РёС‡РЅС‹С… СЃРѕРѕР±С‰РµРЅРёР№ РІ РњРµСЃСЃРµРЅРґР¶РµСЂРµ (РЅР°РїСЂРёРјРµСЂ, a.bolgov@ftech.io).</p>
      <div class="staff-list">
        ${rows.map((r) => `<div class="staff-row" data-slug="${escNow(r.slug)}">
          <div class="staff-cell"><label>Р¤РРћ</label><input data-f="fio" value="${escNow(r.fio)}"></div>
          <div class="staff-cell"><label>Р›РѕРіРёРЅ</label><input data-f="login" value="${escNow(r.login)}" placeholder="РёРјСЏ@ftech.io"></div>
          <div class="staff-cell"><label>РџР°СЂРѕР»СЊ ${r.hasPass ? "(Р·Р°РґР°РЅ)" : "(РЅРµС‚)"}</label><div class="pass-wrap"><input data-f="pass" type="password" value="${escNow(r.pass || "")}" placeholder="РЅРѕРІС‹Р№ РїР°СЂРѕР»СЊ"><button type="button" data-eye title="РџРѕРєР°Р·Р°С‚СЊ РїР°СЂРѕР»СЊ"><i class="ph-bold ph-eye"></i></button></div></div>
          <div class="staff-cell"><label>РђРІР°С‚Р°СЂ</label><input data-f="avatar" value="${escNow(r.avatar)}" placeholder="https://..."><div class="staff-up"><button data-file>Р—Р°РіСЂСѓР·РёС‚СЊ С„РѕС‚Рѕ</button><input type="file" data-file-inp accept="image/*" hidden></div></div>
          <div class="staff-cell staff-check"><label><input data-f="active" type="checkbox" ${r.active ? "checked" : ""}> Р°РєС‚РёРІРµРЅ</label></div>
          <div class="staff-cell staff-check"><label title="РЎРјРµРЅСѓ РјРѕР¶РЅРѕ РЅР°С‡Р°С‚СЊ С‚РѕР»СЊРєРѕ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ-С‚СЂРµСЏ"><input data-f="onlyapp" type="checkbox" ${r.onlyApp ? "checked" : ""}> С‚РѕР»СЊРєРѕ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ</label></div>
          <div class="staff-cell staff-save"><button class="btn btn-primary" data-save>РЎРѕС…СЂР°РЅРёС‚СЊ</button><button type="button" class="btn btn-ghost" data-access>РўРµРєСЃС‚ РґРѕСЃС‚СѓРїР°</button><span class="staff-ok" hidden>СЃРѕС…СЂР°РЅРµРЅРѕ</span></div>
        </div>`).join("")}
      </div>
      <div class="staff-devices" id="staff-devices"></div>`;
    /* P3: РјРµС‚СЂРёРєРё вЂ” РЅРµСѓРґР°С‡РЅС‹Рµ РїРѕРїС‹С‚РєРё РІС…РѕРґР° Р·Р° РїРѕСЃР»РµРґРЅРёРµ 15 РјРёРЅСѓС‚ (СЃРєСЂРёРїС‚
       scripts/supabase_v6_realtime.sql). РџРѕРєР°Р·С‹РІР°РµРј С‚РёС…Рѕ, РЅРµ РјРµС€Р°СЏ СЂР°Р±РѕС‚Рµ. */
    /* v19: РїРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ В«С‚РѕР»СЊРєРѕ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏВ» + СЃРїРёСЃРѕРє РїСЂРёРІСЏР·Р°РЅРЅС‹С… СѓСЃС‚СЂРѕР№СЃС‚РІ */
    app.querySelectorAll('[data-f="onlyapp"]').forEach((box) => box.addEventListener("change", async () => {
      const row = box.closest(".staff-row");
      const slug = row && row.getAttribute("data-slug");
      const res = await A.setOnlyApp(slug, box.checked);
      if (res && res.ok) toast(box.checked ? "РЎС‚Р°СЂС‚ СЃРјРµРЅС‹ вЂ” С‚РѕР»СЊРєРѕ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ" : "РЎС‚Р°СЂС‚ СЃРјРµРЅС‹ СЂР°Р·СЂРµС€С‘РЅ Рё РІ Р±СЂР°СѓР·РµСЂРµ");
      else { box.checked = !box.checked; toast("РќРµ СѓРґР°Р»РѕСЃСЊ РїРµСЂРµРєР»СЋС‡РёС‚СЊ (РЅСѓР¶РµРЅ Р°РґРјРёРЅ-РІС…РѕРґ)"); }
    }));
    A.devicesList().then((list) => {
      const host = document.getElementById("staff-devices");
      if (!host) return;
      const bulk = `<div class="staff-dev-actions">
        <button class="btn btn-ghost" type="button" data-onlyapp-all="1">РџСЂР°РІРёР»Рѕ РґР»СЏ РІСЃРµС…</button>
        <button class="btn btn-ghost" type="button" data-onlyapp-all="0">Р Р°Р·СЂРµС€РёС‚СЊ Р±СЂР°СѓР·РµСЂ РІСЃРµРј</button>
      </div>`;
      if (!Array.isArray(list) || !list.length) {
        host.innerHTML = `<h4><i class="ph-bold ph-device-mobile"></i> РЈСЃС‚СЂРѕР№СЃС‚РІР°</h4>
          <p class="staff-hint">РџРѕРєР° РЅРё РѕРґРЅРѕ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РїСЂРёРІСЏР·Р°РЅРѕ: СЃРѕС‚СЂСѓРґРЅРёРє РґРѕР»Р¶РµРЅ РѕРґРёРЅ СЂР°Р· РІРѕР№С‚Рё РІ РїСЂРёР»РѕР¶РµРЅРёРµ.</p>${bulk}`;
      } else {
        host.innerHTML = `<h4><i class="ph-bold ph-device-mobile"></i> РЈСЃС‚СЂРѕР№СЃС‚РІР° (${list.length})</h4>
          <div class="staff-dev-list">${list.map((d) => `<div class="staff-dev-row">
            <b>${escNow(d.fio || d.slug)}</b>
            <span>${escNow(d.label || "СѓСЃС‚СЂРѕР№СЃС‚РІРѕ")}</span>
            <span class="staff-hint">${d.last_seen ? "Р±С‹Р» РѕРЅР»Р°Р№РЅ " + new Date(d.last_seen).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "РЅРµ РІС‹С…РѕРґРёР» РЅР° СЃРІСЏР·СЊ"}</span>
            <button class="btn btn-ghost" type="button" data-revoke="${escNow(d.slug)}|${escNow(d.device || "")}">РћС‚РІСЏР·Р°С‚СЊ</button>
          </div>`).join("")}</div>${bulk}`;
      }
      host.querySelectorAll("[data-onlyapp-all]").forEach((btn) => btn.addEventListener("click", async () => {
        const on = btn.getAttribute("data-onlyapp-all") === "1";
        const res = await A.setOnlyAppAll(on);
        if (res && res.ok) toast(on ? `РџСЂР°РІРёР»Рѕ РІРєР»СЋС‡РµРЅРѕ: ${res.updated || 0} СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ` : "Р‘СЂР°СѓР·РµСЂ СЂР°Р·СЂРµС€С‘РЅ РІСЃРµРј");
        else toast("РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРёРјРµРЅРёС‚СЊ (РЅСѓР¶РµРЅ Р°РґРјРёРЅ-РІС…РѕРґ)");
        initStaffPage();
      }));
      host.querySelectorAll("[data-revoke]").forEach((btn) => btn.addEventListener("click", async () => {
        const [slug, device] = btn.getAttribute("data-revoke").split("|");
        if (!device) { toast("РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РЅР°Р№РґРµРЅРѕ вЂ” РѕР±РЅРѕРІРёС‚Рµ СЃРїРёСЃРѕРє"); return; }
        const res = await A.revokeDevice(slug, device);
        if (res && res.ok) { toast("РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РѕС‚РІСЏР·Р°РЅРѕ"); initStaffPage(); }
        else toast("РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РІСЏР·Р°С‚СЊ");
      }));
    }).catch(() => {});
    A.loginFails().then((list) => {
      if (!Array.isArray(list) || !list.length) return;
      const total = list.reduce((s, x) => s + (+x.fails || 0), 0);
      const head = app.querySelector(".staff-head");
      if (head && !document.getElementById("staff-fails")) {
        head.insertAdjacentHTML("afterend", `<p class="staff-hint" id="staff-fails">рџ”’ РќРµСѓРґР°С‡РЅС‹Рµ РІС…РѕРґС‹ (Р·Р° 15 РјРёРЅ): <b>${total}</b> вЂ” ${list.map((x) => escNow(x.slug) + " Г—" + (+x.fails || 0)).join(", ")}</p>`);
      }
    }).catch(() => {});
    app.insertAdjacentHTML("beforeend", `<div class="sc-wrap">
      <h3><i class="ph-bold ph-medal"></i> Р”РѕСЃС‚РёР¶РµРЅРёСЏ, Р±РѕРЅСѓСЃС‹ Рё Р·РѕРЅС‹ СЂРѕСЃС‚Р°</h3>
      <p class="staff-hint">Р—Р°РїРёСЃРё РїРѕСЏРІР»СЏСЋС‚СЃСЏ РЅР° Р»РёС‡РЅРѕР№ СЃС‚СЂР°РЅРёС†Рµ СЃРѕС‚СЂСѓРґРЅРёРєР° РІ СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‰РµРј СЂР°Р·РґРµР»Рµ.</p>
      <div class="sc-form">
        <select id="sc-emp">${rows.map((r) => `<option value="${escNow(r.slug)}">${escNow(r.fio)}</option>`).join("")}</select>
        <select id="sc-section">
          <option value="bonus">Р‘РѕРЅСѓСЃС‹</option>
          <option value="awards">РќР°РіСЂР°РґС‹</option>
          <option value="growth">Р—РѕРЅС‹ СЂРѕСЃС‚Р°</option>
          <option value="lvl">Р”РѕСЃС‚РёР¶РµРЅРёСЏ</option>
          <option value="stats">РЎС‚Р°С‚РёСЃС‚РёРєР°</option>
        </select>
        <input id="sc-title" placeholder="Р—Р°РіРѕР»РѕРІРѕРє">
        <input id="sc-value" placeholder="РЎСѓРјРјР°/РїРѕРґРїРёСЃСЊ (5 000 в‚Ѕ)">
        <input id="sc-date" type="date">
        <textarea id="sc-body" placeholder="РћРїРёСЃР°РЅРёРµ" rows="2"></textarea>
        <button class="btn btn-primary" id="sc-add">Р”РѕР±Р°РІРёС‚СЊ</button>
      </div>
      <div class="sc-list" id="sc-list"></div>
    </div>`);    $("#staff-out").addEventListener("click", () => { A.logout("admin"); initStaffPage(); });

    /* Р”РѕР±Р°РІР»РµРЅРёРµ СЃРѕС‚СЂСѓРґРЅРёРєР°: СЃРѕР·РґР°С‘С‚/РѕР±РЅРѕРІР»СЏРµС‚ Р·Р°РїРёСЃСЊ otp_staff (Р»РѕРіРёРЅ, РїР°СЂРѕР»СЊ).
       Р•СЃР»Рё РєРѕРґ СЃС‚СЂР°РЅРёС†С‹ РЅРѕРІС‹Р№ вЂ” СЃС‚СЂР°РЅРёС†Р° РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ РґРѕР±Р°РІР»РµРЅРёСЏ РІ РґР°РЅРЅС‹Рµ СЃР°Р№С‚Р°. */
    const saAdd = $("#sa-add");
    if (saAdd) saAdd.addEventListener("click", async () => {
      const fio = ($("#sa-fio") || {}).value.trim();
      const pass = ($("#sa-pass") || {}).value;
      let slug = ($("#sa-slug") || {}).value.trim();
      const login = ($("#sa-login") || {}).value.trim();
      const avatar = ($("#sa-avatar") || {}).value.trim();
      const msg = $("#sa-msg");
      if (!msg) return;
      if (fio.length < 3) { msg.textContent = "РЈРєР°Р¶Рё Р¤РРћ."; return; }
      if (pass.length < 6) { msg.textContent = "РџР°СЂРѕР»СЊ РЅРµ РєРѕСЂРѕС‡Рµ 6 СЃРёРјРІРѕР»РѕРІ."; return; }
      if (!slug) {
        const buf = new Uint8Array(6);
        crypto.getRandomValues(buf);
        slug = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
      }
      saAdd.disabled = true;
      const res = await A.saveStaff({ slug, fio, login, pass, avatar, active: true }).catch(() => null);
      saAdd.disabled = false;
      if (!res || !res.ok) {
        msg.textContent = "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ: " + ((res && res.error) || "РѕС€РёР±РєР° СЃРІСЏР·Рё");
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
              requested_by: window.OTP_ACTOR || "Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ",
            }]),
          }).catch(() => {});
          queued = true;
        }
      }
      __staffMsg = known
        ? `РЎРѕС…СЂР°РЅРµРЅРѕ: ${fio}.`
        : `РЎРѕС…СЂР°РЅРµРЅРѕ: ${fio}. ` + (queued
          ? "РЎС‚СЂР°РЅРёС†Р° СЃРѕР·РґР°С‘С‚СЃСЏ вЂ” РїРѕСЏРІРёС‚СЃСЏ РІ С‚РµС‡РµРЅРёРµ 5 РјРёРЅСѓС‚."
          : `РЎС‚СЂР°РЅРёС†Р° РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ РґРѕР±Р°РІР»РµРЅРёСЏ РІ РґР°РЅРЅС‹Рµ СЃР°Р№С‚Р°: ${location.origin}${SITE_ROOT}team/${slug}/start/`);
      initStaffPage();
    });
    /* KPI Р·Р° РјРµСЃСЏС†: СЃРѕС…СЂР°РЅСЏРµРј РІ otp_kpi Рё СЃС‚Р°РІРёРј Р·Р°РґР°С‡Сѓ Р°РіРµРЅС‚Сѓ (РѕРЅ РїСЂРёРјРµРЅРёС‚ Рє data.js) */
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
        updated_by: window.OTP_ACTOR || "Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ",
      };
      const c = D.hrRules && D.hrRules.cloud;
      if (!c || !c.url || !c.key) { msg.textContent = "РќРµС‚ РєРѕРЅС„РёРіСѓСЂР°С†РёРё РѕР±Р»Р°РєР°."; return; }
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
        msg.textContent = "РЎРѕС…СЂР°РЅРµРЅРѕ. РџСЂРёРјРµРЅРёС‚СЃСЏ Рє СЃР°Р№С‚Сѓ РІ С‚РµС‡РµРЅРёРµ 5 РјРёРЅСѓС‚.";
      } catch (e) {
        msg.textContent = "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ: " + e.message;
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
        ? list.map((x) => `<div class="sc-item"><div><b>${escX(x.title || "Р‘РµР· РЅР°Р·РІР°РЅРёСЏ")}</b><span>${escX(x.section)}${x.on_date ? " В· " + escX(x.on_date) : ""}${x.value ? " В· " + escX(x.value) : ""}</span><p>${escX(x.body || "")}</p></div><button class="sc-del" data-del="${escX(x.id)}">РЈРґР°Р»РёС‚СЊ</button></div>`).join("")
        : `<div class="sc-empty">РџРѕРєР° РЅРµС‚ Р·Р°РїРёСЃРµР№</div>`;
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
      /* Р•СЃР»Рё РїР°СЂРѕР»СЊ РІРІРµРґС‘РЅ РїСЂСЏРјРѕ СЃРµР№С‡Р°СЃ вЂ” СЃРЅР°С‡Р°Р»Р° СЃРѕС…СЂР°РЅСЏРµРј РµРіРѕ, С‡С‚РѕР±С‹ РІ С‚РµРєСЃС‚Рµ
         РѕРєР°Р·Р°Р»СЃСЏ СЂР°Р±РѕС‡РёР№ РїР°СЂРѕР»СЊ. РќРµ СЃРѕС…СЂР°РЅРёР»СЃСЏ вЂ” РїР°СЂРѕР»СЊ РІ С‚РµРєСЃС‚ РЅРµ РїРѕРїР°РґС‘С‚. */
      if (typedPass) {
        if (typedPass.length < 6) { toast("РџР°СЂРѕР»СЊ РєРѕСЂРѕС‡Рµ 6 СЃРёРјРІРѕР»РѕРІ вЂ” СЃРµСЂРІРµСЂ РµРіРѕ РЅРµ РїСЂРёРјРµС‚"); return; }
        const saved = await A.saveStaff({
          slug,
          fio: (row.querySelector(`[data-f="fio"]`) || {}).value.trim() || info.fio,
          login: (row.querySelector(`[data-f="login"]`) || {}).value.trim(),
          pass: typedPass,
          avatar: (row.querySelector(`[data-f="avatar"]`) || {}).value.trim(),
          active: true,
        }).catch(() => null);
        if (!saved || !saved.ok) {
          toast("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РїР°СЂРѕР»СЊ: " + ((saved && saved.error) || "РѕС€РёР±РєР° СЃРІСЏР·Рё"));
          return;
        }
        const chk = await A.verifyPass(slug, typedPass);
        if (chk && chk.ok && chk.matches === false) {
          toast("РџР°СЂРѕР»СЊ РќР• Р·Р°РїРёСЃР°Р»СЃСЏ РІ Р±Р°Р·Сѓ вЂ” С‚РµРєСЃС‚ РґРѕСЃС‚СѓРїР° РЅРµ РєРѕРїРёСЂСѓСЋ");
          return;
        }
        __sessionPass.set(slug, typedPass);
        const fld = row.querySelector(`[data-f="pass"]`);
        if (fld) fld.value = "";
      }
      const pass = typedPass || __sessionPass.get(slug) || __sessionPass.get(info.fio) || info.pass || "";
      if (!pass) {
        toast("РЎРЅР°С‡Р°Р»Р° Р·Р°РґР°Р№С‚Рµ РїР°СЂРѕР»СЊ: РІРІРµРґРёС‚Рµ РµРіРѕ РІ РїРѕР»Рµ В«РџР°СЂРѕР»СЊВ» Рё РЅР°Р¶РјРёС‚Рµ В«РўРµРєСЃС‚ РґРѕСЃС‚СѓРїР°В»");
        return;
      }
      const fio = (row.querySelector(`[data-f="fio"]`) || {}).value || info.fio || "";
      const hash = info.hash || "";
      const link = hash ? "https://videoxiter.github.io/9a57a59df2fd/team/" + hash + "/start/index.html" : "";
      const text = "РџСЂРёРІРµС‚! Р­С‚Рѕ В«РњРѕРё СЂРµР·СѓР»СЊС‚Р°С‚С‹В» вЂ” Р»РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚ СЃРѕС‚СЂСѓРґРЅРёРєР° РѕС‚РґРµР»Р° С‚РµС…РЅРёС‡РµСЃРєРѕР№ РїРѕРґРґРµСЂР¶РєРё РћРўРџ.\n\n"
        + (fio ? fio + ", С‚РІРѕСЏ СЃС‚СЂР°РЅРёС†Р°:\n" : "РўРІРѕСЏ СЃС‚СЂР°РЅРёС†Р°:\n") + link + "\n"
        + "РџР°СЂРѕР»СЊ: " + pass + "\n\n"
        + "Р—Р°С‡РµРј СЌС‚Рѕ РЅСѓР¶РЅРѕ:\n"
        + "вЂў РІРёРґРµС‚СЊ СЃРІРѕРё СЂРµР·СѓР»СЊС‚Р°С‚С‹ Рё СЂР°СЃС‚Рё РѕСЃРѕР·РЅР°РЅРЅРѕ: KPI РїРѕ РјРµСЃСЏС†Р°Рј, РјРµСЃС‚Рѕ РІ СЂРµР№С‚РёРЅРіРµ, Р±РѕРЅСѓСЃС‹ Рё РґРѕС…РѕРґ;\n"
        + "вЂў РЅРµ РґРµСЂР¶Р°С‚СЊ РІ РіРѕР»РѕРІРµ С‡Р°СЃС‹: В«РЎС‚Р°СЂС‚РѕРІР°СЏВ» СЃС‡РёС‚Р°РµС‚ СЃРјРµРЅСѓ, РїРµСЂРµСЂС‹РІС‹ Рё РїСЂРѕРіСЂРµСЃСЃ РґРЅСЏ;\n"
        + "вЂў РїРѕРЅРёРјР°С‚СЊ, РєСѓРґР° РґРІРёРіР°С‚СЊСЃСЏ: Р·РѕРЅС‹ СЂРѕСЃС‚Р°, РЅР°РіСЂР°РґС‹, СѓСЂРѕРІРЅРё Рё СЂРµРєРѕРјРµРЅРґР°С†РёРё СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ;\n"
        + "вЂў РєРѕРјР°РЅРґРµ вЂ” РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ: РІРёРґРЅРѕ, РєС‚Рѕ РЅР° СЃРјРµРЅРµ, РєС‚Рѕ РІ РїРµСЂРµСЂС‹РІРµ, РєС‚Рѕ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚.\n\n"
        + "Р§С‚Рѕ РІРЅСѓС‚СЂРё:\n"
        + "вЂў В«РЎС‚Р°СЂС‚РѕРІР°СЏВ» вЂ” РЅР°С‡Р°Р»Рѕ Рё РєРѕРЅРµС† СЃРјРµРЅС‹, РїРµСЂРµСЂС‹РІС‹, РѕР±РµРґ, РѕС‚СЃСѓС‚СЃС‚РІРёРµ, С‚Р°Р№РјРµСЂ Рё РЅРѕСЂРјР° 7:30 РІ РґРµРЅСЊ\n"
        + "вЂў В«Р‘РѕРЅСѓСЃС‹В» Рё В«РљР°СЂС‚Р° РґРѕС…РѕРґРѕРІВ» вЂ” РёР· С‡РµРіРѕ СЃРєР»Р°РґС‹РІР°РµС‚СЃСЏ РїСЂРµРјРёСЏ Рё СЃРєРѕР»СЊРєРѕ РЅР°С‡РёСЃР»РµРЅРѕ Р·Р° РјРµСЃСЏС†\n"
        + "вЂў В«РњРѕР№ LVLВ», В«РќР°РіСЂР°РґС‹В», В«РњРѕР№ СЂРѕСЃС‚В» вЂ” РґРѕСЃС‚РёР¶РµРЅРёСЏ, СѓСЂРѕРІРЅРё Рё Р·РѕРЅС‹ СЂР°Р·РІРёС‚РёСЏ\n"
        + "вЂў В«РЎС‚Р°С‚РёСЃС‚РёРєР°В» Рё В«РњРѕР№ РіСЂР°С„РёРєВ» вЂ” РјРµС‚СЂРёРєРё Рё СЃРјРµРЅС‹ РЅР° РјРµСЃСЏС†\n"
        + "вЂў В«Р–СѓСЂРЅР°Р» С‡Р°СЃРѕРІВ» вЂ” СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅС‹Рµ, РїРµСЂРµСЂР°Р±РѕС‚РєРё Рё РєРѕСЂСЂРµРєС‚РёСЂРѕРІРєРё СЃ СЂРµС€РµРЅРёСЏРјРё СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ\n"
        + "вЂў В«РџСЂР°РІРёР»Р°В» вЂ” РєР°Рє РІСЃС‘ СЃС‡РёС‚Р°РµС‚СЃСЏ; В«РќР°СЃС‚СЂРѕР№РєРёВ» вЂ” С‚РµРјР°, С„РѕС‚Рѕ Рё РїР°СЂРѕР»СЊ\n\n"
        + "РљР°Рє РЅР°С‡Р°С‚СЊ: РѕС‚РєСЂРѕР№ СЃСЃС‹Р»РєСѓ РЅР° С‚РµР»РµС„РѕРЅРµ РёР»Рё РџРљ, РІРІРµРґРё РїР°СЂРѕР»СЊ (Р·Р°РїРѕРјРЅРёС‚СЃСЏ РЅР° 60 РґРЅРµР№), "
        + "РЅР° В«РЎС‚Р°СЂС‚РѕРІРѕР№В» РЅР°Р¶РјРё В«РќР°С‡Р°Р»Рѕ СЃРјРµРЅС‹В». РџРµСЂРµСЂС‹РІС‹ Рё Р·Р°РІРµСЂС€РµРЅРёРµ СЃРјРµРЅС‹ вЂ” РїРѕ РєРЅРѕРїРєР°Рј.";
      try { await navigator.clipboard.writeText(text); toast("РўРµРєСЃС‚ РґРѕСЃС‚СѓРїР° СЃРєРѕРїРёСЂРѕРІР°РЅ"); }
      catch (e) { window.prompt("РЎРєРѕРїРёСЂСѓР№С‚Рµ С‚РµРєСЃС‚:", text); }
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
          /* v14: СЃРІРµСЂСЏРµРј, С‡С‚Рѕ РїР°СЂРѕР»СЊ РґРµР№СЃС‚РІРёС‚РµР»СЊРЅРѕ Р·Р°РїРёСЃР°Р»СЃСЏ (crypt РїРѕ С…РµС€Сѓ) */
          const chk = await A.verifyPass(row.getAttribute("data-slug"), typed);
          if (chk && chk.ok && chk.matches === false) {
            toast("РџР°СЂРѕР»СЊ РќР• Р·Р°РїРёСЃР°Р»СЃСЏ РІ Р±Р°Р·Сѓ вЂ” РїРѕРІС‚РѕСЂРёС‚Рµ СЃРѕС…СЂР°РЅРµРЅРёРµ");
            return;
          }
          __sessionPass.set(row.getAttribute("data-slug"), typed);
          __sessionPass.set(String(get("fio").value.trim()), typed);
        }
        if (ok) { ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 2000); }
        toast(hadPass ? "РџР°СЂРѕР»СЊ СЃРѕС…СЂР°РЅС‘РЅ" : "Р”Р°РЅРЅС‹Рµ СЃРѕС…СЂР°РЅРµРЅС‹");
        if (hadPass) get("pass").value = "";
      }
    }));
  }

  /* Р°РІР°С‚Р°СЂ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ РІ С€Р°РїРєРµ (v4: С‚РѕР»СЊРєРѕ РµСЃР»Рё РµСЃС‚СЊ Р°РґРјРёРЅ-СЃРµСЃСЃРёСЏ,
     РёРЅР°С‡Рµ otp_staff_admin_list РІРµСЂРЅС‘С‚ forbidden вЂ” РїСЂРѕСЃС‚Рѕ Р±РµР· Р°РІР°С‚Р°СЂР°) */
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
