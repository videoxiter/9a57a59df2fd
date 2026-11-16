const fs = require("fs");
const vm = require("vm");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("assets/js/data.js", "utf8"), ctx);
const cl = ctx.window.OTP_DATA.hrRules.cloud;
const base = cl.url.replace(/\/$/, "") + "/rest/v1/rpc/";
const H = { apikey: cl.key, Authorization: "Bearer " + cl.key, "Content-Type": "application/json" };
const rpc = async (n, b) => {
  const r = await fetch(base + n, { method: "POST", headers: H, body: JSON.stringify(b || {}) });
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { return { raw: t.slice(0, 200), status: r.status }; }
};
(async () => {
  const login = await rpc("otp_login", { p_slug: "admin", p_pass: process.env.ADMIN_PASS });
  console.log("login:", JSON.stringify(login).slice(0, 120));
  const staff = await rpc("otp_staff_list", {});
  const list = Array.isArray(staff) ? staff : (staff.rows || staff.data || []);
  const p = list.find((s) => /Поспелов/i.test(s.fio || ""));
  console.log("сотрудник:", p ? p.slug + " | " + p.fio : "не найден");
  fs.writeFileSync("video/out/staff.json", JSON.stringify(list, null, 1), "utf8");
})();
