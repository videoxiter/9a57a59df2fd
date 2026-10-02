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
    ("bonus", "Бонусы", "ph-wallet", "KPI и денежная часть"),
    ("lvl", "Мой LVL", "ph-medal", "уровень и звёзды"),
    ("awards", "Награды", "ph-trophy", "полученные и справочник"),
    ("growth", "Мой рост", "ph-rocket-launch", "план развития"),
    ("graph", "Мой график", "ph-calendar-check", "смены, отпуска, часы"),
    ("stats", "Статистика", "ph-chart-line", "динамика и детализация"),
    ("rules", "Правила", "ph-book-open", "как всё устроено"),
]


def _schedule_for(emp, sched):
    """Срез графика для страницы сотрудника: смены, линии, отпуска, легенда."""
    if not sched:
        return None
    slug = emp.get("slug") or emp.get("id")
    fio = None
    for p in sched.get("people", []):
        if p.get("slug") == slug:
            fio = p["fio"]
            break
    return {
        "generated": sched.get("generated"),
        "legend": sched.get("legend", {}),
        "fio": fio,
        "slug": slug,
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css">
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css">
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
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <script src="__PREFIX__assets/js/common.js?v=__V__"></script>
  <script src="__PREFIX__assets/js/profile.js?v=__V__"></script>
</body>
</html>
"""

V = "36"


def secnav_html(rel, active):
    out = []
    for key, label, icon, title in SECTIONS:
        href = (rel or "./") if key == "bonus" else rel + key + "/"
        cls = "sec-chip" + (" is-now" if key == active else "")
        out.append(f'<a class="{cls}" href="{href}" title="{label} · {title}"><i class="ph-bold {icon}"></i><span>{label}</span></a>')
    return "".join(out)


def main():
    data = load_data()
    os.makedirs(TEAM_DIR, exist_ok=True)
    n = 0
    for e in data["employees"]:
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
            "months": data["months"],
            "totalEmployees": len(data["employees"]),
            "team": data.get("team", {}),
            # турнирная таблица — только на странице руководителя; у специалистов её нет
            # ни в разметке, ни в исходнике страницы (изоляция данных коллег)
            "leaderboard": data.get("leaderboard", []) if e["id"] == "yakovlenkov" else [],
            "employee": emp,
            "schedule": _schedule_for(emp, data.get("schedule")),
        }
        payload = json.dumps(emp_data, ensure_ascii=False)
        slug = e.get("slug", e["id"])
        base = os.path.join(TEAM_DIR, slug)
        for key, label, icon, _ in SECTIONS:
            depth = 1 if key == "bonus" else 2
            prefix = "../../" if depth == 1 else "../../../"
            rel = "" if depth == 1 else "../"
            home = "./" if depth == 1 else "../"
            nav = {k: ((rel or "./") if k == "bonus" else rel + k + "/") for k, _, _, _ in SECTIONS}
            html = (TEMPLATE
                    .replace("__PREFIX__", prefix)
                    .replace("__V__", V)
                    .replace("__ID__", e["id"])
                    .replace("__SECTION__", key)
                    .replace("__SECNAV__", secnav_html(rel, key))
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
        print(f"  OK team/{slug}/ + {len(SECTIONS) - 1} разделов")
    print(f"\nГотово: {n} страниц ({len(data['employees'])} сотрудников × {len(SECTIONS)} разделов, изолированы, без ссылок на дашборд)")


if __name__ == "__main__":
    main()
