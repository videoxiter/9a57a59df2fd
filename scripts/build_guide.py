# -*- coding: utf-8 -*-
"""Собирает PDF-инструкцию: тёмное оформление в стиле сайта + встроенные картинки.

Картинки встраиваются как base64 (data:image/png;base64,...) — поэтому PDF
не зависит от путей и изображения гарантированно попадают в файл.

Запуск: python scripts/build_guide.py
Результат: docs/инструкция/install.html (для просмотра) и docs/УСТАНОВКА-ПРИЛОЖЕНИЯ.pdf
"""
import base64
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "docs", "images")
OUT_HTML = os.path.join(ROOT, "docs", "инструкция", "install.html")
OUT_PDF = os.path.join(ROOT, "docs", "УСТАНОВКА-ПРИЛОЖЕНИЯ.pdf")
CHROME = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CSS = """
  :root { --bg:#070b11; --text:#e8edf5; --muted:#9fb0c5; --accent:#22d3ee; --accent2:#67e8f9; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin:0; padding:0; background:var(--bg); color:var(--text);
    font-family:"Segoe UI", system-ui, sans-serif; font-size:11pt; line-height:1.55; }
  .page { width:210mm; min-height:297mm; padding:16mm 15mm; page-break-after:always;
    background:var(--bg); color:var(--text); }
  .page:last-child { page-break-after:auto; }
  .cover { display:flex; flex-direction:column; justify-content:center; }
  .logo { display:flex; align-items:center; gap:14px; margin-bottom:26px; }
  .logo img { width:64px; height:64px; border-radius:16px; }
  h1 { font-size:30pt; line-height:1.15; margin:0 0 8px; }
  .sub { color:var(--accent2); font-size:13pt; letter-spacing:.04em; text-transform:uppercase; }
  .lead { color:var(--muted); font-size:12pt; margin-top:18px; max-width:150mm; }
  .meta { margin-top:36px; color:#7f8ea3; font-size:10pt; border-top:1px solid rgba(148,163,184,.25); padding-top:12px; }
  .kicker { color:var(--accent2); font-size:9pt; letter-spacing:.16em; text-transform:uppercase; font-weight:700; }
  h2 { font-size:19pt; margin:4px 0 10px; color:#f3f7fb; }
  h3 { font-size:12.5pt; margin:16px 0 6px; color:var(--accent2); }
  p { margin:0 0 8px; color:#dbe3ee; }
  b { color:#fff; }
  .muted { color:var(--muted); }
  ol, ul { margin:6px 0 10px 18px; padding:0; color:#dbe3ee; }
  li { margin-bottom:4px; }
  .shot { border:1px solid rgba(148,163,184,.22); border-radius:10px; overflow:hidden; margin:10px 0 4px; background:#0b1119; }
  .shot img { display:block; width:100% !important; max-width:100%; height:auto !important; }
  .cap { color:var(--muted); font-size:9pt; margin-bottom:14px; }
  .steps { counter-reset:s; list-style:none; margin-left:0; }
  .steps li { counter-increment:s; position:relative; padding-left:26px; margin-bottom:8px; }
  .steps li:before { content:counter(s); position:absolute; left:0; top:1px; width:18px; height:18px;
    border-radius:50%; background:#0e7490; color:#fff; font-size:9pt; font-weight:700; text-align:center;
    line-height:18px; }
  table { width:100%; border-collapse:collapse; margin:8px 0 12px; font-size:10pt; }
  th, td { border:1px solid rgba(148,163,184,.25); padding:6px 8px; text-align:left; vertical-align:top; }
  th { background:rgba(34,211,238,.10); color:#eaf6fa; }
  td { color:#dbe3ee; }
  .note { border-left:3px solid var(--accent); background:rgba(34,211,238,.08); padding:8px 12px;
    margin:10px 0; font-size:10pt; color:#d9f6fb; }
  .warn { border-left:3px solid #f59e0b; background:rgba(245,158,11,.10); padding:8px 12px;
    margin:10px 0; font-size:10pt; color:#fde9c7; }
  .foot { margin-top:14px; border-top:1px solid rgba(148,163,184,.22); padding-top:8px;
    color:var(--muted); font-size:9pt; }
  @page { size:A4; margin:0; background:#070b11; }
"""


