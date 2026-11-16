import re, io, json
h = io.open("video/out/rules/scene.html", encoding="utf-8").read()
m = re.search(r"window\.VIDEO_SCENES = (\{.*?\})\.scenes;", h, re.S)
sc = json.loads(m.group(1))["scenes"]
print("сцен:", len(sc))
print("dur:", [s.get("dur") for s in sc])
print("сумма:", round(sum(s.get("dur") or 0 for s in sc), 1))
print("с видео:", sum(1 for s in sc if s.get("video")))
