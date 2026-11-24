# -*- coding: utf-8 -*-
"""Готовит иконки приложения из сгенерированного арта.

Источник: app/assets/app-icon-1024.png (белый фон вокруг скруглённой плашки).
Результат:
  app/assets/app-icon-512.png   — тот же знак без белого фона (прозрачный)
  app/assets/app.ico            — 16/20/24/32/48/64/128/256 для окна и установщика
  app/assets/tray-<state>.png   — значки трея 32×32 и 16×16 (6 состояний)

Запуск: python scripts/make_icons.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "app", "assets")
SRC = os.path.join(ASSETS, "app-icon-1024.png")

WHITE = 248          # всё светлее — это фон, делаем прозрачным
SIZES = [16, 20, 24, 32, 48, 64, 128, 256]

# состояние → (цвет, что рисуем)
TRAY = {
    "work":    ("#34d399", "play"),
    "break":   ("#fbbf24", "pause"),
    "lunch":   ("#a78bfa", "meal"),
    "absence": ("#38bdf8", "door"),
    "off":     ("#7f8a99", "none"),
    "offline": ("#f87171", "slash"),
}


def cut_white(img):
    """Белый фон по краям → прозрачность, обрезка по содержимому."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= WHITE and g >= WHITE and b >= WHITE:
                px[x, y] = (r, g, b, 0)
    return img.crop(img.getbbox())


def square_pad(img, margin=0.02):
    w, h = img.size
    side = int(max(w, h) * (1 + 2 * margin))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - w) // 2, (side - h) // 2), img)
    return canvas


def draw_glyph(color, kind, size=128):
    """Значок трея: цветной круг и один крупный символ состояния."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size // 2
    r = int(size * 0.44)
    fill = ImageColor = color
    if kind == "none":
        d.ellipse([c - r, c - r, c + r, c + r], outline=color, width=max(2, size // 16))
        return img
    if kind == "slash":
        d.ellipse([c - r, c - r, c + r, c + r], outline=color, width=max(2, size // 16))
        w = max(2, size // 14)
        d.line([c - r * 0.62, c - r * 0.62, c + r * 0.62, c + r * 0.62], fill=color, width=w)
        return img
    d.ellipse([c - r, c - r, c + r, c + r], fill=fill)
    white = (255, 255, 255, 255)
    if kind == "play":
        d.polygon([(c - r * 0.32, c - r * 0.45), (c + r * 0.48, c), (c - r * 0.32, c + r * 0.45)], fill=white)
    elif kind == "pause":
        bw, bh = r * 0.26, r * 0.8
        d.rectangle([c - r * 0.42, c - bh / 2, c - r * 0.42 + bw, c + bh / 2], fill=white)
        d.rectangle([c + r * 0.42 - bw, c - bh / 2, c + r * 0.42, c + bh / 2], fill=white)
    elif kind == "meal":
        # вилка (три зубца + ручка) и нож с лезвием
        fx = c - r * 0.34
        d.rectangle([fx - r * 0.05, c - r * 0.15, fx + r * 0.05, c + r * 0.5], fill=white)
        for k in (-1, 0, 1):
            tx = fx + k * r * 0.13
            d.rectangle([tx - r * 0.03, c - r * 0.5, tx + r * 0.03, c - r * 0.12], fill=white)
        d.rectangle([fx - r * 0.2, c - r * 0.2, fx + r * 0.2, c - r * 0.1], fill=white)
        kx = c + r * 0.3
        d.polygon([(kx, c + r * 0.5), (kx, c - r * 0.35), (kx + r * 0.16, c - r * 0.5), (kx + r * 0.16, c + r * 0.5)], fill=white)
    elif kind == "door":
        d.rectangle([c - r * 0.34, c - r * 0.55, c + r * 0.34, c + r * 0.55], outline=white, width=max(2, size // 22))
        d.ellipse([c + r * 0.06, c - r * 0.08, c + r * 0.2, c + r * 0.06], fill=white)
    return img


def main():
    if not os.path.exists(SRC):
        raise SystemExit("нет файла app/assets/app-icon-1024.png")
    src = cut_white(Image.open(SRC))
    big = square_pad(src).resize((512, 512), Image.LANCZOS)
    big.save(os.path.join(ASSETS, "app-icon-512.png"))
    # .ico из прозрачной версии (источник 512 — Pillow сам уменьшит до каждого размера)
    big.save(os.path.join(ASSETS, "app.ico"), sizes=[(s, s) for s in SIZES])
    # значки трея
    for state, (color, kind) in TRAY.items():
        for s in (32, 16):
            draw_glyph(color, kind, size=128).resize((s, s), Image.LANCZOS).save(
                os.path.join(ASSETS, f"tray-{state}-{s}.png"))
    print("готово: app-icon-512.png, app.ico, tray-*.png")


if __name__ == "__main__":
    main()
