# -*- coding: utf-8 -*-
"""Сессия истекла на странице опроса: показываем кнопку «Войти заново».

Болгов видел «опроса нет», потому что его сохранённый токен уже недействителен:
сервер отвечал «unauthorized», а страница трактовала это как «опроса нет».
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "assets", "js", "profile.js")
src = open(PATH, encoding="utf-8").read()

old = """      if (!res || !res.ok) {
        hidePollNav(true);
        host.innerHTML = '<div class="p-card"><p>Не удалось узнать состояние опроса: нет связи '
          + 'или нужен вход. Обновите страницу (Ctrl+F5) и войдите снова.</p></div>';
        return;
      }"""
new = """      if (res && res.ok === false && res.error === "unauthorized") {
        hidePollNav(true);
        host.innerHTML = '<div class="p-card"><p>Сессия истекла — нужно войти заново.</p>'
          + '<button class="btn btn-primary" id="poll-relogin" type="button">Войти заново</button></div>';
        const relog = document.getElementById("poll-relogin");
        if (relog) relog.addEventListener("click", () => {
          try {
            if (A.logout) A.logout(String(emp.id));
            if (A.logout) A.logout("admin");
          } catch (e) {}
          location.reload();
        });
        return;
      }
      if (!res || !res.ok) {
        hidePollNav(true);
        host.innerHTML = '<div class="p-card"><p>Не удалось узнать состояние опроса: нет связи. '
          + 'Проверьте интернет и обновите страницу (Ctrl+F5).</p></div>';
        return;
      }"""
if old not in src:
    raise SystemExit("блок не найден")
open(PATH, "w", encoding="utf-8", newline="").write(src.replace(old, new, 1))
print("profile.js: обработка истёкшей сессии добавлена")
sys.exit(0)
