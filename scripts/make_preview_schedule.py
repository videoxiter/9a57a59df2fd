# -*- coding: utf-8 -*-
"""Локальный предпросмотр раздела «График на месяц» без пароля (заглушка входа)."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DASH = os.path.join(ROOT, "1bceb335668c", "__preview.html")
SRC = os.path.join(ROOT, "1bceb335668c", "schedule", "index.html")
OUT = os.path.join(ROOT, "1bceb335668c", "schedule", "__preview.html")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

STUB = """
<script>window.__errs = []; window.addEventListener("error", function (e) { window.__errs.push(String((e.error && e.error.stack) || e.message)); });
window.addEventListener("unhandledrejection", function (e) { window.__errs.push("rej: " + String((e.reason && e.reason.message) || e.reason)); });</script>
<script src="../../assets/js/data.js?cb=1"></script>
<script>
window.OTP_BOOT = window.OTP_BOOT || {};
(function () {
  window.OTP_BOOT.v = "preview";
  window.OTP_BOOT.prefix = "../../";
  function ok(v) { return Promise.resolve(v); }
  var A = window.OTP_AUTH;
  A.token = function () { return "preview"; };
  A.has = function () { return true; };
  A.protect = function () { return Promise.resolve(true); };
  A.session = function () { return ok({ ok: true, admin: true, slug: "admin" }); };
  A.isAdmin = function () { return ok(true); };
  A.dataGet = function () { return ok({ ok: true, payload: window.OTP_DATA }); };
  A.profileGet = A.dataGet;
  A.staffList = function () { return ok((window.OTP_DATA.employees || []).map(function (e) {
    return { slug: e.slug || e.id, fio: e.fullName, active: true, has_pass: true }; })); };
  A.scheduleGet = function () { return ok({ ok: true, schedule: { month: "2026-12", cell: {}, status: "draft", version: 3 } }); };
  A.scheduleSave = function () { return ok({ ok: true, version: 4 }); };
  A.vacationsGet = function () { return ok({ ok: true, list: [] }); };
  A.flagsGet = function () { return ok({ ok: true, list: [] }); };
  A.acksList = function () { return ok({ ok: true, acked: [], missing: [] }); };
  A.pollSummary = function () { return ok({ ok: true, list: [], missing: [] }); };
  A.tasksRecent = function () { return ok({ ok: true, list: [] }); };
  A.loginFails = function () { return ok([]); };
  A.devicesList = function () { return ok([]); };
  A.logout = function () {};
})();
</script>
"""


def main():
    html = open(SRC, encoding="utf-8").read()
    k = html.index("</script>", html.index('<script src="../../assets/js/auth.js')) + len("</script>")
    open(OUT, "w", encoding="utf-8", newline="").write(html[:k] + "\n" + STUB + html[k:])
    print("превью графика:", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
