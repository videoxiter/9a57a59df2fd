"""Импорт графиков смен и отпусков из Confluence ОТП в schedule.json.

Источники:
  • «Графики рабочего времени» (pageId 57901080) → дочерние «График на <МЕСЯЦ> <ГОД>г.»
      - таблица-сводка, календарная сетка смен (сотрудники × дни),
      - «РАСПРЕДЕЛЕНИЕ ПО ЛИНИЯМ» (L0 / L1.1 / L1.2 / L2.1 / L2.2 по неделям),
      - «Важные даты» (отпуска/больничные/годовщины).
  • «График отпусков на <ГОД>г.» (страницы-дети 60068686) → периоды отпусков по сотрудникам.

Креды: G:\\LMStudio\\Hermes\\data\\.env (СONFLUENCE_LOGIN с кириллической «С» / CONFLUENCE_LOGIN).

Запуск:  python fetch_confluence.py            # текущий и следующий месяц (если есть)
         python fetch_confluence.py --months 2026-10 2026-11
"""
from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "schedule.json")
ENV = r"G:\LMStudio\Hermes\data\.env"
BASE = "https://confluence.centrofinans.ru"
SHIFTS_ROOT = "57901080"      # Графики рабочего времени
VAC_ROOT = "60068686"         # Графики отпусков

MONTHS_RU = {"января": 1, "февраля": 2, "марта": 3, "апреля": 4, "мая": 5, "июня": 6,
             "июля": 7, "августа": 8, "сентября": 9, "октября": 10, "ноября": 11, "декабря": 12}
MONTHS_NOM = {"ЯНВАРЬ": 1, "ФЕВРАЛЬ": 2, "МАРТ": 3, "АПРЕЛЬ": 4, "МАЙ": 5, "ИЮНЬ": 6,
              "ИЮЛЬ": 7, "АВГУСТ": 8, "СЕНТЯБРЬ": 9, "ОКТЯБРЬ": 10, "НОЯБРЬ": 11, "ДЕКАБРЬ": 12}

# Легенда графика: символ → (тип, время, перерывы, линия-подсказка)
LEGEND = {
    "1":   {"kind": "shift", "title": "Смена 1", "time": "03:00–11:00",
            "breaks": ["05:45–06:00", "09:00–09:15"], "lunch": None},
    "2":   {"kind": "shift", "title": "Смена 2", "time": "09:00–18:00",
            "breaks": ["10:45–11:00", "15:45–16:00"], "lunch": "13:00–14:00"},
    "3":   {"kind": "shift", "title": "Смена 3", "time": "10:00–19:00",
            "breaks": ["11:45–12:00", "16:45–17:00"], "lunch": "14:00–15:00"},
    "I":   {"kind": "weekend", "title": "Выходная смена I", "time": "03:00–10:00",
            "breaks": ["05:00–05:15", "07:30–07:45"], "lunch": None},
    "II":  {"kind": "weekend", "title": "Выходная смена II", "time": "08:00–17:00",
            "breaks": ["10:15–10:30", "15:00–15:15"], "lunch": "12:00–13:00"},
    "III": {"kind": "weekend", "title": "Выходная смена III", "time": "10:00–19:00",
            "breaks": ["11:45–12:00", "16:30–16:45"], "lunch": "14:00–15:00"},
    "Ср":  {"kind": "duty", "title": "Дежурный по срочке", "time": "09:00–18:00",
            "breaks": ["10:45–11:00", "15:45–16:00"], "lunch": "13:00–14:00"},
    "Т":   {"kind": "duty", "title": "Дежурство «Тания»", "time": "09:00–18:00",
            "breaks": ["10:45–11:00", "15:45–16:00"], "lunch": "13:00–14:00"},
    "Д":   {"kind": "extra", "title": "Дополнительная смена", "time": "по графику", "breaks": [], "lunch": None},
    "В":   {"kind": "off", "title": "Выходной", "time": None, "breaks": [], "lunch": None},
    "О":   {"kind": "vacation", "title": "Отпуск", "time": None, "breaks": [], "lunch": None},
    "Б":   {"kind": "sick", "title": "Больничный", "time": None, "breaks": [], "lunch": None},
    "У":   {"kind": "study", "title": "Учебный отпуск", "time": None, "breaks": [], "lunch": None},
    "Я":   {"kind": "workoff", "title": "Отработка за отгул", "time": None, "breaks": [], "lunch": None},
    "НВ":  {"kind": "dayoff", "title": "Отгул с отработкой", "time": None, "breaks": [], "lunch": None},
    "X":   {"kind": "dayoff", "title": "Отгул за свой счёт", "time": None, "breaks": [], "lunch": None},
    "К":   {"kind": "trip", "title": "Командировка", "time": None, "breaks": [], "lunch": None},
    "С":   {"kind": "seminar", "title": "Семинар", "time": None, "breaks": [], "lunch": None},
    "2Р":  {"kind": "weekend", "title": "Рабочий выходной (смена 2)", "time": "09:00–18:00",
            "breaks": ["10:45–11:00", "15:45–16:00"], "lunch": "13:00–14:00"},
    "3Р":  {"kind": "weekend", "title": "Рабочий выходной (смена 3)", "time": "10:00–19:00",
            "breaks": ["11:45–12:00", "16:45–17:00"], "lunch": "14:00–15:00"},
}


