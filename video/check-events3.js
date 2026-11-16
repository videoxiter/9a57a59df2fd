const fs = require("fs");
const vm = require("vm");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("assets/js/data.js", "utf8"), ctx);
const cl = ctx.window.OTP_DATA.hrRules.cloud;
const base = cl.url.replace(/\/$/, "");
const H = { apikey: cl.key, Authorization: "Bearer " + cl.key, "Content-Type": "application/json" };
const rpc = async (n, b) => (await (await fetch(base + "/rest/v1/rpc/" + n, { method: "POST", headers: H, body: JSON.stringify(b || {}) })).json());
(async () => {
  const login = await rpc("otp_login", { p_slug: "admin", p_pass: process.env.ADMIN_PASS });
  const token = login.token;
  const proxy = async (path, method = "GET") => {
    const r = await fetch(base + "/functions/v1/api", {
      method: "POST",
      headers: { ...H, Authorization: "Bearer " + cl.key },
      body: JSON.stringify({ token, path, method }),
    });
    return (await r.json());
  };
  for (const day of ["2026-11-16", "2026-11-15"]) {
    const rows = await proxy(`otp_time_events?select=*&empSlug=eq.pospelova&day=eq.${day}&order=at.asc`);
    console.log("=== " + day + " ===");
    const arr = Array.isArray(rows) ? rows : (rows.data || rows.rows || []);
    console.log("событий:", arr.length);
    for (const e of arr) console.log(e.day, e.at, e.type, e.slot || "", e.device || "", e.id);
  }
})();
