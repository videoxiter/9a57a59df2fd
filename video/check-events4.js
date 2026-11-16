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
  const r = await fetch(base + "/functions/v1/api", {
    method: "POST", headers: H,
    body: JSON.stringify({ token: login.token, path: "otp_time_events?select=*&day=eq.2026-11-16&limit=5", method: "GET" }),
  });
  const t = await r.text();
  console.log("status:", r.status);
  console.log(t.slice(0, 800));
})();
