const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

let handler, calls = 0;
const today = new Date(Date.now() + 10800000);
const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
const months = {};
for (let i = 0; i < 7; i++) {
  const date = new Date(monday.getTime() + i * 86400000);
  months[date.toISOString().slice(0, 7)] = { shifts: {}, lines: {} };
}
const fixture = { team: [{ fio: "Фролов", id: "frolov" }], schedule: { months } };
const token = "a".repeat(64);
const source = require("node:module").stripTypeScriptTypes(fs.readFileSync("supabase/functions/n8n-api/index.ts", "utf8"));
vm.runInNewContext(source, {
  Deno: { env: { get: (key) => ({ SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: "test", N8N_API_TOKEN: token })[key] }, serve: (fn) => { handler = fn; } },
  URLSearchParams, Response,
  fetch: async (url) => {
    calls++;
    if (url.includes("schedule.json")) return new Response(JSON.stringify(fixture));
    if (url.includes("otp_current_status")) return new Response(JSON.stringify([{ emp_name: "Фролов", status: "work", worked_sec: 42, since: "2026-11-20T09:00:00Z" }]));
    assert.match(url, /limit=1000/); return new Response("[]");
  },
});
const run = (body) => handler({ method: "POST", json: async () => body });
(async () => {
  assert.equal((await run({ token: "wrong", method: "GET", path: "otp_requests" })).status, 401);
  assert.equal((await run({ token, method: "PATCH", path: "otp_requests" })).status, 403);
  assert.equal((await run({ token, method: "GET", path: "otp_staff" })).status, 403);
  assert.equal((await run({ token, method: "GET", path: "otp_requests?select=*,otp_staff(*)" })).status, 400);
  assert.equal((await run({ token, method: "GET", path: "otp_requests?status=eq.pending" })).status, 200);
  assert.equal(calls, 1);
  const schedule = await (await run({ token, method: "GET", path: "schedule" })).json();
  assert.equal(schedule[0].login, "p.frolov");
  assert.equal(schedule[0].days.length, 7);
  const statuses = await (await run({ token, method: "GET", path: "status" })).json();
  assert.equal(statuses[0].status, "work");
  assert.equal(statuses[0].login, "p.frolov");
  assert.equal(statuses[0].since, "2026-11-20T12:00:00.000+03:00");
  console.log("n8n API checks passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
