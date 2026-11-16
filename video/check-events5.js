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
  const proxy = async (path) => (await (await fetch(base + "/functions/v1/api", { method: "POST", headers: H,
    body: JSON.stringify({ token: login.token, path, method: "GET" }) })).json());
  const rows = await proxy("otp_time_events?select=*&empSlug=eq.d2b44b366961&day=eq.2026-11-16&order=at.asc");
  const arr = Array.isArray(rows) ? rows : [];
  console.log("событий:", arr.length);
  for (const e of arr) console.log(new Date(e.at).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" }), e.type, e.slot || "", e.reason || "", e.id);
})();
