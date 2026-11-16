const fs = require("fs");
const vm = require("vm");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("assets/js/data.js", "utf8"), ctx);
const cl = ctx.window.OTP_DATA.hrRules.cloud;
const url = cl.url.replace(/\/$/, "");
const H = { apikey: cl.key, Authorization: "Bearer " + cl.key };
(async () => {
  for (const day of ["2026-11-16", "2026-11-15"]) {
    const r = await fetch(`${url}/rest/v1/otp_time_events?select=*&empSlug=eq.pospelova&day=eq.${day}&order=at.asc`, { headers: H });
    const t = await r.text();
    console.log("=== " + day + " (" + r.status + ") ===");
    console.log(t.slice(0, 1500));
  }
})();