def env(path=ENV):
    data = {}
    for line in open(path, encoding="utf-8", errors="replace"):
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            data[k.strip().lstrip("\ufeff")] = v.strip().strip('"').strip("'")
    login = data.get("СONFLUENCE_LOGIN") or data.get("CONFLUENCE_LOGIN")
    pwd = data.get("СONFLUENCE_PASSWORD") or data.get("CONFLUENCE_PASSWORD")
    return login, pwd


class Client:
    def __init__(self):
        login, pwd = env()
        self.auth = base64.b64encode(f"{login}:{pwd}".encode()).decode()
        self.users = {}

    def get(self, path):
        req = urllib.request.Request(BASE + path,
                                     headers={"Authorization": "Basic " + self.auth, "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read().decode("utf-8"))

    def body(self, page_id):
        return self.get(f"/rest/api/content/{page_id}?expand=body.storage")["body"]["storage"]["value"]

    def children(self, page_id):
        return {p["title"]: p["id"] for p in self.get(f"/rest/api/content/{page_id}/child/page?limit=100")["results"]}

    def user(self, key):
        if key not in self.users:
            try:
                self.users[key] = self.get(f"/rest/api/user?key={urllib.parse.quote(key)}").get("displayName", "")
            except Exception:
                self.users[key] = ""
        return self.users[key]


class Tables(HTMLParser):
    """Все таблицы страницы: ячейки — текст + собранные userkey."""

    def __init__(self):
        super().__init__()
        self.tables, self.cur, self.row, self.cell, self.cell_keys = [], None, None, None, None
        self.loose = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "table":
            self.cur = []
        elif tag == "tr" and self.cur is not None:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell, self.cell_keys = "", []
        elif tag == "ri:user" and self.cell is not None:
            self.cell_keys.append(a.get("ri:userkey"))

    def handle_data(self, d):
        if self.cell is not None:
            self.cell += d
        elif self.cur is None and d.strip():
            self.loose.append(" ".join(d.split()))

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append({"t": " ".join(self.cell.split()), "keys": list(self.cell_keys)})
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.cur.append(self.row)
            self.row = None
        elif tag == "table" and self.cur is not None:
            self.tables.append(self.cur)
            self.cur = None


def parse_month(client: Client, html: str, iso: str):
    """Сетка смен + распределение по линиям + важные даты."""
    p = Tables()
    p.feed(html)
    grid, lines = None, {}
    for tb in p.tables:
        if not tb:
            continue
        head = [c["t"] for c in tb[0]]
        # календарная сетка: «ФИО», «1», «2», … «31»
        if head and head[0] in ("ФИО", "Ф И О") and len(head) > 20:
            grid = tb
        # распределение по линиям: строки вида «L0(супервайзинг…)», далее недели
        elif any(re.match(r"^L\d", (r[0]["t"] if r else "")) for r in tb):
            week_labels = [c["t"] for c in tb[0][1:]]
            for r in tb:
                line = (r[0]["t"] if r else "").strip()
                if not re.match(r"^L\d", line):
                    continue
                m = re.match(r"(L[\d.]+)\s*\((.*?)\)?$", line)
                lid, lname = (m.group(1), m.group(2)) if m else (line, line)
                weeks = []
                for c in r[1:]:
                    weeks.append(client.user(c["keys"][0]) if c["keys"] else (c["t"] or "—"))
                lines[lid] = {"title": lname.strip(), "weeks": weeks, "labels": week_labels}

    shifts = {}
    if grid:
        header = grid[0]
        days = []
        for c in header[1:]:
            if c["t"].isdigit():
                days.append(int(c["t"]))
        for row in grid[1:]:
            keys = [k for c in row for k in c["keys"]]
            who = client.user(keys[0]) if keys else ""
            if not who:
                continue
            cells = row[1:]
            rec = {}
            for i, c in enumerate(cells):
                if i >= len(days):
                    break
                sym = (c["t"] or "").strip()
                if sym:
                    rec[str(days[i])] = sym
            shifts[who] = rec
    facts = [x for x in p.loose if re.search(r"отпуск|больнич|рабочих дня|Выходных смен|Сокращенный день|Праздничные", x)]
    return {"month": iso, "days": {k: v for k, v in []}, "shifts": shifts, "lines": lines, "facts": facts}


def parse_vacations(client: Client, html: str, year: int):
    """Периоды отпусков: сотрудник → список {from, to, days}."""
    p = Tables()
    p.feed(html)
    out = {}
    for tb in p.tables:
        if not tb or [c["t"] for c in tb[0]][:2] != ["ФИО", "Период"]:
            continue
        for row in tb[1:]:
            keys = [k for c in row for k in c["keys"]]
            if not keys:
                continue
            who = client.user(keys[0])
            period = row[1]["t"] if len(row) > 1 else ""
            days = row[2]["t"] if len(row) > 2 else ""
            m = re.match(r"(\d{1,2})\s+([а-яё]+)\s*[–-]\s*(\d{1,2})\s+([а-яё]+)", period.lower())
            if not m:
                continue
            d1, mo1, d2, mo2 = int(m.group(1)), MONTHS_RU.get(m.group(2)), int(m.group(3)), MONTHS_RU.get(m.group(4))
            if not (mo1 and mo2):
                continue
            def mk(day, mon):
                y = year + (1 if mon < mo1 else 0)   # отпуск через Новый год
                return f"{y:04d}-{mon:02d}-{day:02d}"
            out.setdefault(who, []).append({"from": mk(d1, mo1), "to": mk(d2, mo2),
                                            "days": int(days) if days.isdigit() else None})
    for who in out:
        out[who].sort(key=lambda x: x["from"])
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only = args or None
    client = Client()
    month_pages = client.children(SHIFTS_ROOT)
    vac_pages = client.children(VAC_ROOT)

    if only:
        want = only
    else:
        t = date.today()
        want = [f"{t.year:04d}-{t.month:02d}"]
        nxt = (t.replace(day=1) + __import__("datetime").timedelta(days=32))
        want.append(f"{nxt.year:04d}-{nxt.month:02d}")

    data = {"generated": date.today().isoformat(), "legend": LEGEND, "months": {}, "vacations": {}, "vacationYears": []}
    for iso in want:
        y, m = int(iso[:4]), int(iso[5:7])
        title = None
        for t_, pid in month_pages.items():
            mm = re.match(r"График на ([А-ЯЁ]+) (\d{4})г\.", t_)
            if mm and MONTHS_NOM.get(mm.group(1)) == m and int(mm.group(2)) == y:
                title, page = t_, pid
                break
        if not title:
            print(f"{iso}: Не опубликовано")
            continue
        html = client.body(page)
        data["months"][iso] = parse_month(client, html, iso)
        print(f"{iso}: {title} (pageId {page}) — сотрудников {len(data['months'][iso]['shifts'])}, линий {len(data['months'][iso]['lines'])}")

    for t_, pid in vac_pages.items():
        mm = re.search(r"(\d{4})", t_)
        if not mm:
            continue
        year = int(mm.group(1))
        data["vacationYears"].append({"year": year, "title": t_, "pageId": pid})
        data["vacations"][str(year)] = parse_vacations(client, client.body(pid), year)
        print(f"отпуска {year}: {len(data['vacations'][str(year)])} сотрудников")
    data["vacationYears"].sort(key=lambda x: x["year"])

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("записано:", OUT)


if __name__ == "__main__":
    main()
