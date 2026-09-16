#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Канал входных данных: текстовые файлы пофамильно (itogi/<Фамилия>.txt).

Руководитель выкладывает итоги месяца текстом (по одному файлу на сотрудника) в
ITOGI_DIR, скрипт разбирает блоки «ИТОГИ ЗА <МЕСЯЦ> <ГОД>» и МЕРЖИТ результат в
scripts/extracted.json (структура: {"<empId>": {"months": {"YYYY-MM": {...}}}}).

Поддерживаются оба стиля файла:
  • новый:  💰 Бонусы за … | ✅ Что получилось круто: | ❌ Зоны роста: | 🎯 Твой план …
  • старый: KPI "…": | Качество: Хорошо (7/10) | !Достоинства и сильные стороны!: | !Зоны роста!:

Запуск:
  PYTHONUTF8=1 python parse_itogi.py                 # DRY-RUN — только показать разбор
  PYTHONUTF8=1 python parse_itogi.py --write         # записать в extracted.json (с бэкапом)
  PYTHONUTF8=1 python parse_itogi.py --only Завьялов # только один файл
"""
import glob
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "scripts", "extracted.json")
ITOGI_DIR = os.environ.get("ITOGI_DIR", r"G:\LMStudio\Hermes\hermes-workspace\itogi")

sys.path.insert(0, os.path.join(ROOT, "scripts"))
from generate_data import CONTENT  # noqa: E402  (ФИО -> empId)

RU_MONTHS = {
    "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "май": 5, "мае": 5, "мая": 5,
    "июн": 6, "июл": 7, "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12,
}

METRIC_MAP = [
    (re.compile(r"качество", re.I), "quality"),
    (re.compile(r"обучаемость", re.I), "learnability"),
    (re.compile(r"инициатива", re.I), "initiative"),
    (re.compile(r"вовлеч[её]нность", re.I), "engagement"),
    (re.compile(r"требовани\w*\s+к\s+работе", re.I), "discipline"),
]

RE_BLOCK = re.compile(r"(?m)^\s*ИТОГИ ЗА\s+")
RE_HEAD = re.compile(r"^\s*([А-Яа-яЁё]+)\s+(\d{4})")
RE_SCORE = re.compile(r"(\d{1,2})\s*/\s*10")
RE_BONUS = re.compile(r"Бонусы за[^\n:]*:\s*([\d\s\u00a0]+)\s*(?:руб|₽)")
RE_MONEY = re.compile(r"▸\s*([\d\s\u00a0]+)\s*(?:руб|₽)[^\n]*?—\s*([^\n]+)")
RE_BULLET = re.compile(r"^\s*[•\-\u2022]\s+(.+)$")

SEC_STRENGTH = re.compile(
    r"^\s*(?:(?:✅|💪|🔥)\s*что\s+(?:получилось|получается)\s+круто|!\s*достоинства и сильные стороны\s*!|достоинства и сильные стороны)",
    re.I)
SEC_GROWTH = re.compile(
    r"^\s*(?:❌\s*зоны роста|!\s*зоны роста\s*!|зоны роста)", re.I)
SEC_STOP = re.compile(
    r"^\s*(?:📊|📈|📅|🎯|💬|⚠️|💡|📌|P\.S\.|Рекомендации для роста|Как прокачать|Итог|ИТОГИ ЗА|\d+\.\s)", re.I)


def read_text(path):
    for enc in ("utf-8-sig", "utf-8", "cp1251"):
        try:
            with open(path, encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def num(s):
    return int(re.sub(r"[^\d]", "", s) or 0)


def parse_block(block):
    """Один блок «ИТОГИ ЗА <МЕСЯЦ> <ГОД>» -> dict с полями месяца (только найденное)."""
    lines = block.split("\n")
    m = RE_HEAD.match(lines[0].strip())
    if not m:
        return None, None
    mon_word, year = m.group(1).lower(), int(m.group(2))
    month_idx = None
    for stem, idx in RU_MONTHS.items():
        if mon_word.startswith(stem):
            month_idx = idx
            break
    if month_idx is None:
        return None, None
    mkey = f"{year}-{month_idx:02d}"

    out = {"kpi": {}, "money": [], "positives": [], "negatives": []}
    cur = None
    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        if SEC_STRENGTH.match(s):
            cur = "positives"
            continue
        if SEC_GROWTH.match(s):
            cur = "negatives"
            continue
        if SEC_STOP.match(s):
            cur = None
            continue
        # пункты сильных сторон / зон роста
        if cur:
            b = RE_BULLET.match(s)
            if b:
                val = 1.0 if cur == "positives" else 0.5
                out[cur].append({"value": val, "text": b.group(1).strip()})
            continue
        # KPI-строка вида «• Качество: 7/10 …» или «Качество: Хорошо (7/10)»
        if "/10" in s:
            sc = RE_SCORE.search(s)
            if sc:
                for rx, key in METRIC_MAP:
                    if rx.search(s) and key not in out["kpi"]:
                        out["kpi"][key] = int(sc.group(1))
                        break

    bm = RE_BONUS.search(block)
    if bm:
        total = num(bm.group(1))
        out["bonus"] = total or None
    for amt, txt in RE_MONEY.findall(block):
        out["money"].append({"amount": num(amt), "text": txt.strip().rstrip(";")})

    # чистим: не отдаём пустые поля, чтобы мёрж не затирал уже собранные данные
    cleaned = {}
    if len(out["kpi"]) == 5:
        cleaned["kpi"] = out["kpi"]
    elif out["kpi"]:
        cleaned["kpi_partial"] = out["kpi"]
    if "bonus" in out:
        cleaned["bonus"] = out["bonus"]
    if out["money"]:
        cleaned["money"] = out["money"]
    if out["positives"]:
        cleaned["positives"] = out["positives"]
    if out["negatives"]:
        cleaned["negatives"] = out["negatives"]
    return mkey, cleaned


def parse_file(path):
    text = read_text(path)
    parts = [p for p in RE_BLOCK.split(text) if p.strip()]
    res = {}
    for p in parts:
        mkey, data = parse_block(p)
        if mkey and data:
            res[mkey] = data
    return res


def eid_by_surname(stem):
    key = stem.strip().lower()
    if not key:
        return None
    for eid, c in CONTENT.items():
        surname = c["fullName"].split()[0].lower()
        if surname.startswith(key[:5]) or key.startswith(surname[:5]):
            return eid
    return None


def main():
    write = "--write" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1].lower()

    files = sorted(glob.glob(os.path.join(ITOGI_DIR, "*.txt")))
    if not files:
        print(f"НЕТ файлов *.txt в {ITOGI_DIR}")
        return 1
    print(f"Каталог: {ITOGI_DIR}\nФайлов: {len(files)}\n" + "-" * 72)

    parsed = {}
    problems = []
    for path in files:
        stem = os.path.splitext(os.path.basename(path))[0]
        if only and not stem.lower().startswith(only[:5]):
            continue
        eid = eid_by_surname(stem)
        if not eid:
            problems.append(f"{stem}: не сопоставлен ни с одним сотрудником")
            continue
        months = parse_file(path)
        if not months:
            problems.append(f"{stem}: не найдено ни одного блока «ИТОГИ ЗА …»")
            continue
        parsed[eid] = months
        print(f"{stem} -> {eid} ({CONTENT[eid]['fullName']}): {len(months)} мес.")
        for mk in sorted(months):
            d = months[mk]
            kpi = d.get("kpi") or d.get("kpi_partial") or {}
            kpi_s = "/".join(str(kpi.get(k, "—")) for k in ("quality", "learnability", "initiative", "engagement", "discipline"))
            bonus = d.get("bonus")
            print(f"   {mk}  KPI {kpi_s}  бонус {'—' if bonus is None else f'{bonus:,} ₽'.replace(',', ' ')}"
                  f"  детали {len(d.get('money', []))}  сильных {len(d.get('positives', []))}  зон {len(d.get('negatives', []))}")
    if problems:
        print("\nПРОБЛЕМЫ:\n  " + "\n  ".join(problems))

    if not write:
        print("\nDRY-RUN: extracted.json не изменён. Для записи: --write")
        return 0

    merged = json.load(open(EXT, encoding="utf-8"))
    shutil.copy2(EXT, EXT + ".bak")
    changed = []
    for eid, months in parsed.items():
        dst = merged.setdefault(eid, {"months": {}})
        dst.setdefault("months", {})
        for mk, data in months.items():
            cur = dst["months"].get(mk, {})
            new = dict(cur)
            for k, v in data.items():
                if k == "kpi_partial":
                    base = dict(cur.get("kpi") or {})
                    base.update(v)
                    if len(base) == 5:
                        new["kpi"] = base
                    continue
                new[k] = v
            dst["months"][mk] = new
            changed.append(f"{eid}/{mk}")
    with open(EXT, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"\nЗАПИСАНО в {EXT} (бэкап: {EXT}.bak)\nОбновлено месяцев: {len(changed)} → {', '.join(changed)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
