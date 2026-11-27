# -*- coding: utf-8 -*-
"""Сборка видеоинструкции по приложению ОТП.

Что делает:
  1) синтезирует озвучку по сценам (ru-RU нейроголос, мужской);
  2) рисует кадры 1920x1080 (30 fps): тёмный фон в стиле сайта, скриншот окна,
     анимированный курсор с жёлтым свечением, подсветка кнопок, подписи;
  3) собирает музыку (pad) с ducking под речь и SFX кликов;
  4) кодирует MP4 через ffmpeg.

Запуск: python scripts/make_video.py [--fast]
Результат: video/ОТП-инструкция.mp4
"""
import argparse
import asyncio
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "video")
FRAMES = os.path.join(OUT_DIR, "frames")
AUDIO = os.path.join(OUT_DIR, "audio")
SHOT = os.path.join(ROOT, "docs", "images", "app-main.png")

W, H, FPS = 1920, 1080, 30
BG = (7, 11, 17)
CARD = (13, 21, 30)
ACCENT = (34, 211, 238)
TEXT = (232, 237, 245)
DIM = (159, 176, 197)
WARN = (248, 113, 113)

FONT_DIR = r"C:\Windows\Fonts"
F_BOLD = os.path.join(FONT_DIR, "segoeuib.ttf")
F_REG = os.path.join(FONT_DIR, "segoeui.ttf")
F_SEMI = os.path.join(FONT_DIR, "seguisb.ttf")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ffmpeg из общего каталога инструментов не может писать файлы (политика песочницы),
# поэтому работаем копией внутри проекта
FFMPEG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "video", "ffmpeg_local.exe")
FFPROBE = "ffprobe"


def ffmpeg_path():
    """Проверяем, что локальная копия ffmpeg на месте."""
    global FFMPEG
    if os.path.exists(FFMPEG):
        return
    for exe in ("ffmpeg", os.path.join("bin", "ffmpeg.exe")):
        try:
            subprocess.run([exe, "-version"], capture_output=True, check=True)
            FFMPEG = exe
            return
        except Exception:
            continue


def run(cmd):
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(f"{cmd[0]} -> {p.returncode}: {p.stderr.decode('utf-8', 'replace')[:600]}")


def fnt(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


# ------------------------------------------------------------------ озвучка --
# Голос берём в локальном Speech Studio (OpenAI-совместимый API на этом компьютере).
SPEECH_BASE = os.environ.get("SPEECH_STUDIO_URL", "http://127.0.0.1:8797/v1")
SPEECH_VOICE = os.environ.get("SPEECH_STUDIO_VOICE", "Евгений Яковлев")
SPEECH_MODEL = os.environ.get("SPEECH_STUDIO_MODEL", "tts-1")

CN = {
    "voice": "ru-RU-DmitryNeural",
    "rate": "-3%",
    "pitch": "-2Hz",
}


def synth_studio(text: str, path: str, timeout: int = 600):
    """Речь через локальный Speech Studio (тот же текст, профиль «Евгений Яковлев»)."""
    import json
    import urllib.request
    body = json.dumps({
        "model": SPEECH_MODEL,
        "voice": SPEECH_VOICE,
        "input": text,
        "response_format": "mp3",
    }).encode("utf-8")
    req = urllib.request.Request(SPEECH_BASE + "/audio/speech", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    if len(data) < 2000:
        raise RuntimeError("пустой ответ синтеза")
    with open(path, "wb") as f:
        f.write(data)


async def tts(text, path):
    """Резервный вариант — тот же нейроголос через открытый синтезатор."""
    import edge_tts
    comm = edge_tts.Communicate(text, CN["voice"], rate=CN["rate"], pitch=CN["pitch"])
    await comm.save(path)


def synth(text, path):
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return
    try:
        synth_studio(text, path)
    except Exception as e:
        print(f"    Speech Studio недоступен ({e}); беру резервный голос")
        asyncio.run(tts(text, path))


def warmup():
    """Первый запрос грузит модель — делаем его заранее, коротким текстом."""
    try:
        probe = os.path.join(AUDIO, "warmup.mp3")
        if not (os.path.exists(probe) and os.path.getsize(probe) > 1000):
            synth_studio("Проверка.", probe, timeout=900)
        print("  Speech Studio готов:", SPEECH_VOICE)
    except Exception as e:
        print("  Speech Studio недоступен, будет резервный голос:", e)


def dur(path):
    p = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    try:
        return float(p.stdout.strip())
    except Exception:
        return 3.0


def to_wav(src, dst):
    run([FFMPEG, "-y", "-i", src, "-ar", "48000", "-ac", "1", dst])


def read_wav(path):
    with wave.open(path, "rb") as w:
        n = w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
        return data, w.getframerate()


# -------------------------------------------------------------- изображения --
def backdrop(w=W, h=H):
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(0, h, 48):
        d.line([(0, i), (w, i)], fill=(255, 255, 255, 5))
    for i in range(0, w, 48):
        d.line([(i, 0), (i, h)], fill=(255, 255, 255, 5))
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w * 0.55, -h * 0.5, w * 1.25, h * 0.55], fill=(34, 211, 238, 16))
    gd.ellipse([-w * 0.25, h * 0.55, w * 0.45, h * 1.4], fill=(34, 211, 238, 10))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    return img.convert("RGB")


