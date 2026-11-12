# -*- coding: utf-8 -*-
"""Генерирует персональные страницы сотрудника: набор разделов.

team/<slug>/           — Бонусы (KPI + денежная часть)
team/<slug>/lvl/       — Мой LVL
team/<slug>/awards/    — Награды
team/<slug>/growth/    — Мой рост («В разработке»)
team/<slug>/stats/     — Статистика
team/<slug>/rules/     — Правила (книга)

Каждая страница САМОДОСТАТОЧНА: содержит только данные своего сотрудника
(window.OTP_EMP), без ссылок на общий дашборд и без общего data.js.
Ссылки между разделами — только внутри своего набора (относительные).
"""
import copy
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAM_DIR = os.path.join(ROOT, "team")

SECTIONS = [
    ("start", "Стартовая", "ph-play-circle", "смена, перерывы, время"),
    ("bonus", "Бонусы", "ph-wallet", "KPI и денежная часть"),
    ("lvl", "Мой LVL", "ph-medal", "уровень и звёзды"),
    ("awards", "Награды", "ph-trophy", "полученные и справочник"),
    ("growth", "Мой рост", "ph-rocket-launch", "план развития"),
    ("graph", "Мой график", "ph-calendar-check", "смены, отпуска, часы"),
    ("stats", "Статистика", "ph-chart-line", "динамика и детализация"),
    ("income", "Карта доходов", "ph-coins", "из чего складывается доход"),
    ("rules", "Правила", "ph-book-open", "как всё устроено"),
    ("hours", "Журнал часов", "ph-clock-counter-clockwise", "начисления и списания"),
    ("links", "Ссылки", "ph-link", "сервисы и инструменты"),
    ("settings", "Настройки", "ph-sliders", "тема, фон и анимация"),
]


def _schedule_for(emp, sched):
    """Срез графика для страницы сотрудника: смены, линии, отпуска, легенда."""
    if not sched:
        return None
    # В schedule.people поле slug — это внутренний id сотрудника (khasanov), а не
    # хеш-слаг страницы (114778baa83f). Ищем по id, иначе ФИО не находится и смены
    # теряются (у Хасанова в графике «Радион», в профиле «Родион»).
    eid = emp.get("id") or emp.get("slug")
    fio = None
    for p in sched.get("people", []):
        if p.get("slug") == eid or p.get("fio") == emp.get("fullName"):
            fio = p["fio"]
            break
    if not fio:
        fio = emp.get("fullName")
    return {
        "generated": sched.get("generated"),
        "legend": sched.get("legend", {}),
        "fio": fio,
        "slug": eid,
        "people": [{"fio": p["fio"], "slug": p.get("slug"), "surname": p.get("surname")}
                   for p in sched.get("people", [])],
        "months": sched.get("months", {}),
        "vacations": sched.get("vacations", {}),
        "vacationYears": sched.get("vacationYears", []),
    }


def load_data():
    raw = open(os.path.join(ROOT, "assets", "js", "data.js"), encoding="utf-8").read()
    start = raw.index("window.OTP_DATA = ") + len("window.OTP_DATA = ")
    payload = raw[start:].strip().rstrip(";")
    return json.loads(payload)


TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>__TITLE__</title>
  <meta name="robots" content="noindex">
  <link rel="icon" type="image/svg+xml" href="__PREFIX__assets/img/favicon.svg">
  <link href="__PREFIX__assets/css/fonts.css?v=__V__" rel="stylesheet">
  <link rel="stylesheet" href="__PREFIX__assets/vendor/phosphor/regular/style.css">
  <link rel="stylesheet" href="__PREFIX__assets/vendor/phosphor/fill/style.css">
  <link rel="stylesheet" href="__PREFIX__assets/vendor/phosphor/bold/style.css">
  <link rel="stylesheet" href="__PREFIX__assets/css/main.css?v=__V__">
</head>
<body data-profile="__ID__" data-section="__SECTION__">
  <div class="bg-stage"></div>
  <div class="bg-grid"></div>
  <header class="nav p-nav">
    <div class="wrap p-nav-inner">
      <a class="nav-logo" href="__HOME__" title="На главную (Бонусы)"><span class="dot"><i class="ph-fill ph-robot" style="color:#03141a"></i></span>Мои результаты</a>
      <nav class="sec-nav">__SECNAV__</nav>
    </div>
  </header>
  <main class="wrap" id="root" style="padding-top:104px;min-height:80vh"></main>
  <footer class="footer">
    <div class="wrap footer-inner">
      <div>
        <div style="font-weight:600;color:var(--text)">Мои результаты</div>
        <div style="margin-top:4px">__FULLNAME__</div>
      </div>
      <div class="footer-nav">
        <a class="btn btn-ghost" href="__HOME__"><i class="ph ph-house"></i> На главную</a>
        <a class="btn btn-ghost" href="javascript:history.length>1?history.back():location.href='__HOME__'"><i class="ph ph-arrow-left"></i> Назад</a>
      </div>
    </div>
  </footer>
  <script>
    window.OTP_EMP = __OTP_EMP__;
    window.OTP_SECTION = "__SECTION__";
    window.OTP_NAV = __OTP_NAV__;
  </script>
  <script src="__PREFIX__assets/vendor/gsap.min.js?v=__V__"></script>
  <script src="__PREFIX__assets/vendor/ScrollTrigger.min.js?v=__V__"></script>
  <script src="__PREFIX__assets/vendor/lenis.min.js?v=__V__"></script>
  <script src="__PREFIX__assets/vendor/chart.umd.min.js?v=__V__"></script>
  <script src="__PREFIX__assets/js/common.js?v=__V__"></script>
  <script src="__PREFIX__assets/js/auth.js?v=__V__"></script>
  <script src="__PREFIX__assets/js/cloud.js?v=__V__"></script>
  <script src="__PREFIX__assets/js/themes.js?v=__V__"></script>
  <script src="__PREFIX__assets/js/profile.js?v=__V__"></script>
