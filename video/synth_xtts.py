"""XTTS-v2: озвучка текста голосом из образца.
Использование: python synth_xtts.py <speaker.wav> <phrases.json>
phrases.json: [{"text": "...", "out": "...wav"}]
"""
import json
import subprocess
import sys
import warnings

warnings.filterwarnings("ignore")

import torch
from TTS.api import TTS

sys.path.insert(0, __file__.rsplit("\\", 1)[0])
from synth_silero import normalize  # та же нормализация текста

FF = "C:/Users/Xiter/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe"


def main() -> None:
    speaker = sys.argv[1]
    items = json.load(open(sys.argv[2], "r", encoding="utf-8"))
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", device)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    for it in items:
        text = normalize(it["text"])
        tts.tts_to_file(
            text=text,
            speaker_wav=speaker,
            language="ru",
            file_path=it["out"],
            speed=0.95,
            temperature=0.6,
        )
        # обрезаем шум и «бурчание» по краям фразы
        raw = it["out"] + ".raw.wav"
        subprocess.run([
            FF, "-y", "-i", it["out"],
            "-af", "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.05:"
                   "stop_periods=-1:stop_threshold=-42dB:stop_silence=0.25,"
                   "afade=t=in:st=0:d=0.02",
            "-ar", "24000", "-ac", "1", raw,
        ], check=False, capture_output=True)
        import os
        if os.path.exists(raw) and os.path.getsize(raw) > 1000:
            os.replace(raw, it["out"])
        print("ok", it["out"], len(text))


if __name__ == "__main__":
    main()
