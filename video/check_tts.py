"""Проверка озвучки: распознаёт сгенерированные фразы и сравнивает с текстом.
Использование: python check_tts.py phrases.json [model] [--json-out file]
phrases.json: [{"text": "...", "out": "..."}]
Пишет отчёт в video/out/tts-check.txt и, если указан, JSON со списком проблемных.
"""
import io
import json
import re
import sys

from faster_whisper import WhisperModel


NUM = {"десять": "10", "девять": "9", "восемь": "8", "семь": "7", "шесть": "6", "пять": "5",
       "четыре": "4", "три": "3", "два": "2", "две": "2", "один": "1", "одну": "1", "первый": "1", "второй": "2"}


def words(t: str):
    t = t.lower().replace("ё", "е").replace("+", "")
    t = " ".join(NUM.get(w, w) for w in t.split())
    t = re.sub(r"[^а-яa-z0-9\s]", " ", t)
    return [w for w in t.split() if w]


def main() -> None:
    args = [a for a in sys.argv[1:]]
    json_out = None
    if "--json-out" in args:
        k = args.index("--json-out")
        json_out = args[k + 1]
        del args[k:k + 2]
    path = args[0]
    model_size = args[1] if len(args) > 1 else "small"
    items = json.load(open(path, "r", encoding="utf-8"))
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    report = []
    bad_idx = []
    for i, it in enumerate(items):
        segs, _ = model.transcribe(it["out"], language="ru", beam_size=1, vad_filter=False)
        heard = " ".join(s.text.strip() for s in segs).strip()
        a, b = words(it["text"]), words(heard)
        pool = list(b)
        inter = 0
        for w in a:
            if w in pool:
                pool.remove(w)
                inter += 1
        acc = inter / max(1, len(a))
        item = {"i": i, "acc": round(acc * 100), "text": it["text"], "heard": heard}
        report.append(item)
        if acc < 0.85:
            bad_idx.append(i)

    lines = []
    for r in report:
        if r["acc"] < 85:
            lines.append(f"!! [{r['i']}] {r['acc']}%  исходник: {r['text']}")
            lines.append(f"        услышано: {r['heard']}")
    lines.append(f"\nпроверено фраз: {len(items)}, проблемных: {len(bad_idx)}")
    io.open("video/out/tts-check.txt", "w", encoding="utf-8").write("\n".join(lines))
    if json_out:
        io.open(json_out, "w", encoding="utf-8").write(json.dumps({"bad": bad_idx, "report": report}, ensure_ascii=False))
    print(f"проверено: {len(items)}, проблемных: {len(bad_idx)}")


if __name__ == "__main__":
    main()
