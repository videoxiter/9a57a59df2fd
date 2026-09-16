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
RE_NUM_ITEM = re.compile(r"^\s*\d{1,2}[.)]\s+")

# --- секции руководителя: помесячный план роста и напутствие ---
# хвостовые «украшения» менеджера («!:», «!:!») допускаем: [\s!:—–-]*$
RE_PLAN_SEC = re.compile(
    r"^\s*(?:🎯\s*)?(?:твой\s+)?план\s+на\s+(?P<t>[^:!]{2,90}?)[\s!:—–-]*$", re.I)
RE_REC_SEC = re.compile(
    r"^\s*[!\s]*рекомендации\s+для\s+роста[\s!:—–-]*$", re.I)
RE_MENT_SEC = re.compile(r"^\s*(?:💬\s*)?напутствие[\s!:—–-]*$", re.I)
RE_DEADLINE = re.compile(r"^\s*(?:дедлайн|срок|крайний срок)\b", re.I)
# абзац письма внутри секции плана (когда руководитель не поставил «💬 Напутствие:»)
RE_MENT_START = re.compile(
    r"^(?:Если\b|После\b|Действуй\b|Ты\b|Мы\b|Так держать|Но\b|Помни\b|Сейчас\b|Давай\b|"
    r"Двигаемся\b|Впереди\b|Жду\b|Надеюсь\b|Покажи\b|Значит\b|У тебя\b|Вперёд\b|Поздравляю\b|"
    r"Отдельно\b|Кстати\b|Хватит\b|Верю\b|Уверен\b|Я вижу\b|Я знаю\b|Никогда\b)", re.I)
# «Название — пояснение»: короткий фрагмент до тире = пояснение к шагу с тем же названием
RE_DASH_DEF = re.compile(r"^(.{3,32}?)\s+[—–-]\s+")
RE_RESULT = re.compile(r"^\s*твой\s+результат\s*[:—-]\s*", re.I)
RE_RESULT_IN = re.compile(r"\s*твой\s+результат\s*[:—-]\s*", re.I)
# начало письма-напутствия: обращение по имени («Андрей, …») или явные маркеры
RE_ADDRESS = re.compile(
    r"^(?:[^\wА-Яа-яЁё]{0,4}\s*)?(?:важно\b|запомни\b|на one-to-one\b|[А-ЯЁ][а-яё]{2,12}\s*,)",
    re.I)
RE_MENT_HINT = re.compile(
    r"я верю в тебя|давай честно|давай поговорим|давай смотреть правде|хватайся за него|"
    r"не как исполнитель", re.I)
# служебные строки вне секций — в напутствие не берём
RE_SKIP_LINE = re.compile(
    r"^\s*(?:👤|💡|▸|\+|p\.s\.|📅|📈|📊|🏆|💰|kpi|качество:|обучаемость:|инициатива:|"
    r"вовлеч|требовани|итого|бонус)", re.I)

SEC_STRENGTH = re.compile(
    r"^\s*(?:(?:✅|💪|🔥)\s*что\s+(?:получилось|получается)\s+круто|!\s*достоинства и сильные стороны\s*!|достоинства и сильные стороны)",
    re.I)
SEC_GROWTH = re.compile(
    r"^\s*(?:❌\s*зоны роста|!\s*зоны роста\s*!|зоны роста)", re.I)
SEC_STOP = re.compile(
    r"^\s*(?:📊|📈|📅|🎯|💬|⚠️|💡|📌|P\.S\.|Рекомендации для роста|Как прокачать|Итог|ИТОГИ ЗА|\d+\.\s)", re.I)
# тот же стоп-список, но БЕЗ нумерованных пунктов: внутри секции плана «1. …» — это шаг
RE_STOP_STRICT = re.compile(
    r"^\s*(?:📊|📈|📅|🎯|💬|⚠️|💡|📌|P\.S\.|Как прокачать|Итог|ИТОГИ ЗА)", re.I)


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


