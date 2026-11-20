const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("assets/js/profile.js", "utf8");
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const board = { innerHTML: "", querySelectorAll: () => [] };
const now = Date.now();
const events = [
  { empSlug: "e5d35a6fc921", empName: "Болгов Андрей Владимирович", type: "shift_start", at: new Date(now - 60000).toISOString() },
  { empSlug: "5414335d1bd0", empName: "Фролов Павел Александрович", type: "shift_start", at: new Date(now - 60000).toISOString() },
];
const context = {
  document: { getElementById: (id) => id === "st-actions" ? { closest: () => ({ appendChild() {} }) } : null, createElement: () => board },
  window: { OTP_AUTH: { staffList: async () => [
    { slug: "bolgov", fio: "Болгов Андрей Владимирович" },
    { slug: "frolov", fio: "Фролов Павел Александрович" },
  ] } },
  D: { schedule: {} }, Date, Set, Map, String, Math, Number, Promise,
  stIsoDate: () => "2026-11-20", stHm: () => "12:00", stHms: (n) => String(n),
  stLeaveWins: () => new Map(),
  stApi: async (path) => path.startsWith("otp_time_events") ? events : [],
  setInterval: () => {},
};
vm.createContext(context);
vm.runInContext(extract("  function stCalc(", "  /* окна увольнительных") + extract("  function initNowBoard()", "  function initStartReport()") + "\ninitNowBoard();", context);
const apiContext = {
  window: { OTP_AUTH: { token: (slug) => slug === "admin" ? "session" : null, api: (slug) => slug } },
  ST_CLOUD: () => ({ url: "https://example.invalid" }), emp: { id: "bolgov" }, String, Promise,
};
vm.createContext(apiContext);
vm.runInContext(extract("  function stApi(", "  const stLocal ="), apiContext);
assert.equal(apiContext.stApi("otp_time_events"), "admin");
for (const employee of ["bolgov", "frolov"]) {
  apiContext.emp.id = employee;
  apiContext.window.OTP_AUTH.token = (slug) => slug === employee ? "session" : null;
  assert.equal(apiContext.stApi("otp_time_events"), employee);
}
const iso = extract("  const stIsoDate =", "  const ST_MISS_KEY");
assert.equal(vm.runInNewContext(iso + '\nstIsoDate(new Date("2026-11-19T22:00:00Z"))', { Intl, Date, String }), "2026-11-20");
setImmediate(() => {
  assert.match(board.innerHTML, /k-work/);
  assert.match(board.innerHTML, /Болгов Андрей Владимирович/);
  assert.match(board.innerHTML, /Фролов Павел Александрович/);
  assert.equal((board.innerHTML.match(/k-work/g) || []).length, 2);
  assert.match(board.innerHTML, /data-seconds=/);
  console.log("now board checks passed");
});
