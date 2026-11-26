# -*- coding: utf-8 -*-
"""Патч: отдельный раздел «Опрос» на личной странице + подпись разработчиков.

1) В генератор добавляется секция poll (страница /team/<код>/poll/).
2) В profile.js: карточка пожеланий рендерится на странице раздела; на «Стартовой»
   её больше нет. Если открытого опроса нет — раздел показывает «опроса сейчас нет»
   и пункт меню прячется.
3) В приложении кнопка «Заполнить» ведёт на /poll/, в «О программе» — разработчики.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 1. генератор страниц ----------------
gp = os.path.join(ROOT, "scripts", "generate_pages.py")
s = open(gp, encoding="utf-8").read()
if '("poll", "Опрос"' not in s:
    s = s.replace('''   ("start", "Стартовая", "ph-play-circle", "смена, перерывы, время"),''',
                  '''   ("start", "Стартовая", "ph-play-circle", "смена, перерывы, время"),
   ("poll", "Опрос", "ph-clipboard-text", "пожелания по графику"),''', 1)
    open(gp, "w", encoding="utf-8", newline="").write(s)
print("генератор: раздел Опрос добавлен")

# ---------------- 2. profile.js ----------------
pj = os.path.join(ROOT, "assets", "js", "profile.js")
src = open(pj, encoding="utf-8").read()

# 2.1 заголовок раздела
src = src.replace("graph: \"Мой график\", hours: \"Журнал часов\"",
                  "graph: \"Мой график\", poll: \"Опрос\", hours: \"Журнал часов\"", 1)

# 2.2 на «Стартовой» карточку больше не вставляем
src = src.replace("    /* v21: пожелания по графику на следующий месяц (если опрос открыт) */\n    initPollCard();\n",
                  "", 1)

# 2.3 initPollCard получает хост и умеет работать на странице раздела
src = src.replace('''  function initPollCard() {
    const A = window.OTP_AUTH;
    if (!A || !A.pollMy) return;
    const host = document.getElementById("st-actions");
    if (!host) return;
    const sec = host.closest(".st-card") || host.parentNode;''',
'''  function initPollCard(hostEl) {
    const A = window.OTP_AUTH;
    if (!A || !A.pollMy) return;
    const host = hostEl || document.getElementById("st-actions");
    if (!host) return;
    const sec = host.closest(".st-card") || host.parentNode;''', 1)

# 2.4 страница раздела «Опрос»
poll_page = '''
  /* Раздел «Опрос»: пожелания по графику живут отдельной страницей.
     Пункт меню видим только когда опрос действительно открыт. */
  function hidePollNav(hide) {
    document.querySelectorAll('a.sec-chip[href$="poll/"]').forEach((a) => {
      if (hide) { a.style.display = "none"; }
      else { a.style.display = ""; }
    });
  }

  function initPollPage() {
    const rootEl = document.getElementById("root");
    const A = window.OTP_AUTH;
    if (!rootEl) return;
    const box = document.createElement("section");
    box.className = "p-sec";
    box.innerHTML = '<div class="p-sec-head"><h2><i class="ph-bold ph-clipboard-text"></i> Опрос по графику</h2>'
      + '<span class="p-sec-hint">пожелания на следующий месяц</span></div><div id="poll-here"></div>';
    rootEl.appendChild(box);
    const host = document.getElementById("poll-here");
    if (!A || !A.pollMy) { host.innerHTML = '<p class="muted">Нет связи с сервером опроса.</p>'; return; }
    A.pollMy(String(emp.id)).then((res) => {
      if (!res || !res.ok || !res.poll) {
        hidePollNav(true);
        host.innerHTML = '<div class="p-card"><p>Сейчас опроса нет. Когда руководитель его откроет, '
          + 'здесь появится форма пожеланий, а в меню — пункт «Опрос».</p></div>';
        return;
      }
      hidePollNav(false);
      initPollCard(host);
    }).catch(() => {
      host.innerHTML = '<p class="muted">Не удалось узнать состояние опроса.</p>';
    });
  }

'''
src = src.replace("  /* «Пожелания по графику» — карточка на «Стартовой»", poll_page + "  /* «Пожелания по графику» — карточка на «Стартовой»", 1)

# 2.5 инициализация раздела
src = src.replace('if (SECTION === "start") initStart();',
                  'if (SECTION === "start") initStart();\n    if (SECTION === "poll") initPollPage();', 1)

open(pj, "w", encoding="utf-8", newline="").write(src)
print("profile.js: раздел Опрос готов")

# ---------------- 3. приложение ----------------
app = os.path.join(ROOT, "app", "tray", "otp_tray.py")
a = open(app, encoding="utf-8").read()

# кнопка «Заполнить» ведёт на страницу опроса
a = a.replace('''tk.Button(poll_row, text="Заполнить", command=lambda: webbrowser.open(self.page_url()),''',
              '''tk.Button(poll_row, text="Заполнить", command=lambda: webbrowser.open(self.poll_url()),''', 1)

# метод poll_url рядом с page_url
a = a.replace('''    def page_url(self):''',
'''    def poll_url(self):
        """Ссылка на раздел «Опрос» личной страницы."""
        base = self.page_url().rstrip("/") if self.api.slug else SITE_BASE
        if base.endswith("/start"):
            base = base[:-6]
        return base.rstrip("/") + "/poll/"

    def page_url(self):''', 1)

# разработчики в «О программе»
a = a.replace('''                "Автор: Евгений Евгеньевич Яковлев")''',
'''                "Автор: Евгений Евгеньевич Яковлев\\n"
                "Разработчики: Евгений Яковлев, Андрей Болгов")''', 1)

open(app, "w", encoding="utf-8", newline="").write(a)
print("приложение: poll_url и разработчики")
sys.exit(0)