def b64(name):
    with open(os.path.join(IMG, name), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def build_html():
    img = {n: b64(n) for n in ("app-icon.png", "login.png", "tray-states-clean.png",
                               "preview-poll.png", "preview-grid.png")}
    html = f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<title>Приложение «ОТП» — установка и работа</title><style>{CSS}</style></head><body>

<section class="page cover">
  <div class="logo"><img src="{img['app-icon.png']}" alt="">
    <div><div class="sub">Мои результаты · ОТП</div>
      <div style="color:#9fb0c5;font-size:11pt">приложение для трея</div></div></div>
  <h1>Приложение «ОТП»<br>установка и работа</h1>
  <p class="lead">Учёт рабочего времени без браузера: смена, перерывы, обед, отсутствие.
    Напоминания о затянувшемся перерыве и открытом опросе, автоматические обновления.</p>
  <div class="meta">Версия 1.4 · Windows 10/11 · macOS<br>
    Автор: Яковлев Евгений Евгеньевич · 25.11.2026</div>
</section>

<section class="page">
  <span class="kicker">Установка</span>
  <h2>1. Инсталлятор</h2>
  <p>Скачайте файл и запустите двойным щелчком:</p>
  <p><b>https://videoxiter.github.io/9a57a59df2fd/downloads/OTP-Tray-Setup.exe</b></p>
  <ol class="steps">
    <li>Windows может показать окно «Система Windows защитила ваш компьютер».
      Нажмите <b>«Подробнее» → «Выполнить в любом случае»</b>: у установщика нет платной подписи.</li>
    <li>Отметьте галочки <b>«Создать значок на рабочем столе»</b> и
      <b>«Запускать приложение при входе в Windows»</b>.</li>
    <li>Нажмите «Установить»: программа ставится в профиль пользователя,
      <b>права администратора не нужны</b>.</li>
    <li>В конце оставьте галочку <b>«Запустить ОТП сейчас»</b> — приложение стартует сразу.</li>
  </ol>
  <div class="note">После установки ярлык появляется в меню «Пуск» → «ОТП».
    Удаление — «Параметры → Приложения → ОТП…» (ярлыки и автозапуск убираются).</div>
</section>

<section class="page">
  <span class="kicker">Первый запуск</span>
  <h2>2. Вход</h2>
  <div class="shot"><img src="{img['login.png']}" alt="Окно входа"></div>
  <div class="cap">Окно входа приложения — реальный вид программы</div>
  <ol class="steps">
    <li>Вставьте ссылку на свою страницу (её присылает руководитель) или только код из неё.
      Если ссылка в буфере обмена, она подставится сама.</li>
    <li>Введите пароль. Если сомневаетесь в опечатке — поставьте галочку <b>«показать пароль»</b>.</li>
    <li>Нажмите «Войти». Значок в трее появляется <b>только после успешного входа</b>.</li>
  </ol>
  <div class="warn">Если написано «Неверный пароль или ссылка» — в окне ошибки видно
    <b>ответ сервера</b> и <b>код страницы</b>. С этим текстом можно сразу обратиться к руководителю.</div>
</section>

<section class="page">
  <span class="kicker">Значок</span>
  <h2>3. Состояния значка</h2>
  <div class="shot"><img src="{img['tray-states-clean.png']}" alt="Состояния значка"></div>
  <div class="cap">Шесть состояний значка</div>
  <table>
    <tr><th>Цвет</th><th>Что означает</th></tr>
    <tr><td>серый</td><td>смена не начата</td></tr>
    <tr><td>зелёный</td><td>работаете</td></tr>
    <tr><td>жёлтый</td><td>перерыв</td></tr>
    <tr><td>сиреневый</td><td>обед</td></tr>
    <tr><td>голубой</td><td>временное отсутствие</td></tr>
    <tr><td>красный</td><td>нет связи с сервером</td></tr>
  </table>
  <p class="muted">Windows: значок справа внизу, может прятаться под «^». macOS: в строке меню.</p>
</section>

<section class="page">
  <span class="kicker">Работа</span>
  <h2>4. Меню, горячие клавиши, напоминания</h2>
  <p>Щелчок по значку открывает меню: <b>Начать смену</b>, <b>Техперерыв 1/2</b>, <b>Обед</b>,
    <b>Вернуться с перерыва</b>, <b>Временное отсутствие</b>, <b>Завершить смену</b>.</p>
  <p>Перед применением идёт <b>отсчёт 10 секунд</b> с кнопкой «Отмена»; повторный щелчок применяет сразу.</p>
  <h3>Горячие клавиши (Windows)</h3>
  <table>
    <tr><th>Сочетание</th><th>Действие</th></tr>
    <tr><td>Ctrl+Alt+S</td><td>начать смену</td></tr>
    <tr><td>Ctrl+Alt+B</td><td>техперерыв 1 (повторно — вернуться)</td></tr>
    <tr><td>Ctrl+Alt+L</td><td>обед (повторно — вернуться)</td></tr>
    <tr><td>Ctrl+Alt+A</td><td>временное отсутствие</td></tr>
    <tr><td>Ctrl+Alt+R</td><td>вернуться с перерыва</td></tr>
    <tr><td>Ctrl+Alt+E</td><td>завершить смену</td></tr>
  </table>
  <p>Свои сочетания: меню → <b>«Горячие клавиши…»</b>. Работают и при свёрнутом приложении.</p>
  <h3>Напоминания</h3>
  <ul>
    <li>Перерыв идёт дольше нормы (техперерыв 15 мин, обед 60, отсутствие 30) — уведомление в трее.</li>
    <li>Изменились данные на странице (график, бонусы, награды) — «Новое на странице: …».</li>
    <li>Открыт опрос по графику, а пожелания не отправлены — напоминание.</li>
  </ul>
</section>

<div class="foot">ОТП · приложение для трея · автор: Яковлев Евгений Евгеньевич</div>
</body></html>"""
    return html


def main():
    html = build_html()
    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    open(OUT_HTML, "w", encoding="utf-8", newline="").write(html)
    print("HTML:", OUT_HTML)

    if not os.path.exists(CHROME):
        print("Chrome не найден — PDF не собран")
        return 1
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={OUT_PDF}",
                    "file:///" + OUT_HTML.replace("\\", "/").replace(" ", "%20")],
                   check=False, capture_output=True)
    if os.path.exists(OUT_PDF):
        size = os.path.getsize(OUT_PDF)
        print(f"PDF: {OUT_PDF} ({size // 1024} КБ)")
        return 0
    print("PDF не создан")
    return 1


if __name__ == "__main__":
    sys.exit(main())
