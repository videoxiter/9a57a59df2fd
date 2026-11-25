# -*- coding: utf-8 -*-
"""Рисует читаемую схему состояний значка для инструкции.

Мелкие подписи на служебной картинке `tray-states.png` нечитаемы в PDF,
поэтому собираем свою: крупные значки + текст подписями в стиле сайта.

Запуск: python scripts/make_states_image.py
Результат: docs/images/tray-states-clean.png
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "app", "tray", "icons")
OUT = os.path.join(ROOT, "docs", "images", "tray-states-clean.png")

STATES = [
    ("tray-work-32.png", "работа", "#22c55e"),
    ("tray-break-32.png", "перерыв", "#facc15"),
    ("tray-lunch-32.png", "обед", "#a78bfa"),
    ("tray-absence-32.png", "отсутствие", "#38bdf8"),
    ("tray-off-32.png", "смена не начата", "#94a3b8"),
    ("tray-offline-32.png", "нет связи", "#f87171"),
]

W, H = 1500, 420
BG = (7, 11, 17)
TEXT = (232, 237, 245)
MUTED = (159, 176, 197)
ICON = 120
GAP = (W - len(STATES) * ICON) // (len(STATES) + 1)


def font(size, bold=False):
    for name in (("segoeuib.ttf" if bold else "segoeui.ttf"), "arialbd.ttf" if bold else "arial.ttf"):
        p = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", name)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def main():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    f_cap = font(24)
    f_head = font(22, bold=True)
    d.text((40, 26), "Состояния значка в трее", font=font(28, bold=True), fill=TEXT)
    y = 110
    for i, (fn, label, color) in enumerate(STATES):
        x = GAP + i * (ICON + GAP)
        src = os.path.join(ICONS, fn)
        if os.path.exists(src):
            icon = Image.open(src).convert("RGBA").resize((ICON, ICON), Image.LANCZOS)
            img.paste(icon, (x, y), icon)
        else:
            d.ellipse((x, y, x + ICON, y + ICON), outline=color, width=6)
        # подпись по центру под значком
        tw = d.textlength(label, font=f_cap)
        d.text((x + (ICON - tw) / 2, y + ICON + 18), label, font=f_cap, fill=TEXT)
    d.text((40, H - 46), "Windows: значок справа внизу (может быть скрыт под «^») · macOS: в строке меню",
           font=f_head, fill=MUTED)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT)
    print("готово:", OUT, img.size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