def _split_step(text):
    """Шаг плана -> {"title", "text", "result"}.

    «Разработать концепцию … . Провести аудит … Твой результат: документ или схема.»
    -> title = первое предложение, text = остальное, result = после «Твой результат:».
    Заголовок режется по границе предложения/двоеточия ВНЕ кавычек «…» и скобок.
    """
    t = text.strip()
    parts = RE_RESULT_IN.split(t, maxsplit=1)
    body = parts[0].strip()
    result = parts[1].strip() if len(parts) > 1 else ""
    cut, inq, ins = None, False, 0
    for i, ch in enumerate(body):
        if ch == "«":
            inq = True
        elif ch == "»":
            inq = False
        elif ch == "(":
            ins += 1
        elif ch == ")":
            ins = max(0, ins - 1)
        elif not inq and ins == 0 and i + 1 < len(body) and body[i + 1] == " ":
            if ch in ".!?":
                cut = i
                break
            if ch == ":" and i >= 12:
                cut = i
                break
    if cut is not None and cut >= 8:
        title, rest = body[:cut].strip(), body[cut + 1:].strip()
    else:
        title, rest = (body if len(body) <= 160 else body[:160].rsplit(" ", 1)[0] + "…"), ""
    if len(title) > 170:
        title = title[:170].rsplit(" ", 1)[0] + "…"
    return {"title": title, "text": rest, "result": result}


def _ends_sentence(step):
    tail = (step.get("text") or step.get("title") or "").strip()
    return bool(tail) and tail[-1] in ".!?»)\""


