/* Облачная база заявок ОТП. Работает независимо от ПК руководителя.
 *
 * Провайдер задаётся в scripts/cloud.json → data.js → hrRules.cloud:
 *   {"provider": "offline"}                                  — только этот браузер
 *   {"provider": "http",     "url": "https://..."}            — свой REST (GET/POST /requests)
 *   {"provider": "firebase", "url": "https://xxx.firebaseio.com"}
 *   {"provider": "supabase", "url": "https://xxx.supabase.co", "key": "anon", "table": "otp_requests"}
 *
 * Заявки — плоский список объектов с полем id; при рассинхроне побеждает запись
 * с более новым decided/created. Локальная копия всегда остаётся в localStorage,
 * поэтому сайт продолжает работать без сети, а очередь досылается при следующем открытии.
 */
window.OTP_CLOUD = (function () {
  "use strict";
  const KEY = "otp_hr_requests_v1";
  const cfg = () =>
    (window.OTP_EMP && window.OTP_EMP.hrRules && window.OTP_EMP.hrRules.cloud) ||
    (window.OTP_DATA && window.OTP_DATA.hrRules && window.OTP_DATA.hrRules.cloud) ||
    { provider: "offline" };

  const loadLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } };
  const saveLocal = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };

  function merge(local, remote) {
    const by = {};
    for (const r of [...(remote || []), ...(local || [])]) {
      const prev = by[r.id];
      const stamp = (x) => x && (x.decided || x.created || "");
      if (!prev || stamp(r) >= stamp(prev)) by[r.id] = Object.assign({}, prev, r);
    }
    return Object.values(by);
  }

  async function fetchJSON(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }

  /* --- чтение --- */
  async function all() {
    const c = cfg();
    try {
      if (c.provider === "http" && c.url) {
        const j = await fetchJSON(c.url.replace(/\/$/, "") + "/requests", { cache: "no-store" });
        return Array.isArray(j.requests) ? j.requests : (Array.isArray(j) ? j : []);
      }
      if (c.provider === "firebase" && c.url) {
        const j = await fetchJSON(c.url.replace(/\/$/, "") + "/requests.json", { cache: "no-store" });
        return j ? Object.values(j) : [];
      }
      if (c.provider === "supabase" && c.url && c.key) {
        const t = c.table || "otp_requests";
        return await fetchJSON(`${c.url.replace(/\/$/, "")}/rest/v1/${t}?select=*`, {
          cache: "no-store", headers: { apikey: c.key, Authorization: "Bearer " + c.key },
        }) || [];
      }
    } catch (e) { return null; }
    return null;
  }

  /* --- запись (полный список) --- */
  async function put(list) {
    const c = cfg();
    try {
      if (c.provider === "http" && c.url) {
        await fetch(c.url.replace(/\/$/, "") + "/requests", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests: list }),
        });
        return true;
      }
      if (c.provider === "firebase" && c.url) {
        const obj = {};
        for (const r of list) obj[r.id] = r;
        await fetch(c.url.replace(/\/$/, "") + "/requests.json", {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj),
        });
        return true;
      }
      if (c.provider === "supabase" && c.url && c.key) {
        const t = c.table || "otp_requests";
        await fetch(`${c.url.replace(/\/$/, "")}/rest/v1/${t}`, {
          method: "POST",
          headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json",
                     Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(list),
        });
        return true;
      }
    } catch (e) { return false; }
    return false;
  }

  /* --- синхронизация: локальное + облачное, затем запись объединённого --- */
  async function sync() {
    const remote = await all();
    if (remote === null) return { online: false };
    const merged = merge(loadLocal(), remote);
    saveLocal(merged);
    await put(merged);
    return { online: true, list: merged };
  }

  /* --- точечная запись одной заявки (быстрее и безопаснее полной перезаписи) --- */
  async function upsert(rec) {
    const list = loadLocal().filter((x) => x.id !== rec.id);
    list.push(rec);
    saveLocal(list);
    const c = cfg();
    try {
      if (c.provider === "supabase" && c.url && c.key) {
        const t = c.table || "otp_requests";
        await fetch(`${c.url.replace(/\/$/, "")}/rest/v1/${t}`, {
          method: "POST",
          headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json",
                     Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([rec]),
        });
        return { online: true };
      }
      if (c.provider === "firebase" && c.url) {
        await fetch(`${c.url.replace(/\/$/, "")}/requests/${rec.id}.json`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec),
        });
        return { online: true };
      }
    } catch (e) { /* уйдёт полной синхронизацией ниже */ }
    return put(loadLocal()) ? { online: true } : { online: false };
  }

  return { cfg, all, put, sync, upsert, merge, loadLocal, saveLocal, provider: () => cfg().provider };
})();
