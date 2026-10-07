# -*- coding: utf-8 -*-
"""Собирает дашборд руководителя из разделов.

  /                 — Моя команда · Кто лучше · Заявки · Рейтинг по KPI
  /dynamics/        — Динамика команды (графики)
  /people/          — Специалисты (карточки)
  /duties/          — График отдела (смены и отпуска)
  /development/     — Развитие отдела

Секции берутся из уже свёрстанного index.html (маркеры по id), поэтому внешний вид
не дублируется. Запуск: python generate_dashboard.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DASH = os.path.join(ROOT, "1bceb335668c")
SRC = os.path.join(DASH, "index.html")
SOURCE = os.path.join(ROOT, "scripts", "dashboard_source.html")   # неизменный исходник секций
V = "56"

PAGES = [
    ("", "Моя команда", "team", ["top", "best", "hr-sec", "rating"]),
    ("dynamics", "Динамика", "chart-line", ["dynamics"]),
    ("people", "Специалисты", "users-three", ["team"]),
    ("duties", "График отдела", "calendar-check", ["duties"]),
    ("development", "Развитие отдела", "rocket-launch", ["grow"]),
]
NAV_LABEL = {"": "Моя команда", "dynamics": "Динамика", "people": "Специалисты",
             "duties": "График отдела", "development": "Развитие"}

BEST_SECTION = '''  <!-- ===== КТО ЛУЧШЕ ===== -->
  <section class="section" id="best" style="padding-top:8px">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <span class="kicker">Лучший результат</span>
        <h2>Кто лучше всех в этом месяце</h2>
        <p>Высший средний KPI по пяти метрикам. Нажми на имя — откроется персональная страница.</p>
      </div>
      <div class="best-card" id="best-card" data-reveal></div>
    </div>
  </section>
'''

DUTIES_SECTION = '''  <!-- ===== ГРАФИК ОТДЕЛА ===== -->
  <section class="section" id="duties">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <span class="kicker">Смены</span>
        <h2>График отдела</h2>
        <p>Состав на сегодня и завтра с временем, перерывами и линиями — плюс отпуска по периодам.</p>
      </div>
      <div class="duty-board" id="duty-board" data-reveal></div>
    </div>
  </section>
'''


def read_source():
    """Источник секций: первый прогон запоминает свёрстанный index.html, дальше читаем его."""
    if not os.path.exists(SOURCE):
        html = open(SRC, encoding="utf-8").read()
        open(SOURCE, "w", encoding="utf-8").write(html)
        print("источник секций сохранён:", SOURCE)
    return open(SOURCE, encoding="utf-8").read()


def split_sections(html):
    """Нарезает <section id="..."> … </section> с учётом вложенности."""
    out = {}
    for m in re.finditer(r'<section\b[^>]*\bid="([^"]+)"', html):
        sid, start = m.group(1), m.start()
        depth, i = 0, start
        while i < len(html):
            nxt_open = html.find("<section", i)
            nxt_close = html.find("</section>", i)
            if nxt_close < 0:
                break
            if 0 <= nxt_open < nxt_close:
                depth += 1
                i = nxt_open + 8
            else:
                depth -= 1
                i = nxt_close + 10
                if depth == 0:
                    out[sid] = html[start:i]
                    break
    return out


def build_pages():
    src = read_source()
    sections = split_sections(src)
    head_end = src.index("<body")
    head = src[:head_end]
    footer = src[src.index('<footer class="footer"'):src.index("</footer>") + len("</footer>")]

    sections["best"] = BEST_SECTION.strip()
    sections["duties"] = DUTIES_SECTION.strip()

    for path, title, icon, ids in PAGES:
        depth = 0 if path == "" else 1
        # дашборд живёт в своём каталоге: до /assets — один уровень вверх, из подстраниц — два
        prefix = "../" if depth == 0 else "../../"
        body = [head, '<body data-page="%s">' % (path or "home"), '<div class="bg-stage"></div>', '<div class="bg-grid"></div>']
        # шапка с разделами
        nav = []
        for p, label, ic, _ in PAGES:
            if p == path:
                href = "./"                        # текущий раздел
            elif p == "":
                href = "../index.html" if depth else "index.html"
            elif depth:
                href = "../" + p + "/"
            else:
                href = p + "/"
            cls = "nav-chip" + (" is-now" if p == path else "")
            nav.append(f'<a class="{cls}" href="{href}"><i class="ph-bold ph-{ic}"></i> {NAV_LABEL[p]}</a>')
        body.append(f'''  <header class="nav dash-nav">
    <div class="wrap nav-inner">
      <a class="nav-logo" href="{"index.html" if depth == 0 else "../index.html"}"><span class="dot"><i class="ph-fill ph-robot" style="color:#03141a"></i></span> Моя команда ОТП</a>
      <nav class="nav-links dash-links">{"".join(nav)}</nav>
    </div>
  </header>''')
        for sid in ids:
            if sid in sections:
                body.append(sections[sid])
        body.append("  " + footer)
        # скрипты
        for js in ("data.js", "common.js", "cloud.js", "hr.js", "main.js"):
            body.append(f'  <script src="{prefix}assets/js/{js}?v={V}"></script>')
        body.append("</body>\n</html>\n")

        out_dir = os.path.join(DASH, path) if path else DASH
        os.makedirs(out_dir, exist_ok=True)
        out_html = "\n".join(body)
        out_html = re.sub(r'(assets/css/[a-z]+\.css\?v=)\d+', r'\g<1>' + V, out_html)
        out_html = out_html.replace("<title>Моя команда ОТП · Аналитика эффективности</title>",
                                    f"<title>Моя команда ОТП · {title}</title>") if depth else out_html
        # пути ассетов в подстраницах: уходим на уровень выше
        if depth:
            out_html = out_html.replace('"../assets/', '"../../assets/')
        open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8").write(out_html)
        print(f"OK {path or '/'} → {os.path.join(out_dir, 'index.html')}")

    # заголовки у подстраниц
    for path, title, icon, ids in PAGES:
        if not path:
            continue
        f = os.path.join(DASH, path, "index.html")
        html = open(f, encoding="utf-8").read()
        html = re.sub(r"<title>.*?</title>", f"<title>Моя команда ОТП · {title}</title>", html, count=1)
        html = html.replace('name="description" content="Интерактивный дашборд эффективности отдела технической поддержки: KPI, динамика по месяцам, рейтинг и персональные страницы роста.">',
                            f'name="description" content="Моя команда ОТП · {title}">')
        open(f, "w", encoding="utf-8").write(html)


if __name__ == "__main__":
    build_pages()
