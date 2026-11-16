"""Синтез речи Silero v5 (русский) с нормализацией текста.
Вход: JSON [{text, out}] — список фраз. Аргументы: voice, sample_rate.
"""
import json
import re
import sys
import warnings

warnings.filterwarnings("ignore")

import torch
from scipy.io import wavfile

torch.set_num_threads(4)


def normalize(text: str) -> str:
    t = str(text or "")
    # тире и разделители — не должны читаться словами
    t = t.replace("—", ", ").replace("–", ", ").replace("‑", "-")
    t = t.replace("·", ", ").replace("•", ", ")
    # проценты, рубли
    t = t.replace("%", " процентов").replace("₽", " рублей")
    # сокращения
    t = re.sub(r"\bKPI\b", "кей пи ай", t)
    t = re.sub(r"\bSLA\b", "эс эл эй", t)
    t = re.sub(r"\bLVL\b", "уровень", t)
    t = re.sub(r"\bИТ\b", "ай ти", t)
    t = re.sub(r"\bтех\.\s*перерыв", "технический перерыв", t, flags=re.I)
    t = re.sub(r"\bтех\.\s*", "технический ", t, flags=re.I)
    # дроби и оценки вида 7.5 / 9.0
    t = re.sub(r"(\d)[.,]5\b", r"\1 с половиной", t)
    t = re.sub(r"(\d)[.,]0\b", r"\1", t)
    # 10/10 → десять из десяти
    t = re.sub(r"(\d+)\s*/\s*(\d+)", r"\1 из \2", t)
    # +1 → плюс один
    t = re.sub(r"\+\s*(\d+)", r"плюс \1", t)
    # время 09:00 → 09 00 (Silero прочитает как числа)
    t = re.sub(r"\b(\d{1,2}):(\d{2})\b", r"\1 \2", t)
    # убираем кавычки и лишние символы
    for ch in ['«', '»', '“', '”', '"', '(', ')', ':', ';']:
        t = t.replace(ch, " ")
    # многоточие и точки в конце фразы не читаем как слово
    t = t.replace("…", ".")
    # сжимаем пробелы и повторы запятых
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r",\s*,", ",", t)
    t = re.sub(r"\s+([,!.?])", r"\1", t)
    return t.strip()


def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "aidar"
    rate = int(sys.argv[2]) if len(sys.argv) > 2 else 48000
    items = json.load(open(sys.argv[3], "r", encoding="utf-8"))

    model, _ = torch.hub.load(
        repo_or_dir="snakers4/silero-models", model="silero_tts",
        language="ru", speaker="v5_ru", trust_repo=True,
    )
    for it in items:
        text = normalize(it["text"])
        if not text:
            text = " "
        audio = model.apply_tts(text=text, speaker=voice, sample_rate=rate)
        wavfile.write(it["out"], rate, (audio.numpy() * 32767).astype("int16"))
        print("ok", it["out"], len(text))


if __name__ == "__main__":
    main()
