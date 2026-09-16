# -*- coding: utf-8 -*-
"""Генерирует персональные страницы team/<slug>/index.html.
Каждая страница САМОДОСТАТОЧНА: содержит только данные своего сотрудника
(window.OTP_EMP), без ссылок на общий дашборд и без общего data.js."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAM_DIR = os.path.join(ROOT, "team")

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
  <link rel="icon" type="image/svg+xml" href="../../assets/img/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css">
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css">
  <link rel="stylesheet" href="../../assets/css/main.css?v=10">
</head>
<body data-profile="__ID__">
  <div class="bg-stage"></div>
  <div class="bg-grid"></div>
  <header class="nav">
    <div class="wrap nav-inner">
      <span class="nav-logo"><span class="dot"><i class="ph-fill ph-robot" style="color:#03141a"></i></span>Мои результаты</span>
    </div>
  </header>
  <main class="wrap" id="root" style="padding-top:110px;min-height:80vh"></main>
  <footer class="footer">
    <div class="wrap footer-inner">
      <div>
        <div style="font-weight:600;color:var(--text)">Мои результаты</div>
        <div style="margin-top:4px">__FULLNAME__</div>
      </div>
    </div>
  </footer>
  <script>window.OTP_EMP = __OTP_EMP__;</script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <script src="../../assets/js/common.js?v=10"></script>
  <script src="../../assets/js/profile.js?v=10"></script>
</body>
</html>
"""

def main():
    data = load_data()
    os.makedirs(TEAM_DIR, exist_ok=True)
    n = 0
    for e in data["employees"]:
        emp_data = {
            "meta": data["meta"],
            "metrics": data["metrics"],
            "awardsCatalog": data["awardsCatalog"],
            "months": data["months"],
            "totalEmployees": len(data["employees"]),
            "team": data.get("team", {}),
            "leaderboard": data.get("leaderboard", []),
            "employee": e,
        }
        html = (TEMPLATE
                .replace("__ID__", e["id"])
                .replace("__OTP_EMP__", json.dumps(emp_data, ensure_ascii=False))
                .replace("__TITLE__", f'Мои результаты · {e["shortName"]}')
                .replace("__FULLNAME__", e["fullName"]))
        d = os.path.join(TEAM_DIR, e.get("slug", e["id"]))
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        n += 1
        print(f"  OK team/{e.get('slug', e['id'])}/index.html")
    print(f"\nГотово: {n} страниц (изолированных, без ссылок на общий дашборд)")

if __name__ == "__main__":
    main()