def rounded(img_layer, box, radius, fill, outline=None, width=2):
    d = ImageDraw.Draw(img_layer)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shot_image():
    """Скриншот окна на карточке с тенью."""
    base = backdrop()
    shot = Image.open(SHOT).convert("RGB")
    scale = min(0.86, 900 / shot.height)
    shot = shot.resize((int(shot.width * scale), int(shot.height * scale)), Image.LANCZOS)
    x = (W - shot.width) // 2
    y = (H - shot.height) // 2 + 20
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([x - 14, y - 14, x + shot.width + 14, y + shot.height + 14],
                         radius=26, fill=(13, 21, 30, 255), outline=(30, 43, 58, 255), width=2)
    shadow = card.filter(ImageFilter.GaussianBlur(28))
    base = Image.alpha_composite(base.convert("RGBA"), shadow)
    base = Image.alpha_composite(base, card)
    base.paste(shot, (x, y))
    return base.convert("RGB"), (x, y, x + shot.width, y + shot.height)


def cursor(scale=1.0):
    img = Image.new("RGBA", (74, 74), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [(10, 8), (10, 52), (22, 42), (30, 60), (38, 56), (30, 38), (46, 36)]
    d.polygon(pts, fill=(255, 214, 10, 255), outline=(20, 20, 20, 255))
    glow = Image.new("RGBA", (74, 74), (0, 0, 0, 0))
    ImageDraw.Draw(glow).polygon([(p[0] - 1, p[1] - 1) for p in pts], fill=(255, 196, 0, 190))
    glow = glow.filter(ImageFilter.GaussianBlur(9))
    out = Image.alpha_composite(glow, img)
    if scale != 1.0:
        out = out.resize((int(74 * scale), int(74 * scale)), Image.LANCZOS)
    return out


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def bezier(p0, p1, p2, t):
    x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
    y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
    return x, y


def wrap(d, text, font, width):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        probe = (cur + " " + w).strip()
        if d.textlength(probe, font=font) <= width:
            cur = probe
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_caption(img, text, subtitle=None):
    d = ImageDraw.Draw(img, "RGBA")
    f1 = fnt(F_SEMI, 44)
    f2 = fnt(F_REG, 30)
    lines = wrap(d, text, f1, W - 260)
    bar_h = 40 + len(lines) * 54 + (54 if subtitle else 0)
    y0 = H - bar_h - 64
    d.rounded_rectangle([70, y0, W - 70, y0 + bar_h], radius=22, fill=(8, 14, 20, 232),
                        outline=(34, 48, 64, 255), width=2)
    d.rounded_rectangle([70, y0, 78, y0 + bar_h], radius=4, fill=ACCENT)
    y = y0 + 22
    for line in lines:
        d.text((104, y), line, font=f1, fill=TEXT)
        y += 54
    if subtitle:
        d.text((104, y + 10), subtitle, font=f2, fill=DIM)


def draw_badge(img, label, x=70, y=44, accent=ACCENT):
    d = ImageDraw.Draw(img, "RGBA")
    f = fnt(F_SEMI, 30)
    tw = d.textlength(label, font=f)
    d.rounded_rectangle([x, y, x + tw + 46, y + 54], radius=27, fill=(13, 21, 30, 235),
                        outline=accent, width=2)
    d.ellipse([x + 16, y + 21, x + 30, y + 35], fill=accent)
    d.text((x + 40, y + 11), label, font=f, fill=TEXT)


def highlight(img, box, t, color=ACCENT):
    """Пульсирующая рамка вокруг целевой кнопки."""
    d = ImageDraw.Draw(img, "RGBA")
    pulse = 0.55 + 0.45 * math.sin(t * 6.0)
    a = int(140 + 100 * pulse)
    d.rounded_rectangle(box, radius=14, outline=color + (a,), width=4)
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle(box, radius=14, outline=color + (90,), width=14)
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(glow) if img.mode == "RGBA" else None


def ripple(img, center, progress):
    if progress <= 0 or progress >= 1:
        return
    d = ImageDraw.Draw(img, "RGBA")
    r = 12 + 70 * progress
    a = int(200 * (1 - progress))
    d.ellipse([center[0] - r, center[1] - r, center[0] + r, center[1] + r],
              outline=(255, 214, 10, a), width=4)
    r2 = 6 + 40 * progress
    d.ellipse([center[0] - r2, center[1] - r2, center[0] + r2, center[1] + r2],
              outline=(34, 211, 238, max(0, a - 60)), width=2)


# ------------------------------------------------------------------ сцены ----
# каждая сцена: длительность, подпись, подзаголовок, текст, движения курсора
def build_scenes():
    return [
        {"id": "intro", "text": "Здравствуйте! Это короткая инструкция по приложению ОТП для Windows. "
                                "Покажу, как отмечать смену, перерывы и обед.",
         "title": "ОТП для Windows", "sub": "Пошаговая инструкция", "min": 8.0},
        {"id": "open", "text": "Приложение живёт в трее. Двойной клик по значку открывает главное окно, "
                               "правый клик — меню.",
         "cap": "Двойной клик по значку в трее", "sub": "Правый клик — меню приложения", "min": 11.0},
        {"id": "start", "text": "Нажмите «Начать смену». Таймер пойдёт сразу, а норма дня — семь часов тридцать минут.",
         "cap": "Начать смену", "sub": "Таймер идёт, норма дня — 07:30", "min": 11.0},
        {"id": "break", "text": "Нажали «Техперерыв» — время встало на паузу. Так же работает обед. "
                                "Возврат — той же кнопкой: «Вернуться с обеда».",
         "cap": "Техперерыв → Обед → Вернуться с обеда", "sub": "На паузе время не засчитывается", "min": 15.0},
        {"id": "absence", "text": "Появился вопрос: отсутствие. Выберите причину. Без заявки — время продолжает идти, "
                                  "с причиной — пауза.",
         "cap": "Временное отсутствие", "sub": "«Без заявки» — время идёт", "min": 12.0},
        {"id": "stop", "text": "Завершить смену — время зафиксируется. Если до конца дня смена не закрыта, "
                               "она закроется сама в 23:59.",
         "cap": "Завершить смену", "sub": "Забытая смена закроется в 23:59", "min": 11.0},
        {"id": "poll", "text": "Открыт опрос — плашка красная, а на значке точка. Нажмите «Заполнить» и отметьте дни. "
                               "Подробные показатели — на сайте «Мои результаты».",
         "cap": "Опрос по графику", "sub": "Красная плашка и точка на значке", "min": 13.0},
        {"id": "outro", "text": "Спасибо за просмотр. Удачной работы!",
         "title": "Теперь вы знаете основы!", "sub": "Вопросы — в поддержку ОТП", "min": 9.0},
    ]


# ---------------------------------------------------------------- навигация --
def window_boxes(rect):
    """Координаты кнопок в кадре (по скриншоту окна 636x779, масштаб от rect)."""
    x0, y0, x1, y1 = rect
    sw, sh = x1 - x0, y1 - y0
    sx, sy = sw / 636.0, sh / 779.0

    def b(cx, cy, w, h):
        return [x0 + (cx - w / 2) * sx, y0 + (cy - h / 2) * sy,
                x0 + (cx + w / 2) * sx, y0 + (cy + h / 2) * sy]

    return {
        "start": b(165, 333, 250, 50),
        "finish": b(470, 333, 250, 50),
        "tech1": b(165, 388, 250, 40),
        "tech2": b(470, 388, 250, 40),
        "lunch": b(165, 429, 250, 40),
        "absence": b(470, 429, 250, 40),
        "return": b(318, 484, 600, 40),
        "poll_fill": b(575, 150, 90, 30),
        "timer": b(300, 210, 300, 80),
    }


def scene_frames(scene, idx, total, rect, path_writer):
    fps = FPS
    n = int(round(scene["duration"] * fps))
    boxes = window_boxes(rect)
    cur = cursor(1.0)
    for i in range(n):
        t = i / fps
        prog = t / max(0.001, scene["duration"])
        img = scene["bg"].copy().convert("RGBA")

        if scene["id"] == "intro":
            k = ease(min(1.0, t / 1.2))
            zoom = 1.0 + 0.06 * prog
            base = scene["bg"].resize((int(W * zoom), int(H * zoom)), Image.LANCZOS)
            img = base.crop(((base.width - W) // 2, (base.height - H) // 2,
                             (base.width - W) // 2 + W, (base.height - H) // 2 + H)).convert("RGBA")
            d = ImageDraw.Draw(img, "RGBA")
            d.text((120, 380), scene["title"], font=fnt(F_BOLD, 118), fill=TEXT)
            d.text((126, 520), scene["sub"], font=fnt(F_REG, 52), fill=DIM)
            d.rounded_rectangle([120, 620, 120 + int(320 * k), 628], radius=4, fill=ACCENT)
            path_writer(i, img.convert("RGB"))
            continue

        if scene["id"] == "outro":
            d = ImageDraw.Draw(img, "RGBA")
            d.text((120, 400), scene["title"], font=fnt(F_BOLD, 96), fill=TEXT)
            d.text((126, 530), scene["sub"], font=fnt(F_REG, 46), fill=DIM)
            d.rounded_rectangle([120, 620, 420, 628], radius=4, fill=ACCENT)
            if prog > 0.55:
                d.text((120, 700), "videoxiter.github.io/9a57a59df2fd", font=fnt(F_REG, 30), fill=DIM)
            path_writer(i, img.convert("RGB"))
            continue

        target = {"open": "timer", "start": "start", "break": "lunch",
                  "absence": "absence", "stop": "finish", "poll": "poll_fill"}[scene["id"]]
        box = boxes[target]

        # зум на важной области: к середине сцены приближаемся к целевой кнопке
        z = 1.0 + 0.16 * math.sin(math.pi * min(1.0, prog * 1.1))
        cx = (box[0] + box[2]) / 2
        cy = (box[1] + box[3]) / 2
        W2, H2 = int(W * z), int(H * z)
        base = scene["bg"].resize((W2, H2), Image.LANCZOS)
        left = max(0, min(W2 - W, int(cx * z - W / 2)))
        top = max(0, min(H2 - H, int(cy * z - H / 2)))
        img = base.crop((left, top, left + W, top + H)).convert("RGBA")
        # пересчитываем координаты бокса под зум (для рамки и курсора)
        def zx(x):
            return (x * z - left)
        box = [zx(box[0]), box[1] * z - top, zx(box[2]), box[3] * z - top]

        # курсор: движение к цели, клик на 55% времени, возврат в покой
        p0 = (W * 0.82, H * 0.86)
        p2 = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        p1 = ((p0[0] + p2[0]) / 2 + 120, min(p0[1], p2[1]) - 160)
        if prog < 0.25:
            pos = p0
        elif prog < 0.55:
            k = ease((prog - 0.25) / 0.30)
            pos = bezier(p0, p1, p2, k)
        else:
            pos = p2

        if scene["id"] == "break" and prog > 0.62:
            b2 = boxes["return"]
            q2 = ((b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2)
            k = ease(min(1.0, (prog - 0.62) / 0.22))
            pos = (p2[0] + (q2[0] - p2[0]) * k, p2[1] + (q2[1] - p2[1]) * k)
            box = b2

        highlight(img, box, t)
        if 0.55 <= prog < 0.70:
            ripple(img, ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), (prog - 0.55) / 0.15)

        draw_badge(img, "ОТП — учёт рабочего времени")
        draw_caption(img, scene["cap"], scene["sub"])

        img.alpha_composite(cur, (int(pos[0]) - 10, int(pos[1]) - 8))
        path_writer(i, img.convert("RGB"))


# ------------------------------------------------------------------- звук ----
def music_bed(total, sr=48000):
    n = int(total * sr)
    t = np.arange(n) / sr
    # аккордовая подложка: Am – F – C – G, по 4 секунды
    chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63),
              (261.63, 329.63, 392.0), (196.0, 246.94, 293.66)]
    out = np.zeros(n, dtype=np.float32)
    step = 4.0
    for i in range(int(total / step) + 1):
        ch = chords[i % len(chords)]
        a, b = int(i * step * sr), min(n, int((i + 1) * step * sr))
        if a >= n:
            break
        seg = np.zeros(b - a, dtype=np.float32)
        lt = np.arange(b - a) / sr
        env = np.minimum(1.0, lt / 0.9) * np.minimum(1.0, (len(lt) / sr - lt) / 0.9 + 1e-3)
        for f in ch:
            for h in (1, 2, 3):
                seg += np.sin(2 * np.pi * f * h * lt) * (0.10 / h)
        out[a:b] += seg * env.astype(np.float32)
    out *= 0.30 / max(1e-6, np.max(np.abs(out)))
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.08 * t)
    return (out * lfo).astype(np.float32)


