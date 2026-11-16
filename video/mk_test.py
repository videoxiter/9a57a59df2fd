import json, io
items = json.load(io.open("video/voice/t.json", encoding="utf-8"))
for spk in ["dictor", "dictor2"]:
    out = [{"text": it["text"], "out": f"video/voice/{spk}-{i}.wav"} for i, it in enumerate(items)]
    json.dump(out, io.open(f"video/voice/t-{spk}.json", "w", encoding="utf-8"), ensure_ascii=False)
print("ok")
