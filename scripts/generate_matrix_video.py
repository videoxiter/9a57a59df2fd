# -*- coding: utf-8 -*-
"""Генерация видео-заставки «цифровой дождь» (матрица) без внешних материалов."""
import os, random, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "video")
TMP = os.path.join(ROOT, ".verify", "matrix_frames")
os.makedirs(OUT_DIR, exist_ok=True)
shutil.rmtree(TMP, ignore_errors=True)
os.makedirs(TMP, exist_ok=True)

W, H, FPS, SEC = 1280, 720, 24, 8
FRAMES = FPS * SEC
COL_W, GLYPH = 18, 18
FONT = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 17)
random.seed(7)

def ch():
    r = random.random()
    if r < .55:
        return chr(random.randint(0x30A0, 0x30FF))       # катакана
    if r < .85:
        return random.choice("0123456789")
    return random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}/\\|=+*")

cols = []
n = W // COL_W + 1
for i in range(n):
    L = random.randint(10, 26)
    cols.append({
        "x": i * COL_W,
        "speed": random.uniform(5, 20),
        "start": random.uniform(-H - L * GLYPH, H),
        "len": L,
        "chars": [ch() for _ in range(L)],
        "flick": random.uniform(0.02, 0.12),
    })

base = Image.new("RGB", (W, H), (1, 7, 4))
for f in range(FRAMES):
    img = base.copy()
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    t = f
    for c in cols:
        head = (c["start"] + t * c["speed"]) % (H + c["len"] * GLYPH) - c["len"] * GLYPH
        for k in range(c["len"]):
            y = head + k * GLYPH
            if y < -GLYPH or y > H:
                continue
            frac = 1 - k / c["len"]                      # 1 у головы, 0 у хвоста
            if k == 0:
                col = (225, 255, 235, 255)               # яркая голова
            else:
                a = int(20 + 190 * (frac ** 1.7))
                g = int(120 + 120 * frac)
                col = (30, g, 70, a)
            glyph = c["chars"][(k + (t // 6)) % c["len"]]
            d.text((c["x"], y), glyph, font=FONT, fill=col)
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    img.save(os.path.join(TMP, f"f{f:04d}.png"), compress_level=1)

print("кадров:", FRAMES)
mp4 = os.path.join(OUT_DIR, "matrix.mp4")
cmd = ["ffmpeg", "-y", "-framerate", str(FPS), "-i", os.path.join(TMP, "f%04d.png"),
       "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
       "-movflags", "+faststart", mp4]
subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("готово:", mp4, round(os.path.getsize(mp4) / 1024 / 1024, 2), "МБ")
shutil.rmtree(TMP, ignore_errors=True)