def sfx_click(sr=48000, ms=90):
    n = int(sr * ms / 1000)
    t = np.arange(n) / sr
    noise = np.random.RandomState(1).randn(n).astype(np.float32) * np.exp(-t * 60)
    tone = np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 40) * 0.5
    s = (noise * 0.5 + tone).astype(np.float32)
    return s * 0.5 / max(1e-6, np.max(np.abs(s)))


def sfx_chime(sr=48000, ms=700):
    n = int(sr * ms / 1000)
    t = np.arange(n) / sr
    s = (np.sin(2 * np.pi * 880 * t) * 0.4 + np.sin(2 * np.pi * 1320 * t) * 0.25) * np.exp(-t * 3.2)
    return (s / max(1e-6, np.max(np.abs(s))) * 0.7).astype(np.float32)


def place(buf, clip, at_sec, sr=48000, gain=1.0):
    a = int(at_sec * sr)
    b = min(len(buf), a + len(clip))
    if a >= len(buf):
        return
    buf[a:b] += clip[:b - a] * gain


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fast", action="store_true", help="быстрая сборка (ниже качество)")
    args = ap.parse_args()

    ffmpeg_path()
    os.makedirs(FRAMES, exist_ok=True)
    os.makedirs(AUDIO, exist_ok=True)
    for f in os.listdir(FRAMES):
        os.remove(os.path.join(FRAMES, f))

    warmup()
    scenes = build_scenes()
    bg_base, rect = shot_image()
    bg_clean = backdrop()

    # 1) озвучка
    narr = []
    for sc in scenes:
        mp3 = os.path.join(AUDIO, sc["id"] + ".mp3")
        wav = os.path.join(AUDIO, sc["id"] + ".wav")
        synth(sc["text"], mp3)
        to_wav(mp3, wav)
        narr.append((wav, dur(wav)))
        print(f"  озвучка {sc['id']}: {narr[-1][1]:.1f} c")

    # 2) длительности
    for sc, (wav, d) in zip(scenes, narr):
        sc["wav"] = wav
        sc["narration"] = d
        sc["duration"] = max(sc["min"], d + 2.2)
        sc["bg"] = bg_clean if sc["id"] in ("intro", "outro") else bg_base

    total = sum(s["duration"] for s in scenes)
    print(f"  длительность: {total:.1f} c")

    # 3) кадры
    idx = 0
    def writer(i, img):
        nonlocal idx
        img.save(os.path.join(FRAMES, f"{idx:05d}.png"))
        idx += 1
        if idx % 150 == 0:
            print(f"  кадров: {idx}")

    for si, sc in enumerate(scenes):
        scene_frames(sc, si, total, rect, writer)

    # 4) звук
    sr = 48000
    mix = music_bed(total, sr)
    # ducking: приглушаем музыку под речь
    gain = np.ones(int(total * sr), dtype=np.float32)
    click = sfx_click(sr)
    chime = sfx_chime(sr)
    pos = 0.0
    for sc in scenes:
        w, d = read_wav(sc["wav"])
        place(mix, w * 1.0, pos + 0.25, sr, gain=1.0)
        a = int((pos + 0.25) * sr)
        b = min(len(gain), a + len(w))
        gain[a:b] = np.minimum(gain[a:b], 0.42)      # ~ -7.5 дБ на речи
        # SFX: клик в сцене с кликом, уведомление в конце
        place(mix, click, pos + sc["duration"] * 0.55, sr, gain=0.35)
        if sc["id"] in ("poll", "outro"):
            place(mix, chime, pos + 0.4, sr, gain=0.30)
        pos += sc["duration"]
    # плавные края
    fade = int(0.8 * sr)
    gain[:fade] *= np.linspace(0.5, 1.0, fade, dtype=np.float32)
    gain[-int(2.5 * sr):] *= np.linspace(1.0, 0.0, int(2.5 * sr), dtype=np.float32)
    mix = mix * gain
    mix = np.clip(mix, -1.0, 1.0)
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(os.path.join(AUDIO, "mix.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())

    # 5) кодирование
    out = os.path.join(OUT_DIR, "ОТП-инструкция.mp4")
    crf = "26" if args.fast else "20"
    run([FFMPEG, "-y", "-framerate", str(FPS), "-i", os.path.join(FRAMES, "%05d.png"),
         "-i", os.path.join(AUDIO, "mix.wav"),
         "-c:v", "libx264", "-preset", "medium" if not args.fast else "veryfast",
         "-crf", crf, "-pix_fmt", "yuv420p", "-profile:v", "high",
         "-c:a", "aac", "-b:a", "192k", "-shortest",
         "-movflags", "+faststart", out])
    print("готово:", out)


if __name__ == "__main__":
    main()