</body>
</html>
"""

V = "181"

# Турнирная таблица команды (данные коллег) отдаётся только этим сотрудникам.
# У остальных в payload её нет вовсе — ни в разметке, ни в исходнике страницы.
# Руководитель (Яковленков) уволен и своих страниц не имеет; доска остаётся у Фролова.
BOARD_IDS = {"frolov"}


def secnav_html(rel, active, secs=None):
    out = []
    for key, label, icon, title in (secs or SECTIONS):
        href = (rel or "./") if key == "bonus" else rel + key + "/"
        cls = "sec-chip" + (" is-now" if key == active else "")
        out.append(f'<a class="{cls}" href="{href}" title="{label} · {title}"><i class="ph-bold {icon}"></i><span>{label}</span></a>')
    return "".join(out)


def main():
    data = load_data()
    os.makedirs(TEAM_DIR, exist_ok=True)
    n = 0
    made = 0
    for e in data["employees"]:
        if e.get("status") == "left":
            print(f"  - {e['fullName']}: уволен, страницы не генерируются")
            continue
        made += 1
        emp = copy.deepcopy(e)
        # «Учебные материалы» убраны со страниц — не тащим их в payload
        emp.pop("literature", None)
        emp.pop("resources", None)
        emp_data = {
            "meta": data["meta"],
            "metrics": data["metrics"],
            "awardsCatalog": data["awardsCatalog"],
            "rules": data.get("rules", {}),
            "bonusRules": data.get("bonusRules", []),
            "links": data.get("links", []),
            "months": data["months"],
            "totalEmployees": len(data["employees"]),
            "team": data.get("team", {}),
            # турнирная таблица — только тем, кто есть в BOARD_IDS (см. выше)
            "leaderboard": data.get("leaderboard", []) if e["id"] in BOARD_IDS else [],
            "employee": emp,
            "hrRules": data.get("hrRules", {}),
            "incomeRules": data.get("incomeRules", {}),
            # база часов и флаг «показатели не позволяют списание» — только тем, кто и так
            # видит журнал всего отдела (canManage), иначе колонка «Остаток» смешала бы людей
            "hoursBaseInfo": {e2.get("slug", e2["id"]): {"base": e2.get("hours_base", 0)}
                              for e2 in data["employees"]} if e.get("canManage") else {},
            # кому доступен отчёт по рабочему времени (руководитель и главный специалист)
            "employeesList": [{"slug": e2.get("slug", e2["id"]), "name": e2["fullName"]}
                              for e2 in data["employees"] if e2.get("status") != "left"] if e.get("canManage") else [],
            "schedule": _schedule_for(emp, data.get("schedule")),
            # дорожная карта развития — только своя (соседние на страницу не попадают)
            "roadmap": (data.get("roadmaps") or {}).get(e.get("slug", e["id"])),
        }
        payload = json.dumps(emp_data, ensure_ascii=False)
        slug = e.get("slug", e["id"])
        base = os.path.join(TEAM_DIR, slug)
        # «Журнал часов» — у всех, но сотрудник видит только свои записи
        secs = list(SECTIONS)
        for key, label, icon, _ in secs:
            depth = 1 if key == "bonus" else 2
            prefix = "../../" if depth == 1 else "../../../"
            rel = "" if depth == 1 else "../"
            home = "./" if depth == 1 else "../"
            nav = {k: ((rel or "./") if k == "bonus" else rel + k + "/") for k, _, _, _ in secs}
            html = (TEMPLATE
                    .replace("__PREFIX__", prefix)
                    .replace("__V__", V)
                    .replace("__ID__", e["id"])
                    .replace("__SECTION__", key)
                    .replace("__SECNAV__", secnav_html(rel, key, secs))
                    .replace("__HOME__", home)
                    .replace("__OTP_EMP__", payload)
                    .replace("__OTP_NAV__", json.dumps(nav, ensure_ascii=False))
                    .replace("__TITLE__", f'Мои результаты · {label} · {e["shortName"]}')
                    .replace("__FULLNAME__", e["fullName"]))
            out_dir = base if key == "bonus" else os.path.join(base, key)
            os.makedirs(out_dir, exist_ok=True)
            with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
                f.write(html)
            n += 1
        print(f"  OK team/{slug}/ + {len(secs) - 1} разделов")
    print(f"\nГотово: {n} страниц ({made} сотрудников × {len(SECTIONS)} разделов, изолированы, без ссылок на дашборд)")


if __name__ == "__main__":
    main()
