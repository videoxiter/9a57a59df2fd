import sys, io
sys.path.insert(0, "video")
from synth_silero import normalize
t = "Здравствуйте. Сейчас разберём раздел Мой уровень. Уровень показывает ваш путь в профессии. Здесь видно, где вы находитесь сейчас и сколько звёзд осталось до следующей ступени."
out = "ИСХОДНЫЙ:\n" + t + "\n\nВ СИНТЕЗ:\n" + normalize(t) + "\n"
io.open("video/out/normtest.txt", "w", encoding="utf-8").write(out)
