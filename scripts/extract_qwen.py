# -*- coding: utf-8 -*-
"""
Парсер экспорта Qwen-чата -> структурированные данные по сотрудникам ОТП.
Извлекает: KPI (5 метрик), бонусы (с детализацией по категориям), факты по месяцам.
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
    """Итоговая сумма бонуса: 'Бонусная часть всего X ₽' или 'Итого бонусная часть = X ₽'."""
    m = re.search(r'(?:Бонусная часть всего|Итого бонусная часть\s*=)\s*([\d\s\u00a0\u202f.,]+?)\s*₽', text)
    if m:
        return clean_amount(m.group(1))
    return None


def split_bonus(text):
    """Возвращает (zone_lines, rest_text): строки детализации бонуса и остальной текст."""
    lines = text.splitlines()
    # Формат A: "Бонусная часть всего X ₽ :" + строки категорий до пустой строки.
    for i, l in enumerate(lines):
        if "онусная часть всего" in l:
            zone = []
            j = i + 1
            while j < len(lines) and lines[j].strip() != "":
                zone.append(lines[j])
                j += 1
            rest = "\n".join(lines[:i] + lines[j:])
            return zone, rest
    # Формат B: строки с суммами (₽/руб) до строки "Итого бонусная часть = …".
    for i, l in enumerate(lines):
        if "Итого бонусная часть" in l:
            zone = [x for x in lines[:i] if re.search(r"[₽]|руб", x)]
            rest = "\n".join(lines[i + 1:])
            return zone, rest
    return [], text


NUM = r'\d+(?:[ \u00a0\u202f]\d{3})*'


def last_amount(s):
    """Последняя денежная сумма (с тысячными разделителями) перед ₽ или «руб» -> (amt, pre)."""
    for marker in ("₽", "руб"):
        i = s.rfind(marker)
        if i < 0:
            continue
        nums = re.findall(NUM, s[:i])
        if nums:
            last = nums[-1]
            amt = clean_amount(last)
            pre = s[:s.rfind(last)].strip()
            return amt, pre
    return None, s


def parse_bonus_line(s):
    """Строка детализации бонуса -> {"amount", "text"} или None."""
    s = s.strip()
    if not s:
        return None
    # "+N - описание" (доп. денежный бонус без ₽)
    m_plus = re.match(r'^\+(\d+(?:[.,]\d+)?)\s*[-–]\s*(.*)$', s)
    if m_plus:
        val = float(m_plus.group(1).replace(",", "."))
        if val >= 50:
            return {"amount": int(val), "text": m_plus.group(2).strip().rstrip(";,").strip()}
        return None
    # категория: "Label: … сумма ₽/руб" -> последняя сумма перед валютой
    amt, pre = last_amount(s)
    if amt is None:
        return None
    lm = re.match(r'^(.*?)\s*[:=]', pre)
    label = (lm.group(1).strip() if lm else pre).rstrip(";,").strip()
    if not label:
        return None
    return {"amount": amt, "text": label}


def bonus_breakdown(text):
    """Детализация бонуса (категории) + остальной текст без зоны бонуса."""
    zone, rest = split_bonus(text)
    items = []
    for l in zone:
        it = parse_bonus_line(l)
        if it:
            items.append(it)
    return items, rest


def fact_lines(text):
    """Баллы-факты: строки +N/-N вне зоны бонуса. Деньги (N>=50 или ₽/руб) — отдельно."""
    pos_note, neg, money = [], [], []
    for line in text.splitlines():
        s = line.strip()
        m = re.match(r'^([+-])\s*(\d+(?:[.,]\d+)?)\s*[-–]?\s*(.*)$', s)
        if not m:
            continue
        sign, val = m.group(1), float(m.group(2).replace(",", "."))
        rest = m.group(3).strip()
        if len(rest) < 3:
            continue
        is_money = val >= 50 or bool(re.search(r"₽|руб", rest))
        if sign == "-":
            neg.append({"value": val, "text": rest})
        elif is_money:
            money.append({"amount": int(val), "text": rest})
        else:
            pos_note.append({"value": val, "text": rest})
    return pos_note, neg, money


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
    print(f"{'сотрудник':<14} {'мес':<9} {'KPI (К О И В Т)':<26} {'бонус':>9}  {'кат.':>5} {'-факт':>6}")
    print("-" * 92)
    for eid in sorted(raw):
        out[eid] = {"months": {}}
        for month in sorted(raw[eid]):
            text = raw[eid][month][-1]  # последнее сообщение (коррекции)
            kpi = {k: metric_score(text, names) for k, names in METRICS.items()}
            kpi = kpi if all(v is not None for v in kpi.values()) else None
            bt = bonus_total(text)
            breakdown, rest = bonus_breakdown(text)
            pos_note, neg, extra_money = fact_lines(rest)
            money = breakdown + extra_money
            if bt is None:
                bt = int(sum(x["amount"] for x in money)) if money else None
            out[eid]["months"][month] = {
                "kpi": kpi, "bonus": bt,
                "money": money,
                "positives": pos_note,
                "negatives": neg,
            }
            ks = " ".join(f"{k[:1].upper()}{v}" for k, v in kpi.items()) if kpi else "(нет KPI)"
            print(f"{eid:<14} {month:<9} {ks:<26} {bt if bt is not None else '—':>9}  {len(money):>5} {len(neg):>6}")

    with open(os.path.join(HERE, "extracted.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("\nSaved -> scripts/extracted.json")


if __name__ == "__main__":
    main()
