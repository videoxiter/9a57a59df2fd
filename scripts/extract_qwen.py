# -*- coding: utf-8 -*-
"""
Парсер экспорта Qwen-чата -> структурированные данные по сотрудникам ОТП.
Извлекает: KPI (5 метрик), бонусы, факты (зоны роста с тикетами) по месяцам.
Вход: chat-export-*.json. Выход: scripts/extracted.json + сводка.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORT = sys.argv[1] if len(sys.argv) > 1 else r"G:\LMStudio\Hermes\data\attachments\chat-export-1789481395596.json"

TARGETS = {
    "Яковленков": "yakovlenkov", "Фролов": "frolov", "Мельников": "melnikov",
    "Хасанов": "khasanov", "Пестовский": "pestovsky", "Елисеев": "eliseev",
    "Завьялов": "zavyalov", "Болгов": "bolgov", "Юрьев": "yuryev", "Поспелова": "pospelova",
}

METRICS = {
    "quality":      ["Качество"],
    "learnability": ["Обучаемость"],
    "initiative":   ["Инициатива"],
    "engagement":   ["Вовлеченность", "Вовлечённость"],
    "discipline":   ["Требования к работе"],
}

MONTH_MARKERS = [
    (r"за апрель\s*2026", "2026-04"),
    (r"за май\s*2026", "2026-05"),
    (r"за июнь\s*2026", "2026-06"),
    (r"за июль\s*2026|результаты за июль|Бонусная часть всего|Итого бонусная часть", "2026-07"),
]


def find_employee(text):
    """Определяет сотрудника ПО ЗАГОЛОВКУ, а не по случайным упоминаниям."""
    head = text[:200]
    m = re.search(r'Сотрудник\s*[-–]\s*([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)', head)
    if m:
        last = m.group(2)
        if last in TARGETS:
            return TARGETS[last], last
    first = text.strip().split("\n")[0].strip().rstrip(".")
    m2 = re.match(r'^([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)$', first)
    if m2:
        last = m2.group(2)
        if last in TARGETS:
            return TARGETS[last], last
    return None, None


def metric_score(text, names):
    for name in names:
        m = re.search(rf'{name}(?:\s*\([^)]*\))?\s*:\s*([^\n]*)', text)
        if not m:
            continue
        line = m.group(1)
        p = re.findall(r'\((\d+)/10\)', line)
        if p:
            return int(p[-1])
        b = re.search(r'(\d+)', line)
        if b:
            return int(b.group(1))
    return None


def clean_amount(s):
    return int(re.sub(r"[^\d]", "", s))


def bonus_total(text):
    m = re.search(r'(?:Бонусная часть всего|Итого бонусная часть\s*=)\s*([\d\s\u00a0\u202f.,]+?)\s*₽', text)
    if m:
        return clean_amount(m.group(1))
    return None


def fact_lines(text):
    """Строки вида +/-N ... — денежные бонусы и факты-замечания."""
    money, pos_note, neg = [], [], []
    for line in text.splitlines():
        s = line.strip()
        m = re.match(r'^([+-])\s*(\d+(?:[.,]\d+)?)\s*[-–]?\s*(.*)$', s)
        if not m:
            continue
        sign, val = m.group(1), float(m.group(2).replace(",", "."))
        rest = m.group(3).strip()
        if len(rest) < 3:
            continue
        is_money = bool(re.search(r"₽|руб|HELP-|ООО|смен|офис|доставк|транспорт", rest)) or val >= 50
        item = {"value": val, "text": rest}
        if sign == "-":
            neg.append(item)
        elif is_money:
            money.append(item)
        else:
            pos_note.append(item)
    return money, pos_note, neg


def main():
    d = json.load(open(EXPORT, encoding="utf-8"))
    msgs = d[0]["chat"]["messages"]

    cur_month = None
    raw = {}  # eid -> month -> [texts]
    for m in msgs:
        if m.get("role") != "user":
            continue
        t = m.get("content") or ""
        for pat, mo in MONTH_MARKERS:
            if re.search(pat, t, re.IGNORECASE):
                cur_month = mo
                break
        eid, _ = find_employee(t)
        if not eid or not cur_month:
            continue
        raw.setdefault(eid, {}).setdefault(cur_month, []).append(t)

    out = {}
    print(f"{'сотрудник':<14} {'мес':<9} {'KPI (К О И В Т)':<26} {'бонус':>9}  {'деньги':>5} {'-факт':>6}")
    print("-" * 92)
    for eid in sorted(raw):
        out[eid] = {"months": {}}
        for month in sorted(raw[eid]):
            text = raw[eid][month][-1]  # последнее сообщение (коррекции)
            kpi = {k: metric_score(text, names) for k, names in METRICS.items()}
            kpi = kpi if all(v is not None for v in kpi.values()) else None
            bt = bonus_total(text)
            money, pos_note, neg = fact_lines(text)
            if bt is None:
                bt = int(sum(x["value"] for x in money)) if money else None
            out[eid]["months"][month] = {
                "kpi": kpi, "bonus": bt,
                "money": [{"amount": int(x["value"]), "text": x["text"]} for x in money],
                "positives": [{"value": x["value"], "text": x["text"]} for x in pos_note],
                "negatives": [{"value": x["value"], "text": x["text"]} for x in neg],
            }
            ks = " ".join(f"{k[:1].upper()}{v}" for k, v in kpi.items()) if kpi else "(нет KPI)"
            print(f"{eid:<14} {month:<9} {ks:<26} {bt if bt is not None else '—':>9}  {len(money):>5} {len(neg):>6}")

    with open(os.path.join(HERE, "extracted.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("\nSaved -> scripts/extracted.json")


if __name__ == "__main__":
    main()
