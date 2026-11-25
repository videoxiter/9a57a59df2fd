# -*- coding: utf-8 -*-
"""Собирает локальный «превью» страницы раздела «График на месяц» с демо-данными.

Нужен для скриншотов в инструкцию: настоящие HTML/CSS/JS сайта, но без входа —
подставляем заглушку OTP_AUTH и демонстрационные ответы/график.

Запуск: python scripts/make_preview.py
Результат: 1bceb335668c/schedule/__preview.html (после съёмки файл можно удалить)
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "1bceb335668c", "schedule", "index.html")
OUT = os.path.join(ROOT, "1bceb335668c", "schedule", "__preview.html")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DEMO_EMPLOYEES = [
    ("frolov", "Фролов Павел Александрович"),
    ("bolgov", "Болгов Андрей Владимирович"),
    ("melnikov", "Мельников Алексей Сергеевич"),
    ("khasanov", "Хасанов Радион Равильевич"),
    ("pestovsky", "Пестовский Георгий Александрович"),
    ("eliseev", "Елисеев Антон Андреевич"),
    ("zavyalov", "Завьялов Максим Вячеславович"),
    ("yuryev", "Юрьев Сергей Олегович"),
    ("agarov", "Агарков Владимир Сергеевич"),
    ("vtorygin", "Вторыгин Ефим Владимирович"),
    ("pospelova", "Поспелова Екатерина Алексеевна"),
]

DEMO_CELL = {
    "frolov": {"1": "О", "2": "О", "3": "О", "4": "О", "5": "О", "6": "О", "7": "В"},
    "bolgov": {"1": "2", "2": "2", "3": "Ср", "4": "2", "5": "2", "6": "В", "7": "Т"},
    "melnikov": {"1": "2", "2": "В", "3": "2", "4": "2", "5": "2", "6": "В", "7": "I"},
    "khasanov": {"1": "2", "2": "2", "3": "В", "4": "2", "5": "2", "6": "В", "7": "В"},
    "pestovsky": {"1": "2", "2": "2", "3": "2", "4": "В", "5": "2", "6": "В", "7": "II"},
    "eliseev": {"1": "В", "2": "2", "3": "2", "4": "2", "5": "В", "6": "Т", "7": "В"},
    "zavyalov": {"1": "1", "2": "1", "3": "1", "4": "1", "5": "1", "6": "В", "7": "I"},
    "yuryev": {"1": "2", "2": "В", "3": "2", "4": "2", "5": "2", "6": "В", "7": "В"},
    "agarov": {"1": "2", "2": "2", "3": "В", "4": "2", "5": "2", "6": "В", "7": "В"},
    "vtorygin": {"1": "В", "2": "2", "3": "2", "4": "2", "5": "2", "6": "В", "7": "В"},
    "pospelova": {"1": "3", "2": "В", "3": "3", "4": "В", "5": "3", "6": "В", "7": "В"},
}

DEMO_ANSWERS = [
    ("Фролов Павел Александрович", {"weekend_dates": [4, 6, 13], "weekend_time": "05:00",
                                    "off_dates": [1, 2, 3, 4, 5, 6], "third_weeks": [],
                                    "third_none": True, "tania": False,
                                    "comment": "01.12–06.12 отпуск, прошу не ставить"}),
    ("Болгов Андрей Владимирович", {"weekend_dates": [6, 13, 20], "weekend_time": "05:00",
                                    "off_dates": [], "third_weeks": [7, 14],
                                    "third_none": False, "tania": True, "comment": "Готов на «Танию»"}),
    ("Мельников Алексей Сергеевич", {"weekend_dates": [13], "weekend_time": "08:00",
                                     "off_dates": [12, 13, 19, 20], "third_weeks": [],
                                     "third_none": True, "tania": True, "comment": "Прошу больше выходных смен"}),
    ("Завьялов Максим Вячеславович", {"weekend_dates": [], "weekend_time": "05:00",
                                      "off_dates": [6, 13, 20, 27], "third_weeks": [],
                                      "third_none": False, "tania": False,
                                      "comment": "Суббота — учёба, воскресенье — отдых"}),
    ("Поспелова Екатерина Алексеевна", {"weekend_dates": [6], "weekend_time": "08:00",
                                        "off_dates": [], "third_weeks": [], "third_none": False,
                                        "tania": False, "comment": "Ставьте на усмотрение"}),
]

STUB = """
<script>window.__errs = []; window.addEventListener("error", function (e) { window.__errs.push(String(e.message)); });
window.addEventListener("unhandledrejection", function (e) { window.__errs.push("rej: " + String((e.reason && e.reason.message) || e.reason)); });</script>
<script>
/* Превью-заглушка для скриншотов: реальные HTML/CSS/JS, демо-данные, без входа. */
window.OTP_DATA = window.OTP_DATA || { employees: %EMPLOYEES% };
(function () {
  var cells = %CELL%;
  var answers = %ANSWERS%;
  var month = "2026-12";
  function ok(v) { return Promise.resolve(v); }
  window.OTP_AUTH = {
    token: function () { return "preview"; },
    has: function () { return true; },
    protect: function () { return Promise.resolve(true); },
    isAdmin: function () { return ok(true); },
    session: function () { return ok({ ok: true, admin: true, slug: "admin" }); },
    login: function () { return ok({ ok: true }); },
    logout: function () {},
    staffList: function () { return ok(%STAFF%); },
    pollSummary: function () {
      return ok({ ok: true, list: answers.map(function (a) {
        return { emp_slug: a.slug, fio: a.fio, answers: a.answers, updated_at: new Date().toISOString() };
      }), missing: ["Хасанов Радион Равильевич", "Юрьев Сергей Олегович"] });
    },
    scheduleGet: function () { return ok({ ok: true, schedule: { month: month, cell: cells, status: "draft", version: 3 } }); },
    vacationsGet: function () { return ok({ ok: true, list: [{ emp_slug: "frolov", from_day: 1, to_day: 6, raw: "30 ноября — 06 декабря" }] }); },
    flagsGet: function () { return ok({ ok: true, list: [{ day: 31, kind: "short" }] }); },
    flagSet: function () { return ok({ ok: true }); },
    acksList: function () { return ok({ ok: true, acked: [
        { fio: "Болгов Андрей Владимирович", at: new Date().toISOString() },
        { fio: "Мельников Алексей Сергеевич", at: new Date().toISOString() }],
        missing: ["Хасанов Радион Равильевич", "Юрьев Сергей Олегович"] }); },
    ackMy: function () { return ok(null); },
    ackDo: function () { return ok({ ok: true }); },
    pollCreate: function () { return ok({ ok: true }); },
    pollSetStatus: function () { return ok({ ok: true }); },
    scheduleSave: function () { return ok({ ok: true, version: 4 }); },
    verifyPass: function () { return ok(null); },
    setOnlyApp: function () { return ok(null); },
    setOnlyAppAll: function () { return ok(null); },
    devicesList: function () { return ok([]); },
    loginFails: function () { return ok([]); },
    selfInfo: function () { return ok(null); },
    saveStaff: function () { return ok({ ok: true }); }
  };
})();
</script>
"""


def main():
    html = open(SRC, encoding="utf-8").read()
    employees = [{"id": s, "slug": s, "fullName": f, "status": "active"} for s, f in DEMO_EMPLOYEES]
    staff = [{"slug": s, "fio": f, "active": True, "has_pass": True} for s, f in DEMO_EMPLOYEES]
    answers = [{"slug": s, "fio": f, "answers": a}
               for (s, f), (_, a) in zip(DEMO_EMPLOYEES, DEMO_ANSWERS + [("", {})] * 6)
               if s in [x[0] for x in DEMO_ANSWERS[:0]]] or []
    # ответы по фамилиям из DEMO_ANSWERS
    amap = {f: a for f, a in DEMO_ANSWERS}
    answers = []
    for s, f in DEMO_EMPLOYEES:
        if f in amap:
            answers.append({"slug": s, "fio": f, "answers": amap[f]})
    stub = (STUB.replace("%EMPLOYEES%", json.dumps(employees, ensure_ascii=False))
                .replace("%CELL%", json.dumps(DEMO_CELL, ensure_ascii=False))
                .replace("%ANSWERS%", json.dumps(answers, ensure_ascii=False))
                .replace("%STAFF%", json.dumps(staff, ensure_ascii=False)))
    marker = "<body"
    i = html.index(marker)
    j = html.index(">", i) + 1
    # заглушку ставим ПОСЛЕ auth.js (он сам назначает window.OTP_AUTH), но ДО main.js
    auth_tag = '<script src="../../assets/js/auth.js' 
    k = html.index("</script>", html.index(auth_tag)) + len("</script>")
    out = html[:k] + "\n" + stub + html[k:]
    open(OUT, "w", encoding="utf-8", newline="").write(out)
    print("превью:", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