def _norm_plan_title(t):
    """«Сентябрь 2026 (3 шага)» -> «Твой план на Сентябрь 2026».

    None, если в «заголовок» попала фраза письма (длинная, с точкой) —
    такой план-тайтл не должен затирать настоящий заголовок плана.
    """
    t = (t or "").strip()
    t = re.sub(r"\s*[—–-]\s*(?:обязательн\w*|рекоменд\w*)\s*:?\s*$", "", t, flags=re.I)
    t = t.strip(" .:;-—–")
    t = re.sub(r"\s*[\(\[]\s*[^()\[\]]{0,30}?\s*[\)\]]\s*$", "", t, flags=re.I)
    t = t.strip(" .:;-—–")
    if not t or len(t) > 46 or "." in t:
        return None
    return "Твой план на " + t


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

    out = {"kpi": {}, "money": [], "positives": [], "negatives": [],
           "plan_steps": [], "rec_steps": [], "ment": []}
    plan_title = None
    cur = None           # positives | negatives | plan | recs | ment
    ment_group = False   # идёт письмо-напутствие
    ment_from_plan = False  # письмо началось посреди плана (может вернуться к шагам)
    ment_bucket = "plan_steps"

    stripped = [s.strip() for s in lines]

    def next_nonempty(i):
        for j in range(i + 1, len(stripped)):
            if stripped[j]:
                return stripped[j]
        return None

    def flush_step(text, bucket):
        text = re.sub(r"^\s*\d{1,2}[.)]\s+", "", text).strip()
        if text:
            out[bucket].append(_split_step(text))

    def last_of(bucket):
        return out[bucket][-1] if out[bucket] else None

    for i, raw in enumerate(lines):
        s = raw.strip()
        if not s:
            continue
        # --- заголовки секций ---
        if RE_MENT_SEC.match(s):
            cur, ment_group, ment_from_plan = "ment", True, False
            continue
        if RE_PLAN_SEC.match(s):
            cur, ment_group, ment_from_plan = "plan", False, False
            plan_title = _norm_plan_title(RE_PLAN_SEC.match(s).group("t")) or plan_title
            continue
        if RE_REC_SEC.match(s):
            cur, ment_group, ment_from_plan = "recs", False, False
            continue
        if SEC_STRENGTH.match(s):
            cur, ment_group = "positives", False
            continue
        if SEC_GROWTH.match(s):
            cur, ment_group = "negatives", False
            continue

        # --- внутри плана/рекомендаций: разбираем ДО общего стоп-списка,
        #     иначе нумерованные пункты «1. …» съедались как служебные строки ---
        if cur in ("plan", "recs"):
            bucket = "plan_steps" if cur == "plan" else "rec_steps"
            if RE_STOP_STRICT.match(s):
                cur, ment_group, ment_from_plan = None, False, False
                continue
            if RE_ADDRESS.match(s) or RE_MENT_HINT.search(s[:130]) or RE_MENT_START.match(s):
                cur, ment_group, ment_from_plan = "ment", True, True
                ment_bucket = bucket
                out["ment"].append(s)
                continue
            if RE_RESULT.match(s):
                st = last_of(bucket)
                if st is not None:
                    st["result"] = RE_RESULT.sub("", s).strip()
                continue
            # «Дедлайн: 25.08.» отдельной строкой — это хвост предыдущего шага, не шаг
            if RE_DEADLINE.match(s):
                st = last_of(bucket)
                if st is not None:
                    if st.get("result"):
                        st["result"] = (st["result"].rstrip() + " " + s).strip()
                    else:
                        st["text"] = ((st.get("text") or "") + " " + s).strip()
                continue
            if RE_NUM_ITEM.match(s) or RE_BULLET.match(s):
                b = RE_BULLET.match(s)
                flush_step(b.group(1) if b else s, bucket)
                continue
            # «Фиксик 2.0 — пояснение» — не новый шаг, а пояснение к одноимённому шагу
            dm = RE_DASH_DEF.match(s)
            if dm and out[bucket]:
                frag = dm.group(1).strip().strip("«»\"'").lower()
                target = None
                if len(frag) >= 5:
                    for cand in out[bucket]:
                        if frag in cand["title"].lower():
                            target = cand
                            break
                st = target or out[bucket][-1]
                st["text"] = ((st.get("text") or "") + (" " if st.get("text") else "") + s).strip()
                continue
            st = last_of(bucket)
            if st is not None and not st.get("result") and not _ends_sentence(st):
                st["text"] = (st["text"] + " " + s).strip()   # продолжение шага
                continue
            flush_step(s, bucket)
            continue

        if cur != "ment" and SEC_STOP.match(s):
            cur, ment_group, ment_from_plan = None, False, False
            continue

        # --- внутри напутствия: только текст ---
        if cur == "ment":
            if RE_BULLET.match(s) or RE_RESULT.match(s) or "/10" in s:
                continue
            # новая таблица/секция внутри блока — напутствие закончилось
            if re.match(r"^(?:📊|📅|📈|💰|❌|✅|💡|⚠️|🏆|KPI|ИТОГИ ЗА)", s, re.I):
                cur, ment_group, ment_from_plan = None, False, False
                continue
            nxt = next_nonempty(i)
            # письмо прервало план, но следом снова идёт шаг с «Твой результат» — возвращаемся
            if ment_from_plan and nxt and RE_RESULT.match(nxt):
                st = _split_step(s)
                st["result"] = RE_RESULT.sub("", nxt).strip()
                out[ment_bucket].append(st)
                cur, ment_from_plan = "plan", False
                continue
            out["ment"].append(s)
            continue

        # --- сильные стороны / зоны роста ---
        if cur:
            b = RE_BULLET.match(s)
            if b:
                val = 1.0 if cur == "positives" else 0.5
                out[cur].append({"value": val, "text": b.group(1).strip()})
            continue

        # --- вне секций: сначала KPI-строки («Качество: 7/10» / «• Качество 10/10 ✓») ---
        if "/10" in s:
            sc = RE_SCORE.search(s)
            if sc:
                for rx, key in METRIC_MAP:
                    if rx.search(s) and key not in out["kpi"]:
                        out["kpi"][key] = int(sc.group(1))
                        break
                continue
        # --- затем письмо-напутствие (обращения к сотруднику) ---
        if (len(s) >= 60 and not RE_SKIP_LINE.match(s) and not RE_BULLET.match(s)):
            if ment_group or RE_ADDRESS.match(s) or RE_MENT_HINT.search(s[:130]):
                ment_group = True
                out["ment"].append(s)
        continue

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
    steps = out["plan_steps"] or out["rec_steps"]
    if steps:
        cleaned["plan"] = {"title": plan_title or "Рекомендации для роста", "steps": steps}
    if out["ment"]:
        cleaned["mentorship"] = out["ment"]
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
